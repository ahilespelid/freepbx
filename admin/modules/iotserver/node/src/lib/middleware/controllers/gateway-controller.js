const GatewayApi = require('../../../api/iot/gateway-api.js');
const log = require('../../log');
module.exports.init = async (app, router, iotManager) =>{
	const  zulu = app.get('zulu');

	router.get('/providers',(req,res)=>{
		let session = zulu.getSession(req.query.sessionid);
		if (!session || !session.user) {
			let msg = "Invalid user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}

		if (!session.user.is_admin) {
			let msg = "Gateway listing not allowed to non admin user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}
		GatewayApi.getProviders().then((providers)=>{
			res.send(providers);
		}).catch((error)=>{
			log.error(error);
			res.status(500).end('' + error);
		});
	});

	router.get('/gateways',(req,res)=>{
		let session = zulu.getSession(req.query.sessionid);
		if (!session || !session.user) {
			let msg = "Invalid user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}

		if (!session.user.is_admin) {
			let msg = "Gateway listing not allowed to non admin user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}

		GatewayApi.getAll().then((gateways)=>{
			res.send(gateways);
		}).catch((error)=>{
			log.error(error);
			res.status(500).end('' + error);
		});
	});

	router.get('/gateways/:uuid',(req,res)=>{
		let session = zulu.getSession(req.query.sessionid);
		if (!session || !session.user) {
			let msg = "Invalid user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}

		if (!session.user.is_admin) {
			let msg = "Gateway listing not allowed to non admin user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}

		GatewayApi.getGateway(req.params.uuid).then((resp)=>{
			res.send(resp);
		}).catch((error)=>{
			log.error(error);
			res.status(500).end('' + error);
		});
	});

	router.post('/gateways',(req,res)=>{
		let session = zulu.getSession(req.query.sessionid);
		if (!session || !session.user) {
			let msg = "Invalid user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}

		if (!session.user.is_admin) {
			let msg = "Gateway creation not allowed to non admin user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}

		GatewayApi.addGateway(req.body, iotManager).then((resp)=>{
			res.send(resp);
		}).catch((error)=>{
			log.error(error);
			res.status(400).end('' + error);
		});
	});


	router.post('/gateways/:uuid',(req,res)=>{
		let session = zulu.getSession(req.query.sessionid);
		if (!session || !session.user) {
			let msg = "Invalid user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}

		if (!session.user.is_admin) {
			let msg = "Gateway Modifying not allowed to non admin user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}

		GatewayApi.updateGateway(req.params.uuid, iotManager, req.body).then((resp)=>{
			res.send(resp);
		}).catch((error)=>{
			log.error(error);
			res.status(500).end('' + error);
		});
	});


	router.delete('/gateways/:uuid',(req,res)=>{
		let session = zulu.getSession(req.query.sessionid);
		if (!session || !session.user) {
			let msg = "Invalid user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}

		if (!session.user.is_admin) {
			let msg = "Gateway deletion not allowed to non admin user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}


		GatewayApi.removeGateway(req.params.uuid, iotManager).then((resp)=>{
			res.send(resp);
		}).catch((error)=>{
			log.error(error);
			res.status(500).end('' + error);
		});
	});


	router.post('/gateways/:uuid/scan',(req,res)=>{
		let session = zulu.getSession(req.query.sessionid);
		if (!session || !session.user) {
			let msg = "Invalid user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}

		if (!session.user.is_admin) {
			let msg = "Gateway scan not allowed to non admin user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}

		GatewayApi.enableDiscoveryMode(req.params.uuid, iotManager, req.body).then((resp)=>{
			res.send(resp);
		}).catch((error)=>{
			log.error(error);
			res.status(500).end('' + error);
		});
	});

	router.get('/gateways/:uuid/config',(req,res)=>{
		let session = zulu.getSession(req.query.sessionid);
		if (!session || !session.user) {
			let msg = "Invalid user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}

		if (!session.user.is_admin) {
			let msg = "Gateway debug config fetching not allowed to non admin user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}

		GatewayApi.getGatewayDebug(req.params.uuid, iotManager).then((resp)=>{
			res.send(resp);
		}).catch((error)=>{
			log.error(error);
			res.status(500).end('' + error);
		});
	});

	router.post('/gateways/:uuid/config',(req,res)=>{
		let session = zulu.getSession(req.query.sessionid);
		if (!session || !session.user) {
			let msg = "Invalid user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}

		if (!session.user.is_admin) {
			let msg = "Gateway debug config setting not allowed to non admin user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}

		GatewayApi.setGatewayDebug(req.params.uuid, iotManager, req.body).then((resp)=>{
			res.send(resp);
		}).catch((error)=>{
			log.error(error);
			res.status(500).end('' + error);
		});
	});

	router.get('/gateways/:uuid/logs',(req,res)=>{
		let session = zulu.getSession(req.query.sessionid);
		if (!session || !session.user) {
			let msg = "Invalid user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}

		if (!session.user.is_admin) {
			let msg = "Gateway logs fetching not allowed to non admin user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}

		GatewayApi.getGatewayLogs(req.params.uuid, iotManager).then((resp)=>{
			res.attachment(req.params.uuid + '_logs.tar')
			res.set('Content-Type', 'application/x-tar')
			res.send(resp);
		}).catch((error)=>{
			log.error(error);
			res.status(500).end('' + error);
		});
	});

}
