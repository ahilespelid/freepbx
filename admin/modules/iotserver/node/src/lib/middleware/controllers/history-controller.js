const HistoryApi = require('../../../api/iot/history-api.js');
const log = require('../../log');
module.exports.init = async (app, router, iotManager) =>{
	const  zulu = app.get('zulu');

	router.get('/history',(req,res)=>{
		let session = zulu.getSession(req.query.sessionid);
		if (!session || !session.user) {
			let msg = "Invalid user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}

		if (!session.user.is_admin) {
			let msg = "Event history listing not allowed to non admin user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}

		HistoryApi.getAll().then((events)=>{
			res.send(events);
		}).catch((error)=>{
			res.status(500).end('' + error);
		});
	});

	router.get('/history/objects/:uuid',(req,res)=>{
		let session = zulu.getSession(req.query.sessionid);
		if (!session || !session.user) {
			let msg = "Invalid user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}

		if (!session.user.is_admin) {
			let msg = "Event history listing not allowed to non admin user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}

		HistoryApi.getObjectEvents(req.params.uuid).then((events)=>{
			res.send(events);
		}).catch((error)=>{
			res.status(500).end('' + error);
		});
	});

	router.get('/history/users/:username',(req,res)=>{
		let session = zulu.getSession(req.query.sessionid);
		if (!session || !session.user) {
			let msg = "Invalid user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}

		if (!session.user.is_admin) {
			let msg = "Event history listing not allowed to non admin user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}

		HistoryApi.getUserEvents(req.params.username).then((events)=>{
			res.send(events);
		}).catch((error)=>{
			res.status(500).end('' + error);
		});
	});

	
}
