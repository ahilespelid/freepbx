
const Group = require('../src/models/Group.js');

exports.up = function(knex, Promise) {
	return new Promise((resolve,reject)=>{
		var q = require('q');
		var promises = [];
		Group.fetchAll().then((groups)=>{
			groups.forEach((group)=>{
				var details = group.get('details') ? JSON.parse(group.get('details')) : {};
				if (details['mustBeSecured'] === undefined) {
					details['mustBeSecured'] = false;
				}
				group.set('details', JSON.stringify(details));
				promises.push(group.save());
			})
			q.all(promises).then(()=>{
				resolve()
			})
		})
	})
};

exports.down = function(knex, Promise) {
  return Promise;
};
