const log = require('../../../log');
const CyberData = require('./api/cyberdata-controller.js');
const { EventEmitter } = require('events');
const util = require("util");

function IoTSession(config) {
	// cyberdata config
	this._config  = config;
	this._controller = undefined;
	this._provider_name = 'cyberdata';

	Object.defineProperty(this,"api",{
		get(){ return this._controller; }
	});

	Object.defineProperty(this,"name",{
		get(){ return this._provider_name; }
	});
}

util.inherits(IoTSession, EventEmitter);

IoTSession.prototype.errorHandler = function(reason){
	log.error('[CyberData IoTSession ERROR] '+reason);
};

IoTSession.prototype._eventHandler =  function(reqHost, cyberDataEvent) {

	log.debug('[CyberData IoTSession Received Event] '+ JSON.stringify(cyberDataEvent));

	if (this._controller) {
		var event = {mac: cyberDataEvent.$.MAC, host: reqHost, type: cyberDataEvent.event};
		this._controller.processIntercomEvent(event);
	}


	/*
	var mac = cyberDataEvent.$.MAC;
	var name  = cyberDataEvent.$.NAME;
	var event = {server: null, type: "event", name: name, 
				device: {type: "intercom", id: "cyb-" + mac, 
						properties: {phyId: mac, provider: "cyberdata"}}};

	if (reqHost) {
		event.device.properties.remote_ip = reqHost;
	}

	if (cyberDataEvent.event == "HEARTBEAT") {
		event.data = "ready";
		event.device.stream = "state";
	} else if (cyberDataEvent.event == "BUTTON") {
		event.data = "ringing";
		event.device.stream = "status";
	}
	
	if (event.data) {
		this.emit('iot::' + this._provider_name + '::event', this, event);
	}*/

}

IoTSession.prototype.initialize = function(port_hunter, backend_server) {

	return new Promise((resolve,reject)=> {
		var self = this;
		// base_url = ip:port
		this._controller =  new CyberData.CyberDataController(this._config, port_hunter);

		this._controller.start().then((controller)=>{
			controller.on('iot::cyberdata::device::new', self.registerDevice.bind(self));
			controller.on('iot::cyberdata::device::status', self.processDeviceStatus.bind(self));
			controller.on('iot::cyberdata::device::event', self.processDeviceEvent.bind(self));
			controller.on('iot::cyberdata::state::event', self._stateHandler.bind(self));
			resolve(self);    
		}).catch((err)=>{
			log.error(err);
			reject(err);
		}) 
	});	          
}

IoTSession.prototype.close = function() {

	if (this._controller) {
		this._controller.disconnect();
	}
}

IoTSession.prototype.registerDevice = function(serverName, deviceType, deviceId, deviceName, deviceProperties, callBackFn = undefined) {
	log.debug("Cyberdata New device event for device : " + deviceId);
	
	var event = {server: serverName, type: "event", data: "ready", 
				device: {type: deviceType, stream: "state", id: deviceId, name: deviceName, 
						properties: deviceProperties}};

	this.emit('iot::' + this._provider_name + '::event', this, event, callBackFn);
}

IoTSession.prototype.processDeviceStatus = function(serverId, deviceType, device_uuid, status, callBackFn = undefined) {
	log.debug("Cyberdata Device status " + status + " event for device uuid " + device_uuid);

	var event = {type: "event", server: serverId, data: status, device: {type: deviceType, id: device_uuid, stream: "status"}};
	this.emit('iot::' + this._provider_name + '::event', this, event, callBackFn);
}

IoTSession.prototype.processDeviceEvent = function(event, callBackFn = undefined) {
	event.server = null;
	this.emit('iot::' + this._provider_name + '::event', this, event, callBackFn);
}

IoTSession.prototype._stateHandler = function(event, callBackFn = undefined) {
	log.debug("Cyberdata state event: " + JSON.stringify(event));
	this.emit('iot::' + this._provider_name + '::event', this, event, callBackFn);
}

IoTSession.prototype.handleCloudReg  = function() {
	return new Promise((resolve,reject)=> {
		resolve();
	})
}


module.exports = IoTSession
