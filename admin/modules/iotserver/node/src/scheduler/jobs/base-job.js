

function BaseJob(name, schedule) {

  this._name = name;
  this._schedule = schedule;
  this._logEmitter = undefined;
  this._task = undefined;

  Object.defineProperty(this,"task",{
    get(){ return this._task; },
    set(task){
     this._task = task;
   }
 });
}

BaseJob.prototype = {

	init: function(logEmitter) {
        this._logEmitter = logEmitter;
        return true;
    },

    // run every day at midnigth
    getSchedule: function() {
    	return this._schedule;
    },

    // make sure to have  aunique job name
    getName: function() {
        return this._name;
    },

    run: function() {
    	return new Promise( (resolve, reject) => {
    		reject('run method not implemented for BaseJob Class');
    	});
    }
};

module.exports = BaseJob




