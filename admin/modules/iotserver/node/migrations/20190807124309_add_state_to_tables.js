
exports.up = knex => knex.schema.table('gateways', (table) =>{
	table.string('state', 64).notNullable().default('ready');
}).table('groups', (table) =>{
	table.string('state', 64).notNullable().default('OK');
});

exports.down = knex => knex.schema.table('gateways', (table) =>{
	table.dropColumn('state');
}).table('groups', (table) =>{
	table.dropColumn('state');
});