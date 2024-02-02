exports.up = knex => knex.schema.createTable('locations', (table) =>{
	    table.increments('id').primary().unsigned().notNullable();
	    table.string('name', 64).notNullable().unique();	
	    table.string('uuid', 64).notNullable().unique();	      
	    table.text('actions').nullable().default(null);
	    table.mediumText('details',128).nullable().default(null);
	    table.integer('temperature').nullable().default(null);
	    table.string('createdAt','DATETIME(6)').notNullable();
	    table.string('updatedAt','DATETIME(6)').notNullable();
	}).createTable('gateways',(table) =>{
		table.increments('id',11).primary().unsigned().notNullable();
	    table.string('name', 64).notNullable().unique();	
	    table.string('uuid', 64).notNullable().unique();
	    table.string('location_uuid', 64)
	    	.nullable()
	    	.index()
	    	.default(null)
	    	.references('uuid')
            .inTable('locations')
            .onDelete('CASCADE');	      
	    table.text('actions').nullable().default(null);
	    table.string('createdAt','DATETIME(6)').notNullable();
	    table.string('updatedAt','DATETIME(6)').notNullable();
	}).createTable('zones',(table) =>{
		table.increments('id').primary().unsigned().notNullable();
	    table.string('name', 64).notNullable().unique();	
	    table.string('uuid', 64).notNullable().unique();
	    table.string('location_uuid', 64)
	        .nullable()
	        .index()
	    	.default(null)
	    	.references('uuid')
            .inTable('locations')
            .onDelete('CASCADE');
        table.string('status', 36).nullable().default(null);
        table.string('state', 36).nullable().default(null);		      
	    table.text('actions').nullable().default(null);
	    table.mediumText('details',128).nullable().default(null);
	    table.integer('temperature').nullable().default(null);
	    table.string('createdAt','DATETIME(6)').notNullable();
	    table.string('updatedAt','DATETIME(6)').notNullable();
	}).createTable('scenes',(table) =>{
		table.increments('id').primary().unsigned().notNullable();
	    table.string('name', 64).notNullable().unique();	
	    table.string('uuid', 64).notNullable().unique();
	    table.string('zone_uuid', 64)
	    	.nullable()
	    	.index()
	    	.default(null)
	    	.references('uuid')
            .inTable('zones')
            .onDelete('CASCADE');		      
	    table.text('actions').nullable().default(null);
	    table.mediumText('details',128).nullable().default(null);
	    table.integer('temperature').nullable().default(null);
	    table.string('createdAt','DATETIME(6)').notNullable();
	    table.string('updatedAt','DATETIME(6)').notNullable();
	}).createTable('groups',(table) =>{
		table.increments('id').primary().unsigned().notNullable();
	    table.string('name', 64).notNullable().unique();	
	    table.string('uuid', 64).notNullable().unique();
	    table.string('scene_uuid', 64)
	        .nullable()
	        .index()
	    	.default(null)
	    	.references('uuid')
            .inTable('scenes')
            .onDelete('CASCADE');		      
	    table.text('actions').nullable().default(null);
	    table.mediumText('details',128).nullable().default(null);
	    table.string('status', 36).nullable().default(null);
	    table.string('type', 36).nullable().default(null);
	    table.string('createdAt','DATETIME(6)').notNullable();
	    table.string('updatedAt','DATETIME(6)').notNullable();
	}).createTable('devices',(table) =>{
		table.increments('id').primary().unsigned().notNullable();
	    table.string('name', 64).notNullable().unique();	
	    table.string('uuid', 64).notNullable().unique();
	    table.string('group_uuid', 64)
	        .nullable()
	        .index()
	    	.default(null)
	    	.references('uuid')
            .inTable('groups')
            .onDelete('CASCADE');	
	    table.string('gateway_uuid', 64)
	        .nullable()
	        .index()
	    	.default(null)
	    	.references('uuid')
            .inTable('gateways')
            .onDelete('CASCADE');		      
	    table.text('actions').nullable().default(null);
	    table.mediumText('details',128).nullable().default(null);
	    table.string('state', 36).nullable().default(null);	
	    table.string('status', 36).nullable().default(null);
	    table.string('type', 36).nullable().default(null);
	    table.string('createdAt','DATETIME(6)').notNullable();
	    table.string('updatedAt','DATETIME(6)').notNullable();
	});

exports.down = knex => knex.schema.dropTable('devices')
	.dropTable('gateways')
	.dropTable('groups')
	.dropTable('scenes')
	.dropTable('zones')
	.dropTable('locations');
