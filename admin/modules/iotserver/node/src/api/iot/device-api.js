const Device = require('../../models/Device.js');
const ObjectProperty = require('../../models/ObjectProperty.js');
const Gateway = require('../../models/Gateway.js');
const dispatcher = require('../../lib/iot/event-dispatcher.js');
const GroupAPI = require('./group-api.js');
const PHY_TYPES = ['zigbee', 'electrical-stryke', 'electrical-contact', 'electrical-button', 'intercom'/*,  'bluetooth-low-energy', sip'*/];

module.exports.getAll = (return_type = false) => {
	return new Promise((resolve, reject) => {
		Device.fetchAll().then((devices) => {
			var _devices = devices ? devices.toJSON() : [];
			_devices.forEach((device) => {
				device.details = device.details ? JSON.parse(device.details) : {};
				if (device.actions && typeof device.actions === 'string') {
					device.actions = JSON.parse(device.actions);
				}
			})
			if (!return_type) {
				resolve(_devices);
			} else {
				resolve({ devices_physical_types: PHY_TYPES, devices: _devices })
			}

		});
	});
}

module.exports.getDevice = (device_uuid) => {
	return new Promise((resolve, reject) => {
		Device.where({ uuid: device_uuid }).fetch().then((device) => {
			if (!device) {
				resolve({})
			} else {
				resolve(device.toJSON());
			}
		});
	});
}
module.exports.getDeviceOnGroupByType = (group_uuid,type) => {
	return new Promise((resolve, reject) => {
		Device.where({ group_uuid: group_uuid,type:type }).fetch().then((device) => {
			if (!device) {
				resolve({})
			} else {
				resolve(device.toJSON());
			}
		});
	});
}

module.exports.DEVICES_PHY_TYPES = PHY_TYPES;

module.exports.addDevice = (data, iotManager) => {
	return new Promise((resolve, reject) => {
		var self = this;
		if (!data.physical_type || !self.DEVICES_PHY_TYPES.includes(data.physical_type)) {
			reject("Unsupported device type");
		} else if (!data.gateway_uuid) {
			reject("Unspecified device gateway");
		} else {
			Gateway.where({ uuid: data.gateway_uuid }).fetch().then((gateway) => {
				let details = gateway != undefined ? JSON.parse(gateway.get("details")) : { firmware: {} },
					{ firmware: { upgrade } } = details.firmware ? details : { firmware: {} };
				if (!gateway) {
					reject("Unknown gateway " + data.gateway_uuid);
				} else if (gateway.get("state") !== 'ready') {
					reject("Cannot add devices to gateway with state " + gateway.get("state"));
				} else if (upgrade != undefined && upgrade.action_flag != null) {
					reject("Connot add a device to a gateway which is being updating.")
				} else {
					if (!data.duration || parseInt(data.duration) < 120) {
						data.duration = 120;
					}
					if (!data.physical_id) {
						data.physical_id = '';
					}
					
					data.device_provider = gateway.get("provider");
					var provider = iotManager.getProvider(data.device_provider);
					if (!provider) {
						reject("Unsupported device provider " + data.device_provider);
						return;
					}
					var physical_id = data.physical_id;
					var gateway_details = JSON.parse(gateway.get("details"));
					if (data.device_provider == 'cyberdata' && ['electrical-stryke', 'electrical-contact', 'electrical-button'].includes(data.physical_type)) {
						data.device_position = physical_id;
						physical_id = gateway_details.phyId + '-' + data.physical_type + '-' + physical_id;
					} else if (['zigbee', 'bluetooth-low-energy'].includes(data.physical_type)) {
						var index = physical_id.indexOf("$I:")
						if (physical_id.startsWith("Z:") && index !== -1) {
							physical_id = physical_id.substring(2, index);
						} else if (physical_id.startsWith("|")) {
							var arr_msg = physical_id.toString().split('|');
							physical_id = arr_msg[1];
						}
					}
					data.physical_id = physical_id;
					var api = provider.api;

					if (data.physical_id && data.physical_id.trim()) {
						var time = setTimeout(() => {
							dispatcher.removePendingDevice(data.physical_id);
							var topic = "devices:new-device";
							var evt = { type: "event", data: "timeout", device: { id: physical_id, type: "new-device", "state": "fail", topic: topic } };
							dispatcher.dispatch(evt);
						}, 1000 * (parseInt(data.duration) + 10));

						dispatcher.addPendingDevice({ id: physical_id, name: data.name, timeout: time, gateway_uuid: data.gateway_uuid });
					}
					var devInfo = data;
					devInfo.type = data.physical_type;
					api.addDevice(devInfo);
					var resp = undefined;

					if (data.physical_id && data.physical_id.trim()) {
						resp = { 'physical_id': physical_id, "state": "adding" };
					} else {
						resp = { 'gateway_uuid': data.gateway_uuid, "state": "discovering" };
						let evt = { type: "event", data: "discovering", gateway: { id: data.gateway_uuid, stream: 'state' } };
						dispatcher.dispatch(evt);
					}
					resolve(resp);
				}
			}).catch((err) => {
				reject(err);
			});
		}
	});
}
module.exports.removeDeviceImpl = (device, iotManager) => {
	return new Promise((resolve, reject) => {
		var self = this;
		if (!device) {
			reject("Invalid device provided");
			return;
		}
		var details = device.get("details") ? JSON.parse(device.get("details")) : {};
		if (!details.provider) {
			reject("Unknown provider for device " + device.get("uuid"));
			return;
		}
		var provider = iotManager.getProvider(details.provider);
		var _device = device.toJSON();
		_device.details = _device.details ? JSON.parse(_device.details) : {};
		if (_device.actions && typeof _device.actions === 'string') {
			_device.actions = JSON.parse(_device.actions);
		}

		provider.api.removeDevice(device).then((device) => {
			return GroupAPI.uuidRemoveDevice(device.get('group_uuid'), device);
		}, (error) => {
			return GroupAPI.uuidRemoveDevice(device.get('group_uuid'), device);
		}).then(() => {
			return device.destroy();
		}, (error) => {
			return device.destroy();
		}).then(() => {
			dispatcher.updateIoTList('device', _device, 'delete', true);
			resolve(_device);
		}).catch((err) => {
			reject(err);
		})
	});
}

module.exports.removeDevice = (device_uuid, iotManager) => {
	return new Promise((resolve, reject) => {
		var self = this;
		Device.where({ uuid: device_uuid }).fetch().then((device) => {
			return self.removeDeviceImpl(device, iotManager);
		}).then((device) => {
			resolve(device);
		}).catch((err) => {
			reject(err);
		});
	});
}

module.exports.pairDevice = (device_uuid, iotManager) => {
	return new Promise((resolve, reject) => {
		var self = this;
		var device = undefined;
		Device.where({ uuid: device_uuid }).fetch().then((dev) => {
			if (!dev) {
				reject("device not found");
				return;
			}
			device = dev;
			return Gateway.where({ uuid: device.get("gateway_uuid") }).fetch();
		}).then((gateway) => {
			var provider = iotManager.getProvider(gateway.get("provider"));
			if (!provider) {
				reject("Unknown provider " + gateway.get("provider"));
				return;
			}
			return provider.api.pairDevice(device);
		}).then((device) => {
			resolve(device.toJSON());
		}).catch((error) => {
			reject(error);
		})
	})
}


module.exports.updateDevice = (device_uuid, data, iotManager) => {
	return new Promise((resolve, reject) => {
		Device.where({ uuid: device_uuid }).fetch().then((device) => {
			if (!device) {
				reject("Unknown device " + device_uuid);
			} else {
				Gateway.where({ uuid: device.get("gateway_uuid") }).fetch().then((gateway) => {
					var provider = iotManager.getProvider(gateway.get("provider"));
					if (!provider) {
						reject("Unknown provider " + gateway.get("provider"));
					} else {
						Object.keys(data).forEach(function (key) {
							if (key == 'details') {
								let details = device.get('details') ? JSON.parse(device.get('details')) : {};
								Object.keys(data.details).forEach(function (skey) {
									details[skey] = data.details[skey]
								})
								device.set(key, JSON.stringify(details))
							} else if (!["type", "uuid", "id", "physical_type", "physical_id", "gateway_uuid"].includes(key)) {
								device.set(key, data[key]);
							}
						});
						device.save().then((device) => {
							return provider.api.updateDevice(device);
						}).then((device) => {
							var _device = device.toJSON();
							_device.details = _device.details ? JSON.parse(_device.details) : {};
							if (_device.actions && typeof _device.actions === 'string') {
								_device.actions = JSON.parse(_device.actions);
							}
							dispatcher.updateIoTList('device', _device, 'update', true);
							resolve(_device);
						}).catch((error) => {
							reject(error);
						})
					}
				}).catch((error) => {
					reject(error);
				})
			}
		}).catch((error) => {
			reject(error);
		});
	});
}

module.exports.startCalibration = (device_uuid, iotManager) => {
	return new Promise((resolve, reject) => {
		Device.where({ uuid: device_uuid }).fetch().then((device) => {
			if (!device) {
				reject("Unknown device " + device_uuid);
			} else {
				var resp = undefined;
				Gateway.where({ uuid: device.get("gateway_uuid") }).fetch().then((gateway) => {
					var provider = iotManager.getProvider(gateway.get("provider"));
					if (!provider) {
						reject("Unknown provider " + gateway.get("provider"));
					} else {
						provider.api.setCalibration(device, true).then((state) => {
							device.set('state', state);
							return device.save();
						}).then((_dev) => {
							var _device = _dev.toJSON();
							_device.details = _device.details ? JSON.parse(_device.details) : {};
							dispatcher.updateIoTList('device', _device, 'update', true);
							resolve(_device);
						}).catch((error) => {
							reject(error);
						});
					}
				}).catch((error) => {
					reject(error);
				})
			}
		}).catch((error) => {
			reject(error);
		});
	});
}

module.exports.stopCalibration = (device_uuid, iotManager) => {
	return new Promise((resolve, reject) => {
		Device.where({ uuid: device_uuid }).fetch().then((device) => {
			if (!device) {
				reject("Unknown device " + device_uuid);
			} else {
				var resp = undefined;
				Gateway.where({ uuid: device.get("gateway_uuid") }).fetch().then((gateway) => {
					var provider = iotManager.getProvider(gateway.get("provider"));
					if (!provider) {
						reject("Unknown provider " + gateway.get("provider"));
					} else {
						provider.api.setCalibration(device, false).then((state) => {
							device.set('state', state);
							return device.save();
						}).then((_dev) => {
							var _device = _dev.toJSON();
							_device.details = _device.details ? JSON.parse(_device.details) : {};
							dispatcher.updateIoTList('device', _device, 'update', true);
							resolve(_device);
						}).catch((error) => {
							reject(error);
						});
					}
				}).catch((error) => {
					reject(error);
				})
			}
		}).catch((error) => {
			reject(error);
		});
	});
}


module.exports.doAction = (device_uuid, action, parameters) => {
	return new Promise((resolve, reject) => {
		Device.where({ uuid: device_uuid }).fetch().then((device) => {
			if (device) {
				device.exec(action, parameters).then((out) => {
					resolve({ execution: out });
				});
			} else {
				reject("Could not find group");
			}
		});

	});
}

/*module.exports.clearPinCodesImpl = (uuids, user_ids) =>{
	return new Promise((resolve,reject)=>{
		Device.where('uuid', 'IN', uuids).where('type', '=', 'door-lock').fetchAll().then((locks)=>{
			return dispatcher.clearLocksPin(locks.toJSON(), null, user_ids)
		}).then(()=>{
			resolve();
		}).catch((error)=>{
			resolve();
		});
	})
}


module.exports.clearPinCodes = (deviceInfo) =>{
	return new Promise((resolve,reject)=>{
		var self = this;
		var uuids = Array.from(deviceInfo, x => x.object_uuid);
		var user_ids = Array.from(deviceInfo, x => x.user_id);
		user_ids = Array.from(new Set(user_ids))
		self.clearPinCodesImpl(uuids, user_ids).then(()=>{
			resolve();
		}).catch((error)=>{
			resolve();
		});
	})
}


module.exports.setPinCodesImpl = (uuids, user_ids) =>{
	return new Promise((resolve,reject)=>{

		if (uuids.length <= 0 || user_ids.length <= 0) {
			return resolve();
		}

		Device.where('uuid', 'IN', uuids).where('type', '=', 'door-lock').fetchAll().then((locks)=>{
			return dispatcher.setUsersLocksPin(user_ids, locks.toJSON());
		}).then(()=>{
			resolve();
		}).catch((error)=>{
			resolve();
		});
	})
}

module.exports.setPinCodes = (deviceInfo) =>{
	return new Promise((resolve,reject)=>{
		var self = this;
		var uuids = Array.from(deviceInfo, x => x.object_uuid);
		var user_ids = Array.from(deviceInfo, x => x.user_id);
		user_ids = Array.from(new Set(user_ids));
		self.setPinCodesImpl(uuids, user_ids).then(()=>{
			resolve();
		}).catch((error)=>{
			resolve();
		});

	})
}*/

