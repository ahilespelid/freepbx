"use strict";
// four space indent, no tab chars.
// vim: sw=4:softtabstop=4:expandtab 

// this module is a replacement for the traffic_cop method 
// switchvox.users.callQueues.getTodaysStatus.  It is called by
// Switchvox::API::CallQueues::getTodaysStatus.
//
// It also implements most of the getCurrentStatus api, which 
// used to be implemented by fetching data from AMI.

var qm;
var logger;
var serverUuid = require('../lib/serverid.js').getId();
var promiseRows = require('../lib/db/promiseRows.js');
var db = require('../lib/db/connection.js').sharedPool;
var Account = require('../lib/account.js');
var Promise = require('bluebird');
var switchvoxData = require('../lib/switchvoxData.js');


module.exports.getApis = getApis;


function getApis(_qm, _logger) {
    qm = _qm;
    logger = _logger;

    return {
        getTodaysStatus: getTodaysStatus,
        getCurrentStatus: getCurrentStatus
    }
}

// guts of switchvox.callQueues.getCurrentStatus.
// only argument is queue_account_id.
function getCurrentStatus(args) {
    var queueId = Account(args.queue_account_id, serverUuid);

    var retVal = {};
    var perm;

    return makeOverview(queueId
    ).then(function (overview) {
        if (overview != null)
            retVal.overview = overview;
        return makeDetailed(queueId);
    }).then(function (detailed) {
        if (detailed != null)
            retVal.detailed_view = detailed;
    }).then(function () {
        var qd = qm.getQueueData(queueId);
        retVal.displayname = qd.displayname;
        retVal.extension = qd.extension;
        retVal.strategy = qd.strategy;
        retVal.account_id = queueId.accountId;
        return retVal;
    });
}

// guts of switchvox.users.callQueues.getTodaysStatus.
// args contains account_id, queue_account_id
function getTodaysStatus(args) {
    var agentId = Account(args.account_id, serverUuid);
    var queueId = Account(args.queue_account_id, serverUuid);

    var retVal = {};
    var perm;

    return switchvoxData.getCallQueuePermission({
        srcAccount: agentId,
        trgtAccount: queueId
    }).then(function (_perm) {
        perm = _perm;
        if (perm == undefined)  // no permission.
            return null;
        return makeMyStatus(agentId, queueId);
    }).then(function (myQueueStatus) {
        if (myQueueStatus != null)
            retVal.my_status = myQueueStatus;
    }).then(function () {
        if (!perm || perm === 'myStatus')    // can't see overview.
            return null;
        return makeOverview(queueId);
    }).then(function (overview) {
        if (overview != null)
            retVal.overview = overview;

        if (perm !== 'detailedView' && perm !== 'callControl')    // can't see detailed.
            return null;
        return makeDetailed(queueId);
    }).then(function (detailed) {
        if (detailed != null)
            retVal.detailed_view = detailed;
    }).then(function () {
        var qd = qm.getQueueData(queueId);
        retVal.displayname = qd.displayname;
        retVal.extension = qd.extension;
        retVal.account_id = queueId.accountId;
        return retVal;
    }).catch(function (e) {
        logger.log(e);
        throw e;
    });
}

function toSeconds(ms) { return Math.floor((ms || 0) / 1000); }

// return a Promise for the myQueueStatus section.
function makeMyStatus(agentId, queueId) {
    var retVal = {};

    // get an array of statuses for agents from this queue.
    var agentStatus = qm.snapshot({
        event: "queue.agent.status",
        queueId: queueId,
        agentId: agentId
    });

    if (!agentStatus)
        return Promise.resolve({});


    return Promise.resolve(mangleAgentData(agentStatus));
}



// take the body of a queue.caller.status mesasage and turn it into
// the format the perl api expects.  That seems to be like this:
// { 'talking_to_name' => 'F211',
//   'entered_position' => '1',
//   'position' => '1',
//   'talking_to_number' => '211',
//   'waiting_duration' => '63'
// }
function mangleCallerData(callerStatus) {
    var cname = "";
    var cnum = "";
    if (callerStatus.callerId) {
        cname = callerStatus.callerId.name;
        cnum = callerStatus.callerId.number;
    }

    var waitTime;
    if (callerStatus.waitStartTime) {
        if (callerStatus.waitEndTime)
            waitTime = callerStatus.waitEndTime - callerStatus.waitStartTime;
        else
            waitTime = Date.now() - callerStatus.waitStartTime;
    } else {
        // this can happen if the queue restarts and recovers; wait start
        // times aren't preserved, and zero is better than 1.4 billion.
        waitTime = 0;
    }

    return {
        caller: callerStatus.callerId,
        position: callerStatus.position + 1,
        waitTime: toSeconds(waitTime),
        initialPosition: callerStatus.initialPosition + 1,
    };

}

// take the body of a queue.agent.status message and turn it into 
// the format that the perl api expects.  Mostly this is just rewriting
// names.
function mangleAgentData(agentStatus) {

    var retVal = {};
    var stats = agentStatus.stats || {};
    retVal.state = agentStatus.state;
    retVal.account_id = agentStatus.accountId.accountId;
    retVal.extension = agentStatus.extension;
    retVal.totalTalkTime = toSeconds(stats.totalTalkTime);
    retVal.avgTalkTime = toSeconds(stats.averageTalkTime);
    retVal.maxTalkTime = toSeconds(stats.maxTalkTime);
    if (stats.callStartTime) {
        retVal.current_call_duration =
            toSeconds(Date.now() - stats.callStartTime);
    }
    retVal.order = agentStatus.position;
    retVal.fullname = agentStatus.firstName;
    if (agentStatus.lastName)
        retVal.fullname += " " + agentStatus.lastName;

    retVal.caller = agentStatus.caller ? agentStatus.caller.callerId : null;
    if (agentStatus.loginState) {
        retVal.login_status = (agentStatus.memberType === "permanent")
            ? "permanent"
            : "logged_in";
    } else {
        retVal.login_status = "logged_out";
        if (!agentStatus.memberType || agentStatus.memberType === 'nonmember') {
            retVal.login_status = "0";
        }
    }

    retVal.login_type = agentStatus.memberType == "permanent"
        ? "permanent"
        : "login";

    retVal.callsTaken = stats.callsTaken;
    retVal.loginTime = toSeconds(stats.loginTime);
    retVal.lastBridgeTime = toSeconds(stats.lastBridgeTime);
    retVal.pausedSince = toSeconds(agentStatus.pausedSince);

    return retVal;
}


// return a Promise for the overview section.
function makeOverview(queueId) {
    var stats = qm.snapshot({
        event: "queue.stats",
        queueId: queueId
    });

    var retVal;
    retVal = {
        waitingCount: stats.waitingCount,
        currentBridgedCallCount: stats.currentBridgedCallCount,
        agentCount: stats.agentCount,
        totalCallCount: stats.totalCallCount,
        abandonedCallCount: stats.abandonedCallCount,
        redirectedCallCount: stats.redirectedCallCount,
        totalBridgedCallCount: stats.totalBridgedCallCount,
        avgTalkTime: toSeconds(stats.averageTalkTime),
        maxTalkTime: toSeconds(stats.maxTalkTime),
        maxWaitTime: toSeconds(stats.maxWaitTime),
        avgWaitTime: toSeconds(stats.averageWaitTime),
        avgEntryPosition: stats.averageEntryPosition + 1,
        maxEntryPosition: stats.maxEntryPosition + 1,
        maxAbandonedWaitTime: toSeconds(stats.maxAbandonedWaitTime),
        averageAbandonedWaitTime: toSeconds(stats.averageAbandonedWaitTime),
        maxCompletedWaitTime: toSeconds(stats.maxCompletedWaitTime),
        averageCompletedWaitTime: toSeconds(stats.averageCompletedWaitTime),
        loggedInAgents: stats.loggedInAgents,
    };

    return Promise.resolve(retVal);
}

// return a Promise for the detailed_view section
function makeDetailed(queueId) {
    var retVal = {
        queue_members: [],
    };


    // array of queue.caller.status messages.
    var waiting = qm.snapshot({
        event: "queue.caller.status",
        queueId: queueId
    }).filter(function (entry) {
        return entry.state !== "bridged";
    }).map(mangleCallerData);

    retVal.waiting_callers = waiting;

    return promiseRows(db.query(
        "select * from call_queue_members" +
        " WHERE call_queue_account_id = ? ",
        [queueId.accountId]
    )).then(function (rows) {
        rows.forEach(function (row) {
            var i;
            var agentSnap = qm.snapshot({
                event: "queue.agent.status",
                queueId: queueId,
                agentId: Account(row.person_account_id, serverUuid)
            });

            var mangled = mangleAgentData(agentSnap);
            mangled.account_id = agentSnap.accountId.accountId;

            retVal.queue_members.push(mangled);
        });

        retVal.queue_members = retVal.queue_members.sort(
            function (a, b) { return a.order - b.order }
        );

        return retVal;
    });

}
