const log = require('../../log');
const Notification = require('../../../models/Notification');
const LocationPermission = require('../../../models/LocationPermission');
const ZonePermission = require('../../../models/ZonePermission');
const ScenePermission = require('../../../models/ScenePermission');
const GroupPermission = require('../../../models/GroupPermission');
const EventHistory = require('../../../models/EventHistory');
const util = require("util");
const uuid = require('uuid');
const config = require('config');
const { EventEmitter } = require('events');
const permissionClassMapping = {"location": LocationPermission, "zone": ZonePermission, "scene": ScenePermission, "group": GroupPermission};

function NotificationManager(dispatcher) {
	this._dispatcher = dispatcher;
}

util.inherits(NotificationManager, EventEmitter);

NotificationManager.prototype.handleStatusChangeEvent = function(evt) {
	var self = this;
	var event = undefined;
	if (evt.isNew) {
		event = {type: "new-notification", uuid:evt.obj.uuid, data: evt.obj, topic: 'notifications:new-notification', event_type: evt.type};
	} else {
		event = {type: "update", data: evt.obj, topic: 'notifications:' + evt.obj.uuid, event_type: evt.type};
	}

	self._dispatcher._dispatch(event.topic, event);
	
	if (evt.obj.email_status_change) {
		self.sendBackendNotification(null, evt.obj)
	}
	if (["opened", "unknown"].includes(evt.obj.status))
		self.sendPushNotifications(evt.obj)
			.catch(err => {
				log.error("NotificationManager:handleStatusChangeEvent:>", err);
			});
	var details = evt.obj.details ? JSON.parse(evt.obj.details) : {};
	var user_id = null;
	var user_name = null;

	if (evt.obj.status == 'closed') {
		user_id = details.closed_user? details.closed_user : null;
		user_name = details.closed_username? details.closed_username : null;
	} else if (evt.obj.status == 'acked') {
		user_id = details.acked_user? details.acked_user : null;
		user_name = details.acked_username? details.acked_username : null;
	}

	var hist = new EventHistory({event_type: 'notification-status-change', event_value: evt.obj.status, 
		event_time: Date.now(), event_uuid: uuid.v4(), 
		event_object_uuid: evt.obj.uuid, event_object_type: 'notification', 
		event_object_name: evt.obj.uuid,
		user_id: user_id,
		user_name: user_name, 
		org_id: evt.obj.org_id,
		details: evt.obj.raw_data});
	hist.save()
}

NotificationManager.prototype.sendPushNotifications = function (notification) {
    return new Promise((resolve, reject) => {
        if (!this._dispatcher || !this._dispatcher._backend_api) {
            resolve(notification);
            return;
        }
        let data = notification.raw_data;
        if (!data) {
            resolve(notification);
            return;
        }
        this._dispatcher._backend_api.getUsersPermissions().then(response => {
            if (response.status && response.data != undefined) {
                let userInfo = response.data,
                userIds = [];
                for (let i = 0, length = userInfo.length; i < length; i++) {
					if (userInfo[i].is_admin == 1 || (userInfo[i].iot_permission_groups && userInfo[i].iot_permission_groups.some(x => notification.permission_groups.indexOf(x) !== -1) === true))
                    userIds.push(userInfo[i].user_id);
				}
                data = typeof data == "string"? JSON.parse(data) : data;
                this._dispatcher._backend_server.sendPushNotifications(userIds,{
                    title:data.name + " at "+data.location,
                    body:data.event_data
				})
				.then(result => {
					resolve(result)
				});
            }
        }).catch(err => {
            log.error("NotificationManager:sendPushNotifications:[ERROR]>", err);
            reject(err);
        })
   })
}

NotificationManager.prototype.sendBackendNotification = function(sender, notification) {

	return new Promise((resolve,reject)=>{
		var self = this;
		if (!self._dispatcher || !self._dispatcher._backend_api) {
			resolve(notification);
			return;
		}
		if (!sender) {
			sender = 'admin';
		}
		var data = notification.raw_data;
		if (!data) {
			resolve(notification);
			return;
		}
		data = JSON.parse(data);
		var details = notification.details ? JSON.parse(notification.details) : {};

		if (notification.status == 'closed') {
			data.notfication_type = 'check';
			data.event_data = data.event_data + ' - Notification Closed';
			if (details.closed_username) {
				data.event_data = data.event_data + ' by user ' + details.closed_username;
			}
		} else if (notification.status == 'acked') {
			data.notfication_type = 'default';
			data.event_data = data.event_data + ' - Notification Acked';
			if (details.acked_username) {
				data.event_data = data.event_data + ' by user ' + details.acked_username;
			}
		}

		if (!data.event_timestamp) {
			let date_ob = new Date();
			data.event_timestamp = date_ob.toString();
		}
		self._dispatcher._backend_api.sendNotificationEmail('all', sender, data).then(()=>{
			log.debug("Email sent for notification " + notification.uuid);
			resolve(notification)
		}).catch((error)=>{
			log.warn(error);
			resolve(notification)
		});
	})
}

NotificationManager.prototype.getNotifications = function(permission_groups) {
	return new Promise((resolve,reject)=>{
		var self = this;
		var res = [];
		Notification.where('status', 'in', ['opened', 'acked', 'unknown']).fetchAll().then((notifications)=>{
			notifications.forEach((notification)=>{
				if (permission_groups) {
					var notificationPerms = notification.get('permission_groups') ? notification.get('permission_groups') : [];
					notificationPerms = (typeof notificationPerms === 'string') ? JSON.parse(notificationPerms) : notificationPerms;
					if (permission_groups.some(x => notificationPerms.indexOf(x) !== -1) === true) {
						res.push(notification.toJSON())
					}
				} else {
					res.push(notification.toJSON())
				}
			})
			resolve(res)
		}).catch((error)=>{
			reject(error);
		});
	})
}

NotificationManager.prototype.notificationAction = function(notification_uuid, user, action) {
	return new Promise((resolve,reject)=>{
		var self = this;
		var res = [];
		if (!['ack', 'close', 'unack'].includes(action)) {
			reject('Unsupported notification action ' + action);
			return;
		}
		Notification.where('uuid', '=', notification_uuid).fetch().then((notification)=>{

			if (!notification) {
				reject('Unknown notification with uuuid ' + notification_uuid);
				return;
			}

			var notificationPerms = notification.get('permission_groups') ? notification.get('permission_groups') : [];
			notificationPerms = (typeof notificationPerms === 'string') ? JSON.parse(notificationPerms) : notificationPerms;

			if (user && !user.is_admin && user.iot_permission_groups.some(x => notificationPerms.indexOf(x) !== -1) === false) {
				reject('Action not allowed by user permission groups');
				return;
			}

			var details = notification.get('details');
			var status = undefined;
			details = details ? JSON.parse(details) : {};

			if (action == 'unack' && notification.get('status') == 'acked' && Number(details.acked_user) != Number(user.id)) {
				reject('Action prevented for user ' + user.id + '. Acked user ' + details.acked_user);
				return;
			}

			if (action == 'ack') {
				if (["acked", "unknown", "opened"].includes(notification.get('status'))){
					status = 'acked';
					details.acked_user = user.id;
					details.acked_username = user.username;
				} else {
					status = notification.get('status');
				}
			} else if (action == 'unack') {
				delete details.acked_user;
				delete details.acked_username;
				if (["acked", "unknown"].includes(notification.get('status'))){
					status = 'opened';
				} else {
					status = notification.get('status');
				}
			} else if (action == 'close') {
				status = 'closed';
				details.closed_username = user.username;
				details.closed_user = user.id;
			} else if (action == 'open') {
				status = 'opened';
			}
			notification.set('details', JSON.stringify(details));
			return self.updateNotification(notification, {status: status});
		}).then((_notification)=>{
			resolve(_notification.toJSON())
		}).catch((error)=>{
			reject(error);
		});
	})
}

NotificationManager.prototype.updatePermissions = function(data) {
	return new Promise((resolve,reject)=>{

		var permGroups = [];

		if (!data.obj_type || !data.obj_uuid) {
			resolve();
			return;
		}
		if (['gateway', 'device'].includes(data.obj_type)) {
			resolve();
			return;
		}
		var promises = [];
		var q = require('q');
		var permClass = permissionClassMapping[data.obj_type];
		promises.push(permClass.where(data.obj_type + '_uuid', '=', data.obj_uuid).where('permission_type_id', '=', 4).fetchAll({columns:['user_group_id']}));

		q.all(promises).then((results)=>{
			results.forEach((perms)=>{
				perms.forEach((perm)=>{
					permGroups.push(perm.get('user_group_id'));
				})
			})
			return Notification.where('obj_type', '=', data.obj_type).where('obj_uuid', '=', data.obj_uuid).where('status', 'in', ['opened', 'acked', 'unknown']).fetchAll();
		}).then((notifications)=>{
			promises = [];
			notifications.forEach((notification)=>{

				if (notification.get('email_status_change') === 1) {
					notification.set('email_status_change', true);
				} else if (notification.get('email_status_change') === 0) {
					notification.set('email_status_change', false);
				}
				notification.set('permission_groups', JSON.stringify(permGroups));
				promises.push(notification.save())
			})
			return q.all(promises)
		}).then(()=>{
			resolve();
		}).catch((error)=>{
			log.warn(error);
			resolve();
		});
	})
}



NotificationManager.prototype.createNotification = function(data) {
	return new Promise((resolve,reject)=>{
		var self = this;
		var permGroups = [];
		var promises = [];
		var q = require('q');

		if (!data.obj_type || !data.obj_uuid) {
			reject('Invalid object information')
			return;
		}

		if (!data.type) {
			reject('Invalid notification type')
			return;
		}

		if (!data.org_id) {
			reject('Invalid org_id')
			return;
		}


		if (!data.severity) {
			reject('Unknown notification severity')
			return;
		}

		if (!['gateway', 'device'].includes(data.obj_type)) {
			var permClass = permissionClassMapping[data.obj_type];
			promises.push(permClass.where(data.obj_type + '_uuid', '=', data.obj_uuid).where('permission_type_id', '=', 4).fetchAll({columns:['user_group_id']}));
		}

		q.all(promises).then((results)=>{
			results.forEach((perms)=>{
				perms.forEach((perm)=>{
					permGroups.push(perm.get('user_group_id'));
				})
			})
			var notificationData = {uuid: uuid.v1(), type: data.type, status: 'opened', severity: data.severity, obj_type: data.obj_type, obj_uuid: data.obj_uuid};
			notificationData.org_id = data.org_id;
			notificationData.permission_groups = JSON.stringify(permGroups);
			notificationData.text = data.text ? data.text : "";
			notificationData.raw_data = JSON.stringify(data.raw_data);
			notificationData.email_status_change = data.email_status_change;
			notificationData.details = JSON.stringify({});
			var notification = new Notification(notificationData);
			notification.on('notification:status:change', self.handleStatusChangeEvent.bind(self));
			return notification.save();
		}).then((notif)=>{
			resolve(notif);
		}).catch((error)=>{
			reject(error);
		})
	});
}

NotificationManager.prototype.updateNotification = function(notification, data) {
	return new Promise((resolve,reject)=>{
		var self = this;
		var now = new Date();
		notification.on('notification:status:change', self.handleStatusChangeEvent.bind(self));

		if (notification.get('email_status_change') === 1) {
			notification.set('email_status_change', true);
		} else if (notification.get('email_status_change') === 0) {
			notification.set('email_status_change', false);
		}
		if (data.status && (notification.get('status') !== 'acked' || data.status === 'closed')) {

			if (data.status === 'acked' && notification.get('status') !== data.status) {
				notification.set('ack_time', now.getTime())
			} else if (data.status === 'closed' && notification.get('status') !== data.status) {
				notification.set('close_time', now.getTime());
			}
			notification.set('status', data.status);
		} else if (data.status  === 'opened' && notification.get('status') === 'acked') {
			notification.set('ack_time', null)
			notification.set('status', data.status);
		}

		if (data.severity) {
			notification.set('severity', data.severity);
		}

		if (data.raw_data) {
			notification.set('raw_data', JSON.stringify(data.raw_data))
		}

		notification.save().then((_notification)=>{
			resolve(_notification);
		}).catch((error)=>{
			reject(error);
		})
	})
}


NotificationManager.prototype.triggerNotification = function(type, obj_type, obj_uuid, severity, status, raw_data, org_id, sendMail = false) {
	return new Promise((resolve,reject)=>{
		var self = this;
		Notification.where('obj_type', '=', obj_type).where('obj_uuid', '=', obj_uuid)
		.where('type', '=', type)
		.where('status', 'in', ['opened', 'acked', 'unknown']).fetch().then((notification)=>{
			var data = {type: type, obj_type: obj_type, obj_uuid: obj_uuid, status: status, raw_data: raw_data, org_id: org_id};
			if (severity) {
				data.severity = severity;
			}
			data.email_status_change = sendMail;
			if (notification) {
				// existing pending notification found
				return self.updateNotification(notification, data)
			} else if (['opened', 'unknown'].includes(status)) {
				return self.createNotification(data)
			} else {
				reject('Unknown notification details for ' + JSON.stringify(data));
			}
		}).then((_notification)=>{
			resolve();
		}).catch((error)=>{
			reject(error);
		})
	});
}

module.exports = NotificationManager
