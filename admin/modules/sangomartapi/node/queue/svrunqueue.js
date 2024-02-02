/* vim: sw=4:softtabstop=4:expandtab 
four space indent, no tab chars.
*/

"use strict";

/*
 *   This is the driver program that drives the queue for switchvox.
 * All the database interactions and switchvox-specific code are 
 * isolated in here, so we could write another driver for some other 
 * non-switchvox queue product.
 *
 * In addition, it wraps the queuemanager api in an apibridge api
 * so that switchboard can listen to events and ask the queue for info.
 * This api is also used by AGIs, etc., to signal a queue reload or agent
 * login/out/pause.
 */

var apibridge = require("../lib/apibridge/apibridge.js") ;
var Promise = require('bluebird') ;
var DumbLogger = require("../lib/dumblogger.js") ;
var Account = require("../lib/account.js") ;
var svlogdb = require("./svlogdb.js") ;
var svautologout = require("./svautologout.js") ;
var promiseRows = require('../lib/db/promiseRows.js') ;
var serverUuid = require('../lib/serverid.js').getId() ;
const featureLogs = require('../lib/featureLogs.js');
var logger = new DumbLogger({ path: "/var/log/asterisk/sangomartapi/queue.log" }) ;

svlogdb.setLogger(logger) ;
svautologout.logger = logger ;

var exportedApi = new apibridge.ApiConnection() ;
apibridge.register("queue", function() { return exportedApi ; }) ;

// create the QueueManager object.  This doesn't do anything until we
// start adding queues to it.
var QueueManager = require('./queuemanager.js') ;
var qm = new QueueManager({logger: logger}) ;

// set it up so that log entries will be inserted into the db.
qm.on("queue.log", svlogdb.writeLogToDb) ;

// set it up so that on RINGNOANSWER messages we record missed call counts.
qm.on("queue.log", svautologout.handleLogMessage) ;

// set it up so we reset missed_calls_allowed when a call gets bridged.
qm.on("queue.agent.status", svautologout.handleAgentMessage) ;

// initial load queues from the database.

var db = require('../lib/db/connection.js').sharedPool ;

// create queues with one big query, then create the agents with one 
// query per queue.

// We synthesize a field caller_lang_locale, which will be null if 
//   the ui is set to "(Use Call Language)".
// Similar for callee_lang_locale, but I don't think it can be null.
function reloadQueues(reason) { 
    logger.log("RELOADING QUEUES because", reason) ;

    var advancedEnabled = true ;
    featureLogs.log(qm.queueFeatureName, featureLogs.getLogContext(),"Q:Reload","Queues reload started. Reason:"+reason);
    return getLicenseInfo().then((li) => {
        advancedEnabled = li.advanced_queue ;

        return promiseRows(db.query(
            `SELECT qc.*, qd.data as ring_strategy FROM queues_config as qc
            LEFT JOIN queues_details AS qd ON qc.extension = qd.id
            WHERE qd.keyword = 'strategy'`
            )) ;
    }).then(function(rows) {
        rows.forEach(function(row) {

            row.ringstrategy = row.ring_strategy;
            if (advancedEnabled) {
                // get queue priority from call_queue_values.
                row.queue_priority = row.queue_priority || 1 ;

                // enable advanced features if the queue says to use them.
                row.advanced = Boolean(Number(row.advanced)) ;
            } else {
                // force everything to the same queue priority
                row.queue_priority = 1 ;

                // force disable advanced queue features.
                row.advanced = false ;
            }

            // force-disable advanced features when advanced queues is
            // turned off.

            if (!row.advanced) {
                // tier2 agents may still exist (though the backend should
                // not put them in call_queue_members), but won't ever
                // be called.
                row.tier2_enabled = 0 ;

                // don't offer any callbacks to anyone (virtual queues).
                row.callback_enabled = 0 ;

                row.enable_global_arrival = 0 ;
            }

            // change the bare ids into Account objects.
            row.id = Account(row.extension, serverUuid) ;
        }) ;

        qm.setQueueList(rows) ;

        var qids = rows.map(function(row) { return row.id ; }) ;

        return Promise.all(qids.map(setupQueueMembers)) ;
    }).then(() =>{
        featureLogs.log(qm.queueFeatureName, featureLogs.getLogContext(),"Q:Reload","Queues reload completed.");
    }).catch(function(e) {
        qm.log(e.message, e.stack) ;
        throw e ;
    }) ;
}

reloadQueues("startup").then(function() {
    qm.recover() ;
}) ;

function getLicenseInfo()
{
    // TODO freepbx cleanup
    // check the vqplus module and integrate the logic in the next phase
    return Promise.resolve({advanced_queue: true});
}

// create agents for the specified queue id
function setupQueueMembers(qid) {
    var resolver = Promise.defer();
    var agentIds = [];
    if (typeof (qid) !== "object") {
        // assume it's a number and fix it.
        qid = Account(qid, serverUuid);
    }

    db.evtQuery("SELECT cqm.*, u.default_extension as extension, u.fname as first_name, u.lname as last_name, u.displayname as display_name " +
        "FROM sangomartapi_call_queue_members AS cqm " +
        "LEFT JOIN userman_users AS u ON cqm.person_account_id = u.id " +
        "WHERE cqm.call_queue_account_id = " + Number(qid.accountId)
    ).on("row", function (row) {
        try {
            var id = Account(row.person_account_id, serverUuid);
            qm.getAgent(id);
            row.agentId = id;
            agentIds.push(id);
            row.queueId = qid;
            qm.setQueueMemberInfo(row);
            if (row.loggedin == 0) {
                qm.agentLogout({ agentId: id, queueId: qid, tier: row.tier });
            } else {
                qm.agentLogin({
                    agentId: id, queueId: qid,
                    location: row.location, tier: row.tier
                });
            }
        } catch (e) {
            featureLogs.log(qm.queueFeatureName, featureLogs.getLogContext(),"Q:"+qid.accountId,`Error on setting Queue memeber ${row.person_account_id}. reason:${e.message}`);
            logger.log(e.message, e.stack);
        }
    }).on("end", function () {

        qm.removeRemovedAgents({ queueId: qid, agentIds: agentIds });
        let queue = qm.getQueueById(qid);
        if (queue) {
            qm.emit("queue.stats", queue.getStats());
        }
        resolver.resolve(true);

    }).on("error", function (e) {
        featureLogs.log(qm.queueFeatureName, featureLogs.getLogContext(),"Q:"+qid.accountId,`query failed in setupQueueMembers. reason:${e}`);
        logger.log("query failed in setupQueueMembers.");
        resolver.reject(e);
    });

    return resolver.promise;
}

// this is used (via NodeCall.pm) by switchvox perl code to 
// tell us to reload the queues.
exportedApi.reloadQueues = function(args, cb) {
    return reloadQueues("api").then(function() {
        logger.log("DONE RELOAD") ;
    }).nodeify(cb) ;
} ;

// this is used (via NodeCall.pm) by AGI::UserInfo to 
// tell us that someone's login or pause state changed.
exportedApi.reloadAgents = function(args, cb) 
{
    featureLogs.log(qm.queueFeatureName, featureLogs.getLogContext(),"Agent:Reload","Agents reload started.");
    if ( args.pauseReasonData ) {
        var aid = Account(args.pauseReasonData.account_id,
                               args.pauseReasonData.server_uuid) ;
        qm.setAgentPauseReason(aid, args.pauseReasonData.reason) ;
    }


    if (Array.isArray(args.queueIds)) {
        args.queueIds.forEach(setupQueueMembers) ;
    }
    // return Promise.resolve(1).nodeify(cb) ;
    return true;
} ;

// Generate snapshot of events to allow apibridge 
// clients to prepopulate current state.
exportedApi.snapshot = function (args) {
    return qm.snapshot(args);
};

var statusApis = require('./svgettodaysstatus.js').getApis(qm,logger) ;

exportedApi.getTodaysStatus = statusApis.getTodaysStatus ;
exportedApi.getCurrentStatus = statusApis.getCurrentStatus ;
var emitlogger = new DumbLogger({path: "/var/log/asterisk/sangomartapi/emits.log"}) ;
[
  "queue.agent.status",
  "queue.stats",
  "queue.calls",
  "queue.caller.status",
  "queue.log",
].forEach( function(msgType) {
    qm.on(msgType, function(data) {
        // turn this on to get /var/log/asterisk/sangomartapi/emits.log with all public 
        // messages.
        if (false) {
            emitlogger.log("vvvvv "+ msgType + " vvvvvvvv") ;
            emitlogger.log(data)
            emitlogger.log("^^^^^ "+ msgType + " ^^^^^^^^") ;
        }
        exportedApi.emit(msgType, data) ;
    }) ;
}) ;

apibridge.presentHttp({apiName: "queue", urlPath: "/queue"}) ;
