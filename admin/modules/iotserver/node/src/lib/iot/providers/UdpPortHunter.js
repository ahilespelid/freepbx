const log = require('../../log');

function UdpPortHunter(portRange) {
	// range in the format lower_limit:upper limit
	this._range  = portRange;

	this._ports = [];
}

UdpPortHunter.prototype = {

	initialize: function() {
		return new Promise((resolve,reject)=> {
			var range = this._range.toString().split(':');
			var low = parseInt(range[0]);
			var high = parseInt(range[1]);
			var count = 0;
			for (count = 0; low + count <= high; count++) {
				this._ports.push(low+count);
			}
			resolve(this);
		});
	},

	allocatePort: function() {
		return this._ports.shift();
	},

	reservePort: function(port) {
		var index = this._ports.findIndex(x=> x === port);
		if(index <= -1) {
			log.error("Port " + port + " already allocated");
			return null;
		} else {
			this._ports.splice(index, 1);
		}
		return port;

	},

	releasePort: function(port) {
		if(this._ports.findIndex(x=> x === port) > -1) {
			log.error("Double port release detected for udl port " + port);
			return null;
		} else {
			this._ports.push(port);
		}
		return port;
	},
};

module.exports = UdpPortHunter