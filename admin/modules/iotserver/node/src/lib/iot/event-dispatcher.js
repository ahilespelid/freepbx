const Location = require('../../models/Location');
const Zone = require('../../models/Zone');
const Gateway = require('../../models/Gateway');
const Scene = require('../../models/Scene');
const Group = require('../../models/Group');
const GroupApi = require('../../api/iot/group-api.js');
const GroupPermission = require('../../models/GroupPermission.js');
const PropertyApi = require('../../api/iot/user-property-api.js');
const Device = require('../../models/Device');
const sleep = require('sleep');

const log = require('../log');
const util = require("util");
const { EventEmitter } = require('events');
const config = require('config')
const uuid = require('uuid');

const NotificationManager = require('./notifications/notification-manager.js')

var EventDispatcher = function EventDispatcher() {
    this.listeners = {};
    this.gateways = [];
    this.zones = [];
    this.locations = [];
    this.scenes = [];
    this.groups = [];
    this.devices = [];
    this.pending_devices = [];
    this._iot_man = undefined;
    this._backend_api = undefined;
    this._backend_server = undefined;
    this._notifier = undefined;
    this._timers = new Map();
}

util.inherits(EventDispatcher, EventEmitter);

/*************************************************************************
SINGLETON CLASS DEFINITION
************************************************************************ */
EventDispatcher.instance = null;

/**
 * Singleton getInstance definition
 * @return singleton class
 */
EventDispatcher.getInstance = function () {
    if (this.instance === null) {
        this.instance = new EventDispatcher();
    }
    return this.instance;
}

EventDispatcher.prototype.init = function (iotManager, iotBackendServer, zuluServer, watchdogEventEmitter) {
    return new Promise((resolve, reject) => {
        var self = this;
        self._loadFromDB().then(() => {
            self._init(iotManager, iotBackendServer, zuluServer, watchdogEventEmitter);
            resolve();
        });
    });
};

EventDispatcher.prototype._init = function (iotManager, iotBackendServer, zuluServer, watchdogEventEmitter) {
    if (zuluServer) {
        zuluServer.on("ws::connected", this.registerMobileDevice.bind(this));
        zuluServer.on("ws::disconnected", this.unRegisterMobileDevice.bind(this));
        zuluServer.on('ws::message::push::deviceToken', this.setMobileDeviceToken.bind(this));
        zuluServer.on('ws::message::pull::ping', this.pingPong.bind(this));
        this.on("ws::dispatch::event", zuluServer.dispatchEvent.bind(zuluServer));
    }

    if (iotManager) {
        this._iot_man = iotManager;
        iotManager.registerEventsListener(this.EventHandler.bind(this));

        var provider = iotManager.getProvider('cyberdata');

        if (provider) {
            // register the image capture workers for cyberdata intercom devices
            cyberdataIntercoms = this.devices.filter(x => x.type === 'intercom' && x.details && x.details.provider === 'cyberdata');
            cyberdataIntercoms.forEach((device) => {
                provider.api.addWorker(device);
            });
        }
    }

    if (watchdogEventEmitter) {
        watchdogEventEmitter.on("watchod::event", this.updateIoTList.bind(this));
        watchdogEventEmitter.on("watchod::job::update", this.processJobUpdate.bind(this));
        watchdogEventEmitter.on("watchod::access-profile::command", this.proxyAccessProfileCommand.bind(this));
        watchdogEventEmitter.on("watchod::automated-action::command", this.proxyAutomatedActionCommand.bind(this));
    }

    if (iotBackendServer) {
        this._backend_server = iotBackendServer;
        this._backend_api = this._backend_server.api;
    }

    this._notifier = new NotificationManager(this);
};
EventDispatcher.prototype.getIoTBackendServer = function () {
    return this._backend_server;
}
EventDispatcher.prototype.getIoTManager = function () {
    return this._iot_man;
}
EventDispatcher.prototype.getNotifier = function () {
    return this._notifier;
}

EventDispatcher.prototype.proxyAccessProfileCommand = function (command) {
    this.emit('access-profile-command', command);
}
EventDispatcher.prototype.proxyAutomatedActionCommand = function (command) {
    this.emit('automated-action-command', command);
}



EventDispatcher.prototype.ErrorHandler = function (reason) {
    log.error('[EventDispatcher ERROR] ' + reason);
};

function getGroupState(self, group_uuid, device_uuid) {
    if (!self.devices || self.devices.length == 0) {
        return 'OK';
    }
    var group_devices = self.devices.filter(x => x.group_uuid === group_uuid && x.uuid !== device_uuid);
    group_devices = group_devices ? group_devices : [];
    group_devices.forEach((group_device) => {
        if (group_device.state !== 'ready' && group_device.state !== 'calibrating') {
            return "Alarmed";
        } else if (group_device.details && group_device.details.batteryLevel && group_device.details.batteryLevel < 10) {
            return "Alarmed";
        }
    })

    return "OK";
}

EventDispatcher.prototype.EventHandler = function (iotSession, iotEvent, callBackFn = undefined) {
    if (config.log.verboseEvents) {
        log.debug("Received IoT event: " + JSON.stringify(iotEvent));
    }

    if (iotEvent.type == 'log') {
        this._dispatch(iotEvent.topic, iotEvent, callBackFn);
    } else if (iotEvent.type == 'device-registration') {
        this._loadFromDB();
    } else if (iotEvent.type == 'remove-device') {
        var index = this.devices.findIndex(x => x.uuid === iotEvent.device.id);
        if (index > -1 && this.devices[index].gateway_uuid === iotEvent.server) {
            var topic = 'devices:' + iotEvent.device.id;
            this._dispatch(topic, { "type": "delete", "data": iotEvent.device.id, "topic": topic }, callBackFn)
            this.devices.splice(index, 1);
        }

    } else if (iotEvent.type === 'gateway-state' && this.gateways) {
        var gateway = this.gateways.find(x => x.uuid === iotEvent.id);
        if (gateway && gateway.state !== iotEvent.data) {

            if (iotEvent.data === 'unreachable' || (iotEvent.data === 'ready' && gateway.details.provider !== 'develco')) {
                // for develco gateway let's not automatically bring the devices online
                var devices = this.devices.filter(x => x.gateway_uuid === iotEvent.id);
                devices.forEach((device) => {
                    if (device.state !== iotEvent.data) {
                        let topic = device.gateway_uuid + '/' + device.type + '/' + device.uuid + '/state';
                        let evt = { type: "event", server: iotEvent.id, topic: topic, data: iotEvent.data, device: { id: device.uuid, type: device.type, stream: 'state' } };
                        this.dispatch(evt, callBackFn);
                    }
                });
            }
            let evt = { type: "event", data: iotEvent.data, gateway: { id: iotEvent.id, stream: 'state' } };
            this.dispatch(evt, callBackFn);
        }
    } else if (iotEvent.type === 'gateway-details' && this.gateways) {
        let evt = { type: "event", data: iotEvent.data, gateway: { id: iotEvent.id, stream: 'details' } };
        this.dispatch(evt, callBackFn);
    } else if (iotEvent.type === "gateway-update" && this.gateways) {
        let gw = this.gateways.find(x => x.uuid == iotEvent.id),
            // Keep the gateway as it is, but only overwrite what it comes 
            // in iotEvent.data
            gateway = {
                ...gw,
                ...iotEvent.data,
                provider: undefined,
                details: {
                    ...gw.details,
                    ...iotEvent.data.details,
                    firmware: {
                        ...gw.details.firmware,
                        ...iotEvent.data.details.firmware,
                        upgrade: {
                            ...gw.details.firmware.upgrade,
                            ...iotEvent.data.details.firmware.upgrade
                        }
                    }
                }
            };
        this.updateIoTList("gateway", gateway, "update", true);
    }
    else if (iotEvent.type === 'event' && this.devices) {
        var device = this.devices.find(x => x.uuid === iotEvent.device.id);
        if (!device && iotEvent.device.stream === "state") {
            // new device coming in, register it
            this.confirmPendingDevice(iotEvent, iotSession);
            //} else if (!device && iotEvent.device.stream === "state" && iotEvent.data === "unreachable") {
            //    this.removePendingDevice(iotEvent.device.id);
            //    var topic = "devices:new-device";
            //    var evt = {type: "event", data: iotEvent.reason, device: {id: iotEvent.device.id, type: "new-device", "state": "fail", topic: topic}};
            //    this.dispatch(evt);
        } else {

            if (["status", "onOff",
                "transition", "motion", "occupancy", "onOff",
                "currentTemperature", "batteryLevel", "batteryVoltage"].includes(iotEvent.device.stream)) {
                var wakeDevice = false;
                if (device && device.state === 'unreachable') {
                    // device flagged as unreachable starting to report, let's flag it a ready..
                    wakeDevice = true;
                } else if (device && device.group_uuid) {
                    var index = this.groups.findIndex(x => x.uuid === device.group_uuid);
                    if (this.groups[index].state === 'Alarmed') {
                        // device reporting from an alarmed group, 
                        // let's see if we should get the group back to non alarmed state
                        this.groups[index].state = getGroupState(this, device.group_uuid, device.uuid);
                        if (this.groups[index].state === 'OK') {
                            // group state changed back to OK, let's dispatch an event
                            wakeDevice = true;
                        }
                    }
                }

                if (wakeDevice === true) {
                    let topic = device.gateway_uuid + '/' + device.type + '/' + device.uuid + '/state';
                    let evt = { type: "event", server: device.gateway_uuid, topic: topic, data: 'ready', device: { id: device.uuid, type: device.type, stream: 'state' } };
                    this.dispatch(evt, callBackFn);
                    sleep.msleep(20) // sleep a little bit to let the state refresh
                }
            }

            this.dispatch(iotEvent, callBackFn);
        }
    } else {
        log.warn("Discarding IoT event: " + JSON.stringify(iotEvent));
    }

};

EventDispatcher.prototype._loadFromDB = function () {
    return new Promise((resolve, reject) => {
        var promises = [];
        var self = this;
        Location.fetchAll({ withRelated: ['permissions', 'zones', 'gateways'] }).then((locations) => {
            self.locations = locations ? locations.toJSON() : [];
            self.locations = self.locations.map(x => {
                if (x.details) {
                    x.details = JSON.parse(x.details);
                } else {
                    x.details = {};
                }
                return x;
            });
            return Zone.fetchAll({ withRelated: ['permissions', 'scenes'] });
        }).then((zones) => {
            self.zones = zones ? zones.toJSON() : [];
            self.zones = self.zones.map(x => {
                if (x.details) {
                    x.details = JSON.parse(x.details);
                } else {
                    x.details = {};
                }
                return x;
            });
            return Scene.fetchAll({ withRelated: ['permissions', 'groups'] });
        }).then((scenes) => {
            self.scenes = scenes ? scenes.toJSON() : [];
            self.scenes = self.scenes.map(x => {
                if (x.details) {
                    x.details = JSON.parse(x.details);
                } else {
                    x.details = {};
                }
                return x;
            });
            return Group.fetchAll({ withRelated: ['permissions', 'devices'] });
        }).then((groups) => {
            self.groups = groups ? groups.toJSON() : [];
            self.groups = self.groups.map(x => {
                if (x.details) {
                    x.details = JSON.parse(x.details);
                } else {
                    x.details = {};
                }
                return x;
            });
            return Gateway.fetchAll({ withRelated: ['devices'] });
        }).then((gateways) => {
            self.gateways = gateways ? gateways.toJSON() : [];
            self.gateways = self.gateways.map(x => {
                if (x.details) {
                    x.details = JSON.parse(x.details);
                } else {
                    x.details = {};
                }
                return x;
            });;
            return Device.fetchAll();
        }).then((devices) => {
            self.devices = devices ? devices.toJSON() : [];
            self.devices = self.devices.map(x => {
                if (x.details) {
                    x.details = JSON.parse(x.details);
                } else {
                    x.details = {};
                }
                return x;
            });
            resolve();
        }).catch((error) => {
            self.ErrorHandler(error);
            reject();
        });
    });
};

EventDispatcher.prototype.addPendingDevice = function (device_data) {
    var dev = this.pending_devices.find(x => x.id === device_data.id);
    if (!dev) {
        this.pending_devices.push(device_data)
    }
};

EventDispatcher.prototype.removePendingDevice = function (id) {
    var index = this.pending_devices.findIndex(x => x.id === id);
    if (index > -1) {
        this.pending_devices.splice(index, 1);
    }
};

EventDispatcher.prototype.updateIoTList = function (object_type, object, update_type, is_json = false) {
    var list = undefined;
    switch (object_type) {
        case 'location':
            list = this.locations;
            break;
        case 'zone':
            list = this.zones;
            break;
        case 'scene':
            list = this.scenes;
            break;
        case 'group':
            list = this.groups;
            break;
        case 'gateway':
            list = this.gateways;
            break;
        case 'device':
            list = this.devices;
            break;
    }

    var obj = null;

    if (is_json) {
        obj = object;
    } else {
        obj = object.toJSON();
    }

    if (obj.details && typeof obj.details === 'string') {
        obj.details = JSON.parse(obj.details)
    } else if (!obj.details) {
        obj.details = {};
    }
    if (list) {
        var operation = update_type;
        switch (update_type) {
            case 'insert':
                var index = list.findIndex(x => x.uuid === obj.uuid);
                if (index > -1) {
                    list[index] = obj;
                    operation = 'update';
                } else {
                    list.push(obj);
                    operation = 'insert';
                }
                break;
            case 'delete':
                var index = list.findIndex(x => x.uuid === obj.uuid);
                if (index > -1) {
                    list.splice(index, 1);
                }
                break;
            case 'update':
                var index = list.findIndex(x => x.uuid === obj.uuid);
                if (index > -1) {
                    list[index] = obj;
                } else {
                    list.push(obj);
                    operation = 'insert';
                }
                break;
        }

        if (operation === 'insert') {
            let stream = "new-" + object_type;
            let topic = object_type + 's:' + stream;
            let evt = { type: "event", data: obj, device: { id: obj.uuid, type: stream, state: obj.state ? obj.state : "ready", topic: topic } };
            this.dispatch(evt);
        } else if (operation === 'delete') {
            let stream = "del-" + object_type;
            let topic = object_type + 's:' + stream;
            let evt = { type: "event", data: obj, device: { id: obj.uuid, type: stream, state: "unknown", topic: topic } };
            this.dispatch(evt);
        } else if (operation === 'update') {
            let stream = "update-" + object_type;
            let topic = object_type + 's:' + stream;
            let evt = { type: "event", data: obj, device: { id: obj.uuid, type: stream, state: obj.state ? obj.state : "ready", topic: topic } };
            this.dispatch(evt);
        }
    }
};


EventDispatcher.prototype.registerMobileDevice = function (session, connectionData) {
    log.debug("Dispatcher: Registering new mobile client session " + session.user.username);
};

EventDispatcher.prototype.unRegisterMobileDevice = function (session) {
    log.debug("Dispatcher: UnRegistering mobile client session " + session.user.username);
    if(session && session.user && session.user.id) PropertyApi.removeFirebaseTokensByUserID(session.user.id);
};

EventDispatcher.prototype.pingPong = function (session, data) {
    session.sendJSON({ status: true, actionid: data.id, reply: 'pong' }, false) // false dont log this
};

EventDispatcher.prototype.setMobileDeviceToken = function (session, data) {
    return new Promise((resolve, reject) => {
        log.info(`Setting mobile device token of ${session.user.default_extension}`, data)
        session.api.setDeviceToken(session.user.default_extension, data)
            .then(res => {
                session.token = data.token;
                session.sendTrue(data.id)
                resolve()
            })
            .catch(err => {
                session.sendError(data.id, `${err}`)
                reject(err)
            });
    });
}

EventDispatcher.prototype.addListener = function (listenerId, listener) {
    this.listeners[listenerId] = listener;
};

EventDispatcher.prototype.removeListener = function (listenerId) {
    delete this.listeners[listenerId];
};

EventDispatcher.prototype._mapInternalEvent = function (event) {
    var events = {};
    var index = undefined;
    var topic = undefined;
    var object_type = undefined;
    switch (event.device.type) {
        case 'zone':
            index = this.zones.findIndex(x => x.uuid === event.device.id);
            log.debug("Zone Event for " + event.device.id + " at index " + index);
            var oldStream = this.zones[index][event.device.stream];
            this.zones[index][event.device.stream] = event.data;
            var location = this.locations.find(x => x.uuid === this.zones[index].location_uuid);
            topic = 'zones:' + event.device.id;
            if (event.device.stream == "status") {
                if (oldStream !== event.data && event.data === "OK") {
                    var notificationData = { name: 'Zone ' + this.zones[index].name + ' Alarm Clear', event_type: 'Zone Alarm', location: location.name };
                    notificationData.notfication_type = 'check';
                    notificationData.event_data = 'SmartOffice Zone Alarm have been cleared';
                    this._sendNotification('zone-alarm', 'zone', this.zones[index].uuid, null, 'closed', notificationData, true, this.zones[index].org_id);
                }
                events[topic] = { "type": "update", "state": this.zones[index].state, "status": this.zones[index].status, "topic": topic };
            } else if (this.zones[index].state === "Unarmed" && this.zones[index].status === "Alarm") {
                // we are unarming an alarmed zone, let's clear the alarm as well
                this.zones[index].status = "OK";
                var notificationData = { name: 'Zone ' + this.zones[index].name + ' Alarm Clear', event_type: 'Zone Alarm', location: location.name };
                notificationData.notfication_type = 'check';
                notificationData.event_data = 'SmartOffice Zone have been unarmed';
                this._sendNotification('zone-alarm', 'zone', this.zones[index].uuid, null, 'closed', notificationData, true, this.zones[index].org_id);
            } else if (event.device.stream == "state" && event.data === "Armed") {
                // we are arming a zone, start the sanity timer
                var key = 'zone:' + this.zones[index].uuid + ':arm:sanity';
                var timer = this._timers.get(key),
                    timerId = undefined,
                    promise = undefined,
                    uuid = this.zones[index].uuid;
                if (timer) {
                    [timerId, promise] = timer;
                    clearTimeout(timerId);
                    if (promise)
                        delete promise
                    this._timers.delete(key);
                }
                events[topic] = [{ "type": "update", "state": 'Arming', "status": this.zones[index].status, "topic": topic }]
                // schedule a 1 minute sanity timer
                events[topic].push(new Promise((resolve, reject) => {
                    timerId = setTimeout((dispatcher, _key) => {
                        let zone = dispatcher.zones.find(z => z.uuid == uuid);
                        if (zone)
                            resolve({ "type": "update", "state": zone.state, "status": zone.status, "topic": topic })
                        else
                            reject({ message: "Zone " + uuid + " not found" })
                        dispatcher._timers.delete(_key);
                    }, 60000, this, key);
                }))
                this._timers.set(key, [timerId, events[topic][1]]);
            }
            if (events[topic] == undefined)
                events[topic] = { "type": "update", "state": this.zones[index].state, "status": this.zones[index].status, "topic": topic };
            break;
        case "new-gateway":
        case "new-device":
        case "new-location":
        case "new-zone":
        case "new-scene":
        case "new-group":
            events[event.device.topic] = { "type": event.device.type, uuid: event.device.id, "data": event.data, "state": event.device.state, "topic": event.device.topic };
            break

        case "update-gateway":
        case "update-location":
        case "update-zone":
        case "update-scene":
        case "update-group":
        case "update-device":
            object_type = event.device.type.substring(7);
            topic = object_type + 's:' + event.device.id;
            events[topic] = { type: "update", data: event.data, "topic": topic };
            break;

        case "del-gateway":
        case "del-location":
        case "del-zone":
        case "del-scene":
        case "del-group":
        case "del-device":
            object_type = event.device.type.substring(4);
            topic = object_type + 's:' + event.device.id;
            events[topic] = { type: "delete", data: event.data, "topic": topic };
            break;
    }
    return events;
};

EventDispatcher.prototype.processJobUpdate = function (msg) {
    this.dispatch(msg);
}
EventDispatcher.prototype._sendNotification = function (type, obj_type, obj_uuid, severity, status, raw_data, sendMail, org_id) {
    return new Promise((resolve, reject) => {
        var self = this;
        if (!self._notifier) {
            resolve();
            return;
        }
        self._notifier.triggerNotification(type, obj_type, obj_uuid, severity, status, raw_data, org_id, sendMail).then(() => {
            resolve();
        }).catch((error) => {
            log.warn(error);
            resolve();
        })
    })
}

EventDispatcher.prototype.setLocksPin = function (locks, pin, userId) {
    return new Promise((resolve, reject) => {
        var self = this;
        if (!self._iot_man || locks.length <= 0) {
            return resolve();
        }

        var q = require('q');
        var chain = q.when();
        locks.forEach((lock) => {
            var lock_details = lock.details ? JSON.parse(lock.details) : {};
            let provider = self._iot_man.getProvider(lock_details.provider);
            if (provider) {
                chain = chain.then(() => {
                    return provider.api.setUserPinCode(lock, userId, pin, true);
                })
            }
        })
        resolve();
    })
}

EventDispatcher.prototype.clearLocksPin = function (locks, pin, userId) {
    return new Promise((resolve, reject) => {
        var self = this;
        if (!self._iot_man || locks.length <= 0) {
            return resolve();
        }
        var q = require('q');
        var chain = q.when();
        locks.forEach((lock) => {
            var lock_details = lock.details ? JSON.parse(lock.details) : {};
            let provider = self._iot_man.getProvider(lock_details.provider);
            if (provider) {
                chain = chain.then(() => {
                    return provider.api.clearUserPinCode(lock, userId, pin, true);
                })
            }
        })
        resolve();
    })
}


function processNonDoorGroupStatus(self, group, zone, device_type, status, device) {
    var data = status;
    var group_devices = self.devices.filter(x => x.group_uuid === group.uuid);

    if (["Air Quality Sensor"].includes(group.type)) {
        data = status;
    } else if (["Temperature Sensor"].includes(group.type)) {
        data = status;
    } else {

        var active_devices = group_devices.filter(x => ["Active", "On", "Opened"].includes(x.status))

        if ((!active_devices || active_devices.length <= 0)) {
            data = status;
        } else if (active_devices && active_devices.length > 0) {
            data = active_devices[0].status
        }
    }

    return data;
}


function processGroupStatus(self, group, zone, device_type, status, device) {

    var data = status;

    if (!GroupApi.isDoorGroupType(group.type)) {
        return processNonDoorGroupStatus(self, group, zone, device_type, status, device);
    }

    var group_devices = self.devices.filter(x => x.group_uuid === group.uuid);

    if (["door-lock", "electrical-stryke"].includes(device_type)) {

        var contacts = group_devices.filter(x => ['contact', 'electrical-contact'].includes(x.type));
        var contact_status = undefined;
        contacts.forEach((contact) => {
            if (!contact_status) {
                contact_status = contact.status;
            } else if (contact_status != contact.status && contact.status == "Opened") {
                contact_status = contact.status;
            }
        })

        var locks = group_devices.filter(x => ['door-lock', 'electrical-stryke'].includes(x.type));
        var lock_status = status;
        locks.forEach((lock) => {
            if (!lock_status) {
                lock_status = lock.status;
            } else if (lock_status != lock.status && lock.status == "Unlocked") {
                lock_status = lock.status;
            }
        })

        if (contact_status) {
            data = contact_status + " - " + lock_status;
        } else {
            data = lock_status;
        }

    } else if (["contact", "electrical-contact"].includes(device_type)) {

        var contacts = group_devices.filter(x => ['contact', 'electrical-contact'].includes(x.type));
        var contact_status = status;
        contacts.forEach((contact) => {
            if (!contact_status) {
                contact_status = contact.status;
            } else if (contact_status != contact.status && contact.status == "Opened") {
                contact_status = contact.status;
            }
        })

        var locks = group_devices.filter(x => ['door-lock', 'electrical-stryke'].includes(x.type));
        var lock_status = undefined;
        locks.forEach((lock) => {
            if (!lock_status) {
                lock_status = lock.status;
            } else if (lock_status != lock.status && lock.status == "Unlocked") {
                lock_status = lock.status;
            }
        })

        if (lock_status) {
            data = contact_status + " - " + lock_status;
        } else {
            data = contact_status;
        }
    } else {
        data = null;
    }

    if (!data && group.details.openOnMotion === true && ['occupancy', 'motion'].includes(device_type) && ['Active', 'Occupied'].includes(status)) {

        // motion detector on a door group triggered and door is set to open on motion
        var parms = {
            'iot-manager': self._iot_man, 'event-dispatcher': self,
            'timestamp': Date.now(), 'action-id': uuid.v4(), 'user-id': 'motion sensor ' + device.uuid,
            'user-name': device.name, 'session': null, 'org-id':device.org_id,'trigger-type' : 'sensor'
        };
        GroupApi.doAction(group.uuid, 'Unlock', parms, null, null).then(() => {
            log.debug('Group ' + group.name + ' Unlock action triggered by motion sensor ' + device.name);
        }, (error) => {
            log.error(error);
        });
    } else if (data && group.details.mustBeSecured === true) {

        var key = 'zone:' + zone.uuid + ':group:' + group.uuid + ':secured:timer';
        var timer = self._timers.get(key);

        if (data.includes('Opened') || data.includes('Unlocked')) {
            PropertyApi.checkAutomatedActionRestriction(device.org_id,group.uuid).then(()=>{
                if (!timer) {
                    timer = setTimeout((_self, _key, _group, _zone) => {
                        // timeout occured on a mustBeSecured door, trigger a zone alarm
                        var index = _self.zones.findIndex(x => x.uuid === _zone.uuid);
                        var location = _self.locations.find(x => x.uuid === _zone.location_uuid);
                        _self.zones[index].status = "Alarm";
                        var topic = 'zones:' + _zone.uuid;
                        _self._dispatch(topic, { "type": "status", "data": "Alarm", "topic": topic })
                        var notificationData = { name: 'Zone ' + _zone.name + ' Alert', event_type: 'Zone Alert', location: location.name };
                        notificationData.notfication_type = 'alert';
                        notificationData.event_data = 'SmartOffice zone alert triggered by security timeout on ' + _group.name + ' status';
                        _self._sendNotification('zone-alert', 'zone', _zone.uuid, 'critical', 'opened', notificationData, true, _zone.org_id);
                        _self._timers.delete(_key);
                    }, 60000, self, key, group, zone);
    
                    self._timers.set(key, timer);
                }
            }).catch((err) => {
                log.warn(err);
            })
        } else {

            if (timer) {
                clearTimeout(timer)
                self._timers.delete(key);
            }
        }

        if (data.includes('Closed') && data.includes('Unlocked') && ["contact", "electrical-contact"].includes(device_type)) {
            // secured door is closed but unlocked,
            var parms = {
                'iot-manager': self._iot_man, 'event-dispatcher': self,
                'timestamp': Date.now(), 'action-id': uuid.v4(), 'user-id': 'contact sensor ' + device.uuid,
                'user-name': device.name, 'org-id':device.org_id,'session': null, 'trigger-type' : 'sensor'
            };
            PropertyApi.checkForPendingAction(device.org_id, group.uuid).then((action) => {
                if(action){ //let's lock the door if a pending automated action present
                    parms['trigger-type'] = 'automated-pending-action';
                    GroupApi.doAction(group.uuid, action, parms, null, null).then(() => {
                        log.debug('In group ' + group.name + ' , a pending Lock action "'+action+'" is triggered by contact sensor ' + device.name);
                    });
                    PropertyApi.removePendingAction(device.org_id, group.uuid);
                }else{   // no penidng actions. let's try to lock the door.
                    GroupApi.doAction(group.uuid, 'Lock', parms, null, null).then(() => {
                        log.debug('Group ' + group.name + ' Lock action triggered by contact sensor ' + device.name);
                    }, (error) => {
                        log.error(error);
                    });
                }
            }).catch((error)=>{
                log.debug(error);
            });
        }
    } else if(data){
        if (data.includes('Closed') && data.includes('Unlocked') && ["contact", "electrical-contact"].includes(device_type)) {
            // door is closed but unlocked, so let's lock it if a pending automated action present
            var parms = {
                'iot-manager': self._iot_man, 'event-dispatcher': self,
                'timestamp': Date.now(), 'action-id': uuid.v4(), 'user-id': 'contact sensor ' + device.uuid,
                'user-name': device.name, 'session': null, 'trigger-type' : 'sensor','org-id' :device.org_id
            };
            PropertyApi.checkForPendingAction(device.org_id, group.uuid).then((action) => {
                if(action){
                    log.debug('In group ' + group.name + ' ,a pending Lock action "'+action+'" is triggered by contact sensor ' + device.name);
                    parms['trigger-type'] = 'automated-pending-action';
                    GroupApi.doAction(group.uuid, action, parms, null, null);
                    PropertyApi.removePendingAction(device.org_id, group.uuid);
                }
            }).catch((error)=>{
                log.debug(error);
            });
        }
    }
    return data;
}

EventDispatcher.prototype._mapEvent = function (event) {

    var events = {};
    var location = undefined;
    var gateway = undefined;
    var index = undefined;
    var device_index = undefined;
    var device = undefined;

    if (!event.device && event.gateway && ["details"].includes(event.gateway.stream)) {
        index = this.gateways.findIndex(x => x.uuid === event.gateway.id);
        gateway = this.gateways.find(x => x.uuid === event.gateway.id);
        Object.keys(event.data).forEach((key) => {
            if (key == "firmware") {
                this.gateways[index].details[key] = {
                    ...this.gateways[index].details[key],
                    ...event.data[key],
                    upgrade: {
                        ...(this.gateways[index].details[key] ? this.gateways[index].details[key].upgrade : {}),
                        ...event.data[key].upgrade
                    }
                }
            } else
                this.gateways[index].details[key] = event.data[key];
        })
        let topic = 'gateways:' + event.gateway.id;
        events[topic] = { "type": event.gateway.stream, "data": event.data, "topic": topic };
        return events;
    } else if (!event.device && event.gateway && ["state"].includes(event.gateway.stream)) {
        index = this.gateways.findIndex(x => x.uuid === event.gateway.id);
        gateway = this.gateways.find(x => x.uuid === event.gateway.id);
        location = this.locations.find(x => x.uuid === gateway.location_uuid);
        this.gateways[index].state = event.data;
        // send an email notification for the state change
        var notificationData = { name: 'Gateway ' + gateway.name + ' State event', event_type: 'Gateway State Change', location: location.name };
        var notificationType = 'alert';
        var severity = 'critical';
        var stat = 'opened';
        switch (event.data) {
            case 'unreachable':
                notificationType = 'alert';
                break
            case 'ready':
                notificationType = 'check';
                stat = 'closed';
                severity = null;
                break;
            case 'discovering':
                severity = 'normal';
                notificationType = 'default';
                break;
            default:
                notificationType = 'default';
                break;
        }
        notificationData.notfication_type = notificationType;
        notificationData.event_data = 'SmartOffice Gateway state has changed to ' + event.data;
        this._sendNotification('gateway-state-alert', 'gateway', gateway.uuid, severity, stat, notificationData, true, gateway.org_id);
        let topic = 'gateways:' + event.gateway.id;
        events[topic] = { "type": event.gateway.stream, "data": event.data, "topic": topic };
        return events;
    } else if (["zone", "new-device", "new-gateway", "new-location", "new-zone", "new-scene", "new-group", "del-gateway", "del-location", "del-zone", "del-scene", "del-group", "del-device", "update-gateway", "update-location", "update-zone", "update-scene", "update-group", "update-device"].includes(event.device.type)) {
        return this._mapInternalEvent(event);
    } else if (["weather-service"].includes(event.device.type)) {
        let topic = event.topic;
        events[topic] = { "type": event.device.stream, "data": event.data, "topic": topic };
        return events;
    } else if (["metrics-aggregation-service"].includes(event.device.type)) {
        let topic = event.topic;
        var arr_msg = topic.split(":");
        var list = undefined;
        switch (arr_msg[0]) {
            case 'groups':
                list = this.groups;
                break;
            case 'scenes':
                list = this.scenes;
                break
            case 'zones':
                list = this.zones;
                break;
        }
        if (list) {
            index = list.find(x => x.uuid === arr_msg[1]);
            if (index > -1) {
                if (event.device.stream !== 'currentTemperature' || arr_msg[0] === 'groups') {
                    list[index].details[event.device.stream] = event.data;
                } else if (event.device.stream === 'currentTemperature') {
                    list[index].temperature = event.data;
                }
            }
        }
        events[topic] = { "type": event.device.stream, "data": event.data, "topic": topic };
        return events;
    }

    device = this.devices.find(x => x.uuid === event.device.id);
    device_index = this.devices.findIndex(x => x.uuid === event.device.id);

    if (!device) {
        return events;
    }

    if (event.server) {
        gateway = this.gateways.find(x => x.uuid === event.server);
        if (!gateway || device.gateway_uuid !== gateway.uuid) {
            return events;
        }
        location = this.locations.find(x => x.uuid === gateway.location_uuid);
    }

    switch (event.device.stream) {
        // update status off the array element itself
        case "status":
        case "transition":
        case "motion":
        case "occupancy":
        case "onOff":
            this.devices[device_index].status = event.data;
            break;
        case "state":
            this.devices[device_index].state = event.data;
            break;
        case "currentTemperature":
        case "batteryLevel":
        case "batteryVoltage":
        case "signal":
        case "path":
            this.devices[device_index].details[event.device.stream] = event.data;
            break;
    }

    var topic = "";

    if (!device.group_uuid || event.device.stream === "path" || event.device.stream == "signal") {
        topic = 'devices:' + device.uuid;
        events[topic] = { "type": ["status", "motion", "occupancy", "onOff"].includes(event.device.stream) ? "status" : event.device.stream, "data": event.data, "topic": topic };
        return events;
    }

    var device_group = this.groups.find(x => x.uuid === device.group_uuid);
    index = this.groups.findIndex(x => x.uuid === device.group_uuid);
    var device_scene = device_group ? this.scenes.find(x => x.uuid === device_group.scene_uuid) : undefined;
    var device_zone = device_scene ? this.zones.find(x => x.uuid === device_scene.zone_uuid) : undefined;
    var data = event.data ? event.data : "";

    if (event.device.stream == "state") {
        // send an email notification for the state change
        var notificationData = { name: 'Device ' + device.name + ' State event', event_type: 'Device State Change', location: location.name };
        var notificationType = 'alert';
        var severity = 'warning'
        var stat = 'opened';
        switch (data) {
            case 'unreachable':
                notificationType = 'alert';
                break
            case 'ready':
                stat = 'closed';
                notificationType = 'check';
                severity = null;
                break;
            default:
                severity = 'normal'
                notificationType = 'default';
                break;
        }
        notificationData.notfication_type = notificationType;
        notificationData.event_data = 'SmartOffice Device state has changed to ' + data;
        this._sendNotification('device-state-alert', 'device', device.uuid, severity, stat, notificationData, true, device.org_id);
        topic = 'devices:' + device.uuid;
        events[topic] = { "type": "state", "data": event.data, "topic": topic };
        this.groups[index].state = (data !== 'ready' && data !== 'calibrating') ? "Alarmed" : getGroupState(this, device.group_uuid, device.uuid);
        topic = 'groups:' + device_group.uuid;
        events[topic] = { "type": "state", "data": this.groups[index].state, "topic": topic };

    } else if (event.device.stream == "status" || event.device.stream == "onOff") {

        topic = 'devices:' + device.uuid;
        events[topic] = { "type": "status", "data": event.data, "topic": topic };

        data = processGroupStatus(this, device_group, device_zone, event.device.type, event.data, device);
        if (data) {
            this.groups[index].status = data;
            topic = 'groups:' + device_group.uuid;
            events[topic] = { "type": "status", "data": data, "topic": topic };
        } else {
            data = event.data;
        }


        if (device_scene) {

            if (device.details.currentTemperature && !device_scene.temperature) {
                index = this.scenes.findIndex(x => x.uuid === device_group.scene_uuid);
                this.scenes[index].temperature = device.details.currentTemperature;
                topic = 'scenes:' + device_scene.uuid;
                events[topic] = { "type": "currentTemperature", "data": device.details.currentTemperature, "topic": topic };
            }
            index = this.zones.findIndex(x => x.uuid === device_scene.zone_uuid);
            var key = 'zone:' + this.zones[index].uuid + ':arm:sanity';
            var timer = this._timers.get(key);
            if (device_zone && ["Outside Door"].includes(device_group.type)) {
                if (!timer && (data.includes("Unlocked") || data.includes("Opened")) && device_zone.state == "Armed" && device_zone.status != "Alarm") {
                    // activity detected on an armed zone
                    this.zones[index].status = "Alarm";
                    topic = 'zones:' + device_zone.uuid;
                    events[topic] = { "type": "status", "data": "Alarm", "topic": topic };
                    var notificationData = { name: 'Zone ' + device_zone.name + ' Alarm', event_type: 'Zone Alarm', location: location.name };
                    notificationData.notfication_type = 'alert';
                    notificationData.event_data = 'SmartOffice zone alert triggered by Door ' + device_group.name + ' Activity';
                    this._sendNotification('zone-alarm', 'zone', device_zone.uuid, 'critical', 'opened', notificationData, true, device_zone.org_id);
                }
            } else if (!timer && device_zone && (data == "Active" || data == "Occupied") && device_zone.state == "Armed" && device_zone.status != "Alarm") {
                // activity detected on an armed zone
                this.zones[index].status = "Alarm";
                topic = 'zones:' + device_zone.uuid;
                events[topic] = { "type": "status", "data": "Alarm", "topic": topic };
                var notificationData = { name: 'Zone ' + device_zone.name + ' Alarm', event_type: 'Zone Alarm', location: location.name };
                notificationData.notfication_type = 'alert';
                notificationData.event_data = 'SmartOffice zone alert triggered by Motion ' + device_group.name + ' Activity';
                this._sendNotification('zone-alarm', 'zone', device_zone.uuid, 'critical', 'opened', notificationData, true, device_zone.org_id);
            }
        }
    } else if (["currentTemperature", "temperature"].includes(event.device.stream)) {
        switch (event.device.type) {
            case "contact":
            case "occupancy":
            case "thermostat":
            case "sensor":
            case "water":
            case "smoke":
            case "airquality":
                if (device_scene) {
                    index = this.scenes.findIndex(x => x.uuid === device_group.scene_uuid);

                    this.scenes[index].temperature = event.data;
                    topic = 'scenes:' + device_scene.uuid;
                    events[topic] = { "type": event.device.stream, "data": data, "topic": topic };
                }
                break;
        }

        if (device_group.type === "Temperature Sensor") {
            index = this.groups.findIndex(x => x.uuid === device.group_uuid);
            this.groups[index].status = data;
            topic = 'groups:' + device_group.uuid;
            events[topic] = { "type": "status", "data": data, "topic": topic };
        }

    } else if (event.device.stream == "motion" || event.device.stream == "occupancy") {

        topic = 'groups:' + device_group.uuid;
        events[topic] = { "type": event.device.stream, "data": data, "topic": topic };

        if (device_scene) {
            topic = 'scenes:' + device_scene.uuid;
            events[topic] = { "type": event.device.stream, "data": data, "topic": topic };
            if (device_zone) {
                index = this.zones.findIndex(x => x.uuid === device_scene.zone_uuid);
                var key = 'zone:' + this.zones[index].uuid + ':arm:sanity';
                var timer = this._timers.get(key);
                if (!timer && (data == "Active" || data == "Occupied") && device_zone.state == "Armed" && device_zone.status != "Alarm") {
                    // activity detected on an armed zone
                    this.zones[index].status = "Alarm";
                    topic = 'zones:' + device_zone.uuid;
                    events[topic] = { "type": "status", "data": "Alarm", "topic": topic };
                    var notificationData = { name: 'Zone ' + device_zone.name + ' Alarm', event_type: 'Zone Alarm', location: location.name };
                    notificationData.notfication_type = 'alert';
                    notificationData.event_data = 'SmartOffice zone alert triggered by Motion ' + device_group.name + ' Activity';
                    this._sendNotification('zone-alarm', 'zone', device_zone.uuid, 'critical', 'opened', notificationData, true, device_zone.org_id);
                }

            }
        }
    } else if (event.device.stream == "ring") {
        this.groups[index].status = "ringing";
        topic = 'groups:' + device_group.uuid;
        events[topic] = { "type": "status", "data": event.device.stream + "/" + data, "topic": topic };
    } else if (event.device.stream == "image-capture") {
        //topic = 'groups:' + device_group.uuid;
        topic = 'devices:' + device.uuid;
        events[topic] = { type: "image-capture", "data": data, "topic": topic };
    } else if (event.device.stream == "batteryLevel" || event.device.stream == "batteryVoltage") {

        topic = 'devices:' + device.uuid;
        events[topic] = { "type": event.device.stream, "data": event.data, "topic": topic };

        if (event.data < 10 && event.device.stream == "batteryLevel") {
            // battery level lower than 10% raise an alarm on the group and send an email notification
            this.groups[index].state = "Alarmed";
            topic = 'groups:' + device_group.uuid;
            events[topic] = { "type": "state", "data": this.groups[index].state, "topic": topic };
            var notificationData = { name: 'Device ' + device.name + ' Battery alert', event_type: 'Battery Alarm', location: location.name };
            notificationData.notfication_type = 'alert';
            notificationData.event_data = 'SmartOffice device in group ' + device_group.name + ' battery level is ' + event.data;
            this._sendNotification('device-battery-level', 'device', device.uuid, 'intermediate', 'opened', notificationData, true, device.org_id);
            this._sendNotification('group-alarm', 'group', device_group.uuid, 'intermediate', 'opened', {}, false, device_group.org_id);

        } else if (event.data > 10 && event.device.stream == "batteryLevel" && this.groups[index].state === "Alarmed") {
            // battery level back to normal
            this.groups[index].state = getGroupState(this, device.group_uuid, device.uuid);
            topic = 'groups:' + device_group.uuid;
            events[topic] = { "type": "state", "data": this.groups[index].state, "topic": topic };
            var notificationData = { name: 'Device ' + device.name + ' Battery alert', event_type: 'Battery Alarm', location: location.name };
            notificationData.notfication_type = 'check';
            notificationData.event_data = 'SmartOffice device in group ' + device_group.name + ' battery level is ' + event.data;
            this._sendNotification('device-battery-level', 'device', device.uuid, 'intermediate', 'closed', notificationData, true, device.org_id);

            if (this.groups[index].state !== "Alarmed") {
                this._sendNotification('group-alarm', 'group', device_group.uuid, 'intermediate', 'closed', {}, false, device_group.org_id);
            }
        }

    }
    return events;
};

EventDispatcher.prototype._dispatch = function (topic, event, callBackFn = undefined) {

    var ev = JSON.stringify(event);
    if (config.log.verboseEvents) {
        log.debug("Processing mapped event " + ev);
    }

    this.emit("ws::dispatch::event", event);

    for (var listenerId in this.listeners) {
        if (event.type !== "image-capture") {
            this.listeners[listenerId].emit(topic, ev, callBackFn);
        }
    }
};


EventDispatcher.prototype.dispatch = function (event, callBackFn = undefined) {

    var mappedEvents = this._mapEvent(event);
    for (var topic in mappedEvents) {
        if (Array.isArray(mappedEvents[topic])) {
            mappedEvents[topic].forEach((evt) => {
                if (evt.then != undefined)
                    evt.then(event => {
                        this._dispatch(topic, event, callBackFn);
                    }).catch(err => { log.error('Error: Dispatching Promise event - ' + err.message) })
                else
                    this._dispatch(topic, evt, callBackFn);
            });
        } else {
            this._dispatch(topic, mappedEvents[topic], callBackFn);
        }
    }
};

EventDispatcher.prototype._addNewDevice = function (id, name, dev, devInfo, session) {
    return new Promise((resolve, reject) => {
        var self = this;
        var device = undefined;
        var logEvt = undefined;

        log.info("Adding new device : " + id + " to gateway " + dev.gateway_uuid);

        Gateway.where({ uuid: dev.gateway_uuid }).fetch().then((gateway) => {
            devInfo.org_id = gateway.get("org_id");
            return Device.where({ uuid: devInfo.id }).fetch();
        }).then((foundDevice) => {
            device = foundDevice;
            var status = devInfo.properties ? devInfo.properties.status : undefined;
            if (devInfo.type == "occupancy") {
                status = devInfo.properties.occupancy;
            } else if (devInfo.type == "light") {
                status = devInfo.properties.onOff;
            }
            if (!status) {
                status = 'undefined';
            }
            var actions = "[";
            devInfo.actions.forEach((action) => {
                actions = actions + "\"" + action + "\",";
            });
            if (actions != "[") {
                actions = actions.substring(0, actions.length - 1);
            }
            actions = actions + "]";

            if (devInfo.type == "door-lock") {
                devInfo.properties["Lock_params"] = { name: "pin", value: "1234" };
                devInfo.properties["Unlock_params"] = { name: "pin", value: "1234" };
            }

            if (!device) {
                log.debug('Device [' + devInfo.id + '] registered to server database.\n');
                device = new Device({
                    "name": name ? name : devInfo.name, "uuid": devInfo.id, "type": devInfo.type,
                    "state": devInfo.properties.state, "status": status, "org_id": devInfo.org_id,
                    "gateway_uuid": dev.gateway_uuid, "actions": actions, "details": JSON.stringify(devInfo.properties), "group_uuid": null
                });
                let logTopic = 'gateways:' + dev.gateway_uuid;
                let logDt = 'Device [' + devInfo.id + '] registered to server database.\n';
                logDt = logDt + 'Name: ' + (name ? name : devInfo.name) + '.\n';
                logDt = logDt + 'State: ' + devInfo.properties.state + '.\n';
                logDt = logDt + 'Status: ' + status + '.\n';
                logEvt = { type: 'log', data: logDt, topic: logTopic };

            } else {
                log.warn('Device [' + devInfo.id + ']  found in server database with gateway ' + device.get("gateway_uuid") + ' \n');
                device.set("type", devInfo.type);
                device.set("status", status);
                device.set("state", devInfo.properties.state);
                device.set("org_id", devInfo.org_id);
                if (!name && device.get("name") == "Unknown device" && devInfo.name) {
                    device.set("name", devInfo.name);
                } else if (name) {
                    device.set("name", name);
                }
                device.set("actions", actions);
                device.set("details", JSON.stringify(devInfo.properties));

                let logTopic = 'gateways:' + dev.gateway_uuid;
                let logDt = 'Device [' + devInfo.id + ']  found in server database with gateway ' + device.get("gateway_uuid") + ' \n';
                logDt = logDt + 'Name: ' + device.get("name") + '.\n';
                logDt = logDt + 'State: ' + devInfo.properties.state + '.\n';
                logDt = logDt + 'Status: ' + status + '.\n';
                logEvt = { type: 'log', data: logDt, topic: logTopic };
            }
            device.save().then((_device) => {
                if (logEvt) {
                    self._dispatch(logEvt.topic, logEvt)
                }
                resolve(_device);
            }).catch((error) => {
                log.error(error);
                reject(error);
            });
        });
    });
}

EventDispatcher.prototype.confirmPendingDevice = function (event, session) {

    return new Promise((resolve, reject) => {
        log.info("Processing new device event: " + JSON.stringify(event));
        var self = this;
        session.api.getDevice(event.server, event.device.id, event.device).then((devInfo) => {

            var index = -1;
            var dev = undefined;
            if (devInfo) {
                index = self.pending_devices.findIndex(x => x.id === devInfo.properties.phyId);
            }

            if (index > -1) {
                dev = self.pending_devices[index];
            }

            if (!dev) {
                dev = { gateway_uuid: event.server, name: devInfo.name, id: event.device.id }
            }


            var q = require('q');
            var promises = [];
            if (dev && dev.timeout) {
                clearTimeout(dev.timeout)
                dev.timeout = null;
            }

            if (devInfo.devices) {
                var devices = devInfo.devices;
                devices.forEach((deviceInfo) => {
                    let name = dev.name ? dev.name + '-' + deviceInfo.name : deviceInfo.name;
                    promises.push(self._addNewDevice(deviceInfo.properties.phyId, name, dev, deviceInfo, session));
                })
            } else {
                promises.push(self._addNewDevice(dev.id, dev.name, dev, devInfo, session));
            }
            if (index > -1) {
                self.pending_devices.splice(index, 1);
            }

            return q.all(promises);
        }).then((_devices) => {
            _devices.forEach((_device) => {
                self.updateIoTList('device', _device.toJSON(), 'insert', true);
                if (_device.get('type') == 'intercom' && session.name == 'cyberdata') {
                    session.api.addWorker(_device.toJSON());
                }
            })
            resolve();
        }).catch((err) => {
            log.error(err);
            self.removePendingDevice(event.device.id);
            var topic = "devices:new-device";
            var evt = { type: "event", data: err, device: { id: event.device.id, type: "new-device", "state": "fail", topic: topic } };
            self.dispatch(evt);

            let logTopic = 'gateways:' + event.server;
            let logDt = 'Device [' + event.device.id + '] failed to pair to gateway. Error: ' + err + '.\n';
            logDt = logDt + 'Name: unknown.\n';
            logDt = logDt + 'State: fail.\n';
            logDt = logDt + 'Status: unknown.\n';
            logEvt = { type: 'log', data: logDt, topic: logTopic };
            self._dispatch(logEvt.topic, logEvt)

            reject(err);
        });
    });
};

EventDispatcher.prototype.sendPendingAutomatedActionAlert = function(automation_name, group_uuid,org_id, action){
    var device_group = this.groups.find(x => x.uuid === group_uuid);
    var device_scene = device_group ? this.scenes.find(x => x.uuid === device_group.scene_uuid) : undefined;
    var device_zone = device_scene ? this.zones.find(x => x.uuid === device_scene.zone_uuid) : undefined;
    var location = device_zone ? this.locations.find(x=>x.uuid === device_zone.location_uuid) : undefined;
    var door_desired_state = action == "Lock" ? "Locked" : "Unlocked";

    var notificationData = { name: 'Automated action alert - ' + automation_name , event_type: 'Automated action alert', location: location.name };
    notificationData.notfication_type = 'alert';
    notificationData.event_data = 'Please close the door ' + device_group.name + '. This door needs to be '+door_desired_state+' now as per the Automated action - ' + automation_name;
    this._sendNotification('group-alarm', 'group', group_uuid, 'critical', 'opened', notificationData, true, org_id);
}

module.exports = EventDispatcher.getInstance();
