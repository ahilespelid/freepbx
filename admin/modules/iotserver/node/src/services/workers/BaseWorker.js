const { EventEmitter } = require('events');
const util = require("util");

function BaseWorker() {
}

util.inherits(BaseWorker, EventEmitter);

BaseWorker.prototype.initialize = function(config, connection) {
	return this.initialize_i(config, connection);
};

BaseWorker.prototype.stop = function() {
	return this.stop_i();
};

BaseWorker.prototype.doWork = function() {
	return this.doWork_i();
};

module.exports = BaseWorker