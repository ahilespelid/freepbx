const SceneApi = require('../../../api/iot/scene-api.js');
const AccessProfileApi = require('../../../api/iot/access-profile-api.js');
const AutomatedActionApi = require('../../../api/iot/automated-action-api.js');
const uuid = require('uuid');
const log = require('../../log');
const PropertyApi = require('../../../api/iot/user-property-api.js');

module.exports.init = async (app, router, iotManager) =>{
	const dispatcher = require('../../iot/event-dispatcher.js');
	const  zulu = app.get('zulu');
	const iot_backend_server = app.get('iot_backend_server');
	router.get('/scenes',(req,res)=>{

		let session = zulu.getSession(req.query.sessionid);
		if (!session || !session.user) {
			let msg = "Invalid user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}
		var permission_groups = session.user.is_admin ? null : session.user.iot_permission_groups;
		if (permission_groups) {
			log.debug("Getting scenes for user " + session.user.username + " with permission groups " + JSON.stringify(permission_groups));
		}


		SceneApi.getAll(permission_groups).then((scenes)=>{
			res.send(scenes);
		}).catch((error)=>{
			log.error(error);
			res.status(500).end('' + error);
		});
	});

	router.get('/scenes/:uuid',(req,res)=>{

		let session = zulu.getSession(req.query.sessionid);
		if (!session || !session.user) {
			let msg = "Invalid user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}
		var permission_groups = session.user.is_admin ? null : session.user.iot_permission_groups;
		if (permission_groups) {
			log.debug("Getting scene for user " + session.user.username + " with permission groups " + JSON.stringify(permission_groups));
		}

		SceneApi.getScene(req.params.uuid, permission_groups).then((resp)=>{
			res.send(resp);
		}).catch((error)=>{
			log.error(error);
			res.status(500).end('' + error);
		});
	});

	router.post('/scenes',(req,res)=>{


		let session = zulu.getSession(req.query.sessionid);
		if (!session || !session.user) {
			let msg = "Invalid user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}

		if (!session.user.is_admin) {
			let msg = "Scene creation not allowed to non admin user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}
		
		const postBody = req.body;
		if (!postBody.name) {
			res.status(500).end("Mandatory name field not specified");
		} else {
			SceneApi.getCount().then((count)=>{
				if (zulu.license && count >= parseInt(zulu.license.scene_limit)) {
					let msg = "Maximum number of allowed scenes " + count + " reached  ";
					log.warn(msg);
					res.status(400).end(msg);
				} else {
					SceneApi.createScene(postBody).then((resp)=>{
						res.send(resp);
					}).catch((error)=>{
						res.status(500).end('' + error);
					});
				}
			}).catch((error)=>{
				log.error(error);
				res.status(500).end('' + error);
			});	
		}
	});


	router.post('/scenes/:uuid',(req,res)=>{
		let session = zulu.getSession(req.query.sessionid);
		var iotGroups = undefined;
		if (!session || !session.user) {
			let msg = "Invalid user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}

		if (!session.user.is_admin) {
			let msg = "Scene update not allowed to non admin user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}
		iotGroups = iot_backend_server.permission_groups;
		SceneApi.updateScene(req.params.uuid, req.body, iotGroups).then((resp)=>{
			res.send(resp);
		}).catch((error)=>{
			log.error(error);
			res.status(500).end('' + error);
		});
	});

	router.delete('/scenes/:uuid',(req,res)=>{


		let session = zulu.getSession(req.query.sessionid);
		if (!session || !session.user) {
			let msg = "Invalid user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}

		if (!session.user.is_admin) {
			let msg = "Scene deletion not allowed to non admin user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}

		SceneApi.deleteScene(req.params.uuid).then((resp)=>{
			res.send(resp);
			return AccessProfileApi.updateApStatusOnPropertyChange();
		}).then(() =>{
			return AutomatedActionApi.updateAutomatedActionStatusOnPropertyChange();
		}).catch((error)=>{
			log.error(error);
			res.status(500).end('' + error);
		});
	});

	router.post('/scenes/:uuid/permissions',(req,res)=>{
		let session = zulu.getSession(req.query.sessionid);
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
		SceneApi.addPermission(req.params.uuid, req.body, true, true, iotGroups).then((resp)=>{
			res.send(resp);
		}).catch((error)=>{
			log.error(error);
			res.status(500).end('' + error);
		}); 
	});

	router.delete('/scenes/:uuid/permission',(req,res)=>{
		let session = zulu.getSession(req.query.sessionid);
		if (!session || !session.user) {
			let msg = "Invalid user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}

		if (!session.user.is_admin) {
			let msg = "Scene permission unbinding not allowed to non admin user session " + req.query.sessionid
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}

		if(!req.body.permission_id) {
			let msg = "Cannot remove permission, permission_id not provided ";
			log.warn(msg);
			res.status(500).end(msg);
			return;
		}

		SceneApi.removePermission(req.params.uuid, req.body.user_group_id).then((resp)=>{
			res.send(resp);
		}).catch((error)=>{
			log.error(error);
			res.status(500).end('' + error);
		}); 
	});

	router.post('/scenes/:uuid/groups',(req,res)=>{


		let session = zulu.getSession(req.query.sessionid);
		if (!session || !session.user) {
			let msg = "Invalid user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}

		if (!session.user.is_admin) {
			let msg = "Scene group binding not allowed to non admin user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}

		if(req.body.group_uuid) {
			SceneApi.addGroup(req.params.uuid, req.body.group_uuid).then((resp)=>{
				res.send(resp);
			}).catch((error)=>{
				res.status(500).end('' + error);
			}); 
		} else if(req.body.group_name) {
			SceneApi.createAndAddGroup(req.params.uuid, req.body).then((resp)=>{
				res.send(resp);
			}).catch((error)=>{
				res.status(500).end('' + error);
			});
		} else {
			res.status(500).end("Mandatory name or goub_uuid field not provided");
		}
	});

	router.delete('/scenes/:uuid/groups',(req,res)=>{
		let session = zulu.getSession(req.query.sessionid);
		if (!session || !session.user) {
			let msg = "Invalid user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}

		if (!session.user.is_admin) {
			let msg = "Scene group unbinding not allowed to non admin user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}

		SceneApi.removeGroup(req.params.uuid, req.body.group_uuid).then((resp)=>{
			res.send(resp);
		}).catch((error)=>{
			res.status(500).end('' + error);
		}); 
	});

	router.post('/scenes/:uuid/action',(req,res)=>{
		var iotGroups = undefined;
		let session = zulu.getSession(req.query.sessionid);
		if (!session || !session.user) {
			let msg = "Invalid user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}

		if (!req.body.action) {
			let msg = "Undefined scene action ";
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}

		iotGroups = iot_backend_server.permission_groups;
		var permission_groups = session.user.is_admin ? null : session.user.iot_permission_groups;
		if (permission_groups) {
			log.debug("Running scene action " +  req.body.action + " for user " + session.user.username + " with permission groups " + JSON.stringify(permission_groups));
		}
		var parms = {'iot-manager': iotManager, 'event-dispatcher': dispatcher, 'timestamp': Date.now(), 
		'action-id': uuid.v4(), 'user-id': session.user.id, 'user-name': session.user.username, 'org-id': session.user.org_id};

		SceneApi.doAction(req.params.uuid, req.body.action, parms, permission_groups, iotGroups).then((resp)=>{
			res.send(resp);
		}).catch((error)=>{
			var status = 500;
			if (Array.isArray(error)) {
				status = 400;
				var grp_names = [];
				error.forEach((err) => {
					if (err.message == PropertyApi.MSG_NO_USER_ACCESS_BY_AP && err.group_name ) {
						if(!grp_names.includes(err.group_name))grp_names.push(err.group_name);
					}
				});
				var start_text = (grp_names.length > 1) ? "Your access to groups ["+grp_names.toString()+"] " : "Your access to group "+grp_names.toString().trim();
				var error_text = start_text + " is restricted during this period. Please contact your administrator";
				log.debug(" Error text:",error_text);
				log.warn(error_text);
				res.status(status).end('' + error_text);
			} else {
				if (error == 'Scene Action forbiden for user') {
					status = 400;
				}
				log.error(error);

				res.status(status).end('' + error);
			}
		});
	});
}
