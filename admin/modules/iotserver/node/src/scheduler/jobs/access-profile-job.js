const AccessProfile = require('../../models/AccessProfile.js');
const AccessProfileApi = require('../../api/iot/access-profile-api.js');
const BaseJob= require('./base-job.js');
const util = require('util');

function AccessProfileJob(dispatcher, profile, schedule, jobAction){
    BaseJob.call(this, profile.get('name') + '-' + jobAction, schedule);
    this._profile_id = profile.get('id');
    this._job_action = jobAction;
    this._dispatcher = dispatcher;
    this._profile_details = profile.get('details') ? JSON.parse(profile.get('details')) : {};
    this._profile_details.timezone = this._profile_details.timezone ? this._profile_details.timezone : "UTC";

    Object.defineProperty(this,"timezone",{
        get(){ return this._profile_details.timezone; }
    });

}

// Inherits the prototype methods from the base model.
util.inherits(AccessProfileJob, BaseJob);

AccessProfileJob.prototype.run = function() {

    return new Promise( (resolve, reject) => {
        var self = this

        AccessProfile.where('id', '=', self._profile_id).fetch().then((profile)=>{

            if (!profile){
                return resolve();
            }

            if (self._logEmitter) {
                self._logEmitter.emit('log', {level: 'debug', text: "[AccessProfileJob - " + self.getName() + " ]: Running scheduled job"});
            }
            var func = undefined;
            if (self._job_action == 'start') {
                func = AccessProfileApi.runProfile(profile, self._dispatcher)
            } else {
                func = AccessProfileApi.stopProfile(profile, self._dispatcher)
            }

            func.then((_prof)=>{
                if (self._job_action == 'end') {

                    if (_prof.get('start') && (_prof.get('start').includes('Every') || _prof.get('start').includes('['))) {
                        // scheduled recurrent job, let's move to active
                        _prof.set('status', 'active');
                    } else {
                        _prof.set('status', 'expired');
                    }
                    return _prof.save();
                } else {
                    return Promise.resolve();
                }
            }).then(()=>{
                resolve();
            }).catch((error)=>{

                if (self._logEmitter) {
                    self._logEmitter.emit('log', {level: 'error', text: "[AccessProfileJob - " + self.getName()  +" ]: Job run error: " + error});
                }
                resolve();
            })

        }).catch((error)=>{
            if (self._logEmitter) {
                self._logEmitter.emit('log', {level: 'error', text: '[AccessProfileJob error]: ' + error});
            }
            resolve();
        });
    });
}


module.exports =  AccessProfileJob
