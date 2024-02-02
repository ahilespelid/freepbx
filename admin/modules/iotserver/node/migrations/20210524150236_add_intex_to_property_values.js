exports.up = knex => knex.schema.alterTable('user_property_values', (table) =>{
	table.string('value', 128).notNullable().index().alter();
});

exports.down = knex => knex.schema.alterTable('user_property_values', (table) =>{
	table.string('value', 128).notNullable().alter();
});
