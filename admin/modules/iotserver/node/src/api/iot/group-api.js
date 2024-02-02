const Scene = require('../../models/Scene.js');
const Group = require('../../models/Group.js');
const ObjectProperty = require('../../models/ObjectProperty.js');
const GroupPermission = require('../../models/GroupPermission.js');
const Device = require('../../models/Device.js');
const PropertyApi = require('./user-property-api.js');
const dispatcher = require('../../lib/iot/event-dispatcher.js');
const config = require('config');
const Guests =  require('../../models/Guests.js');
const AutomatedActionApi = require('./automated-action-api.js');
const log = require('../../lib/log');
const GTYPES = ["Outside Door", "Switch", "Sensor", "Motion", "Alarm", "Smoke Sensor", "Water Sensor", "Air Quality Sensor", "Temperature Sensor"];

const PERMID_TO_NAME_MAP = {1: 'View Limited', 2: "View", 3: "Control", 4: "Monitor"};

const CNTRL_PRMSN_USERLMT = null;
const PERMID_TO_USERLIMIT_MAP = {1:null,2:null,3:CNTRL_PRMSN_USERLMT,4:null};

/*
* Check if a device of a certain type can fit within a group of certain type
* "Door" accepts the following devices: door-lock, contact, electrical-stryke, electrical-contact, security-keypad
* "Contact" accepts the following devices: contact, electrical-contact
* "Occupancy" accepts the following devices: occupancy, motion
* "Light" accepts the following devices: light, switch
* "Switch" accepts the following devices: switch, button, electrical-button
* "Sensor" accepts the following devices: water, sensor, thermostat, smoke
* "Shade" accepts the following devices: shade
* "Intercom" accepts the following devices: intercom
* "Motion" accepts the following devices: occupancy, motion
*/
const groupDevicesMap = {"Outside Door": ['door-lock', 'contact', 'electrical-stryke', 'electrical-contact', 'security-keypad', 'intercom', 'occupancy', 'motion', 'thermostat'],
						 "Contact": ['contact', 'electrical-contact'],
						 "Shade": ['contact', 'electrical-contact', 'shade', 'thermostat'],
						 "Occupancy": ['occupancy'],
						 "Light": ['light'],
						 "Switch": ['switch', 'button', 'electrical-button'],
						 "Sensor": ['sensor'],
						 "Intercom": ['intercom'],
						 "Motion": ['occupancy', 'motion'],
						 "Alarm": ['sensor'],
						 "Smoke Sensor" : ['smoke'], 
						 "Water Sensor" : ['water'], 
						 "Air Quality Sensor" : ['airquality'],
						 "Temperature Sensor": ['thermostat']};


function isControllableType(group_type) {
	return ["Outside Door", "Door", "Light", "Switch", "Shade"].includes(group_type);
}

function getAll(filter_ids = null, permission_groups = null, return_type = false, add_relations = true, columns_filter = null) {
	return new Promise((resolve,reject)=>{
		var qb = Group;
		if (filter_ids) {
			qb = qb.where('uuid', 'in', filter_ids);
		}

		var relations = undefined;
		if (!return_type) {
			relations = ['permissions', 'devices'];
		} else {
			relations = ['permissions'];
		}

		var options = {};
		if (add_relations) {
			options.withRelated = relations;
		}

		if (columns_filter) {
			options.columns = JSON.parse(JSON.stringify(columns_filter));
			if (!columns_filter.includes('type')) {
				options.columns.push('type');
			}
		}


		qb.fetchAll(options).then((groups)=>{
			var _groups = groups? groups.toJSON() : [];
			_groups.forEach((group)=>{
				group.objtype='groups';
				if (add_relations && permission_groups) {
					group.permissions = group.permissions.filter(permission => permission_groups.includes(permission.user_group_id));
				}

				if (!columns_filter || columns_filter.includes('details')) {
					group.details = group.details ? JSON.parse(group.details) : {};	
				}

				if (!columns_filter || columns_filter.includes('actions')) {
					if (group.actions && typeof group.actions === 'string') {
						group.actions = JSON.parse(group.actions);
					}
				}

				if (!columns_filter && group.state !== "OK") {
					var devices = group.devices ?  group.devices : [];
					devices = devices.filter(x => x.state !== 'ready');
					if (!devices || devices.length <= 0) {
						// group saying alarmed while no device is alarmed, 
						// we need to force the group state back to OK
						group.state = "OK";
						dispatcher.updateIoTList('group', group, 'update', true);
					}
				}
			});
			if (!return_type) {
				resolve(_groups);
			} else {
				var result = {groups: _groups};
				if (add_relations) {
					var types = [];
					GTYPES.forEach((type)=>{
						types.push({type: type, controllable: isControllableType(type)})
					})
					result.group_devices_map = groupDevicesMap;
					result.group_types = types;
				}
				resolve(result);
			}
		}).catch((error)=>{
			reject(error);
		})
	});
}

function addPermission(group, data) {
	return new Promise((resolve,reject)=>{
		let user_group =  JSON.parse(JSON.stringify(data));
		user_group.group_uuid = group.uuid;
		user_group.org_id = group.org_id;
		let perm = new GroupPermission(user_group);
		perm.save().then((perm)=>{
			resolve(perm.toJSON())
		});
	});
}

function updatePermission(perm, data) {
	return new Promise((resolve,reject)=>{
		var user_group =  JSON.parse(JSON.stringify(data));
		user_group.group_uuid = perm.get("group_uuid");
		user_group.org_id = perm.get("org_id");
		perm.save(user_group).then((perm)=>{
			resolve(perm.toJSON())
		});
	});
}

module.exports.GROUP_TYPES = GTYPES;

module.exports.isDoorGroupType = (group_type) => {
	return ["Outside Door", "Door"].includes(group_type);
}


module.exports.getTypes = () =>{
	return new Promise((resolve,reject)=>{
		var self = this;
		var types = [];
		GTYPES.forEach((type)=>{
			types.push({type: type, controllable: isControllableType(type)})
		})
		resolve(types);
	});
}
module.exports.getCount = (type = null) =>{
	return new Promise((resolve,reject)=>{
		var self = this;
		var qb = Group;
		if (type){
			qb = qb.where('type', '=', type);
		}
		qb.count().then((count)=>{
			if (!type) {
				resolve(count);
			} else {
				let cnt = {};
				cnt[type] = count;
				resolve(cnt);
			}
		}).catch((error)=>{
			reject(error);
		})
	})
}

module.exports.getCounts = () =>{
	return new Promise((resolve,reject)=>{
		var self = this;
		var counts = {'total': 0};
		self.getCount().then((count)=>{
			counts.total = count;
			var q = require('q');
			var promises = [];
			GTYPES.forEach((type)=>{
				promises.push(self.getCount(type));
			})

			q.all(promises).then((results)=>{
				results.forEach((res)=>{
					Object.keys(res).forEach((key)=>{
						counts[key] = res[key]
					}) 
				})
				resolve(counts);
			}).catch((error)=>{
				reject(error);
			})
		})
	})
}

module.exports.getAll = (permission_groups = null, filter_ids = null, return_type = false, add_relations = true, columns_filter = null) =>{
	return new Promise((resolve,reject)=>{
		if (permission_groups) {
			GroupPermission.where('user_group_id', 'in', permission_groups).fetchAll({columns:['permission_type_id', 'group_uuid']}).then((permissions)=>{
				if (permissions) {
					let group_uuids = [];
					permissions.forEach((permission)=>{
						let uuid = permission.get('group_uuid');
						if (!group_uuids.includes(uuid)) {
							group_uuids.push(permission.get('group_uuid'));
						}
					})
					if (filter_ids) {
						group_uuids = group_uuids.filter(x => filter_ids.includes(x));
					}
					
					getAll(group_uuids, permission_groups, return_type, add_relations, columns_filter).then((groups)=>{
						resolve(groups);
					})
				} else {
					if (!return_type) {
						resolve([]);
					} else {
						var types = [];
						GTYPES.forEach((type)=>{
							types.push({type: type, controllable: isControllableType(type)})
						})
						resolve({group_types: types, groups: []})
					}	
				}
			})
		} else {
			getAll(filter_ids, null, return_type, add_relations, columns_filter).then((groups)=>{
				resolve(groups);
			})
		}
	});
}
module.exports.getGroup = (group_uuid, permission_groups = null) =>{
	return new Promise((resolve,reject)=>{

		if (permission_groups) {
			GroupPermission.where('user_group_id', 'in', permission_groups)
			.where('group_uuid', '=', group_uuid)
			.where('permission_type_id', '>', 1).fetchAll({columns:['permission_type_id', 'group_uuid']}).then((permissions)=>{
				if (permissions) {
					getAll([group_uuid], permission_groups).then((group)=>{
						resolve(group);
					})
				} else {
					resolve([]);
				}
			})
		} else {
			getAll([group_uuid]).then((group)=>{
				resolve(group);
			})
		}
	});
}

function getPermissionInfo(group, iotGroups) {
	var _group = group.toJSON();
	var controlUserCount = 0;
	var info = {name: _group.name, uuid: _group.uuid, type: _group.type};
	_group.permissions.forEach((permission)=>{
		var grp = iotGroups.find(x=> x.id === permission.user_group_id);
		if (grp && permission.permission_type_id > 2) {
			controlUserCount += grp.user_count;
		}
	})
	info.control_user_count = controlUserCount;
	info.control_user_limit = 9999999; //unlimited
	return info;
}

module.exports.getPermissionsInfo = (data, iotGroups) =>{
	return new Promise((resolve,reject)=>{
		var self = this;
		var res = {iot_permission_groups: iotGroups};
		var infos = [];
		Group.where('scene_uuid', '=', data.scene_uuid).fetchAll({withRelated: ['permissions']}).then((groups)=>{
			groups.forEach((group)=>{
				infos.push(getPermissionInfo(group, iotGroups));
			})
			res.groups = infos;
			resolve(res);
		}).catch((error)=>{
			reject(error);
		})
	});
}

module.exports.addPermissionImpl = (group, data, updateExisting = true, dispatch = true) => {
	return new Promise((resolve,reject)=>{
		var self = this;
		var res = undefined;
		GroupPermission.where('user_group_id', '=', data.user_group_id).where('group_uuid', '=', group.uuid).fetch().then((perm)=>{
			if (perm && updateExisting) {
				updatePermission(perm, data).then((res)=>{
					if (dispatch) {
						dispatcher.updateIoTList('group', group, 'update', true);
					}
					resolve(res);
				}).catch((error)=>{
					reject(error);
				});
			} else if (perm) {
				resolve(perm.toJSON());
			} else {
				addPermission(group, data).then((_res)=>{
					res = _res;
					if (dispatch) {
						dispatcher.updateIoTList('group', group, 'update', true);
					}
					return dispatcher.getNotifier().updatePermissions({obj_type: 'group', obj_uuid: group.uuid});
				}).then(()=>{
					resolve(res);
				}).catch((error)=>{
					reject(error);
				});
			}
		}).catch((error)=>{
			reject(error);
		})
	});
}

function canAddPermissionImpl (group_type, permissionData, grpPermInfo, userGroupInfo) {
	return true;
}

function canAddPermission(group_type, permissionData, grpPermInfo, iotGroups) {
	var grp = iotGroups.find(x=> x.id === permissionData.user_group_id);
	return canAddPermissionImpl(group_type, permissionData, grpPermInfo, grp);
}

module.exports.addPermission = (group_uuid, iotGroups, data, updateAll = true, updateExisting = true) => {
	return new Promise((resolve,reject)=>{
		var self = this;
		Group.where('uuid', '=', group_uuid).fetch({withRelated: ['permissions', 'devices']}).then((group)=>{
			if (group) {
				var grpPermInfo = getPermissionInfo(group, iotGroups);
				if (Array.isArray(data) && updateAll === true) {
					self.removeAllPermissions(group_uuid).then(()=>{
						var q = require('q');
						var promises = [];
						data.forEach((dt) =>{
							if (canAddPermission(group.get("type"), dt, grpPermInfo, iotGroups) === true) {
								promises.push(self.addPermissionImpl(group.toJSON(), dt, updateExisting ));
							}
						});
						q.all(promises).then((res)=>{
							resolve(res);
						}).catch((error)=>{
							reject(error);
						})
					})
				} else {
					if (canAddPermission(group.get("type"), data, grpPermInfo, iotGroups) === true) {
						self.addPermissionImpl(group.toJSON(), data, updateExisting).then((res)=>{
							resolve(res);
						}).catch((error)=>{
							reject(error);
						})
					} else {
						reject("Cannot add Control permission to user group. Group control user count limit reached");
					}
				}
			} else {
				reject('Group not found');
			}
		})
	});
}

module.exports.removePermissionByType = (group_uuid, permission_type) => {
	return new Promise((resolve,reject)=>{
		GroupPermission.where('group_uuid', '=', group_uuid)
		.where('permission_type_id', '=', permission_type).destroy().then(()=>{
			return getAll([group_uuid]);
		}).then((res)=>{
			dispatcher.updateIoTList('group', res[0], 'update', true);
			resolve(res[0].permissions)
		})
	});
}

module.exports.removeAllPermissions = (group_uuid) => {
	return new Promise((resolve,reject)=>{
		if (!group_uuid) {
			resolve();
			return;
		}
		GroupPermission.where('group_uuid', '=', group_uuid).destroy().then((permissions)=>{
			resolve();
		}).catch((error)=>{
			resolve();
		})
	});
}

module.exports.removePermission = (group_uuid, user_group_id) => {
	return new Promise((resolve,reject)=>{
		GroupPermission.where('group_uuid', '=', group_uuid)
		.where('user_group_id', '=', user_group_id).fetch().then((permission)=>{
			if (permission) {
				var perm = permission;
				permission.destroy().then(()=>{
					return getAll([group_uuid])
				}).then((groups)=>{
					dispatcher.updateIoTList('group', groups[0], 'update', true);
					resolve(groups[0].permissions)
				})
			} else {
				resolve([]);
			}
		})
	});
}

function setGroupActionsAndStatus(self, devices, grp, openOnMotion = undefined) {
	return new Promise((resolve,reject)=>{
		var group_uuid = grp.get("uuid");
		var group_devices = devices.filter(x => x.group_uuid == group_uuid);
		var grp_status = 'unknown';
		var grp_state = "OK";
		var groupActions = [];
		var groupDetails = grp.get("details") ? JSON.parse(grp.get("details")) : {};
		group_devices.forEach((group_device)=>{
			group_device.details = (typeof group_device.details === 'string') ? JSON.parse(group_device.details) : group_device.details;
			if (group_device.state !== 'ready') {
				grp_state =  "Alarmed";
			} else if (group_device.details && group_device.details.batteryLevel && group_device.details.batteryLevel < 10) {
				grp_state = "Alarmed";
			}

			var deviceActions = group_device.actions ? JSON.parse(group_device.actions) : [];
			deviceActions.forEach((act)=>{
				if (!groupActions.find(x => x === act)) {
					groupActions.push(act)
				}
			})
		})
		grp.set("state", grp_state);
		grp.set("actions", JSON.stringify(groupActions));

		if (self.isDoorGroupType(grp.get("type"))) {

			var locks = group_devices.filter( x => ["door-lock", "electrical-stryke"].includes(x.type));
			var lock_status = undefined;
			locks.forEach((lock)=>{
				if (!lock_status) {
					lock_status  = lock.status;
				} else if (lock_status  != lock.status && lock.status == "Unlocked") {
					lock_status  = lock.status;
				}
			})
			var contacts = group_devices.filter( x => ["contact", "electrical-contact"].includes(x.type));
			var contact_status = undefined;
			contacts.forEach((contact)=>{
				if (!contact_status) {
					contact_status = contact.status;
				} else if ( contact_status != contact.status && contact.status == "Opened") {
					contact_status = contact.status;
				}
			})

			if (contact_status && lock_status) {
				grp_status = contact_status + ' - ' + lock_status
			} else if (contact_status) {
				grp_status = contact_status;
			} else if (lock_status) {
				grp_status = lock_status;

			} else {
				grp_status = 'unknown';
			}

		} else if (["Air Quality Sensor"].includes(grp.get("type"))) {
			grp_status = group_devices.length > 0 ? group_devices[0].status : 'unknown';
		} else if (["Temperature Sensor"].includes(grp.get("type"))) {
			grp_status = group_devices.length > 0 ? group_devices[0].status : 'unknown';
		} else {
			var active_devices = group_devices.filter(x => ["Active", "On", "Opened"].includes(x.status))
			if ((!active_devices || active_devices.length <= 0)) {
				grp_status = group_devices.length > 0 ? group_devices[0].status : 'unknown';
			} else if (active_devices && active_devices.length > 0) {
				grp_status = active_devices[0].status
			}
		}
		grp.set("status", grp_status);
		
		
		if (openOnMotion !== undefined && group_devices.find(x => ['occupancy', 'motion'].includes(x.type))) {
			groupDetails.openOnMotion = openOnMotion;
		} else {
			delete groupDetails.openOnMotion;
		}
		
		if (!groupDetails.actions || !groupDetails.actions.length) {
			groupDetails.actions = self.getGroupActions(grp);	
		}
		grp.set("details", JSON.stringify(groupDetails));

		grp.save().then((group)=>{
			resolve(group)
		}).catch((err)=>{
			reject(err);
		});
	})
}

module.exports.createGroup = (data, iotGroups = null) => {
	return new Promise((resolve,reject)=>{
		var self = this;
		var openOnMotion = undefined;
		if (!data.type || !GTYPES.includes(data.type)) {
			reject("Invalid group type " + data.type);
		} else {
			if(!data.scene_uuid) {
				reject('Unspecified group scene');
			} else {

				var user_groups = [];
				var devices = [];
				let rejectMsg = "";
				if (data.user_groups) {
					var valid = true;
					
					//backward compatible with old mobile app (version 1.22.0 and below)
					data.user_groups.forEach(function (item, index) {
						data.user_groups[index] = { permission_type_id: item.permission_type_id, user_group_id: item.user_group_id, local_access: item.local_access ? item.local_access : 1 };
					});

					data.user_groups.forEach((userGroup)=>{
						var usrGrpInfo = undefined;
						var skip = false;
						if (iotGroups) {
							usrGrpInfo = iotGroups.find(x=> x.id === userGroup.user_group_id);
							if (!usrGrpInfo) {
								/*valid = false;
								rejectMsg = rejectMsg + "Can't find matching information for user group " + userGroup.user_group_id + "\n";*/
								 skip = true;
							}
						} 

						if (!userGroup.permission_type_id || !userGroup.user_group_id || !userGroup.local_access) {
							valid = false;
							rejectMsg = rejectMsg + "Invalid user groups settings " + JSON.stringify(data.user_groups) + "\n";
						} else if (canAddPermissionImpl(data.type, userGroup, null, usrGrpInfo) === false) {
							valid = false;
							let usrGrpName = usrGrpInfo ? usrGrpInfo.name : userGroup.user_group_id;
							rejectMsg = rejectMsg + getUserLimitMsg(usrGrpName,userGroup.permission_type_id,data.type);
						} else if (skip === false) {
							user_groups.push({permission_type_id: userGroup.permission_type_id, user_group_id: userGroup.user_group_id, local_access:userGroup.local_access});
						}
						
					});

					if (valid === false) {
						return reject(rejectMsg);
					}

					delete data.user_groups;
				}

				if (data.devices) {
					devices = data.devices;
					delete data.devices
				}

				Scene.where({uuid:data.scene_uuid}).fetch({withRelated: ['permissions']}).then((scene)=>{
					if (!scene) {
						reject("Unknown scene " + data.scene_uuid);
					} else {
						var _scene = scene.toJSON();
						var scenePermisisons = _scene.permissions;
						var promises = [];
						var grp = undefined;
						var q = require('q');
						var group_uuid = undefined;
						var _locks = [];
						scenePermisisons.forEach((userGroup)=>{
							var usrGrpInfo = undefined;
							if (iotGroups) {
								usrGrpInfo = iotGroups.find(x=> x.id === userGroup.user_group_id);
							}
							var found = user_groups.findIndex(x => x.user_group_id ===  userGroup.user_group_id);
							var permission_type_id = userGroup.permission_type_id
							if (found === -1) { // do not override specified permisisons, only inherit for non configured user groups
								if (canAddPermissionImpl(data.type, userGroup, null, usrGrpInfo) === false) {
									// we cannot give control permission to this group, so switch to view permission
									permission_type_id = 2;
								}
								//backward compatible with old mobile app (version 1.22.0 and below) if local access doesn't exist, set it to be anywhere by default
								user_groups.push({permission_type_id: permission_type_id, user_group_id: userGroup.user_group_id, local_access:userGroup.local_access ? userGroup.local_access : 1})
							}
						})
						data.org_id = scene.get("org_id");
						if (!data.status) {
							data.status = 'unknown';
						}

						if (!data.details) {
							data.details = {};
						}

						if (data.details['mustBeSecured'] === undefined) {
							data.details['mustBeSecured'] = false;
						}
						
						if (data.details['openOnMotion'] !== undefined) {
							openOnMotion = data.details['openOnMotion'];
						}

						if (data.details && typeof data.details !== 'string') {
							data.details = JSON.stringify(data.details);
						}

						data.state = "OK";
						let gp = new Group(data);
						gp.save().then((group)=>{
							grp = group;
							group_uuid = group.get('uuid');
							var _group = group.toJSON();
							user_groups.forEach((userGroup)=>{
								promises.push(addPermission(_group, userGroup));
							})
							return q.all(promises);
						}).then(()=>{
							promises = [];
							devices.forEach((device_uuid)=>{
								promises.push(self.findAndAddDevice(grp, device_uuid))
							})
							return q.all(promises);
						}).then((_devices)=>{
							var _devs = [];
							if (_devices) {
								_devices.forEach((device)=>{
									_devs.push(device.toJSON());
									if (device.get('type') == 'door-lock') {
										_locks.push(device.toJSON());
									}
								})
							}
							return setGroupActionsAndStatus(self, _devs, grp, openOnMotion);
						}).then((_group)=>{
							var _gp = _group;
							getAll([_group.get("uuid")]).then((group)=>{
								dispatcher.updateIoTList('group', group[0], 'insert', true);
								resolve(group[0]);
							}).catch((err)=>{
								return reject(err);
							});
						}).catch((err)=>{
							let msg = '' + err;
							if (err.message && err.message.includes('ER_DUP_ENTRY')) {
								msg = 'Group with name ' + data.name + ' already exists in this scene.'
							}
							return reject(msg);
						});
					}
				}).catch((err)=>{
					let msg = '' + err;
					if (err.message && err.message.includes('ER_DUP_ENTRY')) {
						msg = 'Group with name ' + data.name + ' already exists in this scene.'
					}
					return reject(msg);
				});
			}
		}
	});
}


module.exports.deleteGroupImpl = (group) => {
	return new Promise((resolve,reject)=>{
		// unbind all devices binded to this group
		var self = this;
		var promises = [];
		var q = require('q');
		var _group = group.toJSON();
		Device.where({group_uuid: group.get("uuid")}).fetchAll().then((devices)=>{
			devices.forEach((device)=>{
				device.set("group_uuid", null);
				promises.push(device.save())	
			})
			return q.all(promises);
		}).then((_devs)=>{
			promises = [];
			_devs.forEach((dev)=>{
				dev.set("group_uuid", null);
				if (dev.get('type') == 'door-lock') {
					// clear all pins from all locks
					promises.push(dispatcher.clearLocksPin([dev.toJSON()], null, null));
				}
				dispatcher.updateIoTList('device', dev.toJSON(), 'update', true);
			})
			return q.all(promises);
		}).then(()=>{
			return clearAllPropertiesImpl(_group, true);
		}).then(()=>{
			return group.destroy();
		}).then(()=>{
			dispatcher.updateIoTList('group', _group, 'delete', true);
			resolve(_group);
		}).catch((err)=>{
			reject(err);
		});
	});
}


module.exports.deleteGroup = (group_uuid) => {
	return new Promise((resolve,reject)=>{
		var self = this;
		Group.where({uuid:group_uuid}).fetch({withRelated: ['permissions', 'devices']}).then((group)=>{
			if (!group) {
				reject("Unknown group " + group_uuid)
			} else {
				self.deleteGroupImpl(group).then((res)=>{
					resolve(res);
				})
			}
		}).catch((error)=>{
			reject(error);
		});
	});
}

module.exports.updateGroup = (group_uuid, data, iotGroups = null) => {
	return new Promise((resolve,reject)=>{
		var self = this;
		var gr = undefined;
		var updateDevices = false;
		var updatePerms = false;
		var details = undefined;
		var grp_name = data.name ? data.name : group_uuid;
		var result = undefined;
		Group.where({uuid:group_uuid}).fetch({withRelated: ['permissions', 'devices']}).then((group)=>{
			if (!group) {
				reject("Unknown group " + group_uuid);
			} else {
				var details = undefined;
				var user_groups = [];
				var devices = [];
				var q = require('q');
				var promises = [];
				grp_name = data.name ? data.name : group.get('name');
				if (data.user_groups) {
					var valid = true;
					let rejectMsg = "";

					//backward compatible with old mobile app (version 1.22.0 and below)
					data.user_groups.forEach(function (item, index) {
						data.user_groups[index] = { permission_type_id: item.permission_type_id, user_group_id: item.user_group_id, local_access: item.local_access ? item.local_access : 1 };
					});

					data.user_groups.forEach((userGroup)=>{
						var usrGrpInfo = undefined;
						var skip = false;
						if (iotGroups) {
							usrGrpInfo = iotGroups.find(x=> x.id === userGroup.user_group_id);
							if (!usrGrpInfo) {
								skip = true;
								/*valid = false;
								rejectMsg = rejectMsg + "Can't find matching information for user group " + userGroup.user_group_id + "\n";*/
							}
						}

						if (!userGroup.permission_type_id || !userGroup.user_group_id || !userGroup.local_access) {
							valid = false;
							rejectMsg  =   rejectMsg + "Invalid user groups settings " + JSON.stringify(data.user_groups) + "\n";
						} else if (canAddPermissionImpl(group.get('type'), userGroup, null, usrGrpInfo) === false) {
							let usrGrpName = usrGrpInfo ? usrGrpInfo.name : userGroup.user_group_id;
							rejectMsg = rejectMsg +  getUserLimitMsg(usrGrpName,userGroup.permission_type_id,data.type)
							valid = false;
						} else if (skip === false) {
							user_groups.push({permission_type_id: userGroup.permission_type_id, user_group_id: userGroup.user_group_id, local_access:userGroup.local_access});
						}
					});

					if (valid === false) {
						reject(rejectMsg);
						return;
					}

					// copy the user groups for later processing
					//user_groups =  JSON.parse(JSON.stringify(data.user_groups));
					delete data.user_groups;
					updatePerms = true;
				}

				if (data.devices) {
					updateDevices = true;
					devices = data.devices;
					delete data.devices
				} else {
					let _grp = group.toJSON();
					if (!_grp.devices || _grp.devices.length <= 0) {
						group.set("actions", JSON.stringify([]));
						// clear group status
						group.set("status", 'unknown');
					}
					details = group.get('details') ? JSON.parse(group.get('details')) : {};
					details.currentTemperature = null;
					group.set('details', details);
				} 

				Object.keys(data).forEach(function(key) {
					if (key == 'details') {
						details = group.get('details') ? JSON.parse(group.get('details')) : {};
						if (typeof data.details === 'string') {
							data.details = JSON.parse(data.details);
						}
						Object.keys(data.details).forEach(function(skey) {
							details[skey] = data.details[skey]
						})
						group.set(key, JSON.stringify(details))
					} else {
						group.set(key, data[key]);
					}
				});
				group.save().then((group)=>{
					gr = group.toJSON();
					var g_uuid = updatePerms ? group_uuid : null;
					return self.removeAllPermissions(g_uuid);
				}).then(()=>{
					promises = [];
					if (user_groups.length > 0) {
						user_groups.forEach((dt) =>{
							promises.push(self.addPermissionImpl(gr, dt, true, false));
						});
					}
					return q.all(promises);
				}).then(()=>{
					promises = [];
					if (updateDevices) {
						promises.push(self.addDevice(group_uuid, devices, false))
					}
					return q.all(promises);
				}).then(()=>{
					return getAll([group_uuid]);
				}).then((_group)=>{
					dispatcher.updateIoTList('group', _group[0], 'update', true);
					resolve(result);
				}).catch((error)=>{
					let msg = '' + error;
					if (error.message && error.message.includes('ER_DUP_ENTRY')) {
						msg = 'Group with name ' + grp_name + ' already exists in this scene.'
					}
					reject(msg);
				})
			}
		}).catch((error)=>{
			let msg = '' + error;
			if (error.message && error.message.includes('ER_DUP_ENTRY')) {
				msg = 'Group with name ' + grp_name + ' already exists in this scene.'
			}
			reject(msg);
		});
	});
}
function getUserLimitMsg(usrGrpName,permission_type_id,grpType){
	if(usrGrpName != "" && permission_type_id != null && grpType != ""){
		return "Cannot add " + PERMID_TO_NAME_MAP[permission_type_id] + " permission to user group " + usrGrpName + ". Maximum number of users allowed to have " + 
				PERMID_TO_NAME_MAP[permission_type_id] + " permission is " + PERMID_TO_USERLIMIT_MAP[permission_type_id] + " for group type " + grpType + "\n";
	}else{
		return "Cannot add the selected permission. Number of users in the selected User Group is more than the allowed limit for selected Permission type";
	}
}
function supportsDevice(group, device) {
	var deviceList = groupDevicesMap[group.get("type")];
	if (!deviceList) {
		return false;
	}
	return (deviceList.findIndex(x => x === device.get("type")) !== -1);
}

module.exports.getDeviceMapping = () => {
	return groupDevicesMap;
}

module.exports.isSecured = (group) => {
	var details = group.details ? JSON.parse(group.details) : {};
	if (!details.mustBeSecured) {
		return true;
	}

	if (this.isDoorGroupType(group.type) && (group.status.includes("Unlocked") || group.status.includes("Opened"))) {
		return false;
	} else if (group.status.includes("Active") || group.status.includes("Occupied")) {
		return false;
	}

	return true;	
}

module.exports.getGroupActions = (group) => {
	switch(group.get("type")) {
		case "Outside Door":
		case "Inside Door":
		case "Door":
		return [{status: "Locked", action: "Unlock"}, {status: "Unlocked", action: "Lock"}];
		break;
		case 'Switch':
		case 'Light':
		return [{status: "On", action: "Off"}, {status: "Off", action: "On"}];
		break;
	}
	return [];
}

module.exports.addDeviceImpl = (group, device) => {
	return new Promise((resolve,reject)=>{
		var self = this;
		var dev = undefined;
		if (!device || !group) {
			reject('Invalid device or group');
		} else {
			if (device.get('group_uuid')) {
				reject('Device already binded to group: ' + device.get('group_uuid'));
			} else if (device.get('type') === 'unknown') {
				reject('Cannot add unknown device to a group');
			} else if (device.get('state') !== 'ready') {
				reject('Device state is : ' + device.get('state') + ' Cannot add to group');
			} else if (!supportsDevice(group, device)) {
				reject('Device type : ' + device.get('type') + ' not allowed on group type ' + group.get('type'));
			} else {
				dev = device;
				device.set('group_uuid', group.get("uuid"));
				device.save().then((_device)=>{
					dispatcher.updateIoTList('device', _device, 'update');
					resolve(_device);
				}).catch((error)=>{
					reject(error);
				});
			}
		}
	});
}

module.exports.findAndAddDevice = (group, device_uuid) => {
	return new Promise((resolve,reject)=>{
		var self = this;
		var _dev = undefined;
		Device.where({uuid:device_uuid}).fetch().then((device)=>{
			 _dev = device;
			if (device && device.get('type') == 'door-lock') {
				// clear all pins from locks
				return dispatcher.clearLocksPin([device.toJSON()], null, null);
			} else {
				return Promise.resolve();
			}
		}).then(()=>{ 
			return self.addDeviceImpl(group,  _dev);
		}).then((_device)=>{
			resolve(_device);
		}).catch((error)=>{
			reject(error);
		})
	});

}

function getGroupState(group, device_state, adding = true) {
    var _group = group.toJSON();
    if (!_group.devices || _group.devices.length == 0) {
    	return "OK";
    }

    if (adding && device_state != "ready") {
    	return "Alarmed";
    } else if (!adding && _group.devices.length <= 1) {
    	return "OK";
    }

    _group.devices.forEach((group_device)=>{
        if (group_device.state !== 'ready') {
            return "Alarmed";
        } else if (group_device.details && group_device.details.batteryLevel && group_device.details.batteryLevel < 10) {
            return "Alarmed";
        }
    })

    return "OK";
}

function grpAddDeviceImpl(self, group_uuid, grp, data, devs, openOnMotion, dispatchGroup) {
	return new Promise((resolve,reject)=>{
		var promises = [];
		var q = require('q');
		data.forEach((device_uuid)=>{
			var index = devs.findIndex(x => x.get("uuid") == device_uuid);
			var dev =  devs.find(x => x.get("uuid") == device_uuid);
			if (dev) {
				promises.push(self.addDeviceImpl(grp, dev));
				devs.splice(index, 1);
			} else {
				promises.push(self.findAndAddDevice(grp, device_uuid))
			}
		})
		q.all(promises).then((_resdevices)=>{
			var _devices = [];
			_resdevices.forEach((device)=>{
				_devices.push(device.toJSON());
			})
			return setGroupActionsAndStatus(self, _devices, grp, openOnMotion);
		}).then(()=>{
			// make sure to unbind other devices...
			promises = [];
			devs.forEach((device)=>{
				promises.push(device.save());
			})
			return q.all(promises);
		}).then((devices)=>{
			devices.forEach((device)=>{
				dispatcher.updateIoTList('device', device, 'update');
			})
			return Group.where({uuid:group_uuid}).fetch({withRelated: ['permissions', 'devices']});
		}).then((group)=>{
			if (dispatchGroup) {
				dispatcher.updateIoTList('group', group.toJSON(), 'update', true);
			}
			resolve(group.toJSON());
		}).catch((error)=>{
			reject((error));
		});
	})
}

module.exports.addDevice = (group_uuid, data, dispatchGroup = true) => {
	return new Promise((resolve,reject)=>{
		var self = this;
		var grp = undefined;
		var devs = [];
		var promises = [];
		var q = require('q');
		var openOnMotion = undefined;
		Group.where({uuid:group_uuid}).fetch({withRelated: ['permissions', 'devices']}).then((group)=>{
			if (!group) {
				reject("Invalid group uuid " + group_uuid);
			} else {
				grp = group;
				var jsonGrp = group.toJSON();
				var grpLocks = jsonGrp.devices.filter(x => x.type == 'door-lock');
				if (Array.isArray(data)) {
					Device.where('group_uuid', '=', group.get("uuid")).fetchAll().then((devices)=>{
						devices.forEach((device)=>{
							device.set('group_uuid', null);
							devs.push(device);
						})

						// clear all group actions
						var groupDetails = grp.get("details") ? JSON.parse(grp.get("details")) : {};
						groupDetails.actions = []
						if (groupDetails.openOnMotion !== undefined) {
							openOnMotion = groupDetails.openOnMotion;
							delete groupDetails.openOnMotion;
						}

						groupDetails.currentTemperature = null;
						
						grp.set("details", JSON.stringify(groupDetails));
						grp.set("actions", JSON.stringify([]));

						// clear group status
						grp.set("status", 'unknown');

						promises = [];
						devs.forEach((dev)=>{
							if (dev.get('type') == 'door-lock') {
								// clear all pins from locks
								promises.push(dispatcher.clearLocksPin([dev.toJSON()], null, null))
							} 
						})

						q.all(promises).then(()=>{
							promises = [];
							data.forEach((device_uuid)=>{
								var index = devs.findIndex(x => x.get("uuid") == device_uuid);
								var dev =  devs.find(x => x.get("uuid") == device_uuid);
								if (dev) {
									promises.push(self.addDeviceImpl(grp, dev));
									devs.splice(index, 1);
								} else {
									promises.push(self.findAndAddDevice(grp, device_uuid))
								}
							})
							return q.all(promises);
						}).then((_resdevices)=>{
							var _devices = [];
							_resdevices.forEach((device)=>{
								_devices.push(device.toJSON());
							})
							return setGroupActionsAndStatus(self, _devices, grp, openOnMotion);
						}).then(()=>{
							// make sure to unbind other devices...
							promises = [];
							devs.forEach((device)=>{
								promises.push(device.save());
							})
							return q.all(promises);
						}).then((devices)=>{
							devices.forEach((device)=>{
								dispatcher.updateIoTList('device', device, 'update');
							})
							return Group.where({uuid:group_uuid}).fetch({withRelated: ['permissions', 'devices']});
						}).then((group)=>{
							if (dispatchGroup) {
								dispatcher.updateIoTList('group', group.toJSON(), 'update', true);
							}
							resolve(group.toJSON());
						}).catch((error)=>{
							reject((error));
						});

					}).catch((error)=>{
						reject(error);
					})
				} else {
					Device.where({uuid:data}).fetch().then((device)=>{
						return self.addDeviceImpl(grp, device);
					}).then((device)=>{
						return setGroupActionsAndStatus(self, [device.toJSON()], grp, openOnMotion);
					}).then(()=>{
						return Group.where({uuid:group_uuid}).fetch({withRelated: ['permissions', 'devices']});
					}).then((group)=>{
						if (dispatchGroup) {
							dispatcher.updateIoTList('group', group.toJSON(), 'update', true);
						}
						resolve(group.toJSON());
					}).catch((error)=>{
						reject(error);
					});
				}
			}
		}).catch((error)=>{
			reject(error);
		})
	});
}

module.exports.removeAllDevices = (group) => {
	return new Promise((resolve,reject)=>{
		var self = this;
		var locks = [];
		Device.where('group_uuid', '=', group.get("uuid")).fetchAll().then((devices)=>{
			var q = require('q');
			var promises = [];
			devices.forEach((device)=>{
				promises.push(self.removeDeviceImpl(group, device, false));
				if (device.get('type') == 'door-lock') {
					locks.push(device.toJSON());
				}
			})
			q.all(promises).then(()=>{
				var groupDetails = group.get("details") ? JSON.parse(group.get("details")) : {};
				if (groupDetails.actions) {
					delete groupDetails['actions'];
				}
				group.set("details", JSON.stringify(groupDetails));
				group.set("actions", null);
				return group.save();
			}).then(()=>{
				resolve();
			}).catch((error)=>{
				reject(error);
			})
		})
	});
}

module.exports.removeDeviceImpl = (group, device, checkActions = true) => {
	return new Promise((resolve,reject)=>{
		var cnt = 1;
		var self = this;
		var _dev = undefined;
		if (!group) {
			resolve(device);
		} else if (!device) {
			reject("Invalid device");
		} else if (!checkActions) {
			device.set('group_uuid', null);
			device.save().then((device)=>{
				dispatcher.updateIoTList('device', device, 'update');
				resolve(device);
			}).catch((error)=>{
				reject(error);
			});
		} else {
			device.set('group_uuid', null);
			var _group = group.toJSON();
			var groupDevices = _group.devices ? _group.devices : [];
			groupDevices = groupDevices.filter(x => x.uuid != device.get('uuid'));
			var groupDetails = group.get("details") ? JSON.parse(group.get("details")) : {};
			setGroupActionsAndStatus(self, groupDevices, group, groupDetails.openOnMotion).then((_grp)=>{
				dispatcher.updateIoTList('group', _grp.toJSON(), 'update', true);
				return device.save();
			}, (error)=>{
				dispatcher.updateIoTList('group', _group, 'update', true);
				return device.save();
			}).then((_device)=>{
				var func = undefined;
				_dev = _device;
				if (device.get('type') == 'door-lock') {
					func = dispatcher.clearLocksPin([device.toJSON()], null, null)
				} else {
					func = Promise.resolve();
				}
				return func;
			}).then(()=>{
				dispatcher.updateIoTList('device', _dev, 'update');
				resolve(device);
			}).catch((error)=>{
				reject(error);
			});
		}
	});
}

module.exports.uuidRemoveDevice = (group_uuid, device) => {
	return new Promise((resolve,reject)=>{
		var self = this;
		var _device = undefined;
		if (group_uuid === undefined || group_uuid === null) {
			resolve(device);
			return;
		}
		Group.where({uuid:group_uuid}).fetch({withRelated: ['permissions', 'devices']}).then((group)=>{
			return self.removeDeviceImpl(group, device)
		}).then((device)=>{
			resolve(device)
		}).catch((error)=>{
			reject(error);
		})
	})
}

module.exports.removeDevice = (group_uuid, device_uuid) => {
	return new Promise((resolve,reject)=>{
		var self = this;
		var resp = {uuid:group_uuid};
		var grp = undefined;
		var dev = undefined;
		Group.where({uuid:group_uuid}).fetch({withRelated: ['permissions', 'devices']}).then((group)=>{
			grp = group;
			return Device.where({uuid:device_uuid, group_uuid:group_uuid}).fetch();
		}).then((device)=>{
			return self.removeDeviceImpl(grp, device);
		}).then((device)=>{
			resolve(device.toJSON());
		}).catch((error)=>{
			reject(error);
		})
	});
}

function validPermissions(userid, group,  permission, permInfo, iotGroups) {
	/*if (group.get("type") !== "Inside Door") {
		return true;
	}
	var ctrlGroup = iotGroups.find(x =>  x.id === permission.user_group_id);
	if (!ctrlGroup) {
		return false;
	}
	var index = ctrlGroup.users.findIndex(x => x == userid);
	if (index === -1 || (index > (permInfo.control_user_limit -1) && permInfo.control_user_count > permInfo.control_user_limit)) {
		return false;
	}*/
	return true;
}
module.exports.doGuestAction = (group_uuid, action, parameters) => {
	return new Promise((resolve, reject) => {
		var params = {};
		params = parameters;
		var grp = undefined;
		var sc = undefined;
		Guests.where({ token: parameters.token}).fetch().then((guest) => {
			if (!guest) {
				reject("Cannot find guest with token:" + parameters.token);
			} else {
				let gst = guest.toJSON();
				if (gst.status != "enabled") {
					reject("Your guest access has been disabled");
					return;
				} else if (gst.access_scope != parameters.uuid) {
					reject("You do not have permission to perform this action.");
					return;
				} else if (gst.end_timestamp_utc < Math.floor((new Date()).getTime() / 1000)) {
					reject("Your guest access has expired and is no longer valid. Please contact your administrator.");
					return;
				} else if (action !=="Unlock") {
					reject("You do not have permission to perform this action.");
					return;
				}
			
				params.guest_name = gst.name;
				params.guest_id = ''+gst.id;
			}
		
			return Group.where({ uuid: group_uuid }).fetch({ withRelated: ['permissions', 'scene'] });
		}).then((group) => {
			if (!group) {
				reject("Cannot find group  with uuid " + group_uuid)
				return;
			}
			grp = group;
			return group.related('scene').fetch({withRelated: 'zone'});
		}).then((scene)=>{
			sc = scene;
			return scene.related('zone').fetch({withRelated: 'location'});
		}).then((zone)=>{
			var loc = zone.related('location');
			params.details = { position: { location: loc.get('name'), zone: zone.get('name'), scene: sc.get('name'), group: grp.get('name') } };
			return AutomatedActionApi.checkGroupActionOverrides(group_uuid, "guest");
		}).then(() => {
			return grp.guestexec(action, params);
		}).then((out) => {
			resolve({ execution: out });
		}).catch((error) => {
			reject(error);
		})
	});
}
function doAction(group_uuid, action, parameters, _perms, iotGroups) {
	return new Promise((resolve,reject)=>{
		var invalid_permission_groups = [];
		var grp = undefined;
		var sc = undefined;
		Group.where({uuid:group_uuid}).fetch({withRelated: ['permissions', 'scene']}).then((group)=>{
			if (!group) {
				reject("Cannot find group  with uuid " + group_uuid)
				return;
			}
			grp = group;
			if (iotGroups && _perms) {
				var permInfo = getPermissionInfo(group, iotGroups);
				var valid = true;
				_perms.forEach((perm)=>{
					if (validPermissions(parameters['user-id'], group,  perm, permInfo, iotGroups) === false) {
						invalid_permission_groups.push({user_group: perm.user_group_id, access_limit: permInfo.control_user_limit, user_count: permInfo.control_user_count});
					}
				})
				if (invalid_permission_groups.length > 0) {
					reject("User permission violates group " + group.get('name') + " control limit. Invalid Permissions: " + JSON.stringify(invalid_permission_groups));
					return;
				}
			}
			return group.related('scene').fetch({withRelated: 'zone'});
		}).then((scene)=>{
			sc = scene;
			return scene.related('zone').fetch({withRelated: 'location'});
		}).then((zone)=>{
			var loc = zone.related('location');
			parameters.details = {position: {location: loc.get('name'), zone: zone.get('name'), scene: sc.get('name'), group: grp.get('name')}};
			return grp.exec(action, parameters);
		}).then((out)=>{
			resolve({execution:out});
		}).catch((error)=>{
			reject(error);
		})
	})
}

module.exports.doAction = (group_uuid, action, parameters, permission_groups = null, iotGroups = null) => {
	return new Promise((resolve,reject)=>{
		var self = this;
		if (permission_groups) {
			GroupPermission.where('user_group_id', 'in', permission_groups)
			.where('group_uuid', '=', group_uuid)
			.where('permission_type_id', '=', 3).fetchAll({ withRelated: ['group']}).then((permissions)=>{
				var _permissions = permissions.toJSON();
				if (!permissions || permissions.length == 0) {
					return reject("Group Action forbiden for user");
				} else {
					var group = _permissions[0].group;
					PropertyApi.checkUserAccess(parameters['org-id'], parameters['user-id'], group_uuid, group).then(()=>{
						return AutomatedActionApi.checkGroupActionOverrides(group_uuid, "user");
					}).then(() => {
						return doAction(group_uuid, action, parameters, permissions.toJSON(), iotGroups);
					}).then((res)=> {
						resolve(res);
					}).catch((error)=>{
						reject(error);
					});
				}
			}).catch((error)=>{
				reject(error);
			})
		} else if(parameters["trigger-type"] && (["sensor"].includes(parameters["trigger-type"]))){
			PropertyApi.checkAutomatedActionRestriction(parameters["org-id"],group_uuid).then(()=>{
				return doAction(group_uuid, action, parameters, null, null);	
			}).then((res) => {
				resolve(res);
			}).catch((error)=>{
				reject(error);
			});
		} else if(parameters["trigger-type"] && (["automated-action"].includes(parameters["trigger-type"]))) {
				doAction(group_uuid, action, parameters, null, null).then((res) => {
					resolve(res);
				}).catch((error) => {
					reject(error);
				})
		} else {
			AutomatedActionApi.checkGroupActionOverrides(group_uuid, "admin").then(() => {
				return doAction(group_uuid, action, parameters, null, null);
			}).then((res)=>{
				resolve(res);
			}).catch((error)=>{
				reject(error);
			})
		}
	});
}

module.exports.getGroupsByUserGroupIds = (user_group_ids, permission_type = null, group_types = null) => {
	return new Promise((resolve,reject)=>{
		var qb = GroupPermission.where('user_group_id', 'in', user_group_ids)
		if ( permission_type !== null) {
			qb = qb.where('permission_type_id', '=', permission_type);
		}
		qb.fetchAll().then((perms)=>{
			var uuids = Array.from(perms, x => x.get('group_uuid'));
			var qb2 = Group.where('uuid', 'in', uuids);
			if (group_types !== null) {
				qb2 = qb2.where('type', 'IN', group_types);
			}
			return qb2.fetchAll({withRelated: ['devices', 'permissions']});
		}).then((groups)=>{
			resolve(groups.toJSON());
		}).catch((error)=>{
			resolve([])
		})
	})
}



module.exports.applyProperty = (data) =>{
	return new Promise((resolve,reject)=>{
		if (!data.property_name || !data.object_uuid || !data.property_type) {
			return reject("Invalid property data");
		}

		if (!data.object_type || data.object_type != 'group') {
			return reject("Invalid property object type");
		}

		var _gr = undefined;

		Group.where({uuid:data.object_uuid}).fetch({withRelated: ['devices']}).then((group)=>{
			if (!group) {
				reject("Unknown group with uuid " + data.object_uuid);
			}
			_gr = group.toJSON();
			return ObjectProperty.where('property_name', '=', data.property_name)
			.where('property_type', '=', data.property_type)
			.where('object_uuid', '=', data.object_uuid)
			.where('object_type', '=', data.object_type).fetch();
		}).then((prop)=>{
			if (data.details && data.details == "") {
				data.details = null;
			}
			if (!prop) {
				prop = new ObjectProperty(data);
			}
			return prop.save(data);
		}).then((_prop)=>{
			resolve(_prop.toJSON());
		}).catch((error)=>{
			reject(error);
		})
	})

}

module.exports.clearProperty = (property_name, property_type, group_uuid) =>{
	return new Promise((resolve,reject)=>{
		ObjectProperty.where('property_name', '=', property_name)
		.where('property_type', '=', property_type)
		.where('object_uuid', '=', group_uuid)
		.where('object_type', '=', 'group').destroy().then(()=>{
			resolve();
		}).catch((error)=>{
			reject(error);
		})
	})
}

function clearAllPropertiesImpl(group, clearPins = false) {
	return new Promise((resolve,reject)=>{
		var func = undefined;
		if (clearPins) {
			ObjectProperty.where('object_uuid', '=', group.uuid).where('object_type', '=', 'group').destroy().then(() => {
				resolve();
			}).catch((error) => {
				log.warn(error)
				resolve();
			})
		} else {
			ObjectProperty.where('object_uuid', '=', group.uuid).where('object_type', '=', 'group').destroy().then(()=>{
				resolve();
			}, (error)=>{
				resolve();
			})
		}
	})
}

module.exports.clearAllProperties = (group_uuid) =>{
	return new Promise((resolve,reject)=>{
		Group.where({uuid:group_uuid}).fetch({withRelated: ['devices']}).then((group)=>{
			if (!group) {
				return reject("Unknown group with uuid " + group_uuid);
			}
			return clearAllPropertiesImpl(group.toJSON());
		}).then(()=>{
			resolve();
		}).catch((error)=>{
			resolve();
		})
	})
}
