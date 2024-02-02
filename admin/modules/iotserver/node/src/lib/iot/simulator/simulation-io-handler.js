const SocketIOHandler = require('../socket-io-handler.js').SocketIOHandler;

function SimIOHandler(socket,cache,logger){
  SocketIOHandler.call(this,socket,cache,logger);
  this.connections = {};
}

SimIOHandler.prototype = Object.create(SocketIOHandler.prototype);
SimIOHandler.prototype.DEVICES_ALLOWED = {'contact':true,
					    'door-lock':true,
					    'occupancy':true,
					    'sensor':true,
					    'light':true,
					    'water':true,
              'switch': true,
              'thermostat': false,
              'security-keypad': false,
              'shade': false,
              'smoke': false};
SimIOHandler.prototype.EVENT_STREAM_ALLOWED = {'status':true,
						 'motion':true,
						 'currentTemperature':true,
						 'batteryLevel':true,
             'state': true,
             'log': false,
             'rawPacket': false,
             'occupancy': true,
             'transition': true,
             'ring': true};

SimIOHandler.prototype.init = function(dispatcher){

  this._init(dispatcher);

};
exports.SimIOHandler = SimIOHandler; 