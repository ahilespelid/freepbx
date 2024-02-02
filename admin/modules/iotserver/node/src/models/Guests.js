const Joi = require('joi');
const _ = require('lodash');
const BaseModel = require('./helpers/base');

const required = { is: true, then: Joi.required() };

/**
 * An Extension could be a real user or device.
 * @type Extension
 */
const Guests = BaseModel.extend({
    tableName: 'guests',
    hasTimestamps: ['createdAt', 'updatedAt'],
    schema: {
	    id: Joi.number().integer(),
        name: Joi.string().when('$creating',required),
        email: Joi.string().email({ minDomainSegments: 2, tlds: { allow: ['com', 'net'] } }),
        status: Joi.string().valid('enabled', 'disabled', 'expired', 'deleted').when('$creating', required),
        invite_status: Joi.string().valid('Not applicable', 'Invite sent', 'Inviting', 'Deleted').when('$creating',required),
        access_scope: Joi.string().when('$creating',required),
        org_id: Joi.string().when('$creating',required),
        end_timestamp_utc: Joi.date().allow(null),
        expiry: Joi.string().allow(null),
        token: Joi.string().when('$creating', required),
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
}, {
    /* collection properties */
});

module.exports = Guests
