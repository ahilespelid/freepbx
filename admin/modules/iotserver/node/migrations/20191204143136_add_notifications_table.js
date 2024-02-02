
const config = require('config');
exports.up = knex => knex.schema.createTable('notifications', (table) =>{
	table.increments('id').primary().unsigned().notNullable();
	table.string('type', 32).notNullable().index();
	table.boolean('email_status_change').notNullable().default(false);
	table.string('obj_type', 32).notNullable().index();
	table.string('obj_uuid', 64).notNullable().index();
	table.string('severity', 32).notNullable();
	table.string('status', 32).nullable().default(null);
	table.text('text').nullable().default(null);
	table.text('raw_data').notNullable();
	table.string('uuid', 64).notNullable().index();
	table.string('org_id', 64).notNullable().default(config.iot.default_org_id).index();
	table.text('permission_groups').nullable().default(null);
	table.mediumText('details',128).nullable().default(null);
	table.string('open_time','DATETIME(6)').notNullable().index();
	table.string('ack_time','DATETIME(6)').nullable().default(null).index();
	table.string('close_time','DATETIME(6)').nullable().default(null).index();
});

exports.down = knex => knex.schema.dropTable('notifications');