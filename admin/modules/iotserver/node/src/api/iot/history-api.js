const EventHistory = require('../../models/EventHistory.js');

function getAll(filter_name = null, filter_values = null) {
	return new Promise((resolve,reject)=>{
		var qb = EventHistory;
		if (filter_name && filter_values) {
			qb = qb.where(filter_name, 'in', filter_values);
		}
		qb.fetchAll().then((events)=>{
			var _events = events? events.toJSON() : [];
			_events.forEach((event)=>{
				event.objtype='events-history';
			});
			resolve(_events);
		});
	});
}

module.exports.getAll = () =>{
	return new Promise((resolve,reject)=>{
		getAll().then((events)=>{
			resolve(events);
		})
	});
}
module.exports.getUserEvents = (user_id) =>{
	return new Promise((resolve,reject)=>{
		getAll('user_id', [user_id]).then((event)=>{
			resolve(event);
		})	
	});
}

module.exports.getOrgEvents = (org_id) =>{
	return new Promise((resolve,reject)=>{
		getAll('org_id', [org_id]).then((event)=>{
			resolve(event);
		})
	});
}

module.exports.getObjectEvents = (object_uuid) =>{
	return new Promise((resolve,reject)=>{
		getAll('event_object_uuid', [object_uuid]).then((event)=>{
			resolve(event);
		})	
	});
}

module.exports.getEventsByRange = (startDate, endDate) =>{
	return new Promise((resolve,reject)=>{
		EventHistory.where('event_time', '<=', endDate).where('event_time', '>=', startDate).fetchAll().then((events)=>{
			var _events = events? events.toJSON() : [];
			_events.forEach((event)=>{
				event.objtype='events-history';
			});
			resolve(_events);
		});
	});
}
