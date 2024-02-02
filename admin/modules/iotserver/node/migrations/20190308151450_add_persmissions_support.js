exports.up = knex => knex.schema.createTable('permission_types', (table) =>{
	table.increments('id').primary().unsigned().notNullable();
	table.string('type', 64).notNullable().unique();
	table.text('description').nullable().default(null);
	table.string('createdAt','DATETIME(6)').notNullable();
	table.string('updatedAt','DATETIME(6)').notNullable();	
}).createTable('location_permissions',(table) =>{
	table.increments('id').primary().unsigned().notNullable();
	table.string('location_uuid', 64).notNullable()
		.index()
	    .references('uuid')
        .inTable('locations')
        .onDelete('CASCADE')
        .onUpdate('CASCADE');
	table.integer('permission_type_id', 10).unsigned()
		.notNullable()
		.index()
	    .references('id')
        .inTable('permission_types')
        .onDelete('CASCADE')
        .onUpdate('CASCADE');
    table.string('user_id', 64)
    	.nullable()
	    .index();
	table.integer('user_group_id', 11)
    	.nullable()
	    .index();
	table.string('createdAt','DATETIME(6)').notNullable();
	table.string('updatedAt','DATETIME(6)').notNullable();
}).createTable('zone_permissions',(table) =>{
	table.increments('id').primary().unsigned().notNullable();
	table.string('zone_uuid', 64).notNullable()
		.index()
	    .references('uuid')
        .inTable('zones')
        .onDelete('CASCADE')
        .onUpdate('CASCADE');
	table.integer('permission_type_id', 10).unsigned()
		.notNullable()
		.index()
	    .references('id')
        .inTable('permission_types')
        .onDelete('CASCADE')
        .onUpdate('CASCADE');
    table.string('user_id', 64)
    	.nullable()
	    .index();
	table.integer('user_group_id', 11)
    	.nullable()
	    .index();
	table.string('createdAt','DATETIME(6)').notNullable();
	table.string('updatedAt','DATETIME(6)').notNullable();
}).createTable('scene_permissions',(table) =>{
	table.increments('id').primary().unsigned().notNullable();
	table.string('scene_uuid', 64).notNullable()
		.index()
	    .references('uuid')
        .inTable('scenes')
        .onDelete('CASCADE')
        .onUpdate('CASCADE');
	table.integer('permission_type_id', 10).unsigned()
		.notNullable()
		.index()
	    .references('id')
        .inTable('permission_types')
        .onDelete('CASCADE')
        .onUpdate('CASCADE');
    table.string('user_id', 64)
    	.nullable()
	    .index();
	table.integer('user_group_id', 10)
    	.nullable()
	    .index();
	table.string('createdAt','DATETIME(6)').notNullable();
	table.string('updatedAt','DATETIME(6)').notNullable();
}).createTable('group_permissions',(table) =>{
	table.increments('id').primary().unsigned().notNullable();
	table.string('group_uuid', 64).notNullable()
		.index()
	    .references('uuid')
        .inTable('groups')
        .onDelete('CASCADE')
        .onUpdate('CASCADE');
	table.integer('permission_type_id', 10).unsigned()
		.notNullable()
		.index()
	    .references('id')
        .inTable('permission_types')
        .onDelete('CASCADE')
        .onUpdate('CASCADE');
    table.string('user_id', 64)
    	.nullable()
	    .index();
	table.integer('user_group_id', 10)
    	.nullable()
	    .index();
	table.string('createdAt','DATETIME(6)').notNullable();
	table.string('updatedAt','DATETIME(6)').notNullable();
});

exports.down = knex => knex.schema.dropTable('permission_types')
	.dropTable('location_permissions')
	.dropTable('zone_permissions')
	.dropTable('scene_permissions')
	.dropTable('group_permissions');