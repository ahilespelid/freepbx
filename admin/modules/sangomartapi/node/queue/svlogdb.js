"use strict";
// four space indent, no tab chars.
// vim: sw=4:softtabstop=4:expandtab 
/*
 * code for writing queue logs to the switchvox database.  Listens for
 * log events ("queue.log") from the queue and sticks them in the database.
 */

var util = require('util');

var db = require('../lib/db/connection.js').sharedPool;

module.exports = {
    setLogger: setLogger,
    writeLogToDb: writeLogToDb
};

var logger = console;
function setLogger(_logger) { logger = _logger; }


// field names to insert in the missed call table.
var mcFields = [
    "member_account_id", "queue_account_id", "uniqueid", "wait_time",
    "missed_date", "caller_id", "enter_position"
];
var mcFieldsString = mcFields.join(",");

// "$1,$2,$3,...." for missed call table.
function dollarmapper(x, i) { return "$" + (Number(i) + 1); }
var mcBindsString = mcFields.map(dollarmapper).join(",");

// field names to insert in the call_queue_logs tables.
var cqlFields = [
    "type", "call_date", "queue_account_id", "queue_name",
    "caller_id", "wait_time", "talk_time", "enter_position",
    "abandon_position", "exit_position",
    "uniqueid", "agent_account_id", "agent",
    "callback_number", "offline_wait_time",
];
var cqlFieldsString = cqlFields.join(",");

// "$1,$2,$3,...." for call queue logs table.
var cqlBindsString = cqlFields.map(dollarmapper).join(",");


/* sample log message: 
*   { type: 'COMPLETEAGENT',
*       call_date: 1386348598443,
*       queueId: { accountId: '1110', serverUuid: 'ebe03fe4-5705-11e3-9cd2-010010005120' },
*       queue_name: 'monkey_delivery___1110',
*       caller_id: '217',
*       wait_time: 26,
*       talk_time: 2,
*       enter_position: 1,
*       agentId: { accountId: '1116', serverUuid: 'ebe03fe4-5705-11e3-9cd2-010010005120' },
*       abandon_position: 1,
*       exit_position: 0,
*       uniqueid: '1386348596.358' 
*   }
*/


function writeLogToDb(msg) {
    var tables, fields, fieldsString, bindsString;

    if (msg.type === "RINGNOANSWER") {
        tables = ["call_queue_missed_calls"];
        fields = mcFields;
        fieldsString = mcFieldsString;
        bindsString = mcBindsString
    } else {
        tables = ["call_queue_logs"];
        fields = cqlFields;
        fieldsString = cqlFieldsString;
        bindsString = cqlBindsString
    }

    var values = fields.map(function (field) {
        switch (field) {
            case "agent_account_id":
            case "member_account_id":
                if (msg.agentId == null)
                    return 0;
                else
                    return Number(msg.agentId.accountId);

            case "queue_account_id":
                if (msg.queueId == null)
                    return 0;
                else
                    return Number(msg.queueId.accountId);
            case "call_date":
            case "missed_date":
                var d = new Date(msg.call_date);
                return util.format("%d-%d-%d %d:%d:%d",
                    d.getFullYear(),
                    d.getMonth() + 1,
                    d.getDate(),
                    d.getHours(),
                    d.getMinutes(),
                    d.getSeconds());
            default:
                return msg[field];
        }
    });

    var queryTail = " (" + fieldsString + ") VALUES (" + bindsString + ")";
    var i;
    tables.forEach(function (table) {
        var sql = "INSERT INTO " + table + queryTail;
        db.evtQuery(sql, values)
            .on("error", function (err) {
                writeError(sql, err, msg, table, values);
            });
    });
}

function writeError(sql, err, msg, table, values) {
    logger.log("Error writing log to db: '%s'.  Data was:", err);
    logger.log("%s\n---\n", JSON.stringify({ table: table, message: msg, sql: sql, values: values }));
}

