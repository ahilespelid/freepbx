
const config = require('config');
exports.up = knex => knex.schema.table('locations', (table) =>{
	table.string('org_id', 64).notNullable().default(config.iot.default_org_id);
}).table('gateways', (table) =>{
	table.string('org_id', 64).notNullable().default(config.iot.default_org_id);
}).table('zones', (table) =>{
	table.string('org_id', 64).notNullable().default(config.iot.default_org_id);
}).table('scenes', (table) =>{
	table.string('org_id', 64).notNullable().default(config.iot.default_org_id);
}).table('groups', (table) =>{
	table.string('org_id', 64).notNullable().default(config.iot.default_org_id);
}).table('devices', (table) =>{
	table.string('org_id', 64).notNullable().default(config.iot.default_org_id);
}).table('location_permissions', (table) =>{
	table.string('org_id', 64).notNullable().default(config.iot.default_org_id);
}).table('zone_permissions', (table) =>{
	table.string('org_id', 64).notNullable().default(config.iot.default_org_id);
}).table('scene_permissions', (table) =>{
	table.string('org_id', 64).notNullable().default(config.iot.default_org_id);
}).table('group_permissions', (table) =>{
	table.string('org_id', 64).notNullable().default(config.iot.default_org_id);
});

exports.down = knex => knex.schema.table('locations', (table) =>{
	table.dropColumn('org_id');
}).table('gateways', (table) =>{
	table.dropColumn('org_id');
}).table('zones', (table) =>{
	table.dropColumn('org_id');
}).table('scenes', (table) =>{
	table.dropColumn('org_id');
}).table('groups', (table) =>{
	table.dropColumn('org_id');
}).table('devices', (table) =>{
	table.dropColumn('org_id');
}).table('location_permissions', (table) =>{
	table.dropColumn('org_id');
}).table('zone_permissions', (table) =>{
	table.dropColumn('org_id');
}).table('scene_permissions', (table) =>{
	table.dropColumn('org_id');
}).table('group_permissions', (table) =>{
	table.dropColumn('org_id');
});
