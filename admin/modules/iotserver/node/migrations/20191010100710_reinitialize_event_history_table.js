const EventHistory = require('../src/models/EventHistory.js');

exports.up = function(knex, Promise) {
	return new Promise((resolve,reject)=>{
		EventHistory.destroyAll().then(()=>{
			resolve()
		})
	})
};

exports.down = function(knex, Promise) {
  
};