"use strict";
// four space indent, no tab chars.
// vim: sw=4:softtabstop=4:expandtab 
/*
       This file defines the Agent class, which represents one person
       who can be logged into multiple queues.

       A guide to commonly used variable names:
        q   - a Queue
        qm  - the QueueManager object.
        qc  - a QueueCall
        qs  - an entry from the agent.queueState structure; holds queue-specific
              state for the agent.
        qcs - queue call state.  An entry from agent.queueState[qid].calls.
              Represents the state of a call to an agent.
 */

const Promise = require('bluebird');
const fsPromise = require('../lib/promise_fs.js');
const StatKeeper = require('./statkeeper.js');
const featureLogs = require('../lib/featureLogs.js');
module.exports = Agent;

// this is the constructor for Agent.  It is called by the QueueManager.
function Agent(args) {
    var agent = this;

    // make some properties non-enumerable so they don't get logged.
    "qm queues hangupPromise".split(' ')
        .forEach(function (prop) {
            Object.defineProperty(agent, prop, {
                enumerable: false, writable: true
            });
        });


    // copy fields from args
    [
        'qm',  // the QueueManager object

        // id for the account.  In switchvox this is an Account object.
        'id',

    ].forEach(function (x) { agent[x] = args[x]; });

    var qm = agent.qm;


    // list of queues into which this agent is logged in.
    agent.queues = [];

    // last known value for device state.  Could be from either an explicit
    // lookup or from a device state event.  Note that it's theoretically
    // possible for an agent to be logged into different queues at different
    // phones, which could mess this up a bit.  It is only used for generating
    // outgoing status events, not for figuring out whether to call someone.
    agent.recentDeviceState = 'UNKNOWN';
    agent.recentDevice = null;

    /* maps queue id to state for this agent as it pertains to the given queue.
     * entries are created when an agent logs into a queue, and persist even
     * after they log out.
     * 
     * Instances of this are generally referred to with the variable name qs.
     *
     * The values look like: {
     *          queue: equal to this.queues[id]
     *          loginTime: Date the agent logged in.
     *          location: the current Endpoint to monitor for device state.
     *          interface: the endpoint to be dialed
     *          talkTimeStats: StatKeeper
     *          missedCallCount: count of missed calls since reset.
     *          lastBridgeTime: Last time agent bridged a call (epoch ms) 
     *
     *          calls: an array of Objects containing information about
     *          calls the agent is handling/will handle.  An entry of this
     *          array is usually called by the variable name qcs (queue call 
     *          state).  Each object contains
     *          {
     *
     *              state: one of:
     *                       submitted - called originate, no ARI response yet
     *                       ringing - got originate response from ARI originate
     *                       answered - the agent picked up the ringing phone.
     *                                  This state only persists for a moment.
     *                       announce - queue announcement/acknowledgement
     *                       ready - answered, acknowledged, ready to bridge
     *                       bridging - waiting for bridge to be created and 
     *                                  calls to be added.
     *                       bridged - talking to a customer!
     *                       transferring - waiting for StasisEnd due to 
     *                                      transfer.
     *                       call_shutdown - call ended.  waiting for StasisEnd 
     *                                       message
     *                       cancel - queue told agent to stop dialing.
     *                       bridgeerr_shutdown - bridging failed.  Wait for 
     *                             StasisEnd message.  Already sent failure.
     *                       ack_shutdown - shutting down due to acknowledgement
     *                             failure (timeout or wrong digit).
     *                              Waiting for StasisEnd message.
     *    
     *                   Note that it is vitally important that this comment
     *                   get updated if any states are added.
     *     
     *              queueCall: current QueueCall object; can be empty if 
     *                  autofill for a ringall, which would be called an
     *                  "unbound" agent call.
     *              channelId: asterisk channel for the call made to the agent.
     *              bridgeId: bridge used to connect agent to queue call
     *              pendingTransfer: true if we are waiting for the call to
     *                   be bridged so that we can finish transferring.
     *              dontAnnounce: we've detected that the agent call is being
     *                   sent to voicemail, so we won't play an announcement.
     *              otherChannelId: The uniqueid for the far end of the
     *                   local channel we dial.
     *              dialer: the Dialer object used to make this call.
     *              announcer: while in announce state, this holds the
     *                      Announcer object managing the interaction.
     *              dialPeer: The uniqueid for the sip (typically) channel
     *                   dialed at the far end of the local channel.
     *              tier: the queue tier number this agent is in (1 or 2).
     *              (log): log function
     *              (queue): the queue object
     *          }
     */
    agent.queueState = {};

    // a timer (from setTimeout) that will fire when the agent's wrapup time
    // is over.
    agent.wrapupTimer = null;

    // whenever an agent call gets hung up, a promise is put here that
    // depends on the hangup being complete.  When a queue asks the agent
    // for its device state, the deviceState request will wait for this
    // promise.  This avoids a race condition with ringall queues that
    // sometimes caused someone not to get rung.
    //
    // In the case of multiple queues having the agent, only the most 
    // recent hangup will be promised for.  This still solves the race
    // condition.
    // 
    // This promise is set up to never throw.
    agent.hangupPromise = Promise.resolve(true);
}

// Returns an id for the agent suitable for human-readable logging.
// This is basically the extension if we know it, or the stringified
// agent id if not.
Agent.prototype.displayId = function () {
    var agent = this;
    var ai;
    if (agent.extension) {
        return agent.extension;
    } else if (agent.queues[0] && (ai = agent.queues[0].getAgentInfo(agent.id))
        && ai.extension
    ) {
        agent.extension = ai.extension;
        return ai.extension;
    } else {
        return String(agent.id);
    }
};

function blankCallState(queue) {
    var qcs = {
        state: "idle",
        queueCall: null,
        callStartTime: null,
        channelId: null,
        dialPeer: null,
        bridgeId: null,
        pendingTransfer: false,
    };
    Object.defineProperty(qcs, "queue", { enumerable: false, value: queue });

    // create a log method that uses either the queueCall.log or the queue.log
    Object.defineProperty(qcs, "log",
        {
            enumerable: false,
            value: function () {
                let o = qcs.queueCall || queue;
                o.log.apply(o, arguments)
            }
        },
    );
    return qcs;
}

Agent.prototype.getOrMakeQueueState = function (queue) {
    var qs = this.queueState[queue.id];
    if (!qs) {
        qs = this.queueState[queue.id] = {
            calls: [],
            loginTime: null,
            maxTalkTime: 0,
            talkTimeStats: new StatKeeper(),
            missedCallCount: 0,
            loggedIn: false,
        }
        Object.defineProperty(qs, "queue", { enumerable: false, value: queue });
    }

    return qs;
}

Agent.prototype.login = function (queue, locationEndpoint, tier) {
    var agent = this;
    var qs = agent.getOrMakeQueueState(queue);

    qs.loggedIn = true;

    delete queue.loggedOutAgents[agent.id];

    if (agent.queues.indexOf(queue) >= 0) {
        if (qs.location !== locationEndpoint) {
            // logging in from somewhere new.  Just update the subscription.
            qs.queue.nextTickMatch("relogin");
        }

        qs.tier = tier;
        queue.addAgentInTier(agent, tier);

        return; //already logged in
    }

    queue.log("agent login ", locationEndpoint, agent.displayId(), tier);
    featureLogs.log(this.qm.queueFeatureName,featureLogs.getLogContext(), 'Q:'+queue.id.accountId,`Agent ${agent.id.accountId} login.  location endpoint: ${locationEndpoint}`);
    agent.queues.push(queue);
    qs.location = locationEndpoint;
    qs.loginTime = Date.now();

    Promise.all([
        agent.reloadStats(qs)
    ]).then(function () {
        agent.emitStatus(qs);
    }).catch(function (e) {
        queue.log("error setting up agent status on login: ", e);
    });

    qs.tier = tier;
    queue.addAgentInTier(agent, tier);

    queue.nextTickMatch("login " + agent.displayId());
};

Agent.prototype.logout = function (queue, tier) {
    var agent = this;

    var i;
    while (-1 != (i = agent.queues.indexOf(queue))) {
        agent.queues.splice(i, 1);
        queue.log("agent logout", agent.displayId());
        featureLogs.log(this.qm.queueFeatureName,featureLogs.getLogContext(), 'Q:'+queue.id.accountId,`Agent ${agent.id.accountId} (${agent.displayId()}) logout.`);
    }
    queue.loggedOutAgents[agent.id] = agent;
    queue.removeAgent(agent);
    var qs = agent.getOrMakeQueueState(queue);

    qs.loggedIn = false;
    qs.loginTime = null;
    qs.tier = tier;
    agent.emitStatus(qs);

    // agent.hangupUnconnectedCallForQueue(queue, "agent logout", { notifyQueue: true });
    queue.nextTickMatch("logout " + agent.displayId());
};

// called by the queue when an agent is permanently removed from that queue.
Agent.prototype.removeFromQueue = function (queue) {
    var agent = this;
    agent.logout(queue);
    featureLogs.log(this.qm.queueFeatureName,featureLogs.getLogContext(), 'Q:'+queue.id.accountId,`Agent ${agent.id.accountId} (${agent.displayId()}) removed from queue ${queue.id.accountId}`);
    delete queue.loggedOutAgents[agent.id];
    var qs = agent.queueState[queue.id];   // may be undefined.  That's ok.
    agent.emitStatus(qs);
};

// return true if this agent is trying to get a call going for the queue.
// If present, will return the dialer.
//
// qc is optional; if passed, will return dialer only if that particular call
// is being dialed for.
// 
// if qc is explicitly passed as null (not undefined), this is a request
// for if the agent is dialing an as-yet unbound call (like for a autofill +
// ringall situation).
Agent.prototype.isDialingForQueue = function (queue, qc) {
    var qs = this.queueState[queue.id];
    if (!qs) return false;

    var i;
    for (var qcs of qs.calls) {
        // specified call, and this isn't it.
        if (qc && qcs.queueCall !== qc)
            continue;

        // specified no call, and there's a call.
        if (qc === null && qcs.queueCall)
            continue;

        switch (qcs.state) {
            case "submitted":
            case "ringing":
            case "answered":
            case "announce":
            case "ready":
                return qcs.dialer;
        }
    }
    return false;
};

Agent.prototype.updateTalkTime = function (qcs) {
    var agent = this;
    if (qcs.queueCall) {
        var val = qcs.queueCall.talkWatch.value();
        var qs = agent.queueState[qcs.queue.id];
        qs.talkTimeStats.update(val);
    }
};

Agent.prototype.setPauseReason = function (reason) {
    var agent = this;
    if (agent.pauseReason !== reason) {
        agent.pauseReason = reason;
        if(reason.length > 0)
        featureLogs.log(this.qm.queueFeatureName,featureLogs.getLogContext(), 'Acc:'+agent.id.accountId,`Setting pause reason for Agent ${agent.id.accountId} , reason: ${reason}`);
        var id;
        for (id in agent.queueState) {
            var qs = agent.queueState[id];
            agent.emitStatus(qs);
        }
    }
}

// figure out the contents of the agent status message.  If the agent was
// deleted from the queue, returns undefined.
Agent.prototype.getQueueStatus = function (queue) {
    var agent = this;
    var qs;

    qs = agent.queueState[queue.id];

    var qcs = qs ? qs.calls[0] : null;
    var currentTalkTime = qcs && qcs.queueCall ? qcs.queueCall.talkWatch.value() : 0;

    var callsTaken = qs ? queue.agentCallCount(agent) : 0;

    var extension = 0;
    var firstName = '';
    var lastName = '';
    var memberType = 1;
    var position = null;
    var pausedSince = null;
    var paused = qs && !!queue.isAgentPaused(agent);
    var ai = queue.getAgentInfo(agent.id);
    if (ai) {
        extension = ai.extension || 0;
        if (ai.display_name) {
            firstName = ai.display_name;
        } else {
            firstName = ai.first_name;
            lastName = ai.last_name;
        }
        memberType = ai.member_type;
        position = ai.queue_position;
        if (paused)
            pausedSince = ai.paused_since * 1000;  // db in sec, return in ms.
    }


    switch (String(memberType)) {
        case "2":
            memberType = "permanent";
            break;
        case "1":
            memberType = "login";
            break;
        default:       // typically "nonmember" set in queue.removeRemoved
            break;
    }

    var status = {
        accountId: agent.id,
        dialable: false,
        queueId: queue.id,
        extension: String(extension),
        position: position,
        firstName: firstName,
        lastName: lastName,
        memberType: memberType,
        now: Date.now(),
        state: null,   // below
        loginState: qs && agent.queues.indexOf(queue) >= 0,
        paused: paused,
        pausedSince: pausedSince,
        pauseReason: paused ? agent.pauseReason : null,
        interface: qs ? qs['interface'] : null,
        uniqueId: qcs ? String(qcs.channelId) : null,
        tier: qs ? qs.tier : null,
        caller: !qcs || !qcs.queueCall ? null
            : {
                uniqueId: String(qcs.queueCall.id),
                callerId: qcs.queueCall.caller
            },

        stats: {
            callsTaken: callsTaken,
            loginTime: qs ? qs.loginTime : null,
            callStartTime: qcs ? qcs.callStartTime : null,
            totalTalkTime: qs ? qs.talkTimeStats.total : 0,
            averageTalkTime: null,  // done below
            maxTalkTime: qs ? qs.talkTimeStats.max : 0,
            lastBridgeTime: qs ? qs.lastBridgeTime : 0,
            missedCallCount: qs ? qs.missedCallCount : 0,
        }
    };

    if (qcs && qcs.dialPeer) {
        status.dialPeer = qcs.dialPeer;
    }

    if (callsTaken)
        status.stats.averageTalkTime = qs.talkTimeStats.average();

    if (!qcs) {
        status.state = "idle";
        if (agent.wrapupTimer)
            status.state = "wrapup";
    } else if (agent.isDialingForQueue(queue)) {
        status.state = "dialing";
    } else switch (qcs.state) {
        case "ready":
        case "bridging":
            status.state = "dialing";
            break;

        case "bridged":
            status.state = "bridged";
            break;

        case "idle":
        case "transferring":
        case "call_shutdown":
        case "bridgeerr_shutdown":
        case "ack_shutdown":
        case "cancel":
        default:
            status.state = "idle";
            if (agent.wrapupTimer)
                status.state = "wrapup";
            break;

        // XXX if idle, check device state and queue.multiple_calls for busy.
    }

    return status;

};

Agent.prototype.getStatsFilename = function (qs) {
    return this.qm.statsDir + "/a" + encodeURIComponent(this.id) +
        "q" + encodeURIComponent(qs.queue.id) + ".stats";
};

Agent.prototype.emitStatus = function (qs) {
    var agent = this;
    var status = agent.getQueueStatus(qs.queue);

    agent.qm.emit("queue.agent.status", status);

    // write stats to a file for post-crash recovery.
    if (qs.queue.agentCallCount(agent) > 0 || qs.missedCallCount > 0) {
        status.stats.talkTimeStats = qs.talkTimeStats;
        fsPromise.writeFileAsync(
            agent.getStatsFilename(qs), JSON.stringify(status.stats)
        ).catch(function (e) {
            qs.queue.log("Error writing agent stats file: ", e);
        });
    }
};

// called at midnight to clear out stats.
Agent.prototype.resetStats = function () {
    var agent = this;
    var id;
    for (id in agent.queueState) {
        var qs = agent.queueState[id];
        qs.talkTimeStats = new StatKeeper();
        qs.missedCallCount = 0,
            qs.queue.setAgentCallCount(agent, 0);
        agent.emitStatus(qs);
    }
};

// load stats from cached file.
Agent.prototype.reloadStats = function (qs) {
    var agent = this;

    var fn = agent.getStatsFilename(qs);

    return agent.qm.readFileIfFromToday(fn
    ).then(function (obj) {
        if (obj === undefined)
            return;        // empty, no file, or too old.

        qs.talkTimeStats = new StatKeeper(obj.talkTimeStats);
        if (obj.loginTime)
            qs.loginTime = obj.loginTime;
        if (obj.lastBridgeTime)
            qs.lastBridgeTime = new Date(obj.lastBridgeTime);
        qs.queue.setAgentCallCount(agent, obj.callsTaken);
        qs.missedCallCount = obj.missedCallCount || 0;

    });
};

// the queue told us we got paused or unpaused.  Emit status event.
Agent.prototype.pauseChanged = function (queue) {
    var qs = this.queueState[queue.id];
    if (qs) {
        this.emitStatus(qs);
    }
}
