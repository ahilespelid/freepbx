const Joi = require('joi');
const _ = require('lodash');
const BaseModel = require('./helpers/base');

const required = { is: true, then: Joi.required() };

/**
 * An Extension could be a real user or device.
 * @type Extension
 */
const PermissionType = BaseModel.extend({
    tableName: 'permission_types',
    hasTimestamps: ['createdAt', 'updatedAt'],
    schema: {
	    id: Joi.number().integer(),
	    type: Joi.string().when('$creating',required),
	    description: Joi.string().allow(null),
        createdAt: Joi.date(),
        updatedAt: Joi.date(),
	},

    initialize() {
       this.on('saving', BaseModel.prototype.validate);
    },
    
    serialize(...args) {
        const res = BaseModel.prototype.serialize.apply(this, args);
        // remove internal ids from object
        return res;
    },
}, {
    /* collection properties */
});

module.exports = PermissionType
