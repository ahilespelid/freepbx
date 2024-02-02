const Notification = require('../../models/Notification.js');
const BaseJob= require('./base-job.js');
const util = require('util');

function NotificationCleanupJob(){
    BaseJob.call(this, 'NotificationCleanupJob', '0 2 * * *');
}

// Inherits the prototype methods from the base model.
util.inherits(NotificationCleanupJob, BaseJob);

NotificationCleanupJob.prototype.run = function() {

    return new Promise( (resolve, reject) => {
        var self = this;
        if (self._logEmitter) {
            self._logEmitter.emit('log', {level: 'debug', text: "[NotificationCleanupJob]: Running notification cleanup job"});
        }

        // query all closed entries older than 2 days
        var endDate = new Date();
        endDate.setTime(Date.now() - 2*24*3600*1000)
        Notification.where('status', '=', 'closed').where('close_time', '<=', endDate.getTime()).destroy().then(()=>{
            if (self._logEmitter) {
                self._logEmitter.emit('log', {level: 'debug', text: "[NotificationCleanupJob]: Removed all  entries closed before " + endDate});
            }

            resolve();
        }).catch((error)=>{
            if (self._logEmitter) {
                self._logEmitter.emit('log', {level: 'error', text: '[NotificationCleanupJob error]: ' + error});
            }
            resolve();
        })
    });
}

module.exports =  NotificationCleanupJob
