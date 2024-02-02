
const Device = require('../src/models/Device.js');

exports.up = function(knex, Promise) {
	return new Promise((resolve,reject)=>{
		Device.where('type', '=', 'sensor').fetchAll().then((devices)=>{
			var q = require('q');
			var promises = [];
			devices.forEach((device)=>{
				var details = device.get('details') ? device.get('details') : {};
				details = (typeof details === 'string') ? JSON.parse(details) : details;
				var name = device.get('name')

				if (name.includes("Motion")) {
					device.set('type', 'motion');	
				} else if (details.dataGroups) {
					details.dataGroups.forEach((grp)=>{
						if (grp.ldevKey == "alarm" && grp.dpKey == "flood") {
							device.set('type', 'water');
						}
					})
				}
				promises.push(device.save());
			})

			q.all(promises).then(()=>{
				resolve()
			})
		})
	})
};

exports.down = function(knex, Promise) {
  
};
