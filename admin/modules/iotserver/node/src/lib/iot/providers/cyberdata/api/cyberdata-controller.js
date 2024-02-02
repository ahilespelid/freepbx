const dgram = require('dgram');
const WSClient = require('websocket').client;
const log = require('../../../../log');
const Gateway = require('../../../../../models/Gateway.js');
const { EventEmitter } = require('events');
const util = require("util");
const xmlParser = require('xml2js').parseString;
const uuidv4 = require('uuid/v4');
const crypto = require('crypto');
const iv = Buffer.from([]);
const net = require('net');

function CyberDataDevice(type, name, id, properties, actions) {
    this.type = type;
    this.id = id;
    this.name = name;
    this.properties = properties;
    this.actions = actions;
}

function _encrypt(raw, key64) {
    var key = Buffer.from(key64, 'hex');
    var plainText = Buffer.from(raw, 'utf8');
    var cipher = crypto.createCipheriv('aes-256-ecb', key, iv);
    var crypted = Buffer.concat([cipher.update(plainText), cipher.final()]);
    return crypted;
}

function _decrypt(enc, key64) {
    var key = Buffer.from(key64, 'hex');
    var decipher = crypto.createDecipheriv('aes-256-ecb', key, iv);
    decipher.setAutoPadding(false);
    var dec = Buffer.concat([decipher.update(enc), decipher.final()]);
    return dec.toString('utf8');
}

function _connect(socket, local_ip, local_port, is_broadcast) {
    return new Promise((resolve, reject) => {
        socket.bind(local_port, () => {
            socket.setBroadcast(is_broadcast);
            resolve(socket)
        });
    });
}

function _disconnect(socket) {
    if (socket) {
        socket.close();
    }
    socket = undefined;
}

function _send(socket, data, device_port, device_ip) {
    return new Promise((resolve, reject) => {
        socket.send(data, device_port, device_ip, (err) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    })
}

function _send_and_get_response(data, device_ip, device_port, local_ip, local_port, is_broadcast, crypto_key = null, timeout = 0) {
    return new Promise((resolve, reject) => {
        var socket = dgram.createSocket('udp4');
        var timer = null;
        var res = "";

        if (!is_broadcast && timeout === 0) {
            timeout = 10;
            log.debug("Forcing " + timeout + " seconds timeout for non broadcast commands")
        }
        socket.on('error', (err) => {
            if (timer) {
                log.debug("Clearing command timer");
                clearTimeout(timer);
                timer = null;
            }
            log.error(`socket error:\n${err.stack}`);
            _disconnect(socket);
        });

        socket.on('close', (err) => {
            if (timer) {
                log.debug("Clearing command timer");
                clearTimeout(timer);
                timer = null;
            }
            log.debug(`socket close`);
            socket = null;
        });

        socket.on('message', (msg, rinfo) => {
            var response = msg;
            if (crypto_key !== null) {
                log.debug("Decrypting data");
                response = _decrypt(response, crypto_key);
            }

            if (is_broadcast) {
                log.debug("receiver got broadcast answer : " + response + "from " + rinfo.address + ":" + rinfo.port);
                if (res === "") {
                    res = [];
                }
                xmlParser(response, (err, result) => {
                    if (!err) {
                        if (result.XML && result.XML.PacketType == 'Response') {
                            res.push(result.XML);
                            if (!timer) {
                                _disconnect(socket);
                                resolve(res);
                            }
                        }
                    }
                });
            } else {
                res = response;
                if (timer) {
                    log.debug("Clearing command timer");
                    clearTimeout(timer);
                    timer = null;
                }
                log.debug("receiver got answer : " + response + "from " + rinfo.address + ":" + rinfo.port);
                _disconnect(socket);
                resolve(response);
            }
        });

        _connect(socket, local_ip, local_port, is_broadcast).then((socket) => {
            log.debug("Sending data: " + data + " to " + device_ip + ":" + device_port);
            if (crypto_key !== null) {
                log.debug("Encrypting data");
                data = _encrypt(data, crypto_key);
            }

            _send(socket, data, device_port, device_ip).then(() => {
                // we were successfull sending let's schedule a timeout to not wait indefinitivelly for the response
                if (timeout > 0) {
                    timer = setTimeout(() => {
                        if (is_broadcast) {
                            log.warn("Broadcast Command Timeout expired");
                            _disconnect(socket);
                            resolve(res);
                        } else {
                            // retry one more time for non broadcast commands
                            _send(socket, data, device_port, device_ip).then(() => {
                                log.warn("Command Timeout expired, retrying");
                                timer = setTimeout(() => {
                                    log.warn("Command Timeout expired");
                                    _disconnect(socket);
                                    resolve(res);
                                }, 1000 * (parseInt(timeout)));

                            }).catch((err) => {
                                log.error(err);
                                reject(err);
                            });
                        }
                    }, 1000 * (parseInt(timeout)));
                } else {
                    timer = null;
                }

            }).catch((err) => {
                log.error(err);
                reject(err);
            });
        }).catch((err) => {
            reject(err);
        });
    });
}

function _runCommand(serial, ip, port, crypto_key, command, value, timeout = 0) {
    return new Promise((resolve, reject) => {
        var status = _getStatus(serial, ip, port, crypto_key);
        status.then((status) => {
            var arr_message = status.toString().split('|');
            var nonce = arr_message[2];
            var data = 'LOCK' + serial + '|' + nonce + '|' + command;
            if (value !== null && value !== undefined) {
                data = data + '|' + value + '\n';
            } else {
                data = data + '\n';
            }
            return _send_and_get_response(data, ip, port, null, port, false, crypto_key, timeout);
        }).then((status) => {
            resolve(status);
        }).catch((err) => {
            reject(err);
        })
    });
}


function _getStatus(serial, ip, port, crypto_key, timeout = 0) {
    var data = 'LOCK' + serial + '|ABCDEF|status\n';
    return _send_and_get_response(data, ip, port, null, port, false, crypto_key, timeout);
}

function _getFullStatus(serial, ip, port, crypto_key) {
    return _runCommand(serial, ip, port, crypto_key, 'status2', null);
}

function _setEncryption(value, serial, ip, port, old_crypto_key, new_crypto_key) {
    return new Promise((resolve, reject) => {
        var cmdVal = value;
        if (value !== 'off') {
            cmdVal = 'off';
        }
        _runCommand(serial, ip, port, old_crypto_key, 'encryption', cmdVal).then((status) => {
            if (value === 'off') {
                resolve(status);
            } else {
                _runCommand(serial, ip, port, null, 'key', new_crypto_key).then((status) => {
                    return _runCommand(serial, ip, port, null, 'encryption', '256');
                }).then((status) => {
                    resolve(status)
                }).catch((err) => {
                    reject(err);
                });
            }
        }).catch((err) => {
            reject(err);
        });
    })
}

function _set_broadcast_contact(contact, serial, ip, port, crypto_key) {
    return new Promise((resolve, reject) => {
        if (!contact) {
            resolve();
        } else {
            _runCommand(serial, ip, port, crypto_key, 'BIP', contact).then((status) => {
                return _runCommand(serial, ip, port, crypto_key, 'broadcast', 'on');
            }).then((status) => {
                resolve(status);
            }).catch((err) => {
                reject(err);
            });
        }
    })
}

function _set_cmd_port(serial, ip, crypto_key, old_port, new_port) {
    return _runCommand(serial, ip, old_port, crypto_key, 'CP', new_port);
}

function _set_mode(serial, ip, port, crypto_key, mode) {
    return _runCommand(serial, ip, port, crypto_key, 'MODE', mode);
}

function _broadcast_message(data, local_ip, broadcast_port, device_ip, response_timeout) {
    return _send_and_get_response(data, device_ip, broadcast_port, local_ip, broadcast_port, true, null, response_timeout);
}

function _processDeviceStatus(emiter, controller, device, group, status, forceStatus = false) {

    var properties = controller.details;
    var device_properties = JSON.parse(device.get('details'));
    var pos = (device_properties.position == 1) ? '' : '2';

    var timer = emiter._timers.get(device.get("uuid"));
    if (timer) {
        clearTimeout(timer);
        emiter._timers.delete(device.get("uuid"));
        timer = null;
    }

    if (!forceStatus) {
        _getFullStatus(properties.phyId, properties.remote_ip,
            properties.remote_port, properties.crypto_key).then((res) => {
                var stat = _getDeviceStatus(res, device.get("type"), pos);
                if (stat === true) {
                    status = "Unlocked";
                } else {
                    status = "Locked";
                }
                if (emiter) {
                    emiter.emit("iot::cyberdata::device::status", device.get("gateway_uuid"), "electrical-stryke", device.get("uuid"), status);
                }
            }).catch((error) => {
                log.error(error);
                if (emiter) {
                    emiter.emit("iot::cyberdata::device::status", device.get("gateway_uuid"), "electrical-stryke", device.get("uuid"), status);
                }
            });
    } else if (emiter) {
        emiter.emit("iot::cyberdata::device::status", device.get("gateway_uuid"), "electrical-stryke", device.get("uuid"), status);
    }


}

function _energizeRelay(serial, ip, port, crypto_key, pos, seconds) {
    var command = 'energize' + pos;
    return _runCommand(serial, ip, port, crypto_key, command, seconds);
}

function _setName(serial, ip, port, crypto_key, name) {
    return _runCommand(serial, ip, port, crypto_key, 'setname', name);
}

function _initializeSettings(serial, ip, port, crypto_key, name, broadcastIp) {
    return new Promise((resolve, reject) => {
        log.debug("Setting static ip to : " + ip);
        _runCommand(serial, ip, port, crypto_key, 'IP', ip).then(() => {
            log.debug("Setting broadcast ip to : " + broadcastIp);
            return _set_broadcast_contact(broadcastIp, serial, ip, port, crypto_key);
        }).then(() => {
            log.debug("Setting name to : " + name);
            return _setName(serial, ip, port, crypto_key, name);
        }).then((status) => {
            log.debug("Setting mode to : 0");
            return _set_mode(serial, ip, port, crypto_key, 0);
        }).then((status) => {
            resolve(status);
        }).catch((err) => {
            log.error(err);
            reject(err);
        });
    });
}

function _getDeviceStatus(status, type, position) {

    if (position !== 1 && position !== 2) {
        return false;
    }

    /*Lock Name|Door Status|Cryptographic Nonce|Relay State|LED State|Button State| DST Setting|
    DST Start|DST End|Encryption Setting|Command Port|Broadcast Message Setting|Broadcast IP address|
    Broadcast Destination Port|Intrusion Alarm State|Jumper Settings (JP4, JP6, JP9, JP10)|Time|Date|
    Relay Duration (Secs.)|Base Version|Multicast Enable|Multicast IP|Multicast Port|Multicast Timeout|
    Door Status|Relay 2 Status|Button 2 Status|MODE\n*/
    var arr_message = status.toString().split('|');
    var contacts = [];
    var strykes = [];
    var buttons = [];

    if (arr_message[1] === 'closed') {
        contacts.push(true);
    } else {
        contacts.push(false);
    }

    if (arr_message[24] === 'closed') {
        contacts.push(true);
    } else {
        contacts.push(false);
    }

    if (arr_message[3] === 'active') {
        strykes.push(true);
    } else {
        strykes.push(false);
    }

    if (arr_message[25] === 'active') {
        strykes.push(true);
    } else {
        strykes.push(false);
    }

    if (arr_message[5] === 'active') {
        buttons.push(true);
    } else {
        buttons.push(false);
    }

    if (arr_message[26] === 'active') {
        buttons.push(true);
    } else {
        buttons.push(false);
    }

    switch (type) {
        case 'electrical-stryke':
            return strykes[position - 1];
            break
        case 'electrical-sensor':
        case 'electrical-contact':
            return contacts[position - 1];
            break;
        case 'electrical-button':
            return buttons[position - 1];
            break;
    }
    return false;
}

function CyberDataController(config, port_hunter) {
    this._config = config;
    this._ws = undefined;
    this._ws_connection = undefined;
    this._udp_server = undefined;
    this._controllers = new Map();
    this._udp_port_hunter = port_hunter;

    // 10004 and 49999 are specially reserved ports 
    // for cyberdata, let's make sure the port hunter do not allocate them
    // to anybody else.
    this._udp_port_hunter.reservePort(10004);
    this._udp_port_hunter.reservePort(49999);

    this._timers = new Map();

}

util.inherits(CyberDataController, EventEmitter);

CyberDataController.prototype._processTamper = function (uuid, isTimeout = false) {
    var self = this;
    var controller = this._controllers.get(uuid);
    if (!controller) {
        return;
    }
    var stateChange = false;
    if (controller.timer) {
        clearTimeout(controller.timer);
        controller.timer = null;
    }

    if (isTimeout && controller.state == 'ready') {
        controller.state = 'unreachable';
        stateChange = true;
    } else if (!isTimeout) {
        controller.timer = setTimeout(self._processTamper.bind(self), 90000, uuid, true);
        if (controller.state != 'ready') {
            controller.state = 'ready';
            stateChange = true;
        }
    }
    self._controllers.set(uuid, controller);

    if (stateChange) {
        var event = { type: 'gateway-state', id: controller.uuid, data: controller.state };
        self.emit("iot::cyberdata::state::event", event);
    }

}

CyberDataController.prototype.processIntercomEvent = function (event) {
    return new Promise((resolve, reject) => {
        var self = this;
        var server = undefined;
        for (let [uuid, controller] of self._controllers) {
            if (controller.details.phyId == event.mac && controller.details.remote_ip == event.host) {
                server = controller;
                break;
            }
        }
        if (server) {

            if (event.type == "HEARTBEAT") {
                self._processTamper(server.uuid, false);
            } else if (event.type == "BUTTON") {

            }

        }

        resolve();
    });

}


CyberDataController.prototype.start = function () {

    return new Promise((resolve, reject) => {

        var self = this;

        // get the controllers from the DB
        Gateway.where({ provider: 'cyberdata' }).fetchAll().then((gateways) => {
            if (gateways) {
                gateways.forEach((gateway) => {
                    var uuid = gateway.get('uuid');
                    var data = gateway.toJSON();
                    data.details = JSON.parse(data.details);
                    data.timer = setTimeout(self._processTamper.bind(self), 90000, uuid, true);
                    self._controllers.set(uuid, data);
                    if (!["11414"].includes(data.details.model)) {
                        self._udp_port_hunter.reservePort(data.details.remote_port);
                    }
                })
            }

            var q = require('q');

            var promises = [];

            if (self._config.host) {
                for (let [uuid, controller] of self._controllers) {
                    if (!["11414"].includes(controller.details.model)) {
                        log.debug('Configuring controller ' + controller.name + ' with details: ' + JSON.stringify(controller.details));
                        let serial = controller.details.phyId;
                        let ip = controller.details.remote_ip;
                        let port = controller.details.remote_port;
                        let crypto_key = controller.details.crypto_key;
                        let name = controller.name;
                        promises.push(_initializeSettings(serial, ip, port, crypto_key, name, self._config.host));
                    }
                }

                q.all(promises).then(() => {
                    log.debug('Configured Cyberdata controllers');
                }).catch((err) => {
                    log.error(err);
                });

                // start the event handler which is an udp server listening on host::49999
                self._udp_server = dgram.createSocket('udp4');

                self._udp_server.on('error', (err) => {
                    log.error(`Cyberdata udp server error:\n${err.stack}`);
                    self._udp_server.close();
                });

                self._udp_server.on('message', (msg, rinfo) => {
                    var arr_message = msg.toString().split('|');

                    var server = undefined;
                    for (let [uuid, controller] of self._controllers) {
                        if (controller.details.phyId == arr_message[1] && controller.details.remote_ip == rinfo.address) {
                            server = controller;
                            break;
                        }
                    }

                    if (server) {
                        log.debug(`Cyberdata udp server got: ${msg} from ${rinfo.address}:${rinfo.port}`);
                        var device_type = undefined;
                        var device_position = undefined;
                        var status = undefined;

                        if (["energize", "energize2"].includes(arr_message[4])) {
                            device_type = "electrical-stryke";
                            device_position = (arr_message[4] === "energize") ? 1 : 2;
                            status = "Unlocked";
                        } else if (["opened", "opened2", "closed", "closed2"].includes(arr_message[4])) {
                            device_type = "electrical-contact";
                            device_position = (arr_message[4] === "opened" || arr_message[4] === "closed") ? 1 : 2;
                            status = (arr_message[4] === "opened" || arr_message[4] === "opened2") ? "Opened" : "Closed";
                        } else if (["button", "button2"].includes(arr_message[4])) {
                            device_type = "electrical-button";
                            device_position = (arr_message[4] === "button") ? 1 : 2;
                            status = "On";
                        } else if (["tamper", "tamper\n"].includes(arr_message[4])) {
                            self._processTamper(server.uuid, false)
                        }

                        if (device_type) {
                            var device_uuid = server.uuid + '-' + device_type + '-' + device_position;
                            self.emit("iot::cyberdata::device::status", server.uuid, device_type, device_uuid, status);
                        }
                    }
                });

                self._udp_server.on('listening', () => {
                    const address = self._udp_server.address();
                    log.debug(`Cyberdata udp server listening ${address.address}:${address.port}`);
                });

                self._udp_server.bind(49999, self._config.host);
            }
        }).catch((err) => {
            log.error(err);
        });

        this._ws = new WSClient();

        this._ws.on('connectFailed', function (error) {
            log.warn("Cyberdata controller websocket connection failed: " + error);
        });

        this._ws.on('close', function (error) {
            log.warn("Cyberdata controller websocket closed: " + error);
        });

        this._ws.on('connect', function (connection) {
            self._ws_connection = connection;

            self._ws_connection.on('error', function (error) {
                log.error("Cyberdata controller websocket connection error: " + error);
                self._ws_connection = null;
            });
            self._ws_connection.on('close', function (reasonCode, description) {
                log.warn("Cyberdata controller websocket connection closed: " + reasonCode + ", " + description);
                self._ws_connection = null;
            });
            self._ws_connection.on('message', function (message) {

                var msg = JSON.parse(message.utf8Data);

                if (msg.type == 'event') {
                    self.emit("iot::cyberdata::device::event", msg);
                }
            });
        });

        this._ws.connect('ws://127.0.0.1:10080');
        resolve(self);
    });
}

CyberDataController.prototype.disconnect = function () {
    if (this._ws_connection) {
        this._ws_connection.close();

    } else if (this._ws) {
        this._ws.abort();
    }
    this._ws_connection = null;
    this._ws = null;

    if (this._udp_server) {
        this._udp_server.close();
        this._udp_server = null;
    }

    for (let [uuid, timer] of this._timers) {
        clearTimeout(timer);
    }

    this._timers.clear();
}

CyberDataController.prototype.addWorker = function (device) {

    if (!this._ws_connection) {
        log.warn("Cyberdata controller worker connection not established: Failed to add worker for device " + device.uuid);
        return;
    }

    if (device.type == 'intercom') {
        details = device.details;
        log.debug("Cyberdata controller Adding worker for device " + device.uuid);
        var config = {
            hostname: details.remote_ip,
            port: 443,
            path: 'static/cap.jpg',
            initializeImagePath: '/video/',
            username: 'admin',
            password: 'admin',
            method: 'GET',
            protocol: 'https:'
        };

        var data = { uuid: device.uuid, action: "start-capture-worker", config: config, interval: 1000 }
        this._ws_connection.send(JSON.stringify(data));
    }
}



CyberDataController.prototype._energizeRelay = function (seconds, device, group, controller) {
    return new Promise((resolve, reject) => {
        var self = this;
        var properties = controller.details;
        var device_properties = JSON.parse(device.get('details'));
        var device_ip = properties.remote_ip;
        var device_port = properties.remote_port;
        var device_serial = properties.phyId;
        var device_crypto_key = properties.crypto_key ? properties.crypto_key : null;
        var pos = (device_properties.position == 1) ? '' : '2';
        var timer = self._timers.get(device.get("uuid"));
        if (timer) {
            clearTimeout(timer);
            self._timers.delete(device.get("uuid"));
            timer = null;
        }
        _energizeRelay(device_serial, device_ip, device_port, device_crypto_key, pos, seconds).then((status) => {
            timer = setTimeout(_processDeviceStatus, 1000 * (seconds + 1), self, controller, device, group, "Locked", false);
            self._timers.set(device.get("uuid"), timer)
            resolve(status)
        }).catch((err) => {
            log.error(err);
            reject(err);
        });
    });
}

CyberDataController.prototype._stop = function (device, group, controller) {
    return new Promise((resolve, reject) => {
        var self = this;
        var properties = controller.details;
        var device_properties = JSON.parse(device.get('details'));
        var device_ip = properties.remote_ip;
        var device_port = properties.remote_port;
        var device_serial = properties.phyId;
        var device_crypto_key = properties.crypto_key ? properties.crypto_key : null;
        var status = _getStatus(device_serial, device_ip, device_port, device_crypto_key);
        var timer = self._timers.get(device.get("uuid"));
        if (timer) {
            clearTimeout(timer);
            self._timers.delete(device.get("uuid"));
            timer = null;
        }
        status.then((status) => {
            var arr_message = status.toString().split('|');
            var nonce = arr_message[2];
            var data = 'LOCK' + device_serial + '|' + nonce + '|stop' + device_properties.position + '\n';
            _send_and_get_response(data, device_ip, device_port, null, device_port, false, device_crypto_key).then((status) => {
                _processDeviceStatus(self, controller, device, group, "Locked", false);
                resolve(status)
            });
        });
    });
}

CyberDataController.prototype.getDevice = function (serverName, deviceId, deviceData) {
    return new Promise((resolve, reject) => {
        var actions = undefined;
        var name = deviceData.name;
        var properties = undefined;
        var device = undefined;
        switch (deviceData.type) {
            case 'intercom':
                actions = ["Capture-Start", "Capture-Stop"];
                properties = { phyId: deviceData.properties.phyId, provider: 'cyberdata', status: "active", state: "ready", remote_ip: deviceData.properties.remote_ip };
                device = new CyberDataDevice(deviceData.type, deviceData.name, deviceId, properties, actions);
                break;
            case 'electrical-stryke':
            case 'electrical-contact':
            case 'electrical-button':
                properties = deviceData.properties;
                properties.state = "ready";
                if (deviceData.type == 'electrical-stryke') {
                    actions = ["Lock", "Unlock"];
                    properties.status = "Locked";
                } else if (deviceData.type == 'electrical-button') {
                    actions = ["On", "Off"];
                    properties.status = "Off";
                } else {
                    actions = [];
                    properties.status = "Closed";
                }
                device = new CyberDataDevice(deviceData.type, name, deviceId, properties, actions);
                break;
        }
        resolve(device);
    });
}

CyberDataController.prototype._addGatewayImpl = function (response, location, gwName) {
    return new Promise((resolve, reject) => {
        var self = this;
        if (!response) {
            reject("Failed to add gateway");
        } else {
            var name = gwName ? gwName : response.DevName;
            var id = 'cyb-' + response.SerialNum;
            var remote_port = self._udp_port_hunter.allocatePort();
            var default_port = response.CMDPort;
            var properties = { mac: response.MACAddr, remote_ip: response.IPAddr, remote_port: remote_port, phyId: response.SerialNum, provider: "cyberdata", model: "11375" };
            var key = crypto.randomBytes(32);
            properties.crypto_key = key.toString('hex');
            // change the command port first
            log.debug("Setting command port to: " + properties.remote_port);
            _set_cmd_port(properties.phyId, properties.remote_ip, null, default_port, remote_port).then((status) => {
                log.debug("Setting crypto key : " + properties.crypto_key);
                return _setEncryption('256', properties.phyId, properties.remote_ip, properties.remote_port, null, properties.crypto_key);
            }).then((status) => {
                return _initializeSettings(properties.phyId,
                    properties.remote_ip,
                    properties.remote_port,
                    properties.crypto_key,
                    name,
                    self._config.host);
            }).then((status) => {
                var data = { uuid: id, name: name, state: 'ready', provider: 'cyberdata', location_uuid: location, actions: '[]' };
                // save the details as a json string in the DB. A copy is needed here not to alter thr saved controller.
                var res = JSON.parse(JSON.stringify(data));
                data.details = properties;
                res.details = JSON.stringify(properties);
                res.state = 'ready';
                data.timer = setTimeout(self._processTamper.bind(self), 90000, data.uuid, true);
                self._controllers.set(data.uuid, data);
                resolve(res);
            }).catch((err) => {
                log.error(err);
                reject(err);
            });
        }
    });
}

CyberDataController.prototype._discoverGateway = function (serial) {
    return new Promise((resolve, reject) => {
        var data = '<XML><PacketType>Request</PacketType>\n<VendorName>CyberData</VendorName>\n<ProductName>CDNetDevice</ProductName>\n</XML>\n';
        var resp = undefined;
        _broadcast_message(data, null, 10004, '<broadcast>', duration).then((responses) => {
            if (!responses) {
                reject('No controller found');
            } else {
                responses.forEach((response) => {
                    if (response.Encryption === 'Disabled' && response.SerialNum == serial) {
                        // do not try to add devices that are already using encryption 
                        // since we don't know their encryption key
                        // make sure to add the controller matching the provided serial
                        resp = response;
                    }
                });
                resolve(resp);
            }
        }).catch((err) => {
            reject(err);
        });
    });
}

CyberDataController.prototype._addStrykeControllerGateway = function (location, gwName, ip, serial, duration) {
    return new Promise((resolve, reject) => {
        var self = this;
        if (!ip) {
            self.discoverGateway(serial).then((response) => {
                return self._addGatewayImpl(response, location, gwName);
            }).then((data) => {
                resolve(data);
            }).catch((err) => {
                reject(err);
            });
        } else {
            var status = _getStatus(serial, ip, 59999, null, 30);
            status.then((status) => {
                var response = undefined;
                if (status) {
                    var arr_message = status.toString().split('|');
                    response = { DevName: arr_message[0], SerialNum: serial, CMDPort: 59999, MACAddr: serial, IPAddr: ip };
                }
                return self._addGatewayImpl(response, location, gwName);
            }).then((data) => {
                resolve(data);
            }).catch((err) => {
                reject(err);
            });
        }
    });

}

CyberDataController.prototype._addIntercomGateway = function (location, gwName, ip, serial, duration) {
    return new Promise((resolve, reject) => {
        if (!ip) {
            reject("Missing mandatory ip address information");
            return;
        }
        var self = this;
        var name = gwName ? gwName : response.DevName;
        var id = 'cyb-' + serial;
        var properties = { remote_ip: ip, phyId: serial, provider: "cyberdata", model: "11414" };

        var data = { uuid: id, name: name, state: 'ready', provider: 'cyberdata', location_uuid: location, actions: '[]' };
        // save the details as a json string in the DB. A copy is needed here not to alter thr saved controller.
        var res = JSON.parse(JSON.stringify(data));
        data.details = properties;
        res.details = JSON.stringify(properties);
        res.state = 'ready';
        data.timer = setTimeout(self._processTamper.bind(self), 90000, data.uuid, true);
        self._controllers.set(data.uuid, data);
        resolve(res);
    });
}


CyberDataController.prototype.addGateway = function (location, identifier, gwName, duration) {
    return new Promise((resolve, reject) => {
        var arr_identifier = identifier.toString().split(':');
        var self = this;
        var serial = arr_identifier[0];
        var ip = undefined;
        var gw = self._controllers.get('cyb-' + serial);
        var model = "11375";

        if (gw) {
            reject('Controller already exists');
            return;
        }

        if (arr_identifier[1] && net.isIP(arr_identifier[1]) !== 0) {
            ip = arr_identifier[1];
            if (arr_identifier[2]) {
                model = arr_identifier[2];
            }
        } else if (arr_identifier[1]) {
            model = arr_identifier[1];
        }

        if (["11414"].includes(model)) {
            // sip intercom gateway
            self._addIntercomGateway(location, gwName, ip, serial, duration).then((data) => {
                resolve(data);
            }).catch((err) => {
                reject(err);
            });

        } else {
            // network stryke controller gateway
            self._addStrykeControllerGateway(location, gwName, ip, serial, duration).then((data) => {
                resolve(data);
            }).catch((err) => {
                reject(err);
            });
        }
    });
}

CyberDataController.prototype.removeGateway = function (gateway) {
    return new Promise((resolve, reject) => {
        var self = this;
        var uuid = gateway.get("uuid");
        var controller = this._controllers.get(uuid);
        if (controller) {
            if (controller.timer) {
                clearTimeout(controller.timer);
                controller.timer = null;
            }
            var properties = controller.details;
            if (!["11414"].includes(properties.model)) {
                _setEncryption("off", properties.phyId, properties.remote_ip, properties.remote_port, properties.crypto_key, null).then((status) => {
                    return _set_cmd_port(properties.phyId, properties.remote_ip, null, properties.remote_port, 59999);
                }).then((status) => {
                    return _runCommand(properties.phyId, properties.remote_ip, 59999, null, 'DHCP', 'on');
                }).then((status) => {
                    self._udp_port_hunter.releasePort(properties.remote_port);
                    self._controllers.delete(uuid);
                    resolve(gateway);
                }).catch((err) => {
                    self._udp_port_hunter.releasePort(properties.remote_port);
                    self._controllers.delete(uuid);
                    resolve(gateway);
                })
            } else {
                self._controllers.delete(uuid);
                resolve(gateway);
            }
        } else {
            resolve(gateway);
        }
    });
}

CyberDataController.prototype.updateGateway = function (gateway) {
    return new Promise((resolve, reject) => {
        var self = this;
        var uuid = gateway.get("uuid");
        var controller = this._controllers.get(uuid);
        if (controller) {
            let data = gateway.toJSON();
            data.details = JSON.parse(data.details);
            if (!["11414"].includes(controller.details.model) && controller.details.remote_port != data.details.remote_port) {
                self._udp_port_hunter.releasePort(controller.details.remote_port);
                self._udp_port_hunter.reservePort(data.details.remote_port);
            }
            self._controllers.set(uuid, data);
            resolve(gateway);
        } else {
            resolve(gateway);
        }
    });
}

CyberDataController.prototype.updateDevice = function (device) {
    return new Promise((resolve, reject) => {
        /*var self = this;
        var uuid = device.get("gateway_uuid");
        var controller = this._controllers.get(uuid);
        if (controller) {
        }*/
        resolve(device);
    });
}


CyberDataController.prototype._addDeviceImpl = function (deviceType, serverName, physicalId, controller, properties, pos) {
    return new Promise((resolve, reject) => {
        var status = _getFullStatus(properties.phyId, properties.remote_ip, properties.remote_port, properties.crypto_key);
        status.then((status) => {
            var stat = _getDeviceStatus(status, deviceType, pos);
            if (stat === true) {
                var deviceName = controller.name + '-' + deviceType + '-' + pos;
                var deviceId = controller.uuid + '-' + deviceType + '-' + pos;
                var deviceProperties = {
                    remote_serial: properties.phyId,
                    remote_ip: properties.remote_ip,
                    remote_port: properties.remote_port,
                    crypto_key: properties.crypto_key,
                    provider: 'cyberdata',
                    phyId: physicalId,
                    position: pos
                };
                this.emit('iot::cyberdata::device::new', serverName, deviceType, deviceId, deviceName, deviceProperties);
                resolve(deviceProperties);
            } else {
                var msg = "Failed to add device " + deviceType + " at position " + pos + " to gateway " + controller.uuid;
                log.warn(msg)
                reject(msg);
            }
        }).catch((err) => {
            reject(err);
        });
    });
}

CyberDataController.prototype.pairDevice = function (device) {
    return new Promise((resolve, reject) => {
        var self = this;
        resolve(device);
    })
}

CyberDataController.prototype.addDevice = function (devInfo) {

    var deviceType = devInfo.type;
    var physicalId = devInfo.physical_id;
    var serverName = devInfo.gateway_uuid
    var duration = devInfo.duration;
    var pos = parseInt(devInfo.device_position);
    var self = this;
    var controller = this._controllers.get(serverName);

    if (controller) {
        var properties = controller.details;
        log.debug("Adding device " + deviceType + " at position " + pos + " to gateway " + controller.uuid)
        // 'electrical-stryke', 'electrical-contact', 'electrical-button',  'intercom', 'sip'

        if (!["11414"].includes(properties.model)) {
            switch (deviceType) {
                case 'electrical-contact':
                case 'electrical-button':
                    self._addDeviceImpl(deviceType, serverName, physicalId, controller, properties, pos).then((deviceProps) => {
                        log.debug("Added device " + deviceType + " at position " + pos + " to gateway " + controller.uuid);
                    }).catch((err) => {
                        log.error(err);
                    });
                    break;
                case 'electrical-stryke':
                    _energizeRelay(properties.phyId, properties.remote_ip, properties.remote_port, properties.crypto_key, pos, 30).then((status) => {
                        self._addDeviceImpl(deviceType, serverName, physicalId, controller, properties, pos).then((deviceProps) => {
                            log.debug("Added device " + deviceType + " at position " + pos + " to gateway " + controller.uuid);
                        }).catch((err) => {
                            log.error(err);
                        });
                    }).catch((err) => {
                        log.error(err);
                    })
                    break;
            }
        } else {
            switch (deviceType) {
                case 'intercom':
                    var deviceName = controller.name + '-' + deviceType;
                    var deviceId = controller.uuid + '-' + deviceType;
                    var deviceProperties = {
                        remote_serial: properties.phyId,
                        remote_ip: properties.remote_ip,
                        provider: 'cyberdata',
                        phyId: properties.phyId,
                    };
                    this.emit('iot::cyberdata::device::new', serverName, deviceType, deviceId, deviceName, deviceProperties);
                    break;
            }
        }
    }
}

CyberDataController.prototype.removeDevice = function (device) {
    return new Promise((resolve, reject) => {
        if (device.get("type") === "intercom") {
            log.debug("Cyberdata controller Removing worker for device " + device.get("uuid"));
            var data = { uuid: device.get("uuid"), action: "stop-capture-worker" }
            this._ws_connection.send(JSON.stringify(data));
        }
        resolve(device);
    });
}


CyberDataController.prototype.doAction = function (action, device, params) {

    return new Promise((resolve, reject) => {
        var result = undefined;
        var self = this;
        var controller_uuid = device.get("gateway_uuid");
        var controller = self._controllers.get(controller_uuid);
        var data = undefined;
        var updateStatus = false;
        if (!controller) {
            reject("Unknown controller for device " + device.get("uuid"));
            return;
        }

        switch (device.get("type")) {
            case 'electrical-stryke':
                if (action === "Lock") {
                    result = this.Release(controller, device, params['group']);
                } else {
                    result = this.Engage(controller, device, params['group']);
                }
                updateStatus = true;
                break;

            case 'intercom':
                if (action === "Capture-Start") {
                    result = self.EnableCapture(device, params['session']);
                } else {
                    result = self.DisableCapture(device, params['session']);
                }
                updateStatus = false;
                break;
        }
        if (result) {
            if (updateStatus) {
                _processDeviceStatus(self, controller, device, params['group'], action + 'ing', true);
            }

            result.then(() => {
                resolve(true);
            }).catch((err) => {
                reject(err);
            });
        } else {
            reject('Unhandled device type ' + device.get("type") + ' action ' + action);
        }
    });
}

CyberDataController.prototype.autoAddDevices = function (gateway, duration = "120") {
    return new Promise((resolve, reject) => {
        resolve(gateway);
    });
}


CyberDataController.prototype.EnableCapture = function (device, session) {
    return new Promise((resolve, reject) => {
        if (!session.captures.includes('devices:' + device.get("uuid"))) {
            session.captures.push('devices:' + device.get("uuid"));
        }
    });
}

CyberDataController.prototype.DisableCapture = function (device, session) {
    return new Promise((resolve, reject) => {
        var index = session.captures.findIndex(x => x === 'devices:' + device.get("uuid"));
        if (index > -1) {
            session.captures.splice(index, 1);
        }
    });
}

CyberDataController.prototype.Engage = function (controller, device, group) {
    return this._energizeRelay(30, device, group, controller);
}

CyberDataController.prototype.Release = function (controller, device, group) {
    return this._stop(device, group, controller);
}

CyberDataController.prototype.setCalibration = function (device, enable) {
    return new Promise((resolve, reject) => {
        var self = this;
        var resp = { uuid: device.get("uuid"), type: device.get("type"), signal: "Very Good" };
        resolve(resp);
    });
}

CyberDataController.prototype.setPinCodeSupport = function (device, enable, isJson = false) {
    return new Promise((resolve, reject) => {
        resolve(device);
    })
}

CyberDataController.prototype.setUserPinCode = function (device, userId, pin, isJson = false) {
    return new Promise((resolve, reject) => {
        resolve(device);
    })
}

CyberDataController.prototype.setPinCodes = function (device, pincodes, isJson = false) {
    return new Promise((resolve, reject) => {
        resolve(device);
    })
}

CyberDataController.prototype.clearUserPinCode = function (device, userId, pin, isJson = false) {
    return new Promise((resolve, reject) => {
        resolve(device);
    })
}


CyberDataController.prototype.setDebugMode = function (gateway, mode) {
    return new Promise((resolve, reject) => {
        resolve();
    });
}

CyberDataController.prototype.getDebugMode = function (gateway) {
    return new Promise((resolve, reject) => {
        resolve({});
    });
}

CyberDataController.prototype.getDebugLogs = function (gateway) {
    return new Promise((resolve, reject) => {
        resolve({});
    });
}

CyberDataController.prototype.getFirmwareVersionFromGateway = function (api, emitter) {
    return new Promise((resolve) => {
        resolve({});
    });
}

CyberDataController.prototype.installFirmwareGateway = function (gateway) {
    return new Promise((resolve) => {
        resolve({});
    });
}

CyberDataController.prototype.checkFirmwareInstallationProgress = function (uuid, details) {
    return new Promise((resolve) => {
        resolve({});
    });
}

CyberDataController.prototype.updateFirmwareInfo = function (uuid) {
    return new Promise((resolve, reject) => {
        resolve({});
    })
}

exports.CyberDataController = CyberDataController
