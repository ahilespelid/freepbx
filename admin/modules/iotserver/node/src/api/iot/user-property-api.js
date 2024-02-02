const UserPropertyValue = require('../../models/UserPropertyValue.js');
const UserPropertyField = require('../../models/UserPropertyField.js');
const config = require('config');

const LocationAPI = require('./location-api.js');
const ZoneAPI = require('./zone-api.js');
const SceneAPI = require('./scene-api.js');
const GroupAPI = require('./group-api.js');

const log = require('../../lib/log');

const objectTypeToClassMap = {'location': LocationAPI, 'zone': ZoneAPI, 'scene': SceneAPI, 'group': GroupAPI};

const crypto = require('crypto');
const iv = Buffer.from([]);

const APP_KEY = global.process.env.APP_KEY;
const MSG_NO_USER_ACCESS_BY_AP = "User access is forbiden by time access profile. Please contact your system administrator";

module.exports.MSG_NO_USER_ACCESS_BY_AP = MSG_NO_USER_ACCESS_BY_AP;

function _encrypt(raw) {
    var key = Buffer.from(APP_KEY,'hex');
    var plainText = Buffer.from(raw, 'utf8');
    var cipher = crypto.createCipheriv('aes-256-ecb', key, iv);
    var crypted = cipher.update(plainText, 'utf8', 'hex');
    crypted += cipher.final('hex');
    return crypted;
}

function _decrypt(enc) {
    var key = Buffer.from(APP_KEY,'hex');
    var decipher = crypto.createDecipheriv('aes-256-ecb', key, iv);
    decipher.setAutoPadding(false);
    var dec = decipher.update(enc, 'hex', 'utf8');
    dec += decipher.final('utf8');
    return dec;
}

function getAll(filter_name = null, filter_values = null, user_id = null) {
	return new Promise((resolve,reject)=>{
		var qb = UserPropertyValue;
		
		if (filter_name && filter_values) {
			qb = qb.where(filter_name, 'in', filter_values);
		}

		if (user_id ) {
			qb = qb.where('user_id', '=', user_id);
		}

		qb.fetchAll().then((properties)=>{
			var _properties = properties ? properties.toJSON() : [];
			resolve(_properties);
		});
	});
}

module.exports.getUserFavorites = (user_id, permission_groups = null, return_type = false) =>{
	return new Promise((resolve,reject)=>{
		var self = this;
		UserPropertyField.where('name', '=', 'favorite').fetch().then((favorite)=>{
			if (!favorite) {
				reject('Could not find favorite property field');
				return;
			}
			return getAll('property_field_id', [favorite.id], user_id);
		}).then((favorites)=>{

			var data = {};
			var q = require('q');
			var promises = [];


			if (favorites.length == 0) {
				// user does not have any favorites, 
				// just set any outside with control permission door as default favorite
				var results = [];
				GroupAPI.getAll(permission_groups, null, return_type).then((groups)=>{
					if (!return_type) {
						groups = groups.filter(group => GroupAPI.isDoorGroupType(group.type));
					} else {
						groups = groups['groups'].filter(group => GroupAPI.isDoorGroupType(group.type));
					}
				 	if (groups) {
				 		var controlDoors = [];
				 		groups.forEach((group)=>{
				 			let perms = group.permissions.filter(permission => permission.permission_type_id === 3);
				 			if (perms && perms.length !== 0) {
				 				controlDoors.push(group);
				 				if (user_id) {
				 					data = {user_id: user_id, object_type: 'group', object_uuid: group.uuid, org_id: group.org_id};
				 					promises.push(self.addUserFavorites(user_id, permission_groups, data))
				 				}
				 			}
				 		})
				 		if (controlDoors.length !== 0) {
				 			results.push(controlDoors);
				 		}	
				 	}
				 	return q.all(promises);
				 }).then(()=>{
				 	if (!return_type) {
						resolve(results);
					} else {
						resolve({favorites: results});
					}
				 }).catch((error)=>{
				 	reject(error)
				 })
			} else {
				data = {};
				favorites.forEach((fav)=>{
					if (!data[fav.object_type]) {
						data[fav.object_type] = [];
					}
					data[fav.object_type].push(fav.object_uuid);
				})
				Object.keys(data).forEach((key)=>{
					var api = objectTypeToClassMap[key];
					promises.push(api.getAll(permission_groups, data[key], return_type));
				})
				q.all(promises).then((results)=>{
					if (!return_type) {
						resolve(results);
					} else {
						var favs = [];
						results.forEach((result)=>{
							Object.keys(result).forEach((key)=>{
								if (['locations', 'zones', 'scenes', 'groups'].includes(key)) {
									favs.push(result[key]);
								}
							})
						})
						resolve({favorites: favs});
					}
				}).catch((error)=>{
					reject(error)
				})

			}
		}).catch((error)=>{
			reject(error);
		})
	});
}

module.exports.addUserFavorites = (user_id, permission_groups, data) =>{
	return new Promise((resolve,reject)=>{
		if (!data.object_uuid || !data.object_type) {
			reject('Invalid object information');
			return;
		}
		if (!data.org_id) {
			reject('Invalid org_id');
			return;
		}
		var favData = {};
		favData.user_id = user_id;
		favData.object_type = data.object_type;
		favData.object_uuid = data.object_uuid
		favData.value = data.object_type + ':' + data.object_uuid;
		favData.org_id = data.org_id;
		UserPropertyField.where('name', '=', 'favorite').fetch().then((favorite)=>{
			if (!favorite) {
				reject('Could not find favorite property field');
				return;
			}
			favData.property_field_id = favorite.id;
			return UserPropertyValue
				.where('property_field_id', '=', favorite.id)
				.where('user_id', '=', user_id)
				.where('object_uuid', '=', data.object_uuid)
				.where('object_type', '=', data.object_type).fetch();
		}).then((prop)=>{
			if (prop) {
				resolve(prop.toJSON());
			} else {

				prop = new UserPropertyValue(favData);
				prop.save().then((prop)=>{
					resolve(prop.toJSON());
				}).catch((error)=>{
					reject(error);
				})
			}
		}).catch((error)=>{
			reject(error);
		})
	});
}

module.exports.removeUserFavorites = (user_id, permission_groups, data) =>{
	return new Promise((resolve,reject)=>{
		if (!data.object_uuid || !data.object_type) {
			reject('Invalid object information: ' + JSON.stringify(data));
			return;
		}

		UserPropertyField.where('name', '=', 'favorite').fetch().then((favorite)=>{
			if (!favorite) {
				reject('Could not find favorite property field');
				return;
			}
			return UserPropertyValue
				.where('property_field_id', '=', favorite.id)
				.where('user_id', '=', user_id)
				.where('object_uuid', '=', data.object_uuid)
				.where('object_type', '=', data.object_type).fetch();
		}).then((prop)=>{
			if (prop) {
				var _prop = prop.toJSON();
				prop.destroy().then(()=>{
					resolve(_prop);
				}).catch((error)=>{
					reject(error);
				})
			} else {
				resolve({});
			}
		}).catch((error)=>{
			reject(error);
		})

	});
}

module.exports.setUserUnits = (user_id, data) =>{
	return new Promise((resolve,reject)=>{
		if (!data.units || !['imperial', 'metric'].includes(data.units)) {
			reject('Invalid units');
			return;
		}
		if (!data.org_id) {
			reject('Invalid org_id');
			return;
		}
		UserPropertyField.where('name', '=', 'units').fetch().then((units)=>{
			if (!units) {
				return reject('Could not find units property field');
			}
			var unit_id = units.id;
			UserPropertyValue.where('property_field_id', '=', units.id).where('user_id', '=', user_id).fetch().then((prop)=>{
				if (!prop) {
					var propData = {};
					propData.user_id = user_id;
					propData.object_type = 'common';
					propData.value = data.units;
					propData.org_id = data.org_id;
					propData.object_uuid = 'common:units:' + propData.org_id + ':' + user_id;
					propData.property_field_id = unit_id;
					prop = new UserPropertyValue(propData); 
				} else {
					prop.set('value', data.units);
				}
				return prop.save();
			}).then((_prop)=>{
				resolve(_prop.toJSON());
			}).catch((error)=>{
				reject(error);
			})
		}).catch((error)=>{
			reject(error);
		})
	})
}

module.exports.getUserUnits = (user_id) =>{
	return new Promise((resolve,reject)=>{
		UserPropertyField.where('name', '=', 'units').fetch().then((units)=>{
			if(!units) {
				return resolve({units: 'metric'});
			}
			return UserPropertyValue.where('property_field_id', '=', units.id).where('user_id', '=', user_id).fetch();
		}).then((prop)=>{
			if(!prop) {
				resolve({units: 'metric'});
			} else {
				resolve({units: prop.get('value')});
			}
		}).catch((error)=>{
			log.warn(error);
			resolve({units: 'metric'});
		})
	})
}

function getObjectAccess(lookupKeyName, lookupOperation, lookupKeyValue) {
	return new Promise((resolve,reject)=>{
		UserPropertyField.where('name', '=', 'door-access').fetch().then((field)=>{
			if (!field) {
				return resolve([]);
			}
			return UserPropertyValue.where('property_field_id', '=', field.id).where(lookupKeyName, lookupOperation, lookupKeyValue).fetchAll();
		}).then((accesses)=>{
			if (accesses) {
				resolve(accesses.toJSON());
			} else {
				resolve([]);
			}
		}).catch((error)=>{
			log.warn(error);
			resolve([]);
		})
	})
}
function getObjectAutomatedActions(lookupKeyName, lookupOperation, lookupKeyValue) {
	return new Promise((resolve,reject)=>{
		UserPropertyField.where('name', '=', 'automated-action').fetch().then((field)=>{
			if (!field) {
				return resolve([]);
			}
			return UserPropertyValue.where('property_field_id', '=', field.id).where(lookupKeyName, lookupOperation, lookupKeyValue).fetchAll();
		}).then((accesses)=>{
			if (accesses) {
				resolve(accesses.toJSON());
			} else {
				resolve([]);
			}
		}).catch((error)=>{
			log.warn(error);
			resolve([]);
		})
	})
}

function removeObjectAccess(lookupKeyName, lookupOperation, lookupKeyValue) {
	return new Promise((resolve,reject)=>{
		UserPropertyField.where('name', '=', 'door-access').fetch().then((field)=>{
			if (!field) {
				return resolve();
			}
			return UserPropertyValue.where('property_field_id', '=', field.id).where(lookupKeyName, lookupOperation, lookupKeyValue).destroy();
		}).then(()=>{
			resolve();
		}).catch((error)=>{
			log.warn(error);
			resolve();
		})
	})
}

module.exports.getObjectAccessByUserId = (user_id) =>{
	return getObjectAccess('user_id', '=', user_id)
}


module.exports.getObjectAccessByObjectId = (object_uuid) =>{
	return getObjectAccess('object_uuid', '=' ,object_uuid)
}

module.exports.getObjectAccessByObjectIds = (object_uuids) =>{
	return getObjectAccess('object_uuid', 'IN' ,object_uuids)
}

module.exports.removeObjectAccessByIds = (access_ids) =>{
	return removeObjectAccess('id', 'IN', access_ids)
}

module.exports.removeObjectAccessByObjectIds = (object_uuids) =>{
	return removeObjectAccess('object_uuid', 'IN', object_uuids)
}

module.exports.removeObjectAccessByUserId = (user_id) =>{
	return removeObjectAccess('user_id', '=', user_id)
}

module.exports.removeObjectAccessByValue = (value) =>{
	return removeObjectAccess('value', '=', value)
}

module.exports.getObjectAutomatedActionsByObjectId = (object_uuid) =>{
	return getObjectAutomatedActions('object_uuid', '=' ,object_uuid)
}

function setUserAccess(org_id, field_id, user_id, object_uuid, object_type, value,  enabled) {
	return new Promise((resolve,reject)=>{
		UserPropertyValue.where('property_field_id', '=', field_id).where('user_id', '=', user_id).where('value','=',value).where('object_uuid', '=', object_uuid).where('object_type', '=', object_type).fetch().then((access)=>{
			if (!access) {
				var propData = {};
				propData.user_id = user_id;
				propData.object_type = object_type;
				propData.value = value.toString();
				propData.org_id = org_id;
				propData.object_uuid = object_uuid;
				propData.property_field_id = field_id;
				propData.details = {enabled: enabled}
				propData.details = JSON.stringify(propData.details)
				access = new UserPropertyValue(propData); 
			} else {
				var details = access.get('details') ? JSON.parse(access.get('details')) : {enabled: enabled};
				details.enabled = enabled;
				access.set('details', JSON.stringify(details));
				access.set('value', value.toString());
			}
			return access.save()
		}).then(()=>{
			resolve();
		}).catch((error)=>{
			log.warn(error);
			resolve();
		})
	})
}
function setAutomatedAction(org_id, field_id, user_id, object_uuid, object_type, value,  enabled) {
	return new Promise((resolve,reject)=>{
		UserPropertyValue.where('property_field_id', '=', field_id).where('user_id', '=', user_id).where('value','=',value).where('object_uuid', '=', object_uuid).where('object_type', '=', object_type).fetch().then((prop)=>{			
			if (!prop && enabled) {
				var propData = {};
				propData.user_id = user_id;
				propData.object_type = object_type;
				propData.value = value.toString();
				propData.org_id = org_id;
				propData.object_uuid = object_uuid;
				propData.property_field_id = field_id;
				propData.details = {enabled: enabled}
				propData.details = JSON.stringify(propData.details)
				prop = new UserPropertyValue(propData); 
				return prop.save();
			} else if(prop && enabled){
				var details = prop.get('details') ? JSON.parse(prop.get('details')) : {enabled: enabled};
				details.enabled = enabled;
				prop.set('details', JSON.stringify(details));
				prop.set('value', value.toString());
				return prop.save();
			} else if(prop){
				prop.destroy();
			}
		}).then(()=>{
			resolve();
		}).catch((error)=>{
			log.warn(error);
			resolve();
		})
	})
}
function setAutomatedPendingAction(org_id, field_id, user_id, object_uuid, object_type, value,  action) {
	return new Promise((resolve,reject)=>{
		UserPropertyValue.where('property_field_id', '=', field_id).where('user_id', '=', user_id).where('value','=',value).where('object_uuid', '=', object_uuid).where('object_type', '=', object_type).fetch().then((prop)=>{			
			if (!prop) {
				var propData = {};
				propData.user_id = user_id;
				propData.object_type = object_type;
				propData.value = value.toString();
				propData.org_id = org_id;
				propData.object_uuid = object_uuid;
				propData.property_field_id = field_id;
				propData.details = {action: action}
				propData.details = JSON.stringify(propData.details)
				prop = new UserPropertyValue(propData); 
			} else {
				var details = prop.get('details') ? JSON.parse(prop.get('details')) : {action: action};
				details.action = action;
				prop.set('details', JSON.stringify(details));
				prop.set('value', value.toString());
			}
			return prop.save()
		}).then(()=>{
			resolve();
		}).catch((error)=>{
			log.warn(error);
			resolve();
		})
	})
}


module.exports.setUserAccess = (org_id, user_id, object_uuid, object_type, value, enabled) =>{

	return new Promise((resolve,reject)=>{
		UserPropertyField.where('name', '=', 'door-access').fetch().then((field)=>{
			if (!field) {
				resolve();
				return;
			}
			setUserAccess(org_id, field.id, user_id, object_uuid, object_type, value,  enabled).then(()=>{
				resolve();
			}).catch((error)=>{
				log.warn(error);
				resolve();
			})
		}).catch((error)=>{
			log.warn(error);
			resolve();
		})
	})
}


module.exports.setUsersAccess = (org_id, values, object_uuid, object_type,  enabled) =>{
	return new Promise((resolve,reject)=>{
		UserPropertyField.where('name', '=', 'door-access').fetch().then((field)=>{
			if (!field) {
				resolve();
				return;
			}
			var q = require('q');
			var promises = [];
			values.forEach((value)=>{
				promises.push(setUserAccess(org_id, field.id, value.user_id, object_uuid, object_type, value.value,  enabled));
			})
			q.all((promises)).then(()=>{
				resolve();
			}).catch((error)=>{
				log.warn(error);
				resolve();
			})
		})
	})
}
module.exports.setAutomatedAction = (org_id, value, object_uuid, object_type,  enabled) =>{

	return new Promise((resolve,reject)=>{
		UserPropertyField.where('name', '=', 'automated-action').fetch().then((field)=>{
			if (!field) {
				resolve();
				return;
			}
			return setAutomatedAction(org_id, field.id, value.user_id, object_uuid, object_type, value.value,  enabled);
		}).then(() =>{
			resolve();
		}).catch((error)=>{
			log.warn(error);
			resolve();
		})
	})
}
module.exports.setAutomatedPendingAction = (org_id, value, object_uuid, object_type,  action) =>{

	return new Promise((resolve,reject)=>{
		UserPropertyField.where('name', '=', 'automation-pending-action').fetch().then((field)=>{
			if (!field) {
				resolve();
				return;
			}
			return setAutomatedPendingAction(org_id, field.id, value.user_id, object_uuid, object_type, value.value,  action);
		}).then(() =>{
			resolve();
		}).catch((error)=>{
			log.warn(error);
			resolve();
		})
	})
}
module.exports.checkUserAccess = (org_id, user_id, object_uuid, group) => {
	return new Promise((resolve,reject)=>{
		UserPropertyField.where('name', '=', 'door-access').fetch().then((field)=>{
			if (!field) {
				return resolve();
			}
			UserPropertyValue.where('property_field_id', '=', field.id).where('user_id', '=', user_id)
			.where('org_id', '=', org_id).where('object_uuid','=', object_uuid).fetch().then((prop)=>{
				if (prop && prop.get('value') && prop.get('details')) {
					var allow = true;
					try {
						let details = JSON.parse(prop.get('details'))
						 allow = (details.enabled !== undefined) ?  details.enabled : true
					} catch(e) {
						 allow = true;
					}
					if (allow === false) {
						var error_text={};
						error_text["message"] = this.MSG_NO_USER_ACCESS_BY_AP;
						if (group && group.name) {
							error_text["group_name"] = group.name; 
						}
						reject(error_text);
					} else {
						resolve()
					}
				} else {
					resolve()
				}
			}).catch((error)=>{
				log.warn(error);
				resolve();
			})
		})
	})
}
module.exports.checkAutomatedActionRestriction = (org_id,object_uuid) => {
	return new Promise((resolve,reject)=>{
		UserPropertyField.where('name', '=', 'automated-action').fetch().then((field)=>{
			if (!field) {
				return resolve();
			}
			UserPropertyValue.where('property_field_id', '=', field.id)
			.where('org_id', '=', org_id).where('object_uuid','=', object_uuid).fetch().then((prop)=>{
				if (prop && prop.get('value') && prop.get('details')) {
					var allow = true;
					try {
						let details = JSON.parse(prop.get('details'))
						 allow = (details.enabled !== undefined) ?  details.enabled : true
					} catch(e) {
						 allow = true;
					}
					if (allow === true) {
						var error_text={};

						error_text["message"] = "Group action is forbidden by a running Automated action";
						reject(error_text);
					} else {
						resolve()
					}
				} else {
					resolve()
				}
			}).catch((error)=>{
				log.warn(error);
				resolve();
			})
		})
	})
}

module.exports.checkForPendingAction = (org_id,object_uuid) => {
	return new Promise((resolve,reject)=>{
		UserPropertyField.where('name', '=', 'automation-pending-action').fetch().then((field)=>{
			if (!field) {
				return resolve();
			}
			UserPropertyValue.where('property_field_id', '=', field.id)
			.where('org_id', '=', org_id).where('object_uuid','=', object_uuid).fetch().then((prop)=>{
				if (prop && prop.get('value') && prop.get('details')) {
					var action = null;
					try {
						let details = JSON.parse(prop.get('details'))
						action = (details.action !== undefined) ?  details.action : "Lock"
					} catch(e) {
						action = "Lock";
					}
				} 
				resolve(action);
			}).catch((error)=>{
				log.warn(error);
				reject(error);
			})
		})
	})
}
module.exports.removePendingAction = (org_id,object_uuid) => {
	return new Promise((resolve,reject)=>{
		UserPropertyField.where('name', '=', 'automation-pending-action').fetch().then((field)=>{
			if (!field) {
				return resolve();
			}
			UserPropertyValue.where('property_field_id', '=', field.id)
			.where('org_id', '=', org_id).where('object_uuid','=', object_uuid).fetch().then((prop)=>{
				if (prop) {
					prop.destroy();
				}
				resolve();
			}).catch((error)=>{
				log.warn(error);
				reject();
			})
		})
	})
}

module.exports.getUserPinCode = (user_id) =>{
	return new Promise((resolve,reject)=>{
		UserPropertyField.where('name', '=', 'pincode').fetch().then((pincode)=>{
			if(!pincode) {
				return resolve({user_global_pincode: ''});
			}
			return UserPropertyValue.where('property_field_id', '=', pincode.id).where('user_id', '=', user_id).fetch();
		}).then((code)=>{
			if (!code) {
				resolve({user_global_pincode: ''});
			} else {
				resolve({user_global_pincode: Number(_decrypt(code.get('value')))});
			}
		}).catch((error)=>{
			log.warn(error);
			resolve({user_global_pincode: ''});
		})
	})
}

module.exports.getUsersPinCode = (user_ids) =>{
	return new Promise((resolve,reject)=>{
		var res = [];
		if (user_ids.length <= 0) {
			return resolve(res);
		}

		UserPropertyField.where('name', '=', 'pincode').fetch().then((pincode)=>{
			if(!pincode) {
				resolve(res);
			} else {
				UserPropertyValue.where('property_field_id', '=', pincode.id).where('user_id', 'IN', user_ids).fetchAll().then((codes)=>{
					codes.forEach((code)=>{
						res.push({user_id: code.get('user_id'), pin: Number(_decrypt(code.get('value')))});
					})
					resolve(res);
				}).catch((error)=>{
					resolve(res);
				})
			}
		}).catch((error)=>{
			resolve(res);
		})
	})
}

module.exports.setUserPinCode = (user_id, data) =>{
	return new Promise((resolve,reject)=>{
		if (!data.pincode || /^\d+$/.test(data.pincode) == false) {
			reject('Invalid pincode');
			return;
		}
		if (!data.org_id) {
			reject('Invalid org_id');
			return;
		}
		UserPropertyField.where('name', '=', 'pincode').fetch().then((field)=>{
			if (!field) {
				return reject('Could not find units property field');
			}
			var field_id = field.id;
			UserPropertyValue.where('property_field_id', '=', field.id).where('user_id', '=', user_id).fetch().then((prop)=>{
				if (!prop) {
					var propData = {};
					propData.user_id = user_id;
					propData.object_type = 'common';
					propData.value = _encrypt(data.pincode.toString());
					propData.org_id = data.org_id;
					propData.object_uuid = 'common:pincode:' + propData.org_id + ':' + user_id;
					propData.property_field_id = field_id;
					prop = new UserPropertyValue(propData); 
				} else {
					prop.set('value', _encrypt(data.pincode.toString()));
				}
				return prop.save();
			}).then((_prop)=>{
				resolve(_prop.toJSON());
			}).catch((error)=>{
				reject(error);
			})
		}).catch((error)=>{
			reject(error);
		})
	})
}


function getUserFirebaseTokens(user_id) {
    return new Promise((resolve, reject) => {
        UserPropertyField.where("name", "=", "firebase_token").fetch().then((field) => {
            if (!field) {
                reject("Could not find firebase_token property field");
            }
            if (user_id.length === undefined) {
                user_id = [user_id];
            }
            UserPropertyValue.where("property_field_id", "=", field.id).where("user_id", "in", user_id).fetchAll().then((prop) => {
                resolve(prop);
            });
       })
   })
}

module.exports.getUserFirebaseTokens = getUserFirebaseTokens;

function setUserFirebaseToken(user_id, org_id, data) {
    return new Promise((resolve, reject) => {
        if (!org_id || !data || !data.fbtoken) {
            reject("Not able to add a token to the user " + user_id);
            return;
        } else
            getUserFirebaseTokens(user_id).then(result => {
               if (!result || !result.length) {
                    UserPropertyField.where("name", "=", "firebase_token").fetch().then((field) => {
                        if (!field) {
                            reject("Could not find firebase_token property field");
                            return;
                        }
                        let propData = {};
                        propData.user_id = user_id;
                        propData.object_type = 'common';
                        propData.value = data.fbtoken;
                        propData.org_id = org_id;
                        propData.object_uuid = 'common:firebase_token:' + propData.org_id + ':' + user_id;
                        propData.property_field_id = field.id;
                        prop = new UserPropertyValue(propData);
                        return prop.save();
                    })
                    .then(_prop => {
                        resolve(_prop.toJSON())
                    })
                    .catch(error => {
                        reject(error);
                    })
             } else {
                result.forEach(prop => {
                    prop.set('value', data.fbtoken);
                    prop.save().then(() => {
                         resolve(prop.toJSON())
                    }).catch(error => {
                         reject(error);
                    })
                });
            }
	})
    })
}

module.exports.setUserFirebaseToken = setUserFirebaseToken;

function removeFirebaseTokensByValue(token) {
    return new Promise((resolve, reject) => {
        UserPropertyField.where("name", "=", "firebase_token").fetch().then((field) => {
            if (!field) {
                reject("Could not find firebase_token property field");
            }
			return UserPropertyValue.where("property_field_id", "=", field.id).where("value", "=", token).destroy();
        }).then(()=>{
			resolve();
		}).catch((error)=>{
			log.warn(error);
			resolve();
		})
   })
}
module.exports.removeFirebaseTokensByValue = removeFirebaseTokensByValue;

function removeFirebaseTokensByUserID(user_id) {
    return new Promise((resolve, reject) => {
        UserPropertyField.where("name", "=", "firebase_token").fetch().then((field) => {
            if (!field) {
                reject("Could not find firebase_token property field");
			}
			return UserPropertyValue.where("property_field_id", "=", field.id).where("user_id", "=", user_id).destroy();
        }).then(()=>{
			resolve();
		}).catch((error)=>{
			log.warn(error);
			resolve();
		})
   })
}
module.exports.removeFirebaseTokensByUserID = removeFirebaseTokensByUserID;
