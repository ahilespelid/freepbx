const log = require('../../lib/log');
const AutomatedAction = require('../../models/AutomatedAction');

const DeviceAPI = require('./device-api.js');
const LocationAPI = require('./location-api.js');
const ZoneAPI = require('./zone-api.js');
const SceneAPI = require('./scene-api.js');
const GroupAPI = require('./group-api.js');
const Group = require('../../models/Group.js');
const ObjectProperty = require('../../models/ObjectProperty.js');
const PropertyApi = require('./user-property-api.js');
const uuid = require('uuid');
const SCOPE_TO_CLASS_MAP = {'location': LocationAPI, 'zone': ZoneAPI, 'scene': SceneAPI, 'group': GroupAPI};
const CommonAPI = require('./common-api.js');

function getAll(filter_name = null, filter_values = null) {
	return new Promise((resolve,reject)=>{
		var qb = AutomatedAction;
		if (filter_name !== null && filter_values !== null) {
			qb = qb.where(filter_name, 'in', filter_values);
		}
        qb.where('status', '!=', 'deleted').fetchAll().then((auto_actions) => {
            var _auto_actions = auto_actions ? auto_actions.toJSON() : [];
			resolve(_auto_actions);
        }).catch((error) => {
			log.warn(error);
			resolve([]);
		})
	})
}


module.exports.getAll = (filter_name = null, filter_values = null) =>{
	return new Promise((resolve,reject)=>{
		getAll(filter_name, filter_values).then((auto_actions)=>{
			resolve(auto_actions);
		}).catch((error)=>{
			reject(error)
		})
	})
}

module.exports.createAutomatedAction = (data) =>{
	return new Promise((resolve,reject)=>{
		if (data.name == undefined) {
			return reject('Missing mandatory name field');
		}
		if (data.type == undefined) {
			return reject('Missing mandatory type field');
		}
		if (data.desired_state == undefined) {
			return reject('Missing mandatory desired state field');
		}
		if (data.access_scope == undefined) {
			return reject('Missing mandatory access_scope field');
		}
		if (data.org_id == undefined) {
			return reject('Missing mandatory org_id field');
		}
		if(data.details && typeof data.details !== 'string') {
			data.details = JSON.stringify(data.details);
		}
		if (!data.end_timestamp_utc || data.end_timestamp_utc == "") {
			data.end_timestamp_utc = null;
		}

		var automated_action = new AutomatedAction(data);
		var result = undefined;
		automated_action.save().then((_automated_action)=>{
			result = _automated_action.toJSON();
			const APIClass = SCOPE_TO_CLASS_MAP[_automated_action.get('access_scope')];
			return APIClass.applyProperty({property_name: _automated_action.get('name'), property_type: 'automated-action', property_id: _automated_action.get('id'), org_id:_automated_action.get('org_id'), 
				object_uuid: _automated_action.get('scope_object_uuid'), object_type: _automated_action.get('access_scope'), property_value: _automated_action.get('desired_state')});
		}).then(()=>{
			resolve(result);
		}).catch((error)=>{
			CommonAPI.formatErrors(error,"Automated Action", data.name).then((err_msg) => {
				reject(err_msg);
			}).catch((err) => {
				reject(err);
			})
		})
	})
}

function updateAutomatedActionImpl(automated_action, data) {
	return new Promise((resolve,reject)=>{
		var result = undefined;
		var _automated_action = undefined;
		var isRunning = false;
		var func = undefined;
		if (!automated_action) {
			return reject('Invalid Automated Action')
		}
		if (automated_action.get('status') == 'running') {
			// we cannot update a running automated action
			log.debug('Running automated action ' + automated_action.get('name') + '. Updating only status to ' + data.status );
			isRunning = true;
			data = {status: data.status};
		}
		_automated_action = automated_action;
		var details = _automated_action.get('details') ? JSON.parse(_automated_action.get('details')) : {};
		_automated_action.set('details', JSON.stringify(details));

		if (data.scope_object_uuid && automated_action.get('scope_object_uuid') != data.scope_object_uuid) {
			const APIClass = SCOPE_TO_CLASS_MAP[automated_action.get('access_scope')];
			func = APIClass.clearProperty(automated_action.get('name'), 'automated-action', automated_action.get('scope_object_uuid'));
		} else {
			func = Promise.resolve();
		}

		func.then(()=>{
			Object.keys(data).forEach(function(key) {
				if (key == 'details') {
					let details = _automated_action.get('details') ? JSON.parse(_automated_action.get('details')) : {};
					Object.keys(data.details).forEach(function(skey) {
						details[skey] = data.details[skey]
					})
					_automated_action.set(key, JSON.stringify(details))
				} else if (!["id"].includes(key)) {
					_automated_action.set(key, data[key]);
				}
			});

			if (!data.start && !isRunning) {
				_automated_action.set('start', null);
				_automated_action.set('start_timestamp_utc', null);
			}

			if (!data.end && !isRunning) {
				_automated_action.set('end', null);
				_automated_action.set('end_timestamp_utc', null);
			}
			return _automated_action.save();
		}).then((_auto_action)=>{
			result = _auto_action.toJSON();
			const APIClass = SCOPE_TO_CLASS_MAP[_auto_action.get('access_scope')];
			return APIClass.applyProperty({property_name: _auto_action.get('name'), property_type: 'automated-action', property_id: _auto_action.get('id'), org_id:_auto_action.get('org_id'), 
			object_uuid: _auto_action.get('scope_object_uuid'), object_type: _auto_action.get('access_scope'), property_value: _auto_action.get('desired_state')});
		}).then(()=>{
			resolve(result);
		}).catch((error)=>{
			reject(error)
		})
	})
}

module.exports.updateAutomatedAction = (id, data) =>{
	return new Promise((resolve,reject)=>{
		AutomatedAction.where('id', '=', id).fetch().then((automated_action)=>{
			if (!automated_action) {
				return reject('Unknown profile with id ' + id);
			}
			return updateAutomatedActionImpl(automated_action, data)
		}).then((result)=>{
			resolve(result);
		}).catch((error)=>{
			reject(error)
		})
	})
}


module.exports.removeAutomatedAction = (id) =>{
	return new Promise((resolve,reject)=>{
		AutomatedAction.where('id', '=', id).fetch().then((automated_action)=>{
			if (!automated_action) {
				return resolve();
			}
			automated_action.set('deletedAt', Date.now().toString());
			automated_action.set('status', 'deleted');
			return automated_action.save();
		}).then((_automated_action)=>{
			log.debug("successfully marked the automation status as deleted :");
			resolve(_automated_action)
		}).catch((error)=>{
			log.debug("unable to delete automated action:",error);
			reject(error)
		})
	})
}
function getAutomatedActionGroups(automated_action) {
	return new Promise((resolve,reject)=>{
		ObjectProperty.where('property_type', '=', 'automated-action')
		.where('property_name', '=', automated_action.get('name'))
		.where('object_type', '=', 'group').fetchAll({columns: ['object_type', 'object_uuid']}).then((props)=>{
			resolve(props.toJSON());
		}).catch((error)=>{
			reject(error)
		})
	})
}
module.exports.applyAutomatedAction = (dispatcher, automated_action, _autoaction_state) => {

	return new Promise((resolve, reject)=>{
		
		var accessValues = {user_id: '0', value: automated_action.get('id')};
		var action;
		var desired_state = automated_action.get('desired_state');
		var reset_door_state = false;
		var start_action = false;

		if (["disabled","deleted"].includes(_autoaction_state))	reset_door_state = true;
		if (["start"].includes(_autoaction_state)) start_action = true;
		
		if (desired_state == "Locked"){
			action = start_action ? "Lock" : "Unlock";
		} else{
			action = start_action ? "Unlock" : "Lock";
		}

		getAutomatedActionGroups(automated_action).then((groups) => {
			var q = require('q');
			var chain = q.when();

			var params = {
				'iot-manager': dispatcher.getIoTManager(), 'event-dispatcher': dispatcher,
				'timestamp': Date.now(), 'action-id': uuid.v4(), 'user-id': 'automated-action- ' + automated_action.get('id'),
				'user-name': 'automated-action-'+automated_action.get('name'), 'session': null, 'org-id' : automated_action.get('org_id'), 'trigger-type' : 'automated-action'
			};

			groups.forEach((group)=>{
				chain = chain.then(()=> {
					if (reset_door_state) {
						return GroupAPI.getGroup([group.object_uuid],null).then((group) => {
							var _group =  group.pop();
							if (_group.details && (_group.details.mustBeSecured === true)) {
								action = "Lock";
							} else {
								action = null;
							}
							return Promise.resolve();
						})
					} else {
						return Promise.resolve();
					}
				}).then(() => {
					if (action !==null && action == "Lock") {
						DeviceAPI.getDeviceOnGroupByType(group.object_uuid,'contact').then((window_sensor) => {
							if(["Opened"].includes(window_sensor.status)){
								log.debug("The door in the group with group id-"+group.object_uuid+ ' is detected as Opened from '+window_sensor.name +'. Marking this automated Lock action as pending ');
								PropertyApi.setAutomatedPendingAction(automated_action.get("org_id"), accessValues, group.object_uuid, group.object_type, action).then(()=>{
									dispatcher.sendPendingAutomatedActionAlert(automated_action.get('name'),group.object_uuid,automated_action.get("org_id"),action);		
								});
							} else {
								GroupAPI.doAction(group.object_uuid, action, params, null, null).then(() => {
									log.debug('The action "'+ action+'" triggered in group ' + group.object_uuid +' by Automated Action - ' + automated_action.get('name'));
								}, (error) => {
									log.error(error);
								});
							}
						})
					} else if (action !== null) {
						GroupAPI.doAction(group.object_uuid, action, params, null, null).then(() => {
							log.debug('The action "'+ action+'" triggered in group ' + group.object_uuid +' by Automated Action - ' + automated_action.get('name'));
						}, (error) => {
							log.error(error);
						});
					}
					if (!["deleted"].includes(_autoaction_state)) return PropertyApi.setAutomatedAction(automated_action.get("org_id"), accessValues, group.object_uuid, group.object_type,  start_action);
					else return Promise.resolve(); 
				}).catch((error) =>{
					log.warn(error)
					return Promise.resolve()
				});
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

module.exports.removeAutomatedActionProperties = (automated_action,dispatcher) => {

	return new Promise((resolve,reject) => {
		if (!dispatcher) {
			return reject('dispatcher not provided');
		}
		var accessValues = {user_id: '0', value: automated_action.get('id')};
		getAutomatedActionGroups(automated_action).then((groups) => {
			var q = require('q');
			var chain = q.when();
			groups.forEach((group)=>{
				chain = chain.then(()=> {
					return PropertyApi.setAutomatedAction(automated_action.get("org_id"), accessValues, group.object_uuid, group.object_type, false)
				}).then(()=>{
					return PropertyApi.removePendingAction(automated_action.get("org_id"),group.object_uuid);
				});
			});
		}).then(()=>{
			if (automated_action.get('status') == 'deleted') {
				return this.removeAutomatedActionImpl(automated_action);	
			} else {
				return;
			}
		}).then(() => {
			resolve();
		}).catch((err) =>{
			log.error(err);
			resolve()
		});
		
	});
}
module.exports.runAutomatedAction = (automated_action, dispatcher) =>{
	return new Promise((resolve,reject)=>{
		if (!dispatcher) {
			return reject('dispatcher not provided');
		}

		this.applyAutomatedAction(dispatcher, automated_action, "start").then(()=>{
			automated_action.set('status', 'running');
			return automated_action.save();
		}, (error)=>{
			log.warn(error)
			automated_action.set('status', 'running');
			return automated_action.save();
		}).then((_automated_action)=>{
			resolve(_automated_action);
		}).catch((error)=>{
			log.warn(error);
			resolve(automated_action);
		})
	})
}

function stopAutomatedActionImpl(automated_action) {
	if (automated_action.get('status') == 'deleted') {
		return removeAutomatedActionImpl(automated_action) 
	} else {
		if (automated_action.get('status') == 'running') {
			automated_action.set('status', 'expired');
		} else if (automated_action.get('status') == 'expired') {
			automated_action.set('status', 'expired');
		} else {
			automated_action.set('status', 'disabled');
		}
		return automated_action.save();
	}
}

module.exports.stopAutomatedAction = (automated_action, dispatcher) =>{
	return new Promise((resolve,reject)=>{
		if (!dispatcher) {
			return reject('dispatcher not provided');
		}
		this.applyAutomatedAction(dispatcher, automated_action, "stop").then(()=>{
			return stopAutomatedActionImpl(automated_action)
		}, (error)=>{
			log.warn(error)
			return stopAutomatedActionImpl(automated_action)
		}).then((_prof)=>{
			resolve(_prof);
		}).catch((error)=>{
			log.warn(error);
			resolve(automated_action);
		})

	})
}

function removeAutomatedActionImpl(automated_action) {
	return new Promise((resolve,reject)=>{

		if (automated_action.get('status') != 'deleted') {
			return reject('Cannot remove automated_action ' + automated_action.get('name') +' with status ' + automated_action.get('status'));
		}

		const APIClass = SCOPE_TO_CLASS_MAP[automated_action.get('access_scope')];
		APIClass.clearProperty(automated_action.get('name'), 'automated-action', automated_action.get('scope_object_uuid')).then(()=>{
			return automated_action.destroy();
		}, (error)=>{
			log.warn(error);
			return automated_action.destroy();
		}).then(()=>{
			resolve(automated_action);
		}).catch((error)=>{
			log.warn(error);
			resolve(automated_action);
		})
	})
}

module.exports.removeAutomatedActionImpl = removeAutomatedActionImpl;

module.exports.checkGroupActionOverrides = (group_uuid, user) => {
	return new Promise ((resolve, reject) => {
		PropertyApi.getObjectAutomatedActionsByObjectId(group_uuid).then((props) => {
			var q = require('q');
			var chain = q.when();
			let errors = [];
			if(props){
				props.forEach((prop)=>{
					if (prop && prop.value && prop.details) {
						chain = ((prop) => chain.then(()=> {
							return AutomatedAction.where('id', '=', prop.value).fetch();
						}).then((automatedActions)=>{
							if (automatedActions) {
								var msg = "Action is blocked due to an active automation - "+automatedActions.get('name')+'.\n';
								let details = JSON.parse(automatedActions.get("details"));
								switch(user){
									case 'admin': if ( details.admin_override && details.admin_override != "true" ) errors.push(msg+"Admin Override is disabled.");
										break;
									case 'user' : if ( details.user_override && details.user_override != "true" ) errors.push(msg + "User Override is disabled.");
										break;
									case 'guest': if ( details.guest_override && details.guest_override != "true" ) errors.push(msg+"Guest Override is disabled.");
										break;
								}
							}
							return;
						}))(prop);
					}
				});
				chain.then(() =>{
					if(errors && errors.length > 0){
						reject(errors[0]);
					}else{
						resolve();
					}
				}).catch((err) =>{
					reject(err);
				});
			} else {
				resolve();
			}
		});
	});
}
module.exports.updateAutomatedActionStatusOnPropertyChange = () =>{
	return new Promise((resolve,reject)=>{
		AutomatedAction.where('status', '!=', 'deleted').fetchAll({ withRelated: ['objectProperties',{ objectProperties: function(query) { query.where('property_type','=','automated-action'); }}] }).then((automated_actions) => {
			var _automated_actions = automated_actions ? automated_actions.toJSON() : [];
			var q = require('q');
			var chain = q.when();
			_automated_actions.forEach((automated_action) => {
				chain = chain.then(() => {
					if (!automated_action.objectProperties || automated_action.objectProperties.length == 0) {
						return this.disableAutomatedAction(automated_action.id);
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
				log.warn("Error while updating Automated action status with respect to object properties", error);
				resolve()
			})
		}).catch((error) => {
			log.warn(error);
			resolve([]);
		});
	})
}
module.exports.disableAutomatedAction = (id) =>{
	return new Promise((resolve,reject)=>{

		AutomatedAction.where('id', '=', id).fetch().then((automated_action)=>{
			if (!automated_action) {
				log.warn('Unknown Automated Action with id ' + id);
				return resolve();
			}
			return updateAutomatedActionImpl(automated_action, {status: 'disabled', start: automated_action.get('start'),
				start_timestamp_utc: automated_action.get('start_timestamp_utc'), 
				end: automated_action.get('end'), end_timestamp_utc: automated_action.get('end_timestamp_utc')})
		}).then((result)=>{
			resolve(result);
		}).catch((error)=>{
			log.warn(error);
			resolve();
		})
	})
}