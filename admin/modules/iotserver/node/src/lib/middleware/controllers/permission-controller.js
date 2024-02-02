const PermissionType = require('../../../models/PermissionType.js');
const log = require('../../log');
module.exports.init = async (app, router) =>{

	router.get('/permissions/types',(req,res)=>{
		let session = zulu.getSession(req.query.sessionid);
		if (!session || !session.user) {
			let msg = "Invalid user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}
		if (!session.user.is_admin) {
			let msg = "Permission types query not allowed to non admin user session " + req.query.sessionid;
			log.warn(msg);
			res.status(400).end(msg);
			return;
		}
		PermissionType.fetchAll().then((permission_types)=>{
			res.send(permission_types.toJSON());
		}).catch((error)=>{
			log.error(error);
			res.status(500).end('' + error);
		})
	});
}