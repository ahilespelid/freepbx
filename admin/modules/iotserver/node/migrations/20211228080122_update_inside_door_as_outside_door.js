const Group = require('../src/models/Group.js');

exports.up = function(knex, Promise) {
	return new Promise((resolve,reject)=>{
		Group.where('type', '=', 'Inside Door').fetchAll().then((groups)=>{
			var q = require('q');
			var promises = [];
            groups.forEach((group) => {
                group.set('type', 'Outside Door');
                promises.push(group.save());
            });

			q.all(promises).then(()=>{
				resolve()
			})
		})
	})
};

exports.down = function(knex, Promise) {
  
};