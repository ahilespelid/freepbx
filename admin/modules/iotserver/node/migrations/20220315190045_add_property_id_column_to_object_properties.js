exports.up = (knex,Promise) => knex.schema.hasColumn('object_properties','property_id').then( (exists) => {
	if(!exists){
        return knex.schema.alterTable('object_properties', (table) =>{
            table.integer('property_id', 15).notNullable().index();
            table.dropUnique(['property_name', 'property_type', 'object_uuid']);
            table.unique(['property_id', 'property_type', 'object_uuid']);
        });
    }else{
        return knex.schema.alterTable('object_properties', (table) =>{
            table.integer('property_id', 15).notNullable().alter();
        })
    }
});

exports.down = function(knex, Promise) {
    return Promise;
  };