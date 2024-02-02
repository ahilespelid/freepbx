const cron = require('node-cron');

const { EventEmitter } = require('events');
const util = require("util");

function JobScheduler(){
	this._jobs = [];
}

util.inherits(JobScheduler, EventEmitter);

function addJob(self, job) {
	if (!job) {
		return false;
	}

	if (self._jobs.findIndex(x => x.getName() == job.getName()) > -1 ) {
		//self.emit('log', {level: 'warn', text: 'Job with name ' + job.getName() + ' already added. Possible duplicate job names'});
		return false;
	}

	// let's initialize the job
	if (!job.init(self)) {
		return false;
	}

	self._jobs.push(job);
	return true;
}

function removeJob(self, jobName) {
	var index = self._jobs.findIndex(x => x.getName() == jobName);
	if (index <= -1) {
		return false;
	}

	if (!self._jobs[index]) {
		self._jobs.splice(index, 1);
		return false;
	}

	if (self._jobs[index].task) {
		self._jobs[index].task.destroy();
		self._jobs[index].task = null;
	}

	self._jobs.splice(index, 1);
	return true;
}

JobScheduler.prototype.init = function(jobClasses) {
	jobClasses.forEach((jobClass)=>{
		let jb = new jobClass();
		addJob(this, jb);
	})
}

JobScheduler.prototype.schedule = function() {
	this._jobs.forEach((job)=>{
		if (!job.task) {
			var options = job.timezone ? {scheduled: true, recoverMissedExecutions: false, timezone: job.timezone} : null;
			var task = cron.schedule(job.getSchedule(), job.run.bind(job), options);
			job.task = task;
		}
	})
}

JobScheduler.prototype.stop = function() {
	this._jobs.forEach((job)=>{
		if (job.task) {
			job.task.destroy();
			job.task = null;
		}
	})
	this._jobs.splice(0, this._jobs.length)
}

JobScheduler.prototype.addJob = function(job) {
	return addJob(this, job)
}


JobScheduler.prototype.removeJob = function(jobName) {
	 return removeJob(this, jobName)
}

JobScheduler.prototype.getJobSchedule = function(jobName) {
	var index = this._jobs.findIndex(x => x.getName() == jobName);
	if (index <= -1) {
		return null;
	}
	return this._jobs[index].getSchedule();
}

module.exports = JobScheduler
