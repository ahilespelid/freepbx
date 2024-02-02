const config = require('config');
exports.up = knex => knex.schema.table('event_history', (table) =>{
	table.string('org_id', 64).notNullable().default(config.iot.default_org_id);
});

exports.down = knex => knex.schema.table('event_history', (table) =>{
	table.dropColumn('org_id');
});