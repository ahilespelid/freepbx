const log = require('../../../../log');
const REQ_RETRY_INTERVAL = 30;
function callRestMethod(client, method, args) {

    return new Promise(function (resolve, reject) {
        var req = client.methods[method](args, function (data, response) {
            var err = undefined;

            if (method == "getDebugLogs") {
                // we're getting a tar file as response data here
                resolve(data);
            } else {
                if (Buffer.isBuffer(data)) {
                    var strData = data.toString();
                    if (strData !== '') {
                        try {
                            data = JSON.parse(strData);
                        } catch (error) {
                            err = "Failed parsing response data: " + strData + " for method: " + method + " Error: " + error;
                            log.error(err);
                        }
                    }
                }
                if (err) {
                    reject(err);
                } else {
                    resolve(data);
                }
            }
        });

        req.on('requestTimeout', function (req) {
            err = method + ': Request timeout has expired, client timeout. Make sure server is listening.\n Arguments: ' + JSON.stringify(args);
            log.debug(err);
            req.abort();
            if(args.retry){
                args.retry_count = (args.retry_count) ? args.retry_count + 1 : 1;
                args.max_retry = (args.max_retry) ? args.max_retry : 2;
                args.retry_interval = (args.retry_interval) ? (parseInt(args.retry_interval, 10) * 1000 ) : 30000;
                if(args.retry_count >= args.max_retry){
                    args.retry = false;
                }
                setTimeout(() => {
                    log.debug("Retrying("+args.retry_count+") the method:"+method+ " with arguments : "+ JSON.stringify(args));
                    callRestMethod(client,method,args);
                },args.retry_interval);
            } else {
                reject(err);
            }
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

function getInfo(client, requestConfig = null, responseConfig = null) {
    var args = {
        headers: { "Accept": "application/json" }
    };

    if (requestConfig) {
        args.requestConfig = requestConfig;
    }

    if (responseConfig) {
        args.responseConfig = responseConfig;
    }


    return callRestMethod(client, 'getInfo', args);
}


function setDebugConfig(client, data, requestConfig = null) {
    var args = {
        data: data,
        headers: { "Content-Type": "application/json", "Accept": "application/json" }
    };

    if (requestConfig) {
        args.requestConfig = requestConfig;
    }

    return callRestMethod(client, 'setDebugConfig', args);
}
function getDebugConfig(client, requestConfig = null) {
    var args = {
        headers: { "Accept": "application/json" }
    };

    if (requestConfig) {
        args.requestConfig = requestConfig;
    }

    return callRestMethod(client, 'getDebugConfig', args);
}
function getDebugLogs(client, requestConfig = null) {
    var args = {
        headers: { "Accept": "application/x-tar" }
    };

    if (requestConfig) {
        args.requestConfig = requestConfig;
    }

    return callRestMethod(client, 'getDebugLogs', args);
}


function getTemplates(client) {
    var args = {
        headers: { "Accept": "application/json" }
    };
    return callRestMethod(client, 'getTemplates', args);
}

function addTemplate(client, data) {
    var args = {
        data: data,
        headers: { "Content-Type": "application/json", "Accept": "application/json" }
    };
    return callRestMethod(client, 'addTemplate', args);
}

function removeTemplate(client, templateHash) {
    var args = {
        path: { "templateHash": templateHash }, // path substitution var
        headers: { "Accept": "application/json" }
    };
    return callRestMethod(client, 'removeTemplate', args);
}

function getDevices(client, requestConfig = null) {
    return new Promise(function (resolve, reject) {
        var args = {
            headers: { "Accept": "application/json" }
        };

        if (requestConfig) {
            args.requestConfig = requestConfig;
        }


        var res = [];
        callRestMethod(client, 'listZBDevices', args).then((devices) => {
            devices.forEach((device) => {
                device.metadata = device.metadata ? JSON.parse(device.metadata) : {};
                device.metadata.protocol = 'ZB';
                res.push(device);
            })
            resolve(res);
            /*   return callRestMethod(client, 'listBLEDevices', args);
           }).then((devices)=>{
               devices.forEach((device)=>{
                   device.metadata = JSON.parse(device.metadata);
                   device.metadata.protocol = 'BLE';
                   res.push(device);
               })
               resolve(res);*/
        }).catch((err) => {
            reject(err);
        })
    });
}

// protocol is ZB or BLE
function getDeviceInfo(client, protocol, deviceId) {
    var args = {
        path: { "deviceId": deviceId }, // path substitution var
        headers: { "Accept": "application/json" }
    };
    return callRestMethod(client, 'get' + protocol + 'Device', args);
}
function getLogicalDeviceInfo(client, protocol, deviceId, key) {
    var args = {
        path: { "deviceId": deviceId, "key": key }, // path substitution var
        headers: { "Accept": "application/json" }
    };
    return callRestMethod(client, 'get' + protocol + 'LogicalDevice', args);
}

function removeDevice(client, protocol, deviceId) {
    var args = {
        path: { "deviceId": deviceId },
        headers: { "Accept": "application/json" }
    };
    return callRestMethod(client, 'remove' + protocol + 'Device', args);
}

function addDevice(client, protocol, params) {
    var args = {
        data: params,
        headers: { "Content-Type": "application/json", "Accept": "application/json" }
    };
    return callRestMethod(client, 'add' + protocol + 'Device', args);
}

function updateDevice(client, protocol, device, params) {
    var args = {
        data: params,
        path: { "deviceId": device }, // path substitution var
        headers: { "Content-Type": "application/json", "Accept": "application/json" }
    };
    return callRestMethod(client, 'update' + protocol + 'Device', args);
}

function updateDeviceDataPoints(client, protocol, device, key, params, requestConfig = null) {
    var args = {
        data: params,
        path: { "deviceId": device, "key": key }, // path substitution var
        headers: { "Content-Type": "application/json", "Accept": "application/json" }
    };

    if (requestConfig !== null) {
        args.requestConfig = requestConfig;
    }

    return callRestMethod(client, 'update' + protocol + 'DeviceDataPoints', args);
}

function autodiscoverDevices(client, protocol, params) {
    var args = {
        data: params,
        headers: { "Content-Type": "application/json", "Accept": "application/json" }
    };
    return callRestMethod(client, 'autodiscover' + protocol + 'Devices', args);
}

function updateDeviceDataPoint(client, protocol, device, key, dpkey, params, requestConfig = null) {
    var args = {
        retry : true,
        max_retry : 2,
        retry_interval: REQ_RETRY_INTERVAL,
        data: params,
        path: { "deviceId": device, "key": key, "dpkey": dpkey }, // path substitution var
        headers: { "Content-Type": "application/json", "Accept": "application/json" }
    };

    if (requestConfig !== null) {
        args.requestConfig = requestConfig;
    }

    return callRestMethod(client, 'update' + protocol + 'DeviceDataPoint', args);
}

function getDeviceDataPoint(client, protocol, device, key, dpkey) {
    var args = {
        path: { "deviceId": device, "key": key, "dpkey": dpkey }, // path substitution var
        headers: { "Accept": "application/json" }
    };
    return callRestMethod(client, 'get' + protocol + 'DeviceDataPoint', args);
}


function getDeviceSignalStrength(client, device, protocol, key, dpkey) {

    return new Promise((resolve, reject) => {
        getDeviceDataPoint(client, protocol, device, key, dpkey).then((res) => {
            if (res !== undefined && res.value !== undefined && res.unit == "%") {
                // RSSI ~= (percentage / 2) - 100
                let val = (parseInt(res.value) / 2) - 100;
                resolve({ value: val });
            } else if (res !== undefined && res.value !== undefined) {
                resolve(res);
            } else {
                getDeviceDataPoint(client, protocol, device, key + 's', dpkey).then((res1) => {
                    if (res1 !== undefined && res1.value !== undefined && res1.unit == "%") {
                        // RSSI ~= (percentage / 2) - 100
                        let val = (parseInt(res1.value) / 2) - 100;
                        resolve({ value: val });
                    } else if (res1 !== undefined && res1.value !== undefined) {
                        resolve(res1);
                    } else {
                        resolve({ value: 'unknown' });
                    }
                }).catch((err) => {
                    resolve({ value: 'unknown' });
                })
            }
        }, (error) => {
            getDeviceDataPoint(client, protocol, device, key + 's', dpkey).then((res2) => {
                if (res2 !== undefined && res2.value !== undefined && res2.unit == "%") {
                    // RSSI ~= (percentage / 2) - 100
                    let val = (parseInt(res2.value) / 2) - 100;
                    resolve({ value: val });
                } else if (res2 !== undefined && res2.value !== undefined) {
                    resolve(res2);
                } else {
                    resolve({ value: 'unknown' });
                }
            }).catch((err) => {
                resolve({ value: 'unknown' });
            })
        })
    })
}

function getFirmwareVersion(client, requestConfig) {
    var args = {
        headers: { "Accept": "application/json" }
    };

    if (requestConfig) {
        args.requestConfig = requestConfig;
    }
    return callRestMethod(client, 'getFirmwareVersion', args);
}

function installFirmwareGateway(client, requestConfig, data) {
    var args = {
        data: data,
        header: { "Content-Type": "application/json", "Accept": "application/json" }
    };
    if (requestConfig) {
        args.requestConfig = requestConfig;
    }
    return callRestMethod(client, 'installFirmwareGateway', args)
}

function checkFirmwareInstallationProgress(client, download_id, requestConfig) {
    var args = {
        path: { downloadId: download_id },
        header: { "Accept": "application/json" }
    };
    if (requestConfig) {
        args.registerMethod = requestConfig;
    }
    return callRestMethod(client, "checkFirmwareInstallationProgress", args);
}

const RestClient = require('node-rest-client').Client;
function DevelcoRestClient(url) {
    this.baseUrl = url;
    var options = {
        // will replace content-types used to match responses in JSON and XML parsers
        mimetypes: {
            json: ["application/json", "application/json;charset=utf-8"],
            xml: ["application/xml", "application/xml;charset=utf-8"]
        },
    };
    this.client = new RestClient(options);

    // register remote methods
    this.client.registerMethod("getInfo", this.baseUrl + '/info', "GET");
    this.client.registerMethod("getTemplates", this.baseUrl + '/config/template', "GET");
    this.client.registerMethod("addTemplate", this.baseUrl + '/config/template', "POST");
    this.client.registerMethod("removeTemplate", this.baseUrl + '/config/template/${templateHash}', "DELETE");

    this.client.registerMethod("autodiscoverZBDevices", this.baseUrl + '/zb', "PUT");


    this.client.registerMethod("listZBDevices", this.baseUrl + '/zb/dev', "GET");
    this.client.registerMethod("listBLEDevices", this.baseUrl + '/zb/ble', "GET");

    this.client.registerMethod("getZBDevice", this.baseUrl + '/zb/dev/${deviceId}', "GET");
    this.client.registerMethod("getZBLogicalDevice", this.baseUrl + '/zb/dev/${deviceId}/ldev/${key}/data', "GET");
    this.client.registerMethod("getBLEDevice", this.baseUrl + '/ble/dev/${deviceId}', "GET");
    this.client.registerMethod("getBLELogicalDevice", this.baseUrl + '/ble/dev/${deviceId}/ldev/${key}/data', "GET");

    this.client.registerMethod("removeZBDevice", this.baseUrl + '/zb/dev/${deviceId}', "DELETE");
    this.client.registerMethod("removeBLEDevice", this.baseUrl + '/ble/dev/${deviceId}', "DELETE");

    this.client.registerMethod("addZBDevice", this.baseUrl + '/zb/dev', "POST");
    this.client.registerMethod("addBLEDevice", this.baseUrl + '/ble/dev', "POST");

    this.client.registerMethod("updateZBDevice", this.baseUrl + '/zb/dev/${deviceId}', "PUT");
    this.client.registerMethod("updateBLEDevice", this.baseUrl + '/ble/dev/${deviceId}', "PUT");

    this.client.registerMethod("updateZBDeviceDataPoints", this.baseUrl + '/zb/dev/${deviceId}/ldev/${key}/data', "PUT");
    this.client.registerMethod("updateBLEDeviceDataPoints", this.baseUrl + '/ble/dev/${deviceId}/ldev/${key}/data', "PUT");

    this.client.registerMethod("updateZBDeviceDataPoint", this.baseUrl + '/zb/dev/${deviceId}/ldev/${key}/data/${dpkey}', "PUT");
    this.client.registerMethod("getZBDeviceDataPoint", this.baseUrl + '/zb/dev/${deviceId}/ldev/${key}/data/${dpkey}', "GET");
    this.client.registerMethod("updateBLEDeviceDataPoint", this.baseUrl + '/ble/dev/${deviceId}/ldev/${key}/data/${dpkey}', "PUT");
    this.client.registerMethod("getBLEDeviceDataPoint", this.baseUrl + '/ble/dev/${deviceId}/ldev/${key}/data/${dpkey}', "GET");

    this.client.registerMethod("setDebugConfig", this.baseUrl + '/config/debug', "PUT");
    this.client.registerMethod("getDebugConfig", this.baseUrl + '/config/debug', "GET");
    this.client.registerMethod("getDebugLogs", this.baseUrl + '/config/debug/logs.tar', "GET");
    this.client.registerMethod("getFirmwareVersion", this.baseUrl + '/fw/status', "GET");
    this.client.registerMethod("installFirmwareGateway", this.baseUrl + '/fw/downloads', "POST");
    this.client.registerMethod("checkFirmwareInstallationProgress", this.baseUrl + '/fw/downloads/${downloadId}', "GET");

}

DevelcoRestClient.prototype = {

    getDevices: function (requestConfig = null) {
        return getDevices(this.client, requestConfig);
    },

    getDevice: function (deviceId, protocol) {
        return getDeviceInfo(this.client, protocol, deviceId);
    },

    getLogicalDevice: function (deviceId, key, protocol) {
        return getLogicalDeviceInfo(this.client, protocol, deviceId, key)
    },
    removeDevice: function (deviceId, protocol) {
        return removeDevice(this.client, protocol, deviceId)
    },

    /*
    * params: {
    *   "barcode": "|0015BC002F000398|02B45383C263F60AD358B13DD9EC4A807619|",
    *   "eui": "0015BC002F000398",
    *   "installcode": "02B45383C263F60AD358B13DD9EC4A807619",
    * }
    */

    addDevice: function (protocol, params) {
        return addDevice(this.client, protocol, params);
    },

    /* update device name or discovery status. 
    *  Set disconvered to false to trigger rediscover 
    * params: {
    *   "discovered": false,
    *   "name": "Smartplug Kitchen",
    * }
    */

    updateDevice: function (deviceId, protocol, params) {
        return updateDevice(this.client, protocol, deviceId, JSON.stringify(params));
    },

    /* update device datapoints values 
    * params: [
    *   {
    *       "key": "onoff",
    *       "data": {
    *           "value": true
    *       }
    *   },
    *   {
    *       "key": "status",
    *       "data": {
    *           "value": false
    *       }
    *   }
    * ]
    */
    updateDeviceDataPoints: function (deviceId, key, protocol, params, stringifyParams = true, responseConfig = null) {
        var parms = stringifyParams ? JSON.stringify(params) : params;
        return updateDeviceDataPoints(this.client, protocol, deviceId, key, parms, responseConfig);
    },

    updateDeviceDataPoint: function (deviceId, key, dpkey, protocol, params, stringifyParams = true, responseConfig = null) {
        var parms = stringifyParams ? JSON.stringify(params) : params;
        return updateDeviceDataPoint(this.client, protocol, deviceId, key, dpkey, parms, responseConfig);
    },

    autodiscoverDevices: function (protocol, duration, enable = true) {
        if (!duration) {
            duration = 120;
        } else {
            duration = parseInt(duration);
        }
        var params = { "autoAdd": enable, "duration": duration, "enableScan": enable, "rejectUnknownDevices": enable ? false : true };
        return autodiscoverDevices(this.client, protocol, JSON.stringify(params));
    },

    getDeviceSignalStrength: function (device, protocol) {
        return new Promise((resolve, reject) => {
            getDeviceSignalStrength(this.client, device, protocol, 'diagnostic', 'networklinkstrength').then((net) => {
                if (net.value != 'unknown') {
                    resolve(net);
                } else {
                    getDeviceSignalStrength(this.client, device, protocol, 'diagnostic', 'rssi').then((rssi) => {
                        resolve(rssi);
                    }).catch((err) => {
                        log.warn("Could not fetch device " + device + " signal level. Error: " + err);
                        resolve({ value: 'unknown' });
                    })
                }
            }, (error) => {
                getDeviceSignalStrength(this.client, device, protocol, 'diagnostic', 'rssi').then((_rssi) => {
                    resolve(_rssi);
                }).catch((err) => {
                    log.warn("Could not fetch device " + device + " signal level. Error: " + err);
                    resolve({ value: 'unknown' });
                })
            })
        })
    },

    getDeviceDataPoint: function (deviceId, key, dpkey, protocol) {
        return getDeviceDataPoint(this.client, protocol, deviceId, key, dpkey);
    },

    getGateway: function (requestConfig = null, responseConfig = null) {
        return getInfo(this.client, requestConfig, responseConfig);
    },

    getTemplates: function () {
        return getTemplates(this.client);
    },

    addTemplate: function (data) {
        return addTemplate(this.client, JSON.stringify(data));
    },

    removeTemplate: function (hash) {
        return removeTemplate(this.client, hash);
    },

    setDebugConfig: function (params, requestConfig = null) {
        return setDebugConfig(this.client, JSON.stringify(params), requestConfig);
    },

    getDebugConfig: function (requestConfig = null) {
        return getDebugConfig(this.client, requestConfig);
    },

    getDebugLogs: function (requestConfig = null) {
        return getDebugLogs(this.client, requestConfig);
    },

    getFirmwareVersion: function (requestConfig = null) {
        return getFirmwareVersion(this.client, requestConfig);
    },

    installFirmwareGateway: function (requestConfig = null, data) {
        return installFirmwareGateway(this.client, requestConfig, JSON.stringify(data));
    },

    checkFirmwareInstallationProgress: function (download_id, requestConfig) {
        return checkFirmwareInstallationProgress(this.client, download_id, requestConfig);
    }
};

module.exports = DevelcoRestClient


