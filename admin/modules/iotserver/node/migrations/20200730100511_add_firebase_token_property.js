
exports.up = knex => knex("user_property_fields").insert([{ name: "firebase_token", description: 'firebase token to send push notifications', createdAt: knex.fn.now(), updatedAt: knex.fn.now() }])

exports.down = knex => knex('user_property_fields').whereIn('name', ['firebase_token']).del();
