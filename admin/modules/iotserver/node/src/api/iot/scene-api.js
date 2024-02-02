const Zone = require('../../models/Zone.js');
const ZoneAPI = require('./zone-api.js');
const GroupAPI = require('./group-api.js');
const Location = require('../../models/Location.js');
const Scene = require('../../models/Scene.js');
const ObjectProperty = require('../../models/ObjectProperty.js');
const ScenePermission = require('../../models/ScenePermission.js');
const ZonePermission = require('../../models/ZonePermission.js');
const LocationPermission = require('../../models/LocationPermission.js');
const GroupPermission = require('../../models/GroupPermission.js');
const Group = require('../../models/Group.js');
const dispatcher = require('../../lib/iot/event-dispatcher.js');

function getAll(filter_ids = null, permission_groups = null, return_type = false, add_relations = true, columns_filter = null) {
	return new Promise((resolve,reject)=>{
		var qb = Scene;
		if (filter_ids) {
			qb = qb.where('uuid', 'in', filter_ids);
		}

		var relations = undefined;
		if (!return_type) {
			relations = ['permissions', 'groups'];
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

		qb.fetchAll(options).then((scenes)=>{
			var _scenes = scenes ? scenes.toJSON() : [];
			_scenes.forEach((scene)=>{
				scene.objtype='scenes';
				if (add_relations && permission_groups) {
					scene.permissions = scene.permissions.filter(permission => permission_groups.includes(permission.user_group_id));
				}

				if (!columns_filter || columns_filter.includes('details')) {
					scene.details = scene.details ? JSON.parse(scene.details) : {};
				}

				if (!columns_filter || columns_filter.includes('actions')) {
					if (scene.actions && typeof scene.actions === 'string') {
						scene.actions = JSON.parse(scene.actions);
					}
				}
			});

			if (!return_type) {
				resolve(_scenes);
			} else {
				resolve({scenes: _scenes});
			}
		});
	});
}

function addPermission(scene, data, iotGroups = []) {
	return new Promise((resolve,reject)=>{
		// we're adding a permission to a scene, 
		// let's make sure that the underlying zone and location 
		// have appropriate permissions
		// let's copy the data
		var user_group =  JSON.parse(JSON.stringify(data));
		data.permission_type_id = 1;
		ZoneAPI.addPermission(scene.zone_uuid, data, false, false).then(()=>{
			user_group.scene_uuid = scene.uuid;
			user_group.org_id = scene.org_id;
			var perm = new ScenePermission(user_group);
			perm.save().then((perm)=>{
				// propagate the permissions to the groups
				if (scene.groups) {
					var q = require('q');
					var promises = [];
					delete user_group.scene_uuid;
					scene.groups.forEach((group)=>{
						promises.push(GroupAPI.addPermission(group.uuid, iotGroups,  user_group, false, false));
					})
					q.all(promises).then((res)=>{
						resolve(perm.toJSON());
					}).catch((error)=>{
						reject(error);
					})
				} else {
					resolve(perm.toJSON())
				}
			}).catch((err)=>{
				reject(err);
			});
		})	
	});
}

function updatePermission(perm, data) {
	return new Promise((resolve,reject)=>{
		var user_group =  JSON.parse(JSON.stringify(data));
		user_group.scene_uuid = perm.get("scene_uuid");
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
		var qb = Scene;
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
			ScenePermission.where('user_group_id', 'in', permission_groups).fetchAll({columns:['permission_type_id', 'scene_uuid']}).then((permissions)=>{
				if (permissions) {
					let scene_uuids = [];
					permissions.forEach((permission)=>{
						let uuid = permission.get('scene_uuid');
						if (!scene_uuids.includes(uuid)) {
							scene_uuids.push(permission.get('scene_uuid'));
						}
					})
					if (filter_ids) {
						scene_uuids = scene_uuids.filter(x => filter_ids.includes(x));
					}
					getAll(scene_uuids, permission_groups, return_type, add_relations, columns_filter).then((scenes)=>{
						resolve(scenes);
					})
				} else {
					resolve([]);
				}
			})
		} else {
			getAll(filter_ids, null, return_type, add_relations, columns_filter).then((scenes)=>{
				resolve(scenes);
			})
		}

	});
}

module.exports.getScene = (scene_uuid, permission_groups = null) =>{
	return new Promise((resolve,reject)=>{
		if (permission_groups) {
			ScenePermission.where('user_group_id', 'in', permission_groups)
			.where('scene_uuid', '=', scene_uuid)
			.where('permission_type_id', '>', 1).fetchAll({columns:['permission_type_id', 'scene_uuid']}).then((permissions)=>{
				if (permissions) {
					getAll([scene_uuid], permission_groups).then((scene)=>{
						resolve(scene);
					})
				} else {
					resolve([]);
				}
			})
		} else {
			getAll([scene_uuid]).then((scene)=>{
				resolve(scene);
			})
		}
	});
}

module.exports.addPermissionImpl = (scene, data, updateExisting = true, dispatch = true, iotGroups = []) => {
	return new Promise((resolve,reject)=>{
		var self = this;
		var res = undefined;
		ScenePermission.where('user_group_id', '=', data.user_group_id).where('scene_uuid', '=', scene.uuid).fetch().then((perm) => {
			if (perm && updateExisting) {
				updatePermission(perm, data).then((res)=>{
					if (dispatch) {
						dispatcher.updateIoTList('scene', scene, 'update', true);
					}
					resolve(res);
				}).catch((error)=>{
					reject(error);
				});
			} else if (perm) {
				resolve(perm.toJSON())
			} else {
				addPermission(scene, data, iotGroups).then((_res)=>{
					res = _res;
					if (dispatch) {
						dispatcher.updateIoTList('scene', scene, 'update', true);
					}
					return dispatcher.getNotifier().updatePermissions({obj_type: 'scene', obj_uuid: scene.uuid});
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



module.exports.addPermission = (scene_uuid, data, updateAll = true, updateExisting = true, iotGroups = []) => {
	
	return new Promise((resolve,reject)=>{
		var self = this;
		Scene.where('uuid', '=', scene_uuid).fetch({withRelated: ['permissions', 'groups']}).then((scene)=>{
			if (scene) {
				if (Array.isArray(data) && updateAll === true) {
					self.removeAllPermissions(scene_uuid).then(()=>{
						var q = require('q');
						var promises = [];
						data.forEach((dt) =>{
							promises.push(self.addPermissionImpl(scene.toJSON(), dt, updateExisting, true, iotGroups));
						});
						q.all(promises).then((res)=>{
							resolve(res);
						}).catch((error)=>{
							reject(error);
						})
					})
				} else {
					self.addPermissionImpl(scene.toJSON(), data, updateExisting, true, iotGroups).then((res)=>{
						resolve(res);
					}).catch((error)=>{
						reject(error);
					})
				}

			} else {
				reject('Scene not found');
			}
		})
	});
}

module.exports.removeAllPermissions = (scene_uuid) => {
	return new Promise((resolve,reject)=>{
		if (!scene_uuid) {
			resolve();
			return;
		}
		ScenePermission.where('scene_uuid', '=', scene_uuid).destroy().then(()=>{
			return getAll([scene_uuid]);
		}).then((scene)=>{
			var q = require('q');
			var promises = [];
			// remove all group permissions
			scene[0].groups.forEach((group)=>{
				promises.push(GroupAPI.removeAllPermissions(group.uuid))
			})
			return q.all(promises);
		}).then(()=>{
			resolve();
		}).catch((error)=>{
			reject(error);
		})
	});
}

module.exports.removePermission = (scene_uuid, user_group_id) => {
	return new Promise((resolve,reject)=>{
		ScenePermission.where('scene_uuid', '=', scene_uuid)
		.where('user_group_id', '=', user_group_id).fetch().then((permission)=>{
			if (!permission) {
				resolve([]);
				return;
			}
			var _permission = permission.toJSON();
			permission.destroy().then(()=>{
				getAll([scene_uuid]).then((scene)=>{

					scene[0].groups.forEach((group)=>{
						// remove the permission from the groups
						GroupAPI.removePermissionByType(group.uuid, _permission.permission_type_id);
					})
					dispatcher.updateIoTList('scene', scene[0], 'update', true);
					resolve(scene[0].permissions)
				})
			})
		})
	});
}

module.exports.createScene = (data) => {
	return new Promise((resolve,reject)=>{
		if(!data.zone_uuid) {
			reject('Unspecified scene zone');
		} else {
			var user_groups = [];
			if (data.user_groups) {

				//backward compatible with old mobile app (version 1.22.0 and below)
				data.user_groups.forEach(function (item, index) {
					data.user_groups[index] = { permission_type_id: item.permission_type_id, user_group_id: item.user_group_id, local_access: item.local_access ? item.local_access : 1 };
				});

				data.user_groups.forEach((userGroup)=>{
					if (!userGroup.permission_type_id || !userGroup.user_group_id || !userGroup.local_access) {
					reject("Invalid user groups settings " + JSON.stringify(userGroup));
					return;
				}
				user_groups.push({permission_type_id: userGroup.permission_type_id, user_group_id: userGroup.user_group_id, local_access:userGroup.local_access});
			});
				delete data.user_groups;
			}

			Zone.where({uuid:data.zone_uuid}).fetch({withRelated: ['permissions']}).then((zone)=>{
				if (!zone) {
					reject("Unknown zone " + data.zone_uuid);
				} else {
					var _zone = zone.toJSON();
					var zonePermisisons = _zone.permissions;
					var promises = [];
					var q = require('q');
					var scene_uuid = undefined;
					zonePermisisons.forEach((userGroup)=>{
						var found = user_groups.findIndex(x => x.user_group_id ===  userGroup.user_group_id);
						if (found === -1) { // do not override specified permisisons, only inherit for non configured user groups
							user_groups.push({permission_type_id: userGroup.permission_type_id, user_group_id: userGroup.user_group_id, local_access: 1 })
						}	
					})
					var org_id = zone.get("org_id");
					data.org_id = org_id;
					if (data.details && typeof data.details !== 'string') {
						data.details = JSON.stringify(data.details);
					}
					var sc = new Scene(data);
					sc.save().then((scene)=>{
						scene_uuid = scene.get("uuid");
						if (user_groups) {
							var _scene = scene.toJSON();
							user_groups.forEach((userGroup)=>{
								promises.push(addPermission(_scene, userGroup));
							})
						}
						return q.all(promises);
					}).then(()=>{
						return getAll([scene_uuid]);
					}).then((scene)=>{
						dispatcher.updateIoTList('scene', scene[0], 'insert', true);
						resolve(scene[0]);
					}).catch((err)=>{
						let msg = '' + err;
						if (err.message && err.message.includes('ER_DUP_ENTRY')) {
							msg = 'Scene with name ' + data.name + ' already exists in this zone.'
						}
						reject(msg);
					});
				}
			}).catch((err)=>{
				let msg = '' + err;
				if (err.message && err.message.includes('ER_DUP_ENTRY')) {
					msg = 'Scene with name ' + data.name + ' already exists in this zone.'
				}
				reject(msg);
			})
		}
	});
}


module.exports.deleteSceneImpl = (scene) => {
	return new Promise((resolve,reject)=>{
		// remove all groups binded to this scene
		var promises = [];
		var q = require('q');
		var _scene = scene.toJSON();
		Group.where({scene_uuid: scene.get("uuid")}).fetchAll({withRelated: ['permissions', 'devices']}).then((groups)=>{
			groups.forEach((group)=>{
				promises.push(GroupAPI.deleteGroupImpl(group));
			})
			return q.all(promises);
		}).then(()=>{
			return clearAllPropertiesImpl(_scene);
		}).then(()=>{
			return scene.destroy();
		}).then(()=>{
			dispatcher.updateIoTList('scene', _scene, 'delete', true);
			resolve(_scene);
		}).catch((error)=>{
			reject(error);
		});
	});
}



module.exports.deleteScene = (scene_uuid) => {
	return new Promise((resolve,reject)=>{
		var self = this;
		Scene.where({uuid:scene_uuid}).fetch({withRelated: ['permissions', 'groups']}).then((scene)=>{

			if (!scene) {
				reject("Unknown scene " + scene_uuid);
			} else {
				self.deleteSceneImpl(scene).then((res)=>{
					resolve(res);
				})
			}
		}).catch((error)=>{
			reject(error);
		});
	});
}

module.exports.updateScene = (scene_uuid, data, iotGroups=[]) => {
	return new Promise((resolve,reject)=>{
		var self = this;
		var sc = undefined;
		var sc_name = data.name ? data.name : scene_uuid;
		Scene.where({uuid:scene_uuid}).fetch({withRelated: ['permissions', 'groups']}).then((scene)=>{
			if (!scene) {
				reject("Unknown scene " + scene_uuid);
			} else {
				var details = undefined;
				var user_groups = [];
				sc_name = data.name ? data.name : scene.get('name');
				if (data.user_groups) {
					//backward compatible with old mobile app (version 1.22.0 and below)
					data.user_groups.forEach(function (item, index) {
						data.user_groups[index] = { permission_type_id: item.permission_type_id, user_group_id: item.user_group_id, local_access: item.local_access ? item.local_access : 1 };
					});

					data.user_groups.forEach((userGroup)=>{
						if (!userGroup.permission_type_id || !userGroup.user_group_id || !userGroup.local_access) {
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
						details = scene.get('details') ? JSON.parse(scene.get('details')) : {};
						if (typeof data.details === 'string') {
							data.details = JSON.parse(data.details);
						}
						Object.keys(data.details).forEach(function(skey) {
							details[skey] = data.details[skey]
						})
						scene.set(key, JSON.stringify(details))
					} else {
						scene.set(key, data[key]);
					}
				});
				
				scene.save().then((scene)=>{
					sc = scene.toJSON();
					var s_uuid = user_groups.length > 0 ? scene_uuid : null;
					return self.removeAllPermissions(s_uuid);
				}).then(()=>{
					var q = require('q');
					var promises = [];
					if (user_groups.length > 0) {
						user_groups.forEach((dt) => {
							promises.push(self.addPermissionImpl(sc, dt, true, false, iotGroups));
						});
					}
					return q.all(promises);
				}).then(()=>{
					return getAll([scene_uuid]);
				}).then((_scene)=>{
					dispatcher.updateIoTList('scene', _scene[0], 'update', true);
					resolve(_scene[0]);
				}).catch((error)=>{
					let msg = '' + error;
					if (error.message && error.message.includes('ER_DUP_ENTRY')) {
						msg = 'Scene with name ' + sc_name + ' already exists in this zone.'
					}
					reject(msg);
				})
			}
		}).catch((error)=>{
			let msg = '' + error;
			if (error.message && error.message.includes('ER_DUP_ENTRY')) {
				msg = 'Scene with name ' + sc_name + ' already exists in this zone.'
			}
			reject(error);
		});
	});
}

module.exports.addGroupImpl = (_scene, group) => {
	return new Promise((resolve,reject)=>{
		var self = this;
		group.set('scene_uuid', scene_uuid);
		var _group = group.toJSON();
		group.save().then((group)=>{
			dispatcher.updateIoTList('group', _group, 'update', true);

			_scene.permissions.forEach((permission)=>{
				delete permission.id;
				delete permission.scene_uuid;
				permission.group_uuid = group.get("uuid");
				var perm = new GroupPermission(permission);
				perm.save();
			})
			resolve(group);
		}).catch((error)=>{
			reject(error);
		});
	});
}

module.exports.addGroup = (scene_uuid, group_uuid) => {
	return new Promise((resolve,reject)=>{
		var self = this;
		var _scene = undefined;
		var groupActions = undefined;
		getAll([scene_uuid]).then((scenes)=>{
			if (scenes.length == 0) {
				reject("Unknown scene " + scene_uuid);
				return;
			}
			_scene = scenes[0];
			return Group.where({uuid:group_uuid}).fetch({withRelated: ['permissions', 'devices']})
		}).then((group)=>{
			return self.addGroupImpl(_scene, group);
		}).then((group)=>{
			groupActions = group.get("actions") ? JSON.parse(group.get("actions") ) : [];
			return Scene.where({uuid:scene_uuid}).fetch();
		}).then((scene)=>{
			var sceneActions = scene.get("actions") ? JSON.parse(scene.get("actions") ) : [];
			groupActions.forEach((act)=>{
				sceneActions.push(act)
			})
			scene.set("actions", JSON.stringify(sceneActions));
			return scene.save();
		}).then(()=>{
			return getAll([scene_uuid]);
		}).then((_scenes)=>{
			dispatcher.updateIoTList('scene', _scenes[0], 'update', true);
			resolve(_scenes[0]);
		}).catch((error)=>{
			reject(error);
		});
	});
}

module.exports.createAndAddGroup = (scene_uuid, group_name) => {
	return new Promise((resolve,reject)=>{
		var self = this;
		var group = new Group({name: group_name, state: "OK"});
		var _scene = undefined;
		getAll([scene_uuid]).then((scenes)=>{
			if (scenes.length == 0) {
				reject("Unknown scene " + scene_uuid);
				return;
			}
			_scene = scenes[0];
			return group.save();
		}).then((group)=>{
			return self.addGroupImpl(_scene, group);
		}).then(()=>{
			return getAll([scene_uuid])
		}).then((_scenes)=>{
			dispatcher.updateIoTList('scene', _scenes[0], 'update', true);
			resolve(_scenes[0]);
		}).catch((error)=>{
			reject(error);
		})
	});
}

module.exports.removeGroup = (scene_uuid, group_uuid) => {
	return new Promise((resolve,reject)=>{
		var _scene = undefined;
		var self = this;
		var promises = [];
		var q = require('q');
		var groupActions = undefined;
		getAll([scene_uuid]).then((scenes)=>{
			if (!scenes.length) {
				reject("Unknown scene " + scene_uuid);
				return;
			} 
			_scene = scenes[0];
			return Group.where({uuid:group_uuid, scene_uuid:scene_uuid}).fetch({withRelated: ['permissions', 'devices']});
		}).then((group)=>{

			if (!group) {
				resolve(_scene);
				return;
			}
			group.set('scene_uuid', null);
			return group.save();
		}).then((group)=>{
			groupActions = group.get("actions") ? JSON.parse(group.get("actions") ) : [];
			_scene.permissions.forEach((permission)=>{
				promises.push(GroupAPI.removePermissionByType(group_uuid, permission.permission_type_id));
			})
			return q.all(promises);
		}).then(()=>{
			return Scene.where({uuid:scene_uuid}).fetch();
		}).then((scene)=>{
			var sceneActions = scene.get("actions") ? JSON.parse(scene.get("actions")) : [];
			groupActions.forEach((act)=>{
				var index = sceneActions.findIndex(x => x === act)
				if (index > -1) {
					sceneActions.splice(index, 1);
				}
			})
			scene.set("actions", JSON.stringify(sceneActions));
			return scene.save()
		}).then(()=>{
			return getAll([scene_uuid])
		}).then((_scenes)=>{
			dispatcher.updateIoTList('scene', _scenes[0], 'update', true);
			resolve(_scenes[0]);
		}).catch((error)=>{
			reject(error);
		})
	});
}

module.exports.isSecured = (scene) => {
	var groups = scene.groups? scene.groups: [];
	var secured = true;
	groups.forEach((group)=>{
		if (!GroupAPI.isSecured(group)) {
			secured = false;
		}
	})
	return secured;	
}



module.exports.doAction = (scene_uuid, action, parameters, permission_groups = null, iotGroups = null) => {
	return new Promise((resolve,reject)=>{
		var self = this;
		var _scene = undefined;
		var errors = [];
		Scene.where({uuid:scene_uuid}).fetch({withRelated: ['permissions', 'groups', 'zone']}).then((scene)=>{
			if (!scene) {
				reject("Cannot find scene with uuid " + scene_uuid);
				return;
			}
			_scene = scene.toJSON();
			var q = require('q');
			var chain = q.when();

			_scene.groups.forEach((group)=>{
				chain = ((group) => chain.then(() => {
					return GroupAPI.doAction(group.uuid, action, parameters, permission_groups, iotGroups)
				}).catch((error) => {
					if (typeof error == "object") {
						errors.push(error)
					} else {
						reject(error);
					}
					return GroupAPI.doAction(group.uuid, action, parameters, permission_groups, iotGroups)
				})
 				)(group)
			})
			return chain.then(() => {
				return Promise.resolve();
			}).catch((error) => { // This is to catch the error if the last doAction fails
				if (typeof error == "object") {
					errors.push(error);
					return Promise.resolve();
				} else {
					reject(error);
				}
			})
		}).then(() => {
			if (errors.length > 0) {
				reject(errors);
			} else {
				resolve({execution: true});
			}
		}).catch((error) => {
			reject(error);
		});
	});
}


module.exports.applyProperty = (data) =>{
	return new Promise((resolve,reject)=>{
		if (!data.property_name || !data.object_uuid || !data.property_type) {
			return reject("Invalid property data");
		}

		if (!data.object_type || data.object_type != 'scene') {
			return reject("Invalid property object type");
		}

		var _sc = undefined;
		var groups = undefined;
		var result = undefined;

		Scene.where({uuid:data.object_uuid}).fetch({withRelated: ['groups']}).then((scene)=>{
			if (!scene) {
				reject("Unknown scene with uuid " + data.object_uuid);
			}
			_sc = scene.toJSON();
			groups = _sc.groups ? _sc.groups : [];
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
			groups.forEach((group)=>{
				promises.push(GroupAPI.applyProperty({property_name: data.property_name, 
					property_type: data.property_type, org_id: data.org_id,
					property_id : data.property_id,
					object_uuid: group.uuid, object_type: 'group', 
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

module.exports.clearProperty = (property_name, property_type, scene_uuid) =>{
	return new Promise((resolve,reject)=>{
		var _sc = undefined;
		var groups = undefined;
		Scene.where({uuid:scene_uuid}).fetch({withRelated: ['groups']}).then((scene)=>{
			if (scene) {
				_sc = scene.toJSON();
				groups = _sc.groups ? _sc.groups : [];
			} else {
				groups = [];
			}
			return ObjectProperty.where('property_name', '=', property_name)
			.where('property_type', '=', property_type)
			.where('object_uuid', '=', scene_uuid)
			.where('object_type', '=', 'scene').destroy();
		}).then(()=>{
			var promises = [];
			var q = require('q');
			groups.forEach((group)=>{
				promises.push(GroupAPI.clearProperty(property_name, property_type, group.uuid));
			})
			return q.all(promises)
		}).then(()=>{
			resolve();
		}).catch((error)=>{
			reject(error);
		})
	})
}

function clearAllPropertiesImpl(scene) {
	return new Promise((resolve,reject)=>{
		ObjectProperty.where('object_uuid', '=', scene.uuid).where('object_type', '=', 'scene').destroy().then(()=>{
			resolve();
		}).catch((error)=>{
			resolve();
		})
	})

}

module.exports.clearAllProperties = (scene_uuid) =>{
	return new Promise((resolve,reject)=>{
		Scene.where({uuid:scene_uuid}).fetch({withRelated: ['groups']}).then((scene)=>{
			if (!scene) {
				return reject("Unknown scene with uuid " + scene_uuid);
			}
			return clearAllPropertiesImpl(scene.toJSON());
		}).then(()=>{
			resolve();
		}).catch((error)=>{
			resolve();
		})
	})
}
