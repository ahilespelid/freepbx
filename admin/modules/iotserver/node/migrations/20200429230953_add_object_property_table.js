
exports.up = knex => knex.schema.createTable('object_properties', (table) =>{
	table.increments('id').primary().unsigned().notNullable();
	table.string('org_id', 64).notNullable().index()
	table.string('property_name', 64).notNullable().index();
	table.string('property_type', 64).notNullable().index();
	table.string('property_id',64).notNullable().index();
	table.string('object_uuid', 64).notNullable().index();
	table.string('object_type', 64).notNullable().index();
	table.string('property_value', 128).notNullable();
	table.mediumText('details',128).nullable().default(null);
	table.string('createdAt','DATETIME(6)').notNullable();
	table.string('updatedAt','DATETIME(6)').notNullable();	
	table.unique(['property_id', 'property_type', 'object_uuid']);
});

exports.down = knex => knex.schema.dropTable('object_properties');
