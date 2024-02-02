
exports.up = knex => knex.schema.createTable('access_profiles', (table) =>{
	table.increments('id').primary().unsigned().notNullable();
	table.string('org_id', 64).notNullable().index()
	table.string('name', 64).notNullable().unique();
	table.string('type', 16).notNullable().index();
	table.string('status', 24).notNullable().index();
	table.string('access_scope', 64).notNullable().index();
	table.string('scope_object_uuid', 64).notNullable().index();
	table.string('pincode', 128).notNullable();
	table.string('start', 128).nullable().default(null).index();
	table.string('start_timestamp_utc','DATETIME(6)').nullable().default(null).index();
	table.string('end', 128).nullable().default(null).index();
	table.string('end_timestamp_utc','DATETIME(6)').nullable().default(null).index();
	table.mediumText('details',128).nullable().default(null);
	table.string('createdAt','DATETIME(6)').notNullable();
	table.string('updatedAt','DATETIME(6)').notNullable();	
});

exports.down = knex => knex.schema.dropTable('access_profiles');