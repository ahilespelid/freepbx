const log = require('../../log');

module.exports.init = async (app, router) =>{
	const dispatcher = require('../../iot/event-dispatcher.js');
	const  zulu = app.get('zulu');

	router.get('/notifications',(req,res)=>{
		let session = zulu.getSession(req.query.sessionid);
		if (!session || !session.user) {
			let msg = "Invalid user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}

		var notifier = dispatcher.getNotifier();
		if (!notifier) {
			let msg = "Notification framework not configured";
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}

		var permission_groups = session.user.is_admin ? null : session.user.iot_permission_groups;

		notifier.getNotifications(permission_groups).then((resp)=>{
			res.send(resp);
		}).catch((error)=>{
			log.error(error);
			res.status(500).end('' + error);
		})
	});

	router.post('/notifications/:uuid',(req,res)=>{
		let session = zulu.getSession(req.query.sessionid);
		if (!session || !session.user) {
			let msg = "Invalid user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}

		if (!req.body || !req.body.action) {
			let msg = "Invalid request";
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}


		var notifier = dispatcher.getNotifier();
		if (!notifier) {
			let msg = "Notification framework not configured";
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}

		notifier.notificationAction(req.params.uuid,  session.user, req.body.action).then((resp)=>{
			res.send(resp);
		}).catch((error)=>{
			log.error(error);
			res.status(500).end('' + error);
		})
	});	
}
