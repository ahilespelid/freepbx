const WebSocketServer = require('websocket').server;
const WebSocketConnection = require('websocket').connection;
var http = require('http');
const httpShutdown = require('http-shutdown');
const { EventEmitter } = require('events');
const util = require("util");
const ImageCaptureWorker = require("./workers/ImageCaptureWorker.js");
const EventHistory = require('../models/EventHistory');

const AccessProfileAPI = require('../api/iot/access-profile-api.js');
const GuestListAPI = require('../api/iot/guest-access-api.js');
const AutomatedActionAPI = require('../api/iot/automated-action-api.js');
const CommonAPI = require('../api/iot/common-api.js');

const Group = require('../models/Group');
const config = require('config');

function WatchDogWSServer() {
	this.ws_server = undefined;
	this.connections = new Map();
	this.workers = new Map();
	this.backendServerConnectionId = undefined;
	this._token = undefined;
}

util.inherits(WatchDogWSServer, EventEmitter);

WatchDogWSServer.prototype.init = function () {
	return new Promise((resolve, reject) => {

		var self = this;

		var server = httpShutdown(http.createServer(function (request, response) {
			self.emit('log', { level: 'warn', text: 'Received request for ' + request.url });
			response.writeHead(404);
			response.end();
		}));

		server.listen(10080, '127.0.0.1', function () {
			self.emit('log', { level: 'debug', text: 'Watchdog controller websocket server is listening on 127.0.0.1:10080' });
		});

		this.ws_server = new WebSocketServer({
			httpServer: server,
			autoAcceptConnections: false,
			maxReceivedFrameSize: 200000000,
			maxReceivedMessageSize: 200000000
		});

		this.ws_server.on('request', self._processRequests.bind(self));

		resolve(this);
	});
}

WatchDogWSServer.prototype._processRequests = function (request) {

	function originIsAllowed(request) {
		return (request.remoteAddress === '127.0.0.1');
	}

	if (!originIsAllowed(request)) {
		request.reject();
		return;
	}

	var connection = request.accept(null, request.origin);

	// remember the connection to allow sending events to it.
	this.connections.set(request.key, connection);
	if (config.log.verboseEvents) {
		this.emit('log', { level: 'debug', text: 'Watchdog controller websocket new connection accepted' });
	}
	var self = this;

	connection.on('message', function (message) {
		var data = undefined;

		try {
			if (message.type === 'utf8') {
				//self.emit('log', {level: 'debug', text: 'Received utf8 data'});
				data = JSON.parse(message.utf8Data);
			} else if (message.type === 'binary') {
				//self.emit('log', {level: 'debug', text: 'Received binary data'});
				data = message.binaryData.toJSON();
			}
		} catch (err) {
			self.emit('log', { level: 'error', text: 'Backend server error: ' + err });
			connection.drop(WebSocketConnection.CLOSE_REASON_UNPROCESSABLE_INPUT, err);
			self._removeConnection(request, connection)
			return
		}

		if (data && data.action == "register-backend-server") {
			if (!self.backendServerConnectionId) {
				self.backendServerConnectionId = request.key;
				self._token = data.token;
			} else if (self.backendServerConnectionId != request.key) {
				var err = 'Backend server connection already registered with id' + self.backendServerConnectionId;
				self.emit('log', { level: 'warn', text: err });
				connection.drop(WebSocketConnection.CLOSE_REASON_UNPROCESSABLE_INPUT, err);
				self._removeConnection(request, connection);
			}
		} else if (data && data.action == "start-capture-worker") {
			self._startWorker(connection, data);
		} else if (data && data.action == "stop-capture-worker") {
			self._stopWorker(connection, data.uuid);
		} else if (data && data.action == "backend-command") {
			self._processBackendCommand(request, connection, data);
		} else if (data && data.action == "backend-response" && request.key == self.backendServerConnectionId) {
			var conn = self.connections.get(data.key);
			if (conn) {
				if (message.type === 'binary') {
					conn.send(message.binaryData);
				} else {
					conn.sendUTF(JSON.stringify(data));
				}
			}
		} else {
			var err = 'Unknow message type ' + message.type + ' or action ' + data.action
			self.emit('log', { level: 'error', text: err });
			connection.drop(WebSocketConnection.CLOSE_REASON_UNPROCESSABLE_INPUT, err);
			self._removeConnection(request, connection)
		}
	});

	connection.on("close", function (reasonCode, description) {
		self._stopWorkers(connection);
		self._removeConnection(request, connection)
	});

	connection.on("error", function (error) {
		self.emit('log', { level: 'error', text: error });
		self._stopWorkers(connection);
		self._removeConnection(request, connection)
	});
}

WatchDogWSServer.prototype._removeConnection = function (request, connection) {
	var self = this;
	var conn = self.connections.get(request.key);
	if (conn && conn.socket.remoteAddress === connection.socket.remoteAddress &&
		conn.socket.remotePort === connection.socket.remotePort) {
		self.connections.delete(request.key);
		if (self.backendServerConnectionId == request.key) {
			// backend disconnecting
			self.backendServerConnectionId = null;
		}
	}
}

function _getEventHistory(connection, data) {
	return new Promise((resolve, reject) => {
		var qb = EventHistory;
		if (data.data.sort) {
			qb = qb.forge().orderBy('event_time', data.data.sort);
		}

		if (data.data.filters) {
			Object.keys(data.data.filters).forEach((key) => {
				if(! ( 'operation' in data.data.filters[key] )) {
					Object.keys(data.data.filters[key]).forEach((k) => {
						qb = qb.where(key, data.data.filters[key][k].operation,data.data.filters[key][k].values);
					});
				} else {
					qb = qb.where(key, data.data.filters[key].operation, data.data.filters[key].values);
				}
			})
		}
		if (data.data.pagination) {
			qb = qb.fetchPage({ pageSize: data.data.pagination.page_size, page: data.data.pagination.page_number });
		} else {
			qb = qb.fetchAll();
		}

		qb.then((events) => {
			var result = { status: true, actionid: data.id, events: events.toJSON() };
			connection.sendUTF(JSON.stringify(result));
			resolve();
		}).catch((err) => {
			connection.sendUTF(JSON.stringify({ status: false, actionid: data.id, message: '' + err }));
			reject(err);
		});
	})
}

function _getSecuredGroups(connection, data) {
	return new Promise((resolve, reject) => {
		var secured_groups = [];
		Group.where('type', '=', "Outside Door").fetchAll().then((groups) => {
			groups.forEach((group) => {
				var details = group.get('details') ? JSON.parse(group.get('details')) : {};
				if (details.mustBeSecured === true) {
					secured_groups.push({ name: group.get('name'), uuid: group.get('uuid') });
				}
			})
			var result = { status: true, actionid: data.id, secured_groups: secured_groups };
			connection.sendUTF(JSON.stringify(result));
			resolve();
		}).catch((err) => {
			connection.sendUTF(JSON.stringify({ status: false, actionid: data.id, message: '' + err }));
			reject(err);
		});
	})
}
function _getDoorGroups(connection, data) {
	return new Promise((resolve, reject) => {
		var door_groups = [];
		Group.where('type', '=', "Outside Door").fetchAll().then((groups) => {
			groups.forEach((group) => {
				door_groups.push({ name: group.get('name'), uuid: group.get('uuid') });
			})
			var result = { status: true, actionid: data.id, door_groups: door_groups };
			connection.sendUTF(JSON.stringify(result));
			resolve();
		}).catch((err) => {
			connection.sendUTF(JSON.stringify({ status: false, actionid: data.id, message: '' + err }));
			reject(err);
		});
	})
}

function _getFirmwareInstallationStatus(connection, data) {
	return new Promise((resolve, reject) => {
		CommonAPI.checkFirmwareInstallationProcess(data.data.uuid)
			.then(res => {
				connection.sendUTF(JSON.stringify({ status: true, actionid: data.id, actionresult: res }));
				resolve();
			}).catch(err => {
				connection.sendUTF(JSON.stringify({ status: false, actionid: data.id, message: '' + err }));
				reject(err);
			});
	})
}

function _getGuestLists (connection, data) {
	return new Promise((resolve, reject) => {
		var _guestList = [];
		GuestListAPI.getAll().then((guests) => {
			_guestList = guests;
			return CommonAPI.getAll(false, ['name', 'uuid']);
		}).then((resp) => {
			resp['guest-profiles'] = _guestList;
			var result = { status: true, actionid: data.id, data: resp };
			connection.sendUTF(JSON.stringify(result));
			resolve();
		}).catch((err) => {
			connection.sendUTF(JSON.stringify({ status: false, actionid: data.id, message: 'Invalid Guest data' }));
			reject(err);
		})
	})
}
function _getAutomatedActions(connection, data) {
	return new Promise((resolve, reject) => {
		var _auto_actions = [];
		AutomatedActionAPI.getAll().then((auto_actions) => {
			_auto_actions = auto_actions;
			return CommonAPI.getAll(false, ['name', 'uuid']);
		}).then((resp) => {
			resp['automated-actions'] = _auto_actions;
			var result = { status: true, actionid: data.id, data: resp };
			connection.sendUTF(JSON.stringify(result));
			resolve();
		}).catch((err) => {
			connection.sendUTF(JSON.stringify({ status: false, actionid: data.id, message: 'Invalid Guest data' }));
			reject(err);
		})
	})
}
function _getGuest (connection, data) {
	return new Promise((resolve, reject) => {
		var _guest = [];
		GuestListAPI.getGuest(data.data.id).then((guest) => {
			_guest = guest;
			var result = { status: true, actionid: data.id, data: _guest };
			connection.sendUTF(JSON.stringify(result));
			resolve();
		}).catch((err) => {
			connection.sendUTF(JSON.stringify({ status: false, actionid: data.id, message: 'Invalid Guest data' }));
			reject(err);
		})
	})
}

function _setGuestProfile(connection, data) {
	return new Promise((resolve, reject) => {
		
		if (!data.data || !data.data.guestprofile) {
			connection.sendUTF(JSON.stringify({ status: false, actionid: data.id, message: 'Invalid Guest data' }));
			return resolve();
		}
		var func = undefined;
		if (data.data.guestprofile.id !== undefined) {
			func = GuestListAPI.updateGuest(data.data.guestprofile.id, data.data.guestprofile);
		} else {
			func = GuestListAPI.createGuestProfile(data.data.guestprofile);
		}
		func.then((guestprofile) => {
			var result = { status: true, actionid: data.id, data: guestprofile };
			connection.sendUTF(JSON.stringify(result));
		}).catch((err) => {
			connection.sendUTF(JSON.stringify({ status: false, actionid: data.id, message: '' + err }));
			reject(err);
		});
	})
}

function _getAccessProfiles(connection, data) {
	return new Promise((resolve, reject) => {
		var _profiles = [];
		AccessProfileAPI.getAll().then((profiles) => {
			_profiles = profiles;
			return CommonAPI.getAll(false, ['name', 'uuid']);
		}).then((resp) => {
			resp['api-profiles'] = _profiles;
			var result = { status: true, actionid: data.id, data: resp };
			connection.sendUTF(JSON.stringify(result));
			resolve();
		}).catch((err) => {
			connection.sendUTF(JSON.stringify({ status: false, actionid: data.id, message: '' + err }));
			reject(err);
		});
	})
}

function _setAccessProfile(self, connection, data) {
	return new Promise((resolve, reject) => {
		if (!data.data || !data.data.profile) {
			connection.sendUTF(JSON.stringify({ status: false, actionid: data.id, message: 'Invalid profile data' }));
			return resolve();
		}
		var func = undefined;
		if (data.data.profile.id !== undefined) {
			func = AccessProfileAPI.updateProfile(data.data.profile.id, data.data.profile);
		} else {
			func = AccessProfileAPI.createProfile(data.data.profile);
		}
		func.then((profile) => {
			var result = { status: true, actionid: data.id, data: profile };
			connection.sendUTF(JSON.stringify(result));
			self.emit('message', { msg_type: 'access-profile-command', msg_content: { type: 'run-process' } });
		}).catch((err) => {
			connection.sendUTF(JSON.stringify({ status: false, actionid: data.id, message: '' + err }));
			reject(err);
		});
	})
}
function _setAutomatedAction(self, connection, data) {
	return new Promise((resolve, reject) => {
		if (!data.data || !data.data.automated_action) {
			connection.sendUTF(JSON.stringify({ status: false, actionid: data.id, message: 'Invalid Automated action data' }));
			return resolve();
		}
		var func = undefined;
		if (data.data.automated_action.id !== undefined) {
			func = AutomatedActionAPI.updateAutomatedAction(data.data.automated_action.id, data.data.automated_action);
		} else {
			func = AutomatedActionAPI.createAutomatedAction(data.data.automated_action);
		}
		func.then((automated_action) => {
			var result = { status: true, actionid: data.id, data: automated_action };
			connection.sendUTF(JSON.stringify(result));
			self.emit('message', { msg_type: 'automated-action-command', msg_content: { type: 'run-autoaction-alter' } });
		}).catch((err) => {
			connection.sendUTF(JSON.stringify({ status: false, actionid: data.id, message: '' + err }));
			reject(err);
		});
	})
}

function _removeAccessProfile(self, connection, data) {
	return new Promise((resolve, reject) => {
		if (!data.data || !data.data.profile || data.data.profile.id === undefined) {
			connection.sendUTF(JSON.stringify({ status: false, actionid: data.id, message: 'Invalid profile data' }));
			return resolve();
		}
		AccessProfileAPI.removeProfile(data.data.profile.id).then(() => {
			var result = { status: true, actionid: data.id };
			connection.sendUTF(JSON.stringify(result));
			self.emit('message', { msg_type: 'access-profile-command', msg_content: { type: 'run-process' } });
		}).catch((err) => {
			connection.sendUTF(JSON.stringify({ status: false, actionid: data.id, message: '' + err }));
			reject(err);
		});
	})
}
function _removeGuestProfile(self, connection, data) {
	return new Promise((resolve, reject) => {
		if (!data.data || !data.data.profile || data.data.profile.id === undefined) {
			connection.sendUTF(JSON.stringify({ status: false, actionid: data.id, message: 'Invalid profile data' }));
			return resolve();
		}
		GuestListAPI.removeGuestProfile(data.data.profile.id).then(() => {
			var result = { status: true, actionid: data.id };
			connection.sendUTF(JSON.stringify(result));
		}).catch((err) => {
			connection.sendUTF(JSON.stringify({ status: false, actionid: data.id, message: '' + err }));
			reject(err);
		});
	})
}
function _removeAutomatedAction(self, connection, data) {
	return new Promise((resolve, reject) => {
		if (!data.data || !data.data.automated_action || data.data.automated_action.id === undefined) {
			connection.sendUTF(JSON.stringify({ status: false, actionid: data.id, message: 'Invalid Automated action data' }));
			return resolve();
		}
		AutomatedActionAPI.removeAutomatedAction(data.data.automated_action.id).then(() => {
			var result = { status: true, actionid: data.id };
			connection.sendUTF(JSON.stringify(result));
			self.emit('message', { msg_type: 'automated-action-command', msg_content: { type: 'run-autoaction-delete' } });
		}).catch((err) => {
			connection.sendUTF(JSON.stringify({ status: false, actionid: data.id, message: '' + err }));
			reject(err);
		});
	})
}

WatchDogWSServer.prototype._processBackendCommand = function (request, connection, data) {
	var self = this;
	if (data.command == 'login') {
		if (!this._token || !data.token || data.token !== this._token) {
			connection.drop(WebSocketConnection.CLOSE_REASON_POLICY_VIOLATION, 'Invalid Login credentials');
			self._removeConnection(request, connection);
		} else {
			if (config.log.verboseEvents) {
				self.emit('log', { level: 'debug', text: `${connection.remoteAddress} [BACKEND] [${request.key}] connected` });
			}

			connection.sendUTF(JSON.stringify({ 'status': true, 'type': 'auth', 'message': 'authenticated' }));
		}
	} else if (data.command) {

		var conn = self.connections.get(request.key);
		if (!conn) {
			self.emit('log', { level: 'error', text: `Can't find authenticated connection with key [${request.key}]` });
			connection.drop(WebSocketConnection.CLOSE_REASON_POLICY_VIOLATION, 'Unauthenticated remote');
			self._removeConnection(request, connection);
			return;
		}
		//self.emit("log", { level: "debug", text: "watchdog-service:> " + JSON.stringify(data) })
		if (data.command == 'get_events') {
			// module is requesting for events history, no need to send to backend, 
			// process the reuqest from the watchdog itself..
			_getEventHistory(connection, data);
		} else if (data.command == 'get_secured_groups') {
			// module is requesting for secured group list, no need to send to backend, 
			// process the reuqest from the watchdog itself..
			_getSecuredGroups(connection, data);
		}  else if (data.command == 'get_door_groups') {
			// module is requesting for door group list, no need to send to backend, 
			// process the reuqest from the watchdog itself..
			_getDoorGroups(connection, data);
		}  else if (data.command == 'get_access_profiles') {
			// module is requesting for access profile list, 
			// process the reqest from the watchdog itself..
			_getAccessProfiles(connection, data);
		} else if (data.command == 'set_access_profile') {
			// module is requesting for access profile update, 
			// process the reqest from the watchdog itself..
			_setAccessProfile(self, connection, data);
		} else if (data.command == 'del_access_profile') {
			_removeAccessProfile(self, connection, data);
		} else if (data.command == 'get_automated_actions'){
			_getAutomatedActions(connection,data);
		} else if (data.command == 'set_automated_action'){
			_setAutomatedAction(self, connection, data);
		} else if (data.command == 'del_automated_action'){
			_removeAutomatedAction(self, connection, data)
		}
		else if (data.command == 'troubleshoot' && data.data.operation == 'check_fw_process') {
			_getFirmwareInstallationStatus(connection, data);
		} else if (data.command == 'get_guest_lists') {
			_getGuestLists(connection, data);
		} else if (data.command == 'get_guest') {
			_getGuest(connection, data);
		} else if (data.command == 'set_guest_profile') {
			_setGuestProfile(connection, data);
		} else if (data.command == 'del_guest_profile') {
			_removeGuestProfile(self, connection, data);
		} 
			
		else {
			data.key = request.key; // remember the key to allow forwarding any response from backends
			if (config.log.verboseEvents) {
				self.emit('log', { level: 'debug', text: `SERVER <= [BACKEND] [${connection.remoteAddress}] [${request.key}]:` + JSON.stringify(data) });
			}
			var client = self._getBackendConnection();
			if (client) {
				data.type = 'backend_command';
				client.sendUTF(JSON.stringify(data));
			} else {
				connection.sendUTF(JSON.stringify({ status: false, actionid: data.id, message: 'Offline Backend' }));
			}
		}
	} else {
		connection.sendUTF(JSON.stringify({ status: false, actionid: data.id, message: 'Invalid command' }));
	}
}

WatchDogWSServer.prototype._getBackendConnection = function () {
	var self = this;
	if (!self.backendServerConnectionId) {
		return null;
	}
	return self.connections.get(self.backendServerConnectionId);
}

WatchDogWSServer.prototype._startWorker = function (connection, data) {
	var key = connection.socket.remoteAddress + ":" + connection.socket.remotePort + ":" + data.uuid;
	if (!this.workers.get(key)) {
		var worker = undefined;
		if (data.action == "start-capture-worker") {
			worker = new ImageCaptureWorker(data.uuid);
		}

		if (worker) {
			worker.initialize(data.config, connection)
			worker.on("log", this._processWorkerLog.bind(this));
			var interval = data.interval ? data.interval : 1000;
			var timer = setInterval(worker.doWork.bind(worker), interval);
			this.workers.set(key, { worker: worker, timer: timer });
		}
	}
}

WatchDogWSServer.prototype._stopWorkers = function (connection) {
	var keyPrefix = connection.socket.remoteAddress + ":" + connection.socket.remotePort + ":";
	var stopUuids = [];
	var self = this;
	for (var [key, workerData] of this.workers.entries()) {
		if ((keyPrefix + workerData.id) === key) {
			stopUuids.push(workerData.id);
		}
	}
	stopUuids.forEach((uuid) => {
		self._stopWorker(connection, uuid);
	});
}

WatchDogWSServer.prototype._stopWorker = function (connection, uuid) {
	var key = connection.socket.remoteAddress + ":" + connection.socket.remotePort + ":" + uuid;
	workerData = this.workers.get(key)
	if (workerData) {
		workerData.worker.stop();
		clearInterval(workerData.timer);
		this.workers.delete(key)
	}
}

WatchDogWSServer.prototype._processWorkerLog = function (log) {
	this.emit('log', log);
}


exports.WatchDogWSServer = WatchDogWSServer
