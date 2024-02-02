exports.up = knex => knex.schema.table('event_history', (table) =>{
	table.string('event_object_name', 64).notNullable().index();
	table.string('user_name', 64).nullable().index();	
});

exports.down = knex => knex.schema.table('event_history', (table) =>{
	table.dropColumn('event_object_name');
	table.dropColumn('user_name');
});
