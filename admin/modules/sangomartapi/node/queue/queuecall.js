"use strict";

// vim: sw=4:softtabstop=4:expandtab 

/*
      This file defines the QueueCall class, representing a queue call.
      By convention, the queue is allowed to mess around inside the object,
      but agents are not.

      The most important rule to follow in editing this code is to keep 
      the comment list of state values up to date, and to consult it whenever
      making a switch statement.

      A QueueCall is an EventEmitter, emitting:
          StasisEnd message
          dialstate - channel state ["Ringing", etc] while dialing out to a 
                      caller who is currently offline, used by agent to
                      play ringback.
 */

var Promise = require('bluebird');
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var StopWatch = require('./stopwatch.js');

module.exports = QueueCall;

util.inherits(QueueCall, EventEmitter);


function dontcarecb() { }

// The highest priority ever assigned to a queue call.  When queue calls
// have their priority set to "max", this is bumped by 1 and used.  
// Manually-set priorities should use numbers less than 1000.
var maxPriority = 1000;

/***********************************************************************
 *                           QueueCall object
 *
 *  The QueueCall object represents a call in a specific queue.  
 * It's really part of the Queue object codebase, so Queue and QueueCall
 * are allowed to mess with each others' data structures.  Agent isn't
 * allowed the same familiarity.
 **********************************************************************/

function QueueCall(args) {
    var qc = this;

    // make some properties non-enumerable so they don't get logged.
    ['qm', 'queue', 'agent', 'verify',
        'offlineDialPromise', 'indicationPromise',
        'offlineDialer',
    ].forEach(function (prop) {
        Object.defineProperty(qc, prop, {
            enumerable: false, writable: true
        });
    });

    // copy fields from args
    [
        'id',  // channel id

        'qm',  // the QueueManager object

        'queue', // queue that owns the call.

        // note outsiders should use the getCaller method.
        'caller', // callerid.    { "name": "Homer Simpson", "number": "408" }

    ].forEach(function (x) { qc[x] = args[x]; });

    /* state contains the call state.  One of these states:
     *      "new" - newly received channels are briefly in this state.
     *      "answering" - waiting for ami.answer().
     *      "waiting" - in the queue, no agents ringing for this call
     *      "dialingagent" - queue is trying to dial agents to fullfill this call.
     *      "announcing" - queue is playing an announcement
     *      "bridging" -  call is out of the waiting list.  queue is attempting
     *                 to bridge the call to an answered agent.
     *      "bridgeerr" - failed to bridge to an agent.  Briefly in this state
     *                 before transitioning back to waiting (or whatever).
     *      "bridged" -  customer is talking to an agent.
     *      "transferring" - agent did a transfer.  We are sending both 
     *                 channels to a dialplan bridge and waiting for StasisEnd.
     *      "answerout" - call is being answered by a non-agent.
     *      "shutdown" - call is shut down, or is being shut down.
     *      "shutdown_temp" - Calls are briefly put in this state to
     *           generate terminated messages for switchboard when the
     *           channel is being replaced due to a transfer.
     *      "callbacknumberivr" - playing the IVR that collects the user's
     *                            name and callback phone number. In this
     *                            state the call leaves the queue app.
     *      "callbackivrdup" - briefly set to this when the callback number
     *                         IVR returns a number that is already waiting
     *                         in the queue, so we ignore the call.
     *      "offlinewait" - waiting for queue to call the caller back
     *                  using phone number collected by an IVR.
     *      "offlinedialingagent" - call is offline, but an agent has been 
     *                  assigned (equivalent to "dialingagent" state for online call)
     *      "offlinedial" - attempting to dial a caller that was waiting offline
     *      "offlineanswerout" - Call is offline, and being answered
     *              from switchboard.
     *      "offlineretrywait" - Offline, waiting for nextOfflineRetryTime
     *              before attempting to call again.
     *
     * If you add a state, need to update switches everywhere.
     */
    this._state = "new";
    Object.defineProperty(this, "state", {
        get: function () { return this._state; },
        set: function (x) {
            if (this._state === x) {
                return;
            }
            if (this._state === "shutdown") {
                // this can legitimately happen when there's a transfer as
                // the call leaves one queue and enters another.  Otherwise
                // it's dangerous, so it's worth logging to make debugging
                // easier.
                this.log("maybe BUG - state set to", x, "when shutdown");
            }
            this.log("state changed", this._state, '->', x);
            this._state = x;
        }
    });

    this.agent = null;

    // keep track of waiting time.
    this.waitWatch = new StopWatch();

    // keep track of talk time.
    this.talkWatch = new StopWatch();

    // keep track of waiting during current call (not including time
    // before callback)
    this.onlineWaitWatch = new StopWatch();

    // keep track of time waiting for a callback.
    this.offlineWaitWatch = new StopWatch();

    // how many complete ring cycles this call will have gone through
    // after any ringing agent calls are done ringing.
    this.ringCycleCount = 0;

    // dumping ground for ring strategy to store stuff.
    this.strategyData = {};

    // this is set to true the first time we attempt to find an agent for
    // this call.  It is used to decide if we should play "you are first in
    // line" announcement.
    this.hasEverLookedForAgent = false

    // position of the call when it was answered.
    this.initialPosition = null;

    // agent this queue call is reserved for, and the time (in ms) the 
    // reservation expires.
    this.reservedForAgent = null;
    this.reservedSince = 0; // ms time the call was reserved, or zero.

    // A higher-is-higher priority value attached to a queue call.  This
    // overrides the arrival time priority.
    this.priority = 0;

    // This is basically the ms time the call arrived in the queue, or 
    // in the case of global arrival time enabled, any queue,
    this.arrivalTime = Date.now();

    // Since queue calls can get rearranged by the admin, we don't want to
    // tell someone that they're caller number 2 after we've already told them
    // that they are caller number 1.  So remember the best position we've
    // told them, and don't announce numbers bigger than that.
    this.bestAnnouncedPosition = Number.MAX_VALUE;

    // If we're playing an announcement, this will be an object with a stop
    // method to stop it.
    this.announceStopper = null;

    // ms time when the call went offline.
    this.offlineSince = null;

    //
    // stuff about dialing offline callers
    //

    // Dialer object
    this.offlineDialer = null;

    // promise returned from offlineDial(); resolves when we have the caller
    // on the line.
    this.offlineDialPromise = null;

    // set to true when we have offered the user a callback.  Enables
    // the "1" press in the dtmf handler.
    this.offeredCallback = false;

    // promise used to prevent race conditions when getting multiple start
    // and stop indications in a rush.
    this.indicationPromise = Promise.resolve();

    // stuff to keep track of when to retry dialing an offline call.
    this.offlineRetriesRemaining = this.queue.offline_retries || 0;
    this.nextOfflineRetryTime = null;

    // qc.callbackNumber contains the number to call back for virtual calls.

    // NOTE! adding more stuff here means adding more stuff to 
    // recreateOfflineCall and maybe to the defineProperty list at the top.
}

// create a QueueCall based on data stored on disk about an offline call.
// The data is an Object that used to be JSON.
QueueCall.recreateOfflineCall = function (queue, data) {
    var qc = new QueueCall({
        id: data.id,
        qm: queue.qm,
        queue: queue,
        caller: data.caller,
    });

    for (var key in data) {
        qc[key] = data[key];
    }

    qc.state = "offlinewait";

    // deserialize stopwatches.
    ['waitWatch', 'talkWatch', 'onlineWaitWatch', 'offlineWaitWatch'
    ].forEach(function (name) {
        qc[name] = StopWatch.fromJSON(qc[name]);
    });

    qc.announceStopper = null;
    qc.offlineDialer = null;
    delete qc.queueId;

    return qc;
}

// generate a queue.caller.status message body for switchboard.
QueueCall.prototype.getStatusMessage = function () {
    var qc = this;
    var q = qc.queue;

    var ret = {
        queueId: q.id,
        uniqueId: String(qc.id),
        state: null,
        arrivalTime: qc.arrivalTime,
        waitStartTime: qc.waitWatch.getStartTime(),
        waitEndTime: qc.waitWatch.getStopTime(),
        offlineWaitStartTime: qc.offlineWaitWatch.getStartTime(),
        offlineWaitEndTime: qc.offlineWaitWatch.getStopTime(),
        bridgeStartTime: qc.talkWatch.getStartTime(),
        bridgeEndTime: qc.talkWatch.getStopTime(),
        position: null,
        initialPosition: qc.initialPosition,
        callerId: qc.caller,
        agents: null,
        reservedForAgent: qc.reservedForAgent ? qc.reservedForAgent.id : null,
        reservedSince: qc.reservedSince,
        now: Date.now(),
        priority: qc.priority,
        callbackNumber: qc.callbackNumber,
    };


    var pos = q.getCallPosition(qc);
    if (pos >= 0)
        ret.position = pos;

    switch (qc.state) {
        case "dialingagent":
        case "bridging":
            ret.state = 'dialing';   // not dialingagent!
            ret.agents = q.agents.filter(agent => agent.isDialingForQueue(qc));
            break;

        case "new":
        case "answering":
        case "waiting":
        case "announcing":
        case "answerout":
        default:
            ret.state = 'waiting';
            ret.agents = [];
            break;

        case "bridged":
            ret.state = 'bridged';
            ret.agents = [qc.agent];
            break;

        case "offlinewait":
        case "offlinedial":
        case "offlinedialingagent":
        case "offlineanswerout":
        case "callbacknumberivr":
        case "offlineretrywait":
            ret.state = "offlinewait";
            ret.agents = [];
            break;

        case "shutdown":
        case "shutdown_temp":
            ret.state = 'terminated';
            ret.agents = [];
            break;
    }

    ret.agents = ret.agents ? ret.agents.map(function (agent) { return agent.id }) : [];

    return ret;
};

QueueCall.prototype.emitStatusMessage = function () {
    this.queue.qm.emit("queue.caller.status", this.getStatusMessage());
};

// compare the priority of two calls, returning a number that is >, =, or < 
// zero if a>b, a=b, or a<b.  Greater priority means earlier service.
QueueCall.priorityCompare = function (a, b) {
    // offline calls waiting for retry go last.
    // higher priority is most important.
    // earliest reserved is next most important.
    // Later arrival is next most important.
    var ret =
        ((b.state === "offlineretrywait") - (a.state === "offlineretrywait")) ||
        (a.priority - b.priority) ||
        ((b.reservedSince || Number.MAX_VALUE) - (a.reservedSince || Number.MAX_VALUE)) ||
        (b.arrivalTime - a.arrivalTime);
    return ret;
}

QueueCall.prototype.isOffline = function () {
    switch (this.state) {
        case "offlinewait":
        case "offlineretrywait":
        case "offlinedial":
        case "offlinedialingagent":
        case "offlineanswerout":
            return true;
        default:
            return false;
    }
};

QueueCall.prototype.log = function (a) {
    var args = Array.prototype.slice.call(arguments);
    args.unshift(this.id);
    args.unshift("q" + this.queue.displayId());
    this.qm.log.apply(this.qm, args);
};

