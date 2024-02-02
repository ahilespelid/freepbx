const PropertyApi = require('../../../api/iot/user-property-api.js');
const log = require('../../log');

module.exports.init = async (app, router) =>{
	const  zulu = app.get('zulu');
	const iot_backend_server = app.get('iot_backend_server');

	router.get('/favorites',(req,res)=>{
		let session = zulu.getSession(req.query.sessionid);
		if (!session || !session.user) {
			let msg = "Invalid user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}

		var permission_groups = session.user.is_admin ? null : session.user.iot_permission_groups;

		var data = {};
		var q = require('q');
		var promises = [];

		PropertyApi.getUserFavorites(session.user.id, permission_groups).then((favorites)=>{
			res.send(favorites);
		}).catch((error)=>{
			log.error(error);
			res.status(500).end('' + error);
		})
	});

	

	router.post('/favorites',(req,res)=>{
		let session = zulu.getSession(req.query.sessionid);
		if (!session || !session.user) {
			let msg = "Invalid user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}

		if (req.body.object_uuid && req.body.object_type) {
			log.debug("Adding " + req.body.object_type + " with uuid " + req.body.object_uuid + " to user " + session.user.username +  " favorites");
		}

		var permission_groups = session.user.is_admin ? null : session.user.iot_permission_groups;
		var postBody = req.body
		postBody.org_id = iot_backend_server.org_id;
		PropertyApi.addUserFavorites(session.user.id, permission_groups, postBody).then(()=>{
			res.send({status: true});
		}).catch((error)=>{
			log.error(error);
			res.status(500).end('' + error);
		})	
	});


	router.delete('/favorites',(req,res)=>{
		let session = zulu.getSession(req.query.sessionid);
		if (!session || !session.user) {
			let msg = "Invalid user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}

		if (req.body.object_uuid && req.body.object_type) {
			log.debug("Removing " + req.body.object_type + " with uuid " + req.body.object_uuid + " form user id " + session.user.username  + " favorites");
		}

		var permission_groups = session.user.is_admin ? null : session.user.iot_permission_groups;
		PropertyApi.removeUserFavorites(session.user.id, permission_groups, req.body).then(()=>{
			res.send({status: true});
		}).catch((error)=>{
			log.error(error);
			res.status(500).end('' + error);
		})
	});

	
}
