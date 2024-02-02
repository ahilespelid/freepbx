const AccessProfile = require('../../models/AccessProfile.js');
const config = require('config');
const log = require('../../lib/log');

const DeviceAPI = require('./device-api.js');
const LocationAPI = require('./location-api.js');
const ZoneAPI = require('./zone-api.js');
const SceneAPI = require('./scene-api.js');
const GroupAPI = require('./group-api.js');
const Group = require('../../models/Group.js');
const ObjectProperty = require('../../models/ObjectProperty.js');
const PropertyApi = require('./user-property-api.js');
const CommonAPI = require('./common-api.js');

const SCOPE_TO_CLASS_MAP = {'location': LocationAPI, 'zone': ZoneAPI, 'scene': SceneAPI, 'group': GroupAPI};

const crypto = require('crypto');
const iv = Buffer.from([]);

const APP_KEY = global.process.env.APP_KEY;
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


function getAll(filter_name = null, filter_values = null) {
	return new Promise((resolve,reject)=>{
		var qb = AccessProfile;
		if (filter_name !== null && filter_values !== null) {
			qb = qb.where(filter_name, 'in', filter_values);
		}
		qb.where('status', '!=', 'deleted').fetchAll().then((profiles)=>{
			var _profiles = profiles? profiles.toJSON() : [];
			_profiles.forEach((profile)=>{
				profile.details = profile.details ? JSON.parse(profile.details) : {};
				profile.pincode = _decrypt(profile.pincode);
			})
			resolve(_profiles);
		}).catch((error)=>{
			log.warn(error);
			resolve([]);
		})
	})
}


module.exports.getAll = (filter_name = null, filter_values = null) =>{
	return new Promise((resolve,reject)=>{
		getAll(filter_name, filter_values).then((profiles)=>{
			resolve(profiles);
		}).catch((error)=>{
			reject(error)
		})
	})
}

module.exports.createProfile = (data) =>{
	return new Promise((resolve,reject)=>{

		if (data.name == undefined) {
			return reject('Missing mandatory name field');
		}

		if (data.type == undefined) {
			return reject('Missing mandatory type field');
		}

		if (data.status == undefined) {
			return reject('Missing mandatory status field');
		}

		if (data.access_scope == undefined) {
			return reject('Missing mandatory access_scope field');
		}

		if (data.scope_object_uuid == undefined) {
			return reject('Missing mandatory scope_object_uuid field');
		}

		if (data.org_id == undefined) {
			return reject('Missing mandatory org_id field');
		}

		if (data.pincode == undefined) {
			return reject('Missing mandatory pincode field');
		}

		if (!data.start || data.start == "") {
			data.start = null;
			data.start_timestamp_utc = null;
		}

		if (!data.end || data.end == "") {
			data.end = null;
			data.end_timestamp_utc = null;
		}

		if(data.details && typeof data.details !== 'string') {
			data.details = JSON.stringify(data.details);
		}

		AccessProfile.where('pincode', '=', _encrypt(data.pincode.toString())).where('status', 'in', ['active', 'running', 'disabled']).fetch().then((profile) => {
			if (!profile || data.type == 'usertimed') {
				data.pincode = _encrypt(data.pincode.toString());
				var prof = new AccessProfile(data);
				var result = undefined;
				prof.save().then((_prof) => {
					result = _prof.toJSON();
					const APIClass = SCOPE_TO_CLASS_MAP[_prof.get('access_scope')];
					return APIClass.applyProperty({
						property_name: _prof.get('name'), property_type: 'access-profile', property_id: _prof.get('id'), org_id: _prof.get('org_id'),
						object_uuid: _prof.get('scope_object_uuid'), object_type: _prof.get('access_scope'), property_value: _prof.get('pincode')
					});
				}).then(() => {
					resolve(result);
				}).catch((error) => {
					reject(error)
				})
			}
			else{
				reject("The Pin Code already exists")
			}
		}).catch((error)=>{
			CommonAPI.formatErrors(error,"Access Profile", data.name).then((err_msg) => {
				reject(err_msg);
			}).catch((err) => {
				reject(err);
			})
		})
	})
}

function updateProfileImpl(prof, data) {
	return new Promise((resolve,reject)=>{
		var result = undefined;
		var _prof = undefined;
		var isRunning = false;
		var func = undefined;
		if (!prof) {
			return reject('Invalid profile')
		}

		AccessProfile.where('pincode', '=', _encrypt(data.pincode.toString())).where('status', 'in', ['active', 'running', 'disabled']).fetch().then((profile) => {
			if (!profile || profile.id == data.id || prof.get("type") == 'usertimed') {
				if (prof.get('status') == 'running') {
					// we cannot update a running profile
					log.debug('Running profile ' + prof.get('name') + '. Updating only status to ' + data.status);
					isRunning = true;
					data = { status: data.status };
				}

				_prof = prof;
				var details = _prof.get('details') ? JSON.parse(_prof.get('details')) : {};
				if (data.status != 'disabled' && _prof.get('status') == 'disabled' && details.pincodesCleared) {
					// disabled profile going to active state, let's make sure we remove the pin codes clear flag
					details.pincodesCleared = false;
					_prof.set('details', JSON.stringify(details));
				} else if (_prof.get("type") == 'usertimed' && data.status == 'disabled') {
					// user timed profile going to disabled state, let's make sure we update the access property values
					details.pincodesCleared = false;
					_prof.set('details', JSON.stringify(details));
				}


				if (data.scope_object_uuid && prof.get('scope_object_uuid') != data.scope_object_uuid) {
					const APIClass = SCOPE_TO_CLASS_MAP[prof.get('access_scope')];
					func = APIClass.clearProperty(prof.get('name'), 'access-profile', prof.get('scope_object_uuid'));
				} else {
					func = Promise.resolve();
				}

				func.then(() => {
					Object.keys(data).forEach(function (key) {
						if (key == 'details') {
							let details = _prof.get('details') ? JSON.parse(_prof.get('details')) : {};
							Object.keys(data.details).forEach(function (skey) {
								details[skey] = data.details[skey]
							})
							_prof.set(key, JSON.stringify(details))
						} else if (key == 'pincode') {
							_prof.set(key, _encrypt(data[key].toString()));
						} else if (!["id"].includes(key)) {
							_prof.set(key, data[key]);
						}
					});

					if (!data.start && !isRunning) {
						_prof.set('start', null);
						_prof.set('start_timestamp_utc', null);
					}

					if (!data.end && !isRunning) {
						_prof.set('end', null);
						_prof.set('end_timestamp_utc', null);
					}
					return _prof.save();
				}).then((_prf) => {
					result = _prf.toJSON();
					const APIClass = SCOPE_TO_CLASS_MAP[_prof.get('access_scope')];
					return APIClass.applyProperty({
						property_name: _prf.get('name'), property_type: 'access-profile', property_id: _prof.get('id'), org_id: _prf.get('org_id'),
						object_uuid: _prf.get('scope_object_uuid'), object_type: _prf.get('access_scope'), property_value: _prf.get('pincode')
					});
				}).then(() => {
					resolve(result);
				}).catch((error) => {
					reject(error)
				})
			} else {
				reject("The Pin Code already exists")
			}
		}).catch((error) => {
			reject(error)
		})
	})
}

module.exports.updateProfile = (id, data) =>{
	return new Promise((resolve,reject)=>{
		AccessProfile.where('id', '=', id).fetch().then((prof)=>{
			if (!prof) {
				return reject('Unknown profile with id ' + id);
			}
			PropertyApi.removeObjectAccessByValue(id).catch((error)=>{log.warn(error)});
			return updateProfileImpl(prof, data)
		}).then((result)=>{
			resolve(result);
		}).catch((error)=>{
			reject(error)
		})
	})
}


module.exports.disableProfile = (name) =>{
	return new Promise((resolve,reject)=>{

		AccessProfile.where('name', '=', name).fetch().then((prof)=>{
			if (!prof) {
				log.warn('Unknown profile with name ' + name);
				return resolve();
			}
			return updateProfileImpl(prof, {status: 'disabled', start: prof.get('start'), pincode : Number(_decrypt(prof.get('pincode'))),
				start_timestamp_utc: prof.get('start_timestamp_utc'), 
				end: prof.get('end'), end_timestamp_utc: prof.get('end_timestamp_utc')})
		}).then((result)=>{
			resolve(result);
		}).catch((error)=>{
			log.warn(error);
			resolve();
		})
	})
}

function removeProfileImpl(prof) {
	return new Promise((resolve,reject)=>{

		if (prof.get('status') != 'deleted') {
			return reject('Cannot remove profile ' + prof.get('name') +' with status ' + prof.get('status'));
		}

		const APIClass = SCOPE_TO_CLASS_MAP[prof.get('access_scope')];
		APIClass.clearProperty(prof.get('name'), 'access-profile', prof.get('scope_object_uuid')).then(()=>{
			return prof.destroy();
		}, (error)=>{
			log.warn(error);
			return prof.destroy();
		}).then(()=>{
			resolve(prof);
		}).catch((error)=>{
			log.warn(error);
			resolve(prof);
		})
	})
}

module.exports.removeProfileImpl = removeProfileImpl;

module.exports.removeProfile = (id) =>{
	return new Promise((resolve,reject)=>{
		AccessProfile.where('id', '=', id).fetch().then((prof)=>{
			if (!prof) {
				return resolve();
			}
			prof.set('status', 'deleted');

			PropertyApi.removeObjectAccessByValue(prof.get("id")).catch((error)=>{log.warn(error)})

			return prof.save();
		}).then((_prof)=>{
			resolve(_prof)
		}).catch((error)=>{
			reject(error)
		})
	})
}

function getProfileLocks(profile) {
	return new Promise((resolve,reject)=>{
		ObjectProperty.where('property_type', '=', 'access-profile')
		.where('property_name', '=', profile.get('name'))
		.where('object_type', '=', 'group').fetchAll({columns: ['object_uuid']}).then((props)=>{
			var uuids = Array.from(props.toJSON(), x => x.object_uuid);
			return Group.where('uuid', 'IN', uuids).where('type', '=', "Outside Door").fetchAll({ withRelated: ['devices'] });
		}).then((groups)=>{
			var _groups = groups.toJSON();
			var devices = [];
			 _groups.forEach((group)=>{
			 	if (group.devices) {
			 		devices = devices.concat(group.devices);
			 		devices = devices.filter(x => x.type == 'door-lock');
			 	}
			})
			resolve(devices)
		}).catch((error)=>{
			reject(error)
		})
	})
}
function getProfileGroups(profile) {
	return new Promise((resolve,reject)=>{
		ObjectProperty.where('property_type', '=', 'access-profile')
		.where('property_name', '=', profile.get('name'))
		.where('object_type', '=', 'group').fetchAll({columns: ['object_type', 'object_uuid']}).then((props)=>{
			resolve(props.toJSON());
		//	return Group.where('uuid', 'IN', uuids).where('type', 'IN', ["Outside Door", "Inside Door"]).fetchAll({withRelated: ['devices']})
		}).catch((error)=>{
			reject(error)
		})
	})
}


function applyTimedAccessProfile(dispatcher, profile, details, allow) {

	return new Promise((resolve, reject)=>{
		
		if (profile.get('status')=="deleted") {
			return resolve();
		}
		var accessValues = [];
		let usergroups = details.usergroups? details.usergroups:[];
		if (!usergroups || usergroups.length <= 0) {
			log.debug("No user groups configured for user timed profile " + profile.get('name'))
			return resolve();
		}

		let iot_permission_groups = dispatcher._backend_server._iot_permission_groups;
		let affected_groups = iot_permission_groups.filter(x => usergroups.includes(x.id) || usergroups.includes(x.id.toString()));
		let userlist = []
		affected_groups.forEach((group)=>{
			userlist.push(...group.users);
		})

		userlist.forEach((user)=>{
			accessValues.push({user_id: user, value: profile.get('id')})
		})

		getProfileGroups(profile).then((groups) => {
			var q = require('q');
			var chain = q.when();
			groups.forEach((group)=>{
				chain = chain.then(()=> {
					return PropertyApi.setUsersAccess(profile.get("org_id"), accessValues, group.object_uuid, group.object_type,  allow)
				}, (error) =>{
					log.warn(error)
					return Promise.resolve()
				})
			})

			chain.then(()=>{
				resolve()
			}, (error) =>{
				resolve()
			})
		}).catch((error)=>{
			log.warn(error);
			resolve()
		})

	})
}


module.exports.runProfile = (profile, dispatcher) =>{
	return new Promise((resolve,reject)=>{
		if (!dispatcher) {
			return reject('dispatcher not provided');
		}
		var details = profile.get('details') ? JSON.parse(profile.get('details')) : {};
		if (details.pincodesCleared) {
			details.pincodesCleared = false;
			profile.set('details', JSON.stringify(details));
		}
		
		var profile_type = profile.get('type');
		if (!profile_type) {
			return reject('Undefined profile type');
		}
		if (profile_type == "usertimed") {

			applyTimedAccessProfile(dispatcher, profile, details, true).then(()=>{
				profile.set('status', 'running');
				return profile.save();
			}, (error)=>{
				log.warn(error)
				profile.set('status', 'running');
				return profile.save();
			}).then((_prof)=>{
				resolve(_prof);
			}).catch((error)=>{
				log.warn(error);
				resolve(profile);
			})

		} else {
			getProfileLocks(profile).then((locks)=>{
				return dispatcher.setLocksPin(locks, _decrypt(profile.get('pincode')).match(/\d/g).join(""), profile.get('id'));
			}).then(()=>{
				profile.set('status', 'running');
				return profile.save();
			}).then((_prof)=>{
				resolve(_prof);
			}).catch((error)=>{
				log.warn(error);
				resolve(profile);
			});
		}
	})
}

function stopProfileImpl(details, profile) {
	details.pincodesCleared = true;
	profile.set('details', JSON.stringify(details));
	if (profile.get('status') == 'deleted') {
		return removeProfileImpl(profile) 
	} else {
		if (profile.get('status') == 'running') {
			profile.set('status', 'expired');
		} else if (profile.get('status') == 'expired') {
			profile.set('status', 'expired');
		} else {
			profile.set('status', 'disabled');
		}
		return profile.save();
	}
}

module.exports.onProfileStatusChange = (profile, dispatcher, scheduleType) =>{
	return new Promise((resolve,reject)=>{
		var self = this;
		if (!dispatcher) {
			return resolve();
		}
		var details = profile.get('details') ? JSON.parse(profile.get('details')) : {};
		var func = undefined;
		if (profile.get('type') == "usertimed" && scheduleType == 'start') {
			let allow =  profile.get('status') == 'active' ? false : true;
			func = applyTimedAccessProfile(dispatcher, profile, details, allow)
		} else {
			func = Promise.resolve()
		}
		func.then(()=>{
			resolve()
		}).catch((error)=>{
			log.warn(error);
			resolve();
		})
	})
}

module.exports.stopProfile = (profile, dispatcher) =>{
	return new Promise((resolve,reject)=>{
		var self = this;
		if (!dispatcher) {
			return reject('dispatcher not provided');
		}
		var details = profile.get('details') ? JSON.parse(profile.get('details')) : {};
		if (profile.get('status') == 'disabled' && details.pincodesCleared) {
			// profile already is disabled state and pincodes already cleared for it
			return resolve(profile);
		}
		
		var profile_type = profile.get('type');
		var current_profile_status = profile.get("status");
		if (!profile_type) {
			return reject('Undefined profile type');
		}
		if (profile_type == "usertimed") {
			var allow = true;
			if (current_profile_status == 'running' && profile.get('start') && (profile.get('start').includes('Every') || profile.get('start').includes('['))) {
				allow = false;
			}
			applyTimedAccessProfile(dispatcher, profile, details, allow).then(()=>{
				return stopProfileImpl(details, profile)
			}, (error)=>{
				log.warn(error)
				return stopProfileImpl(details, profile)
			}).then((_prof)=>{
				resolve(_prof);
			}).catch((error)=>{
				log.warn(error);
				resolve(profile);
			})
		} else {
			getProfileLocks(profile).then((locks)=>{
				return dispatcher.clearLocksPin(locks, Number(_decrypt(profile.get('pincode'))), profile.get('id'));
			}).then(()=>{
				return stopProfileImpl(details, profile)
			}).then((_prof)=>{
				resolve(_prof);
			}).catch((error)=>{
				log.warn(error);
				resolve(profile);
			});
		}
	})
}

module.exports.updateApStatusOnPropertyChange = () =>{
	return new Promise((resolve,reject)=>{
		AccessProfile.where('status', '!=', 'deleted').fetchAll({ withRelated: ['objectProperties',{ objectProperties: function(query) { query.where('property_type','=','access-profile'); }}] }).then((profiles) => {
			var _profiles = profiles ? profiles.toJSON() : [];
			var q = require('q');
			var chain = q.when();
			_profiles.forEach((profile) => {
				chain = chain.then(() => {
					if (!profile.objectProperties || profile.objectProperties.length == 0) {
						return this.disableProfile(profile.name);
					} else {
						return Promise.resolve();
					}
				}, (error) =>{
					log.warn(error)
					return Promise.resolve()
				})

			});
			chain.then(()=>{
				resolve()
			}, (error) =>{
				log.warn("Error while updating AccessProfile status with respect to object properties", error);
				resolve()
			})
		}).catch((error) => {
			log.warn(error);
			resolve([]);
		});
	})
}