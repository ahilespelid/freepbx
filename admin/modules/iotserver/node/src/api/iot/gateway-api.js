//const Location = require('../../models/Location.js');
const Device = require('../../models/Device.js');
const DeviceAPI = require('./device-api.js');
const Gateway = require('../../models/Gateway.js');
const Location = require('../../models/Location.js');
const dispatcher = require('../../lib/iot/event-dispatcher.js');
const config = require('config');
const log = require('../../lib/log');
const typeToProvidersMap = {
    develco: { type: "IoT Gateway", model: "DP09" },
    cyberdata_controller: { type: "Network Strike Controller", model: "11375" },
    cyberdata_intercom: { type: "SIP h.264 Video Outdoor Intercom with Keypad", model: "11414" }
}


const modelToProvidersMap = {
    'MGW101-DP06': 'develco', 'DP06': 'develco', 'MGW101-DP09': 'develco', 'DP09': 'develco', 'DP08': 'develco',
    'MGW101-DP08': 'develco', 'develco': 'develco', '11375': 'cyberdata', '11414': 'cyberdata', 'cyberdata': 'cyberdata', 'jilia': 'jilia'
}


const providersToTypeMap = { "IoT Gateway": "develco", "Network Strike Controller": "cyberdata_controller", "SIP h.264 Video Outdoor Intercom with Keypad": "cyberdata_intercom" }

function getAll(filter_ids = null, return_type = false) {
    return new Promise((resolve, reject) => {
        var qb = Gateway;
        if (filter_ids) {
            qb = qb.where('uuid', 'in', filter_ids);
        }

        var relations = undefined;
        if (!return_type) {
            relations = ['devices'];
        } else {
            relations = [];
        }


        qb.fetchAll({ withRelated: relations }).then((gateways) => {
            var _gateways = gateways ? gateways.toJSON() : [];
            _gateways.forEach((gateway) => {
                gateway.objtype = 'gateways';
                gateway.details = gateway.details ? JSON.parse(gateway.details) : {};
                gateway.details.model = gateway.details.model ? gateway.details.model : '';
                var gwInfo = undefined;
                if (gateway.provider == 'cyberdata' && gateway.details.model == '11414') {
                    gwInfo = typeToProvidersMap['cyberdata_intercom'];
                } else if (gateway.provider == 'cyberdata') {
                    gwInfo = typeToProvidersMap['cyberdata_controller'];
                } else {
                    gwInfo = typeToProvidersMap[gateway.provider];
                }
                gateway.provider = gwInfo.type;
                gateway.details.model = gwInfo.model;
            });

            if (!return_type) {
                resolve(_gateways);
            } else {
                resolve({ gateways: _gateways });
            }
        });
    });
}

module.exports.getAll = (return_type = false) => {
    return getAll(null, return_type);
}

module.exports.getAllByType = (type) => {
    return new Promise((resolve, reject) => {
        var provider = providersToTypeMap[type] ? providersToTypeMap[type] : null;
        if (!provider) {
            return resolve([]);
        }
        Gateway.where('provider', '=', provider).fetchAll().then((gateways) => {
            resolve(gateways.toJSON());
        }).catch((err) => {
            reject(err);
        });
    })
}

module.exports.getProviders = () => {
    return new Promise((resolve, reject) => {
        var providers = [];
        config.iot.providers.forEach((provider) => {
            if (provider.name === 'cyberdata') {
                providers.push(typeToProvidersMap['cyberdata_controller']);
                providers.push(typeToProvidersMap['cyberdata_intercom']);
            } else if (provider.name !== 'simulator') {
                providers.push(typeToProvidersMap[provider.name])
            }
        });
        resolve(providers)
    });
}

module.exports.getGateway = (gateway_uuid) => {

    return new Promise((resolve, reject) => {
        getAll([gateway_uuid]).then((gateway) => {
            resolve(gateway);
        })
    });
}

module.exports.addGateway = (data, iotManager) => {
    return new Promise((resolve, reject) => {
        var identifier = undefined;
        var self = this;
        var model = undefined;
        if (!data.location_uuid) {
            reject('Unspecified gateway location');
        } else if (!data.gateway_identifier) {
            reject('Unspecified gateway identifier');
        } else if (!data.provider || !['jilia', 'develco', 'cyberdata', 'MGW101-DP06', 'DP06', 'MGW101-DP09', 'DP09', 'MGW101-DP08', 'DP08', '11375', '11414'].includes(data.provider)) {
            reject('Unspecified or Unsupported iot provider')
        } else {
            model = data.provider;
            data.provider = modelToProvidersMap[model];
            Location.where({ uuid: data.location_uuid }).fetch().then((location) => {
                if (!location) {
                    reject("Unknown location " + data.location_uuid);
                } else {
                    var provider = iotManager.getProvider(data.provider);
                    if (!provider) {
                        reject("Unsupported provider " + data.provider);
                    } else {
                        identifier = data.gateway_identifier;
                        if (typeof identifier === 'string' && identifier.startsWith("|")) {
                            var arr_msg = identifier.toString().split('|');
                            identifier = arr_msg[1];
                        } else if (typeof identifier !== 'string' && identifier.SN) {
                            identifier = identifier.SN;
                        }
                        data.gateway_identifier = identifier;

                        if (data.provider === 'cyberdata') {
                            // for cyberdata provider we need to know the model of gateway to instantiate
                            data.gateway_identifier = data.gateway_identifier + ':' + model;
                        }


                        provider.api.addGateway(data.location_uuid, data.gateway_identifier, data.name, 10).then((gwData) => {
                            if (!gwData) {
                                reject('Failed to add gateway');
                            } else {
                                if (data.name) {
                                    gwData.name = data.name;
                                }
                                gwData.org_id = location.get("org_id");
                                if (gwData.details && typeof gwData.details !== 'string') {
                                    data.details = JSON.stringify(data.details);
                                }
                                var gw = new Gateway(gwData);
                                gw.save().then((gateway) => {
                                    return getAll([gateway.get("uuid")]);
                                }).then((_gw) => {
                                    dispatcher.updateIoTList('gateway', _gw[0], 'insert', true);

                                    if (data.provider === 'cyberdata' && ["11414"].includes(model)) {
                                        // for sip intercom gateways we need to add the intercom device 
                                        // right away after adding the gateway
                                        var devInfo = { type: 'intercom', gateway_uuid: _gw[0].uuid, duration: 60, physical_id: '', device_position: 0 };
                                        provider.api.addDevice(devInfo)
                                    }
                                    resolve(_gw);
                                }).catch((err) => {
                                    reject(err);
                                });
                            }
                        }).catch((err) => {
                            reject(err);
                        });
                    }
                }
            }).catch((err) => {
                reject(err);
            });
        }
    });
}

module.exports.updateGateway = (gateway_uuid, iotManager, data) => {
    return new Promise((resolve, reject) => {
        Gateway.where({ uuid: gateway_uuid }).fetch({ withRelated: ['devices'] }).then((gateway) => {
            if (!gateway) {
                reject("Unknown gateway " + gateway_uuid);
            } else {
                var provider = iotManager.getProvider(gateway.get("provider"));
                if (!provider) {
                    reject("Unknown provider " + gateway.get("provider"));
                } else {
                    Object.keys(data).forEach(function (key) {

                        if (key == 'details') {
                            let details = JSON.parse(gateway.get('details'));
                            Object.keys(data.details).forEach(function (skey) {
                                // if skey is firmware, make sure we keep using the current value for
                                // those fields that are not coming in data.details.firmware
                                if (skey == "firmware") {
                                    details[skey] = {
                                        ...details[skey],
                                        ...data.details[skey],
                                        upgrade: {
                                            ...details[skey].upgrade,
                                            ...data.details[skey].upgrade
                                        }
                                    }
                                }
                                else
                                    details[skey] = data.details[skey]
                            });
                            gateway.set(key, JSON.stringify(details))
                        } else if (key !== 'provider') {
                            gateway.set(key, data[key]);
                        }
                    });
                    gateway.save().then((gateway) => {
                        return provider.api.updateGateway(gateway);
                    }).then((gateway) => {
                        return getAll([gateway_uuid]);
                    }).then((_gw) => {
                        dispatcher.updateIoTList('gateway', _gw[0], 'update', true);
                        resolve(_gw[0]);
                    }).catch((error) => {
                        reject(error);
                    });
                }
            }
        }).catch((error) => {
            reject(error);
        });
    });
}

module.exports.enableDiscoveryMode = (gateway_uuid, iotManager, data) => {
    return new Promise((resolve, reject) => {
        Gateway.where({ uuid: gateway_uuid }).fetch({ withRelated: ['devices'] }).then((gateway) => {
            if (!gateway) {
                reject("Unknown gateway " + gateway_uuid);
                return;
            }

            if (gateway.get("state") !== 'ready' && data.enable) {
                reject("Cannot enable discovery mode on gateway with state " + gateway.get("state"));
                return;
            }
            let details = JSON.parse(gateway.get("details")),
                { firmware: { upgrade } } = details.firmware ? details : { firmware: {} };
            if (upgrade != undefined && upgrade.action_flag != null) {
                reject("Cannot enable discovery mode because the gateway is being updated.");
                return;
            }
            var provider = iotManager.getProvider(gateway.get("provider"));
            if (!provider) {
                reject("Unknown provider " + gateway.get("provider"));
                return;
            }
            data.timeout = data.timeout ? data.timeout.toString() : "600";
            return provider.api.autoAddDevices(gateway, data.timeout, data.enable);
        }).then((gateway) => {
            resolve(gateway.toJSON());
        }).catch((error) => {
            reject(error);
        });
    })
}

module.exports.removeGatewayImpl = (gateway, iotManager) => {
    return new Promise((resolve, reject) => {
        var self = this;
        if (!gateway) {
            resolve();
            return;
        }
        var _gateway = gateway.toJSON();
        var provider = iotManager.getProvider(gateway.get("provider"));
        if (!provider) {
            reject("Unknown provider " + gateway.get("provider"));
        } else {
            var q = require('q');
            var promises = [];
            // get all devices that belongs to this gateway
            Device.where({ gateway_uuid: gateway.get("uuid") }).fetchAll().then((devices) => {
                devices.forEach((device) => {
                    promises.push(DeviceAPI.removeDeviceImpl(device, iotManager));
                })
                return q.all(promises);
            }).then(() => {
                return provider.api.removeGateway(gateway);
            }).then((gateway) => {
                return gateway.destroy();
            }).then(() => {
                dispatcher.updateIoTList('gateway', _gateway, 'delete', true);
                resolve(_gateway);
            }).catch((err) => {
                reject(err);
            });
        }
    });
}

module.exports.removeGateway = (gateway_uuid, iotManager) => {
    return new Promise((resolve, reject) => {
        var self = this;
        Gateway.where({ uuid: gateway_uuid }).fetch({ withRelated: ['devices'] }).then((gateway) => {
            return self.removeGatewayImpl(gateway, iotManager);
        }).then((gateway) => {
            resolve(gateway);
        }).catch((err) => {
            reject(err);
        });
    });
}


module.exports.removeAllGateways = (iotManager) => {
    return new Promise((resolve, reject) => {
        var self = this;
        var q = require('q');
        var promises = [];
        Gateway.fetchAll({ withRelated: ['devices'] }).then((gateways) => {
            gateways.forEach((gateway)=>{
                promises.push(self.removeGatewayImpl(gateway, iotManager))
            })
            return q.all(promises);
        }).then(()=>{
            resolve();
        }).catch((err) => {
            reject(err);
        });
    })
}

module.exports.checkInstallationProcess = (gateway_uuid) => {
    return new Promise((resolve, reject) => {
        Gateway.where({ uuid: gateway_uuid }).fetch().then((gateway) => {
            if (!gateway) {
                return reject("Unknown gateway " + gateway_uuid);
            }
            let _gateway = gateway.toJSON(),
                details = JSON.parse(_gateway.details);
            if (details.firmware && details.firmware.upgrade) {
                resolve({
                    uuid: gateway_uuid,
                    install_process: details.
                        firmware.upgrade.status,
                    details: details.firmware.upgrade.details,
                    state: _gateway.state,
                    action: details.firmware.upgrade.action_flag,
                    current_version: details.firmware.version,
                    previous_version: details.firmware.previous_version,
                    available_version: details.firmware.upgrade.version
                });
            }
            else
                reject("Not upgrade information defined.");
        });
    });
}
module.exports.installFirmwareGateway = (gateway_uuid, iotManager) => {
    return new Promise((resolve, reject) => {
        Gateway.where({ uuid: gateway_uuid }).fetch().then((gateway) => {
            if (!gateway) {
                return reject("Unknown gateway " + gateway_uuid);
            }
            let provider = iotManager.getProvider(gateway.get("provider")),
                _gateway = gateway.toJSON()
            details = JSON.parse(_gateway.details);

            if (!provider) {
                return reject("Unknown provider " + gateway.get('provider'));
            }
            if (!details.firmware || !details.firmware.upgrade) {
                return reject("Not able to install firmware, there is no upgrade information in gateway details");
            }
            return provider.api.installFirmwareGateway(_gateway);
        }).then(resolve).catch(reject);
    })
}

module.exports.setGatewayDebug = (gateway_uuid, iotManager, data) => {
    return new Promise((resolve, reject) => {
        var self = this;
        if (!data || !data.mode || !['on', 'off'].includes(data.mode)) {
            return reject("Unsupported operation");
        }
        Gateway.where({ uuid: gateway_uuid }).fetch().then((gateway) => {
            if (!gateway) {
                return reject("Unknown gateway " + gateway_uuid);
            }
            var provider = iotManager.getProvider(gateway.get("provider"));
            if (!provider) {
                return reject("Unknown provider " + gateway.get("provider"));
            }
            return provider.api.setDebugMode(gateway, data.mode);
        }).then(() => {
            resolve();
        }).catch((err) => {
            reject(err);
        });
    });
}


module.exports.getGatewayDebug = (gateway_uuid, iotManager) => {
    return new Promise((resolve, reject) => {
        var self = this;
        Gateway.where({ uuid: gateway_uuid }).fetch().then((gateway) => {
            if (!gateway) {
                return reject("Unknown gateway " + gateway_uuid);
            }
            var provider = iotManager.getProvider(gateway.get("provider"));
            if (!provider) {
                return reject("Unknown provider " + gateway.get("provider"));
            }
            return provider.api.getDebugMode(gateway);
        }).then((data) => {
            resolve(data);
        }).catch((err) => {
            reject(err);
        });
    });
}


module.exports.getGatewayLogs = (gateway_uuid, iotManager) => {
    return new Promise((resolve, reject) => {
        var self = this;

        Gateway.where({ uuid: gateway_uuid }).fetch().then((gateway) => {
            if (!gateway) {
                return reject("Unknown gateway " + gateway_uuid);
            }
            var provider = iotManager.getProvider(gateway.get("provider"));
            if (!provider) {
                return reject("Unknown provider " + gateway.get("provider"));
            }
            return provider.api.getDebugLogs(gateway);
        }).then((data) => {
            resolve(data);
        }).catch((err) => {
            reject(err);
        });
    });
}

module.exports.getProviderByType = (type) => {
    let remap = {};
    Object.keys(providersToTypeMap).forEach(key => {
        remap[providersToTypeMap[key]] = key;
    });
    return remap[type];
}

module.exports.getProviderType = (provider) => {
    return providersToTypeMap[provider];
}