"use strict";
var Promise = require('bluebird');
var switchvoxData = require('../lib/switchvoxData.js');
var Account = require('../lib/account.js');
var QueuePerm = require('../lib/queueperm.js');
var noQPerm = new QueuePerm();
var cache = {};
const featureLogs = require('../lib/featureLogs.js');
const queueFeatureName = 'queue';
// Exported method for looking up an accounts permission
// for a queue. Returns QueuePerm object.
function getQueuePermission(args) {
	var src = args.srcAccount;   // user account
	var trgt = args.trgtAccount; // queue account
	var deviceType = args.deviceType;

	if (!(src instanceof Account && trgt instanceof Account)) {
		return Promise.reject(new Error('missing or invalid argument'));
	}

	return Promise.bind({ cache: cache, src: src, trgt: trgt, deviceType: deviceType })
		.then(function () {
			// permissions stored as map from queue to user.
			let permKey = this.trgt;
			var perms = this.cache[permKey];
			if (!perms) {
				perms = switchvoxData.getCallQueuePermissions(this.trgt)
					.bind(this)
					.then(function (perms) {
						this.cache[permKey] = perms;
						return perms;
					});
				this.cache[permKey] = perms;
			}
			return perms;
		})
		.then(function (perms) {
			let key = this.src + '-' + this.deviceType;
			return perms[key] || noQPerm;
		});
}
exports.getQueuePermission = getQueuePermission;

function purgeCache() {
	cache = {};
}
exports.purgeCache = purgeCache;
