const log = require('../../../log');
//const Simulator = require('./api/simulator-controller.js');
const SimWSClient = require('../../simulator/simulation-ws-client.js').SimWSClient;
const { EventEmitter } = require('events');
const util = require("util");

const Location = require('../../models/Location');
const Zone = require('../../models/Zone');
const Gateway = require('../../models/Gateway');
const Scene = require('../../models/Scene');
const Group = require('../../models/Group');
const Device = require('../../models/Device');

function IoTSession(config) {
	this._config  = config;
	this._restApi = undefined;
	this._wsApi = undefined;
	this._token = undefined;
	this._provider_name = 'simulator';
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
'thermostat': false,
'security-keypad': false,
'shade': false,
'smoke': false};
IoTSession.prototype.EVENT_STREAM_ALLOWED = {'status':true,
'motion':true,
'currentTemperature':true,
'batteryLevel':true,
'state': true,
'log': false,
'rawPacket': false,
'occupancy': true,
'transition': true,
'ring': true};

function _handleDeviceRegistration = function(event) {
	return new Promise((resolve,reject)=>{
		var promises = [];
		promises.push(Device.destroyAll());
		promises.push(Gateway.destroyAll());
		promises.push(Group.destroyAll());
		promises.push(Scene.destroyAll());
		promises.push(Zone.destroyAll());
		promises.push(Location.destroyAll());
		var q = require('q');
		q.all(promises).then(()=>{
			gateway = new Gateway({"name": event.gateway, "uuid": event.gateway});
			gateway.save().then((gatewway)=>{
				q = require('q');
				promises = [];
				event.locations.forEach((location)=>{
					promises.push((new Location(location)).save());
				});
				q.all(promises).then(()=>{
					q = require('q');
					promises = [];
					event.zones.forEach((zone)=>{
						promises.push((new Zone(zone)).save());
					});
					q.all(promises).then(()=>{
						q = require('q');
						promises = [];
						event.scenes.forEach((scene)=>{
							promises.push((new Scene(scene)).save());
						});
						q.all(promises).then(()=>{
							q = require('q');
							promises = [];
							event.groups.forEach((group)=>{
								promises.push((new Group(group)).save());
							});
							q.all(promises).then(()=>{
								q = require('q');
								promises = [];
								event.devices.forEach((device)=>{
									device.properties = {provider: 'simulator'};
									promises.push((new Device(device)).save());
								});
								q.all(promises).then(()=>{
									resolve();
								});
							});
						});
					});
				});
			});
		});
	});
};

IoTSession.prototype.errorHandler = function(reason){
	log.error('[Simulator IoTSession ERROR] '+reason);
};

IoTSession.prototype.initialize = function(port_hunter, backend_server) {

	return new Promise((resolve,reject)=> {
		var self = this;
		this._wsApi = new SimWSClient('wss:/' + this.config.base_url, null);
        this._wsApi.connect(null, null, self._eventHandler.bind(self),this.errorHandler);
        resolve(this);
	});
};

IoTSession.prototype.close = function() {

	if (this._wsApi) {
		this._wsApi.disconnect();
	}
}

IoTSession.prototype._eventHandler =  function(event){
	if(event.type == 'event'){
        var arr_message = event.topic.split('/');
        if(arr_message.length>=4 && this.DEVICES_ALLOWED[arr_message[1]] && 
            this.EVENT_STREAM_ALLOWED[arr_message[3]]){
            //console.log("Received: " + JSON.stringify(event));
            event.server = arr_message[0];
            event.device = {
                type: arr_message[1], // contact, door-lock, occupancy, sensor, light, water
                id: arr_message[2],
                stream:arr_message[3] // status, motion, state, temperature, batterLevel
            };
            this.emit('iot::' + this._provider_name + '::event', this, event);
        } // What should we do with those which doesn't fit the condition?
    } else if (event.type == 'device-registration') {
        log.info("Simulation mode: Registering devices");
        _handleDeviceRegistration(event).then(()=>{
        	this.emit('iot::' + this._provider_name + '::event', this, event);
        	//this.emit('iot::' + this.provider_name + '::devices', this);
        });
    }
};

IoTSession.prototype.handleCloudReg  = function() {
	return new Promise((resolve,reject)=> {
		resolve();
	})
}

module.exports = IoTSession
