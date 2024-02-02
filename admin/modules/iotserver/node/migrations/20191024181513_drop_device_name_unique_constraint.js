
exports.up = function(knex, Promise) {

	return knex.schema.raw('ALTER TABLE devices DROP INDEX devices_name_unique, ADD INDEX `devices_name_index` (`name`)')};

exports.down = function(knex, Promise) {
	return Promise;
};