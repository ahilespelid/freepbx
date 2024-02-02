
exports.up = knex=> knex.schema.alterTable('user_property_values',t=>{
    t.string("value",256).alter();
})

exports.down = function(knex, Promise) {
  
};
