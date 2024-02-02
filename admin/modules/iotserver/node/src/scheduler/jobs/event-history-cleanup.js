const EventHistory = require('../../models/EventHistory.js');
const BaseJob= require('./base-job.js');
const util = require('util');


function EventHistoryCleanupJob(){
    BaseJob.call(this, 'EventHistoryCleanupJob', '0 0 * * *');
}

// Inherits the prototype methods from the base model.
util.inherits(EventHistoryCleanupJob, BaseJob);

EventHistoryCleanupJob.prototype.run = function() {
    return new Promise( (resolve, reject) => {
        var self = this;
        if (self._logEmitter) {
            self._logEmitter.emit('log', {level: 'debug', text: '[EventHistoryCleanupJob]: Running event history cleanup job'});
        }

        // query all entries older than 45days
        var endDate = new Date();
        endDate.setTime(Date.now() - 45*24*3600*1000)
        EventHistory.where('event_time', '<=', endDate.getTime()).destroy().then(()=>{
            if (self._logEmitter) {
                self._logEmitter.emit('log', {level: 'debug', text: "[EventHistoryCleanupJob]: Removed all event history entries created before " + endDate});
            }
            resolve();
        }).catch((error)=>{
            if (self._logEmitter) {
                self._logEmitter.emit('log', {level: 'error', text: '[EventHistoryCleanupJob error]: ' + error});
            }
            resolve();
        })
    });
}

module.exports = EventHistoryCleanupJob
