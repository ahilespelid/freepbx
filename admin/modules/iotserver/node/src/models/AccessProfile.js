const Joi = require('joi');
const _ = require('lodash');
const BaseModel = require('./helpers/base');

const required = { is: true, then: Joi.required() };

/**
 * An Extension could be a real user or device.
 * @type Extension
 */
const AccessProfile = BaseModel.extend({
    tableName: 'access_profiles',
    hasTimestamps: ['createdAt', 'updatedAt'],
    schema: {
	    id: Joi.number().integer(),
        name: Joi.string().when('$creating',required),
        type: Joi.string().valid('user', 'guest','usertimed').when('$creating',required),
        status: Joi.string().valid('active', 'running', 'disabled', 'expired', 'deleted').when('$creating',required),
        access_scope: Joi.string().valid('location', 'zone', 'scene', 'group').when('$creating',required),
        scope_object_uuid: Joi.string().when('$creating',required),
        org_id: Joi.string().when('$creating',required),
        start: Joi.string().allow(null),
        start_timestamp_utc: Joi.date().allow(null),
        end: Joi.string().allow(null),
        end_timestamp_utc: Joi.date().allow(null),
        pincode: Joi.string().when('$creating',required),
        details: Joi.string().allow(null),
        createdAt: Joi.date(),
        updatedAt: Joi.date(),
	},

    initialize() {
        this.on('creating', this.needsSchedule);
        this.on('saving', BaseModel.prototype.validate);
    },
    
    serialize(...args) {
        const res = BaseModel.prototype.serialize.apply(this, args);
        // remove internal ids from object
        return res;
    },
    needsSchedule() {
        const start = this.attributes.start;
        const end = this.attributes.end;
        const type = this.attributes.type;

        if (type == 'guest' && ([null, undefined].includes(start) || [null, undefined].includes(end))) {
            return Promise.reject('Schedule is mandatory for guest access profiles');
        }
        return Promise.resolve();
    },
    objectProperties () {
        return this.hasMany('ObjectProperty', 'property_id', 'id');
    },

}, {
    /* collection properties */
});

module.exports = AccessProfile
