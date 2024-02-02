const AutomatedAction = require('../../models/AutomatedAction.js');
const AutomatedActionApi = require('../../api/iot/automated-action-api.js');
const BaseJob= require('./base-job.js');
const util = require('util');

function AutomatedActionJob(dispatcher, automated_action, schedule, jobAction){
    BaseJob.call(this, automated_action.get('name') + '-' + jobAction, schedule);
    this._automated_action_id = automated_action.get('id');
    this._job_action = jobAction;
    this._dispatcher = dispatcher;
    this._automated_action_details = automated_action.get('details') ? JSON.parse(automated_action.get('details')) : {};
    this._automated_action_details.timezone = this._automated_action_details.timezone ? this._automated_action_details.timezone : "UTC";

    Object.defineProperty(this,"timezone",{
        get(){ return this._automated_action_details.timezone; }
    });

}

// Inherits the prototype methods from the base model.
util.inherits(AutomatedActionJob, BaseJob);

AutomatedActionJob.prototype.run = function() {

    return new Promise( (resolve, reject) => {
        var self = this
        AutomatedAction.where('id', '=', self._automated_action_id).fetch().then((automated_action)=>{

            if (!automated_action){
                return resolve();
            }

            if (self._logEmitter) {
                self._logEmitter.emit('log', {level: 'debug', text: "[AutomatedActionJob - " + self.getName() + " ]: Running scheduled job"});
            }
            var func = undefined;
            if (self._job_action == 'start') {
                func = AutomatedActionApi.runAutomatedAction(automated_action, self._dispatcher)
            } else {
                func = AutomatedActionApi.stopAutomatedAction(automated_action, self._dispatcher)
            }

            func.then((_automated_action)=>{
                if (self._job_action == 'end') {

                    if (_automated_action.get('start') && (_automated_action.get('start').includes('Every') || _automated_action.get('start').includes('['))) {
                        // scheduled recurrent job, let's move to active
                        _automated_action.set('status', 'active');
                    } else {
                        _automated_action.set('status', 'expired');
                    }
                    return _automated_action.save();
                } else {
                    return Promise.resolve();
                }
            }).then(()=>{
                resolve();
            }).catch((error)=>{

                if (self._logEmitter) {
                    self._logEmitter.emit('log', {level: 'error', text: "[AutomatedActionJob - " + self.getName()  +" ]: Job run error: " + error});
                }
                resolve();
            })

        }).catch((error)=>{
            if (self._logEmitter) {
                self._logEmitter.emit('log', {level: 'error', text: '[AutomatedActionJob error]: ' + error});
            }
            resolve();
        });
    });
}

module.exports =  AutomatedActionJob
