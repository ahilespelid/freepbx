const log = require('../../../log');
const JiliaRestClient = require('./api/jilia-rest-client.js');
const JiliaWSClient = require('../ws-client.js');
const { EventEmitter } = require('events');
const util = require("util");

function IoTSession(config) {
	// jilia config
	this._config  = config;
	this._restApi = undefined;
	this._wsApi = undefined;
	this._token = undefined;
	this._provider_name = 'jilia';
	Object.defineProperty(this,"api",{
		get(){ return this._restApi; }
	});
	Object.defineProperty(this,"name",{
		get(){ return this._provider_name; }
	});
}

util.inherits(IoTSession, EventEmitter);



IoTSession.prototype.DEVICES_ALLOWED = {'contact':true,
'door-lock':true,
'occupancy':true,
'sensor':true,
'light':true,
'water':true,
'switch': true,
'thermostat': true,
'security-keypad': false,
'shade': false,
'smoke': false};

IoTSession.prototype.EVENT_STREAM_ALLOWED = {'status':true,
'motion':true,
'onOff': true,
'currentTemperature':true,
'batteryLevel':true,
'state': true,
'log': false,
'rawPacket': false,
'occupancy': true,
'transition': true,
'ring': true};


IoTSession.prototype.errorHandler = function(reason){
	log.error('[Jilia IoTSession ERROR] '+reason);
};

IoTSession.prototype.initialize = function(port_hunter, backend_server) {

	return new Promise((resolve,reject)=> {
		var self = this;
		this._restApi = new JiliaRestClient.JiliaRestClient(this._config.authentication.username,
			this._config.authentication.password, 
			'https://' + this._config.base_url, null);

		this._restApi.refreshApiToken().then((t)=>{
			self._token = t;
			self._wsApi = new JiliaWSClient('wss://' + self._config.base_url);
			self._wsApi.connect('echo-protocol', '/events?access_token=' + self._token, 20000, 
				'{"type": "subscribe", "topic": **}', self._eventHandler.bind(self), self.errorHandler.bind(self));
			resolve(self);
		}).catch((err)=>{
			log.error(err);
			reject(err);
		});

	});
};

IoTSession.prototype.close = function() {

	if (this._wsApi) {
		this._wsApi.disconnect();
	}
}

IoTSession.prototype._eventHandler =  function(connection, event){
	var arr_message = event.topic.split('/');
	if(arr_message.length>=4 && this.DEVICES_ALLOWED[arr_message[1]] && 
		this.EVENT_STREAM_ALLOWED[arr_message[3]]){

		event.server = arr_message[0];
		event.device = {
			type: arr_message[1], 
			id: arr_message[2],
			stream:arr_message[3] 
		};
		this.emit('iot::' + this._provider_name + '::event', this, event);
	}
}

IoTSession.prototype.handleCloudReg  = function() {
	return new Promise((resolve,reject)=> {
		resolve();
	})
}

module.exports = IoTSession