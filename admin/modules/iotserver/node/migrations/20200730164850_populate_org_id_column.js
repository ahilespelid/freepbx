const models = require('../src/models')
const log = require('../src/lib/log.js')
const org_key = 'smart_office_org';

function hasOrgId(key) {
	return (models[key].prototype.schema['org_id'] !== undefined);
}

exports.up = function(knex, Promise) {
	return new Promise((resolve,reject)=>{
		const FreePBX = require('../src/lib/zulu/Platform/FreePBX');
		const platform = new FreePBX();
		var org = undefined;
		var promises = [];
		var q = require('q');
		platform.initialize().then(()=>{
			platform.kvGet(org_key).then((orgInfo)=>{
				try {
					log.debug('Populate org_id migration: Got org info ' + orgInfo)
					org = JSON.parse(orgInfo);
					if (org && org.org_id) {
						Object.keys(models).forEach(function(key) {
							log.debug('Populate org_id migration: Checking org_id column for  ' + key)
							if (hasOrgId(key) === true) {
								promises.push(knex(models[key].prototype.tableName).update('org_id', org.org_id))
							}
						})
					}
					q.all(promises).then(()=>{
						resolve();
					}).catch((err)=>{
						resolve();
					});
				} catch(e) {
					resolve();
				}
			}).catch((err)=>{
				resolve();
			});	
		}).catch((err)=>{
			resolve();
		});	
	})		
};

exports.down = function(knex, Promise) {
  return Promise;
};