const Location = require('../../models/Location.js');
const LocationPermission = require('../../models/LocationPermission.js');
const ObjectProperty = require('../../models/ObjectProperty.js');
const ZoneAPI = require('./zone-api.js');
const Zone = require('../../models/Zone.js');
const Gateway = require('../../models/Gateway.js');
const GatewayAPI = require('./gateway-api.js');
const dispatcher = require('../../lib/iot/event-dispatcher.js');
const config = require('config');

function getAll(filter_ids = null, permission_groups = null, return_type = false, add_relations = true, columns_filter = null) {
	return new Promise((resolve,reject)=>{
		var qb = Location;
		if (filter_ids) {
			qb = qb.where('uuid', 'in', filter_ids);
		}
		var relations = undefined;
		if (!return_type) {
			relations = ['permissions', 'zones', 'gateways'];
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

		qb.fetchAll(options).then((locations)=>{
			var _locations = locations? locations.toJSON() : [];
			_locations.forEach((location)=>{
				location.objtype='locations';
				if (permission_groups && add_relations) {
					location.permissions = location.permissions.filter(permission => permission_groups.includes(permission.user_group_id));
				}

				if (!columns_filter || columns_filter.includes('details')) {
					location.details = location.details ? JSON.parse(location.details) : {};
					if (location.details.coordinates) {
						location.details.coordinates[0] = parseFloat(location.details.coordinates[0]);
						location.details.coordinates[1] = parseFloat(location.details.coordinates[1]);
					}
				}
			});
			if (!return_type) {
				resolve(_locations);
			} else {
				resolve({locations: _locations});
			}
		});
	});
}


function addPermission(location, data) {
	return new Promise((resolve,reject)=>{
		var user_group =  JSON.parse(JSON.stringify(data));
		user_group.location_uuid = location.uuid;
		user_group.org_id = location.org_id;
		var perm = new LocationPermission(user_group);
		perm.save().then((perm)=>{
			resolve(perm.toJSON())
		}).catch((error)=>{
			reject(error);
		});
	});
}

function updatePermission(perm, data) {
	return new Promise((resolve,reject)=>{
		var user_group =  JSON.parse(JSON.stringify(data));
		user_group.location_uuid = perm.get("location_uuid");
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
		var qb = Location;
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
			LocationPermission.where('user_group_id', 'in', permission_groups).fetchAll({columns:['permission_type_id', 'location_uuid']}).then((permissions)=>{
				if (permissions) {
					let location_uuids = [];
					permissions.forEach((permission)=>{
						let uuid = permission.get('location_uuid');
						if (!location_uuids.includes(uuid)) {
							location_uuids.push(permission.get('location_uuid'));
						}
					})
					if (filter_ids) {
						location_uuids = location_uuids.filter(x => filter_ids.includes(x));
					}
					getAll(location_uuids, permission_groups, return_type, add_relations, columns_filter).then((locations)=>{
						resolve(locations);
					})
				} else {
					resolve([]);
				}
			})
		} else {
			getAll(filter_ids, null, return_type, add_relations, columns_filter).then((locations)=>{
				resolve(locations);
			})
		}
	});
}
module.exports.getLocation = (location_uuid, permission_groups = null) =>{
	return new Promise((resolve,reject)=>{
		if (permission_groups) {
			LocationPermission.where('user_group_id', 'in', permission_groups)
			.where('location_uuid', '=', location_uuid)
			.where('permission_type_id', '>', 1).fetchAll({columns:['permission_type_id', 'location_uuid']}).then((permissions)=>{
				if (permissions) {
					getAll([location_uuid], permission_groups).then((location)=>{
						resolve(location);
					})
				} else {
					resolve([]);
				}
			})
		} else {
			getAll([location_uuid]).then((location)=>{
				resolve(location);
			})
		}
	});
}

module.exports.addPermissionImpl = (location, data, updateExisting = true, dispatch = true) => {
	return new Promise((resolve,reject)=>{
		var self = this;
		var res = undefined;
		LocationPermission.where('user_group_id', '=', data.user_group_id).where('location_uuid', '=', location.uuid).fetch().then((perm)=>{
			if (perm && updateExisting) {
				updatePermission(perm, data).then((res)=>{
					if (dispatch) {
						dispatcher.updateIoTList('location', location, 'update', true);
					}
					resolve(res);
				}).catch((error)=>{
					reject(error);
				});
			} else if (perm) {
				resolve(perm.toJSON());
			} else {
				addPermission(location, data).then((_res)=>{
					res = _res;
					if (dispatch) {
						dispatcher.updateIoTList('location', location, 'update', true);
					}
					return dispatcher.getNotifier().updatePermissions({obj_type: 'location', obj_uuid: location.uuid});
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


module.exports.addPermission = (location_uuid, data, updateAll = true, updateExisting = true) => {
	return new Promise((resolve,reject)=>{
		var self = this;
		Location.where('uuid', '=', location_uuid).fetch({withRelated: ['permissions', 'zones', 'gateways']}).then((location)=>{
			if (location) {
				if (Array.isArray(data) && updateAll === true) {
					self.removeAllPermissions(location_uuid).then(()=>{
						var q = require('q');
						var promises = [];
						data.forEach((dt) =>{
							promises.push(self.addPermissionImpl(location.toJSON(), dt, updateExisting));
						});
						q.all(promises).then((res)=>{
							resolve(res);
						}).catch((error)=>{
							reject(error);
						})
					})
				} else {
					self.addPermissionImpl(location.toJSON(), data, updateExisting).then((res)=>{
						resolve(res);
					}).catch((error)=>{
						reject(error);
					})
				}
			} else {
				reject('Location not found');
			}
		})
	});
}

module.exports.removeAllPermissions = (location_uuid) => {
	return new Promise((resolve,reject)=>{
		if (!location_uuid) {
			resolve();
			return;
		}
		LocationPermission.where('location_uuid', '=', location_uuid).destroy().then(()=>{
			resolve();
		}).catch((error)=>{
			reject(error);
		})
	});
}

module.exports.removePermission = (location_uuid, user_group_id) => {
	return new Promise((resolve,reject)=>{
		LocationPermission.where('location_uuid', '=', location_uuid)
		.where('user_group_id', '=', user_group_id).fetch().then((permission)=>{
			if (!permission) {
				resolve([]);
				return;
			}
			permission.destroy().then(()=>{
				getAll([location_uuid]).then((location)=>{
					dispatcher.updateIoTList('location', location[0], 'update', true);
					resolve(location[0].permissions)
				})
			})
		})
	});
}

module.exports.createLocation = (data) => {
	return new Promise((resolve,reject)=>{
		var user_groups = undefined;
		var location_uuid = undefined;
		var promises = [];
		var _data = undefined;
		var q = require('q');
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

		if (!data.org_id) {
			reject("Invalid org_id");
			return;
		}
		if (data.details) {
			_data = typeof data.details === 'string' ? JSON.parse(data.details) : data.details;
			if (_data && _data.default_org_name && _data.default_org_name == true && data.name) {
				dispatcher.getIoTBackendServer().deploymentSettings({ display_name: data.name })
			}
		}
		if (data.details && typeof data.details !== 'string') {
			delete data.details['default_org_name'];
			data.details = JSON.stringify(data.details);
		}
		var loc = new Location(data);
		loc.save().then((location)=>{

			location_uuid = location.get("uuid");
			if (user_groups) {
				user_groups.forEach((userGroup)=>{
					promises.push(addPermission(location.toJSON(), userGroup));
				})
			}
			return q.all(promises);
		}).then(()=>{
			return getAll([location_uuid]);
		}).then((location)=>{
			dispatcher.updateIoTList('location', location[0], 'insert', true);
			resolve(location[0]);
		}).catch((error)=>{
			reject(error);
		});
	});
}

module.exports.deleteLocationImpl = (location) => {
	return new Promise((resolve,reject)=>{
		var self = this;
		var _location = location.toJSON()
		var promises = [];
		var q = require('q');
		// remove all zones binded to this location
		Zone.where({location_uuid: location.get("uuid")}).fetchAll().then((zones)=>{
			zones.forEach((zone)=>{
				promises.push(ZoneAPI.deleteZoneImpl(zone));
			})
			return q.all(promises);
		}).then(()=>{
			// remove all gateways binded to this location
			return Gateway.where({location_uuid: location.get("uuid")}).fetchAll();
		}).then((gateways)=>{
			 promises = [];
			 var iotManager = dispatcher.getIoTManager();
			 var chain = q.when();
			 gateways.forEach((gateway)=>{
			 	chain = chain.then(()=>{
			 		return GatewayAPI.removeGatewayImpl(gateway, iotManager);
			 	})
			})
			return chain;
		}).then(() => {
			return clearAllPropertiesImpl(location.toJSON());
		}).then(()=>{
			return location.destroy()
		}).then(()=>{
			dispatcher.updateIoTList('location', _location, 'delete', true);
			resolve(_location);
		}).catch((error)=>{
			reject(error);
		});
	});
}

module.exports.deleteLocation = (location_uuid) => {
	return new Promise((resolve,reject)=>{
		var self = this;
		Location.where({uuid:location_uuid}).fetch({withRelated: ['permissions', 'zones', 'gateways']}).then((location)=>{
			if (!location) {
				reject("Unknown location " + location_uuid);
			} else {
				self.deleteLocationImpl(location).then((res)=>{
					resolve(res);
				})
			}
		}).catch((error)=>{
			reject(error);
		});
	});
}

module.exports.updateLocation = (location_uuid, data) => {
	return new Promise((resolve,reject)=>{
		var self = this;
		var loc = undefined;
		Location.where({uuid:location_uuid}).fetch({withRelated: ['permissions', 'zones', 'gateways']}).then((location)=>{
			if (!location) {
				reject("Unknown location " + location_uuid);
			} else {
				var details = undefined;
				var user_groups = [];
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
						details = location.get('details') ? JSON.parse(location.get('details')) : {};
						if (typeof data.details === 'string') {
							data.details = JSON.parse(data.details);
						}
						if(data.details.default_org_name && data.details.default_org_name == true && data.name){
							dispatcher.getIoTBackendServer().deploymentSettings({display_name: data.name})
						}
						delete data.details['default_org_name'];
						Object.keys(data.details).forEach(function(skey) {
							details[skey] = data.details[skey]
						})
						location.set(key, JSON.stringify(details))
					} else {
						location.set(key, data[key]);
					}
				});
				location.save().then((location)=>{
					loc = location.toJSON();
					var loc_uuid = user_groups.length > 0  ? location_uuid : null;
					return self.removeAllPermissions(loc_uuid);
				}).then(()=>{
					var q = require('q');
					var promises = [];
					if (user_groups.length > 0 ) {
						user_groups.forEach((dt) =>{
							promises.push(self.addPermissionImpl(loc, dt, true, false));
						});
					}
					return q.all(promises);
				}).then(()=>{
					return getAll([location_uuid]);
				}).then((_location)=>{
					dispatcher.updateIoTList('location',_location[0], 'update', true);
					resolve(_location[0]);
				}).catch((error)=>{
					reject(error);
				})
			}
		}).catch((error)=>{
			reject(error);
		});
	});
}

module.exports.addZone = (location_uuid, zone_uuid) => {
	return new Promise((resolve,reject)=>{
		Zone.where({uuid:zone_uuid}).fetch({withRelated: ['permissions', 'scenes']}).then((zone)=>{
			if(zone && zone.get('location_uuid')){
				reject();
			}else if(zone){
				zone.set('location_uuid', location_uuid);
				var _zone = zone.toJSON();
				zone.save().then((zone)=>{
					resp = {'uuid': zone.get('uuid'),
					'name': zone.get('name'),
					'id':zone.get('id'),
					'objtype': 'zones',
					'zones': [],
					'gateways': [],
					'actions': []};
					dispatcher.updateIoTList('zone', _zone, 'update', true);
					resolve(resp);
				});
			}else{
				reject();
			}
		});
	});
}

module.exports.addCreateAndAddZone = (location_uuid, zone_name) => {
	return new Promise((resolve,reject)=>{
		var zone = new Zone({name: zone_name});
		zone.set('location_uuid',location_uuid);
		zone.save().then((zone)=>{
			resp = {'uuid': zone.get('uuid'),
			'name': zone.get('name'),
			'id':zone.get('id'),
			'objtype': 'zones',
			'location_uuid':location_uuid,
			'zones': [],
			'gateways': [],
			'actions': []};
			dispatcher.updateIoTList('zone', zone, 'insert');
			resolve(resp);
		});
	});
}

module.exports.removeZone = (location_uuid, zone_uuid) => {
	return new Promise((resolve,reject)=>{
		var myZones;
		Zone.where({uuid:zone_uuid, location_uuid:location_uuid}).fetch({withRelated: ['permissions', 'scenes']}).then((zone)=>{
			if (zone) {
				zone.set('location_uuid', null);
				var _zone = zone.toJSON();
				zone.save().then((zone)=>{
					dispatcher.updateIoTList('zone', _zone, 'update', true);
					return Zone.where({location_uuid: location_uuid}).fetchAll();
				}).then((zones)=>{
					myZones = zones;
					return Gateway.where({location_uuid: location_uuid}).fetchAll();
				}).then((gateways)=>{
					resp = {'uuid': location_uuid, 'zones': myZones ? myZones.toJSON() : {}, 'gateways': gateways ? gateways.toJSON() : {}};
					resolve(resp);
				});
			} else {
				reject();
			}
		});
	});
}

module.exports.applyProperty = (data) =>{
	return new Promise((resolve,reject)=>{
		if (!data.property_name || !data.object_uuid || !data.property_type) {
			return reject("Invalid property data");
		}

		if (!data.object_type || data.object_type != 'location') {
			return reject("Invalid property object type");
		}

		var _loc = undefined;
		var zones = undefined;
		var result = undefined;

		Location.where({uuid:data.object_uuid}).fetch({withRelated: ['zones']}).then((location)=>{
			if (!location) {
				reject("Unknown location with uuid " + data.object_uuid);
			}
			_loc = location.toJSON();
			zones = _loc.zones ? _loc.zones : [];

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
			zones.forEach((zone)=>{
				promises.push(ZoneAPI.applyProperty({property_name: data.property_name, 
					property_type: data.property_type, org_id: data.org_id,
					property_id : data.property_id,
					object_uuid: zone.uuid, object_type: 'zone', 
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

module.exports.clearProperty = (property_name, property_type, location_uuid) =>{
	return new Promise((resolve,reject)=>{
		var _loc = undefined;
		var zones = undefined;
		Location.where({uuid:location_uuid}).fetch({withRelated: ['zones']}).then((location)=>{
			if (location) {
				_loc = location.toJSON();
				zones = _loc.zones ? _loc.zones : [];
			} else {
				zones = [];
			}
			return ObjectProperty.where('property_name', '=', property_name)
			.where('property_type', '=', property_type)
			.where('object_uuid', '=', location_uuid)
			.where('object_type', '=', 'location').destroy();
		}).then(()=>{
			var promises = [];
			var q = require('q');
			zones.forEach((zone)=>{
				promises.push(ZoneAPI.clearProperty(property_name, property_type, zone.uuid));
			})
			return q.all(promises)
		}).then(()=>{
			resolve();
		}).catch((error)=>{
			reject(error);
		})
	})
}

function clearAllPropertiesImpl(location) {
	return new Promise((resolve,reject)=>{
		ObjectProperty.where('object_uuid', '=', location.uuid).where('object_type', '=', 'location').destroy().then(()=>{
			resolve();
		}).catch((error)=>{
			resolve();
		})
	})

}

module.exports.clearAllProperties = (location_uuid) =>{
	return new Promise((resolve,reject)=>{
		Location.where({uuid:location_uuid}).fetch({withRelated: ['zones']}).then((location)=>{
			if (!location) {
				return reject("Unknown location with uuid " + location_uuid);
			}
			return clearAllPropertiesImpl(location.toJSON());
		}).then(()=>{
			resolve();
		}).catch((error)=>{
			resolve();
		})
	})
}
