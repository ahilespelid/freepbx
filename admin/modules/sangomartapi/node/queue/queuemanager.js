"use strict";
// vim: sw=4:softtabstop=4:expandtab 
/* 
   This file defines the QueueManager object.  The QueueManager owns
   all the Queue and Agent objects, distributes websocket events to Queues and
   Agents, and provides the public interface to the queues.

 */

const fs = require('fs');
const fsPromise = require('../lib/promise_fs.js');
const child_process = require('child_process');
const util = require('util')
const EventEmitter = require("events").EventEmitter;

const Agent = require('./agent.js');
const Queue = require('./queue_event_listener.js');
var QueueCall = require('./queuecall.js');
const Account = require('../lib/account.js');
const abc	= require('../lib/rtapi/lib/apibridgeconnection.js');
const recovery = require("./recovery.js");
const AMI = require("../lib/ami.js");
const mysql = require('mysql');
const promiseRows	= require('../lib/db/promiseRows.js') ;
const serverUuid = require('../lib/serverid.js').getId() ;
const db = require('../lib/db/connection.js').sharedPool ;
const aRows = require('../lib/db/aRows.js') ;
const featureLogs = require('../lib/featureLogs.js');
var missedCall = [];

module.exports = QueueManager;

function QueueManager(args) {

    ///// public members
    const queueFeatureName = 'queue';
    var logger = args.logger || console;
    this.log = logger.log;

    const astMgrPort = process.env['ASTMANAGERPORT'] || 5038;
    let manager = new AMI({
        port: astMgrPort,
        host: '127.0.0.1',
        username: 'srtapi_queue_events',
        password: process.env.srtapi_queue_events,
        event: 'on',
        reconnect: true
    });

    // the websocket connection.
    this.ws = null;

    ///// private vars

    var qm = this;

    // Queue objects indexed by queue id.
    var queues = {};

    // Queue call objects indexed by call unique id.
    var queueCalls = {};

    // agents indexed by agent id.
    var agents = {};

    // maps channel id to the object that owns this channel, which could be a
    // queue (for an incoming queue call) or an agent (for an outgoing agent call).
    // Used to send events to the right object.
    var callOwnerObject = {};

    ///// public methods

    this.agentLogin = agentLogin;
    this.agentLogout = agentLogout;
    this.getAgent = getAgent;
    this.setQueueList = setQueueList;
    this.setQueueMemberInfo = setQueueMemberInfo;
    this.claimChannel = claimChannel;
    this.unclaimChannel = unclaimChannel;
    this.removeRemovedAgents = removeRemovedAgents;
    this.recover = function () { recovery.recover(qm) };
    this.recoverCall = recoverCall;
    this.recoverOfflineCall = recoverOfflineCall;
    this.statsDir = "/var/log/asterisk/sangomartapi/nodequeue";
    this.readFileIfFromToday = readFileIfFromToday;
    this.snapshot = snapshot;
    this.getQueueData = getQueueData;
    this.setAgentPauseReason = setAgentPauseReason;
    this.shutdownQueue = shutdownQueue;
    this.getQueueById = getQueueById;
    this.maxPriority = 1;
    this.queueFeatureName = queueFeatureName;
	const queue = abc.connect('queue');

    process.on("SIGUSR2", function () {
        logger.log("DUMP QUEUES:", util.inspect(queues, { depth: 7 }));
        logger.log("DUMP AGENTS:", util.inspect(agents, { depth: 7 }));
    });


    ///// main code 

    // make a directory to store stats, etc.  This only happens at startup,
    // so we'll do it synchronously.
    try {
        fs.mkdirSync(this.statsDir);
    } catch (e) { }       // ignore EEXISTS error.

    // set up the websocket to asterisk.

    manager.on('managerevent', function (evt) {
        if ((evt.event && evt.event.toLowerCase().includes('queue')) || (evt.userevent && evt.userevent.toLowerCase().includes('queue'))) {
            featureLogs.log(queueFeatureName,featureLogs.getLogContext(), '----- Received queue related event -----', JSON.stringify(evt));
        }
        if (evt.interface) {
            let extension = evt.interface.match(/(?<=Local\/)\d+(?=@.*)/);
            if (extension) {
                let sql = "SELECT * from userman_users WHERE default_extension = ? ";
                sql = mysql.format(sql, [extension]);
                promiseRows.single(db.query(sql)).then(function (row) {
                    if (row) {
                        evt.extension = row.default_extension;
                        evt.userId = row.id;
                        switch (evt.event.toLowerCase()) {
                            case 'queuememberadded':
                                emitQueueMemberAdded(evt);
                                break;
                            case 'queuememberremoved':
                                emitQueueMemberRemoved(evt);
                                break;
                            case 'queuememberpause':
                                emitQueueMemberPause(evt);
                                break;
                            default:
                                break;
                        }
                    }
                }).catch((e) => { logger.error(e); });
            }
        } else {
            switch (evt.event.toLowerCase()) {
                case 'queuecallerjoin':
                    emitQueueCallerJoin(evt);
                    break;
                case 'queuecallerleave':
                    emitQueueCallerLeave(evt);
                    break;
                case 'attendedtransfer':
                    emitAttendedTransfer(evt);
                    break;
                case 'userevent':
                    if (evt.userevent == 'QueueCallHangup') {
                        if (evt.scd_connect_agent != '') {
                            emitQueueCallHangup(evt);
                        } else {
                            let queueId = Account(evt.q, serverUuid);
                            let q = qm.getQueueById(queueId);
                            if (q) {
                                removeDisconnectedCallData(q, evt);
                            }
                        }
                    } else if (evt.userevent == 'QueueMemberCallHangup' && (evt.dialstatus == "CANCEL" || evt.dialstatus == "NOANSWER" || evt.dialstatus == "BUSY")) {
                        emitQueueMissedCallEvent(evt)
                        emitQueueMemberCallHangup(evt);
                    } else if (evt.userevent == 'QueueMemberCallHangup' && (evt.dialstatus == "CHANUNAVAIL" || evt.dialstatus == "CONGESTION")) {
                        emitQueueMemberCallHangup(evt);
                    } else if (evt.userevent == 'reset-queue-stats') {
                        statResetCheck(evt.queueid);
                    } else if (evt.userevent == 'QueueMemberCallDial') {
                       emitQueueMemberCallDial(evt);
                    }
                    break;
                default:
                    break;
            }
        }
    });

    async function emitQueueMemberCallDial(evt){
        let userData = await aRows.single(
            "SELECT id from userman_users WHERE default_extension = ?",
            [evt.qagent]
        );
        if (userData) {
            let userId = Account(userData.id, serverUuid);
            let agent = qm.getAgent(userId);
            if (agent) {
                let queueId = Account(evt.queue, serverUuid);
                let q = qm.getQueueById(queueId);

                let linid = evt.linkedid[0]
                let qs = agent.getOrMakeQueueState(q);
                qs.calls.push({queueCall : q.calls[linid]});
                agent.emitStatus(qs);
            }

            featureLogs.log(queueFeatureName,featureLogs.getLogContext(), 'Q:'+evt.queue, 'Call from '+evt.calleridnum+
            '. Dialing agent -'+evt.qagent+'.(CallerIDName: '+evt.calleridname+',Channel: '+evt.channel+', UniqueId: '+
            evt.uniqueid+', LinkedId: '+evt.linkedid+', UserId:'+userData.id+').');
        }
    }
    
    async function emitQueueMemberCallHangup(evt) {
        let queueId = Account(evt.queue, serverUuid);
        let q = qm.getQueueById(queueId);

        let userData = await aRows.single(
            "SELECT id FROM userman_users WHERE default_extension = ?",
            [evt.qagent]
        );

        if (userData) {
            let userId = Account(userData.id, serverUuid);
            let agent = qm.getAgent(userId);
            let qs = agent.getOrMakeQueueState(q);
            for(let i = 0; i < agent.queueState[q.id].calls.length; i++){
                if(agent.queueState[q.id].calls[i].queueCall.id == evt.linkedid){
                    agent.queueState[q.id].calls[i].callStartTime = null;
                    qs.calls.splice(i,1);
                }
            }
            agent.emitStatus(qs);

            featureLogs.log(queueFeatureName, featureLogs.getLogContext(), 'Q:'+evt.queue, 'Call from '+evt.calleridnum+
            ' ended. (CallerIDName: '+evt.calleridname+',Channel: '+evt.channel+', UniqueId: '+evt.uniqueid+', LinkedId: '+evt.linkedid+', UserId:'+
            userData.id+', DialStatus:'+evt.dialstatus+', QAgent:'+evt.qagent+').');
        }
    }

    /**
     * removes call data of agents that was not cleared even after a call is disconnected
     * this usually happens if an event is not received from asterisk
     * @param {object} q
     * @param {object} evt
     */
    function removeDisconnectedCallData(q, evt) {
        q.allAgents().forEach(function (agent) {
            let qs = agent.getOrMakeQueueState(q);
            for (let i = 0; i < agent.queueState[q.id].calls.length; i++) {
                if (agent.queueState[q.id].calls[i].queueCall.id == evt.linkedid) {
                    agent.queueState[q.id].calls[i].callStartTime = null;
                    featureLogs.log(queueFeatureName, featureLogs.getLogContext(), 'Q:' + evt.q, '******************************');
                    featureLogs.log(queueFeatureName, featureLogs.getLogContext(), 'Q:' + evt.q, '----- Linked ID: ' + evt.linkedid);
                    let callData = agent.queueState[q.id].calls.splice(i, 1);
                    agent.emitStatus(qs);
                    featureLogs.log(queueFeatureName, featureLogs.getLogContext(), 'Q:' + evt.q, '----- cleared call data in the queue ' + evt.q + ' for the agent ' + agent.extension);
                    featureLogs.log(queueFeatureName, featureLogs.getLogContext(), 'Q:' + evt.q, '----- cleared call data: ', JSON.stringify(callData));
                    featureLogs.log(queueFeatureName, featureLogs.getLogContext(), 'Q:' + evt.q, '----- event data: ', JSON.stringify(evt));
                    featureLogs.log(queueFeatureName, featureLogs.getLogContext(), 'Q:' + evt.q, '----- agent data: ', JSON.stringify(agent));
                }
            }
        });
    }

    function emitQueueMemberAdded(evt) {
        var d = new Date(evt.logintime * 1000);
        var login_time = d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate() + ' ' + d.getHours() + ':' + d.getMinutes() + ':' + d.getSeconds();
        let sql = "UPDATE sangomartapi_call_queue_members SET loggedin = 1, login_time = ? WHERE call_queue_account_id = ? AND member_type = 1 AND person_account_id = ?";
        sql = mysql.format(sql, [login_time, evt.queue, evt.userId]);
        promiseRows.do(db.query(sql)).then(() => {
            logger.debug('Queue login registered for the user ' + evt.extension);
            queue.call('reloadAgents', {
                queueIds: [evt.queue]
            });
        }).catch((e) => { logger.error(e); });

        featureLogs.log(queueFeatureName,featureLogs.getLogContext(), 'Q:'+evt.queue, 'Agent '+evt.membername+
        ' has been added to the queue. (UserId: '+evt.userId+',CallsTaken: '+evt.callstaken+', LoginTime: '+evt.logintime+').');
    }

    function emitQueueMemberRemoved(evt) {
        let sql = "UPDATE sangomartapi_call_queue_members SET loggedin = 0, paused_since = 0, pause_until = 0 WHERE call_queue_account_id = ? AND member_type = 1 AND person_account_id = ?";
        sql = mysql.format(sql, [evt.queue, evt.userId]);
        promiseRows.do(db.query(sql)).then(() => {
            logger.debug('Queue logout registered for the user ' + evt.extension);
            queue.call('reloadAgents', {
                queueIds: [evt.queue]
            });
        }).catch((e) => { logger.error(e); });

        featureLogs.log(queueFeatureName, featureLogs.getLogContext(), 'Q:'+evt.queue, 'Agent '+evt.membername+
        ' has logged out of the queue. (UserId: '+evt.userId+',CallsTaken: '+evt.callstaken+', LoginTime: '+evt.logintime+').');
    }

    function emitQueueMemberPause(evt) {
        let paused = evt.paused;
        let pausedSince = paused == '1' ? parseInt(Date.now() / 1000) : 0;
        let pauseUntil = paused == '1' ? (pausedSince + 365 * 24 * 60 * 60) : 0;
        let sql = "UPDATE sangomartapi_call_queue_members SET paused_since = ?, pause_until = ? WHERE call_queue_account_id = ? AND person_account_id = ?";
        sql = mysql.format(sql, [pausedSince, pauseUntil, evt.queue, evt.userId]);
        promiseRows.do(db.query(sql)).then(() => {
            logger.debug('Queue logout registered for the user ' + evt.extension);
            queue.call('reloadAgents', {
                queueIds: [evt.queue],
                pauseReasonData: {
                    account_id: evt.userId,
                    server_uuid: serverUuid,
                    reason: evt.pausedreason
                }
            });
        }).catch((e) => { logger.error(e); });
        let action = paused == '1' ? "paused" : "resumed";
        let reason = evt.reason ? ", reason:"+evt.reason: "";

        featureLogs.log(queueFeatureName, featureLogs.getLogContext(), 'Q:'+evt.queue, 'The queue has been '+action+' by agent '+evt.membername
        +' (Extension: '+evt.extension+',Interface: '+evt.interface
        +', LastPause: '+evt.lastpause+', pauseUntil:'+pauseUntil+reason+')');
    }

    function emitQueueCallerJoin(evt) {
        let queueId = Account(evt.queue, serverUuid);
        let q = qm.getQueueById(queueId);
        if (q) {
            let qc = new QueueCall({
                id: evt.uniqueid,
                qm: q.qm,
                queue: q,
                caller: { name: evt.calleridname, number: evt.calleridnum }
            });
            q.calls[qc.id] = qc;
            q.stats.totalCallCount++;
            qc.waitWatch.start();
            qc.onlineWaitWatch.start();
            qc.state = "waiting";
            q.insertWaitingCalls(qc);
            q.emitStats();
            qc.emitStatusMessage();
            setQueueCallData({
                'queueCallId': qc.id,
                'queueId': queueId
            });
        }

        featureLogs.log(queueFeatureName, featureLogs.getLogContext(), 'Q:'+evt.queue, 'Call from '+evt.calleridnum+
        ' joined the queue. (CallerIDName: '+evt.calleridname+',Channel: '+evt.channel+', UniqueId: '+evt.uniqueid+').');
    }

    async function emitQueueMissedCallEvent(evt) {
        let queueId = Account(evt.queue, serverUuid);
        let q = qm.getQueueById(queueId);
        if (q) {
            evt.uniq = Math.trunc(evt.uniq);
            const result = missedCall.find(({ queue, uniq, linkedid }) => queue == evt.queue && uniq == evt.uniq && linkedid == evt.linkedid);
            if (!result) {
                missedCall.push({ queue: evt.queue, uniq: evt.uniq, linkedid: evt.linkedid })
                q.stats.missedCallCount++;
                q.emitStats();
            }

            let userData = await aRows.single(
                "SELECT * from userman_users WHERE default_extension = ?",
                [evt.qagent]
            );
            if (userData) {
                let userId = Account(userData.id, serverUuid);
                let agent = qm.getAgent(userId);
                if (agent) {
                    let qs = agent.getOrMakeQueueState(q);
                    qs.missedCallCount++;
                    agent.emitStatus(qs);
                }

                featureLogs.log(queueFeatureName, featureLogs.getLogContext(), 'Q:'+evt.queue, 'Call from '+evt.calleridnum+
                ' missed. (CallerIDName: '+evt.calleridname+',Channel: '+evt.channel+', UniqueId: '+evt.uniqueid+', LinkedId: '+evt.linkedid+', UserId:'+
                userData.id+', DialStatus:'+evt.dialstatus+', QAgent:'+evt.qagent+').');
            }
        }
    }

    async function emitQueueCallerLeave(evt) {
        evt.uniq = Math.trunc(evt.uniq);
        missedCall.pop({ queue: evt.queue, uniq: evt.uniq, linkedid: evt.linkedid })

        await new Promise(resolve => setTimeout(resolve, 300));
        let bpeer = await manager.getVar(evt.channel, 'BRIDGEPEER');

        if (bpeer == undefined || bpeer == "") {
            // abandoned
            let queueId = Account(evt.queue, serverUuid);
            let q = qm.getQueueById(queueId);
            if (q) {
                let qc = q.calls[evt.uniqueid];
                if (qc) {
                    qc.state = "shutdown";
                    qc.waitWatch.stop();
                    q.stats.abandonedWaitTimeStats.update(qc.waitWatch.value());
                    q.callExitedQueue(qc);
                    q.emitStats();
                    qc.emitStatusMessage();
                    deleteQueueCallData(qc.id);
                }
            }
            featureLogs.log(queueFeatureName, featureLogs.getLogContext(), 'Q:'+evt.queue, 'Call from '+evt.calleridnum+
            ' abandoned. (CallerIDName: '+evt.calleridname +',Channel: '+evt.channel+', UniqueId: '+evt.uniqueid+').');
        } else {
            // call connected
            let matches = bpeer.match(/(?<=Local\/)\d+(?=@from-queue)/);
            let bagent = matches[0];
            if (bagent == "" && evt.connectedlinenum != "<unknown>") {
                bagent = evt.connectedlinenum;
            }

            if (bagent == "") {
                logger.warn("Something is strange with Queue caller channel");
            } else {
                manager.action({
                    action: 'setvar',
                    channel: evt.channel,
                    variable: 'SCD_CONNECT_AGENT',
                    value: bagent
                });
                let queueId = Account(evt.queue, serverUuid);
                let q = qm.getQueueById(queueId);
                if (q) {
                    let qc = q.calls[evt.uniqueid];
                    q.stats.totalBridgedCallCount++;
                    if (qc) {
                        qc.state = "bridged";
                        qc.waitWatch.stop();
                        qc.talkWatch.start();
                        //decrease the missedcall count on call bridge 
                        const result = missedCall.find(({ queue, uniq, linkedid }) => queue == evt.queue && uniq == evt.uniq && linkedid == evt.linkedid);
                        if (result) {
                            q.stats.missedCallCount--;
                        }
                        let userData = await aRows.single(
                            "SELECT * from userman_users WHERE default_extension = ?",
                            [bagent]
                        );
                        if (userData) {
                            let userId = Account(userData.id, serverUuid);
                            let agent = qm.getAgent(userId);
                            if (agent) {
                                q.bumpAgentCallCount(agent);
                                qc.agent = agent;
                                let qs = agent.getOrMakeQueueState(q);
                                let callIndex = 0;
                                for (var i = 0 ; i < qs.calls.length ; i++) {
                                    if (qs.calls[i].queueCall == qc) {
                                        callIndex = i;
                                    }
                                }
                                let qcs = {
                                    state: "bridged",
                                    queueCall: qc,
                                    callStartTime: Date.now(),
                                    channelId: null,
                                    dialPeer: evt.uniqueid,
                                    bridgeId: null,
                                    pendingTransfer: false,
                                };
                                Object.defineProperty(qcs, "queue", { enumerable: false, value: qc.queue });

                                // create a log method that uses either the queueCall.log or the queue.log
                                Object.defineProperty(qcs, "log",
                                    {
                                        enumerable: false,
                                        value: function () {
                                            let o = qcs.queueCall || qc.queue;
                                            o.log.apply(o, arguments)
                                        }
                                    },
                                );
                                qs.calls[callIndex] = qcs;
                                agent.updateTalkTime(qcs);

                                agent.emitStatus(qs);
                            }
                        } else {
                            // this is the case where the extension is not linked to userman
                            // so we won't get the user data
                            qc.agent = '';
                            qc.waitWatch.stop();
                            q.callExitedQueue(qc);
                            deleteQueueCallData(qc.id);
                        }
                        q.removeWaitingCall(qc);
                        q.emitStats();
                        qc.emitStatusMessage();
                    }
                }
            }
            featureLogs.log(queueFeatureName, featureLogs.getLogContext(), 'Q:'+evt.queue, 'Call from '+evt.calleridnum+
            ' answered by Agent-'+bagent+'. (CallerIDName: '+evt.calleridname +',Channel: '+evt.channel+
            ', UniqueId: '+evt.uniqueid+').');
        }
    }

    async function emitAttendedTransfer(evt) {
        if (evt.transfereechannel.includes('from-queue')) {
            let uniqueId = evt.origtransfererlinkedid;
            let queueId = getQueueCallDataByUniqueId(uniqueId);
            let q = qm.getQueueById(queueId);
            if (q) {
                let qc = q.calls[uniqueId];
                if (qc) {
                    qc.state = "shutdown";
                    qc.offlineWaitWatch.stop();
                    qc.talkWatch.stop();
                    q.stats.talkTimeStats.update(qc.talkWatch.value());
                    q.stats.waitTimeStats.update(qc.waitWatch.value());
                    let userData = await aRows.single(
                        "SELECT * from userman_users WHERE default_extension = ?",
                        [evt.origtransferercalleridnum]
                    );
                    if (userData) {
                        let userId = Account(userData.id, serverUuid);
                        let agent = qm.getAgent(userId);
                        if (agent) {
                            qc.agent = agent;
                            delete agent.queueState[q.id]
                            let qs = agent.getOrMakeQueueState(q);
                            agent.emitStatus(qs);
                            featureLogs.log(queueFeatureName, featureLogs.getLogContext(), 'Q:'+evt.queue, 'Agent '+
                            evt.origtransferercalleridnum+'  has performed an attended transfer of the call to '+evt.secondtransfererconnectedlinenum +
                            '(CallerIDName: '+evt.origtransfererconnectedlinenum+', UniqueId: '+evt.origtransfereruniqueid+
                            ',Transfer Status:'+evt.result+').');
                        }
                    }
                    q.callExitedQueue(qc);
                    q.emitStats();
                    deleteQueueCallData(qc.id);
                }
            }
        }
    }

    async function emitQueueCallHangup(evt) {
        let queueId = Account(evt.q, serverUuid);
        let q = qm.getQueueById(queueId);
        if (q) {
            let qc = q.calls[evt.uniqueid];
            if (qc) {
                qc.state = "shutdown";
                qc.offlineWaitWatch.stop();
                qc.talkWatch.stop();
                q.stats.talkTimeStats.update(qc.talkWatch.value());
                q.stats.waitTimeStats.update(qc.waitWatch.value());
                if (evt.scd_connect_agent) {
                    let userData = await aRows.single(
                        "SELECT * from userman_users WHERE default_extension = ?",
                        [evt.scd_connect_agent]
                    );
                    if (userData) {
                        let userId = Account(userData.id, serverUuid);
                        let agent = qm.getAgent(userId);
                        if (agent) {
                            qc.agent = agent;
                            agent.queueState[q.id].calls = [];
                            let qs = agent.getOrMakeQueueState(q);
                            agent.emitStatus(qs);
                        }
                    }
                    let connectedlinenum = (evt.connectedlinenum == "<unknown>") ? (evt.scd_connect_agent ? evt.scd_connect_agent : ""): evt.connectedlinenum;
                    featureLogs.log(queueFeatureName, featureLogs.getLogContext(), 'Q:'+evt.q, 'Call from '+evt.calleridnum+' ended. (CallerIDName: '+
                    evt.calleridname+',Channel: '+evt.channel+', UniqueId: '+evt.uniqueid+', LinkedId: '+evt.linkedid+', UserId:'+userData.id+',QAgent:'+
                    evt.scd_connect_agent+', ConnectedLineNum: '+connectedlinenum+').');
                }
                q.callExitedQueue(qc);
                q.emitStats();
                deleteQueueCallData(qc.id);
            }
            removeDisconnectedCallData(q, evt);
        }
    }

    // every hour or so, put the local hour in the log so it's easier to 
    // match customer reports to gmtime.
    setInterval(function () {
        qm.log("localtime ", Date());
    }, 60 * 60 * 1000);



    ///// functions

    // If the day rolled over, clear out queue and agent stats - this was the old logic
    // Now the queue will reset according to the settings in Reset Queue Stats in Queue module.
    function statResetCheck(qId) {
      qm.log("queue reset event received! resetting queue and agent stats");
      // clear out any stats files.
      var cmdline = "/bin/rm -f " + qm.statsDir + "/*q" + qId + "*.stats";
      child_process.exec(cmdline, function (err, stdout, stderr) {
        // tell the queues and agents to zero their stats.
        let queueId = Account(qId, serverUuid);
        queues[queueId].resetStats();
        for (let agentId in queues[queueId].agentInfo) {
          agents[agentId].resetStats();
        }
      });
    }

    // slurp a file, returning a promise to its contents parsed as JSON, or 
    // to undef if the file is from a different day.
    function readFileIfFromToday(fn) {
        return fsPromise.statAsync(fn)
            .then(function (stats) {

                // make sure the file isn't from a previous day.  This is broken for
                // crashes that last exactly a month.  Oh well.
                var today = new Date().getDate();

                if (stats.mtime.getDate() !== today) {
                    // too old.  JSON.parse will fail, which is handled below.
                    return undefined;
                }

                // return a promise for the contents of the stats file.
                return fsPromise.readFileAsync(fn);
            }).then(function (json) {
                if (json === undefined)
                    return undefined;

                // if this throws, catch will return undef.
                return JSON.parse(json);
            }).catch(function (e) {
                return undefined;
            });
    };

    function getQueueById(id) {
        var queue = queues[id];
        if (queue) {
            return queue;
        }

        // switchvox-specific hack to match Account objects with the bare
        // account id passed in.
        var key;
        for (key in queues) {
            if (queues[key].id.accountId == id) {
                return queues[key];
            }
        }

        return undefined;
    }

    // Method called by Agent to make sure the given agent receives events for
    // the given channel.
    function claimChannel(ownerObject, channelId) {
        callOwnerObject[channelId] = ownerObject;
    }

    function unclaimChannel(ownerObject, channelId) {
        if (callOwnerObject[channelId] === ownerObject) {
            delete callOwnerObject[channelId];
        }
    }

    // Generate snapshot of events to allow apibridge 
    // clients to prepopulate current state.
    function snapshot(args) {
        if (args && args.event && args.queueId in queues) {
            switch (args.event) {
                case 'queue.stats':
                    return queues[args.queueId].getStats();
                case 'queue.calls':
                    return queues[args.queueId].getCalls();
                case 'queue.agent.status':
                    var agent;
                    if (args.agentId) {
                        agent = agents[args.agentId];
                        if (!agent)
                            break;
                    }
                    return queues[args.queueId].agentSnapshot(agent);
                case 'queue.caller.status':
                    return queues[args.queueId].callerSnapshot();
                default:
                    break;
            }
        }
        return undefined;
    }

    // given a list of queue descriptors (basically rows from a join of 
    // account and call_queue_values), create any queues that are there, and
    // shutdown any queues that are not.
    function setQueueList(list, cb) {
        var saw = {};
        var q;
        var i;
        var maxPrio = 1;

        for (i = 0; i < list.length; i++) {
            var id = list[i].id || list[i].account_id;
            saw[id] = true;
            if (!queues[id]) {
                q = queues[id] = new Queue(qm, list[i]);
            } else {
                queues[id].update(list[i]);
            }

            if (list[i].queue_priority > maxPrio) {
                maxPrio = list[i].queue_priority;
            }
        }

        qm.maxPriority = maxPrio;

        for (id in queues) {
            if (!saw[id]) {
                this.shutdownQueue(queues[id]);
            }
        }
        if (cb) cb(null, true);
    }

    // queue has been removed from the database.  shut it down.
    function shutdownQueue(qid) {
        // remove all agents.
        this.removeRemovedAgents({ queueId: qid, agentIds: [] });
        delete queues[qid];
    }

    // getAgent public method; creates an Agent, unless we already have it.
    // Note id in this case is typically an Account object for switchvox.
    function getAgent(id) {
        if (agents[id]) {
            return agents[id];
        }
        var agent = new Agent({
            id: id,
            qm: qm
        });
        agents[id] = agent;

        return agent;
    }

    // public method to log in agent to a queue.  Requires agentId, queueId.
    function agentLogin(args) {
        var agent = getAgent(args.agentId);

        var queue = queues[args.queueId];
        if (!queue) {
            throw new Error("nonexistent queue");
        }

        agent.login(queue, args.location, args.tier);
    }

    // public method to log out agent from a queue.  Requires agentId, queueId.
    function agentLogout(args) {
        var agent = agents[args.agentId];
        if (!agent) {
            return;
        }

        var queue = queues[args.queueId];
        if (!queue) {
            throw new Error("nonexistent queue");
        }

        agent.logout(queue, args.tier);

    }

    function setAgentPauseReason(agentId, reason) {
        var agent = agents[agentId];
        if (agent)
            agent.setPauseReason(reason);
    }

    // Set data about an agent in a queue.  Requires queueId. 
    function setQueueMemberInfo(args) {
        var queue = queues[args.queueId];
        if (!queue){
            logger.log("Missing or nonexistent queueId " + args.queueId + " to setQueueMemberInfo");
            featureLogs.log(queueFeatureName, featureLogs.getLogContext(), 'Q:'+args.queueId.extension, 'Queue does not exist: Queue name :'+args.queueId.descr);
        }
        queue.setAgentInfo(args);
    }

    // given a queueId and an array of all agent ids that should be logged into
    // the queue, remove any logged-in agents that are not in the list.
    function removeRemovedAgents(args) {
        var queueId = args.queueId;
        var agentIds = args.agentIds;
        var queue = queues[args.queueId];
        if (!queue) {
            qm.log("Missing or nonexistent queueId", args.queueId, "to removeRemovedAgents");
            featureLogs.log(queueFeatureName, featureLogs.getLogContext(), 'Q:'+args.queueId.extension, 'Queue does not exist: Queue name :'+args.queueId.descr);
            return;
        }
        queue.removeRemovedAgents(agentIds);
    }

    // returns a few things about a queue.  Kinda gross.
    function getQueueData(qid) {
        var queue = queues[qid];
        if (!queue) return {};

        return {
            displayname: queue.displayname,
            extension: queue.extension,
            strategy: queue.ringStrategy
        };
    }

    function recoverOfflineCall(data) {
        var queueId = Account(data.queueId);
        var queue = queues[queueId];
        if (!queue) {
            logger.error("no queue to recover from offline");
            return;
        }

        queue.recoverOfflineCall(data);
    }

    // method called by the recovery module when, on startup, we find that asterisk
    // has a channel that was owned by the queue.  
    // arguments:
    //    queueChannel - channel object for queue call returned by GET /channels.  
    //    queueQrec - parsed QREC channel variable for queue call.
    //    bridge - bridge object for bridge channel is in with agent, or null
    //    agentChannel - channel object for bridged agent call, or null
    //    agentQrec - parsed QREC channel variable for bridged agent call, or null.
    function recoverCall(args) {
        var qm = this;

        var queue = queues[args.queueQrec.qid];


        if (!queue) {
            // queue call that doesn't belong to a queue. abort!
            qm.log("recovery - queue call from unknown queue.  hang up.");
            return;
        }


        if (args.agentQrec) {
            args.agent = agents[args.agentQrec.aid];
        }


        queue.recoverCall(args);
    }

    function setQueueCallData(data) {
        if (!queueCalls[data.queueCallId]) {
            queueCalls[data.queueCallId] = data.queueId;
        }
    }

    function getQueueCallDataByUniqueId(id) {
        return queueCalls[id];
    }

    function deleteQueueCallData(id) {
        if (queueCalls[id]) {
            delete queueCalls[id];
        }
    }

} // function QueueManager

util.inherits(QueueManager, EventEmitter);
