const ZoneApi = require('../../../api/iot/zone-api.js');
const AccessProfileApi = require('../../../api/iot/access-profile-api.js');
const AutomatedActionApi = require('../../../api/iot/automated-action-api.js');
const uuid = require('uuid');
const log = require('../../log');

module.exports.init = async (app, router, iotManager) =>{
	const dispatcher = require('../../iot/event-dispatcher.js');
	const  zulu = app.get('zulu');
	router.get('/zones',(req,res)=>{


		let session = zulu.getSession(req.query.sessionid);
		if (!session || !session.user) {
			let msg = "Invalid user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}
		var permission_groups = session.user.is_admin ? null : session.user.iot_permission_groups;
		if (permission_groups) {
			log.debug("Getting zones for user " + session.user.username + " with permission groups " + JSON.stringify(permission_groups));
		}

		ZoneApi.getAll(permission_groups).then((zones)=>{
			res.send(zones);
		}).catch((error)=>{
			res.status(500).end('' + error);
		});
	});

	router.get('/zones/:uuid',(req,res)=>{

		let session = zulu.getSession(req.query.sessionid);
		if (!session || !session.user) {
			let msg = "Invalid user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}
		var permission_groups = session.user.is_admin ? null : session.user.iot_permission_groups;
		if (permission_groups) {
			log.debug("Getting zone for user " + session.user.username + " with permission groups " + JSON.stringify(permission_groups));
		}

		ZoneApi.getZone(req.params.uuid, permission_groups).then((resp)=>{
			res.send(resp);
		}).catch((error)=>{
			res.status(500).end(error);
		});
	});

	router.post('/zones',(req,res)=>{

		let session = zulu.getSession(req.query.sessionid);
		if (!session || !session.user) {
			let msg = "Invalid user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}

		if (!session.user.is_admin) {
			let msg = "Zone creation not allowed to non admin user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}

		const postBody = req.body;
		if (!postBody.name) {
			res.status(500).end("Mandatory name field not specified");
		} else {
			ZoneApi.getCount().then((count)=>{
				if (zulu.license && count >= parseInt(zulu.license.zone_limit)) {
					let msg = "Maximum number of allowed zones " + count + " reached  ";
					log.warn(msg);
					res.status(400).end(msg);
				} else {
					delete postBody.children;
					delete postBody.objtype;
					delete postBody.actions;
					ZoneApi.createZone(postBody).then((resp)=>{
						res.send(resp);
					}).catch((error)=>{
						log.error(error);
						res.status(500).end(error);
					});
				}
			}).catch((error)=>{
				res.status(500).end('' + error);
			});
		}
	});

	router.post('/zones/:uuid/permissions',(req,res)=>{
		let session = zulu.getSession(req.query.sessionid);
		if (!session || !session.user) {
			let msg = "Invalid user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}

		if (!session.user.is_admin) {
			let msg = "Zone permission binding not allowed to non admin user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}

		ZoneApi.addPermission(req.params.uuid, req.body).then((resp)=>{
			res.send(resp);
		}).catch((error)=>{
			log.error(error);
			res.status(500).end(error);
		}); 
	});

	router.delete('/zones/:uuid/permission',(req,res)=>{
		let session = zulu.getSession(req.query.sessionid);
		if (!session || !session.user) {
			let msg = "Invalid user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}

		if (!session.user.is_admin) {
			let msg = "Zone permission binding not allowed to non admin user session " + req.query.sessionid;
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

		ZoneApi.removePermission(req.params.uuid, req.body.user_group_id).then((resp)=>{
			res.send(resp);
		}).catch((error)=>{
			log.error(err);
			res.status(500).end(err);
		}); 
	});

	router.post('/zones/:uuid/action',(req,res)=>{

		let session = zulu.getSession(req.query.sessionid);
		if (!session || !session.user) {
			let msg = "Invalid user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}
		let permission_groups = session.user.is_admin ? null : session.user.iot_permission_groups;
		if (permission_groups) {
			log.debug("Running zone action " +  req.body.action + " for user " + session.user.username + " with permission groups " + JSON.stringify(permission_groups));
		}
		const postBody = req.body;
		if (!postBody.action) {
			res.status(500).end();
		} else {
			ZoneApi.doAction(req.params.uuid, req.body.action, {'iot-manager':iotManager, 'event-dispatcher': dispatcher, 
				'timestamp': Date.now(), 'action-id': uuid.v4(), 'user-id': session.user.id,'user-name': session.user.username, 'org-id': session.user.org_id}, permission_groups).then((resp)=>{
				res.send(resp);
			}).catch((error)=>{
				log.error(error)
				if (error == 'Zone Action forbiden for user') {
					res.status(400).end('' + error);
				} else {
					res.status(500).end('' + error);
				}
			});
		}
	});

	router.post('/zones/:uuid',(req,res)=>{


		let session = zulu.getSession(req.query.sessionid);
		if (!session || !session.user) {
			let msg = "Invalid user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}

		if (!session.user.is_admin) {
			let msg = "Zone update not allowed to non admin user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}


		ZoneApi.updateZone(req.params.uuid, req.body).then((resp)=>{
			res.send(resp);
		}).catch((error)=>{
			log.error(error);
			res.status(500).end('' + error);
		});
	});

	router.delete('/zones/:uuid',(req,res)=>{


		let session = zulu.getSession(req.query.sessionid);
		if (!session || !session.user) {
			let msg = "Invalid user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}

		if (!session.user.is_admin) {
			let msg = "Zone deletion not allowed to non admin user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}

		ZoneApi.deleteZone(req.params.uuid).then((resp)=>{
			res.send(resp);
			return AccessProfileApi.updateApStatusOnPropertyChange();
		}).then(() => {
			return AutomatedActionApi.updateAutomatedActionStatusOnPropertyChange();
		}).catch((error)=>{
			res.status(500).end('' + error);
		});
	});


	router.post('/zones/:uuid/scenes',(req,res)=>{

		let session = zulu.getSession(req.query.sessionid);
		if (!session || !session.user) {
			let msg = "Invalid user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}

		if (!session.user.is_admin) {
			let msg = "Zone scene binding not allowed to non admin user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}


		ZoneApi.addScene(req.params.uuid, req.body.scene_uuid).then((resp)=>{
			res.send(resp);
		}).catch((error)=>{
			log.error(error);
			res.status(500).end('' + error);
		}); 
	});

	router.delete('/zones/:uuid/scenes',(req,res)=>{

		let session = zulu.getSession(req.query.sessionid);
		if (!session || !session.user) {
			let msg = "Invalid user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}

		if (!session.user.is_admin) {
			let msg = "Zone scene unbinding not allowed to non admin user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}

		ZoneApi.removeScene(req.params.uuid, req.body.scene_uuid).then((resp)=>{
			res.send(resp);
		}).catch((error)=>{
			res.status(500).end(error);
		}); 
	});
}