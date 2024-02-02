var apibridge = require('../lib/apibridge/apibridge.js');
var qperm = require('./qcallpermissions.js');
var ami = require("../lib/ami.js");
const featureLogs = require('../lib/featureLogs.js')
const queueFeatureName = 'queue';
// API bridge to look up Switchvox permissions
module.exports = function () { };

module.exports.prototype.connector = function () {
	var api = new apibridge.ApiConnection();
	api.getQueuePermission = function (args) {
		return qperm.getQueuePermission(args);
	};
	return api;
};

const astMgrPort = process.env['ASTMANAGERPORT'] || 5038;
var manager = new ami({
	port: astMgrPort,
	host: '127.0.0.1',
	username: 'srtapi_realtime',
	password: process.env.srtapi_realtime,
	event: 'on',
	reconnect: true
});

manager.on('userevent', function (evt) {
	if (evt.userevent === 'PermissionChange') {
		featureLogs.log(queueFeatureName, featureLogs.getLogContext(),`Q:event`,`Queue permission change event received. data:`, JSON.stringify(evt));
		qperm.purgeCache();
	}
});

manager.on('close', function () { });
manager.on('error', function () { });
