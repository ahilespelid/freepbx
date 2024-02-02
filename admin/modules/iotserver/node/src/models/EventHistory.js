const Bcrypt = require('bcrypt');
const Joi = require('joi');
const _ = require('lodash');
const BaseModel = require('./helpers/base');
const bookshelf = require('../lib/bookshelf');

const required = { is: true, then: Joi.required() };

/**
 * An Extension could be a real user or device.
 * @type Extension
 */
const EventHistory = BaseModel.extend({
    tableName: 'event_history',
    idPrefix: 'iot-',
    schema: {
	    id: Joi.number().integer(),
        org_id: Joi.string().when('$creating',required),
	    event_type: Joi.string().when('$creating',required),
        event_value: Joi.string().when('$creating',required),
        event_time: Joi.date().when('$creating',required),
        event_uuid: Joi.string().when('$creating',required),
        event_object_uuid: Joi.string().when('$creating',required),
        event_object_type: Joi.string().when('$creating',required),
        event_object_name: Joi.string().when('$creating',required),
        user_id: Joi.string().allow(null),
        user_name: Joi.string().allow(null),
        user_type: Joi.string().valid("User","Guest","").default("User"),
        details: Joi.string().allow(null),
	},

    initialize() {
        this.on('saving', BaseModel.prototype.validate);
        //BaseModel.prototype.initialize.call(this);
    },
    
    serialize(...args) {
        const res = BaseModel.prototype.serialize.apply(this, args);
        // remove internal ids from object
        return res;
    },
}, {
    /* collection properties */
});

module.exports =  bookshelf.model('event_history', EventHistory)