"use strict";
// four space indent, no tab chars.
// vim: sw=4:softtabstop=4:expandtab 
/*
      This file defines the Queue class, representing one queue.
 */

var fs = require('fs');
var Agent = require('./agent.js');
var QueueCall = require('./queuecall.js');
var StatKeeper = require('./statkeeper.js');
const featureLogs = require('../lib/featureLogs.js');
module.exports = Queue;

// Constructor for the Queue class.
function Queue(qm, args) {
    var queue = this;

    // make some properties non-enumerable so they don't get logged.
    "qm agents loggedOutAgents tier2agents".split(' ')
        .forEach(function (prop) {
            Object.defineProperty(queue, prop, {
                enumerable: false, writable: true
            });
        });

    this.qm = qm;

    this.update(args);
    this.id = args.id || args.account_id;

    if (!this.ringStrategy) {
        throw new RangeError("Must specify a valid ringStrategy (not " + this.ringStrategy + ")");
    }

    // this is the queue of calls.  Calls are generally pushed on the end
    // and shifted from the front.  This holds QueueCall objects, which 
    // are defined in queuecall.js.
    this.waitingCalls = [];

    // all live QueueCalls are stored in here, indexed by channel id.
    this.calls = {};

    // list of logged in Agents.  Paused agents are in here, but logged-out
    // agents and tier 2 agents are not.
    this.agents = [];

    // list of logged in agents from tier 2.
    this.tier2agents = [];

    // logged out agents are indexed here by id.
    this.loggedOutAgents = {};

    // information about agents for this queue which persists even when
    // an agent is logged out.  Most of this comes straight from the database
    // via the setAgentInfo call, but there is also some statistical information
    // such as number of calls.
    this.agentInfo = {};

    // a place for ring strategies to keep data they care about.  Strategies
    // can also keep stuff in the strategyData object on QueueCall.
    this.strategyData = null;

    // this is used so that we don't try to run two matches at once
    // while match is running some asynchronous operation.
    this.matchInProgress = false;

    // this is used so we know to run match again after the current one
    // ends, since something has changed.
    this.matchAgain = false;

    // This keeps track of how many ring strategy cycles have occurred
    // since the beginning of time.  The ring strategies are responsible
    // for updating it.  It can be a fractional number, so that strategies
    // can say they are 7/10ths of the way through cycle number 50.
    //
    // This number is copied to QueueCalls when they are created, so that
    // we now how many cycles have elapsed.  This drives the 
    // "If a queue call has passed through the ringing strategy X times"
    // feature in switchvox.
    this.ringCycleNumber = 0;

    // reload stats.  We first zero it out, then try and read cached stats
    // from a cache file asynchronously.  reloadStats will emit a stats message
    // no matter what happens.
    this.resetStats();
    this.reloadStats();
}

Queue.prototype.displayId = function () {
    return (this.extension) ? this.extension : String(this.id);
};

Queue.prototype.log = function (a) {
    var args = Array.prototype.slice.call(arguments);
    args.unshift("q" + this.displayId());
    this.qm.log.apply(this.qm, args);
}

Queue.prototype.resetStats = function () {
    this.stats = {
        // total number of incoming calls received.
        // Updated as soon as we see StasisStart.
        totalCallCount: 0,

        // number of calls ever bridged to an agent.
        totalBridgedCallCount: 0,

        missedCallCount: 0,

        redirectedCallCount: 0,
        transferredCallCount: 0,

        // used to calculate average entry position in queue.
        entryPositionStats: new StatKeeper(),

        // used to calculate average talk times.  updated at the end of a call.
        talkTimeStats: new StatKeeper(),

        // used to calculate average wait times.  updated at the end of a call.
        waitTimeStats: new StatKeeper(),

        // stats for calls hung up before being bridged
        abandonedPositionStats: new StatKeeper(),
        abandonedWaitTimeStats: new StatKeeper(),

        // stats for completed calls.
        completedWaitTimeStats: new StatKeeper(),

        // stats for calls where callback failed
        callbackFailWaitTimeStats: new StatKeeper(),

        // A moving average of the wait time for callers that connect to 
        // an agent.
        movingWaitTime: null,

    };

    this.emitStats();
};

// update fields in the queue.  Called by qm.setQueueList to sync with 
// database.  This mostly dumps raw data directly into the object from 
// call_queue_values and other tables, which is kinda gross.
Queue.prototype.update = function (args) {
    var k;
    for (k in args) {
        this[k] = args[k];
    }
    if (args.ringstrategy)
        this.ringStrategy = args.ringstrategy;
};

// this sets information about an agent, such as its position in this queue.
// This is for data that persists even when an agent is logged out.
// agentId is a required argument.
Queue.prototype.setAgentInfo = function (args) {
    var q = this;
    if (!args.agentId)
        throw new Error("need to pass agentId");
    var ai = q.agentInfo[args.agentId];
    if (!ai) {
        ai = q.agentInfo[args.agentId] = {};
    }
    var pause_until = ai.pause_until;
    var k;
    for (k in args) {
        ai[k] = args[k];
    }
    
    if (ai.pause_until != pause_until) {
        // pause state changed.  If the agent is logged in, 
        // tell agent to announce it.
        q.allAgents().forEach(function (agent) {
            if (agent.id.toString() === args.agentId.toString()) {
                agent.pauseChanged(q);
                q.emitStats();
            }
        });
        
    }
    featureLogs.log(
      this.qm.queueFeatureName,
      featureLogs.getLogContext(),
      "Q:" + args.call_queue_account_id,
      `Setting Agent Info for agent ${args.person_account_id} (${args.extension}).`,
      `{call_queue_member_id : ${args.call_queue_member_id}, queue_position: ${args.queue_position}, loggedin : ${args.loggedin}, queue_name : ${args.queue_name} }`
    );
}

// switchvox has a concept of paused agents, which are logged into the queue
// but not currently accepting calls.  This is driven by the pause_until
// value in call_queue_members.
Queue.prototype.isAgentPaused = function (agent) {
    var ai = this.getAgentInfo(agent);
    // pause_until in the database is a unix time in whole seconds.
    // Javascript uses unix time in millis.
    return (ai.pause_until && (ai.pause_until * 1000 > Date.now()))
};


// get the agentInfo object for this agent or agentId.  If none, make 
// an empty one.
Queue.prototype.getAgentInfo = function (agent) {
    var id = agent instanceof Agent ? agent.id : agent;
    var ai = this.agentInfo[id];
    if (!ai) {
        ai = this.agentInfo[id] = {};
    }
    return ai;
};

// a call's priority changed.  Adjust its position in waitingCalls.
Queue.prototype.reorderCall = function (qc) {
    var q = this;

    var pos = q.getCallPosition(qc);
    if (pos >= 0) {
        q.waitingCalls.splice(pos, 1);
        q.insertWaitingCalls(qc);
    }
}

// add a call to the waitingCalls list, inserting at the appropriate
// position.
//
// Since it's a disaster if a call in the wrong state gets into the queue,
// don't do that.
Queue.prototype.insertWaitingCalls = function (qc) {
    var waitingCalls = this.waitingCalls;
    var i;

    if ((i = this.waitingCalls.indexOf(qc)) !== -1) {
        this.waitingCalls.splice(i, 1);
    }

    switch (qc.state) {
        case "waiting":
        case "dialingagent":
        case "offlinedial":
        case "announcing":
        case "callbacknumberivr":
        case "offlinewait":
        case "offlinedialing":
        case "offlinedialingagent":
        case "offlineretrywait":
            break; // ok states.
        default:
            this.log("BUG!  Attempt to enqueue qc", qc.id, "in wrong state",
                qc.state);
            return;
    }

    // most queue calls are added at the end, so start at the back.
    for (i = waitingCalls.length - 1; i >= 0; i--) {
        if (QueueCall.priorityCompare(qc, waitingCalls[i]) < 0) {
            // qc belongs after the [i] call in the list.
            waitingCalls.splice(i + 1, 0, qc);
            this.qm.emit("queue.calls", this.getCalls());
            return;
        }
    }

    // if we got this far, we are the highest priority.
    waitingCalls.unshift(qc);
    this.qm.emit("queue.calls", this.getCalls());
};

Queue.prototype.addAgentInTier = function (agent, tier) {
    var notAgentFunc = function (a) { return a != agent; };

    this.agents = this.agents.filter(notAgentFunc);
    this.tier2agents = this.tier2agents.filter(notAgentFunc);

    if (tier === 2) {
        this.tier2agents.push(agent);
    } else {
        this.agents.push(agent);
    }

    this.emitStats();
}

Queue.prototype.removeAgent = function (agent) {
    var q = this;
    [q.agents, q.tier2agents].forEach(function (arr) {
        var idx = arr.indexOf(agent);
        if (idx != -1) {
            arr.splice(idx, 1);
            q.emitStats();
        }
    });

    for (var id in q.calls) {
        var qc = q.calls[id];
        if (qc.reservedForAgent === agent) {
            qc.reservedForAgent = null;
            qc.reservedSince = 0;
            q.reorderCall(qc);
            qc.emitStatusMessage();
            q.nextTickMatch("resLogout");
        }
    }
};

Queue.prototype.nextTickMatch = function (reason) {
    var q = this;
    process.nextTick(() => {
        // q.match(reason);
    });
}

Queue.prototype.bumpAgentCallCount = function (agent) {
    var ai = this.getAgentInfo(agent);
    ai.callCount = ai.callCount || 0;
    ai.callCount++;
};
Queue.prototype.setAgentCallCount = function (agent, count) {
    var ai = this.getAgentInfo(agent);
    ai.callCount = count;
};
Queue.prototype.agentCallCount = function (agent) {
    var ai = this.getAgentInfo(agent);
    return ai.callCount || 0;
};

Queue.prototype.removeWaitingCall = function (qc) {
    var pos = this.getCallPosition(qc);
    if (pos >= 0) {
        this.waitingCalls.splice(pos, 1);
    }
}

Queue.prototype.callExitedQueue = function (qc) {
    delete this.calls[qc.id];
    this.removeWaitingCall(qc);
}

// returns the position of the call in the queue, or -1.
Queue.prototype.getCallPosition = function (qc) {
    return this.waitingCalls.indexOf(qc);
}

// stats that can be directly copied to the queue.stats event.  Others 
// must be mathed up.
var statsToCopy = [
    "totalCallCount",
    "totalBridgedCallCount",
    "redirectedCallCount",
    "transferredCallCount",
    "missedCallCount",
];

// generate body of emitStats.
Queue.prototype.getStats = function () {
    var q = this;
    var stats = q.stats;
    var ret = {};
    statsToCopy.forEach(function (stat) {
        ret[stat] = stats[stat];
    });

    ret.queueId = q.id;

    ret.averageTalkTime = stats.talkTimeStats.average();
    ret.maxTalkTime = stats.talkTimeStats.max;
    ret.averageWaitTime = stats.waitTimeStats.average();
    ret.maxWaitTime = stats.waitTimeStats.max;
    ret.maxCompletedWaitTime = stats.completedWaitTimeStats.max;
    ret.averageCompletedWaitTime = stats.completedWaitTimeStats.average();
    ret.maxAbandonedWaitTime = stats.abandonedWaitTimeStats.max;
    ret.averageAbandonedWaitTime = stats.abandonedWaitTimeStats.average();
    ret.maxAbandonedWaitTime = stats.abandonedWaitTimeStats.max;
    ret.averageAbandonedPosition = stats.abandonedPositionStats.average();
    ret.abandonedCallCount = stats.abandonedWaitTimeStats.count;
    ret.averageEntryPosition =
        Number((stats.entryPositionStats.average() + .005).toFixed(2));
    ret.maxEntryPosition = stats.entryPositionStats.max;
    ret.oldestWaitingTime = null;
    ret.now = Date.now();


    ret.maxCallbackFailWaitTime = stats.callbackFailWaitTimeStats.max;
    ret.averageCallbackFailWaitTime = stats.callbackFailWaitTimeStats.average();
    ret.maxCallbackFailWaitTime = stats.callbackFailWaitTimeStats.max;
    ret.averageCallbackFailPosition = stats.callbackFailWaitTimeStats.average();
    ret.callbackFailCallCount = stats.callbackFailWaitTimeStats.count;

    ret.waitingCount = q.waitingCalls.length;

    ret.currentBridgedCallCount = 0;
    var id;
    for (id in q.calls) {
        if (q.calls[id].state === 'bridged') {
            ret.currentBridgedCallCount++;
        }


        // determine the start time of the oldest waiting call.
        switch (q.calls[id].state) {
            case "new":
            case "answering":
            case "waiting":
            case "dialingagent":
            case "announcing":
            case "answerout":
            case "bridging":
            case "callbacknumberivr":
            case "offlinedial":
            case "offlinewait":
            case "offlinedialingagent":
                var tt = q.calls[id].waitWatch.getStartTime();
                if (!ret.oldestWaitingTime || tt < ret.oldestWaitingTime) {
                    ret.oldestWaitingTime = tt;
                }
        }
    }

    ret.loggedInAgents = q.agents.length;
    ret.agentCount = q.agents.length + Object.keys(q.loggedOutAgents).length;
    ret.pausedAgents = 0;
    ret.dialableAgents = 0;
    q.agents.forEach(function (agent) {
        if (q.isAgentPaused(agent)) {
            ret.pausedAgents++;
        }
    });
    ret.dialableAgents = ret.loggedInAgents - ret.pausedAgents - ret.currentBridgedCallCount; 
    ret.priority = q.queue_priority;
    ret.allQueuesMaxPriority = q.qm.maxPriority;
    ret.advanced = q.advanced;

    return ret;
};

Queue.prototype.getStatsFilename = function () {
    return this.qm.statsDir + "/q" + encodeURIComponent(this.id) + ".stats";
};

// returns { queueId: id, bridgedCalls: [list of ids], waitingCalls:[list ] 
Queue.prototype.getCalls = function () {
    var q = this;

    var bridgedCalls = [];
    var id;
    for (id in q.calls) {
        if (q.calls[id].state === 'bridged') {
            bridgedCalls.push(id);
        }
    }

    var waitingCalls = q.waitingCalls.map(function (qc) { return qc.id; });

    return {
        queueId: q.id,
        bridgedCalls: bridgedCalls,
        waitingCalls: waitingCalls,
    };
}

Queue.prototype.emitStats = function () {
    var queue = this;
    queue.qm.emit("queue.stats", queue.getStats());
    queue.qm.emit("queue.calls", queue.getCalls());

    // write stats to a file so we can recover after a crash.  We 
    // check for at least one call as a cheesy way to avoid a startup
    // race condition wiping the stats before we can reload them.

    if (queue.stats.totalCallCount > 0) {
        fs.writeFile(queue.getStatsFilename(),
            JSON.stringify(queue.stats),
            function (err) {
                if (err)
                    queue.log("error writing stats file", err);
            }
        );
    }
};


// reload cached stats from a stats file.  called on restart to recover from
// crashes.
Queue.prototype.reloadStats = function () {
    var queue = this;


    var fn = queue.getStatsFilename();

    return queue.qm.readFileIfFromToday(fn
    ).then(function (obj) {
        if (obj === undefined)
            return;    // empty, no file, or too old.

        var oldstats = queue.stats;
        queue.stats = obj;

        // turn things back into StatKeeper objects.  This is done
        // against oldstats so that we can upgrade the code to add more 
        // statkeepers and survive old stats files.
        for (var stat in oldstats) {
            if (oldstats[stat] instanceof StatKeeper) {
                queue.stats[stat] = new StatKeeper(queue.stats[stat]);
            }
        }

        queue.emitStats();
    });
};

// Generate snapshot status for a single agent in the queue, or all if null
Queue.prototype.agentSnapshot = function (agent) {
    var q = this;
    if (agent)
        return agent.getQueueStatus(q);

    var snapshot = [];
    q.allAgents().forEach(function (agent) {
        snapshot.push(agent.getQueueStatus(q));
    });
    var id;
    for (id in q.loggedOutAgents) {
        snapshot.push(q.loggedOutAgents[id].getQueueStatus(q));
    }
    return snapshot;
};

// Generate snapshot status for each queue call
Queue.prototype.callerSnapshot = function () {
    var queue = this;
    var snapshot = [];
    var id;
    for (id in queue.calls) {
        var qc = queue.calls[id];
        snapshot.push(qc.getStatusMessage());
    }
    return snapshot;
};

// emits logging information.
Queue.prototype.emitLog = function (args) {
    var q = this;
    var qc = args.queueCall;      // may be null.

    var agentId = "agentId" in args ? args.agentId
        : (qc && qc.agent ? qc.agent.id : null);
    var extension = 0;
    if (agentId) {
        var ai = q.getAgentInfo(agentId);
        if (ai)
            extension = ai.extension || 0;
    }

    var msg = {
        type: args.type || "UNKNOWN",
        call_date: args.call_date || qc.waitWatch.getStartTime(),
        queueId: q.id,
        queue_name: q.queue_name,
        caller_id: args.caller_id || (qc.caller ? qc.caller.number : "NONE"),
        wait_time: args.wait_time || qc ? Math.round(qc.waitWatch.value() / 1000) : 0,
        talk_time: args.talk_time || qc ? Math.round(qc.talkWatch.value() / 1000) : 0,
        offline_wait_time: args.offline_wait_time || qc ? Math.round(qc.offlineWaitWatch.value() / 1000) : 0,
        callback_number: args.callback_number || qc ? qc.callbackNumber : null,
        enter_position: "enter_position" in args
            ? args.enter_position
            : (qc ? qc.initialPosition + 1 : 1),
        agentId: agentId,
        abandon_position: args.abandon_position || 1,
        exit_position: args.exit_position || 0,
        uniqueid: args.uniqueid || qc.id,
        agent: extension
    };
    featureLogs.log(
        this.qm.queueFeatureName,
        featureLogs.getLogContext(),
        "Q:" + q.id.account_id,
        `Emitting Log ${args.person_account_id} (${args.extension}).`,
        `{ ${args.queue_name} }`
      );
    // these get written as json sometimes, so include the qm but don't
    // let it get written.
    Object.defineProperty(msg, "qm", {
        enumerable: false,
        value: q.qm
    });
    
    q.qm.emit("queue.log", msg);
};

// given a list of currently-live agent ids, log out any agents that 
// aren't in the list.
Queue.prototype.removeRemovedAgents = function (agentIds) {
    var queue = this;

    // find agents in agents that are not in agentIds.
    // since agentIds for switchvox are an object, convert to a string
    // and then do the compares.
    var knownAgents = queue.allAgents();
    var id;
    for (id in queue.loggedOutAgents) {
        knownAgents.push(queue.loggedOutAgents[id]);
    }

    var toRemove = knownAgents.filter(function (agent) {
        var id1 = String(agent.id);
        return !agentIds.some(function (id2) {
            return id1 === String(id2);
        })

    });
    toRemove.forEach(function (agent) {
        var ai = queue.agentInfo[agent.id];
        if (ai) {
            // so that the queue.agent.state message looks different.
            ai.member_type = "nonmember";
        }
        agent.removeFromQueue(queue);   // sends message
    });
}

// recreate a queue call during startup.  See QueueManager recoverCall
// for argument descriptions.  args.agent is additionally added.
Queue.prototype.recoverCall = function (args) {
    var q = this;

    var qc = new QueueCall({
        id: args.queueChannel.id,
        qm: q.qm,
        queue: q,
        caller: args.queueChannel.caller,
    });
    qc.arrivalTime = Number(qc.id) * 1000;

    q.calls[qc.id] = qc;

    q.qm.claimChannel(qc, args.queueChannel.id);

    if (args.agentChannel && args.agent) {
        qc.state = 'bridged';
        qc.agent = args.agent;

        q.log("recovering queue call " + qc.id + " as bridged");
        // args.agent.recoverBridgedCall(qc, args);
        q.stats.totalCallCount++;
        q.stats.totalBridgedCallCount++;
        qc.emitStatusMessage();
        q.emitStats();
    } else {
        q.log("recovering " + qc.id + " as waiting");

        qc.state = 'waiting';
        q.insertWaitingCalls(qc);

        q.log("recovered queue call " + qc.id + " as waiting");
        // setTimeout(function () { q.match("recover") }, 10000);

        q.stats.totalCallCount++;
        qc.emitStatusMessage();
        q.emitStats();
    }
};

// Given the parsed contents of an offline call recovery file,
// make a new QueueCall out of it and start waiting for it.
Queue.prototype.recoverOfflineCall = function (data) {
    var qc = QueueCall.recreateOfflineCall(this, data);
    this.calls[qc.id] = qc;
    this.insertWaitingCalls(qc);
    this.qm.claimChannel(qc, qc.id);
    qc.emitStatusMessage();
    this.emitStats();
    qc.log("recovered from offline", data);
}

// return logged in agents from all tiers.
Queue.prototype.allAgents = function () {
    return this.agents.concat(this.tier2agents);
}
