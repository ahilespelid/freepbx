"use strict";
/* 
 * This file handles the find me follow me feature operations
 */

const Promise = require('bluebird');
const mysql = require('mysql');
const aRows = require('../lib/db/aRows.js');
const child_process = require('child_process');
const fpbxSettings = require('../lib/freepbxsettings.js');
const Account = require("../lib/account.js");
const myServerUuid = require('../lib/serverid.js').getId();

const errorCodes = {
	2000: 'Extension linked to the user not found!',
	2001: 'Value should be between 0 and 60',
	2002: 'Value should be between 1 and 60',
	2003: 'Invalid extension'
};

const columns = {
	enabled: 'ddial',
	initialRingTime: 'pre_ring',
	ringTime: 'grptime',
	confirmCalls: 'needsconf',
	extension: 'grplist',
};

const asteriskColumns = {
	enabled: 'ddial',
	initialRingTime: 'prering',
	ringTime: 'grptime',
	confirmCalls: 'grpconf',
	extension: 'grplist',
};

module.exports = {};

module.exports.getSettings = async function (accountId) {

	const defaultExtension = await getDefaultExtension(accountId);
	let extensionDetails = await validateExtension(defaultExtension);
	if (!extensionDetails) {
		return {
			status: false,
			code: 2000,
			message: errorCodes[2000]
		};
	}
	let data = await getFindMeFollowMeData(defaultExtension);
	if (!data) {
		data = {
			'grpnum': defaultExtension,
			'grptime': '20',
			'grplist': defaultExtension,
			'needsconf': false,
			'pre_ring': ''
		};
	}
	data.ddial = await getDDial(defaultExtension);

	data.pre_ring = await processData(data.pre_ring, defaultExtension, 'FOLLOWME_PRERING', 'prering');
	data.grptime = await processData(data.grptime, defaultExtension, 'FOLLOWME_TIME', 'grptime');
	data.grplist = await processData(data.grplist, defaultExtension, '', 'grplist');
	data.needsconf = await processData(data.needsconf, defaultExtension, '', 'grpconf');

	let settings = {};
	if (data) {
		let groupList = data.grplist ? data.grplist.split('-') : [];
		settings = {
			'account': Account(accountId, myServerUuid),
			'extension': data.grpnum,
			'enabled': data.ddial,
			'initialRingTime': data.pre_ring,
			'ringTime': data.grptime,
			'confirmCalls': data.needsconf ? true : false,
			'groupList': groupList
		}
	}

	return {
		status: true,
		data: settings
	};
}

module.exports.updateSettings = async function (swvxState, params, session) {

	const accountId = session.account.accountId;
	const action = params.action;
	const key = params.key;
	const value = params.value;

	const defaultExtension = await getDefaultExtension(accountId);
	let extensionDetails = await validateExtension(defaultExtension);
	if (!extensionDetails) {
		return {
			status: false,
			code: 2000,
			message: errorCodes[2000]
		};
	}
	let command = '';

	switch (key) {
		case 'enabled':
			await updateAsteriskFindMeFollowMeData(defaultExtension, asteriskColumns[key], ((value == '1') ? 'DIRECT' : 'EXTENSION'));
			let dialState = (value == '1') ? 'BUSY' : 'NOT_INUSE';
			// get devices from asterisk db
			command = "database show AMPUSER/" + defaultExtension + "/device";
			let response = await executeAsteriskCommand(command);
			let devices = response ? response.split('&') : [];
			if (devices) {
				devices.forEach(device => {
					command = "dialplan set global DEVICE_STATE(Custom:FOLLOWME" + device + ") " + dialState;
					executeAsteriskCommand(command, false);
				});
			}
			break;

		case 'initialRingTime':
			if (value < 0 || value > 60) {
				return {
					status: false,
					code: 2001,
					message: errorCodes[2001]
				};
			}
			await updateFindMeFollowMeData(defaultExtension, columns[key], value);
			await updateAsteriskFindMeFollowMeData(defaultExtension, asteriskColumns[key], value);
			break;

		case 'ringTime':
			if (value < 1 || value > 60) {
				return {
					status: false,
					code: 2002,
					message: errorCodes[2002]
				};
			}
			await updateFindMeFollowMeData(defaultExtension, columns[key], value);
			await updateAsteriskFindMeFollowMeData(defaultExtension, asteriskColumns[key], value);
			break;

		case 'confirmCalls':
			await updateFindMeFollowMeData(defaultExtension, columns[key], ((value == '1') ? 'CHECKED' : ''));
			await updateAsteriskFindMeFollowMeData(defaultExtension, asteriskColumns[key], ((value == '1') ? 'ENABLED' : 'DISABLED'));
			break;

		case 'extension':
			// # at the end of the number means outside phone number
			// so no need to validate
			if (value.slice(-1) != '#') {
				let userId = await getUserId(value);
				if (!userId) {
					return {
						status: false,
						code: 2003,
						message: errorCodes[2003]
					};
				}
			}
			// get find me follow me data from asterisk db
			command = "database show AMPUSER/" + defaultExtension + "/followme/" + asteriskColumns[key];
			let data = await executeAsteriskCommand(command);
			let groupList = data ? data.split('-') : [];
			if (action == 'add' && !groupList.includes(value)) {
				groupList.push(value);
			} else if (action == 'remove' && groupList.includes(value)) {
				let index = groupList.indexOf(value);
				if (index !== -1) {
					groupList.splice(index, 1);
				}
			}
			let newGroupList = groupList.join('-');
			await updateFindMeFollowMeData(defaultExtension, columns[key], newGroupList);
			await updateAsteriskFindMeFollowMeData(defaultExtension, asteriskColumns[key], newGroupList);
			break;

		default:
			break;
	}
	
	swvxState.emit('state.change.findmefollowme.status', {
		topic: 'findmefollowme.options.list',
		session: session
	});

	return {status: true};
}

/**
 * get the find me follow me data of an extension
 * @param {string} defaultExtension extension
 * @returns {array}
 */
async function getFindMeFollowMeData(defaultExtension) {

	let sql = "SELECT `grpnum`, `grptime`, `grplist`, `needsconf`, `pre_ring` FROM findmefollow INNER JOIN `users` ON `extension` = `grpnum` WHERE `grpnum` = ?";
	sql = mysql.format(sql, [defaultExtension]);

	return aRows.single(sql);
}

/**
 * get the extension number of a user by the account id
 * @param {number} accountId account id of the user
 * @returns {string}
 */
async function getDefaultExtension(accountId) {

	let sql = "SELECT `default_extension` FROM userman_users WHERE `id` = ?";
	sql = mysql.format(sql, [accountId]);

	return aRows.singleValue(sql);
}

/**
 * get the extension details
 * @param {number} extension extension
 * @returns {string}
 */
async function validateExtension(extension) {

	let sql = "SELECT * FROM devices WHERE `id` = ?";
	sql = mysql.format(sql, [extension]);

	return aRows.single(sql);
}

/**
 * get the account id of a user by the extension number
 * @param {number} defaultExtension extension
 * @returns {string}
 */
async function getUserId(defaultExtension) {

	let sql = "SELECT `id` FROM userman_users WHERE `default_extension` = ?";
	sql = mysql.format(sql, [defaultExtension]);

	return aRows.singleValue(sql);
}

/**
 * get enabled status of find me follow me
 * @param {string} defaultExtension extension
 * @returns {boolean}
 */
async function getDDial(defaultExtension) {

	let command = "asterisk -rx 'database show AMPUSER/" + defaultExtension + "/followme/ddial'";
	let response = await new Promise((resolve, reject) => {
		let cp = child_process.exec(command, (err, stdout, stderr) => {
			let results = stdout.split('\n');
			if (results) {
				for (let result of results) {
					if (result) {
						let data = result.match(/^\/AMPUSER\/\d+\/followme\/.*:/);
						if (data) {
							let matches = result.split(':');
							if (matches) {
								resolve(matches[1].trim());
							}
						}
					}
				}
			}
			resolve(false);
		});
	});
	if (response == 'EXTENSION') {
		return false;
	} else if (response == 'DIRECT') {
		return true;
	} else {
		// if here then followme must not be set so use default
		let followMeDisabled = await fpbxSettings.generalSettings('FOLLOWME_DISABLED');
		return followMeDisabled == '1' ? false : true;
	}
}

/**
 * get the value from asterisk db and check for any change
 * @param {string} value fmfm option value
 * @param {string} defaultExtension extension
 * @param {string} key freepbx general settings key
 * @param {string} astdbKey key for asterisk db
 * @returns {string}
 */
async function processData(value, defaultExtension, key, astdbKey) {

	if (!value && key) {
		// check the general settings value
		value = await fpbxSettings.generalSettings(key);
	}
	// get find me follow me data from asterisk db
	let command = "database show AMPUSER/" + defaultExtension + "/followme/" + astdbKey;
	let response = await executeAsteriskCommand(command);
	if (astdbKey == 'grpconf') {
		// applicable only to Confirm Calls option
		response = (response == 'ENABLED') ? 'CHECKED' : '';
	}
	if (response && response != value) {
		value = response;
	}

	return value;
}

/**
 * 
 * execute asterisk command
 * @param {string} command asterisk command
 * @param {boolean} needResponse whether to extract the response and return a value
 * @returns {string}
 */
async function executeAsteriskCommand(command, needResponse = true) {

	return await new Promise((resolve, reject) => {
		let cp = child_process.exec("asterisk -rx '" + command + "'", (err, stdout, stderr) => {
			if (!needResponse) {
				resolve(true);
			}
			let results = stdout.split('\n');
			if (results) {
				for (let result of results) {
					if (result) {
						let data = result.match(/^.*:/);
						if (data) {
							let matches = result.split(':');
							if (matches) {
								resolve(matches[1].trim());
							}
						}
					}
				}
			}
			resolve(false);
		});
	});
}

/**
 * update find me follow me table
 * @param {string} defaultExtension extension
 * @param {string} field field name
 * @param {string} value new value
 * @returns 
 */
async function updateFindMeFollowMeData(defaultExtension, field, value) {

	let fields = 'grpnum,' + field;
	let sql = `INSERT INTO findmefollow (${fields}) VALUES (?, ?) ON DUPLICATE KEY UPDATE ${field} = ?`;
	sql = mysql.format(sql, [defaultExtension, value, value]);

	return aRows.do(sql);
}

/**
 * update find me follow me data in asterisk db
 * @param {string} defaultExtension extension
 * @param {string} astdbKey asterisk db field name
 * @param {string} value new value
 * @returns 
 */
async function updateAsteriskFindMeFollowMeData(defaultExtension, astdbKey, value) {
	let command = "asterisk -rx 'database put AMPUSER " + defaultExtension + "/followme/" + astdbKey + " " + value + "'";
	return await new Promise((resolve, reject) => {
		let cp = child_process.exec(command, (err, stdout, stderr) => {
			resolve(stdout);
		});
	});
}