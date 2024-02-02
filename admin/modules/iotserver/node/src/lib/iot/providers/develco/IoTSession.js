const log = require('../../../log');
const DevelcoController = require('./api/develco-controller.js');
const { EventEmitter } = require('events');
const util = require("util");

function IoTSession(config) {
    // jilia config
    this._config = config;
    this._provider_name = 'develco';
    this._controller = undefined;
    Object.defineProperty(this, "api", {
        get() { return this._controller; }
    });
    Object.defineProperty(this, "name", {
        get() { return this._provider_name; }
    });
}

util.inherits(IoTSession, EventEmitter);



IoTSession.prototype.DEVICES_ALLOWED = {
    'contact': true,
    'door-lock': true,
    'occupancy': true,
    'motion': true,
    'sensor': true,
    'light': true,
    'water': true,
    'switch': true,
    'thermostat': true,
    'button': true,
    'io-controller': true,
    'airquality': true,
    'security-keypad': false,
    'shade': true,
    'smoke': true
};

IoTSession.prototype.EVENT_STREAM_ALLOWED = {
    'status': true,
    'motion': true,
    'alarm': true,
    'onoff': true,
    'onOff': true,
    'temperature': true,
    'currentTemperature': true,
    'batteryLevel': true,
    'batteryVoltage': true,
    'state': true,
    'log': true,
    'rawPacket': true,
    'occupancy': true,
    'transition': true,
    'ring': true,
    'signal': true,
    'path': true,
    'airquality': true
};


IoTSession.prototype.initialize = function (port_hunter, backend_server) {

    return new Promise((resolve, reject) => {
        var self = this;
        this._controller = new DevelcoController(this._config, backend_server);
        this._controller.start().then((controller) => {
            controller.on('iot::develco::device::new', self._registerDevice.bind(self));
            controller.on('iot::develco::device::del', self._unRegisterDevice.bind(self));
            controller.on('iot::develco::device::event', self._eventHandler.bind(self));
            controller.on('iot::develco::state::event', self._stateHandler.bind(self));
            controller.on('iot::develco::path::event', self._stateHandler.bind(self));
            controller.on('iot::develco::log::event', self._logHandler.bind(self));
            resolve(self);
        }).catch((err) => {
            log.error(err);
            reject(err);
        })
    });
};

IoTSession.prototype.close = function () {

    if (this._controller) {
        this._controller.disconnect();
    }
}

IoTSession.prototype._registerDevice = function (serverName, deviceType, deviceId, deviceName, deviceProperties, callBackFn = undefined) {
    log.debug("Develco New device event for device : " + deviceId);

    var event = {
        server: serverName, type: "event", data: deviceProperties.state,
        device: {
            type: deviceType, stream: "state", id: deviceId, name: deviceName,
            properties: deviceProperties
        }
    };

    this.emit('iot::' + this._provider_name + '::event', this, event, callBackFn);
}

IoTSession.prototype._unRegisterDevice = function (serverName, deviceId, callBackFn = undefined) {

    log.debug("Develco remove device event for device : " + deviceId);

    var event = { server: serverName, type: "remove-device", device: { id: deviceId } }

    this.emit('iot::' + this._provider_name + '::event', this, event, callBackFn);
}

IoTSession.prototype._eventHandler = function (event, callBackFn = undefined) {
    log.trace("Develco device event: " + JSON.stringify(event));
    var arr_message = event.topic.split('/');
    if (arr_message.length >= 4 && this.DEVICES_ALLOWED[arr_message[1]] &&
        this.EVENT_STREAM_ALLOWED[arr_message[3]]) {
        this.emit('iot::' + this._provider_name + '::event', this, event, callBackFn);
    }
}

IoTSession.prototype._stateHandler = function (event, callBackFn = undefined) {
    log.debug("Develco state event: " + JSON.stringify(event));
    this.emit('iot::' + this._provider_name + '::event', this, event, callBackFn);
}


IoTSession.prototype._logHandler = function (event, callBackFn = undefined) {
    //log.debug("Develco log event: " + JSON.stringify(event));
    this.emit('iot::' + this._provider_name + '::event', this, event, callBackFn);
}

IoTSession.prototype.handleCloudReg = function () {
    return new Promise((resolve, reject) => {

        if (!this._controller) {
            return resolve();
        }

        this._controller.handleCloudReg().then(() => {
            resolve();
        }).catch((err) => {
            log.error(err);
            resolve();
        })


    })
}


module.exports = IoTSession