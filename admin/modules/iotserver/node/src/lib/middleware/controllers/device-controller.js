const DeviceApi = require('../../../api/iot/device-api.js');
const log = require('../../log');
const uuid = require('uuid');
module.exports.init = async (app, router, iotManager) =>{
	const dispatcher = require('../../iot/event-dispatcher.js');
	const  zulu = app.get('zulu');

	router.get('/devices/physical/types',(req,res)=>{
		let session = zulu.getSession(req.query.sessionid);
		if (!session || !session.user) {
			let msg = "Invalid user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}
		res.send(DeviceApi.DEVICES_PHY_TYPES);
	});

	router.get('/devices',(req,res)=>{
		let session = zulu.getSession(req.query.sessionid);
		if (!session || !session.user) {
			let msg = "Invalid user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}

		DeviceApi.getAll().then((devices)=>{
			res.send(devices);
		}).catch((error)=>{
			log.error(error);
			res.status(500).end('' + error);
		});
	});

	router.get('/devices/:uuid',(req,res)=>{

		let session = zulu.getSession(req.query.sessionid);
		if (!session || !session.user) {
			let msg = "Invalid user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}

		DeviceApi.getDevice(req.params.uuid).then((resp)=>{
			res.send(resp);
		}).catch((error)=>{
			log.error(error);
			res.status(500).end('' + error);
		});
	});

	router.post('/devices/:uuid',(req,res)=>{

		var session = zulu.getSession(req.query.sessionid);
		if (!session || !session.user) {
			let msg = "Invalid user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}

		if (!session.user.is_admin) {
			let msg = "Device update not allowed to non admin user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}
		DeviceApi.updateDevice(req.params.uuid, req.body,  iotManager).then((resp)=>{
			res.send(resp);
		}).catch((error)=>{
			log.error(error);
			res.status(500).end('' + error);
		});
	});


	router.post('/devices/:uuid/action',(req,res)=>{
		var iotGroups = undefined;
		var session = zulu.getSession(req.query.sessionid);
		if (!session || !session.user) {
			let msg = "Invalid user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}

		if (!session.user.is_admin) {
			let msg = "Device action not allowed to non admin user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}

		DeviceApi.doAction(req.params.uuid, req.body.action, {'iot-manager':iotManager, 'event-dispatcher': dispatcher, 
			'timestamp': Date.now(), 'action-id': uuid.v4(), 'user-id': session.user.id,'user-name': session.user.username, 'session': session, 'org-id': session.user.org_id}).then((resp)=>{
				res.send(resp); 
		}).catch((error)=>{
			log.error(error);
			res.status(500).end('' + error);
		});
	});


	router.post('/devices/:uuid/pair',(req,res)=>{
		let session = zulu.getSession(req.query.sessionid);
		if (!session || !session.user) {
			let msg = "Invalid user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}
		if (!session.user.is_admin) {
			let msg = "Device pairing not allowed to non admin user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}
		DeviceApi.pairDevice(req.params.uuid, iotManager).then((resp)=>{
			res.send(resp);
		}).catch((error)=>{
			log.error(error);
			res.status(500).end('' + error);
		});
	});

	router.post('/devices/:uuid/calibrate/start',(req,res)=>{
		let session = zulu.getSession(req.query.sessionid);
		if (!session || !session.user) {
			let msg = "Invalid user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}

		if (!session.user.is_admin) {
			let msg = "Device calibration not allowed to non admin user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}

		DeviceApi.startCalibration(req.params.uuid, iotManager).then((resp)=>{
			res.send(resp);
		}).catch((error)=>{
			log.error(error);
			res.status(500).end('' + error);
		});
	});

	router.post('/devices/:uuid/calibrate/stop',(req,res)=>{
		let session = zulu.getSession(req.query.sessionid);
		if (!session || !session.user) {
			let msg = "Invalid user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}

		if (!session.user.is_admin) {
			let msg = "Device calibration not allowed to non admin user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}
		DeviceApi.stopCalibration(req.params.uuid, iotManager).then((resp)=>{
			res.send(resp);
		}).catch((error)=>{
			log.error(error);
			res.status(500).end('' + error);
		});
	});

	router.post('/devices',(req,res)=>{

		let session = zulu.getSession(req.query.sessionid);
		if (!session || !session.user) {
			let msg = "Invalid user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}

		if (!session.user.is_admin) {
			let msg = "Device creation not allowed to non admin user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}

		DeviceApi.addDevice(req.body, iotManager).then((resp)=>{
			res.send(resp);
		}).catch((error)=>{
			log.error(error);
			res.status(500).end('' + error);
		});
	});

	router.delete('/devices/:uuid',(req,res)=>{
		let session = zulu.getSession(req.query.sessionid);
		if (!session || !session.user) {
			let msg = "Invalid user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}

		if (!session.user.is_admin) {
			let msg = "Device deletion not allowed to non admin user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}

		DeviceApi.removeDevice(req.params.uuid, iotManager).then((resp)=>{
			res.send(resp);
		}).catch((error)=>{
			log.error(error);
			res.status(500).end('' + error);
		});
	});
}