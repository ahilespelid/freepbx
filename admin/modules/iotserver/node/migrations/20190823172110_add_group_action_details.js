
const config = require('config');
const Group = require('../src/models/Group.js');
const GroupApi = require('../src/api/iot/group-api.js');

exports.up = function(knex, Promise) {
	return new Promise((resolve,reject)=>{
		Group.fetchAll().then((groups)=>{
			var q = require('q');
			var promises = [];
			groups.forEach((group)=>{
				var actions = group.get("actions");
				var groupDetails = group.get("details") ? JSON.parse(group.get("details")) : {};
				if (actions) {
					groupDetails.actions = GroupApi.getGroupActions(group);
					group.set("details", JSON.stringify(groupDetails));
					promises.push(group.save());
				}
			})
			q.all(promises).then(()=>{
				resolve()
		
			})
		})
	})
};

exports.down = function(knex, Promise) {
  
};
