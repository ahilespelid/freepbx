const Location = require('../../models/Location.js');
const LocationAPI = require('./location-api.js');
const SceneAPI = require('./scene-api.js');
const ObjectProperty = require('../../models/ObjectProperty.js');
const Zone = require('../../models/Zone.js');
const ZonePermission = require('../../models/ZonePermission.js');
const LocationPermission = require('../../models/LocationPermission.js');
const Scene = require('../../models/Scene.js');
const dispatcher = require('../../lib/iot/event-dispatcher.js');
const ZoneActions = ["Arm", "Unarm", "SetAlarm", "ClearAlarm"];


function getAll(filter_ids = null, permission_groups = null, return_type = false, add_relations = true, columns_filter = null) {
	return new Promise((resolve,reject)=>{
		var qb = Zone;
		if (filter_ids) {
			qb = qb.where('uuid', 'in', filter_ids);
		}

		var relations = undefined;
		if (!return_type) {
			relations = ['permissions', 'scenes'];
		} else {
			relations = ['permissions'];
		}

		var options = {};
		if (add_relations) {
			options.withRelated = relations;
		}

		if (columns_filter) {
			options.columns = columns_filter;
		}

		qb.fetchAll(options).then((zones)=>{
			var _zones = zones? zones.toJSON() : [];
			_zones.forEach((zone)=>{
				zone.objtype='zones';
				if (permission_groups && add_relations) {
					zone.permissions = zone.permissions.filter(permission => permission_groups.includes(permission.user_group_id));
				}

				if (!columns_filter || columns_filter.includes('details')) {
					zone.details = zone.details ? JSON.parse(zone.details) : {};
				}

				if (!columns_filter || columns_filter.includes('actions')) {
					if (zone.actions && typeof zone.actions === 'string') {
						zone.actions = JSON.parse(zone.actions);
					}
				}
			});
			if (!return_type) {
				resolve(_zones);
			} else {
				resolve({zones: _zones});
			}
			
		});
	});
}


function addPermission(zone, data) {
	return new Promise((resolve,reject)=>{
		// we're adding a permission to a zone, 
		// let's make sure that the underlying location 
		// have appropriate permissions
		// let's copy the data
		var user_group =  JSON.parse(JSON.stringify(data));
		data.permission_type_id = 1;
		LocationAPI.addPermission(zone.location_uuid, data, false, false).then(()=>{
			user_group.zone_uuid = zone.uuid;
			user_group.org_id = zone.org_id;
			var perm = new ZonePermission(user_group);
			perm.save().then((perm)=>{
				resolve(perm.toJSON())
			}).catch((error)=>{
				reject(error);
			});
		}).catch((error)=>{
			reject(error);
		})
	})
}

function updatePermission(perm, data) {
	return new Promise((resolve,reject)=>{
		var user_group =  JSON.parse(JSON.stringify(data));
		user_group.zone_uuid = perm.get("zone_uuid");
		user_group.org_id = perm.get("org_id");
		perm.save(user_group).then((perm)=>{
			resolve(perm.toJSON())
		}).catch((err)=>{
			reject(err);
		});
	});
}

module.exports.getCount = () =>{
	return new Promise((resolve,reject)=>{
		var self = this;
		var qb = Zone;
		qb.count().then((count)=>{
			resolve(count);
		}).catch((error)=>{
			reject(error);
		})
	})
}


module.exports.getAll = (permission_groups = null, filter_ids = null, return_type = false, add_relations = true, columns_filter = null) =>{
	return new Promise((resolve,reject)=>{

		if (permission_groups) {
			ZonePermission.where('user_group_id', 'in', permission_groups).fetchAll({columns:['permission_type_id', 'zone_uuid']}).then((permissions)=>{
				if (permissions) {
					let zone_uuids = [];
					permissions.forEach((permission)=>{
						let uuid = permission.get('zone_uuid');
						if (!zone_uuids.includes(uuid)) {
							zone_uuids.push(permission.get('zone_uuid'));
						}
					})
					if (filter_ids) {
						zone_uuids = zone_uuids.filter(x => filter_ids.includes(x));
					}
					getAll(zone_uuids, permission_groups, return_type, add_relations, columns_filter).then((zones)=>{
						resolve(zones);
					})
				} else {
					resolve([]);
				}
			})
		} else {
			getAll(filter_ids, null, return_type, add_relations, columns_filter).then((zones)=>{
				resolve(zones);
			})
		}
	});
}
module.exports.getZone = (zone_uuid, permission_groups = null) =>{
	return new Promise((resolve,reject)=>{
		if (permission_groups) {
			ZonePermission.where('user_group_id', 'in', permission_groups)
			.where('zone_uuid', '=', zone_uuid)
			.where('permission_type_id', '>', 1).fetchAll({columns:['permission_type_id', 'zone_uuid']}).then((permissions)=>{
				if (permissions) {
					getAll([zone_uuid], permission_groups).then((zone)=>{
						resolve(zone);
					})
				} else {
					resolve([]);
				}
			})
		} else {
			getAll([zone_uuid]).then((zone)=>{
				resolve(zone);
			})
		}
	});
}

module.exports.addPermissionImpl = (zone, data,  updateExisting = true, dispatch = true) => {
	return new Promise((resolve,reject)=>{
		var self = this;
		var res = undefined;
		ZonePermission.where('user_group_id', '=', data.user_group_id).where('zone_uuid', '=', zone.uuid).fetch().then((perm)=>{
			if (perm && updateExisting) {
				updatePermission(perm, data).then((res)=>{
					if (dispatch) {
						dispatcher.updateIoTList('zone', zone, 'update', true);
					}
					resolve(res);
				}).catch((error)=>{
					reject(error);
				});
			} else if (perm) {
				resolve(perm.toJSON());
			} else {
				addPermission(zone, data).then((_res)=>{
					res = _res;
					if (dispatch) {
						dispatcher.updateIoTList('zone', zone, 'update', true);
					}
					return dispatcher.getNotifier().updatePermissions({obj_type: 'zone', obj_uuid: zone.uuid});
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

module.exports.addPermission = (zone_uuid, data, updateAll = true,  updateExisting = true) => {
	return new Promise((resolve,reject)=>{
		var self = this;
		delete data['local_access'];
		Zone.where('uuid', '=', zone_uuid).fetch({withRelated: ['permissions', 'scenes']}).then((zone)=>{
			if (zone) {
				if (Array.isArray(data) && updateAll === true) {
					self.removeAllPermissions(zone_uuid).then(()=>{
						var q = require('q');
						var promises = [];
						data.forEach((dt) =>{
							promises.push(self.addPermissionImpl(zone.toJSON(), dt, updateExisting));
						});
						q.all(promises).then((res)=>{
							resolve(res);
						}).catch((error)=>{
							reject(error);
						})
					})
				} else {
					self.addPermissionImpl(zone.toJSON(), data, updateExisting).then((res)=>{
						resolve(res);
					}).catch((error)=>{
						reject(error);
					})
				}

			} else {
				reject('Zone not found');
			}
		})
	})
}

module.exports.removeAllPermissions = (zone_uuid) => {
	return new Promise((resolve,reject)=>{
		if (!zone_uuid) {
			resolve();
			return;
		}
		ZonePermission.where('zone_uuid', '=', zone_uuid).destroy().then(()=>{
			resolve();
		}).catch((error)=>{
			reject(error);
		})
	});
}

module.exports.removePermission = (zone_uuid, user_group_id) => {
	return new Promise((resolve,reject)=>{
		ZonePermission.where('zone_uuid', '=', zone_uuid)
		.where('user_group_id', '=', user_group_id).fetch().then((permission)=>{
			if (!permission) {
				resolve([]);
				return;
			}
			permission.destroy().then(()=>{
				getAll([zone_uuid]).then((zone)=>{
					dispatcher.updateIoTList('zone', zone[0], 'update', true);
					resolve(zone[0].permissions)
				})
			})
		})
	});
}

module.exports.createZone = (data) => {
	return new Promise((resolve,reject)=>{
		if(!data.location_uuid) {
			reject('Unspecified zone location');
		} else {

			var user_groups = [];
			if (data.user_groups) {

				data.user_groups.forEach((userGroup)=>{
					if (!userGroup.permission_type_id || !userGroup.user_group_id) {
						reject("Invalid user groups settings " + JSON.stringify(userGroup));
						return;
					}
				user_groups.push({permission_type_id: userGroup.permission_type_id, user_group_id: userGroup.user_group_id});
			});
				delete data.user_groups;
			}

			Location.where({uuid:data.location_uuid}).fetch({withRelated: ['permissions']}).then((location)=>{
				if (!location) {
					reject("Unknown location " + data.location_uuid);
				} else {
					var org_id = location.get("org_id");
					data.org_id = org_id;
					var _location = location.toJSON();
					var locPermissions = _location.permissions;
					var promises = [];
					var q = require('q');
					var zone_uuid = undefined;

					locPermissions.forEach((userGroup)=>{
						var found = user_groups.findIndex(x => x.user_group_id ===  userGroup.user_group_id);
						if (found === -1) { // do not override specified permisisons, only inherit for non configured user groups
							user_groups.push({permission_type_id: userGroup.permission_type_id, user_group_id: userGroup.user_group_id})
						}	
					})
					if (!data.actions) {
						data.actions = "[";
						ZoneActions.forEach((action)=>{
							data.actions = data.actions + "\"" + action + "\",";
						});
						if (data.actions != "[") {
							data.actions = data.actions.substring(0, data.actions.length-1);
						}
						 data.actions = data.actions + "]";
					}

					if (data.details && typeof data.details !== 'string') {
						data.details = JSON.stringify(data.details);
					}

					data.state = "Unarmed";
					data.status = "OK";

					let zo = new Zone(data);
					zo.save().then((zone)=>{
						zone_uuid = zone.get("uuid");
						if (user_groups) {
							var _zone = zone.toJSON()
							user_groups.forEach((userGroup)=>{
								promises.push(addPermission(_zone, userGroup));
							})
						}
						return q.all(promises);
					}).then(()=>{
						return getAll([zone_uuid]);
					}).then((zone)=>{
						dispatcher.updateIoTList('zone', zone[0], 'insert', true);
						resolve(zone[0]);
					}).catch((err)=>{
						let msg = '' + err;
						if (err.message && err.message.includes('ER_DUP_ENTRY')) {
							msg = 'Zone with name ' + data.name + ' already exists in this location.'
						}
						reject(msg);
					});
				}
			}).catch((err)=>{
				let msg = '' + err;
				if (err.message && err.message.includes('ER_DUP_ENTRY')) {
					msg = 'Zone with name ' + data.name + ' already exists in this location.'
				}
				reject(msg);
			});
		}
	});
}


module.exports.deleteZoneImpl = (zone) => {
	return new Promise((resolve,reject)=>{
		// remove all scenes binded to this zone
		var _zone = zone.toJSON();
		var q = require('q');
		var promises = [];
		Scene.where({zone_uuid: zone.get("uuid")}).fetchAll({withRelated: ['permissions', 'groups']}).then((scenes)=>{
			scenes.forEach((scene)=>{
				promises.push(SceneAPI.deleteSceneImpl(scene));
			})
			return q.all(promises);
		}).then(()=>{
			return clearAllPropertiesImpl(_zone)
		}).then(()=>{
			return zone.destroy();
		}).then(()=>{
			dispatcher.updateIoTList('zone', _zone, 'delete', true);
			resolve(_zone);
		}).catch((error)=>{
			reject(error);
		});
	});
}

module.exports.deleteZone = (zone_uuid) => {
	return new Promise((resolve,reject)=>{
		var self = this;
		Zone.where({uuid:zone_uuid}).fetch({withRelated: ['permissions', 'scenes']}).then((zone)=>{
			if (!zone) {
				reject("Unknow zone " + zone_uuid)
			} else {
				self.deleteZoneImpl(zone).then((res)=>{
					resolve(res);
				})
			}
		}).catch((error)=>{
			reject(error);
		});
	});
}

module.exports.updateZone = (zone_uuid, data) => {
	return new Promise((resolve,reject)=>{
		var self = this;
		var zo = undefined;
		var zn_name = data.name ? data.name : zone_uuid;
		Zone.where({uuid:zone_uuid}).fetch({withRelated: ['permissions', 'scenes']}).then((zone)=>{
			if (!zone) {
				reject("Unknown zone " + zone_uuid);
			} else {
				var details = undefined;
				var user_groups = [];
				zn_name = data.name ? data.name : zone.get('name');
				if (data.user_groups) {
					data.user_groups.forEach((userGroup)=>{
						if (!userGroup.permission_type_id || !userGroup.user_group_id) {
							reject("Invalid user groups settings " + JSON.stringify(data.user_groups));
							return;
						}
					});
					// copy the user groups for later processing
					user_groups =  JSON.parse(JSON.stringify(data.user_groups));
					delete data.user_groups;
				}
				Object.keys(data).forEach(function(key) {
					if (key == 'details') {
						details = zone.get('details') ? JSON.parse(zone.get('details')) : {};
						if (typeof data.details === 'string') {
							data.details = JSON.parse(data.details);
						}
						Object.keys(data.details).forEach(function(skey) {
							details[skey] = data.details[skey]
						})
						zone.set(key, JSON.stringify(details))
					} else {
						zone.set(key, data[key]);
					}
				});
				zone.save().then((zone)=>{
					zo = zone.toJSON();
					var z_uuid = user_groups.length > 0  ? zone_uuid : null;
					return self.removeAllPermissions(z_uuid);
				}).then(()=>{
					var q = require('q');
					var promises = [];
					if (user_groups.length > 0 ) {
						user_groups.forEach((dt) =>{
							promises.push(self.addPermissionImpl(zo, dt, true, false));
						});
					}
					return q.all(promises);
				}).then(()=>{
					return getAll([zone_uuid]);
				}).then((_zone)=>{
					dispatcher.updateIoTList('zone', _zone[0], 'update', true);
					resolve(_zone[0]);
				}).catch((error)=>{
					let msg = '' + error;
					if (error.message && error.message.includes('ER_DUP_ENTRY')) {
						msg = 'Zone with name ' + zn_name + ' already exists in this location.'
					}
					reject(msg);
				})
			}
		}).catch((error)=>{
			let msg = '' + error;
			if (error.message && error.message.includes('ER_DUP_ENTRY')) {
				msg = 'Zone with name ' + zn_name + ' already exists in this location.'
			}
			reject(error);
		});
	});
}

module.exports.addScene = (zone_uuid, scene_uuid) => {
	return new Promise((resolve,reject)=>{
		Scene.where({uuid:scene_uuid}).fetch({withRelated: ['permissions', 'groups']}).then((scene)=>{
			scene.set('zone_uuid', zone_uuid);
			var _scene = scene.toJSON();
			scene.save().then((scene)=>{
				dispatcher.updateIoTList('scene', _scene, 'update', true);
				return Scene.where({zone_uuid: zone_uuid}).fetchAll();
			}).then((scenes)=>{
				resp = {'uuid': zone_uuid, 'scenes': scenes ? scenes.toJSON() : {}};
				resolve(resp);
			});
		});
	});
}

module.exports.removeScene = (zone_uuid, scene_uuid) => {
	return new Promise((resolve,reject)=>{
		Scene.where({uuid:scene_uuid, zone_uuid:zone_uuid}).fetch({withRelated: ['permissions', 'groups']}).then((scene)=>{
			if(scene){
				scene.set('zone_uuid', null);
				var _scene = scene.toJSON();
				scene.save().then((scene)=>{
					dispatcher.updateIoTList('scene', _scene, 'update', true);
					return Scene.where({zone_uuid: zone_uuid}).fetchAll();
				}).then((scenes)=>{
					resp = {'uuid': zone_uuid, 'scenes': scenes ? scenes.toJSON() : {}};
					resolve(resp);
				});

			} else {
				reject();
			}
		});
	});
}

module.exports.isSecured = (zone) => {
	var scenes = zone.scenes? zone.scenes: [];
	var secured = true;
	scenes.forEach((scene)=>{
		if (!SceneAPI.isSecured(scene)) {
			secured = false;
		}
	})
	return secured;	
}

function processZoneAction(self, zone, action, parameters) {
	return new Promise((resolve,reject)=>{
		if (!zone) {
			reject("Could not find zone");
			return;
		}

		var _zone = zone.toJSON();
		_zone.scenes = _zone.scenes? _zone.scenes: [];
		var promises = [];
		var q = require('q');
		var secured = true;
		_zone.scenes.forEach((scene)=>{
			promises.push(Scene.where({uuid: scene.uuid}).fetch({withRelated: ['groups']}))
		})
		q.all(promises).then((scenes)=>{
			scenes.forEach((sc)=>{
				if (SceneAPI.isSecured(sc.toJSON()) === false) {
					secured = false;
				}
			})
			if (action === "Arm" && secured === false) {
				reject("Cannot arm unsecured zone " + _zone.name);
				return;
			}

			var loc = zone.related('location');
			parameters['details'] = {position: {location: loc.get('name'), zone: _zone.name}};
			zone.exec(action, parameters).then((out)=>{
				resolve({execution:out});
			});
		}).catch((error)=>{
			reject(error);
		})
	})
}

module.exports.doAction = (zone_uuid, action, parameters, permission_groups = null) => {
	return new Promise((resolve,reject)=>{
		var self = this;
		if (permission_groups) {
			ZonePermission.where('user_group_id', 'in', permission_groups)
			.where('zone_uuid', '=', zone_uuid)
			.where('permission_type_id', '=', 3).fetchAll({columns:['permission_type_id', 'zone_uuid']}).then((permissions)=>{
				if (!permissions || permissions.length == 0) {
					reject("Zone Action forbiden for user");
				} else {
					Zone.where({uuid:zone_uuid}).fetch({withRelated: ['permissions', 'scenes', 'location']}).then((zone)=>{
						return processZoneAction(self, zone, action, parameters)
					}).then((res)=>{
						resolve(res);
					}).catch((error)=>{
						reject(error);
					});
				}
			})
		} else {
			Zone.where({uuid:zone_uuid}).fetch({withRelated: ['permissions', 'scenes', 'location']}).then((zone)=>{
				return processZoneAction(self, zone, action, parameters)
			}).then((res)=>{
				resolve(res);
			}).catch((error)=>{
				reject(error);
			});
		}
	});
}



module.exports.applyProperty = (data) =>{
	return new Promise((resolve,reject)=>{
		if (!data.property_name || !data.object_uuid || !data.property_type) {
			return reject("Invalid property data");
		}

		if (!data.object_type || data.object_type != 'zone') {
			return reject("Invalid property object type");
		}

		var _zone = undefined;
		var scenes = undefined;
		var result = undefined;

		Zone.where({uuid:data.object_uuid}).fetch({withRelated: ['scenes']}).then((zone)=>{
			if (!zone) {
				reject("Unknown zone with uuid " + data.object_uuid);
			}
			_zone = zone.toJSON();
			scenes = _zone.scenes ? _zone.scenes : [];

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
			result = _prop.toJSON();
			// propagate the property to child objects
			var promises = [];
			var q = require('q');
			scenes.forEach((scene)=>{
				promises.push(SceneAPI.applyProperty({property_name: data.property_name, 
					property_type: data.property_type, org_id: data.org_id,
					property_id : data.property_id,
					object_uuid: scene.uuid, object_type: 'scene', 
					property_value: data.property_value}));
			})
			return q.all(promises)
		}).then(()=>{
			resolve(result);
		}).catch((error)=>{
			reject(error);
		})
	})

}

module.exports.clearProperty = (property_name, property_type, zone_uuid) =>{
	return new Promise((resolve,reject)=>{
		var _zone = undefined;
		var scenes = undefined;
		Zone.where({uuid:zone_uuid}).fetch({withRelated: ['scenes']}).then((zone)=>{
			if (zone) {
				_zone = zone.toJSON();
				scenes = _zone.scenes ? _zone.scenes : [];
			} else {
				scenes = [];
			}
			return ObjectProperty.where('property_name', '=', property_name)
			.where('property_type', '=', property_type)
			.where('object_uuid', '=', zone_uuid)
			.where('object_type', '=', 'zone').destroy();
		}).then(()=>{
			var promises = [];
			var q = require('q');
			scenes.forEach((scene)=>{
				promises.push(SceneAPI.clearProperty(property_name, property_type, scene.uuid));
			})
			return q.all(promises)
		}).then(()=>{
			resolve();
		}).catch((error)=>{
			reject(error);
		})
	})
}

function clearAllPropertiesImpl(zone) {
	return new Promise((resolve,reject)=>{
		ObjectProperty.where('object_uuid', '=', zone.uuid).where('object_type', '=', 'zone').destroy().then(()=>{
			resolve();
		}).catch((error)=>{
			resolve();
		})
	})

}

module.exports.clearAllProperties = (zone_uuid) =>{
	return new Promise((resolve,reject)=>{
		Zone.where({uuid:zone_uuid}).fetch({withRelated: ['scenes']}).then((zone)=>{
			if (!zone) {
				return reject("Unknown zone with uuid " + zone_uuid);
			}
			return clearAllPropertiesImpl(zone.toJSON());
		}).then(()=>{
			resolve();
		}).catch((error)=>{
			resolve();
		})
	})
}
