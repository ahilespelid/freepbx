const log = require('../../../../log');
const Gateway = require('../../../../../models/Gateway.js');
const Device = require('../../../../../models/Device.js');
const WSClient = require('../../ws-client.js');
const RestClient = require('./develco-rest-client.js');
const { EventEmitter } = require('events');
const util = require("util");
const fs = require('fs');
const net = require('net');

// make Promise version of fs.readdir()
fs.readdirAsync = function (dirname) {
    return new Promise(function (resolve, reject) {
        fs.readdir(dirname, function (err, filenames) {
            if (err)
                reject(err);
            else
                resolve(filenames);
        });
    });
};

// make Promise version of fs.readFile()
fs.readFileAsync = function (filename, enc) {
    return new Promise(function (resolve, reject) {
        fs.readFile(filename, enc, function (err, data) {
            if (err)
                reject(err);
            else
                resolve(data);
        });
    });
};

// utility function, return Promise
function getFile(filename) {
    return fs.readFileAsync(filename, 'utf8');
}

function checkVersion(v1, v2) {
    if (v1 == v2)
        return 0;
    if (!v1)
        return -1;
    if (!v2)
        return 1;

    v1 = v1.match(/-/) ? v1.replace(/-/g, '.').split('.') : (v1 + ".0").split('.');
    v2 = v2.match(/-/) ? v2.replace(/-/g, '.').split('.') : (v2 + ".0").split('.');

    let length = Math.min(v1.length, v2.length);
    for (let i = 0; i < length; i++)
        if (v1[i] < v2[i])
            return -1;
        else if (v1[i] > v2[i])
            return 1;
    return 0;
}

function DevelcoDevice(type, name, id, properties, actions) {
    this.type = type;
    this.id = id;
    this.name = name;
    this.properties = properties;
    this.actions = actions;
}

function DevelcoDefaultNameToType(defaultName) {
    if (defaultName.includes('Sensor')) {
        return 'sensor'
    } else if (defaultName.includes('Smart Plug')) {
        return 'Smart plug';
    } else {
        return defaultName;
    }
}

function DevelcoController(config, backend_server) {
    this._config = config;
    this._apis = new Map();
    this._gatewayIpToUuidMap = new Map();
    this._deviceIdToInfoMap = new Map();
    this._devicesPendingAdd = new Map();


    this._devicesPendingConfirmation = new Map();

    this._devicesPendingTimers = new Map();

    this._devicesCalibrationTimers = new Map();

    this._backend = backend_server;

    this._offlineDevices = new Map();


    this._devices = new Map();

    this._unknownDevices = [];

    this._is_processing = undefined;

    this._processTamperTimerCount = new Map();
}

util.inherits(DevelcoController, EventEmitter);


DevelcoController.prototype.errorHandler = function (reason, data) {
    let err = '[Develco Controller ';
    if (data) {
        err = err + data + ' ERROR]: ' + reason;
    } else {
        err = err + 'ERROR]: ' + reason;
    }
    log.error(err);
    //Connection Error: Error: read ETIMEDOUT
    //Connect Error: Error: getaddrinfo ENOTFOUND unknown unknown
    if ((reason.includes('Connection Error') || reason.includes('Connect Error') ||
        reason.includes('ETIMEDOUT') || reason.includes('ENOTFOUND') ||
        reason.includes('EHOSTUNREACH')) && data) {
        // connection got a read timeout, let's check if the gateway ip did not change
        this.checkGatewayIP(data)
    } else if (reason.includes('Connection Closed') && reason.includes('Heartbeat Timeout') && data) {
        // we're getting a hertbeat timeout let's reconnect
        var controller = this._apis.get(data);
        if (controller) {
            controller.ws.disconnect();
            controller.ws = null;
            controller.ws = new WSClient('ws://' + controller.ip + '/' + this._config.base_url + '/ws');
            controller.ws.connect(null, '', 20000, null, this._eventHandler.bind(this), this.errorHandler.bind(this), null, data);
            this._apis.set(data, controller);
        }
    }
}

const DEVICE_TYPE_TO_STATUS_DATAPOINT_MAP = {
    'door-lock': [{ ldev: 'lock', dpkey: 'status' }],
    'contact': [{ ldev: 'contact', dpkey: 'status' }, { ldev: 'alarm', dpkey: 'alarm' }],
    'button': [{ ldev: 'button', dpkey: 'status' }],
    'switch': [{ ldev: 'smartplug', dpkey: 'onoff' }],
    'light': [{ ldev: 'light', dpkey: 'onoff' }],
    'airquality': [{ ldev: 'voc', dpkey: 'level' }],
    'water': [{ ldev: 'alarm', dpkey: "flood" }],
    'smoke': [{ ldev: 'alarm', dpkey: 'fire' }],
    'sensor': [{ ldev: 'alarm', dpkey: 'alarm' }],
    'motion': [{ ldev: 'alarm', dpkey: 'alarm' }, { ldev: 'motion', dpkey: 'status' }],
    'io-door': [{ ldev: 'door', dpkey: 'state' }],
    'io-contact': [{ ldev: 'door', dpkey: 'binary' }]
};


function getStatusValue(deviceType, rawValue) {
    var value = rawValue;
    switch (deviceType) {
        case 'door-lock':
            value = rawValue ? "Locked" : "Unlocked";;
            break;
        case 'io-door':
            value = rawValue ? "Unlocked" : "Locked";
            break;
        case 'io-contact':
            value = rawValue ? "Closed" : "Opened";
            break;
        case 'contact':
            value = rawValue ? "Opened" : "Closed";
            break;
        case 'airquality':
            value = getAirQuality(rawValue);
            break;
        case 'switch':
            value = rawValue ? "On" : "Off";
            break;
        default:
            value = rawValue ? "Active" : "Inactive";
            break;
    }
    return value;
}

function _getDeviceStatus(device, api, emitter) {
    return new Promise((resolve, reject) => {
        var uuid = device.uuid;
        var type = device.type;
        var datapoints = undefined;
        var details = device.details;
        details = (typeof details === 'string') ? JSON.parse(details) : details;

        if (device.state === "unreachable") {
            log.warn('[Develco device status fetch]: Cannot get status of unreachable device');
            resolve()
            return;
        }

        if (uuid.includes('-io') || uuid.includes('-bin')) {
            var arr = uuid.includes('-io') ? uuid.split('-io') : uuid.split('-bin');
            type = uuid.includes('-io') ? 'io-door' : 'io-contact';
            datapoints = uuid.includes('-io') ? JSON.parse(JSON.stringify(DEVICE_TYPE_TO_STATUS_DATAPOINT_MAP['io-door'])) : JSON.parse(JSON.stringify(DEVICE_TYPE_TO_STATUS_DATAPOINT_MAP['io-contact']));
            datapoints.forEach((dt, index) => {
                dt.ldev = dt.ldev + arr[1];
                dt.dpkey = uuid.includes('-io') ? dt.dpkey : dt.dpkey + arr[1];
                this[index] = dt;
            }, datapoints)
        } else if (DEVICE_TYPE_TO_STATUS_DATAPOINT_MAP[type] !== undefined) {
            datapoints = JSON.parse(JSON.stringify(DEVICE_TYPE_TO_STATUS_DATAPOINT_MAP[type]))
        }

        if (datapoints) {
            log.debug('Syncing device ' + uuid + ' status using path ' + details.path + ' and datapoints ' + JSON.stringify(datapoints));
            var arr_dev = details.path.toString().split('/');
            api.rest.getDeviceDataPoint(arr_dev[2], datapoints[0].ldev, datapoints[0].dpkey, arr_dev[0].toUpperCase()).then((result) => {
                //log.info('Query result: ' + JSON.stringify(result))
                if (result !== undefined && result.value !== undefined) {
                    var status = getStatusValue(type, result.value);
                    var stream = (device.type === 'switch') ? 'onOff' : 'status';
                    updateDeviceStream(emitter, device.type, device.uuid, device.gateway_uuid, status, stream, 'iot::develco::device::event');

                    emitter._devices.set(device.gateway_uuid + '-' + uuid, { uuid: uuid, status: status });

                    resolve()
                } else if (datapoints.length > 1) {
                    api.rest.getDeviceDataPoint(arr_dev[2], datapoints[1].ldev, datapoints[1].dpkey, arr_dev[0].toUpperCase()).then((result) => {
                        //log.info('Query 2 result: ' + JSON.stringify(result))
                        if (result !== undefined && result.value !== undefined) {
                            var status = getStatusValue(type, result.value);
                            var stream = (device.type === 'switch') ? 'onOff' : 'status';
                            updateDeviceStream(emitter, device.type, device.uuid, device.gateway_uuid, status, stream, 'iot::develco::device::event');
                            emitter._devices.set(device.gateway_uuid + '-' + uuid, { uuid: uuid, status: status });
                        }
                        resolve()
                    }).catch((error) => {
                        log.warn('[Develco device status fetch error]: ' + error);
                        resolve()
                    })
                } else {
                    resolve()
                }
            }).catch((error) => {
                log.warn('[Develco device status fetch error]: ' + error);
                resolve()
            })
        } else {
            resolve();
        }
    })

}

function _refreshDevicesStatus(devices, api, emitter) {
    return new Promise((resolve, reject) => {
        var q = require('q');
        var chain = q.when();
        devices.forEach((device) => {
            chain = chain.then(() => {
                return _getDeviceStatus(device, api, emitter);
            })
        })
        resolve();
    })
}

function _processDeviceStatus(emitter, device, server, status, isTimeout) {
    var devId = device.get("uuid")
    var type = device.get("type");
    var stream = (type == 'door-lock') ? 'status' : 'onoff';

    log.debug('Processing device ' + devId + ' new status ' + status);

    if (isTimeout) {
        var api = emitter._apis.get(server);
        var timer = emitter._devicesPendingTimers.get(devId + ':action:' + stream);
        if (timer) {
            clearTimeout(timer);
            emitter._devicesPendingTimers.delete(devId + ':action:' + stream);
        }

        if (type == 'door-lock') {
            // handle io controller door locks which are reporting the stream as state instead of status
            timer = emitter._devicesPendingTimers.get(devId + ':action:state');
            if (timer) {
                clearTimeout(timer);
                emitter._devicesPendingTimers.delete(devId + ':action:state');
            }

            timer = emitter._devicesPendingTimers.get(devId + ':action:state:io');
            if (timer) {
                clearTimeout(timer);
                emitter._devicesPendingTimers.delete(devId + ':action:state:io');
            }
        }

        // get teh actual device status to be in sync
        _getDeviceStatus(device.toJSON(), api, emitter).catch((err) => { log.warn(err) })
    } else {

        updateDeviceStream(emitter, type, devId, server, status, stream, 'iot::develco::device::event');
        emitter._devices.set(server + '-' + devId, { uuid: devId, status: status });
    }

}

function _processIOTimer(emitter, device, server) {
    var devId = device.get("uuid")
    var timer = emitter._devicesPendingTimers.get(devId + ':action:state');
    var details = JSON.parse(device.get("details"));
    var api = emitter._apis.get(server);
    var arr_dev = details.path.toString().split('/');
    var data = undefined;
    var value = undefined;
    if (timer) {
        clearTimeout(timer);
        emitter._devicesPendingTimers.delete(devId + ':action:state');
    }

    var d = emitter._devices.get(server + '-' + devId);

    var arr = devId.split('-io');
    var ldev = 'door' + arr[1];
    var dpkey = 'state';

    var data = 'Locked';
    var value = false;

    if (d.status == 'Locking' || d.status == 'Locked') {
        // schedule a timeout to refresh the status in case we got out of sync
        setTimeout((_emitter, _device, _api) => {
            _getDeviceStatus(_device, _api, _emitter)
        }, 10000, emitter, device.toJSON(), api);
        return;
    }

    var params = { value: value };

    log.debug('[Develco IO Timer action ]: Running Lock');

    _processDeviceStatus(emitter, device, server, 'Locking', false);

    api.rest.updateDeviceDataPoint(arr_dev[2], ldev, dpkey, arr_dev[0].toUpperCase(), params).then(() => {
        //_processDeviceStatus(emitter, device, server, data, false);
        // schedule a timeout to refresh the status in case we got out of sync
        setTimeout((_emitter, _device, _api) => {
            _getDeviceStatus(_device, _api, _emitter)
        }, 10000, emitter, device.toJSON(), api);
    }).catch((err) => {
        // schedule a timeout to refresh the status in case we got out of sync
        setTimeout((_emitter, _device, _api) => {
            _getDeviceStatus(_device, _api, _emitter)
        }, 5000, emitter, device.toJSON(), api);
        log.error(err);
    });

}

function updateDeviceStream(self, type, id, server, data, stream, emit_topic) {

    var devicesToUpdate = [];
    if (type == 'io-controller') {
        var i = 0;
        var id_arr = id.split('-');
        controllerId = id_arr[0] + '-' + id_arr[1];
        for (i = 0; i < 8; i++) {
            var index = i + 1;
            id = id_arr[0] + '-' + id_arr[1] + '-io' + index;
            devicesToUpdate.push({ id: id, type: 'door-lock' })
        }
        for (i = 0; i < 4; i++) {
            var index = i + 1;
            id = id_arr[0] + '-' + id_arr[1] + '-bin' + index;
            devicesToUpdate.push({ id: id, type: 'contact' })
        }
    } else {
        devicesToUpdate.push({ id: id, type: type })
    }

    devicesToUpdate.forEach((_dev) => {

        if (stream === 'state' && data === 'unreachable') {
            // is device in calibration mode switched to unreachable state, 
            // we need to stop calibration rigth away..
            var timer = self._devicesCalibrationTimers.get(_dev.id);
            if (timer) {
                log.warn('[Develco Calibration ]: Stopping calibration for device ' + _dev.id + ' due to unreachable state.');
                clearInterval(timer);
                self._devicesCalibrationTimers.delete(_dev.id);
            }
        }
        var evt = { type: "event", server: server };
        evt.data = data;
        evt.topic = server + '/' + _dev.type + '/' + _dev.id + '/' + stream;
        evt.device = {
            type: type,
            id: _dev.id,
            stream: stream
        };
        self.emit(emit_topic, evt);
    })
}

function updateDetails(self, uuid, gw_data) {
    let api = self._apis.get(uuid);
    let { details } = api ? api : { details: { firmware: {} } };
    self.getFirmwareVersionFromGateway(api, self)
        .then(new_details => {
            if (new_details && new_details.firmware && details.firmware.version != new_details.firmware.version) {
                gw_data.firmware.version = new_details.firmware.version;
                gw_data.firmware.previous_version = details.firmware.version;
            }
            api.details.firmware = api.details.firmware || {};
            api.details.firmware.upgrade = api.details.firmware.upgrade || {};
            api.details = {
                ...api.details,
                firmware: {
                    ...api.details.firmware,
                    ...gw_data.firmware,
                    upgrade: {
                        ...api.details.firmware.upgrade,
                        ...gw_data.firmware.upgrade
                    }
                }
            };
            self._apis.set(uuid, api);
            self.emit("iot::develco::state::event", {
                id: uuid,
                type: "gateway-details",
                data: gw_data
            });
        }).catch(err => {
            log.error("develco-controller:updateGatewayState:>", err);
        });
};

function processTamperCounter(uuid, self) {
    let counter = self._processTamperTimerCount.get(uuid);
    if (counter == undefined) counter = 0;
    counter++;
    self._processTamperTimerCount.set(uuid, counter);
    return counter;
}
function updateGatewayState(self, uuid, data) {
    let event = { type: 'gateway-state', id: uuid, data: data },
        strevent = "iot::develco::state::event",
        callback = (uuid, type) => { };

    if (data == "ready") {
        callback = (uuid, type) => {
            if (type == "state") {
                let api = self._apis.get(uuid),
                    { details } = api ? api : {},
                    // Reset the upgrade values whether download_id is undefined (to sync up with the database) or the code from gateways is 106
                    gw_data = {
                        firmware: {
                            upgrade: {
                                action_flag: null,
                                status: null,
                                details: null,
                                download_id: null
                            }
                        }
                    };
                if (details) {
                    if (details.download_id != null)
                        api.rest.checkFirmwareInstallationProgress(details.download_id)
                            .then(res => {
                                if (res != undefined && res.code == 106) {
                                    // Only if the download_id is not longer valid go to get the firmware version from the gateway
                                    updateDetails(self, uuid, gw_data);
                                }
                            }).catch(err => {
                                log.error("develco-controller:updateGatewayState:checkFirmwareInstallationProgress:ERROR:> ", err)
                            });
                    else {
                        // If download_id is null or undefined make sure to sync up upgrade information with the database
                        updateDetails(self, uuid, gw_data);
                    }
                } else {
                    // this should never happen, but if so, initialize the values to null
                    self.emit(strevent, {
                        id: uuid,
                        type: "gateway-details",
                        data: gw_data
                    });
                }
            }
        }
    }
    if (data == "unreachable") {
        // We check the action flag to make sure the gateway is not reachable due to restarting 
        // during the update firmware process. If so we set the state to restarting
        let api = self._apis.get(uuid),
            { details } = api ? api : {};
        if (details && details.firmware && details.firmware.upgrade && ["revert", "upgrade"].includes(details.firmware.upgrade.action_flag)) {
            data = "restarting";
        }
        self.emit(strevent, {
            ...event,
            data: data
        }, callback);
        // we're flagging this gateway as unreachable to let's add its devices to the offline device map
        var offlineDevices = self._offlineDevices.get(uuid);
        for (var [_path, _info] of self._deviceIdToInfoMap) {
            var arr = _path.split('-zb/dev/');
            if (arr[0] == uuid) {
                var found = offlineDevices.find(x => x.uuid === _info.uuid);
                if (!found) {
                    offlineDevices.push({ uuid: _info.uuid, path: _path, type: _info.type });
                }
            }
        }
        self._offlineDevices.set(uuid, offlineDevices);
    } else {
        self.emit(strevent, event, callback);
    }
}

function updateDeviceState(self, type, id, server, data, path, offlineDevices) {
    var controllerId = undefined;
    if (type == 'io-controller') {
        var id_arr = id.split('-');
        controllerId = id_arr[0] + '-' + id_arr[1];
    }
    updateDeviceStream(self, type, id, server, data, 'state', 'iot::develco::state::event');
    var uuid = controllerId ? controllerId : id;
    var offlineIndex = offlineDevices.findIndex(x => x.uuid === uuid);
    if (data === 'ready') {
        if (offlineIndex > -1) {
            offlineDevices.splice(offlineIndex, 1);
        }
    } else {
        if (offlineIndex <= -1) {
            offlineDevices.push({ uuid: uuid, path: path, type: type })
        }
    }
    return offlineDevices;
}

function updateDevicePath(self, type, id, server, path) {
    updateDeviceStream(self, type, id, server, path, 'path', 'iot::develco::path::event');
}

function _processGatewayOfflineDevices(self, api, gateway, offlineDevs) {
    return new Promise((resolve, reject) => {

        if (self._is_processing === true) {
            log.warn("Offline devices processing already running, skipping this run!!!");
            return resolve();
        }

        try {

            self._is_processing = true;


            var tmr = undefined;

            var requestConfig = {
                timeout: 5000, //request timeout in milliseconds
                noDelay: true, //disable the Nagle algorithm
            };

            api.rest.getDevices(requestConfig).then((devices) => {

                // check the device path to make sure it has not changed
                var changed = [];
                devices.forEach((_device) => {
                    for (var [_path, _info] of self._deviceIdToInfoMap) {
                        var id = 'zb-' + _device.eui;
                        var new_path = gateway + '-' + 'zb/dev/' + _device.id;
                        var _arr = _path.split('-zb/dev/');
                        if (_info.uuid === id && _path !== new_path && _arr[0] == gateway) {
                            // device id have changed we need to update ourselves
                            log.debug("Develco Controller: Updating device " + id + " path from " + _path + " to " + new_path);
                            updateDevicePath(self, _info.type, _info.uuid, gateway, 'zb/dev/' + _device.id)
                            changed.push({ old_path: _path, new_path: new_path, info: JSON.parse(JSON.stringify(_info)) });
                        }
                    }
                })

                // first delete all the old entries as the id migth overlap
                changed.forEach((chg) => {
                    self._deviceIdToInfoMap.delete(chg.old_path);
                })

                // now set the new entries, can't be done in the same loop as the delete
                changed.forEach((_chg) => {
                    self._deviceIdToInfoMap.set(_chg.new_path, _chg.info);
                })


                // make a copy of the offline devices list
                var offlineDevices = JSON.parse(JSON.stringify(offlineDevs));
                offlineDevs.forEach((dev) => {
                    var device = devices.find(x => dev.uuid === 'zb-' + x.eui);
                    if (device && ((device.discovered === true && device.online === true)) || (dev.type === 'io-controller' && device.online === true)) {
                        // device came back to online, flag it as ready
                        tmr = self._devicesPendingTimers.get(dev.uuid + ':state:change:unreachable');
                        if (tmr) {
                            clearTimeout(tmr);
                            self._devicesPendingTimers.delete(dev.uuid + ':state:change:unreachable');
                        }

                        log.debug('Develco Controller: Marking device ' + dev.uuid + ' with online flag ' + device.online + ' as ready');

                        offlineDevices = updateDeviceState(self, dev.type, dev.uuid, gateway, 'ready', gateway + '-' + dev.path, offlineDevices);
                        let unknownID = self._unknownDevices.findIndex(x => x == gateway + '-' + dev.uuid);
                        if (unknownID > -1) {
                            self._unknownDevices.splice(unknownID, 1);
                        }

                        if (dev.type == 'unknown' && device.metadata && !self._devicesPendingAdd.get(gateway + '-zb/dev/' + device.id) && !self._devicesPendingConfirmation.get(gateway + '-zb-' + device.eui)) {
                            // check if the device type was unknown and update accordingly if necessary
                            var metadata = (typeof device.metadata === 'string') ? JSON.parse(device.metadata) : device.metadata;
                            var dataGroups = metadata.dataGroups ? metadata.dataGroups : [];
                            var devType = getDeviceType(dataGroups, device.name);

                            var devInf = self._deviceIdToInfoMap.get(dev.path);
                            if (devInf) {
                                devInf.type = devType;
                                self._deviceIdToInfoMap.set(dev.path, devInf);
                            }
                            var event = { data: { eui: device.eui, name: device.defaultName } }
                            event.data.metadata = device.metadata;
                            ProcessAddEvent(event, self, gateway, 'zb-' + device.eui, 'zb/dev/' + device.id, "ready");
                        }
                    }
                })

                // try to update the offline devices list
                var offDevs = devices.filter(x => x.online !== true);
                offDevs.forEach((offDev) => {
                    var found = offlineDevices.find(x => x.uuid === 'zb-' + offDev.eui)
                    if (!found) {
                        var path = gateway + '-' + 'zb/dev/' + offDev.id
                        var info = self._deviceIdToInfoMap.get(path);
                        if (info) {
                            tmr = self._devicesPendingTimers.get(info.uuid + ':state:change:unreachable');
                            if (!tmr) {
                                //offlineDevices  = updateDeviceState(self, info.type, 'zb-' + offDev.eui, gateway, 'unreachable', path, offlineDevices);
                                tmr = setTimeout((_self, _type, _id, _server, _path, _flag) => {
                                    log.debug('Develco Controller: Marking device ' + _id + ' with online flag ' + _flag + ' as unreachable');
                                    _self._devicesPendingTimers.delete(_id + ':state:change:unreachable');
                                    var _offlineDevs = _self._offlineDevices.get(_server);
                                    _offlineDevs = updateDeviceState(_self, _type, _id, _server, 'unreachable', _path, _offlineDevs);
                                    _self._offlineDevices.set(_server, _offlineDevs);
                                }, 15000, self, info.type, info.uuid, gateway, path, offDev.online);

                                self._devicesPendingTimers.set(info.uuid + ':state:change:unreachable', tmr);

                            }
                        }
                    }
                })

                // now look for devices that we have in our database, but that are not registered in develco DB. 
                // Those devices MUST be flagged as unreachable
                var toRemove = [];
                for (var [_path, _info] of self._deviceIdToInfoMap) {
                    var _arr = _path.split('-zb/dev/')
                    if (_arr[0] == gateway) {
                        var index = devices.findIndex(x => _info.uuid === 'zb-' + x.eui);
                        tmr = self._devicesPendingTimers.get(_info.uuid + ':state:change:unreachable');
                        var found = offlineDevices.find(x => x.uuid === _info.uuid);
                        if (index <= -1 && !tmr && !found) {
                            log.warn('Develco Controller: Marking device ' + _info.uuid + ' as unreacheble since not found in provider device list');
                            offlineDevices = updateDeviceState(self, _info.type, _info.uuid, gateway, 'unreachable', _path, offlineDevices);
                            let unknownD = self._unknownDevices.find(x => x == gateway + '-' + _info.uuid);
                            if (!unknownD) {
                                self._unknownDevices.push(gateway + '-' + _info.uuid)
                            }
                        }
                    }
                }

                self._offlineDevices.set(gateway, offlineDevices);


                // look for devices registered in develco DB, but not registered to us
                devices.forEach((_device) => {
                    var found = false;
                    var foundInfo = undefined
                    for (var [_path, _info] of self._deviceIdToInfoMap) {
                        var _arr = _path.split('-zb/dev/')
                        //log.debug("Checking device zb-" +  _device.eui + " against " + _path + " and " + JSON.stringify(_info))
                        if (_arr[0] == gateway && _info.uuid === 'zb-' + _device.eui) {
                            found = true;
                            foundInfo = _info
                        } else if (_arr[0] !== undefined && _arr[0] != gateway && _info.uuid === 'zb-' + _device.eui) {
                            // this device is mapped to a different gateway, log an error
                            log.error('Device with uuid ' + _info.uuid + ' changed from gateway ' + _arr[0] + ' to gateway ' + gateway);
                            found = true;
                        }
                    }

                    var path = 'zb/dev/' + _device.id
                    if (found === false && _device.defaultName != "SquidZigBee" && !self._devicesPendingAdd.get(gateway + '-' + path) && !self._devicesPendingConfirmation.get(gateway + '-zb-' + _device.eui)) {
                        log.debug('Develco Controller: Registring untracked device ' + JSON.stringify(_device))
                        var event = { data: { eui: _device.eui, name: _device.defaultName } }
                        var state = (_device.online === true && _device.discovered === true) ? "ready" : "unreachable";
                        var id = 'zb-' + _device.eui;

                        if (_device.defaultName === "Unknown device") {
                            event.data.metadata = { force_type: 'unknown' };
                        } else {
                            event.data.metadata = _device.metadata ? _device.metadata : {};
                        }

                        let unknownID = self._unknownDevices.findIndex(x => x == gateway + '-' + id);
                        if (unknownID > -1) {
                            self._unknownDevices.splice(unknownID, 1);
                        }
                        ProcessAddEvent(event, self, gateway, id, path, state)
                    } else if (found === true && _device.defaultName != "SquidZigBee" && foundInfo && _device.metadata &&
                        (!foundInfo.type || foundInfo.type == 'unknown') && !self._devicesPendingAdd.get(gateway + '-' + path) && !self._devicesPendingConfirmation.get(gateway + '-zb-' + _device.eui)) {
                        // this is a ready device with unknow type, let's update ourselves
                        log.debug('Develco Controller: Updating device with unknown type' + JSON.stringify(_device))
                        var metadata = (typeof _device.metadata === 'string') ? JSON.parse(_device.metadata) : _device.metadata;
                        var dataGroups = metadata.dataGroups ? metadata.dataGroups : [];
                        var devType = getDeviceType(dataGroups, _device.name);
                        foundInfo.type = devType;
                        self._deviceIdToInfoMap.set(gateway + '-' + path, foundInfo);
                        var event = { data: { eui: _device.eui, name: _device.defaultName } }
                        event.data.metadata = _device.metadata;
                        ProcessAddEvent(event, self, gateway, 'zb-' + _device.eui, path, "ready");
                    }
                })
                // last but not least validate that the websocket to thsi gateway is still connected
                if (!api.ws.connected()) {
                    log.warn('Develco Controller: Re-establishing websocket connection with gateway ' + gateway)
                    api.ws.disconnect();
                    api.ws = null;
                    api.ws = new WSClient('ws://' + api.ip + '/' + self._config.base_url + '/ws');
                    api.ws.connect(null, '', 20000, null, self._eventHandler.bind(self), self.errorHandler.bind(self), null, gateway);
                    self._apis.set(gateway, api);
                }
                self._is_processing = false;
                resolve();


            }).catch((error) => {
                log.error('Develco Controller ' + gateway + ' keepalive error:' + error);
                self._is_processing = false;
                resolve();
            })
        } catch (error) {
            log.error('Develco Controller ' + gateway + ' keepalive error:' + error);
            self._is_processing = false;
            resolve();
        }
    })
}

function _processOfflineDevices(self) {
    return new Promise((resolve, reject) => {
        if (!self._offlineDevices || self._offlineDevices.size <= 0) {
            resolve();
            return;
        }
        var promises = [];
        var q = require('q');
        var chain = q.when();
        self._offlineDevices.forEach((offlineDevs, gateway, map) => {
            var api = self._apis.get(gateway);
            if (api && api.state != "discovering") {
                chain = chain.then(() => {
                    return _processGatewayOfflineDevices(self, api, gateway, offlineDevs)
                })
            }
        })
        resolve();
    })
}

function getDeviceType(dataGroups, deviceName) {

    var type = undefined;
    dataGroups.forEach((dataGroup) => {
        if (dataGroup.ldevKey == 'lock' && dataGroup.dpKey == 'status') {
            type = 'door-lock';
        } else if (dataGroup.ldevKey == 'smartplug' && dataGroup.dpKey == 'onoff') {
            type = 'switch';
        } else if (dataGroup.ldevKey == 'contact' && dataGroup.dpKey == 'status') {
            type = 'contact';
        } else if (dataGroup.ldevKey == 'light' && dataGroup.dpKey == 'onoff') {
            type = 'light';
        } else if (dataGroup.ldevKey == 'motion' && dataGroup.dpKey == 'status') {
            type = 'motion';
        } else if (dataGroup.ldevKey == 'button' && dataGroup.dpKey == 'status') {
            type = 'button';
        } else if ((dataGroup.ldevKey == 'voc' && dataGroup.dpKey == 'level') || (dataGroup.ldevKey == 'airquality' && dataGroup.dpKey == 'voc')) {
            type = 'airquality';
        } else if (dataGroup.ldevKey == 'alarm' && dataGroup.dpKey == 'fire') {
            type = 'smoke';
        } else if (dataGroup.ldevKey == 'alarm' && dataGroup.dpKey == 'alarm') {
            if (["Window Sensor", "Magnetic Sensor"].includes(deviceName)) {
                type = 'contact';
            } else if (deviceName.includes("Motion Sensor")) {
                type = 'motion';
            }
        } else if (dataGroup.ldevKey == 'flood' && (dataGroup.dpKey == 'status' || dataGroup.dpKey == 'flood')) {
            type = 'water';
        } else if (!type) {
            type = 'sensor';
        }
    })

    if ((!type || type === 'sensor') && deviceName == "Smartenit IoT8-Z IO Controller") {
        // io controller has 8 door locks and 4 contacts
        type = 'io-controller';
    }

    return type;
}

function ProcessAddEvent(event, emitter, server, id, path, state) {
    // new device being added or device being removed
    if (event.data.name == "SquidZigBee") {
        return;
    }
    log.debug("Adding device " + id + " on gateway " + server);
    event.data.metadata = event.data.metadata ? event.data.metadata : {};
    var metadata = (typeof event.data.metadata === 'string') ? JSON.parse(event.data.metadata) : event.data.metadata;
    var dataGroups = metadata.dataGroups ? metadata.dataGroups : [];
    var type = getDeviceType(dataGroups, event.data.name);

    if ((!type || type === 'sensor') && event.data.metadata.force_type) {
        type = event.data.metadata.force_type;
    }

    if ((!type || type === 'sensor') && event.data.name == "Smartenit IoT8-Z IO Controller") {
        // io controller has 8 door locks and 4 contacts
        type = 'io-controller';
    }

    if (state !== 'ready') {
        var offlineDevices = emitter._offlineDevices.get(server);
        offlineDevices = offlineDevices ? offlineDevices : [];
        offlineDevices.push({ uuid: id, path: server + '-' + path, type: type })
        emitter._offlineDevices.set(server, offlineDevices);
    }

    log.debug("Setting confirmation pending timer for " + server + '-' + id);

    var cnfTimer = setTimeout((_self, _server, _id) => {
        log.warn("Device " + _id + " pairing on gateway " + _server + " confirmation timed out");
        _self._devicesPendingConfirmation.delete(_server + '-' + _id);
        let logTopic = 'gateways:' + _server;
        let logDt = 'Device [' + _id + '] registration confirmation timedout.\n';
        let logEvt = { type: 'log', data: logDt, topic: logTopic };
        _self.emit('iot::develco::log::event', logEvt);
    }, 60000, emitter, server, id);

    emitter._devicesPendingConfirmation.set(server + '-' + id, cnfTimer);

    var deviceProperties = {
        provider: 'develco',
        phyId: event.data.eui,
        state: state,
        path: path,
    };
    emitter.emit('iot::develco::device::new', server, type, id, event.data.name, deviceProperties);

    let logTopic = 'gateways:' + server;
    let logDt = 'Device [' + id + '] pairing complete event received.\n';
    logDt = logDt + 'Name: ' + (event.data.name ? event.data.name : 'unknonw') + '.\n';
    logDt = logDt + 'Discovered: ' + event.data.discovered + '.\n';
    logDt = logDt + 'Online: ' + event.data.online + '.\n';
    let logEvt = { type: 'log', data: logDt, topic: logTopic };
    emitter.emit('iot::develco::log::event', logEvt);


}

DevelcoController.prototype._eventHandler = function (connection, event) {
    var server = this._gatewayIpToUuidMap.get(connection.socket.remoteAddress);
    var self = this;
    if (server) {
        var api = this._apis.get(server);
        var arr_msg = event.path.toString().split('/');
        var path = arr_msg[0] + '/' + arr_msg[1] + '/' + arr_msg[2];
        var offlineDevices = self._offlineDevices.get(server);
        offlineDevices = offlineDevices ? offlineDevices : [];

        if (event.type == 'add' && arr_msg.length == 3 && ['zb', 'ble'].includes(arr_msg[0]) && event.data.eui) {
            var id = arr_msg[0] + '-' + event.data.eui;
            log.debug("Develco Event handler: Received add event " + JSON.stringify(event) + " from " + connection.socket.remoteAddress)

            let logTopic = 'gateways:' + server;
            let logDt = 'Device [' + id + '] start pairing event received.\n';
            logDt = logDt + 'Name: ' + (event.data.name ? event.data.name : 'unknown') + '.\n';
            logDt = logDt + 'Discovered: ' + event.data.discovered + '.\n';
            logDt = logDt + 'Online: ' + event.data.online + '.\n';
            let logEvt = { type: 'log', data: logDt, topic: logTopic };
            self.emit('iot::develco::log::event', logEvt);
            // new device in the process of being added
            if (event.data.discovered === true && !self._devicesPendingConfirmation.get(server + '-' + id)) {
                var state = (event.data.online === true) ? "ready" : "unreachable";
                var pending = self._devicesPendingAdd.get(server + '-' + event.path);
                if (pending) {
                    if (pending.timer)
                        clearTimeout(pending.timer);
                    self._devicesPendingAdd.delete(server + '-' + event.path);
                }

                let unknownID = self._unknownDevices.findIndex(x => x == server + '-' + id);
                if (unknownID > -1) {
                    self._unknownDevices.splice(unknownID, 1);
                }

                ProcessAddEvent(event, self, server, id, path, state)
            } else if (!self._devicesPendingAdd.get(server + '-' + event.path) && !self._devicesPendingConfirmation.get(server + '-' + id)) {
                log.debug("Remembering event " + event.path + " for registration ")
                /*var pendingTimer = setTimeout((controller, path) => {
                    var inf = controller._devicesPendingAdd.get(server + '-' + path);

                    if (inf) {
                        log.debug("Develco Event handler: Pairing timeout for device zb-" + inf.eui);
                        let logTopic = 'gateways:' + server;
                        let logDt = 'Device [zb-' + inf.eui + '] pairing timeout event received.\n';
                        logDt = logDt + 'Name: ' + (event.data.name ? event.data.name : 'unknown') + '.\n';
                        let logEvt = { type: 'log', data: logDt, topic: logTopic };
                        controller.emit('iot::develco::log::event', logEvt);
                    }
                    controller._devicesPendingAdd.delete(server + '-' + path);
                }, 60000, self, event.path);*/
                self._devicesPendingAdd.set(server + '-' + event.path, { eui: event.data.eui, timer: null /* pendingTimer*/ });
            } else {
                log.debug("Device [" + id + "] add event with path " + event.path + " already being processed");
                let logTopic = 'gateways:' + server;
                let logDt = 'Device [' + id + '] pairing in progress.\n';
                logDt = logDt + 'Name: ' + (event.data.name ? event.data.name : 'unknown') + '.\n';
                logDt = logDt + 'Discovered: ' + event.data.discovered + '.\n';
                logDt = logDt + 'Online: ' + event.data.online + '.\n';
                let logEvt = { type: 'log', data: logDt, topic: logTopic };
                self.emit('iot::develco::log::event', logEvt);
            }
        } else if (event.type == 'update' && self._devicesPendingAdd.get(server + '-' + event.path) && event.data.discovered === true) {
            var state = (event.data.online === true) ? "ready" : "unreachable";
            var id = arr_msg[0] + '-' + event.data.eui;
            log.debug("Develco Event handler: Received registration event " + JSON.stringify(event) + " from " + connection.socket.remoteAddress)
            var pending = self._devicesPendingAdd.get(server + '-' + event.path);
            if (pending) {
                if (pending.timer)
                    clearTimeout(pending.timer);

                self._devicesPendingAdd.delete(server + '-' + event.path);
            }
            if (!self._devicesPendingConfirmation.get(server + '-' + id)) {
                let unknownID = self._unknownDevices.findIndex(x => x == server + '-' + id);
                if (unknownID > -1) {
                    self._unknownDevices.splice(unknownID, 1);
                }
                ProcessAddEvent(event, self, server, id, path, state)
            } else {
                log.debug("Device " + id + " pair to gateway " + server + " in process. Waiting for confirmation");
                let logTopic = 'gateways:' + server;
                let logDt = 'Device [' + id + '] waiting for pairing confirmation.\n';
                logDt = logDt + 'Name: ' + (event.data.name ? event.data.name : 'unknown') + '.\n';
                logDt = logDt + 'Discovered: ' + event.data.discovered + '.\n';
                logDt = logDt + 'Online: ' + event.data.online + '.\n';
                let logEvt = { type: 'log', data: logDt, topic: logTopic };
                self.emit('iot::develco::log::event', logEvt);
            }
        } else if (event.type == 'update' && event.data.discovered === true && event.data.online === true && event.data.eui) {
            var id = arr_msg[0] + '-' + event.data.eui;
            var info = self._deviceIdToInfoMap.get(server + '-' + path);
            var oldPath = undefined;
            if (!info) {
                for (var [pth, inf] of self._deviceIdToInfoMap) {
                    if (id == inf.uuid && oldPath == undefined) {
                        // this means that an existing device changed path we should update ourselves
                        info = inf;
                        oldPath = pth;
                        break;
                    }
                }
                if (info && oldPath) {
                    log.debug("Develco Event handler: Received device path update event " + JSON.stringify(event) + " from " + connection.socket.remoteAddress)
                    self._deviceIdToInfoMap.set(server + '-' + path, info);
                    self._deviceIdToInfoMap.delete(oldPath);
                    updateDevicePath(self, info.type, id, server, path);

                    var tmr = self._devicesPendingTimers.get(id + ':state:change:unreachable');
                    if (tmr) {
                        clearTimeout(tmr);
                        self._devicesPendingTimers.delete(id + ':state:change:unreachable');
                    }
                }
            }
        } else if (event.type == 'remove') {
            var pending = self._devicesPendingAdd.get(server + '-' + path);
            if (pending) {
                if (pending.timer)
                    clearTimeout(pending.timer);
                self._devicesPendingAdd.delete(server + '-' + path);
            }
            var info = self._deviceIdToInfoMap.get(server + '-' + path);
            if (!info) {
                return;
            }
            var id = info.uuid;
            var type = info.type;
            log.debug("Develco Event handler: Received remove event " + JSON.stringify(event) + " from " + connection.socket.remoteAddress)
            var tmr = self._devicesPendingTimers.get(id + ':state:change:unreachable');
            if (tmr) {
                clearTimeout(tmr);
                self._devicesPendingTimers.delete(id + ':state:change:unreachable');
            }

            if (type == 'io-controller') {
                var i = 0;
                for (i = 0; i < 8; i++) {
                    var index = i + 1;
                    self.emit('iot::develco::device::del', server, id + '-io' + index);
                }

                i = 0;
                for (i = 0; i < 4; i++) {
                    var index = i + 1;
                    self.emit('iot::develco::device::del', server, id + '-bin' + index);
                }
            } else {
                self.emit('iot::develco::device::del', server, id);
            }

            self._deviceIdToInfoMap.delete(server + '-' + path);

            var offlineIndex = offlineDevices.findIndex(x => x.uuid === id);
            if (offlineIndex > -1) {
                offlineDevices.splice(offlineIndex, 1);
                self._offlineDevices.set(server, offlineDevices);
            }
        } else if (event.type == 'update' && event.path.includes('data')) {
            var info = self._deviceIdToInfoMap.get(server + '-' + path);
            if (!info) {
                return;
            }
            var id = info.uuid;
            var type = info.type;
            var ldev = arr_msg[4];
            var data = undefined;
            var stream = event.data.key;
            var discard = false;
            var timer = undefined;

            if (!id.includes('-io')) {
                timer = self._devicesPendingTimers.get(id + ':action:' + event.data.key);
                if (timer) {
                    clearTimeout(timer);
                    self._devicesPendingTimers.delete(id + ':action:' + event.data.key);
                }
            }

            if (event.data.key == 'status') {
                if (type == 'door-lock') {
                    data = event.data.value ? "Locked" : "Unlocked";
                } else if (type == 'button') {
                    data = event.data.value;
                } else if (['sensor', 'motion', 'water'].includes(type)) {
                    data = event.data.value ? "Active" : "Inactive";
                } else {
                    data = event.data.value ? "Opened" : "Closed";
                }
            } else if (event.data.key.includes("binary") && type === 'io-controller') {
                data = event.data.value ? "Closed" : "Opened";
                var arr = event.data.key.split('binary')
                var index = arr[1];
                var id_arr = id.split('-');
                id = id_arr[0] + '-' + id_arr[1] + '-bin' + index;
                stream = 'status';
                type = 'contact';
            } else if (event.data.key == 'state' && ldev.includes('door') && type === 'io-controller') {
                data = event.data.value ? "Unlocked" : "Locked";
                var arr = ldev.split('door')
                var index = arr[1];
                var id_arr = id.split('-');
                id = id_arr[0] + '-' + id_arr[1] + '-io' + index;
                timer = self._devicesPendingTimers.get(id + ':action:' + event.data.key);
                if (timer) {
                    clearTimeout(timer);
                    self._devicesPendingTimers.delete(id + ':action:' + event.data.key);
                }
                stream = 'status';
                type = 'door-lock';
            } else if (event.data.key == 'onoff') {
                stream = 'onOff';
                data = event.data.value ? "On" : "Off";
            } else if (event.data.key == 'temperature') {
                stream = 'currentTemperature';
                data = event.data.value;
            } else if (ldev == 'battery' && event.data.key == 'remaining') {
                stream = 'batteryLevel';
                data = event.data.value;
            } else if (ldev == 'battery' && event.data.key == 'voltage') {
                stream = 'batteryLevel';//'batteryVoltage';
                // 3.1V is 100% and for each % its 100mv
                data = 100 - ((3.1 - parseFloat(event.data.value)) * 10);
            } else if (['diagnostics', 'diagnostic'].includes(ldev) && event.data.key == 'rssi') {
                stream = 'signal';
                data = getSignalQuality(event.data.value);
                data = (data != ' ') ? data + ': ' + event.data.value + 'dbm' : data;
            } else if (['diagnostics', 'diagnostic'].includes(ldev) && event.data.key == 'networklinkstrength') {
                stream = 'signal';
                // RSSI ~= (percentage / 2) - 100
                var val = (parseInt(event.data.value) / 2) - 100
                data = getSignalQuality(val);
                data = (data != ' ') ? data + ': ' + val + 'dbm' : data;
            } else if (event.data.key == 'alarm') {
                stream = 'status';
                if (type == 'contact') {
                    data = event.data.value ? "Opened" : "Closed";
                } else if (type != 'door-lock') {
                    data = event.data.value ? "Active" : "Inactive";
                } else {
                    discard = true;
                }
            } else if (ldev == 'voc' && event.data.key == 'level') {
                stream = 'status';
                data = getAirQuality(event.data.value);
            } else if (event.data.key == 'fire') {
                stream = 'status';
                data = event.data.value ? "Active" : "Inactive";
            } else if (event.data.key == "flood") {
                stream = 'status';
                data = event.data.value ? "Active" : "Inactive";
            } else {
                discard = true;
            }

            if (!discard) {
                log.debug("Develco Event handler: Received update event " + JSON.stringify(event) + " from " + connection.socket.remoteAddress);
                var tmr = self._devicesPendingTimers.get(id + ':state:change:unreachable');
                if (tmr) {
                    clearTimeout(tmr);
                    self._devicesPendingTimers.delete(id + ':state:change:unreachable');
                }
                updateDeviceStream(self, type, id, server, data, stream, 'iot::develco::device::event');

                if (stream === 'status' || stream === 'onOff') {
                    self._devices.set(server + '-' + id, { uuid: id, status: data });
                }
            }
        } else if (event.type == 'update' && event.data) {
            var info = self._deviceIdToInfoMap.get(server + '-' + path);
            if (!info) {
                return;
            }
            var id = info.uuid;
            var type = info.type;
            var data = 'ready';
            var stream = 'state';
            var discard = false;
            var controllerId = undefined
            if (event.data.discovered === true && event.data.online === true) {
                data = 'ready';
            } else if (event.data.online === false) {
                data = 'unreachable';
            } else {
                discard = true;
            }
            if (!discard) {
                log.debug("Develco Event handler: Received state update event " + JSON.stringify(event) + " from " + connection.socket.remoteAddress);
                var tmr = self._devicesPendingTimers.get(id + ':state:change:unreachable');
                if (data === 'ready') {
                    if (tmr) {
                        clearTimeout(tmr);
                        self._devicesPendingTimers.delete(id + ':state:change:unreachable');
                    }
                    offlineDevices = updateDeviceState(self, type, id, server, data, server + '-' + path, offlineDevices);
                    self._offlineDevices.set(server, offlineDevices);
                    let unknownID = self._unknownDevices.findIndex(x => x == server + '-' + id);
                    if (unknownID > -1) {
                        self._unknownDevices.splice(unknownID, 1);
                    }
                } else {
                    if (!tmr) {
                        tmr = setTimeout((self, _type, _id, _server, _path) => {
                            self._devicesPendingTimers.delete(_id + ':state:change:unreachable');
                            var offlineDevs = self._offlineDevices.get(server);
                            offlineDevs = updateDeviceState(self, _type, _id, _server, 'unreachable', _path, offlineDevs);
                            self._offlineDevices.set(server, offlineDevs);
                        }, 15000, self, type, id, server, server + '-' + path);
                        self._devicesPendingTimers.set(id + ':state:change:unreachable', tmr);
                    }
                }



            }
        }
    } else {
        log.error('[Develco Controller ERROR] Dropping message from unknow peer ' + connection.socket.remoteAddress);
    }
}
/* 
  Keep track of the firmware installation progress and updates the database by 
  emitting the iot:develco:state:event event with the new information
  @param uuid string uuid of the gateway
  @param gateway_details JSON object
*/
DevelcoController.prototype.checkFirmwareInstallationProgress = function (uuid, gateway_details) {
    return new Promise((resolve, reject) => {
        if (gateway_details && gateway_details.firmware != undefined && gateway_details.firmware.upgrade != undefined) {
            let { firmware: { version, previous_version, upgrade } } = gateway_details,
                { status, download_id } = upgrade,
                api = this._apis.get(uuid);
            previous_version = version != undefined ? version : previous_version;
            if (api != undefined) {
                api.rest.checkFirmwareInstallationProgress(download_id).then(res => {
                    res = res && res.length !== undefined ? res[0] : res;
                    if (res) {
                        gateway_details = {
                            ...gateway_details,
                            firmware: {
                                ...gateway_details.firmware,
                                upgrade: {
                                    status: res.status,
                                    download_id: res.status == "complete" ? null : res.id,
                                    details: res.details ? res.details : null
                                }
                            }
                        }
                        if (!["failed", "cancelled", "complete"].includes(res.status)) {
                            // this is the recursive loop to get the firmware information from the gateway
                            setTimeout(() => {
                                this.checkFirmwareInstallationProgress(uuid, gateway_details)
                                    .then(resolve)
                                    .catch(reject);
                            }, 10000);
                        } else if (res.status == "failed") {
                            reject("Firmware installation process failed in " + uuid + " details: " + (res.details || res.message));
                        } else if (res.status == "canceled") {
                            reject("Firmware installation in " + uuid + " was cancelled");
                        } else {
                            resolve(gateway_details);
                        }
                        if (parseInt(res.code) == 106) {
                            gateway_details.firmware.upgrade = {
                                ...gateway_details.firmware.upgrade,
                                download_id: null,
                                action_flag: null,
                                status: null
                            };
                        }
                        api.details = gateway_details;
                        this._apis.set(uuid, api);
                        //this.emit(strevent, event);
                        updateDetails(this, uuid, gateway_details);
                    } else {
                        // if res is undefined lets wait and check the process again
                        setTimeout(() => {
                            this.checkFirmwareInstallationProgress(uuid, gateway_details)
                                .then(resolve)
                                .catch(reject);
                        }, 10000);
                    }
                }).catch(err => {
                    log.error("develco-controller:DevelcoController:checkFirmwareInstallationProgress:error:>", err);
                    updateGatewayState(this, uuid, api.state);
                    reject(err);
                });
            }
        } else {
            reject("No upgrade information is available to check the firmware installation progress");
        }
    });
}
// Request the gateway to install the available version which required info is in upgrade
// field under firmware object in gateway.details. If the request success it checks the 
// firmware installation process.
// @param instance Gateway Model
// @return Promise JSON object that could be upsed to merge with gateway details
DevelcoController.prototype.installFirmwareGateway = function (gateway) {
    return new Promise((resolve, reject) => {
        let api = this._apis.get(gateway.uuid),
            requestConfig = {
                timeout: 5000, //request timeout in milliseconds
                noDelay: true, //disable the Nagle algorithm
            },
            details = JSON.parse(gateway.details),
            { firmware: { upgrade } } = details.firmware ? details : { firmware: {} },
            request_body = {
                algorithm: "md5",
                hash: upgrade.hash,
                technology: "gateway",
                storage: "temporary",
                uri: upgrade.uri + upgrade.file
            };
        api.rest.installFirmwareGateway(requestConfig, request_body).then((data) => {
            data = data.length !== undefined ? data[0] : data;

            if (data.code != undefined && data.code != 200) {
                reject(data.message);
            } else {
                details = {
                    ...details,
                    firmware: {
                        ...details.firmware,
                        upgrade: {
                            ...details.firmware.upgrade,
                            download_id: data.id,
                            status: data.status
                        }
                    }
                }
                api.details = details;
                this._apis.set(gateway.uuid, api);
                this.checkFirmwareInstallationProgress(gateway.uuid, details).catch((err) => {
                    log.error("develco-controller:installFirmwareGateway:> checkFirmwareInstallationProgress failed with ERROR: ", err)
                });
                resolve(details);
            }
        }).catch(err => {
            log.error('develco-controller:DevelcoController:installFirmwareGateway:error:>', err)
            reject(err);
        });
    })
}
// Following function gets the firmware version currently running in the gateway
// @param api instance Develco rest API Object
// @return Promise JSON object that can be used for mergin with gateway details
DevelcoController.prototype.getFirmwareVersionFromGateway = function (api) {
    return new Promise((resolve, reject) => {
        let { details: { firmware } } = api,
            technology = 'gateway';
        let requestConfig = {
            timeout: 10000, //request timeout in milliseconds
            noDelay: true, //disable the Nagle algorithm
        };
        return api.rest.getFirmwareVersion(requestConfig).then((data) => {
            if (data && data.length > 0) {
                let fwversion = data.find(f => f.technology == technology);
                if (fwversion) {
                    //let firmware = api.details && api.details.firmware ? api.details.firmware : {},
                    details = {
                        firmware: {
                            ...firmware,
                            version: fwversion.version,
                            // If the upcoming version (fwversion.version) is different from the current version (firmware.version) 
                            // we assume that there was a firmware update while the backendserver was down. 
                            previous_version: firmware.version != undefined && firmware.version != fwversion.version ? firmware.version : firmware.previous_version
                        }
                    };
                }
                resolve(details);
            }
        }).catch(err => {
            log.error('develco-controller:DevelcoController:getFirmwareVersion:error:>', err.message)
            reject(err);
        });
    });
}

DevelcoController.prototype._initTemplates = function (apis) {
    return new Promise((resolve, reject) => {

        var self = this;
        var _files = undefined;
        if (!self._config.templates) {
            resolve();
        } else {
            var promises = [];
            var q = require('q');
            if (self._config.templates.storage == 'local') {
                fs.readdirAsync(self._config.templates.path).then((filenames) => {
                    filenames.forEach((filename) => {
                        promises.push(getFile(self._config.templates.path + '/' + filename))
                    })
                    return q.all(promises);
                }).then((files) => {
                    _files = files;
                    apis.forEach((api) => {
                        var chain = q.when();
                        _files.forEach((file) => {
                            chain = chain.then(() => {
                                return api.rest.addTemplate(JSON.parse(file));
                            })
                        })
                    });
                }).catch((error) => {
                    log.error(error);
                    reject(error);
                });
            }
        }
        resolve();
    });
}

DevelcoController.prototype._processTamper = function (uuid, self) {
    return new Promise((resolve, reject) => {
        const controller = self._apis.get(uuid);
        if (!controller) {
            return resolve();
        }

        if (controller.timer) {
            clearTimeout(controller.timer);
            controller.timer = null;
        }

        var tmr = self._devicesPendingTimers.get(uuid + ':state:change:unreachable')

        controller.rest.getGateway().then((gw) => {
            if (!gw) {
                controller.timer = setTimeout(self._processTamper.bind(self), 60000, uuid, self)
                self._apis.set(uuid, controller);
                return resolve();
            }
            var data = 'ready';

            if (tmr) {
                clearTimeout(tmr);
                self._devicesPendingTimers.delete(uuid + ':state:change:unreachable');
            }
            if (controller.state !== 'discovering' && controller.state !== data) {
                log.debug("Gateway " + uuid + " state changing from " + controller.state + " to " + data);
                controller.state = data;
                updateGatewayState(self, uuid, data);
                if (data === 'ready') {
                    // gateway coming back online, we need to reset its websocket connection
                    controller.ws.disconnect();
                    controller.ws = null;
                    controller.ws = new WSClient('ws://' + controller.ip + '/' + self._config.base_url + '/ws');
                    controller.ws.connect(null, '', 20000, null, self._eventHandler.bind(self), self.errorHandler.bind(self), null, uuid);
                }
            }
            controller.timer = setTimeout(self._processTamper.bind(self), 60000, uuid, self)
            self._apis.set(uuid, controller);
            resolve();
        }).catch((err) => {
            const exec_counter = processTamperCounter(uuid, self);
            if (exec_counter == 2 && controller.state == 'adding') {
                controller.state = "unreachable";
                self._devicesPendingTimers.delete(uuid + ':state:change:unreachable');
                updateGatewayState(self, uuid, 'unreachable');
            } else if (controller.state !== 'unreachable' && controller.state !== 'adding') {
                controller.state = 'unreachable';
                if (!tmr) {
                    tmr = setTimeout((_self, _uuid) => {
                        _self._devicesPendingTimers.delete(_uuid + ':state:change:unreachable');
                        updateGatewayState(_self, _uuid, 'unreachable');
                    }, 150000, self, uuid);
                    self._devicesPendingTimers.set(uuid + ':state:change:unreachable', tmr);
                }
            }
            controller.timer = setTimeout(self._processTamper.bind(self), 60000, uuid, self);
            self._apis.set(uuid, controller);
            resolve();
        });

    });
}

function getSignalQuality(dbmValue) {

    if (dbmValue == 'unknown') {
        return ' ';
    } else {
        var dbmValue = parseInt(dbmValue);
        if (dbmValue >= -50) {
            return "Excellent";
        } else if (-60 <= dbmValue && dbmValue < -50) {
            return "Very Good";
        } else if (-70 <= dbmValue && dbmValue < -60) {
            return "Good";
        } else if (-85 <= dbmValue && dbmValue < -70) {
            return "Weak";
        } else {
            return "Very Weak";
        }
    }
}

function _runCalibration(device, api, emitter) {
    return new Promise((resolve, reject) => {
        var serverName = device.gateway_uuid;
        var details = JSON.parse(device.details);
        var devId = device.uuid

        var resp = undefined;
        if (api) {
            var arr_dev = details.path.toString().split('/');
            api.rest.getDeviceSignalStrength(arr_dev[2], arr_dev[0].toUpperCase()).then((res) => {
                log.debug("Signal level for device " + device.name + " is " + res.value + " dbm");
                var data = getSignalQuality(res.value);
                data = (data != ' ') ? data + ': ' + res.value + 'dbm' : data;
                updateDeviceStream(emitter, device.type, devId, serverName, data, 'signal', 'iot::develco::device::event');
                resp = { uuid: devId, type: device.type, signal: data };
                resolve(resp);
            }).catch((error) => {
                log.error(error);
                resolve(false)
            })
        } else {
            resolve(false)
        }
    });
}

function _wait(ms) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve();
        }, ms);
    });
}

function _initializeGateway(gw, apis, emitter) {
    return Promise.all([
        _refreshSignalLevel(gw.devices, apis.get(gw.uuid), emitter)
    ])
}
// Check the Frimware status at stating to check whether
// exist a gateway with install process locked in the db
function _checkFirmwareStatus(uuid, details, emitter) {
    return new Promise((resolve, reject) => {
        let is_installing = details && details.firmware && details.firmware.upgrade && (details.firmware.upgrade.action_flag || details.firmware.upgrade.status);
        if (is_installing) {
            emitter.checkFirmwareInstallationProgress(uuid, details).then(resolve).catch(err => {
                log.error("develco-controller:_checkFirmwareStatus:error>", err);
                resolve();
            });
        } else {
            let api = emitter._apis.get(uuid)
            api.details = {
                ...api.details,
                ...details,
                upgrade: {
                    ...api.details.upgrade,
                    ...details.upgrade
                }
            };
            emitter._apis.set(uuid, api);
            emitter.emit("iot::develco::state::event", {
                id: uuid,
                type: "gateway-details",
                data: details
            });
            resolve(details);
        }
    });
}
function _refreshSignalLevel(devices, api, emitter) {
    return new Promise((resolve, reject) => {
        var q = require('q');
        var chain = q.when();
        devices.forEach((device) => {
            chain = chain.then(() => {
                return _getDeviceStatus(device, api, emitter);
            }).then(() => {
                return _wait(50);
            }).then(() => {
                return _runCalibration(device, api, emitter);
            })
        })
        resolve();
    });
}

DevelcoController.prototype.start = function () {

    return new Promise((resolve, reject) => {
        var self = this;
        var gateway_uuids = [];
        var apis = [];
        self._offlineDevices.clear();
        self._is_processing = false;
        // get the gateways from the DB
        Gateway.where({ provider: 'develco' }).fetchAll({ withRelated: ['devices'] }).then((gateways) => {
            var _gateways = gateways ? gateways.toJSON() : [];
            _gateways.forEach((gateway) => {
                var uuid = gateway.uuid;
                var details = gateway.details ? JSON.parse(gateway.details) : {};
                // create the rest api client
                var rest = new RestClient('http://' + details.remote_ip + '/' + self._config.base_url)
                // create the ws connection
                var wsApi = new WSClient('ws://' + details.remote_ip + '/' + self._config.base_url + '/ws');
                wsApi.connect(null, '', 20000, null, self._eventHandler.bind(self), self.errorHandler.bind(self), null, uuid);
                var cont = { rest: rest, ws: wsApi, uuid: gateway.uuid, details: { ...details, firmware: details.firmware || { upgrade: {} } }, state: gateway.state, ip: details.remote_ip };
                cont.timer = setTimeout(self._processTamper.bind(self), 60000, uuid, self);
                self._apis.set(uuid, cont);
                self._gatewayIpToUuidMap.set(details.remote_ip, uuid);
                gateway_uuids.push(uuid);
                apis.push(cont);
                self._offlineDevices.set(uuid, []);

                gateway.devices.forEach((device) => {
                    var details = (typeof device.details === 'string') ? JSON.parse(device.details) : device.details;
                    var device_uuid = device.uuid;
                    var controllerId = undefined;
                    var offlineDevices = self._offlineDevices.get(uuid);
                    offlineDevices = offlineDevices ? offlineDevices : []
                    if (device_uuid.includes("-io")) {
                        let arr = device_uuid.split('-io');
                        controllerId = arr[0];
                    } else if (device_uuid.includes("-bin")) {
                        let arr = device_uuid.split('-bin');
                        controllerId = arr[0];
                    }

                    var mapId = uuid + '-' + details.path;
                    var mapType = device.type;
                    var offId = device.uuid;
                    if (controllerId) {
                        mapType = 'io-controller';
                        offId = controllerId;
                    }

                    var obj = self._deviceIdToInfoMap.get(mapId);
                    var isdDup = false;
                    if (obj && obj.uuid != offId) {
                        log.warn('Duplicate path ' + mapId + 'found between device ' + JSON.stringify(obj) + ' and device ' + JSON.stringify({ uuid: offId, type: mapType }));
                        isdDup = true;
                    }

                    if (isdDup === false) {
                        self._deviceIdToInfoMap.set(mapId, { uuid: offId, type: mapType });
                        if (device.state !== "ready") {
                            offlineDevices.push({ uuid: offId, path: mapId, type: mapType })
                        }
                    }

                    self._offlineDevices.set(uuid, offlineDevices);

                    self._devices.set(gateway.uuid + '-' + device_uuid, { uuid: device_uuid, status: device.status });
                })

                // schedule a job 15 seconds after startup to refresh devices signal level.
                // we're doing this 15 seconds after startup to make sure all event listeners 
                // are up and running when the signal level events will be raised.
                setTimeout(_initializeGateway, 15000, gateway, self._apis, self)
                //setTimeout(_refreshSignalLevel, 15000, gateway.devices, cont, self)
            });
            return self._initTemplates(apis);
        }).then(() => {
            // schedule a timeout to periodically check offline devices
            setInterval(_processOfflineDevices, 10000, self);
            resolve(self);
        }).catch((err) => {
            log.error(err);
            resolve(self);
        });
    });
}

DevelcoController.prototype.disconnect = function () {
    var self = this;
    for (var [uuid, api] of self._apis) {
        if (api.ws) {
            api.ws.disconnect();
        }
    }
    self._apis.clear();
    self._gatewayIpToUuidMap.clear();
    self._deviceIdToInfoMap.clear();
    self._devicesPendingTimers.clear();
    self._devicesCalibrationTimers.clear();
    self._devices.clear();

    self._devicesPendingConfirmation.clear();
    self._devicesPendingAdd.clear();
    self._is_processing = false;
}

DevelcoController.prototype.getDevice = function (serverName, deviceId, deviceData) {
    return new Promise((resolve, reject) => {
        var self = this;
        var api = this._apis.get(serverName);
        if (!api) {
            reject("Unknown device gateway");
        } else {

            //log.debug("Looking for confirmation pending timer for " + serverName + '-' + deviceId);

            var tmr = self._devicesPendingConfirmation.get(serverName + '-' + deviceId)
            if (tmr) {
                log.debug("Clearing confirmation pending timer for " + serverName + '-' + deviceId);
                clearTimeout(tmr);
            }
            self._devicesPendingConfirmation.delete(serverName + '-' + deviceId);
            if (deviceData.properties == undefined) {
                return reject("Cannot retrieve device access path");
            }
            var path = deviceData.properties.path;
            var arr_dev = path.toString().split('/');
            var properties = { provider: 'develco', path: path };
            var actions = [];
            var q = require('q');
            var type = undefined;
            var name = undefined;
            var device = undefined;
            var promises = [];
            var devInfo = undefined;
            var datapoints = undefined;
            api.rest.getDevice(arr_dev[2], arr_dev[0].toUpperCase()).then((_devInfo) => {
                devInfo = _devInfo;
                return api.rest.getDeviceSignalStrength(arr_dev[2], arr_dev[0].toUpperCase());
            }).then((signal) => {
                properties.phyId = devInfo.eui;
                properties.state = (devInfo.online && devInfo.discovered) ? "ready" : "unreachable";
                var metadata = devInfo.metadata ? JSON.parse(devInfo.metadata) : {};
                properties.dataGroups = metadata.dataGroups ? metadata.dataGroups : [];
                name = deviceData.name ? deviceData.name : devInfo.name;
                if (signal) {
                    properties.signal = getSignalQuality(signal.value);
                    properties.signal = (properties.signal != ' ') ? properties.signal + ': ' + signal.value + 'dbm' : properties.signal;
                }

                type = getDeviceType(properties.dataGroups, devInfo.defaultName);
                switch (type) {
                    case 'door-lock':
                        actions.push("Lock");
                        actions.push("Unlock");
                        break;
                    case 'switch':
                    case 'light':
                        actions.push("On");
                        actions.push("Off");
                        break;
                }

                if ((!type || type === 'sensor') && devInfo.defaultName === "Unknown device") {
                    type = 'unknown';
                }

                promises = [];
                if (!['unknown', 'io-controller'].includes(type) && DEVICE_TYPE_TO_STATUS_DATAPOINT_MAP[type] !== undefined) {
                    datapoints = JSON.parse(JSON.stringify(DEVICE_TYPE_TO_STATUS_DATAPOINT_MAP[type]));
                    promises.push(api.rest.getDeviceDataPoint(arr_dev[2], datapoints[0].ldev, datapoints[0].dpkey, arr_dev[0].toUpperCase()));
                }

                return q.all(promises);
            }).then((_status) => {
                promises = [];
                //log.info("STATUS: " + JSON.stringify(_status));
                if (_status !== undefined && _status[0] !== undefined && _status[0].value !== undefined) {
                    properties.status = getStatusValue(type, _status[0].value);
                } else if (datapoints !== undefined && datapoints.length > 1) {
                    promises.push(api.rest.getDeviceDataPoint(arr_dev[2], datapoints[1].ldev, datapoints[1].dpkey, arr_dev[0].toUpperCase()));
                }
                return q.all(promises);
            }).then((_status2) => {
                //log.info("STATUS2: " + JSON.stringify(_status2));
                if (_status2 !== undefined && _status2[0] !== undefined && _status2[0].value !== undefined) {
                    properties.status = getStatusValue(type, _status2[0].value);
                }
                self._deviceIdToInfoMap.set(serverName + '-' + path, { uuid: deviceId, type: type });
                var res = undefined;
                if (type !== 'io-controller') {
                    if (properties.status === undefined && type === 'switch') {
                        properties.status = "Off";
                    } if (properties.status === undefined && type !== undefined && type != 'unknown') {
                        // let's schedule a timeout to try to discover the status in 30 seconds
                        setTimeout((_emitter, _device, _api) => {
                            _getDeviceStatus(_device, _api, _emitter)
                        }, 30000, self, { state: properties.state, uuid: deviceId, type: type, details: { path: properties.path }, gateway_uuid: serverName }, api);
                    }
                    res = new DevelcoDevice(type, name, deviceId, properties, actions);
                    self._devices.set(serverName + '-' + deviceId, { uuid: deviceId, status: properties.status });
                } else {
                    res = { properties: { phyId: properties.phyId }, devices: [] }
                    var i = 0;
                    for (i = 0; i < 8; i++) {
                        var index = i + 1;
                        var props = JSON.parse(JSON.stringify(properties));
                        props.phyId = properties.phyId + '-io' + index;
                        props.status = 'Locked';
                        res.devices.push(new DevelcoDevice('door-lock', 'door' + index, deviceId + '-io' + index, props, ["Lock", "Unlock"]));

                        self._devices.set(serverName + '-' + deviceId + '-io' + index, { uuid: deviceId + '-io' + index, status: props.status });
                    }

                    i = 0;
                    for (i = 0; i < 4; i++) {
                        var index = i + 1;
                        var props = JSON.parse(JSON.stringify(properties));
                        props.phyId = properties.phyId + '-bin' + index;
                        res.devices.push(new DevelcoDevice('contact', 'contact' + index, deviceId + '-bin' + index, props, []));

                        self._devices.set(serverName + '-' + deviceId + '-bin' + index, { uuid: deviceId + '-bin' + index, status: props.status });
                    }
                }
                resolve(res);
            }).catch((err) => {
                reject(err);
            })
        }
    });
}

function createGateway(self, location, name, serial, ip, rest, state) {
    return new Promise((resolve, reject) => {
        // create the ws connection
        var wsApi = new WSClient('ws://' + ip + '/' + self._config.base_url + '/ws');
        var id = 'devel-' + serial;
        var data = undefined;
        wsApi.connect(null, '', 20000, null, self._eventHandler.bind(self), self.errorHandler.bind(self), null, id);
        var properties = { remote_ip: ip, phyId: serial, provider: "develco", firmware: { upgrade: {} } }
        data = { uuid: id, name: name, state: state, provider: 'develco', location_uuid: location, actions: '[]', details: JSON.stringify(properties) };
        var cont = { rest: rest, ws: wsApi, state: state, ip: ip, uuid: id, details: properties };
        cont.timer = setTimeout(self._processTamper.bind(self), 60000, id, self);
        self._apis.set(id, cont);
        self._processTamperTimerCount.set(id, 0);
        if (ip && ip != 'unknown' && net.isIP(ip) !== 0) {
            self._gatewayIpToUuidMap.set(ip, id);
        }
        resolve(data);
    });
}

DevelcoController.prototype.addGatewayImpl = function (location, gwIP, gwName, serial, duration) {
    return new Promise((resolve, reject) => {
        var self = this;
        var gwData = undefined;
        var api = self._apis.get('devel-' + serial);
        var rest = undefined;
        var gwInfo = undefined;
        if (api) {
            reject("Gateway with serial " + serial + " already exists");
        } else {

            rest = new RestClient('http://' + gwIP + '/' + self._config.base_url);
            var requestConfig = {
                timeout: 1000, //request timeout in milliseconds
                noDelay: true, //disable the Nagle algorithm
            };

            rest.getGateway(requestConfig, null).then((gw) => {
                gwInfo = gw;
                createGateway(self, location, gwName, gw.productionParams['production.gateway.eui'], gwIP, rest, 'ready').then((data) => {
                    gwData = data;
                    self._offlineDevices.set(data.uuid, []);
                    var context = self._apis.get(data.uuid);
                    return self._initTemplates([context]);
                }).then(() => {
                    resolve(gwData);
                }).catch((err) => {
                    log.error(err);
                    reject(err);
                })
            }).catch((err) => {
                log.warn(err);
                createGateway(self, location, gwName, serial, gwIP, rest, 'adding').then((data) => {
                    self._offlineDevices.set(data.uuid, []);
                    resolve(data);
                }).catch((err) => {
                    log.error(err);
                    reject(err);
                });
            })
        }
    });
}

DevelcoController.prototype.addGateway = function (location, identifier, gwName, duration) {
    return new Promise((resolve, reject) => {
        var self = this;
        // identifier is in the format:
        // <gw_ip>:<gw_serial> or <gw_serial> or <gw_ip>
        var arr_identifier = identifier.toString().split(':');
        if (net.isIP(arr_identifier[0]) === 0) {
            // identifier is a serial number we have to get its ip address 
            // from the registry service
            if (!self._backend) {
                var msg = "Ip address discovery not supported when backend server is not initialized."
                log.error(msg);
                reject(msg);
                return;
            }

            if (self._apis && self._apis.get('devel-' + arr_identifier[0])) {
                var msg = "Gateway with uuid: devel-" + arr_identifier[0] + " already added to this system"
                log.error(msg);
                reject(msg);
                return;
            }

            self._backend.addGateway(arr_identifier[0]).then((host) => {
                return self.addGatewayImpl(location, host, gwName, arr_identifier[0], duration)
            }).then((data) => {
                resolve(data);
            }).catch((err) => {
                reject(err);
            });
        } else {
            // identifier contains the ip address let's just proceed..
            self.addGatewayImpl(location, arr_identifier[0], gwName, arr_identifier[1], duration).then((data) => {
                resolve(data);
            }).catch((err) => {
                reject(err);
            });
        }
    });
}

DevelcoController.prototype.removeGateway = function (gateway) {
    return new Promise((resolve, reject) => {
        var self = this;
        var uuid = gateway.get("uuid");
        var details = JSON.parse(gateway.get("details"))
        var api = self._apis.get(uuid);
        if (api) {
            if (api.timer) {
                clearTimeout(api.timer);
                api.timer = null;
            }
            api.ws.disconnect();
            self._apis.delete(uuid);
            self._gatewayIpToUuidMap.delete(details.remote_ip);
        }
        if (self._backend) {
            self._backend.removeGateway(details.phyId).then(() => {
                resolve(gateway);
            }).catch((err) => {
                resolve(gateway);
                log.warn(err);
            });
        } else {
            resolve(gateway);
        }

    });
}

DevelcoController.prototype.checkGatewayIP = function (gateway_uuid) {
    return new Promise((resolve, reject) => {
        var self = this;
        if (!self._backend) {
            resolve(null);
            return;
        }

        var controller = self._apis.get(gateway_uuid);

        if (!controller) {
            resolve(null);
            return;
        }

        var arr = gateway_uuid.split('devel-');
        if (!arr[1]) {
            resolve(null);
            return;
        }
        var serial = arr[1];

        self._backend.getGatewayIP(serial).then((ip) => {

            if (ip && net.isIP(ip) !== 0 && controller.ip != ip) {
                // ip has changed, we need to update ourselves
                if (controller.ip && controller.ip != 'unknown') {
                    self._gatewayIpToUuidMap.delete(controller.ip);
                }

                controller.rest = null;
                if (controller.ws) {
                    controller.ws.disconnect()
                    controller.ws = null;
                }

                controller.rest = new RestClient('http://' + ip + '/' + self._config.base_url);
                var wsApi = new WSClient('ws://' + ip + '/' + self._config.base_url + '/ws');
                wsApi.connect(null, '', 20000, null, self._eventHandler.bind(self), self.errorHandler.bind(self), null, gateway_uuid);
                controller.ws = wsApi;
                controller.ip = ip;
                self._apis.set(gateway_uuid, controller);
                self._gatewayIpToUuidMap.set(ip, gateway_uuid);

                // emit an event to have the gateway ip updated
                var event = { type: 'gateway-details', id: gateway_uuid, data: { remote_ip: ip } };
                self.emit("iot::develco::state::event", event);
            }
            resolve(null);

        }).catch((err) => {
            log.warn(err);
            resolve(null);
        })
    })
}

DevelcoController.prototype.autoAddDevices = function (gateway, duration = "120", enable = true) {
    return new Promise((resolve, reject) => {
        var self = this;
        var uuid = gateway.get("uuid");
        var api = self._apis.get(uuid);
        if (api) {
            var tmout = 180000
            try {
                tmout = (parseInt(duration) + 60) * 1000
            } catch (e) {
                tmout = 180000
            }
            var timer = self._devicesPendingTimers.get(uuid + ":gateway:discovery");
            if (timer) {
                clearTimeout(timer);
                self._devicesPendingTimers.delete(uuid + ":gateway:discovery");
                timer = null;
            }
            api.rest.autodiscoverDevices("ZB", duration, enable).then(() => {
                if (enable) {
                    log.info("Gateway " + gateway.get("name") + " is in discovery mode");
                    api.state = "discovering";
                    updateGatewayState(self, uuid, "discovering");
                    self._apis.set(uuid, api);
                    timer = setTimeout((self, uuid) => {
                        log.info("Gateway " + uuid + " disabling discovery mode");
                        self._devicesPendingTimers.delete(uuid + ":gateway:discovery");
                        var controller = self._apis.get(uuid);
                        if (controller.state === "discovering") {
                            controller.state = "ready";
                            self._apis.set(uuid, controller);
                            updateGatewayState(self, uuid, "ready");
                        }
                        controller.rest.autodiscoverDevices("ZB", duration, false);
                        let toDelete = []
                        for (var [pth, inf] of self._devicesPendingAdd) {
                            if (pth && pth.startsWith(uuid + '-'))
                                toDelete.push(pth)
                        }
                        toDelete.forEach((pth) => {
                            self._devicesPendingAdd.delete(pth)
                        })
                    }, tmout, self, uuid);
                    self._devicesPendingTimers.set(uuid + ":gateway:discovery", timer);

                } else {
                    log.info("Gateway " + uuid + " disabling discovery mode");
                    var controller = self._apis.get(uuid);
                    if (controller.state === "discovering") {
                        controller.state = "ready";
                        self._apis.set(uuid, controller);
                        let toDelete = []
                        for (var [pth, inf] of self._devicesPendingAdd) {
                            if (pth && pth.startsWith(uuid + '-'))
                                toDelete.push(pth)
                        }
                        toDelete.forEach((pth) => {
                            self._devicesPendingAdd.delete(pth)
                        })
                        updateGatewayState(self, uuid, "ready");
                    }
                }
            }).catch((error) => {
                log.warn(error);
            });
        }
        resolve(gateway);
    });
}

DevelcoController.prototype.updateGateway = function (gateway) {
    return new Promise((resolve, reject) => {
        let api = this._apis.get(gateway.get("uuid")),
            new_details = typeof gateway.get("details") == "string" ? JSON.parse(gateway.get("details")) : gateway.get("details"),
            { details } = api ? api : {};
        if (details) {
            details = {
                ...details,
                ...new_details,
                firmware: {
                    ...details.firmware,
                    ...new_details.firmware,
                    upgrade: {
                        ...details.firmware.upgrade,
                        ...new_details.firmware.upgrade
                    }
                }
            }
            api.details = details;
            this._apis.set(gateway.get("uuid"), api);
        }
        resolve(gateway);
    });
}

DevelcoController.prototype.updateDevice = function (device) {
    return new Promise((resolve, reject) => {
        resolve(device);
    });
}



DevelcoController.prototype.addDevice = function (devInfo) {
    return new Promise((resolve, reject) => {
        var self = this;
        var serverName = devInfo.gateway_uuid
        var api = self._apis.get(serverName);
        var protocol = (devInfo.physical_type == 'zigbee') ? 'ZB' : 'BLE';
        if (api) {
            var res = undefined;
            if (devInfo.physical_id && devInfo.physical_id.trim()) {
                // we're adding a single device
                var params = { eui: devInfo.physical_id };
                res = api.rest.addDevice(protocol, params);
            } else {
                log.info("Gateway " + devInfo.gateway_uuid + " enabling discovery mode");
                api.state = "discovering";

                devInfo.timeout = devInfo.timeout ? devInfo.timeout : 600;

                var tmout = 180000
                try {
                    tmout = (parseInt(devInfo.timeout) + 60) * 1000
                } catch (e) {
                    tmout = 180000
                }

                if (tmout < 180000) {
                    // minimum allowed timeout is 180 secconds
                    tmout = 180000
                    devInfo.timeout = 180
                }

                res = api.rest.autodiscoverDevices("ZB", devInfo.timeout, true);
                var timer = self._devicesPendingTimers.get(serverName + ":gateway:discovery");
                if (timer) {
                    clearTimeout(timer);
                    self._devicesPendingTimers.delete(serverName + ":gateway:discovery");
                    timer = null;
                }
                timer = setTimeout((self, serverName) => {
                    log.info("Gateway " + serverName + " disabling discovery mode");
                    var controller = self._apis.get(serverName);
                    self._devicesPendingTimers.delete(serverName + ":gateway:discovery");
                    if (controller.state === "discovering") {
                        controller.state = "ready";
                        self._apis.set(serverName, controller);
                        updateGatewayState(self, serverName, "ready");
                    }

                    controller.rest.autodiscoverDevices("ZB", devInfo.timeout, false);
                    let toDelete = []
                    for (var [pth, inf] of self._devicesPendingAdd) {
                        if (pth && pth.startsWith(serverName + '-'))
                            toDelete.push(pth)
                    }
                    toDelete.forEach((pth) => {
                        self._devicesPendingAdd.delete(pth)
                    })
                }, tmout, self, serverName);
                self._devicesPendingTimers.set(serverName + ":gateway:discovery", timer);
            }
            res.then(() => {
                self._apis.set(serverName, api);
                resolve();
            }).catch((error) => {
                log.warn(error);
                resolve();
            });
        }
    })
}


DevelcoController.prototype.removeDevice = function (device) {

    return new Promise((resolve, reject) => {
        var self = this;
        var serverName = device.get("gateway_uuid");
        var details = JSON.parse(device.get("details"));
        var devId = device.get("uuid")
        var api = self._apis.get(serverName);
        var offlineDevices = self._offlineDevices.get(serverName);
        var controllerId = undefined;
        var unknownID = self._unknownDevices.findIndex(x => x == serverName + '-' + devId);
        if (unknownID > -1) {
            self._unknownDevices.splice(unknownID, 1);
            self._deviceIdToInfoMap.delete(serverName + '-' + details.path);
            var offlineIndex = offlineDevices.findIndex(x => x.uuid === devId);
            if (offlineIndex > -1) {
                offlineDevices.splice(offlineIndex, 1);
                self._offlineDevices.set(serverName, offlineDevices);
            }
        } else if (api) {
            var arr_dev = details.path.toString().split('/');

            if (devId.includes("-io") || devId.includes("-bin")) {
                let arr = devId.includes("-io") ? devId.split('-io') : devId.split('-bin');
                controllerId = arr[0];
                Device.where('uuid', 'LIKE', '%' + controllerId + '%').count().then((count) => {
                    if (count <= 1) {
                        api.rest.removeDevice(arr_dev[2], arr_dev[0].toUpperCase()).then(() => {
                            self._deviceIdToInfoMap.delete(serverName + '-' + details.path);
                            var offlineIndex = offlineDevices.findIndex(x => x.uuid === controllerId);
                            if (offlineIndex > -1) {
                                offlineDevices.splice(offlineIndex, 1);
                                self._offlineDevices.set(serverName, offlineDevices);
                            }
                        }).catch((error) => {
                            log.warn(error);
                        });
                    }
                }).catch((error) => {
                    log.warn(error);
                });
            } else {
                api.rest.removeDevice(arr_dev[2], arr_dev[0].toUpperCase()).then(() => {
                    self._deviceIdToInfoMap.delete(serverName + '-' + details.path);
                    var offlineIndex = offlineDevices.findIndex(x => x.uuid === devId);
                    if (offlineIndex > -1) {
                        offlineDevices.splice(offlineIndex, 1);
                        self._offlineDevices.set(serverName, offlineDevices);
                    }
                }).catch((error) => {
                    log.warn(error);
                });
            }
        }
        resolve(device);
    });
}

DevelcoController.prototype.pairDevice = function (device) {
    return new Promise((resolve, reject) => {
        var self = this;
        var serverName = device.get("gateway_uuid");
        var details = JSON.parse(device.get("details"));
        var devId = device.get("uuid")
        var api = self._apis.get(serverName);
        var eui = details.phyId;

        if (devId.includes('-io')) {
            let arr = details.phyId.split('-io');
            eui = arr[0];
        } else if (devId.includes('-bin')) {
            let arr = details.phyId.split('-bin');
            eui = arr[0];
        }

        if (api) {
            var arr_dev = details.path.toString().split('/');
            var params = { discovered: false, id: arr_dev[2], eui: eui };
            api.rest.updateDevice(arr_dev[2], arr_dev[0].toUpperCase(), params).then(() => {
                resolve(device);
            }).catch((error) => {
                log.warn(error);
                reject(error);
            });
        } else {
            reject('Could not find api for gateway ' + serverName);
        }
    })
}


DevelcoController.prototype.doAction = function (action, device, params) {

    return new Promise((resolve, reject) => {
        log.debug('[Develco action ]: ' + action);
        var value = undefined;
        var self = this;
        var devId = device.get("uuid")
        var server = device.get("gateway_uuid");
        var details = JSON.parse(device.get("details"));
        var api = self._apis.get(server);
        var arr_dev = details.path.toString().split('/');
        var type = device.get("type");


        var dDev = self._devices.get(server + '-' + devId);
        var currentStatus = undefined;
        if (dDev) {
            currentStatus = dDev.status;
        } else {
            log.warn('[Develco action - ' + action + ']: Failed to get develco device entry, using received database device entry.');
            currentStatus = device.get("status");
        }

        var ldev = undefined;
        var dpkey = undefined;
        var data = undefined;
        var timer = undefined;
        var is_io = false;

        switch (type) {
            case 'door-lock':
                if (devId.includes('-io')) {
                    var arr = devId.split('-io');
                    ldev = 'door' + arr[1];
                    dpkey = 'state';
                    is_io = true;
                } else {
                    ldev = 'lock';
                    dpkey = 'status';
                }
                break;
            case 'switch':
                ldev = 'smartplug';
                dpkey = 'onoff';
                break;
            case 'light':
                ldev = 'light';
                dpkey = 'onoff';
                break;
        }

        switch (action) {
            case 'Lock':
                data = 'Locking';
                value = is_io ? false : true;
                break
            case 'On':
                data = 'Switching On';
                value = true;
                break;
            case 'Unlock':
                data = 'Unlocking';
                value = is_io ? true : false;
                break;
            case 'Off':
                data = 'Switching Off';
                value = false;
                break;
        }
        if (value !== undefined && ldev && dpkey) {
            timer = self._devicesPendingTimers.get(devId + ':action:' + dpkey);

            if ((['state', 'status'].includes(dpkey) && [action + 'ed', action + 'ing'].includes(currentStatus)) ||
                (dpkey == 'onoff' && [action, 'Switching ' + action].includes(currentStatus))) {
                log.debug('[Develco action ]: Already ' + currentStatus);
                //_processDeviceStatus(self, device, server, currentStatus, false);
                // schedule a timeout in 10 seconds to refresh the status in case we got out of sync
                setTimeout((_emitter, _device, _api) => {
                    _getDeviceStatus(_device, _api, _emitter)
                }, 10000, self, device.toJSON(), api);
                resolve(true);
            } else if (is_io && ((action == 'Lock' && currentStatus == 'Unlocking') || (action == 'Unlock' && currentStatus == 'Locking'))) {
                log.debug('[Develco action ]: Received ' + action + ' request while ' + currentStatus + ' Dropping command');

                // schedule a timeout in 30 seconds to refresh the status in case we got out of sync
                setTimeout((_emitter, _device, _api) => {
                    _getDeviceStatus(_device, _api, _emitter)
                }, 30000, self, device.toJSON(), api);

                resolve(true);
            } else if (timer && !is_io) {
                log.debug('[Develco action ]: Processing ' + action);
                resolve(true);
            } else {
                log.debug('[Develco action ]: Running ' + action);
                if (timer) {
                    clearTimeout(timer);
                    self._devicesPendingTimers.delete(devId + ':action:' + dpkey);
                    timer = null;
                }

                timer = self._devicesPendingTimers.get(devId + ':action:' + dpkey + ':io');
                if (timer) {
                    clearTimeout(timer);
                    self._devicesPendingTimers.delete(devId + ':action:' + dpkey + ':io');
                    timer = null;
                }

                var parms = { value: value };
                var tmout = (is_io && action == "Unlock") ? 7000 : 20000;

                // schedule a timeout in 30 seconds to refresh the status in case we got out of sync
                /*setTimeout((_emitter, _device, _api)=>{
                    _getDeviceStatus(_device, _api, _emitter)
                }, 30000, self, device.toJSON(), api);*/

                timer = setTimeout(_processDeviceStatus, tmout, self, device, server, currentStatus, true);
                self._devicesPendingTimers.set(devId + ':action:' + dpkey, timer);

                _processDeviceStatus(self, device, server, data, false);

                api.rest.updateDeviceDataPoint(arr_dev[2], ldev, dpkey, arr_dev[0].toUpperCase(), parms).then(() => {
                    //_processDeviceStatus(self, device, server, data, false);

                    //timer = setTimeout(_processDeviceStatus, tmout, self, device, server, currentStatus, true);
                    //self._devicesPendingTimers.set(devId + ':action:' + dpkey, timer);


                    if (is_io && action == "Unlock") {
                        // automatically lock back the electrical io after 10 seconds
                        var ioTimer = setTimeout(_processIOTimer, 10000, self, device, server);
                        self._devicesPendingTimers.set(devId + ':action:' + dpkey + ':io', ioTimer);
                    }
                    resolve(true);
                }).catch((err) => {
                    log.error(err);
                    if (timer) {
                        clearTimeout(timer);
                        self._devicesPendingTimers.delete(devId + ':action:' + dpkey);
                    }
                    _processDeviceStatus(self, device, server, currentStatus, false);

                    setTimeout((_emitter, _device, _api) => {
                        _getDeviceStatus(_device, _api, _emitter)
                    }, 30000, self, device.toJSON(), api);
                    resolve(false);
                });
            }
        } else {
            log.debug('[Develco action ]: Failed processing ' + action + ' action. value: ' + value + '; ldev: ' + ldev + '; dpkey: ' + dpkey);
            resolve(false);
        }
    });
}


/*
TVOC Level in ppm       Level of Concern
Less than 0.0003 ppm    Low
0.0003 to 0.0005 ppm    Acceptable
0.0005 to 0.001 ppm     Marginal
0.001 to 0.003 ppm      High
*/

/* From develco template
{ "rule":"##INVAL## < 65",                          "expression": "Excellent"},
{ "rule":"##INVAL## >= 65  && ##INVAL## < 220",     "expression": "Good"},
{ "rule":"##INVAL## >= 220 && ##INVAL## < 660",     "expression": "Moderate"},
{ "rule":"##INVAL## >= 660 && ##INVAL## < 2200",    "expression": "Poor"},
{ "rule":"##INVAL## >= 2200 && ##INVAL## < 5500",   "expression": "Bad"}
*/

function getAirQuality(level) {
    const levelToQualityMap = { "Excellent": "Very Good", "Good": "Good", "Moderate": "Poor", "Poor": "Very Poor", "Bad": "Bad" };
    if (["Excellent", "Good", "Moderate", "Poor", "Bad"].includes(level)) {
        return levelToQualityMap[level];
    } else {
        log.debug('[Develco]: Unknown air quality level ' + level);
        return levelToQualityMap["Good"];
    }
}

function _processCalibrationTimeout(device, self) {
    var devId = device.uuid
    var server = device.gateway_uuid;
    var type = device.type;
    var timer = self._devicesCalibrationTimers.get(devId);
    if (timer) {
        log.debug('[Develco Calibration ]: Stopping calibration for device ' + device.name);
        clearInterval(timer);
        self._devicesCalibrationTimers.delete(devId);
        var offlineDevs = self._offlineDevices.get(server);
        var found = offlineDevs.find(x => x.uuid === devId);
        var state = found ? 'unreachable' : 'ready';
        updateDeviceStream(self, device.type, device.uuid, device.gateway_uuid, state, 'state', 'iot::develco::state::event');
    }
}

DevelcoController.prototype.setCalibration = function (device, enable) {
    return new Promise((resolve, reject) => {
        var self = this;
        var devId = device.get("uuid");
        var server = device.get("gateway_uuid");
        var type = device.get("type");
        var api = self._apis.get(server);
        var data = undefined;
        _runCalibration(device.toJSON(), api, self).then((resp) => {
            if (!resp) {
                return reject("Failed to Start Calibration");
            } else if (enable) {
                var timer = self._devicesCalibrationTimers.get(devId);
                if (!timer) {
                    log.debug('[Develco Calibration ]: Starting calibration for device ' + device.get('name'));
                    timer = setInterval(_runCalibration, 5000, device.toJSON(), api, self);
                    self._devicesCalibrationTimers.set(devId, timer);
                    // automatically stop calibration after 3 minutes
                    setTimeout(_processCalibrationTimeout, 180000, device.toJSON(), self);
                }
            } else {
                var timer = self._devicesCalibrationTimers.get(devId);
                if (timer) {
                    clearInterval(timer);
                    self._devicesCalibrationTimers.delete(devId);
                }
            }

            if (enable) {
                data = 'calibrating';
            } else {
                var offlineDevs = self._offlineDevices.get(server);
                var found = offlineDevs.find(x => x.uuid === devId);
                data = found ? 'unreachable' : 'ready';
            }
            updateDeviceStream(self, type, devId, server, data, 'state', 'iot::develco::state::event');
            resolve(data);
        }).catch((error) => {
            reject(error);
        });
    });
}

function setPinCodeSupportImpl(api, arr_dev, enable) {
    return new Promise((resolve, reject) => {
        var params = { value: enable };

        var requestConfig = {
            timeout: 10000, //request timeout in milliseconds
            noDelay: true, //disable the Nagle algorithm
        };

        api.rest.updateDeviceDataPoint(arr_dev[2], 'pincodes', 'sendOverAir', arr_dev[0].toUpperCase(), params, true, requestConfig).then((result) => {
            resolve(result)
        }).catch((err) => {
            log.warn(err);
            resolve({ Error: err })
        });
    })
}

DevelcoController.prototype.setPinCodeSupport = function (device, enable, isJson = false) {
    return new Promise((resolve, reject) => {
        var self = this;
        var _device = device;
        if (isJson === false) {
            _device = device.toJSON();
        }

        var devId = _device.uuid;
        var server = _device.gateway_uuid;
        var type = _device.type;
        if (!['door-lock'].includes(type)) {
            log.warn('[Develco setPinCodeSupport]: Pin codes not supported for device type ' + type);
            return resolve(device)
        }
        var api = self._apis.get(server);
        if (!api) {
            log.warn('[Develco setPinCodeSupport]: Communication api not found for gateway uuid ' + server);
            return resolve(device);
        }
        var details = JSON.parse(_device.details);
        var arr_dev = details.path.toString().split('/');
        var params = { value: enable };
        setPinCodeSupportImpl(api, arr_dev, enable).then(() => {
            resolve(device)
        }).catch((err) => {
            log.warn(err);
            resolve(device)
        });
    });
}

function setPinCodeImpl(api, arr_dev, pincodes) {
    return new Promise((resolve, reject) => {
        var q = require('q');
        var chain = q.when();

        var requestConfig = {
            timeout: 10000, //request timeout in milliseconds
            noDelay: true, //disable the Nagle algorithm
        };

        var params = [{ key: 'sendOverAir', data: { value: true } }];
        pincodes.forEach((pincode) => {
            params.push({ key: 'userid', data: { value: parseInt(pincode.user_id) } });
            params.push({ key: 'set', data: { value: pincode.pin.toString() } });
        })

        api.rest.updateDeviceDataPoints(arr_dev[2], 'pincodes', arr_dev[0].toUpperCase(), params, true, requestConfig).then((result) => {
            resolve(result);
        }).catch((err) => {
            var msg = '' + err;
            if (msg.includes('Request timeout')) {
                // let's try one more time if we got a timeout
                api.rest.updateDeviceDataPoints(arr_dev[2], 'pincodes', arr_dev[0].toUpperCase(), params, true, requestConfig).then((result) => {
                    resolve(result)
                }).catch((err) => {
                    reject(err);
                })
            } else {
                reject(err);
            }
        });
    })
}

DevelcoController.prototype.setUserPinCode = function (device, userId, pin, isJson = false) {
    return new Promise((resolve, reject) => {
        var self = this;
        var _device = device;
        if (isJson === false) {
            _device = device.toJSON();
        }

        var devId = _device.uuid;
        var server = _device.gateway_uuid;
        var type = _device.type;
        if (!['door-lock'].includes(type)) {
            log.warn('[Develco setUserPinCode]: Pin codes not supported for device type ' + type);
            return resolve(device)
        }
        var api = self._apis.get(server);
        if (!api) {
            log.warn('[Develco setUserPinCode]: Communication api not found for gateway uuid ' + server);
            return resolve(device);
        }

        log.debug('[Develco setUserPinCode]: Setting pin code ' + pin + ' for profile id ' + userId + ' on device ' + _device.name)

        var details = JSON.parse(_device.details);
        var arr_dev = details.path.toString().split('/');
        setPinCodeImpl(api, arr_dev, [{ user_id: userId, pin: pin }]).then((result) => {
            log.debug("Develco setUserPinCode] set pin code  Result: " + (result ? JSON.stringify(result) : ""))
            return setPinCodeSupportImpl(api, arr_dev, false);
        }).then((result) => {
            log.debug("Develco setUserPinCode] sendOverAir  Result: " + (result ? JSON.stringify(result) : ""))
            resolve(device)
        }).catch((err) => {
            log.warn(err);
            resolve(device)
        });
    });
}


DevelcoController.prototype.setPinCodes = function (device, pincodes, isJson = false) {
    return new Promise((resolve, reject) => {
        var self = this;
        var _device = device;
        if (isJson === false) {
            _device = device.toJSON();
        }

        var devId = _device.uuid;
        var server = _device.gateway_uuid;
        var type = _device.type;
        if (!['door-lock'].includes(type)) {
            log.warn('[Develco setPinCodes]: Pin codes not supported for device type ' + type);
            return resolve(device)
        }
        var api = self._apis.get(server);
        if (!api) {
            log.warn('[Develco setPinCodes]: Communication api not found for gateway uuid ' + server);
            return resolve(device);
        }
        var details = JSON.parse(_device.details);
        var arr_dev = details.path.toString().split('/');

        log.debug('[Develco setPinCodes]: Setting pin codes ' + JSON.stringify(pincodes) + ' on device ' + JSON.stringify(arr_dev))

        setPinCodeImpl(api, arr_dev, pincodes).then((result) => {
            log.debug("Develco setPinCodes] set pin code  Result: " + (result ? JSON.stringify(result) : ""))
            return setPinCodeSupportImpl(api, arr_dev, false);
        }).then((result) => {
            log.debug("Develco setPinCodes] sendOverAir Result: " + (result ? JSON.stringify(result) : ""))
            resolve(device)
        }).catch((err) => {
            log.warn(err);
            resolve(device)
        });

    });
}



DevelcoController.prototype.clearUserPinCode = function (device, userId, userPin, isJson = false) {
    return new Promise((resolve, reject) => {
        var self = this;

        var _device = device;
        if (isJson === false) {
            _device = device.toJSON();
        }

        var devId = _device.uuid;
        var server = _device.gateway_uuid;
        var type = _device.type;
        if (!['door-lock'].includes(type)) {
            log.warn('[Develco clearUserPinCode]: Pin codes not supported for device type ' + type);
            return resolve(device);
        }
        var api = self._apis.get(server);
        if (!api) {
            log.warn('[Develco clearUserPinCode]: Communication api not found for gateway uuid ' + server);
            return resolve(device)
        }
        var details = JSON.parse(_device.details);
        var arr_dev = details.path.toString().split('/');

        var params = [{ key: 'sendOverAir', data: { value: true } }];
        if (userId !== null) {
            params.push({ key: 'userid', data: { value: parseInt(userId) } });
            params.push({ key: 'clear', data: { value: parseInt(userId) } });
            log.debug('[Develco clearUserPinCode]: Clearing pin codes for profile id ' + userId + ' on device ' + _device.name)
        } else {
            params.push({ key: 'clearall', data: { value: 1 } });
            log.debug('[Develco clearUserPinCode]: Clearing pin codes for all profiles on device ' + _device.name)
        }

        var requestConfig = {
            timeout: 10000, //request timeout in milliseconds
            noDelay: true, //disable the Nagle algorithm
        };


        api.rest.updateDeviceDataPoints(arr_dev[2], 'pincodes', arr_dev[0].toUpperCase(), params, true, requestConfig).then((result) => {
            log.debug("Develco clearUserPinCode] Clear Result: " + (result ? JSON.stringify(result) : ""))
            return setPinCodeSupportImpl(api, arr_dev, false);
        }, (error) => {
            var msg = '' + error
            log.warn(msg);
            if (msg.includes('Request timeout')) {
                // let's try one more time if it timed out
                api.rest.updateDeviceDataPoints(arr_dev[2], 'pincodes', arr_dev[0].toUpperCase(), params, true, requestConfig).then((result) => {
                    setPinCodeSupportImpl(api, arr_dev, false).then(() => {
                        resolve(device)
                    }, (error) => {
                        log.warn(error);
                        resolve(device)
                    })
                }).catch((err) => {
                    log.warn(err);
                    resolve(device)
                });
            } else {
                resolve(device)
            }
        }).then((result) => {
            log.debug("Develco clearUserPinCode] sendOverAir Result: " + (result ? JSON.stringify(result) : ""))
            resolve(device)
        }).catch((err) => {
            log.warn(err);
            resolve(device)
        });
    });
}

DevelcoController.prototype.setDebugMode = function (gateway, mode) {
    return new Promise((resolve, reject) => {
        var self = this;
        var api = self._apis.get(gateway.get("uuid"));
        if (!api) {
            return reject('Communication api not found for gateway uuid ' + server)
        }

        let params = { enableApiLog: false, logLevel: "INFO", tgLogLines: 0 };

        if (mode == "on") {
            params.enableApiLog = true;
            params.logLevel = "FINE";
            params.tgLogLines = 10000;
        }

        var requestConfig = {
            timeout: 5000, //request timeout in milliseconds
            noDelay: true, //disable the Nagle algorithm
        };

        api.rest.setDebugConfig(params, requestConfig).then(() => {
            resolve();
        }).catch((err) => {
            reject(err)
        });
    });
}

DevelcoController.prototype.getDebugMode = function (gateway) {
    return new Promise((resolve, reject) => {
        var self = this;
        var api = self._apis.get(gateway.get("uuid"));
        if (!api) {
            return reject('Communication api not found for gateway uuid ' + server)
        }

        var requestConfig = {
            timeout: 5000, //request timeout in milliseconds
            noDelay: true, //disable the Nagle algorithm
        };

        api.rest.getDebugConfig(requestConfig).then((config) => {
            resolve(config);
        }).catch((err) => {
            reject(err)
        });
    });
}

DevelcoController.prototype.getDebugLogs = function (gateway) {
    return new Promise((resolve, reject) => {
        var self = this;
        var api = self._apis.get(gateway.get("uuid"));
        if (!api) {
            return reject('Communication api not found for gateway uuid ' + server)
        }

        var requestConfig = {
            timeout: 10000, //request timeout in milliseconds
            noDelay: true, //disable the Nagle algorithm
        };


        api.rest.getDebugLogs(requestConfig).then((logs) => {
            resolve(logs);
        }).catch((err) => {
            reject(err)
        });
    });
}


DevelcoController.prototype.handleCloudReg = function () {
    return new Promise((resolve, reject) => {
        var self = this;
        if (!self._backend) {
            return resolve();
        }
        setTimeout((_self) => {
            let promises = [];
            for (let [uuid, api] of _self._apis) {
                promises.push(_updateDetailsWithFirmwareInformation(api, uuid, _self));
            }
            Promise.all(promises).then().catch(err => {
                log.error("develco-controller:handleCloudReg:error:>", err);
            });
        },
            30000, self);
        resolve();
    })
}

DevelcoController.prototype.updateFirmwareInfo = function (uuid) {
    return new Promise((resolve, reject) => {
        _updateDetailsWithFirmwareInformation(this._apis.get(uuid), uuid, this)
            .then(details => {
                resolve(details);
            })
            .catch(err => {
                log.error("develco-controller:DevelcoController:updateFirmwareInfo:> ", err);
                resolve()
            })
    })
}

function _updateDetailsWithFirmwareInformation(api, uuid, emitter) {
    return new Promise((resolve, reject) => {
        emitter.getFirmwareVersionFromGateway(api).then((details) => {
            if (details.firmware && details.firmware.version) {
                return emitter._backend.getProviderAvailableFwInfo('develco', details.firmware.version)
                    .then((available_versions) => {
                        let info_copy = checkVersion(details.firmware.version, available_versions[0].version) < 0 ? { ...available_versions[0] } : details.firmware.upgrade;
                        details = {
                            ...details,
                            firmware: {
                                ...details.firmware,
                                upgrade: {
                                    ...details.firmware.upgrade,
                                    ...info_copy
                                }
                            }
                        };
                        return details;
                    }).catch(err => {
                        log.error("develco-controller:_updateDetailsWithFirmwareInformation:> ", err);
                    });
            }
            else {
                log.error("develco-controller:_updateDetailsWithFirmwareInformation:ERROR:> No firmware version available in the gateway response");
                return undefined;
            }
        }).then(details => {
            if (details)
                return _checkFirmwareStatus(uuid, details, emitter);
            return undefined;
        }).then(details => {
            resolve(details);
        }).catch(err => {
            log.error("develco-controller:_updateDetailsWithFirmwareInformation:ERROR> ", err);
            resolve();
        })
    });
}



module.exports = DevelcoController
