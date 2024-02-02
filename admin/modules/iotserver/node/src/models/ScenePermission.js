const Joi = require('joi');
const _ = require('lodash');
const PermissionModel = require('./PermissionModel.js');
const bookshelf = require('../lib/bookshelf');
const required = { is: true, then: Joi.required() };

/**
 * An Extension could be a real user or device.
 * @type Extension
 */
const ScenePermission = PermissionModel.extend({
    tableName: 'scene_permissions',
    hasTimestamps: ['createdAt', 'updatedAt'],
    schema: {
	    id: Joi.number().integer(),
        scene_uuid: Joi.string().when('$creating',required),
        org_id: Joi.string().when('$creating',required),
        permission_type_id: Joi.number().integer().when('$creating',required),
        local_access: Joi.number().integer().when('$creating',required),
        user_id: Joi.string().allow(null),
        user_group_id: Joi.number().integer().allow(null),
        createdAt: Joi.date(),
        updatedAt: Joi.date(),
	},


}, {
    /* collection properties */
});

module.exports =  bookshelf.model('scene_permission', ScenePermission)