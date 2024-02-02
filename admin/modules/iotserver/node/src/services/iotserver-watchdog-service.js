const io = require('socket.io-client');
const config = require('config');
const db = require('../db');
const Location = require('../models/Location');
const Zone = require('../models/Zone');
const Scene = require('../models/Scene');
const Group = require('../models/Group');
const Device = require('../models/Device');
const Gateway = require('../models/Gateway');
const EventHistory = require('../models/EventHistory');
const WorkerServer = require('./iotserver-watchdog-ws-server.js').WatchDogWSServer;
const JobScheduler = require('../scheduler/scheduler.js');
const EventHistoryCleanupJob = require('../scheduler/jobs/event-history-cleanup.js')
const NotificationCleanupJob = require('../scheduler/jobs/notification-cleanup.js')
const { getProviderType } = require("../api/iot/gateway-api");
const classMapping = { "locations": Location, "zones": Zone, "scenes": Scene, "groups": Group, "gateways": Gateway, "devices": Device };
const util = require('util')
const uuid = require('uuid');

function IoTServerWatchdog(host, port, protocol) {
    protocol = protocol || 'ws';
    protocol = protocol.replace('://', '') + '://';
    port = port || 80;
    this.socket = io(protocol + host + ':' + port);
    this.stack = [];
    this._workers = new Map();
    this._cleanup_scheduler = new JobScheduler();
}

IoTServerWatchdog.prototype = {

    init: function () {
        return db.waitForDatabase().then(() => {
            var self = this;

            global.process.on('unhandledRejection', (reason, promise) => {
                let data = { level: 'error', text: "Unhandled rejection at " + util.inspect(promise, false, null, true) + "\n Reason: " + reason };
                self.LogHandler(data);
            })

            global.process.on('uncaughtException', (err, origin) => {
                let data = { level: 'error', text: "Unhandled exception: " + err + "\n. Exception origin: " + origin };
                self.LogHandler(data);
            })

            global.process.on('disconnect', () => {
                self._cleanup_scheduler.stop();
            })

            self.socket.on('error', (error) => {
                let data = { level: 'error', text: 'Socket error: ' + error };
                self.LogHandler(data);
            });

            self.socket.on('connect_error', (error) => {
                let data = { level: 'error', text: 'Socket connect error: ' + error };
                self.LogHandler(data);
            });

            self.socket.on('connect_timeout', (error) => {
                let data = { level: 'error', text: 'Socket connect timeout error: ' + error };
                self.LogHandler(data);
            });

            var msg = { level: 'debug', text: 'Registering events on: locations:new-location' };
            self.LogHandler(msg);
            self.socket.on('locations:new-location', (data, callBackFn) => {
                self.NewObjectHandler(JSON.parse(data), callBackFn);
            });
            msg = { level: 'debug', text: 'Registering events on: zones:new-zone' };
            self.LogHandler(msg);
            self.socket.on('zones:new-zone', (data, callBackFn) => {
                self.NewObjectHandler(JSON.parse(data), callBackFn);
            });
            msg = { level: 'debug', text: 'Registering events on: scenes:new-scene' };
            self.LogHandler(msg);
            self.socket.on('scenes:new-scene', (data, callBackFn) => {
                self.NewObjectHandler(JSON.parse(data), callBackFn);
            });
            msg = { level: 'debug', text: 'Registering events on: groups:new-group' };
            self.LogHandler(msg);
            self.socket.on('groups:new-group', (data, callBackFn) => {
                self.NewObjectHandler(JSON.parse(data), callBackFn);
            });
            msg = { level: 'debug', text: 'Registering events on: devices:new-device' };
            self.LogHandler(msg);
            self.socket.on('devices:new-device', (data, callBackFn) => {
                self.NewObjectHandler(JSON.parse(data), callBackFn);

            });
            msg = { level: 'debug', text: 'Registering events on: gateways:new-gateway' };
            self.LogHandler(msg);
            self.socket.on('gateways:new-gateway', (data, callBackFn) => {
                self.NewObjectHandler(JSON.parse(data));

            });
            Location.fetchAll().then((locations) => {
                locations.forEach((location) => {
                    self.RegisterEventsListener('locations', location.get('uuid'));
                });
            });

            Zone.fetchAll().then((zones) => {
                zones.forEach((zone) => {
                    self.RegisterEventsListener('zones', zone.get('uuid'));
                });
            });
            Scene.fetchAll().then((scenes) => {
                scenes.forEach((scene) => {
                    self.RegisterEventsListener('scenes', scene.get('uuid'));
                });
            });
            Group.fetchAll().then((groups) => {
                groups.forEach((group) => {
                    self.RegisterEventsListener('groups', group.get('uuid'));
                });
            });

            Device.fetchAll().then((devices) => {
                devices.forEach((device) => {
                    self.RegisterEventsListener('devices', device.get('uuid'));
                });
            });

            Gateway.fetchAll().then((gateways) => {
                gateways.forEach((gateway) => {
                    self.RegisterEventsListener('gateways', gateway.get('uuid'));
                });
            });

            if (global.process.env.NODE_ENV !== "simulation") {

                if (config.iot.providers.find(x => x.name === 'jilia')) {
                    const JiliaWatchDog = require('../lib/iot/providers/jilia/jilia-watchdog.js').JiliaWatchDog;
                    const watchdog = new JiliaWatchDog();
                    watchdog.on('object-update', function (data) {
                        self.JiliaUpdateHandler(data);
                    });
                    watchdog.on('log', function (data) {
                        self.LogHandler(data);
                    });
                    watchdog.run(watchdog.jilia_rest);
                    setInterval(watchdog.run.bind(watchdog), 180000, watchdog.jilia_rest);
                }


                self._cleanup_scheduler.on('log', function (data) {
                    self.LogHandler(data);
                });

                self._cleanup_scheduler.init([EventHistoryCleanupJob, NotificationCleanupJob]);

                // schedule cleanup cron jobs that need to run
                self._cleanup_scheduler.schedule();

                const server = new WorkerServer();
                server.init().then((server) => {
                    server.on('log', function (data) {
                        self.LogHandler(data);
                    });

                    server.on('message', function (data) {
                        if (global.process.send) {
                            var msg = { type: data.msg_type, data: data.msg_content };
                            global.process.send(msg);
                        }
                    });

                    Location.fetchAll().then((locations) => {
                        locations.forEach((location) => {
                            self._startWheatherWorker(location.toJSON());
                        });
                    });

                    var MetricsAggregationWorker = require("./workers/MetricsAggregationWorker.js");
                    var key = uuid.v4();
                    let worker = new MetricsAggregationWorker(key);
                    worker.on("log", self.LogHandler.bind(self));
                    worker.on("job::result", self.JobResultHandler.bind(self));
                    worker.initialize(null, null)
                    worker.doWork();
                    let timer = setInterval(worker.doWork.bind(worker), 300000); // perform metrics aggregation every 5 minutes
                    self._workers.set(key, { worker: worker, timer: timer });
                })
            }
            return self;
        });
    },

    JiliaUpdateHandler: function (data) {
        var msg = { type: "jilia_update", data: data };
        global.process.send(msg)
    },

    LogHandler: function (data) {
        if (global.process.send) {
            var msg = { type: "log", data: data };
            global.process.send(msg);
        } else {
            console.log(data.text)
        }
    },

    JobResultHandler: function (result) {
        return new Promise((resolve, reject) => {
            var self = this;
            var regHistory = false;
            switch (result.type) {
                case 'weather':
                    var arr_message = result.id.split('/');
                    classMapping[arr_message[0]].where({ uuid: arr_message[1] }).fetch().then((obj) => {
                        var tmp = obj.get('temperature') ? obj.get('temperature') : null;
                        regHistory = (Number(tmp) == Number(result.data.currentTemperature)) ? false : true;
                        obj.set("temperature", result.data.currentTemperature);
                        let details = obj.get("details") ? JSON.parse(obj.get("details")) : {};
                        details["timezone"] = result.data.timezone;
                        obj.set("details", JSON.stringify(details));
                        return obj.save();
                    }).then((obj) => {
                        return self.RegisterObjectEventHistory(obj, arr_message[0].slice(0, -1), 'temperature-update', result.data.currentTemperature, {}, regHistory);
                    }).then(() => {
                        topic = arr_message[0] + ':' + arr_message[1];
                        let msg = { type: 'job_update', topic: topic, data: result.data.currentTemperature, device: { type: 'weather-service', stream: "currentTemperature" } }
                        global.process.send(msg)
                        resolve();
                    }).catch((error) => {
                        var data = { level: 'error', text: error };
                        if (global.process.send) {
                            global.process.send({ type: 'log', data: data });
                        } else {
                            console.log(data.text);
                        }
                        resolve();
                    });
                    break;
                case 'metrics-aggregation':
                    let msg = { type: 'job_update', topic: result.topic, data: result.data.value, device: { type: 'metrics-aggregation-service', stream: result.data.stream } }
                    global.process.send(msg)
                    resolve();
                    break;
                default:
                    resolve();
                    break;
            }
        });
    },

    RegisterEventsListener: function (object, uuid) {
        var self = this;
        var msg = { level: 'debug', text: 'Registering events on: ' + object + ':' + uuid };
        var func = undefined;

        switch (object) {
            case "locations":
                func = self.LocationsEventHandler;
                break;
            case "zones":
                func = self.ZonesEventHandler;
                break;
            case "scenes":
                func = self.ScenesEventHandler;
                break;
            case "groups":
                func = self.GroupsEventHandler;
                break;
            case "devices":
                func = self.DevicesEventHandler;
                break;
            case "gateways":
                func = self.GatewaysEventHandler;
                break;
        }

        if (func) {
            if (global.process.send) {
                global.process.send({ type: 'log', data: msg });
            } else {
                console.log(msg.text);
            }

            self.socket.on(object + ':' + uuid, func.bind(self, uuid));
        }
    },

    NewObjectHandler: function (evt, callBackFn) {
        return new Promise((resolve, reject) => {
            var self = this;
            switch (evt.type) {
                case "new-location":
                    self.RegisterEventsListener('locations', evt.uuid);
                    self._startWheatherWorker(evt.data);
                    break;
                case "new-zone":
                    self.RegisterEventsListener('zones', evt.uuid);
                    break;
                case "new-scene":
                    self.RegisterEventsListener('scenes', evt.uuid);
                    break;
                case "new-group":
                    self.RegisterEventsListener('groups', evt.uuid);
                    break;
                case "new-device":
                    self.RegisterEventsListener('devices', evt.uuid);
                    break;
                case "new-gateway":
                    self.RegisterEventsListener('gateways', evt.uuid);
                    break;
            }
            resolve();
        });
    },

    _startWheatherWorker: function (location) {
        return new Promise((resolve, reject) => {
            var self = this;
            if (!config.iot.weather_service) {
                resolve();
                return;
            }
            var WeatherUpdateWorker = require("./workers/WeatherUpdateWorker.js");
            var key = 'locations/' + location.uuid;
            var details = location.details ? location.details : {};
            if (typeof details === 'string') {
                details = JSON.parse(details);
            }
            if (details.coordinates) {
                let worker = new WeatherUpdateWorker(key, details.coordinates);
                worker.on("log", self.LogHandler.bind(self));
                worker.on("job::result", self.JobResultHandler.bind(self));
                worker.initialize(config.iot.weather_service, null)
                worker.doWork();
                let interval = 3600000 + Math.random() * (600000 - 0) + 0;
                let timer = setInterval(worker.doWork.bind(worker), interval);
                self._workers.set(key, { worker: worker, timer: timer });
            }
            resolve();
        });
    },

    _stopWheatherWorker: function (key) {
        return new Promise((resolve, reject) => {
            var self = this;
            if (!config.iot.weather_service) {
                resolve();
                return;
            }
            var wData = self._workers.get(key);
            if (wData) {
                if (wData.timer) {
                    clearInterval(wData.timer)
                }
                wData.worker.stop();
                self._workers.delete(key);
            }
            resolve();
        });
    },

    RegisterObjectEventHistory: function (object, object_type, event_type, event_value, details, regHistory = true) {
        return new Promise((resolve, reject) => {
            var self = this;
            if (!event_type || !event_value || !regHistory) {
                resolve();
                return;
            }

            if (typeof event_value !== 'string') {
                event_value = event_value.toString();
            }

            var hist = new EventHistory({
                event_type: event_type, event_value: event_value,
                event_time: Date.now(), event_uuid: uuid.v4(),
                event_object_uuid: object.get("uuid"), event_object_type: object_type,
                event_object_name: object.get("name"),
                user_id: null,
                user_name: null,
                org_id: object.get('org_id'),
                details: JSON.stringify(details)
            });
            hist.save().then((h) => {
                var msg = { level: 'debug', text: 'Saved history: ' + JSON.stringify(h.toJSON()) };
                if (config.log.verboseEvents && global.process.send) {
                    global.process.send({ type: 'log', data: msg });
                } else {
                    console.log(msg.text);
                }
                resolve()
            }).catch((err) => {
                var msg = { level: 'error', text: 'Something went wrong on saving event history. Error: ' + err };
                if (global.process.send) {
                    global.process.send({ type: 'log', data: msg });
                } else {
                    console.log(msg.text);
                }
                resolve()
            });
        });
    },

    LocationsEventHandler: function (uuid, data, callBackFn) {
        return new Promise((resolve, reject) => {
            var self = this;
            data = JSON.parse(data);
            switch (data.type) {
                case 'update':
                case 'delete':
                    Location.where({ uuid: uuid }).fetch().then((location) => {
                        if (location) {
                            var key = 'locations/' + location.get("uuid");
                            if (data.type === 'delete') {
                                self._stopWheatherWorker(key);
                                location.destroy();
                            } else {
                                self._stopWheatherWorker(key).then(() => {
                                    self._startWheatherWorker(location.toJSON());
                                });
                            }
                        } else if (data.type === 'delete') {
                            var key = 'locations/' + data.data.uuid;
                            self._stopWheatherWorker(key);
                        }
                        resolve()
                    }).catch((err) => {
                        var msg = { level: 'error', text: 'Something went wrong on saving event history. Error: ' + err };
                        if (global.process.send) {
                            global.process.send({ type: 'log', data: msg });
                        } else {
                            console.log(msg.text);
                        }
                        resolve()
                    });
                    break;
            }
        })
    },

    ZonesEventHandler: function (uuid, data, callBackFn) {
        return new Promise((resolve, reject) => {
            data = JSON.parse(data);
            var self = this;
            var event_type = undefined;
            var event_value = undefined;
            var regHistory = false;
            switch (data.type) {
                case 'state':
                case 'update':
                case 'status':
                case 'currentTemperature':
                    Zone.where({ uuid: uuid }).fetch().then((zone) => {
                        var zn = zone;
                        if (data.type === 'currentTemperature') {
                            event_type = 'temperature-update';
                            event_value = data.data;
                            var tmp = zone.get('temperature');
                            regHistory = (Number(tmp) == Number(data.data)) ? false : true;
                            zone.set('temperature', data.data);
                        } else if (data.type !== 'update' && data.data.toUpperCase().match(/ARMED/)) {
                            var tmp = zone.get('state');
                            regHistory = (tmp == data.data) ? false : true;
                            zone.set('state', data.data);
                            event_type = 'state-update';
                            event_value = data.data;
                        } else if (data.type !== 'update') {
                            var tmp = zone.get('status');
                            regHistory = (tmp == data.data) ? false : true;
                            zone.set('status', data.data);
                            event_type = 'status-update';
                            event_value = data.data;
                        } else if (data.type == 'update' && data.state && data.status) {
                            var tmp = zone.get('state');
                            regHistory = (tmp == data.data) ? false : true;
                            zone.set('state', data.state);
                            tmp = zone.get('status');
                            regHistory = (tmp == data.data && !regHistory) ? false : true;
                            zone.set('status', data.status);
                            event_type = 'global-update';
                            event_value = 'state: ' + data.state + '; status: ' + data.status;
                        }
                        zone.save().then((zone) => {
                            zn = zone;
                            console.log('Saved zones:', uuid, 'OK');
                            return zone.related('location').fetch();
                        }).then((loc) => {
                            var details = { position: { location: loc.get('name') } };
                            return self.RegisterObjectEventHistory(zn, 'zone', event_type, event_value, details, regHistory);
                        }).then(() => {
                            console.log('Saved zones:', uuid, ' event history OK');
                            resolve();
                        }).catch((err) => {
                            var msg = { level: 'error', text: 'Something went wrong on saving zones:' + uuid + '. Error: ' + err };
                            if (global.process.send) {
                                global.process.send({ type: 'log', data: msg });
                            } else {
                                console.log(msg.text);
                            }
                            resolve()
                        });
                    }).catch((err) => {
                        var msg = { level: 'error', text: 'Something went wrong on saving zones:' + uuid + '. Error: ' + err };
                        if (global.process.send) {
                            global.process.send({ type: 'log', data: msg });
                        } else {
                            console.log(msg.text);
                        }
                        resolve()
                    });
                    break;
                case 'delete':
                    Zone.where({ uuid: uuid }).fetch().then((zone) => {
                        if (zone) {
                            zone.destroy();
                        }
                        resolve();
                    }).catch((err) => {
                        var msg = { level: 'error', text: 'Something went wrong on destroying zones:' + uuid + '. Error: ' + err };
                        if (global.process.send) {
                            global.process.send({ type: 'log', data: msg });
                        } else {
                            console.log(msg.text);
                        }
                        resolve()
                    });
                    break;
            }
        })
    },
    ScenesEventHandler: function (uuid, data) {
        return new Promise((resolve, reject) => {
            var self = this;
            data = JSON.parse(data);
            var regHistory = false;
            var sc = undefined;
            switch (data.type) {
                case 'currentTemperature':
                    Scene.where({ uuid: uuid }).fetch().then((scene) => {
                        sc = scene;
                        var tmp = scene.get('temperature');
                        regHistory = (Number(tmp) == Number(data.data)) ? false : true;
                        scene.set('temperature', data.data);
                        return scene.save();
                    }).then((scene) => {
                        sc = scene;
                        console.log('Saving scenes:', uuid, 'OK');
                        return scene.related('zone').fetch({ withRelated: 'location' });
                    }).then((zone) => {
                        var loc = zone.related('location');
                        var details = { position: { location: loc.get('name'), zone: zone.get('name') } };
                        return self.RegisterObjectEventHistory(sc, 'scene', 'temperature-update', data.data, details, regHistory);
                    }).then(() => {
                        console.log('Saving scenes:', uuid, ' event history OK');
                        resolve()
                    }).catch((err) => {
                        var msg = { level: 'error', text: 'Something went wrong on saving scenes:' + uuid + '. Error: ' + err };
                        if (global.process.send) {
                            global.process.send({ type: 'log', data: msg });
                        } else {
                            console.log(msg.text);
                        }
                        resolve()
                    });

                    break;
                case 'update':
                    break;
                case 'delete':
                    Scene.where({ uuid: uuid }).fetch().then((scene) => {
                        if (scene) {
                            scene.destroy();
                        }
                        resolve();
                    }).catch((err) => {
                        var msg = { level: 'error', text: 'Something went wrong on destroying scenes:' + uuid + '. Error: ' + err };
                        if (global.process.send) {
                            global.process.send({ type: 'log', data: msg });
                        } else {
                            console.log(msg.text);
                        }
                        resolve()
                    });
                    break;
            }
        })
    },
    ScenesEventHandler: function (uuid, data, callBackFn) {
        return new Promise((resolve, reject) => {
            var self = this;
            data = JSON.parse(data);
            var regHistory = false;
            var sc = undefined;
            switch (data.type) {
                case 'currentTemperature':
                    Scene.where({ uuid: uuid }).fetch().then((scene) => {
                        sc = scene;
                        var tmp = scene.get('temperature');
                        regHistory = (Number(tmp) == Number(data.data)) ? false : true;
                        scene.set('temperature', data.data);
                        return scene.save();
                    }).then((scene) => {
                        sc = scene;
                        console.log('Saving scenes:', uuid, 'OK');
                        return scene.related('zone').fetch({ withRelated: 'location' });
                    }).then((zone) => {
                        var loc = zone.related('location');
                        var details = { position: { location: loc.get('name'), zone: zone.get('name') } };
                        return self.RegisterObjectEventHistory(sc, 'scene', 'temperature-update', data.data, details, regHistory);
                    }).then(() => {
                        console.log('Saving scenes:', uuid, ' event history OK');
                        resolve()
                    }).catch((err) => {
                        var msg = { level: 'error', text: 'Something went wrong on saving scenes:' + uuid + '. Error: ' + err };
                        if (global.process.send) {
                            global.process.send({ type: 'log', data: msg });
                        } else {
                            console.log(msg.text);
                        }
                        resolve()
                    });

                    break;
                case 'update':
                    break;
                case 'delete':
                    Scene.where({ uuid: uuid }).fetch().then((scene) => {
                        if (scene) {
                            scene.destroy();
                        }
                        resolve();
                    }).catch((err) => {
                        var msg = { level: 'error', text: 'Something went wrong on destroying scenes:' + uuid + '. Error: ' + err };
                        if (global.process.send) {
                            global.process.send({ type: 'log', data: msg });
                        } else {
                            console.log(msg.text);
                        }
                        resolve()
                    });
                    break;
            }
        })
    },

    GroupsEventHandler: function (uuid, data, callBackFn) {
        return new Promise((resolve, reject) => {
            data = JSON.parse(data);
            if (!['status', 'state', 'update', 'delete', 'currentTemperature'].includes(data.type)) {
                return;
            }
            var self = this;
            var regHistory = false;
            var grp = undefined;
            switch (data.type) {
                case 'state':
                case 'status':
                case 'currentTemperature':
                    var event_type = data.type + '-update';
                    var event_value = data.data;
                    Group.where({ uuid: uuid }).fetch({ withRelated: ['scene'] }).then((group) => {
                        grp = group;
                        var sc = undefined;
                        var zn = undefined;
                        if (data.type === 'currentTemperature') {
                            var details = group.get('details') ? JSON.parse(group.get('details')) : {};
                            details[data.type] = data.data;
                            group.set('details', JSON.stringify(details));
                            regHistory = group.hasChanged('details');
                        } else {
                            group.set(data.type, data.data);
                            regHistory = group.hasChanged(data.type);
                        }
                        return group.save();
                    }).then((group) => {
                        grp = group;
                        return Group.where({ uuid: group.get("uuid") }).fetch({ withRelated: ['scene'] });
                    }).then((_group) => {
                        return _group.related('scene').fetch({ withRelated: 'zone' });
                    }).then((scene) => {
                        sc = scene;
                        return scene.related('zone').fetch({ withRelated: 'location' });
                    }).then((zone) => {
                        var details = { position: { scene: sc.get('name') } };
                        zn = zone;
                        var loc = zone.related('location');
                        details.position.location = loc.get('name');
                        details.position.zone = zone.get('name');
                        return self.RegisterObjectEventHistory(grp, 'group', event_type, event_value, details, regHistory);
                    }).then(() => {
                        console.log('Saving groups:', uuid, ' event history OK');
                        resolve()
                    }).catch((err) => {
                        var msg = { level: 'error', text: 'Something went wrong on saving groups:' + uuid + '. Error: ' + err };
                        if (global.process.send) {
                            global.process.send({ type: 'log', data: msg });
                        } else {
                            console.log(msg.text);
                        }
                        resolve();
                    });
                    break;
                case 'update':
                    break;
                case 'delete':
                    Group.where({ uuid: uuid }).fetch().then((group) => {
                        if (group) {
                            group.destroy();
                        }
                    }).catch((err) => {
                        var msg = { level: 'error', text: 'Something went wrong on destroying groups:' + uuid + '. Error: ' + err };
                        if (global.process.send) {
                            global.process.send({ type: 'log', data: msg });
                        } else {
                            console.log(msg.text);
                        }
                        resolve();
                    });
                    break;
            }
        })
    },
    GatewaysEventHandler: function (uuid, data, callBackFn) {
        return new Promise((resolve, reject) => {
            data = JSON.parse(data);
            if (!['state', 'update', 'delete', 'details'].includes(data.type)) {
                return;
            }
            var self = this;
            var regHistory = false;
            var gw = undefined;
            switch (data.type) {
                case 'state':
                    var event_type = data.type + '-update';
                    var event_value = data.data;
                    Gateway.where({ uuid: uuid }).fetch().then((gateway) => {
                        gw = gateway;
                        gateway.set(data.type, data.data);
                        regHistory = gateway.hasChanged(data.type);
                        return gateway.save();
                    }).then((gateway) => {
                        gw = gateway;
                        if (callBackFn) {
                            callBackFn(uuid, data.type);
                        }
                        return gateway.related('location').fetch();
                    }).then((location) => {
                        console.log('Saving gateways:', uuid, 'OK');
                        var details = { position: { location: location.get('name') } };
                        return self.RegisterObjectEventHistory(gw, 'gateway', event_type, event_value, details, regHistory);
                    }).then(() => {
                        console.log('Saving gateways:', uuid, ' event history OK');
                        resolve()
                    }).catch((err) => {
                        var msg = { level: 'error', text: 'Something went wrong on saving gateways:' + uuid + '. Error: ' + err };
                        if (global.process.send) {
                            global.process.send({ type: 'log', data: msg });
                        } else {
                            console.log(msg.text);
                        }
                        resolve()
                    });
                    break;
                case 'update':
                    Gateway.where({ uuid: uuid }).fetch().then((gateway) => {
                        if (gateway) {
                            data.data.details = data.data.details != undefined && typeof data.data.details != "string" ? JSON.stringify(data.data.details) : data.data.details;
                            Object.keys(data.data).forEach(key => {
                                // to set the following keys to undefined is not enough for the validator
                                // as it uses keys to check whether or not that key should exist in the model
                                // so better avoid to set this keys.
                                if (!["location", "devices", "objtype", "provider"].includes(key)) {
                                    gateway.set(key, data.data[key]);
                                }
                                if (key == "provider" && getProviderType(data.data[key]) != undefined)
                                    gateway.set(key, getProviderType(data.data[key]));
                                else if (key == "provider")
                                    gateway.set(key, data.data[key]);
                            });
                            return gateway.save();
                        }
                    }).then(gateway => {
                        if (callBackFn)
                            callBackFn(uuid, data.type);
                    }).catch(err => {
                        if (global.process.send) {
                            global.process.send({ type: "log", data: { level: "error", text: "Something went wrong on saving gateways" + uuid + ". Error: " + err } });
                        }
                    });
                    break;
                case 'delete':
                    Gateway.where({ uuid: uuid }).fetch().then((gateway) => {
                        if (gateway) {
                            gateway.destroy();
                        }
                    }).catch((err) => {
                        var msg = { level: 'error', text: 'Something went wrong on destroying gateways:' + uuid + '. Error: ' + err };
                        if (global.process.send) {
                            global.process.send({ type: 'log', data: msg });
                        } else {
                            console.log(msg.text);
                        }
                        resolve()
                    });
                    break;
                case 'details':
                    Gateway.where({ uuid: uuid }).fetch().then((gateway) => {
                        if (!gateway) {
                            return;
                        }
                        var details = gateway.get('details') ? JSON.parse(gateway.get('details')) : {};
                        var info = (typeof data.data === 'string') ? JSON.parse(data.data) : data.data;
                        Object.keys(info).forEach((key) => {
                            if (key == 'firmware') {
                                var finfo = (typeof info[key] === 'string') ? JSON.parse(info[key]) : info[key];
                                var fdetails = details.firmware ? details.firmware : {};
                                Object.keys(finfo).forEach((fkey) => {
                                    if (fkey == 'upgrade') {
                                        var uinfo = (typeof finfo[fkey] === 'string') ? JSON.parse(finfo[fkey]) : finfo[fkey];
                                        var udetails = fdetails.upgrade ? fdetails.upgrade : {};
                                        Object.keys(uinfo).forEach((ukey) => {
                                            udetails[ukey] = uinfo[ukey]
                                        })
                                        fdetails.upgrade = udetails
                                    } else {
                                        fdetails[fkey] = finfo[fkey]
                                    }
                                })
                                details.firmware = fdetails;
                            } else {
                                details[key] = info[key];
                            }
                        })
                        gateway.set('details', JSON.stringify(details));
                        return gateway.save();
                    }).then(() => {
                        resolve();
                    }).catch((err) => {
                        var msg = { level: 'error', text: 'Something went wrong on saving gateways:' + uuid + '. Error: ' + err };
                        if (global.process.send) {
                            global.process.send({ type: 'log', data: msg });
                        } else {
                            console.log(msg.text);
                        }
                        resolve()
                    })
                    break;
            }
        })
    },

    DevicesEventHandler: function (uuid, data, callBackFn) {

        return new Promise((resolve, reject) => {
            var self = this;
            if (['update', 'log'].includes(data.type)) {
                return;
            }
            data = JSON.parse(data);
            var event_type = undefined;
            var event_value = data.data;
            var regHistory = false;
            var dev = undefined;
            Device.where({ uuid: uuid }).fetch({ withRelated: ['group'] }).then((device) => {
                dev = device;
                var dt = {}
                if (!device && data.type !== 'delete') {
                    var msg = { level: 'error', text: 'Cannot find device with uuid: ' + uuid };
                    if (global.process.send) {
                        global.process.send({ type: 'log', data: msg });
                    } else {
                        console.log(msg.text);
                    }
                    return;
                }
                switch (data.type) {
                    case 'status':
                    case 'onoff':
                    case 'onOff':
                    case "motion":
                    case "occupancy":
                        event_type = 'status-update';
                        device.set('status', data.data);
                        regHistory = device.hasChanged('status');
                        break;
                    case 'state':
                        event_type = 'state-update';
                        device.set('state', data.data);
                        regHistory = device.hasChanged('state');
                        break;
                    case 'update':
                        break;
                    case 'delete':
                        break;
                    default:
                        event_type = data.type + '-update';
                        var details = device.get('details') ? JSON.parse(device.get('details')) : {};
                        details[data.type] = data.data;
                        device.set('details', JSON.stringify(details));
                        regHistory = device.hasChanged('details');
                        break;
                }
                if (data.type !== 'delete') {
                    device.save().then((device) => {
                        dev = device;
                        return Device.where({ uuid: device.get("uuid") }).fetch({ withRelated: ['group'] });
                    }).then((_device) => {
                        return _device.related('group').fetch({ withRelated: 'scene' });
                    }).then((group) => {
                        if (group) {
                            dt.position = { group: group.get('name'), scene: group.related('scene').get('name') };
                            group.related('scene').fetch({ withRelated: 'zone' }).then((scene) => {
                                dt.position.zone = scene.related('zone').get('name');
                                return scene.related('zone').fetch({ withRelated: 'location' })
                            }).then((zone) => {
                                dt.position.location = zone.related('location').get('name');
                                return self.RegisterObjectEventHistory(dev, 'device', event_type, event_value, dt, regHistory);
                            }).then(() => {
                                resolve()
                            }, (error) => {
                                resolve();
                            })
                        } else {
                            self.RegisterObjectEventHistory(dev, 'device', event_type, event_value, {}, regHistory).then(() => {
                                resolve()
                            }, (error) => {
                                resolve();
                            })
                        }
                    }).catch((err) => {
                        var msg = { level: 'error', text: 'Something went wrong on saving devices:' + uuid + '. Error: ' + err };
                        if (global.process.send) {
                            global.process.send({ type: 'log', data: msg });
                        } else {
                            console.log(msg.text);
                        }
                        resolve()
                    });
                } else if (device) {
                    var msg = { level: 'warn', text: 'delete received for non destroyed device with uuid: ' + uuid + '. Device removed from provider but still tracked?' };
                    if (global.process.send) {
                        global.process.send({ type: 'log', data: msg });
                    } else {
                        console.log(msg.text);
                    }
                    //device.destroy();
                    resolve()
                }
            }).catch((err) => {
                var msg = { level: 'error', text: 'Something went wrong on fetching devices:' + uuid + '. Error: ' + err };
                if (global.process.send) {
                    global.process.send({ type: 'log', data: msg });
                } else {
                    console.log(msg.text);
                }
                resolve()
            });
        })
    }
};

(new IoTServerWatchdog(config.host, 3000))
    .init();
