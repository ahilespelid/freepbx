
exports.up = function(knex, Promise) {

	return knex.schema.raw('ALTER TABLE zones DROP INDEX zones_name_unique, ADD UNIQUE `zones_name_unique` (`name`, `location_uuid`)')
	.raw('ALTER TABLE gateways DROP INDEX gateways_name_unique, ADD UNIQUE `gateways_name_unique` (`name`, `location_uuid`)')
	.raw('ALTER TABLE scenes DROP INDEX scenes_name_unique, ADD UNIQUE `scenes_name_unique` (`name`, `zone_uuid`)')
	.raw('ALTER TABLE groups DROP INDEX groups_name_unique, ADD UNIQUE `groups_name_unique` (`name`, `scene_uuid`)')
	.raw('ALTER TABLE devices DROP INDEX devices_name_unique, ADD UNIQUE `devices_name_unique` (`name`, `gateway_uuid`)')};

exports.down = function(knex, Promise) {
	return Promise;
};