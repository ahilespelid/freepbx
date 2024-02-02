exports.up = knex=> knex.schema.alterTable('user_property_values',t=>{
    t.string("value",512).alter();
})

exports.down = function(knex, Promise) {
  
};
