
exports.up = function(knex, Promise) {

	return knex.schema.raw('SET foreign_key_checks = 0')
	.raw('ALTER TABLE gateways DROP FOREIGN KEY gateways_location_uuid_foreign')
	.raw('ALTER TABLE devices DROP FOREIGN KEY devices_group_uuid_foreign')
	.raw('SET foreign_key_checks = 1')
};

exports.down = function(knex, Promise) {
	return Promise;
};
