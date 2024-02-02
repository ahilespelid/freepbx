const log = require('../log');
const util = require("util");
const { EventEmitter } = require('events');
const AutomatedActionJob = require('../../scheduler/jobs/automated-action-job.js')
const dispatcher = require('./event-dispatcher.js');
const AutomatedAction = require('../../models/AutomatedAction.js');
const AutomatedActionApi = require('../../api/iot/automated-action-api.js');
const {buildSchedule,weekDaysMap} = require('../../scheduler/build-schedule.js');
const CommonApi = require('../../api/iot/common-api.js');

function process(self, on_modification = false) {
	return new Promise((resolve, reject) => {

		if (self._is_processing === true) {
			return resolve();
		}

		self._is_processing = true;
		AutomatedAction.fetchAll().then((automated_actions) => {
			var activeAutomatedActions = automated_actions.filter(x => ['active'].includes(x.get('status')) || (['expired', 'running'].includes(x.get('status')) && x.get('start') && (x.get('start').includes('Every') || x.get('start').includes('[') )));
			var inactiveAutomatedActions = automated_actions.filter(x => ['disabled', 'deleted'].includes(x.get('status')));
			var runningAutomatedActions = automated_actions.filter(x => x.get('status') == 'running' && ![null, undefined].includes(x.get('end')));
			// 1. let's make sure we have cleared/stopped all inactive automated_actions
			var now = new Date();
			var gmtDate = new Date(now.toGMTString());

			
			var q = require('q');
			var chain = q.when();
			inactiveAutomatedActions.forEach((automated_action) => {
				self._scheduler.removeJob(automated_action.get('name') + '-start');
				self._scheduler.removeJob(automated_action.get('name') + '-end');
				chain = chain.then(() => { 
					if (on_modification) return AutomatedActionApi.applyAutomatedAction(dispatcher, automated_action, automated_action.get('status'));
					else return Promise.resolve();
				}).then(() => { // let's remove all automated action and pending action properties 
					return AutomatedActionApi.removeAutomatedActionProperties(automated_action, dispatcher);
				}).catch((err) => {
					log.warn(err)
					return Promise.resolve();
				})
			})

			chain.then(() => {
                var jobsToRun = [];
				// 2. let's create jobs for active automated_actions, if not already done
				activeAutomatedActions.forEach((automated_action) => {
					var start_time = automated_action.get('start_timestamp_utc');
					var end_time = automated_action.get('end_timestamp_utc');
					var time_now = gmtDate.getTime() / 1000;
					var do_start_action = (start_time <= time_now ) && ((time_now-start_time) < 60);
					if (on_modification) {
						var start_now = false;
						var is_time_in_between_start_and_end = false;
						if((start_time <= time_now) && (end_time >= time_now)){
							is_time_in_between_start_and_end = true;
						}
						if (automated_action.get('start').includes('[')) {
							var details = automated_action.get('details') ? JSON.parse(automated_action.get('details')) : {};
							var timezone = details.timezone ? details.timezone : "UTC";
							let newDate = new Date(gmtDate.toLocaleString("en-US", {timeZone: timezone}))
							let thisDayDigit = newDate.getDay();
							thisDayDigit =  (thisDayDigit == 0) ? 7: thisDayDigit;
							let thisDay = Object.keys(weekDaysMap).find(key => weekDaysMap[key]== thisDayDigit);
							thisDay = thisDay.charAt(0).toUpperCase() + thisDay.slice(1); 
							let selected_days = JSON.parse(automated_action.get('start').split('|')[0].trim());
							if (selected_days.includes(thisDay) && is_time_in_between_start_and_end) { // if the present day is included in the selected weekdays.
								start_now = true;
							}
						} else if (automated_action.get('start').includes('Every') && is_time_in_between_start_and_end) {
							start_now = true;
						} else if (is_time_in_between_start_and_end){
							start_now = true;
						}
						
						if (start_now) {
							log.debug("This automated action:"+ automated_action.get('name') +" need to start immeadieately because start time is in past and end time is in future.");
							let job = new AutomatedActionJob(dispatcher, automated_action, null, 'start');
							job.init(self._scheduler);
							jobsToRun.push(job);
						}
					}
                    if (!automated_action.get('start') || ((!automated_action.get('start').includes('Every') && !automated_action.get('start').includes('[') ) && automated_action.get('start_timestamp_utc') && do_start_action )) {
						// easiest path, no schedule for this automated_action, just run it if start time is reached and it's less than one minute
						let job = new AutomatedActionJob(dispatcher, automated_action, null, 'start');
						job.init(self._scheduler);
						jobsToRun.push(job);
					} else if (automated_action.get('start') && (automated_action.get('start').includes('Every') || automated_action.get('start').includes('[') )) {
						// for all automated_actions with daily schedure of specefic days of week selected
						// this is a scheduled job, let's build the schedule
						let schedule = buildSchedule(automated_action, 'start');
						if (schedule) {
							let job = new AutomatedActionJob(dispatcher, automated_action, schedule, 'start');
							if (self._scheduler.addJob(job)) {
								log.debug('Using schedule ' + schedule + ' for job ' + job.getName() + ' with timezone ' + job.timezone);
								self._scheduler.schedule();
							} else if (self._scheduler.getJobSchedule(automated_action.get('name') + '-start') != schedule) {
								// job schedule have changed, let's adjust ourselves
								self._scheduler.removeJob(automated_action.get('name') + '-start');
								self._scheduler.addJob(job)
								log.debug('Using schedule ' + schedule + ' for job ' + job.getName() + ' with timezone ' + job.timezone);
								self._scheduler.schedule();
							}
						} else {
							log.warn('Failed to build start schedule for access automated_action ' + JSON.stringify(automated_action.toJSON()));
						}
					}
				})
				// 3. let's expire all running automated_actions that need to expire, if not already done.
				runningAutomatedActions.forEach((automated_action) => {
					var end_time = automated_action.get('end_timestamp_utc');
					var time_now = gmtDate.getTime() / 1000;
					var do_end_action = (end_time <= time_now ) && ((time_now - end_time) < 60);
					if (automated_action.get('end').includes('Every') || automated_action.get('end').includes('[') ) {
						// this is a scheduled job, let's build the schedule
						let schedule = buildSchedule(automated_action, 'end');
						if (schedule) {
							let job = new AutomatedActionJob(dispatcher, automated_action, schedule, 'end');
							if (self._scheduler.addJob(job)) {
								log.debug('Using schedule ' + schedule + ' for job ' + job.getName() + ' with timezone ' + job.timezone);
								self._scheduler.schedule();
							} else if (self._scheduler.getJobSchedule(automated_action.get('name') + '-end') != schedule) {
								// job schedule have changed, let's adjust ourselves
								self._scheduler.removeJob(automated_action.get('name') + '-end');
								self._scheduler.addJob(job)
								log.debug('Using schedule ' + schedule + ' for job ' + job.getName() + ' with timezone ' + job.timezone);
								self._scheduler.schedule();
							}

						} else {
							log.warn('Failed to build end schedule for access automated_action ' + JSON.stringify(automated_action.toJSON()));
						}
					} else if (automated_action.get('end_timestamp_utc') && do_end_action) {
						// easiest path, no schedule for this automated_action, just run it
						var job = new AutomatedActionJob(dispatcher, automated_action, null, 'end');
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
function statusCorrection(){
	return new Promise((resolve,reject) => {
		AutomatedAction.fetchAll().then((automated_actions) => {
			return CommonApi.subjectStatusCorrection(automated_actions);
		}).then(() =>{
			resolve();
		}).catch((err) => {
			log.warn(err);
		});
	});
}

function AutomatedActionManager() {
	this._scheduler = undefined;
	this._interval = undefined;
	this._is_processing = undefined;
}

util.inherits(AutomatedActionManager, EventEmitter);

AutomatedActionManager.prototype.init = function (scheduler) {
	return new Promise((resolve, reject) => {
		var self = this;
		self.stop().then(() => {
			self._scheduler = scheduler;
			self._is_processing = false;
			return statusCorrection();
		}).then(() =>{
			// make sure we schedule all jobs that need to be scheduled
			return process(self);
		}).then(() => {
			// check for jobs to process every minute
			self._interval = setInterval(process, 60000, self);
			resolve();
		})
	})
}

AutomatedActionManager.prototype.stop = function () {
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

AutomatedActionManager.prototype.handleCommand = function(command) {
	return new Promise((resolve,reject)=>{
		switch(command.type) {
			case "run-autoaction":
				process(this);
			break;
			case "run-autoaction-alter":
				process(this, true);
			break;
			case "run-autoaction-delete":
				process(this, true);
			break;
			default:
				log.warn('Unsupported command ' + JSON.stringify(command));
			break;
		}
		resolve();
	})
}

module.exports = AutomatedActionManager;
