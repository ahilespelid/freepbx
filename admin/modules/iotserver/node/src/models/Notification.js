const Bcrypt = require('bcrypt');
const Joi = require('joi');
const _ = require('lodash');
const BaseModel = require('./helpers/base');
const bookshelf = require('../lib/bookshelf');
const required = { is: true, then: Joi.required() };

/**
 */
const Notification = BaseModel.extend({
    tableName: 'notifications',
    idPrefix: 'iot-',
    hasTimestamps: ['open_time', null],
    schema: {
	    id: Joi.number().integer(),
        type: Joi.string().valid('device-state-alert', 'device-battery-level', 'gateway-state-alert', 'zone-alarm', 'zone-alert', 'group-alarm').when('$creating',required),
        email_status_change: Joi.boolean().when('$creating',required),
        obj_type: Joi.string().valid('gateway', 'device', 'group', 'zone').when('$creating',required),
        obj_uuid: Joi.string().when('$creating',required),
        severity: Joi.string().valid('normal', 'intermediate', 'warning', 'critical').when('$creating',required),
        status: Joi.string().valid('opened', 'closed', 'acked', 'unknown').when('$creating',required),
        text: Joi.string().allow(null).allow(''),
        raw_data: Joi.string().when('$creating',required),
        uuid: Joi.string().when('$creating',required),
        org_id: Joi.string().when('$creating',required),
	    permission_groups: Joi.array().allow(null).items(Joi.number().integer()),
        details: Joi.string().allow(null),
        open_time: Joi.date(),
        ack_time: Joi.date().allow(null),
        close_time: Joi.date().allow(null),
	},

    initialize() {
        this.on('saving', this.validate.bind(this));
    },

    validate(model, attrs, options) {
        // validate the model
        BaseModel.prototype.validate.call(this, model, attrs, options)

        // check if the status has changed
        if (this.hasChanged('status')) {
            // ask the notifier to advertise the status change
            var evt = {type: 'notification', isNew: this.isNew(), obj: this.toJSON()}
            this.emit('notification:status:change', evt);
        }

    },
    
    serialize(...args) {
        const res = BaseModel.prototype.serialize.apply(this, args);
        // remove internal ids from object
        return res;
    },
}, {
    /* collection properties */
});

module.exports =  bookshelf.model('notification', Notification)
