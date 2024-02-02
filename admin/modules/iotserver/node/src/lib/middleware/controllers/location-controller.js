const LocationApi = require('../../../api/iot/location-api.js');
const AccessProfileApi = require('../../../api/iot/access-profile-api.js');
const AutomatedActionApi = require('../../../api/iot/automated-action-api.js');
const log = require('../../log');

module.exports.init = async (app, router, iotManager) =>{
	const  zulu = app.get('zulu');
	const iot_backend_server = app.get('iot_backend_server');
	router.get('/locations',(req,res)=>{

		let session = zulu.getSession(req.query.sessionid);
		if (!session || !session.user) {
			let msg = "Invalid user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}
		var permission_groups = session.user.is_admin ? null : session.user.iot_permission_groups;
		if (permission_groups) {
			log.debug("Getting locations for user " + session.user.username + " with permission groups " + JSON.stringify(permission_groups));
		}
		LocationApi.getAll(permission_groups).then((locations)=>{
			res.send(locations);
		}).catch((error)=>{
			log.error(error);
			res.status(500).end('' + error);
		});
	});

	router.get('/locations/:uuid',(req,res)=>{
		let session = zulu.getSession(req.query.sessionid);
		if (!session || !session.user) {
			let msg = "Invalid user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}
		var permission_groups = session.user.is_admin ? null : session.user.iot_permission_groups;
		if (permission_groups) {
			log.debug("Getting location for user " + session.user.username + " with permission groups " + JSON.stringify(permission_groups));
		}
		LocationApi.getLocation(req.params.uuid, permission_groups).then((location)=>{
			res.send(location);
		}).catch((error)=>{
			res.status(500).end('' + error);
		});
	});

	router.post('/locations',(req,res)=>{

		let session = zulu.getSession(req.query.sessionid);
		if (!session || !session.user) {
			let msg = "Invalid user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}

		if (!session.user.is_admin) {
			let msg = "Location creation not allowed to non admin user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}


		const postBody = req.body;
		if (!postBody.name) {
			res.status(500).end("Location Name is mandatory");
		} else {
			LocationApi.getCount().then((count)=>{
				if (zulu.license && count >= parseInt(zulu.license.location_limit)) {
					let msg = "Maximum number of allowed locations " + count + " reached  ";
					log.warn(msg);
					res.status(400).end(msg);
				} else {
					postBody.org_id = iot_backend_server.org_id;
					LocationApi.createLocation(postBody).then((location)=>{
						res.send(location);
					}).catch((error)=>{
						log.error(error);
						res.status(500).end('' + error);
					});
				}
			}).catch((error)=>{
				res.status(500).end('' + error);
			});
		}
	});

	router.post('/locations/:uuid',(req,res)=>{
		let session = zulu.getSession(req.query.sessionid);
		if (!session || !session.user) {
			let msg = "Invalid user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}

		if (!session.user.is_admin) {
			let msg = "Location update not allowed to non admin user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}
		LocationApi.updateLocation(req.params.uuid, req.body).then((location)=>{
			res.send(location);
		}).catch((error)=>{
			log.error(error);
			res.status(500).end('' + error);
		});
	});

	router.delete('/locations/:uuid',(req,res)=>{
		let session = zulu.getSession(req.query.sessionid);
		if (!session || !session.user) {
			let msg = "Invalid user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}

		if (!session.user.is_admin) {
			let msg = "Location deletion not allowed to non admin user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}
		LocationApi.deleteLocation(req.params.uuid).then((location)=>{
			res.send(location);
			return AccessProfileApi.updateApStatusOnPropertyChange();
		}).then(() =>{
			return AutomatedActionApi.updateAutomatedActionStatusOnPropertyChange();
		}).catch((error)=>{
			log.error(error);
			res.status(500).end('' + error);
		});
	});


	router.post('/locations/:uuid/permissions',(req,res)=>{
		let session = zulu.getSession(req.query.sessionid);
		if (!session || !session.user) {
			let msg = "Invalid user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}

		if (!session.user.is_admin) {
			let msg = "Location permission binding not allowed to non admin user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}

		LocationApi.addPermission(req.params.uuid, req.body).then((resp)=>{
			res.send(resp);
		}).catch((error)=>{
			log.error(error);
			res.status(500).end('' + error);
		}); 
	});

	router.delete('/locations/:uuid/permission',(req,res)=>{
		let session = zulu.getSession(req.query.sessionid);
		if (!session || !session.user) {
			let msg = "Invalid user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}

		if (!session.user.is_admin) {
			let msg = "Location permission binding not allowed to non admin user session " + req.query.sessionid;
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

		LocationApi.removePermission(req.params.uuid, req.body.user_group_id).then((resp)=>{
			res.send(resp);
		}).catch((error)=>{
			log.error(error);
			res.status(500).end('' + error);
		}); 
	});
	
	router.post('/locations/:uuid/zones',(req,res)=>{
		var resp = {};

		let session = zulu.getSession(req.query.sessionid);
		if (!session || !session.user) {
			let msg = "Invalid user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}

		if (!session.user.is_admin) {
			let msg = "Location zone binding not allowed to non admin user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}

		if(req.body.zone_uuid){
			LocationApi.addZone(req.params.uuid, req.body.zone_uuid).then((resp)=>{
				res.send(resp);
			}).catch((error)=>{
				res.status(500).end('' + error);
			});
		} else if(req.body.name){
			LocationApi.addCreateAndAddZone(req.params.uuid,req.body.name).then((resp)=>{
				res.send(resp);
			}).catch((error)=>{
				res.status(500).end('' + error);
			});
		} else{
			res.status(404).end("Mandatory name or zone_uuid paramaters not provided");
		}
	});

	router.delete('/locations/:uuid/zones',(req,res)=>{

		let session = zulu.getSession(req.query.sessionid);
		if (!session || !session.user) {
			let msg = "Invalid user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}

		if (!session.user.is_admin) {
			let msg = "Location zone unbinding not allowed to non admin user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}

		LocationApi.removeZone(req.params.uuid, req.body.zone_uuid).then((resp)=>{
			res.send(resp);
		}).catch((error)=>{
			res.status(500).end('' + error);
		}); 
	});
}