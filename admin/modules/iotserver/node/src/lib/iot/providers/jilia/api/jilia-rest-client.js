const log = require('../../../../log');
function callRestMethod(client, method, args) {

    return new Promise(function (resolve, reject) {
        var req = client.methods[method](args, function (data, response) {
            //console.log(response);
            if (Buffer.isBuffer(data)) {
                try {
                    data = JSON.parse(data.toString());
                    resolve(data);
                } catch (error) {
                    log.error(data.toString());
                    reject(error);
                }
            } else {
                resolve(data);
            }
        });

        req.on('requestTimeout', function (req) {
            err = method + ': Request timeout has expired, client timeout. Make sure server is listening.';
            reject(err);
            req.abort();
        });

        req.on('responseTimeout', function (res) {
            err = method + ': Response timeout has expired.';
            reject(err);
        });

        req.on('error', function (err) {
            reject(err);
        });
    });
}

function getApiToken(client, key, secret) {

    var args = {
        data: { grant_type: "client_credentials" },
        parameters: { grant_type: "client_credentials" },
        headers: { "Content-Type": "application/x-www-form-urlencoded", "Authorization": 'Basic ' + Buffer.from(key + ':' + secret).toString('base64') }
    };
    return callRestMethod(client, 'accesstoken', args);
}


function getServers(client, token) {
    var args = {
        headers: { "Authorization": 'Bearer ' + token }
    };
    return callRestMethod(client, 'listServers', args);
}

function getServerDevices(client, token, server) {
    var args = {
        path: { "serverName": server }, // path substitution var
        headers: { "Authorization": 'Bearer ' + token }
    };
    return callRestMethod(client, 'listDevices', args);
}

function getDeviceInfo(client, token, server, deviceId) {
    var args = {
        path: { "serverName": server, "deviceId": deviceId }, // path substitution var
        headers: { "Authorization": 'Bearer ' + token }
    };
    return callRestMethod(client, 'getDevice', args);
}

function customizeDevice(client, token, server, device, customData) {
    var args = {
        data: customData,
        path: { "serverName": server, "deviceId": device }, // path substitution var
        headers: { "Content-Type": "application/json", "Authorization": 'Bearer ' + token }
    };
    return callRestMethod(client, 'removeDevice', args);
}

function deleteDevice(client, token, server, device) {
    var args = {
        path: { "serverName": server, "deviceId": device }, // path substitution var
        headers: { "Authorization": 'Bearer ' + token }
    };
    return callRestMethod(client, 'removeDevice', args);
}

function runDeviceAction(client, token, server, device, params) {
    var args = {
        data: params,
        parameters: params,
        path: { "serverName": server, "deviceId": device }, // path substitution var
        headers: { "Content-Type": "application/x-www-form-urlencoded", "Authorization": 'Bearer ' + token }
    };
    return callRestMethod(client, 'updateDevice', args);
}



function JiliaDevice(type, name, id, properties, actions) {
    this.type = type;
    this.id = id;
    this.name = name;
    this.properties = properties;
    this.actions = actions;
}

const RestClient = require('node-rest-client').Client;
function JiliaRestClient(key, secret, url, logger = null) {
    this.key = key;
    this.secret = secret;
    this.logger = logger;
    this.baseUrl = url;
    this.id = Math.random();
    var options = {
        // will replace content-types used to match responses in JSON and XML parsers
        mimetypes: {
            json: ["application/json", "application/json;charset=utf-8"],
            xml: ["application/xml", "application/xml;charset=utf-8"]
        },
    };
    this.client = new RestClient(options);

    // register remote methods
    this.client.registerMethod("accesstoken", this.baseUrl + '/oauth/accesstoken', "POST");
    this.client.registerMethod("listServers", this.baseUrl, "GET");
    this.client.registerMethod("listDevices", this.baseUrl + '/servers/${serverName}', "GET");
    this.client.registerMethod("getDevice", this.baseUrl + '/servers/${serverName}/devices/${deviceId}', "GET");
    this.client.registerMethod("customizeDevice", this.baseUrl + '/servers/${serverName}/devices/${deviceId}', "PUT");
    this.client.registerMethod("removeDevice", this.baseUrl + '/servers/${serverName}/devices/${deviceId}', "DELETE");
    this.client.registerMethod("updateDevice", this.baseUrl + '/servers/${serverName}/devices/${deviceId}', "POST");
    this.servers = [];
    this.devices = {};
}

JiliaRestClient.prototype = {
    log: function () {
        let str = '',
            i = -1,
            length = arguments.length;
        while (++i < (length - 1)) {
            if (typeof arguments[i] == 'object') {
                str += JSON.stringify(arguments[i]) + ' ';
            }
            else {
                str += arguments[i] + ' ';
            }
        }
        if (this.logger) {
            this.logger.info(str + arguments[i]);
        } else {
            log.info(str + arguments[i]);
        }
    },
    setToken: function (data) {

        JiliaRestClient.prototype.token = data.access_token;
        if (JiliaRestClient.prototype.token_expiry_timeout !== null) {
            clearTimeout(JiliaRestClient.prototype.token_expiry_timeout);
            JiliaRestClient.prototype.token_expiry_timeout = null;
        }

        JiliaRestClient.prototype.token_expiry_timeout = setTimeout(() => {
            JiliaRestClient.prototype.token_expiry_timeout = null;
        }, 1000 * (parseInt(data.expires_in) - 60));
        this.log('Retrieved token: ' + JiliaRestClient.prototype.token, 1000 * (parseInt(data.expires_in) - 60));
    },

    refreshApiToken: function () {
        return new Promise((resolve, reject) => {
            if (JiliaRestClient.prototype.token === null || JiliaRestClient.prototype.token_expiry_timeout === null) {
                getApiToken(this.client, this.key, this.secret).then((data) => {
                    this.setToken(data);
                    resolve(JiliaRestClient.prototype.token);
                })
                    .catch((message) => {
                        message = 'ERROR on getApiToken: ' + message;
                        this.log(message);
                        reject(message);
                    });
            } else {
                //this.log('Using token: ' + JiliaRestClient.prototype.token);
                resolve(JiliaRestClient.prototype.token);
            }
        });
    },

    getServers: function () {
        return new Promise((resolve, reject) => {
            this.refreshApiToken().then((token) => {
                getServers(this.client, this.token)
                    .then((data) => {
                        this.servers = [];
                        data.links.forEach((link) => {
                            if (typeof link.title !== 'undefined') {
                                this.servers.push(link.title);
                            }
                        });
                        resolve(this.servers);
                    })
                    .catch((message) => {
                        message = 'ERROR on getServers: ' + message;
                        this.log(message);
                        reject(message);
                    });
            })
                .catch((message) => {
                    this.log(message);
                    reject(message);
                });
        });
    },

    getDevices: function (serverName) {
        return new Promise((resolve, reject) => {
            this.refreshApiToken().then((token) => {
                getServerDevices(this.client, token, serverName)
                    .then((data) => {
                        this.devices[serverName] = [];
                        var counts = { 'contact': 1, 'door-lock': 1, 'occupancy': 1, 'water': 1, 'switch': 1, 'device': 1, 'light': 1 };
                        data.entities.forEach((entity) => {
                            var name = entity.properties.name;
                            var type = entity.class[1];

                            if (!name) {
                                switch (type) {
                                    case 'contact':
                                    case 'door-lock':
                                    case 'occupancy':
                                    case 'water':
                                    case 'switch':
                                    case 'light':
                                        name = type + '_' + counts[type];
                                        counts[type]++;
                                        break;
                                    default:
                                        name = 'device_' + counts['device'];
                                        counts['device']++;
                                        break;
                                }
                            }
                            this.devices[serverName].push(new JiliaDevice(type, name, entity.properties.id, entity.properties, []));
                        });
                        resolve(this.devices[serverName]);
                    })
                    .catch((message) => {
                        message = 'ERROR on getServerDevices: ' + message;
                        this.log(message);
                        reject(message);
                    })
            })
                .catch((message) => {
                    message = 'ERROR on refreshApiToken: ' + message;
                    this.log(message);
                    reject(message);
                });
        });
    },

    getDevice: function (serverName, deviceId, deviceData = null) {
        return new Promise((resolve, reject) => {
            this.refreshApiToken().then((token) => {
                var device = undefined;
                getDeviceInfo(this.client, token, serverName, deviceId).then((data) => {
                    if (this.devices[serverName]) {
                        device = this.devices[serverName].find(x => x.id === deviceId);
                    } else {
                        var name = data.properties.name ? data.properties.name : data.properties.type + "_" + (Math.floor((Math.random() * 100) + 100)).toString();
                        device = new JiliaDevice(data.properties.type, name, data.properties.id, data.properties, []);
                    }
                    device.properties = data.properties;
                    device.properties.provider = 'jilia';
                    device.actions = [];
                    if (data.actions) {
                        data.actions.forEach((action) => {
                            device.actions.push(action.name);
                        });
                    }
                    resolve(device);
                }).catch((message) => {
                    message = 'ERROR on getDeviceInfo: ' + message;
                    reject(message);
                    this.log(message);
                });
            }).catch((message) => {
                message = 'ERROR on refreshApiToken: ' + message;
                this.log(message);
            });
        });
    },

    removeDevice: function (device) {
        this.refreshApiToken().then((token) => {
            var serverName = device.get("gateway_uuid");
            var deviceId = device.get("uuid");
            deleteDevice(this.client, token, serverName, deviceId);
        })
            .catch((message) => {
                this.log(message);
            });
    },

    pairDevice: function (device) {
        return new Promise((resolve, reject) => {
            var self = this;
        })
    },

    addDevice: function (devInfo) {
        var deviceType = devInfo.type;
        var serverName = devInfo.gateway_uuid;
        var duration = devInfo.duration;
        this.refreshApiToken().then((token) => {
            this.getDevices(serverName).then((devices) => {
                var zigbeeDevice = devices.find(x => x.type === 'zigbee-service');
                var params = { action: "PermitJoining", duration: duration, discoverAllEndpoints: 0, broadcast: 0 };
                runDeviceAction(this.client, token, serverName, zigbeeDevice.id, params);
            }).catch((message) => {
                this.log(message);
            });
        }).catch((message) => {
            this.log(message);
        });
    },

    addGateway: function (location, identifier, gwName, duration) {
        return new Promise((resolve, reject) => {
            this.refreshApiToken().then((token) => {
                this.getServers().then((servers) => {
                    var data = undefined;
                    servers.forEach((sever) => {
                        if (server == identifier) {
                            var name = gwName;
                            var id = server;
                            var properties = { phyId: identifier, provider: "jilia" };
                            data = { uuid: id, name: name, provider: 'jilia', location_uuid: location, actions: '[]', details: JSON.stringify(properties) };
                        }
                    });
                    resolve(data);
                }).catch((err) => {
                    reject(err);
                });
            }).catch((err) => {
                reject(err);
            });
        });
    },

    removeGateway: function (gateway) {
        return new Promise((resolve, reject) => {
            resolve(gateway);
        });
    },

    updateGateway: function (gateway) {
        return new Promise((resolve, reject) => {
            resolve(gateway);
        });
    },

    updateDevice: function (device) {
        return new Promise((resolve, reject) => {
            resolve(device);
        });
    },

    /*
    properties: {"property_name1": "property_value1", "property_name2": "property_value2", ...}
    */
    setDeviceProperties: function (serverName, deviceId, properties) {
        this.refreshApiToken().then((token) => {
            customizeDevice(this.client, token, serverName, deviceId, properties);
        })
            .catch((message) => {
                this.log(message);
            });
    },

    /*
    params: {action: "action_name", "action_param1_name": "action_param1_value", "action_param2_name": "action_param2_value", ...}
    */
    updateDevice: function (serverName, deviceId, params) {
        this.refreshApiToken().then((token) => {
            return runDeviceAction(this.client, token, serverName, deviceId, params);
        }).catch((message) => {
            this.log(message);
        });
    },

    autoAddDevices: function (gateway, duration = "120") {
        return new Promise((resolve, reject) => {
            resolve(gateway);
        });
    },

    //group format => {"type": <groupType>, 
    //                 "action": <groupAction> , 
    //                 "devices": [{ "id": <uuid>, "gateway": <gatewayId>, "type":<deviceType>}]}
    updateGroup: function (group) {

        log.debug(JSON.stringify(group));

        var device_type = null;
        var device_type_actions = {
            "door-lock": ["Lock", "Unlock"],
            "light": ["Off", "On"],
            "shade": ["Open", "Close"]
        };
        var params = {};
        params['action'] = group.action;
        switch (group.type) {
            case "Door":
                device_type = "door-lock";
                params['pin'] = '1234';
                break;
            case "Light":
                device_type = "light";
                break;
            case "Shade":
                device_type = "shade";
                break;
            //case "Switch":
            //case "Sensor":
            //device_type = "switch";
            //break;
        }

        if (device_type != null && device_type_actions[device_type].includes(group.action)) {
            devices_to_update = group.devices.filter(x => x.type === device_type);
            devices_to_update.forEach((device) => {
                log.debug("Sending command " + group.action + " to device " + device.id + " on server " + device.gateway);
                this.updateDevice(device.gateway, device.id, params);
            });

        }

    },

    doAction: function (action, device, actionParams) {

        return new Promise((resolve, reject) => {
            var params = {};
            var properties = actionParams['properties'];
            params['action'] = action;
            if (properties[action + "_params"]) {
                if (Array.isArray(properties[action + "_params"])) {
                    properties[action + "_params"].forEach((action_param) => {
                        params[action_param.name] = action_param.value;
                    });
                } else {
                    params[properties[action + "_params"].name] = properties[action + "_params"].value;
                }
            }
            this.updateDevice(device.get("gateway_uuid"), device.get("uuid"), params).then(() => {
                resolve(true);
            }).catch((err) => {
                reject(err);
            });
        });
    },
    getFirmwareVersion: function (gw) {
        return new Promise((resolve) => {
            resolve({})
        })
    }

};

JiliaRestClient.prototype.token = null;
JiliaRestClient.prototype.token_expiry_timeout = null;

exports.JiliaRestClient = JiliaRestClient
