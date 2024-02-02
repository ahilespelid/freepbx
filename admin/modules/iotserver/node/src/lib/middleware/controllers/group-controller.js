const GroupApi = require('../../../api/iot/group-api.js');
const PropertyApi = require('../../../api/iot/user-property-api.js');
const uuid = require('uuid');
const log = require('../../log');
const ejs = require('ejs');
const fs = require('fs');

const AccessProfileApi = require('../../../api/iot/access-profile-api.js');
const AutomatedActionApi = require('../../../api/iot/automated-action-api.js');

module.exports.init = async (app, router, iotManager) =>{
	const dispatcher = require('../../iot/event-dispatcher.js');
	const  zulu = app.get('zulu');
	const iot_backend_server = app.get('iot_backend_server');

	router.get('/groups',(req,res)=>{

		let session = zulu.getSession(req.query.sessionid);
		if (!session || !session.user) {
			let msg = "Invalid user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}
		var permission_groups = session.user.is_admin ? null : session.user.iot_permission_groups;
		if (permission_groups) {
			log.debug("Getting groups for user " + session.user.username + " with permission groups " + JSON.stringify(permission_groups));
		}


		GroupApi.getAll(permission_groups).then((groups)=>{
			res.send(groups);
		}).catch((error)=>{
			res.status(500).end('' + error);
		});
	});

	router.get('/groups/:uuid',(req,res)=>{

		let session = zulu.getSession(req.query.sessionid);
		if (!session || !session.user) {
			let msg = "Invalid user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}
		var permission_groups = session.user.is_admin ? null : session.user.iot_permission_groups;
		if (permission_groups) {
			
			log.debug("Getting group for user " + session.user.username + " with permission groups " + JSON.stringify(permission_groups));
		}


		GroupApi.getGroup(req.params.uuid, permission_groups).then((resp)=>{
			res.send(resp);
		}).catch((error)=>{
			res.status(500).end('' + error);
		});
	});

	router.get('/groups/permissions/info',(req,res)=>{

		var session = zulu.getSession(req.query.sessionid);
		var iotGroups = undefined;
		if (!session || !session.user) {
			let msg = "Invalid user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}
		if (!session.user.is_admin) {
			let msg = "Group permission info query not allowed to non admin user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}

		if (!req.body.scene_uuid) {
			let msg = "Scene uuid not provided ";
			log.warn(msg);
			res.status(500).end(msg);
			return;
		}

		iotGroups = iot_backend_server.permission_groups;
		GroupApi.getPermissionsInfo(req.body, iotGroups).then((result)=>{
			res.send(result);
		}).catch((error)=>{
			res.status(500).end('' + error);
		});
	});

	router.get('/groups/types/info',(req,res)=>{

		let session = zulu.getSession(req.query.sessionid);
		if (!session || !session.user) {
			let msg = "Invalid user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}
		if (!session.user.is_admin) {
			let msg = "Group types query not allowed to non admin user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}
		GroupApi.getTypes().then((types)=>{
			res.send(types);
		}).catch((error)=>{
			res.status(500).end('' + error);
		});
	});

	router.get('/groups/devices/mapping',(req,res)=>{
		let session = zulu.getSession(req.query.sessionid);
		if (!session || !session.user) {
			let msg = "Invalid user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}
		if (!session.user.is_admin) {
			let msg = "Group devices mapping query not allowed to non admin user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}
		res.send(GroupApi.getDeviceMapping());
	});

	router.post('/groups',(req,res)=>{

		let session = zulu.getSession(req.query.sessionid);
		if (!session || !session.user) {
			let msg = "Invalid user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}

		if (!session.user.is_admin) {
			let msg = "Group creation not allowed to non admin user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}

		var iotGroups = iot_backend_server.permission_groups;

		GroupApi.getCounts().then((counts)=>{
			const postBody = req.body;
			//log.debug("group Counts: " + JSON.stringify(counts));
			//log.debug("License: " + JSON.stringify(zulu.license));
			if (zulu.license && counts.total >= parseInt(zulu.license.group_limit)) {
				let msg = "Maximum number of allowed groups " + counts.total + " reached  ";
				log.warn(msg);
				res.status(400).end(msg);
			} else if (postBody.type == 'Outside Door' && zulu.license && counts[postBody.type] >= parseInt(zulu.license.door_limit)) {
				let msg = "Maximum number of allowed doors " + counts[postBody.type] + " reached  ";
				log.warn(msg);
				res.status(400).end(msg);
			} else {
				if (!postBody.name) {
					res.status(500).end("Mandatory name field not specified");
				} else {
					//log.debug("Processing group create msg " + JSON.stringify(postBody) + " using iot groups " + JSON.stringify(iotGroups));
					GroupApi.createGroup(postBody, iotGroups).then((resp)=>{
						res.send(resp);
					}).catch((error)=>{
						log.error(error);
						res.status(500).end('' + error);
					});
				}
			}
		}).catch((error)=>{
			log.error(error);
			res.status(500).end('' + error);
		});	
	});

	router.post('/groups/:uuid',(req,res)=>{

		var session = zulu.getSession(req.query.sessionid);
		if (!session || !session.user) {
			let msg = "Invalid user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}

		if (!session.user.is_admin) {
			let msg = "Grouo update not allowed to non admin user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}
		var iotGroups = iot_backend_server.permission_groups;
		GroupApi.updateGroup(req.params.uuid, req.body, iotGroups).then((resp)=>{
			res.send(resp);
		}).catch((error)=>{
			log.error(error);
			res.status(500).end('' + error);
		});
	});

	router.delete('/groups/:uuid',(req,res)=>{

		let session = zulu.getSession(req.query.sessionid);
		if (!session || !session.user) {
			let msg = "Invalid user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}

		if (!session.user.is_admin) {
			let msg = "Group deletion not allowed to non admin user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}


		GroupApi.deleteGroup(req.params.uuid).then((resp)=>{
			res.send(resp);
			AccessProfileApi.updateApStatusOnPropertyChange().then(() => {
				dispatcher.proxyAccessProfileCommand({ type: 'run-process' });
				return AutomatedActionApi.updateAutomatedActionStatusOnPropertyChange();
			}).then(() => {
				dispatcher.proxyAutomatedActionCommand({type: 'run-autoaction'});
			});
		}).catch((error)=>{
			log.error(error);
			res.status(500).end('' + error);
		});
	});


	router.post('/groups/:uuid/permissions',(req,res)=>{
		var session = zulu.getSession(req.query.sessionid);
		var iotGroups = undefined;
		if (!session || !session.user) {
			let msg = "Invalid user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}

		if (!session.user.is_admin) {
			let msg = "Scene permission binding not allowed to non admin user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}
		iotGroups = iot_backend_server.permission_groups;
		//log.debug("Processing group " + req.params.uuid + "permission add msg " + JSON.stringify(req.body) + " using iot groups " + JSON.stringify(iotGroups));
		GroupApi.addPermission(req.params.uuid, iotGroups, req.body).then((resp)=>{
			res.send(resp);
		}).catch((error)=>{
			log.error(err);
			res.status(500).end('' + error);
		}); 
	});

	router.post('/groups/:uuid/devices',(req,res)=>{

		let session = zulu.getSession(req.query.sessionid);
		if (!session || !session.user) {
			let msg = "Invalid user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}

		if (!session.user.is_admin) {
			let msg = "Group device binding not allowed to non admin user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}

		GroupApi.addDevice(req.params.uuid, req.body.devices).then((resp)=>{
			res.send(resp);
		}).catch((error)=>{
			log.error(error);
			res.status(500).end('' + error);
		}); 
	});
	router.get('/groups/guestaction/:action/:token/:uuid', (req, res) => {
		var parms = {'iot-manager':iotManager, 'event-dispatcher': dispatcher, 
			'timestamp': Date.now(),
			'action-id': uuid.v4(),
			'token':req.params.token,'uuid' : req.params.uuid
		};
		var action  = req.params.action.charAt(0).toUpperCase()+req.params.action.slice(1);
		GroupApi.doGuestAction(req.params.uuid, action, parms).then((resp) => {

			var template = fs.readFileSync('../views/guest_access_success.html', { encoding: 'utf-8' });

			var data = { reason: 'Door unlocked' };
			var content = ejs.render(template, data);
			res.set('Content-Type', 'text/html');
			res.send(content); 
		}).catch((error)=>{
			log.warn(error);
			var template = fs.readFileSync('../views/guest_access_action_failure.html', { encoding: 'utf-8' });

			var data = { reason: error };
			var content = ejs.render(template, data);
			res.set('Content-Type', 'text/html');
			res.send(content); 
		});
	});
	router.post('/groups/:uuid/action',(req,res)=>{
		var iotGroups = undefined;
		var session = zulu.getSession(req.query.sessionid);
		if (!session || !session.user) {
			let msg = "Invalid user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}

		iotGroups = iot_backend_server.permission_groups;
		var permission_groups = session.user.is_admin ? null : session.user.iot_permission_groups;
		if (permission_groups) {
			log.debug("Running group action " +  req.body.action + " for user " + session.user.username + " with permission groups " + JSON.stringify(permission_groups));
		}
		var parms = {'iot-manager':iotManager, 'event-dispatcher': dispatcher, 
		'timestamp': Date.now(), 'action-id': uuid.v4(), 'user-id': session.user.id,
		'user-name': session.user.username, 'session': session, 'org-id': session.user.org_id};

		GroupApi.doAction(req.params.uuid, req.body.action, parms, permission_groups, iotGroups).then((resp)=>{
			res.send(resp); 
		}).catch((error)=>{
			log.warn(error);
			if (typeof error == "object") {
				if ( error.message == PropertyApi.MSG_NO_USER_ACCESS_BY_AP && error.group_name ) {
					var error_text =  "Your access to group " + error.group_name.trim() + " is restricted during this period. Please contact your admninistrator";
					res.status(400).end('' + error_text);
				}
            } else {
				if ('Group Action forbiden for user' == error ) {
					res.status(400).end('' + error);
				} else {
					res.status(500).end('' + error);
				}
			}
		});
	});

	router.delete('/groups/:uuid/devices',(req,res)=>{

		let session = zulu.getSession(req.query.sessionid);
		if (!session || !session.user) {
			let msg = "Invalid user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}

		if (!session.user.is_admin) {
			let msg = "Group device unbinding not allowed to non admin user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}

		GroupApi.removeDevice(req.params.uuid, req.body.deviceuuid).then((resp)=>{
			res.send(resp);   
		}).catch((error)=>{
			log.error(error);
			res.status(500).end('' + error);
		}); 
	});
}
