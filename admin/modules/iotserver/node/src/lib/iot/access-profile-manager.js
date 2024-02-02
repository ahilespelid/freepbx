const log = require('../log');
const util = require("util");
const { EventEmitter } = require('events');
const JobScheduler = require('../../scheduler/scheduler.js');
const AccessProfileJob = require('../../scheduler/jobs/access-profile-job.js')
const dispatcher = require('./event-dispatcher.js');
const AccessProfile = require('../../models/AccessProfile.js');
const {buildSchedule,weekDaysMap} = require('../../scheduler/build-schedule.js')
const AccessProfileApi = require('../../api/iot/access-profile-api.js');
const CommonApi = require('../../api/iot/common-api.js');

function process(self) {
	return new Promise((resolve, reject) => {
		if (self._is_processing === true) {
			return resolve();
		}

		self._is_processing = true;

		AccessProfile.fetchAll().then((profiles) => {
			var activeProfiles = profiles.filter(x => ['active'].includes(x.get('status')) || (['expired', 'running'].includes(x.get('status')) && x.get('start') && (x.get('start').includes('Every') || x.get('start').includes('[') )));
			var inactiveProfiles = profiles.filter(x => ['disabled', 'deleted'].includes(x.get('status')));
			var runningProfiles = profiles.filter(x => x.get('status') == 'running' && ![null, undefined].includes(x.get('end')));

			var now = new Date();
			var gmtDate = new Date(now.toGMTString());

			// 1. let's make sure we have cleared/stopped all inactive profiles
			var q = require('q');
			var chain = q.when();
			inactiveProfiles.forEach((profile) => {
				self._scheduler.removeJob(profile.get('name') + '-start');
				self._scheduler.removeJob(profile.get('name') + '-end');
				chain = chain.then(() => {
					return AccessProfileApi.stopProfile(profile, dispatcher);
				}, (error) => {
					log.warn(error)
					return Promise.resolve();
				})
			})


			chain.then(() => {
				// 2. let's create jobs for active profiles, if not already done
				var jobsToRun = [];
				activeProfiles.forEach((profile) => {
					if (!profile.get('start') || ((!profile.get('start').includes('Every') && !profile.get('start').includes('[') ) && profile.get('start_timestamp_utc') && profile.get('start_timestamp_utc') <= (gmtDate.getTime() / 1000))) {
						// easiest path, no schedule for this profile, just run it
						let job = new AccessProfileJob(dispatcher, profile, null, 'start');
						job.init(self._scheduler);
						jobsToRun.push(job);
						AccessProfileApi.onProfileStatusChange(profile, dispatcher, 'start').catch((error)=>{log.warn(error)});
					} else if (profile.get('start') && (profile.get('start').includes('Every') || profile.get('start').includes('[') )) {
						// for all profiles with daily schedure of specefic days of week selected
						if (profile.get('start_timestamp_utc') && profile.get('start_timestamp_utc') <= (gmtDate.getTime() / 1000) && profile.get('end_timestamp_utc') && profile.get('end_timestamp_utc') >= (gmtDate.getTime() / 1000)) {
							// if the start time of the profile is in the past and end time is in the future
							let startNow = false;
							if ( profile.get('start').includes('[')) {
								var details = profile.get('details') ? JSON.parse(profile.get('details')) : {};
								var timezone = details.timezone ? details.timezone : "UTC";
								let newDate = new Date(gmtDate.toLocaleString("en-US", {timeZone: timezone}))
								let thisDayDigit = newDate.getDay();
								thisDayDigit =  (thisDayDigit == 0) ? 7: thisDayDigit;
								let thisDay = Object.keys(weekDaysMap).find(key => weekDaysMap[key]== thisDayDigit);
								thisDay = thisDay.charAt(0).toUpperCase() + thisDay.slice(1); 
								let selected_days = JSON.parse(profile.get('start').split('|')[0].trim());
								if (selected_days.includes(thisDay)) { // if the present day is included in the selected weekdays.
									startNow = true;
								}
							}else if (profile.get('start').includes('Every')) {
								startNow = true;
							}
							if (startNow) {
								log.debug("This profile:"+ profile.get('name') +" need to start immeadieately because start time is in past and end time is in future.");
								let job = new AccessProfileJob(dispatcher, profile, null, 'start');
								job.init(self._scheduler);
								jobsToRun.push(job);
								return;
							}
						}
						// this is a scheduled job, let's build the schedule
						let schedule = buildSchedule(profile, 'start');
						if (schedule) {
							let job = new AccessProfileJob(dispatcher, profile, schedule, 'start');
							if (self._scheduler.addJob(job)) {
								log.debug('Using schedule ' + schedule + ' for job ' + job.getName() + ' with timezone ' + job.timezone);
								self._scheduler.schedule();
								AccessProfileApi.onProfileStatusChange(profile, dispatcher, 'start').catch((error)=>{log.warn(error)});
							} else if (self._scheduler.getJobSchedule(profile.get('name') + '-start') != schedule) {
								// job schedule have changed, let's adjust ourselves
								self._scheduler.removeJob(profile.get('name') + '-start');
								self._scheduler.addJob(job)
								log.debug('Using schedule ' + schedule + ' for job ' + job.getName() + ' with timezone ' + job.timezone);
								self._scheduler.schedule();
								AccessProfileApi.onProfileStatusChange(profile, dispatcher, 'start').catch((error)=>{log.warn(error)})
							}
						} else {
							log.warn('Failed to build start schedule for access profile ' + JSON.stringify(profile.toJSON()));
						}
					}else{
						AccessProfileApi.onProfileStatusChange(profile, dispatcher, 'start').catch((error)=>{log.warn(error)});
						log.debug(" Profile is not need to start now. it is not need to scheduled. it need to consider in future: "+profile.get('name'));
					}
				})
				// 3. let's expire all running profiles that need to expire, if not already done.
				runningProfiles.forEach((profile) => {
					if (profile.get('end').includes('Every') || profile.get('end').includes('[') ) {
						// this is a scheduled job, let's build the schedule
						let schedule = buildSchedule(profile, 'end');
						if (schedule) {
							let job = new AccessProfileJob(dispatcher, profile, schedule, 'end');
							if (self._scheduler.addJob(job)) {
								log.debug('Using schedule ' + schedule + ' for job ' + job.getName() + ' with timezone ' + job.timezone);
								self._scheduler.schedule();
								AccessProfileApi.onProfileStatusChange(profile, dispatcher, 'end').catch((error)=>{log.warn(error)})
							} else if (self._scheduler.getJobSchedule(profile.get('name') + '-end') != schedule) {
								// job schedule have changed, let's adjust ourselves
								self._scheduler.removeJob(profile.get('name') + '-end');
								self._scheduler.addJob(job)
								log.debug('Using schedule ' + schedule + ' for job ' + job.getName() + ' with timezone ' + job.timezone);
								self._scheduler.schedule();
								AccessProfileApi.onProfileStatusChange(profile, dispatcher, 'end').catch((error)=>{log.warn(error)})
							}

						} else {
							log.warn('Failed to build end schedule for access profile ' + JSON.stringify(profile.toJSON()));
						}
					} else if (profile.get('end_timestamp_utc') && profile.get('end_timestamp_utc') <= (gmtDate.getTime() / 1000)) {
						// easiest path, no schedule for this profile, just run it
						var job = new AccessProfileJob(dispatcher, profile, null, 'end');
						job.init(self._scheduler);
						jobsToRun.push(job);
					}
				})

				var chain2 = q.when();
				jobsToRun.forEach((job) => {
					chain2 = chain2.then(() => {
						return job.run();
					}, (error) => {
						log.warn(error);
						return Promise.resolve();
					})
				})

				chain2.then(() => {
					self._is_processing = false;
				}, (error) => {
					log.warn(error);
					self._is_processing = false;
				})
				resolve();
			}).catch((err) => {
				log.warn(err);
				self._is_processing = false;
				resolve();
			})
		}).catch((err) => {
			log.warn(err);
			self._is_processing = false;
			resolve();
		})
	})
}

function AccessProfileManager() {
	this._scheduler = undefined;
	this._interval = undefined;
	this._is_processing = undefined;
}
function statusCorrection(){
	return new Promise((resolve,reject) => {
		AccessProfile.fetchAll().then((profiles) => {
			return CommonApi.subjectStatusCorrection(profiles);
		}).then(() =>{
			resolve();
		}).catch((err) => {
			log.warn(err);
		});
	});
}

util.inherits(AccessProfileManager, EventEmitter);

AccessProfileManager.prototype.init = function (scheduler) {
	return new Promise((resolve, reject) => {
		var self = this;
		self.stop().then(() => {
			self._scheduler = scheduler;
			self._is_processing = false;
			return statusCorrection(); 
		}).then(() => {
			// make sure we schedule all jobs that need to be scheduled
			return process(self)
		}).then(() => {
			// check for jobs to process every minute
			self._interval = setInterval(process, 60000, self);
			resolve();
		})
	})
}

AccessProfileManager.prototype.stop = function () {
	return new Promise((resolve, reject) => {
		if (this._scheduler) {
			this._scheduler.stop();
			this._scheduler = null;
		}

		if (this._interval) {
			clearInterval(this._interval);
			this._interval = null;
		}
		this._is_processing = false;
		resolve();
	})
}

AccessProfileManager.prototype.handleCommand = function(command) {
	return new Promise((resolve,reject)=>{
		switch(command.type) {
			case 'run-process':
				process(this);
			break
			default:
				log.warn('Unsupported command ' + JSON.stringify(command));
			break;
		}
		resolve();
	})
}



module.exports = AccessProfileManager;
