exports.up = knex => knex.schema.createTable('event_history', (table) =>{
	table.increments('id').primary().unsigned().notNullable();
	table.string('event_type', 64).notNullable().index();
	table.string('event_value', 64).notNullable();
	table.string('event_time','DATETIME(6)').notNullable().index();
	table.string('event_uuid', 64).notNullable().index();
	table.string('event_object_uuid', 64).notNullable().index();
	table.string('event_object_type', 64).notNullable().index();
	table.string('user_id', 64).nullable().index();
});

exports.down = knex => knex.schema.dropTable('event_history');