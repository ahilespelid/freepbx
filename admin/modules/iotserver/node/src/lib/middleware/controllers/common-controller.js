const LocationApi = require('../../../api/iot/location-api.js');
const ZoneApi = require('../../../api/iot/zone-api.js');
const SceneApi = require('../../../api/iot/scene-api.js');
const GroupApi = require('../../../api/iot/group-api.js');
const DeviceApi = require('../../../api/iot/device-api.js');
const GatewayApi = require('../../../api/iot/gateway-api.js');
const PropertyApi = require('../../../api/iot/user-property-api.js');
const CommonApi = require('../../../api/iot/common-api.js');
const log = require('../../log');
const Apis = [LocationApi, ZoneApi, SceneApi, GroupApi];
module.exports.init = async (app, router) =>{

        const  zulu = app.get('zulu');
	const iot_backend_server = app.get('iot_backend_server');

	router.get('/healthy',(req,res)=>{
		res.send({status: true});
	});

	router.get('/log/level',(req,res)=>{


		let session = zulu.getSession(req.query.sessionid);
		if (!session || !session.user) {
			let msg = "Invalid user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}

		if (!session.user.is_admin) {
			let msg = "Log level query not allowed to non admin user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}

		CommonApi.getLoggingLevel().then((lev)=>{
			res.send({status: true, level: lev});
		}).catch((error)=>{
			log.error(error);
			res.send({status: false, msg: '' + error});
		});
	});

	router.post('/log/level',(req,res)=>{

		let session = zulu.getSession(req.query.sessionid);
		if (!session || !session.user) {
			let msg = "Invalid user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}

		if (!session.user.is_admin) {
			let msg = "Log level setting not allowed to non admin user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}

		CommonApi.setLoggingLevel(req.body.level).then((lev)=>{
			res.send({status: true, level: lev});
		}).catch((error)=>{
			log.error(error);
			res.send({status: false, msg: '' + error});
		});
	})

	router.get('/all',(req,res)=>{

		var response = {};

		let session = zulu.getSession(req.query.sessionid);
		if (!session || !session.user) {
			let msg = "Invalid user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}
		var permission_groups = session.user.is_admin ? null : session.user.iot_permission_groups;
		if (permission_groups) {
			log.debug("Getting all objects for user " + session.user.username + " with permission groups " + JSON.stringify(permission_groups));
		}

		var promises = [];
		var q = require('q');
		promises.push(PropertyApi.getUserFavorites(session.user.id, permission_groups, true));
		promises.push(PropertyApi.getUserUnits(session.user.id));
		
		promises.push(DeviceApi.getAll(true))
		if (session.user.is_admin) {
			promises.push(GatewayApi.getAll(true))
		} else {
			response['gateways'] = [];
		}
		Apis.forEach((api)=>{
			promises.push(api.getAll(permission_groups, null, true))
		})

		q.all(promises).then((results)=>{
			results.forEach((result)=>{
				Object.keys(result).forEach( (key)=>{
					response[key] = result[key];
				})
			})
			res.send(response);
		}).catch((error)=>{
			log.error(error);
			res.status(500).end('' + error);
		});
	});

	router.get('/deployment/settings', (req, res) => {
		let session = zulu.getSession(req.query.sessionid);
		if (!session || !session.user) {
			let msg = "Invalid user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}

		if (!session.user.is_admin) {
			let msg = "displayname query not allowed to non admin user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}
		var postBody = req.body;
		postBody.org_id = iot_backend_server.org_id;
		iot_backend_server.getDisplayName(req).then((resp) => {
			res.send(resp);
		}).catch((error) => {
			log.error(error);
			res.send({ status: false, message: '' + error });
		});
	})

	router.post('/user/units',(req,res)=>{
		let session = zulu.getSession(req.query.sessionid);
		if (!session || !session.user) {
			let msg = "Invalid user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}
		var postBody = req.body;
		postBody.org_id = iot_backend_server.org_id;
		PropertyApi.setUserUnits(session.user.id, postBody).then((units)=>{
			res.send(units);
		}).catch((error)=>{
			log.error(error);
			res.status(500).end('' + error);
		});
	})
	router.post('/deployment/settings', (req, res) => {
		let session = zulu.getSession(req.query.sessionid);
		if (!session || !session.user) {
			let msg = "Invalid user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}
		if (!session.user.is_admin) {
			let msg = "Deployment setting not allowed to non admin user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}
		var postBody = req.body;
		postBody.org_id = iot_backend_server.org_id;
		CommonApi.setDeploymentDisplayName(postBody).then((responses) => {
			res.send(responses);
		}).catch((error) => {
			log.error(error);
			res.status(500).end(error)
		});
	})
    router.post('/push_notification/token/store', (req, res) => {
        let session = zulu.getSession(req.query.sessionid);
        if (!session || !session.user) {
            let msg = "Invalid user session " + req.query.sessionid;
            log.warn(msg);
            res.status(400).end(msg);
            return;
        }
        const backend_server = app.get('iot_backend_server');
        PropertyApi.setUserFirebaseToken(session.user.id, backend_server.org_id, req.body)
        .then(() => {
            res.send({ status: true });
        })
        .catch((error) => {
            log.error(error);
            res.status(500).end(error)
        })
   })
}
