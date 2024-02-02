
const config = require('config');
exports.up = knex => knex.schema.createTable('user_property_fields', (table) =>{
	table.increments('id').primary().unsigned().notNullable();
	table.string('name', 64).notNullable().unique();
	table.text('description').nullable().default(null);
	table.string('createdAt','DATETIME(6)').notNullable();
	table.string('updatedAt','DATETIME(6)').notNullable();	
}).createTable('user_property_values',(table) =>{
	table.increments('id').primary().unsigned().notNullable();
	table.integer('property_field_id', 10).unsigned().notNullable()
		.index()
	    .references('id')
        .inTable('user_property_fields')
        .onDelete('CASCADE')
        .onUpdate('CASCADE');
    table.string('org_id', 64).notNullable()
    	.index()
    	.default(config.iot.default_org_id);
    table.integer('user_id', 11)
    	.notNullable()
	    .index();
	table.string('object_uuid', 64)
	    	.notNullable()
	    	.index();
	table.string('object_type', 64)
	    	.notNullable()
	    	.index();
	table.string('value', 128).notNullable();
	table.mediumText('details',128).nullable().default(null);
	table.string('createdAt','DATETIME(6)').notNullable();
	table.string('updatedAt','DATETIME(6)').notNullable();
});


exports.down = knex => knex.schema.dropTable('user_property_fields')
	.dropTable('user_property_fields');
