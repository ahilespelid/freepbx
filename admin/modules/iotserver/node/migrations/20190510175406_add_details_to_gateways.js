exports.up = knex => knex.schema.table('gateways', (table) =>{
	table.mediumText('details',128).nullable().default(null);
	table.string('provider', 64).notNullable().index();	
});

exports.down = knex => knex.schema.table('gateways', (table) =>{
	table.dropColumn('details');
	table.dropColumn('provider');
});