const Joi = require('joi');
const _ = require('lodash');
const BaseModel = require('./helpers/base');

const required = { is: true, then: Joi.required() };

/**
 * An Extension could be a real user or device.
 * @type Extension
 */
const AutomatedAction = BaseModel.extend({
    tableName: 'automated_actions',
    hasTimestamps: ['createdAt', 'updatedAt'],
    schema: {
	    id: Joi.number().integer(),
        name: Joi.string().when('$creating',required),
        type: Joi.string().valid('access_automation').when('$creating',required),
        desired_state: Joi.string().valid('Locked', 'Unlocked').when('$creating', required),
        status: Joi.string().valid('active', 'running', 'disabled', 'expired', 'deleted').when('$creating', required),
        org_id: Joi.string().when('$creating',required),
        scope_object_uuid: Joi.string().when('$creating',required),
        access_scope: Joi.string().when('$creating',required),
        start: Joi.string().allow(null),
        start_timestamp_utc: Joi.date().allow(null),
        end: Joi.string().allow(null),
        end_timestamp_utc: Joi.date().allow(null),
        details: Joi.string().allow(null),
        createdAt: Joi.date(),
        updatedAt: Joi.date(),
        deletedAt: Joi.string().allow(""),
	},

    initialize() {
        this.on('saving', BaseModel.prototype.validate);
    },
    serialize(...args) {
        const res = BaseModel.prototype.serialize.apply(this, args);
        return res;
    },
    objectProperties () {
        return this.hasMany('ObjectProperty', 'property_id', 'id');
    },
}, {
    /* collection properties */
});

module.exports = AutomatedAction