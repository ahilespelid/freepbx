const log = require('../../lib/log');
const Guests = require('../../models/Guests.js');
const CommonAPI = require('./common-api.js');

function getAll(filter_name = null, filter_values = null) {
	return new Promise((resolve,reject)=>{
		var qb = Guests;
		if (filter_name !== null && filter_values !== null) {
			qb = qb.where(filter_name, 'in', filter_values);
		}
        qb.where('status', '!=', 'deleted').fetchAll().then((guests) => {
            var _guests = guests ? guests.toJSON() : [];
			resolve(_guests);
        }).catch((error) => {
			log.warn(error);
			resolve([]);
		})
	})
}


module.exports.getAll = (filter_name = null, filter_values = null) =>{
	return new Promise((resolve,reject)=>{
		getAll(filter_name, filter_values).then((guests)=>{
			resolve(guests);
		}).catch((error)=>{
			reject(error)
		})
	})
}

module.exports.createGuestProfile = (data) =>{
	return new Promise((resolve,reject)=>{

		if (data.name == undefined) {
			return reject('Missing mandatory name field');
		}

		if (data.email == undefined) {
			return reject('Missing mandatory email field');
		}

		if (data.status == undefined) {
			return reject('Missing mandatory status field');
		}

		if (data.access_scope == undefined) {
			return reject('Missing mandatory access_scope field');
		}

		if (data.invite_status == undefined) {
			return reject('Missing mandatory invite_status field');
		}

		if (data.org_id == undefined) {
			return reject('Missing mandatory org_id field');
		}

		
		if (data.token == undefined) {
			return reject('Missing mandatory token field');
		}



		if (!data.end_timestamp_utc || data.end_timestamp_utc == "") {
		//	delete data.expiry;
			data.end_timestamp_utc = null;
		}

		var guestprof = new Guests(data);
		var result = undefined;
		guestprof.save().then((_prof)=>{
			result = _prof.toJSON();
			resolve(result);
		}).catch((error)=>{
			CommonAPI.formatErrors(error,"Guest Access", data.name).then((err_msg) => {
				reject(err_msg);
			}).catch((err) => {
				reject(err);
			})
		})
	})
}

function updateGuestImpl(prof, data) {
	return new Promise((resolve,reject)=>{
		var result = undefined;
		var _prof = undefined;
		var isRunning = false;
		var func = undefined;
		_prof = prof;
		func = Promise.resolve();
		func.then(()=>{
			Object.keys(data).forEach(function(key) {
			 if (!["id"].includes(key)) {
					_prof.set(key, data[key]);
				}
			});
			return _prof.save();
		}).then((_prf)=>{
			result = _prf.toJSON();
			resolve(result);
		}).catch((error)=>{
			reject(error)
		})
	})
}

module.exports.updateGuest = (id, data) =>{
	return new Promise((resolve,reject)=>{
		Guests.where('id', '=', id).fetch().then((guestprof)=>{
			if (!guestprof) {
				return reject('Unknown Guest with id ' + id);
			}
			return updateGuestImpl(guestprof, data)
		}).then((result)=>{
			resolve(result);
		}).catch((error)=>{
			reject(error)
		})
	})
}
module.exports.getGuest = (id) => {
	return new Promise((resolve,reject)=>{
		Guests.where('id', '=', id).fetch().then((guestprof)=>{
			resolve(guestprof);
		}).catch((error)=>{
			reject(error)
		})
	})
}
module.exports.removeGuestProfile = (id) => {
	return new Promise((resolve, reject) => {
		Guests.where('id', '=', id).fetch().then((prof) => {
			if (!prof) {
				return resolve();
			}
			prof.set('status', 'deleted');
			prof.set('deletedAt', Date.now().toString());
			return prof.save();
		}).then((_prof) => {
			resolve(_prof)
		}).catch((error) => {
			reject(error)
		})
	})
}

function removeAllDeletedGuests(filter_name = null, condition = null, filter_values = null) {
	return new Promise((resolve,reject)=>{
		var qb = Guests;
		if (filter_name !== null && filter_values !== null && condition !== null) {
			qb = qb.where(filter_name, condition, filter_values);
		}
        qb.where('status', '=', 'deleted').destroy().then(() => {
			resolve();
        }).catch((error) => {
			log.warn(error);
			resolve([]);
		})
	})
}

module.exports.removeAllDeletedGuests = () =>{
	return new Promise((resolve, reject) => {
		// removing the guest users deleted before 10 days.
		var time = (Date.now() - (10 * 24 * 60 * 60 * 1000));
		return removeAllDeletedGuests('deletedAt','<', time).then(()=>{
			resolve();
		}).catch((error)=>{
			reject(error)
		})
	})
}

module.exports.updateExpiredGuestStatus = () =>{
	return new Promise((resolve, reject) => {
		return getAll().then((guests) => {
			var now = Date.now();
			var ids = [];
			guests.forEach((guest) => {
				if (now >= Date.parse(guest.expiry)) {
					ids.push(guest.id);
				}
			});
			return ids;
		}).then((ids) => {
			var q = require('q');
			var promise = [];
			ids.forEach((id) => {
				Guests.where('id', "=", id).fetch().then((guest) => {
					guest.set("status", "expired");
					promise.push(guest.save());
				})
			})
			return q.all(promise);
		}).then(() => {
			resolve();
		}).catch((error)=>{
			reject(error)
		})
	})
}
