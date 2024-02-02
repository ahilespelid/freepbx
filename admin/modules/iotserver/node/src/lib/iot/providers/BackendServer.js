const WSClient = require('./ws-client.js');
const WebSocketConnection = require('websocket').connection;
const log = require('../../log');
const util = require("util");
const { EventEmitter } = require('events');
const async = require('async');
const BackendApi = require('../../zulu/Platform/FreePBX/API/BackendAPI.js')
const uuidv4 = require('uuid/v4');
const CloudRestClient = require('../../cloud/cloud-rest-client.js');
const config = require('config');
const { exec } = require('child_process');
const CommonApi = require('../../../api/iot/common-api.js');

const PropertyApi = require('../../../api/iot/user-property-api.js');

const DeviceApi = require('../../../api/iot/device-api.js');

const GroupApi = require('../../../api/iot/group-api.js');

const GatewayApi = require('../../../api/iot/gateway-api.js');

const GuestAccessApi = require('../../../api/iot/guest-access-api.js');

const FbCloudMessaging = require('../../../lib/firebase/FbCloudMessaging.js');

function BackendServer(zulu) {
    this._zulu = zulu;
    this._ws = new WSClient('ws://127.0.0.1:10080');
    this._api = new BackendApi();
    this._srCreds = undefined;
    this._etcdCreds = undefined;
    this._cloudRest = undefined;
    this._licensed = true;
    this._iot_permission_groups = undefined;

    this._firebaseMessaging = new FbCloudMessaging({ firebaseDatabaseURL: config.firebase.databaseURL });


    this._cloudRefreshInterval = undefined;

    Object.defineProperty(this, "api", {
        get() { return this._api; },
    });

    Object.defineProperty(this, "org_id", {
        get() { return this._etcdCreds.org_id; },
    });

    Object.defineProperty(this, "licensed", {
        get() { return this._licensed; },
    });

    Object.defineProperty(this, "permission_groups", {
        get() { return this._iot_permission_groups; },
    });
}

util.inherits(BackendServer, EventEmitter);

BackendServer.prototype.init = function (platform) {
    return new Promise((resolve, reject) => {
        var self = this;
        this._ws.connect(null, '', 20000, null, self._eventHandler.bind(self),
            self.errorHandler.bind(self), self.connectHandler.bind(self));

        self.on('ws::message::getSession', self._getSession.bind(self));
        self.on('ws::message::dropSession', self._dropSession.bind(self));
        self.on('ws::message::getAllSessions', self._getAllSessions.bind(self));
        self.on('ws::message::sendEventToClientsByZuluID', self._sendEventToClientsByZuluID.bind(self));
        self.on('ws::message::updateUsersGroupInfo', self._handleUserGroupUpdate.bind(self));
        self.on('ws::message::userUpdate', self._handleUserUpdate.bind(self));
        self.on('ws::message::licenseCheck', self._handleLicenseCheck.bind(self));
        self.on('ws::message::removeDeletedGuestUsers', self._handleRemoveDeletedGuestUserss.bind(self));
        self.on('ws::message::updateExpiredGuestStatus', self._handleUpdateExpiredGuestStatus.bind(self));
        self.on('ws::message::troubleshoot', self._handleTroubleshootOperation.bind(self))

        if (self._zulu) {
            self._zulu.on('cloud::user::authentication', self._handleUserAuthentication.bind(self));
        }

        apitoken = uuidv4();
        platform.kvSet('servertoken', apitoken).then(() => {
            self._api.token = apitoken
            resolve();
        }).catch((error) => {
            log.error('[Backend Server ERROR] ' + error);
            reject(error);
        })
    });
}

BackendServer.prototype.stop = function (host) {
    return new Promise((resolve, reject) => {
        if (this._ws) {
            this._ws.disconnect();
            this._ws = null;
        }
        var self = this;
        if (host) {
            self._connectSR().then(() => {
                unregisterImpl(self, self._cloudRest, self._etcdCreds, host)
                resolve();
            }).catch((err) => {
                log.warn(err);
                resolve();
            })
        } else {
            resolve();
        }
    })
}

BackendServer.prototype.errorHandler = function (reason, data) {
    log.error('[Backend Server ERROR] ' + reason);
}

BackendServer.prototype.connectHandler = function (connection) {
    log.debug('[Backend Server Connected to watchod]');
    connection.sendUTF(JSON.stringify({ action: 'register-backend-server', token: this._zulu.commandToken }));
}

/**
 * Respond to session with session details of a given session id
 *
 * @param session Session sending the request
 * @param {object} data Message to send
 * @param data.id Request's action id
 * @param {string} data.data.sessionid Session id to get info of
 * @private
 */
BackendServer.prototype._getSession = function (connection, data) {
    const client = this._zulu.getSession(data.data.sessionid)
    if (!client) {
        log.warn('No Session with this ID [' + data.data.sessionid + ']')
        connection.sendUTF(JSON.stringify({ status: false, key: data.key, actionid: data.id, message: 'No Session with this ID' }));
    } else {
        connection.sendUTF(JSON.stringify({
            actionid: data.id,
            status: true,
            key: data.key,
            data: {
                user: client.user.id,
                connected: client.connected,
                lastconnected: client.lastConnected,
                clientversion: client.clientVersion,
                clienttype: client.clientType
            }
        }))
    }
}

/**
 * Drop the session with the given session id
 *
 * @param session Session sending the request
 * @param {object} data Message to send
 * @param data.id Request's action id
 * @param {string} data.data.sessionid Session id to get info of
 * @private
*/
BackendServer.prototype._dropSession = function (connection, data) {
    const client = this._zulu.getSession(data.data.sessionid)
    if (!client) {
        log.warn('No Session with this ID [' + data.data.sessionid + ']')
        connection.sendUTF(JSON.stringify({ action: 'backend-response', status: false, key: data.key, actionid: data.id, message: 'No Session with this ID' }));
    } else {
        log.debug('Dropping session ID [' + data.data.sessionid + '] as requested by backend');
        client.connection.drop(WebSocketConnection.CLOSE_REASON_NORMAL)
        connection.sendUTF(JSON.stringify({ action: 'backend-response', status: true, key: data.key, actionid: data.id }));
    }
}


/**
 * Respond to session with a list of all client session.
 *
 * @param session Session sending the request
 * @param data
 * @private
*/
BackendServer.prototype._getAllSessions = function (connection, data) {
    const usess = {}
    const clients = this._zulu.getAllSessions()
    async.forEachOf(
        clients,
        function (data, id, next) {
            usess[id] = {
                user: data.user.id,
                connected: data.connected,
                lastconnected: data.lastConnected,
                clientversion: data.clientVersion,
                clienttype: data.clientType
            }
            next()
        },
        function (err) {
            if (err) {
                log.warn(err)
                connection.sendUTF(JSON.stringify({ action: 'backend-response', status: false, key: data.key, actionid: data.id, message: 'Invalid command' }));
            } else {
                connection.sendUTF(JSON.stringify({
                    action: 'backend-response',
                    actionid: data.id,
                    status: true,
                    key: data.key,
                    data: { sessions: usess }
                }))
            }
        }
    )
}

/**
 * Send a message to all clients with the given id.
 *
 * @param session Session sending the request
 * @param {object} data Message to send
 * @param data.id Request's action id
 * @param data.event ???
 * @param data.zid User id to send the message to
 * @param data.data Message to send
 * @private
 */
BackendServer.prototype._sendEventToClientsByZuluID = function (connection, data) {
    let userid = data.data.zid
    //Some times the userid could be an Integer so its necessary to convert
    //to string both userid and client.user.id
    userid = userid.toString()
    const subscription = data.data.event
    const message = data.data.data
    const clients = ClientServer.getAllSessions()
    connection.sendUTF(JSON.stringify({ action: 'backend-response', status: true, key: data.key, actionid: data.id }));
    async.forEachOf(
        clients,
        function (client, id, next) {
            let clientid = client.user.id
            clientid = clientid.toString()
            if (clientid === userid) {
                log.debug(`Sending event of type '${subscription}' to ${id}`, message)
                client.sendJSON({
                    subscription,
                    'data': message
                })
            }
            next()
        },
        function (err) {
            if (err) {
                log.error(err)
            }
        }
    )
}
BackendServer.prototype._handleUserGroupUpdate = function (connection, data) {
    return new Promise((resolve, reject) => {
        var self = this;
        var previous_groups = self._iot_permission_groups ? JSON.parse(JSON.stringify(self._iot_permission_groups)) : [];
        self._iot_permission_groups = data.data;
        connection.sendUTF(JSON.stringify({ action: 'backend-response', status: true, key: data.key, actionid: data.id }));
        resolve();
    });
}

BackendServer.prototype._handleUserUpdate = function (connection, data) {
    return new Promise((resolve, reject) => {
        var self = this;
        var userData = data.data;
        connection.sendUTF(JSON.stringify({ action: 'backend-response', status: true, key: data.key, actionid: data.id }));
        resolve();
    });
}

BackendServer.prototype._handleUserAuthentication = function (callback, data) {
    return new Promise((resolve, reject) => {
        var self = this;
        self._SendSRMessage('authenticateUser', data).then((result) => {
            callback(result)
            resolve();
        }).catch((error) => {
            callback({ status: false, msg: '' + error });
            resolve();
        })
    });
}

BackendServer.prototype._handleLicenseCheck = function (connection, data) {
    return new Promise((resolve, reject) => {
        var self = this;
        var checkData = data.data;
        self._licensed = checkData.expired ? false : true;
        if (self._zulu) {
            self._zulu.allowOnlyAdmins = checkData.expired;
        }
        connection.sendUTF(JSON.stringify({ action: 'backend-response', status: true, key: data.key, actionid: data.id }));
    });
}
BackendServer.prototype._handleRemoveDeletedGuestUserss = function (connection, data) {
    return new Promise((resolve, reject) => {
        GuestAccessApi.removeAllDeletedGuests().then(() => {
            connection.sendUTF(JSON.stringify({ action: 'backend-response', status: true, key: data.key, actionid: data.id }));
            resolve();
        }).catch((error) => {
            log.error(error)
            connection.sendUTF(JSON.stringify({ action: 'backend-response', status: false, key: data.key, actionid: data.id }));
            resolve();
        });
    });
}
BackendServer.prototype._handleUpdateExpiredGuestStatus = function (connection, data) {
    return new Promise((resolve, reject) => {
        GuestAccessApi.updateExpiredGuestStatus().then(() => {
            connection.sendUTF(JSON.stringify({ action: 'backend-response', status: true, key: data.key, actionid: data.id }));
            resolve();
        }).catch((error) => {
            log.error(error)
            connection.sendUTF(JSON.stringify({ action: 'backend-response', status: false, key: data.key, actionid: data.id }));
            resolve();
        });
    });
}


BackendServer.prototype._handleTroubleshootOperation = function (connection, data) {
    return new Promise((resolve, reject) => {
        var self = this;
        var opData = data.data;
        var func = undefined,
            then = (res) => res;
        switch (opData.operation) {
            case "get_loglevel":
                func = CommonApi.getLoggingLevel();
                break;
            case "set_loglevel":
                func = CommonApi.setLoggingLevel(opData.value);
                break;

            case "get_gateway_debug":
                func = CommonApi.getGatewayDebug(opData.uuid);
                break;

            case "set_gateway_debug":
                func = CommonApi.setGatewayDebug(opData.uuid, opData.value);
                break;

            case "get_gateway_logs":
                func = CommonApi.getGatewayLogs(opData.uuid);
                then = (res) => {
                    if (!res) {
                        connection.sendUTF(JSON.stringify({ action: 'backend-response', status: false, key: data.key, actionid: data.id, actionresult: false }));
                        return resolve();
                    }
                    return res.toString('base64');
                };
                break;
            case "get_gateways":
                func = self.getProviderAvailableFwInfo('develco');
                then = (versions) => {
                    return new Promise((resolve, reject) => {
                        return CommonApi.refreshGWFwInfo(GatewayApi.getProviderByType("develco"), versions)
                            .then(() => {
                                // wait for 1sec to make sure the refresh has been propagated to the database
                                setTimeout(() => {
                                    CommonApi.getGateways().then(resolve);
                                }, 1000);
                            })
                            .catch((err) => {
                                // wait for 1sec to make sure the refresh has been propagated to the database
                                setTimeout(() => {
                                    CommonApi.getGateways().then(resolve);
                                }, 1000);

                            });
                    });
                }
                break;
            case "get_gateway_avail_fw":
                if (opData.value == "IoT Gateway") {
                    func = self.getProviderAvailableFwInfo('develco')
                }
                break;
            case "force_update_gw_certificate":
                func = self.updateGWCertificate(opData.uuid);
                break;
            case "install_firmware":
                func = CommonApi.installFirmwareGateway(opData.uuid);
                then = (res) => {
                    CommonApi.updateGWDetails(opData.uuid, {
                        details: {
                            firmware: {
                                upgrade: {
                                    action_flag: "upgrade",
                                    download_id: null,
                                    status: null,
                                    details: null
                                }
                            }
                        }
                    }).catch(err => {
                        log.error("Updating gateway details when installing a new firmware failed.", err);
                    });
                    return res;
                };
                break;
            case "downgrade_firmware":
                func = self.downgradeGatewayVersion(opData.uuid);
                then = (res) => {
                    CommonApi.updateGWDetails(opData.uuid, {
                        details: {
                            firmware: {
                                upgrade: {
                                    action_flag: "revert",
                                    download_id: null,
                                    status: null,
                                    details: null
                                }
                            }
                        }
                    }).catch(err => {
                        log.error("Updating gateway details when reverting to the previous firmware failed.", err);
                    });
                    return res;
                }
                break;

            case "uninstall":
                log.debug("Processing system uninstall request");
                CommonApi.uninstall().then(() => {
                    log.debug("System uninstall processed");
                    connection.sendUTF(JSON.stringify({ action: 'backend-response', status: true, key: data.key, actionid: data.id, actionresult: null }));
                    resolve()
                }).catch((err) => {
                    log.error(err);
                    connection.sendUTF(JSON.stringify({ action: 'backend-response', status: true, key: data.key, actionid: data.id, actionresult: null }));
                    resolve()
                })
                return;
                break;
        }

        if (func && opData.operation == "get_gateway_avail_fw") {
            var fwinfo = undefined;

            func.then((res) => {
                fwinfo = res;

                return CommonApi.refreshGWFwInfo(opData.value, res);
            }).then(() => {
                connection.sendUTF(JSON.stringify({ action: 'backend-response', status: true, key: data.key, actionid: data.id, actionresult: fwinfo }));
                resolve();
            }, (error) => {
                connection.sendUTF(JSON.stringify({ action: 'backend-response', status: true, key: data.key, actionid: data.id, actionresult: fwinfo }));
                resolve();
            }).catch((error) => {
                log.error(error)
                connection.sendUTF(JSON.stringify({ action: 'backend-response', status: false, key: data.key, actionid: data.id, actionresult: false }));
                resolve();
            })
        } else if (func) {
            func.then(then).then((res) => {
                connection.sendUTF(JSON.stringify({ action: 'backend-response', status: true, key: data.key, actionid: data.id, actionresult: res }));
                resolve();
            }).catch((error) => {
                log.error(error)
                connection.sendUTF(JSON.stringify({ action: 'backend-response', status: false, key: data.key, actionid: data.id, actionresult: false, error: error }));
                resolve();
            })
        } else {
            log.warn("Could not process request " + JSON.stringify(opData));
            connection.sendUTF(JSON.stringify({ action: 'backend-response', status: false, key: data.key, actionid: data.id, actionresult: false }));
            resolve();
        }
    })
}

function registerImpl(self, cloudRest, etcdCreds, local_ip, displayName) {
    return new Promise((resolve, reject) => {

        if (self._cloudRefreshInterval) {
            clearInterval(self._cloudRefreshInterval);
            self._cloudRefreshInterval = null;
        }


        cloudRest.registerSrv({ org_id: etcdCreds.org_id, usr: etcdCreds.usr, pwd: etcdCreds.pwd, domain: etcdCreds.domain, local_ip: local_ip }).then((result) => {

            if (result.status) {
                // set a keep alive for the lease
                log.debug("Registered server with domain " + etcdCreds.domain + " and local ip " + local_ip);

                if (self._cloudRefreshInterval) {
                    clearInterval(self._cloudRefreshInterval);
                    self._cloudRefreshInterval = null;
                }
                self._firebaseMessaging.init(result.firebase)
                    .catch(err => {
                        log.error("Error initilizing firebase with provided config.", err)
                    });

                self.emit('cloud::registration::confirmed');
                
                if (displayName && displayName !== '')
                    cloudRest.registerDeploymentSrv({ domain: etcdCreds.domain, settings: { deployment: { display_name: displayName } } }).then(() => {
                        log.debug("display name setting request with domain " + etcdCreds.domain + " and display name " + displayName);
                    }).catch((err) => {
                        log.error("Deployment setting for display name error:", err);
                    })
                /*self._cloudRefreshInterval = setInterval(function (_self, leaseId, rest, creds) {
                    rest.refreshLease({ org_id: creds.org_id, usr: creds.usr, pwd: creds.pwd, lease: leaseId }).then((ref) => {

                        if (ref.status) {
                            log.debug("Lease " + leaseId + " refreshed");
                            self._firebaseMessaging.reset(result.firebase)
                                .catch(err => {
                                    log.error("Resetting firebase credentials error: ", err)
                                })
                        } else {
                            log.warn("Lease " + leaseId + " refresh failed. Error: " + ref.msg);
                            clearInterval(_self._cloudRefreshInterval);
                            _self._cloudRefreshInterval = null;

                            // set a timeout to try to register again in 10 seconds
                            setTimeout((obj, _cloudRest, _etcdCreds, _local_ip) => {
                                registerImpl(obj, _cloudRest, _etcdCreds, _local_ip)
                            }, 10000, _self, rest, creds, local_ip);
                        }
                    }).catch((err) => {
                        log.error(err);

                        if (_self._cloudRefreshInterval) {
                            clearInterval(_self._cloudRefreshInterval);
                            _self._cloudRefreshInterval = null;
                        }

                        // set a timeout to try to register again in 10 seconds
                        setTimeout((obj, _cloudRest, _etcdCreds, _local_ip) => {
                            registerImpl(obj, _cloudRest, _etcdCreds, _local_ip)
                        }, 10000, _self, rest, creds, local_ip);
                    });
                }, 300000, self, result.lease, cloudRest, etcdCreds);*/

                resolve();
            } else {

                if (self._cloudRefreshInterval) {
                    clearInterval(self._cloudRefreshInterval);
                    self._cloudRefreshInterval = null;
                }

                // set a timeout to try to register again in 10 seconds
                setTimeout((obj, _cloudRest, _etcdCreds, _local_ip) => {
                    registerImpl(obj, _cloudRest, _etcdCreds, _local_ip)
                }, 10000, self, cloudRest, etcdCreds, local_ip);

                log.warn('Cloud registration error: ' + result.msg);

                resolve();
            }
        }).catch((err) => {

            log.warn('Cloud registration error: ' + err);

            if (self._cloudRefreshInterval) {
                clearInterval(self._cloudRefreshInterval);
                self._cloudRefreshInterval = null;
            }

            // set a timeout to try to register again in 10 seconds
            setTimeout((obj, _cloudRest, _etcdCreds, _local_ip) => {
                registerImpl(obj, _cloudRest, _etcdCreds, _local_ip)
            }, 10000, self, cloudRest, etcdCreds, local_ip);

            resolve();
        })
    });

}

function unregisterImpl(self, cloudRest, etcdCreds, local_ip) {
    cloudRest.unregisterSrv({ org_id: etcdCreds.org_id, domain: etcdCreds.domain, local_ip: local_ip }).then(() => {
        log.debug("UnRegistered server with domain " + etcdCreds.domain + " and local ip" + local_ip);
    }).catch((err) => {
        log.warn(err)
    })
}

BackendServer.prototype.deploymentSettings = function (data) {
    return new Promise((resolve, reject) => {
        if (data && data.display_name) {
            var self = this;
            self._cloudRest.registerDeploymentSrv({ domain: self._etcdCreds.domain, settings: { deployment: { display_name: data.display_name } } }).then(() => {
                log.debug("display name setting request with domain " + self._etcdCreds.domain + " and display name " + data.display_name);
                self.updateDisplayName({display_name: data.display_name})
                resolve();
            }).catch((err) => {
                log.warn(err)
                reject("Deployment setting for display name error");
            })
        } else
            reject("Invalid display name");
    });
}

BackendServer.prototype.addUser = function (data) {
    return this._api.addUser(data);
}

BackendServer.prototype.getDisplayName = function () {
    return this._api.getDisplayName();
}

BackendServer.prototype.updateDisplayName = function (data) {
    return this._api.updateDisplayName(data);
}

BackendServer.prototype._connectSR = function () {
    return new Promise((resolve, reject) => {
        var self = this;
        if (!self._cloudRest) {
            self._api.getSRCredentials().then((creds) => {
                self._licensed = creds.licenseExpired ? false : true;
                if (self._zulu) {
                    self._zulu.allowOnlyAdmins = creds.licenseExpired;
                }
                self._iot_permission_groups = creds.iot_permission_groups;
                self._srCreds = { key: creds.key, token: creds.token };
                self._etcdCreds = { org_id: creds.org_id, domain: creds.domain, usr: creds.etcd_usr, pwd: creds.etcd_pwd };
                self._cloudRest = new CloudRestClient(self._srCreds);
                resolve(self._cloudRest)
            }).catch((err) => {
                log.error(err);
                reject(err);
            })
        } else {
            resolve(self._cloudRest);
        }
    });
}

BackendServer.prototype.register = function (host, displayName) {
    return new Promise((resolve, reject) => {
        var self = this;
        self._connectSR().then(() => {
            return registerImpl(self, self._cloudRest, self._etcdCreds, host, displayName)
        }).then(() => {
            resolve();
        }).catch((err) => {
            log.error(err);
            reject(err);
        })
    });
}

BackendServer.prototype.getProviderAvailableFwInfo = function (provider, version) {
    return new Promise((resolve, reject) => {
        var self = this;
        if (!version) {
            self._connectSR().then(() => {
                return  CommonApi.getFirmwareVersions(provider);
            }).then((versions_details) =>{
                let promise = [];
                versions_details.forEach( (v) => {
                    promise.push(CommonApi.getDownwardCompatibleFunction(v, "version_check_ep"));
                });
                return Promise.all(promise);
            }).then((funcs) => {
                let result = [];
                funcs.forEach((func) =>{
                    if (func.func) {
                        result.push(self._cloudRest[func.func](provider, func.current_version.major_version));
                    } else {
                        result.push(self._cloudRest.getDevelcoLatestFWInfoFromFWDownloadServer(provider, func.current_version.major_version));
                    }
                });
                return Promise.all(result);
            })
            .then((results) => {
                let final = [];
                if (results && results.length)
                    for (let i = 0, length = results.length; i < length; i++) {
                        if (results[i] == undefined || !results[i].status )
                            log.error("BackendServer:getProviderAvailableFwInfo:error>", results[i].message);
                        else
                            final.push(results[i].info);
                    }
                resolve(final);
            }).catch((err) => {
                reject(err.message);
            })
        } else
            self._connectSR().then(() => {
                return CommonApi.getVersionDetails(version);
            }).then((ver_details) => {
                return CommonApi.getDownwardCompatibleFunction(ver_details, "version_check_ep");          
            }).then((func) => {
                var promise = [];
                if (func.func) {
                    promise.push(self._cloudRest[func.func](provider, func.current_version.major_version));
                } else {
                    promise.push(self._cloudRest.getDevelcoLatestFWInfoFromFWDownloadServer(provider, func.current_version.major_version));
                }
                return Promise.all(promise);
            })
            .then((result) => {
                result = (0 in result)? result[0]: null;
                let final = [];
                if (! 'status' in result)
                    log.error("BackendServer:getProviderAvailableFwInfo:error>", result.message);
                else
                    final.push(result.info);

                resolve(final);
            }).catch((err) => {

                reject(err.message);
            })
    })
}

BackendServer.prototype.downgradeGatewayVersion = function (uuid) {
    return new Promise((resolve, reject) => {
        CommonApi.checkGatewaysInInstallProcess()
            .then(how_many => {
                if (how_many == 0) {
                    return GatewayApi.getGateway(uuid)
                } else {
                    reject("Not able to perform any action while a gateway is installing a new firmware.");
                }
                return null;
            }).then(gateway => {
                if (!gateway || gateway.length == 0) {
                    return null;
                }
                gateway = gateway[0];
                let details = typeof gateway.details == "string" ? JSON.parse(gateway.details) : gateway.details;
                if (details && details.firmware != undefined && details.firmware.previous_version != undefined) {
                    this._connectSR().then(() => {
                        return this._cloudRest.downgradeGatewayVersion({
                            org_id: this._etcdCreds.org_id,
                            serial: details.phyId,
                            usr: this._etcdCreds.usr,
                            pwd: this._etcdCreds.pwd,
                            version: details.firmware.previous_version
                        }).catch(err => {
                            log.error("BackendServer:downgradeGatewayVersion:error:>", err);
                            return err;
                        })
                    }).then((result) => {
                        if (!result.status) {
                            reject(result.message);
                            return;
                        }
                        resolve(result);
                    }).catch(error => {
                        reject(error.message);
                    });
                } else {

                    reject("There is no firmware information ");
                }
            });
    })
}
BackendServer.prototype.updateGWCertificate = function (uuid) {
    return new Promise((resolve, reject) => {
        CommonApi.checkGatewaysInInstallProcess()
            .then(how_many => {
                if (how_many == 0)
                    return GatewayApi.getGateway(uuid);
                else
                    reject("Not able to perform any action while a gateway is installing a new firmware.");
            }).then(gateway => {
                var cloud_req = {};
                if (gateway.length == 0) {
                    reject("Gateway not found.");
                    return null;
                }
                gateway = gateway[0];
                let details = typeof gateway.details == "string" ? JSON.parse(gateway.details) : gateway.details,
                    self = this;
                var version = details && details.firmware.version ? details.firmware.version : undefined;
                this._connectSR().then(() => {
                    if (!config.iot.cloud) {
                        reject("Unable to find cloud configurations");
                        return null
                    }
                    if (!config.iot.cloud.fw_download) {
                        reject("Unable to find cloud configurations for firmware download");
                        return null
                    }
                    return CommonApi.getVersionDetails(version);
                }).then((version_details) => {
                    cloud_req = {
                        org_id: self._etcdCreds.org_id,
                        serial: details.phyId,
                        usr: self._etcdCreds.usr,
                        pwd: self._etcdCreds.pwd
                    }
                    return CommonApi.getDownwardCompatibleFunction(version_details, "cert_renewal_ep");
                }).then(async(comp_func)=>{
                    if(comp_func.func){
                        return this._cloudRest[comp_func.func](cloud_req);
                    } else {
                        let certificate = await  this.runShellCommand("{ echo -n | openssl s_client -sess_out  /tmp/output.txt -verify_quiet -connect " + config.iot.cloud.fw_download.aws_s3.host +
                        ":443  2>&1 | sed -ne '/-BEGIN CERTIFICATE-/,/-END CERTIFICATE-/p' & echo -n | openssl s_client -sess_out  /tmp/output.txt -verify_quiet -connect " + config.iot.cloud.fw_download.aws_gw_endpoint.host +
                        ":443  2>&1 | sed -ne '/-BEGIN CERTIFICATE-/,/-END CERTIFICATE-/p'; } ");
                        if (certificate) cloud_req.cert = certificate;
                        return this._cloudRest.updateGWCertificateFWDownloadServer(cloud_req);
                    }
                }).then((result) => {
                    if (result && !result.status) {
                        reject(result.message);
                        return;
                    }
                    resolve(result)
                }).catch((err) => {
                    reject(err.message);
                })
            });

    })
}




BackendServer.prototype.addGateway = function (serial) {
    return new Promise((resolve, reject) => {
        var self = this;
        self._connectSR().then(() => {
            var data = {
                org_id: self._etcdCreds.org_id, domain: self._etcdCreds.domain,
                usr: self._etcdCreds.usr, pwd: self._etcdCreds.pwd, serial: serial
            };
            return self._cloudRest.addGateway(data);
        }).then((result) => {
            if (!result.status) {
                log.error(result.msg);
                reject(result.msg);
                return;
            }
            resolve(result.host);
        }).catch((err) => {
            log.error(err);
            reject(err);
        })
    });
}

BackendServer.prototype.removeGateway = function (serial) {
    return new Promise((resolve, reject) => {
        var self = this;
        self._connectSR().then(() => {
            var data = {
                org_id: self._etcdCreds.org_id, domain: self._etcdCreds.domain,
                usr: self._etcdCreds.usr, pwd: self._etcdCreds.pwd, serial: serial
            };
            return self._cloudRest.removeGateway(data);
        }).then((result) => {
            if (!result.status) {
                log.error(result.msg);
                reject(result.msg);
                return;
            }
            resolve();
        }).catch((err) => {
            log.error(err);
            reject(err);
        })
    });
}

BackendServer.prototype.getGatewayIP = function (serial) {
    return new Promise((resolve, reject) => {
        var self = this;
        self._connectSR().then(() => {
            var data = {
                org_id: self._etcdCreds.org_id, domain: self._etcdCreds.domain,
                usr: self._etcdCreds.usr, pwd: self._etcdCreds.pwd, serial: serial
            };
            return self._cloudRest.getGatewayIP(data);
        }).then((result) => {
            if (!result.status) {
                log.warn(result.msg);

                if (result.msg.includes('Gateway not assigned to organisation')) {
                    // if cloud does not know about us using this gateway, let's register ourserlf
                    self.addGateway(serial).then((res) => {
                        if (result.status && result.host && result.host != 'unknown') {
                            resolve(result.host);
                        } else {
                            resolve(null);
                        }
                    }).catch((error) => {
                        log.warn(error)
                        resolve(null);
                    })
                } else {
                    resolve(null);
                }
            } else {
                resolve(result.host)
            }
        }).catch((err) => {
            log.warn(err);
            resolve(null);
        })
    })
}

BackendServer.prototype._SendSRMessage = function (message, data) {
    return new Promise((resolve, reject) => {
        var self = this;
        self._connectSR().then(() => {
            data.domain = self._etcdCreds.domain;
            log.debug('Sending cloud request ' + JSON.stringify(data));
            return self._cloudRest[message](data)
        }).then((res) => {
            log.debug('Received cloud response ' + JSON.stringify(res));
            resolve(res);
        }).catch((err) => {
            log.error(err);
            reject(err);
        })
    })
}

BackendServer.prototype._eventHandler = function (connection, data) {
    var self = this;
    if (data.type == 'backend_command') {

        let event = 'ws::message::' + data.command
        if (data.module) {
            event = 'ws::message::' + data.module + '::' + data.command
        }
        if (EventEmitter.listenerCount(this, event) > 0) {
            this.emit(event, connection, data)
        } else {
            log.warn(`[Backend Server]: Event '${event}' has 0 listeners. Command was rejected`);
            connection.sendUTF(JSON.stringify({
                action: 'backend-response', key: data.key,
                status: false, actionid: data.id, message: 'invalid command'
            }))
        }
    }
}

BackendServer.prototype.sendPushNotifications = function (userIds, notification, refreshTimeout) {
    return new Promise((resolve, reject) => {
        if (this._firebaseMessaging)
            PropertyApi.getUserFirebaseTokens(userIds).then(result => {
                return result.map(prop => prop.get('value'));
            }).then((tokens) => {
                if (tokens && tokens.length > 0) {
                    this._firebaseMessaging.send({
                        type: "token",
                        to: tokens,
                        message: {
                            title: notification.title,
                            body: notification.body
                        }
                    })
                        .then(result => {
                            var q = require('q');
                            var promises = [];
                            result.responses.forEach((res, idx) => {
                                log.debug("RESTULT AFTER SENDING TOKENS", res.error, tokens);
                                if (!res.success &&
                                    res.error.errorInfo &&
                                    res.error.errorInfo.message &&
                                    ["The registration token is not a valid FCM registration token"].includes(res.error.errorInfo.message)) {
                                    promises.push(PropertyApi.removeFirebaseTokensByValue(tokens[idx]));
                                }
                            });
                            q.all(promises).catch((err) => {
                                log.warn("Error while removing firebase tokens :", err);
                            });
                            resolve(true)
                        })
                        .catch(err => {
                            // Let's try to don't lose any message
                            let hour = 3600000;
                            if (!refreshTimeout || refreshTimeout < hour)
                                setTimeout(() => {
                                    this._firebaseMessaging

                                        .reset(this._firebaseMessaging.credentials)
                                        .then(() => {
                                            this.sendPushNotifications(userIds, notification, (refreshTimeout || 2000) * 2);
                                        })
                                        .catch(err => {
                                            log.error("Error on refreshing firebase config", err);
                                        });
                                }, refreshTimeout || 2000);
                        });
                }
            })
    })
}

BackendServer.prototype.runShellCommand = function (cmd) {
    return new Promise((resolve, reject) => {
        exec(cmd, (error, stdout, stderr) => {
            if (error) return reject(error)
            if (stderr) return reject(stderr)
            resolve(stdout)
        })
    })
}
module.exports = BackendServer
