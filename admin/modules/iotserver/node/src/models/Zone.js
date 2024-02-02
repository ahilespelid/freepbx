const Bcrypt = require('bcrypt');
const Joi = require('joi');
const _ = require('lodash');
const BaseModel = require('./helpers/base');
const required = { is: true, then: Joi.required() };
const EventHistory = require('./EventHistory');
const bookshelf = require('../lib/bookshelf');
/**
 * An Extension could be a real user or device.
 * @type Extension
 */
const Zone = BaseModel.extend({
    tableName: 'zones',
    idPrefix: 'iot-',
    hasTimestamps: ['createdAt', 'updatedAt'],
    schema: {
        id: Joi.number().integer(),
        name: Joi.string().when('$creating',required),
        uuid: Joi.string().when('$creating',required),
        org_id: Joi.string().when('$creating',required),
        actions: Joi.array().allow(null).items(Joi.string()),
        details: Joi.string().allow(null),
        location_uuid: Joi.string().allow(null),
        status: Joi.string().allow(null),
        state: Joi.string().allow(null),
        temperature: Joi.number().allow(null),
        createdAt: Joi.date(),
        updatedAt: Joi.date(),
    },

    permissions() {
        return this.hasMany('zone_permission', 'zone_uuid', 'uuid');
    },

    scenes() {
        return this.hasMany('scene', 'zone_uuid', 'uuid');
    },

    location() {
        return this.belongsTo('location', 'location_uuid', 'uuid');
    },

    initialize() {
        BaseModel.prototype.initialize.call(this);
    },
    
    serialize(...args) {
        const res = BaseModel.prototype.serialize.apply(this, args);
        // remove internal ids from object
        return res;
    },
    exec(action,parameters){
        return new Promise((resolve,reject)=>{
            var stream = undefined;
            var value = undefined;
             if (this.get('actions') && this.get('actions').includes(action)) {
                stream = "state";
                value = action + "ed";
                if (["SetAlarm", "ClearAlarm"].includes(action)) {
                    stream = "status";
                    value = (action == "SetAlarm") ? "Alarm" : "OK";
                } 
                this.set(stream, value);
                this.save();
                var dispatcher = parameters['event-dispatcher'];
                if (dispatcher) {
                    event = {type: "event", server: "internal",
                    data: value,
                    device: {type: "zone", id: this.get('uuid'), stream: stream}};
                    dispatcher.dispatch(event);
                }
                var hist = new EventHistory({event_type: "action", event_value: action, 
                    event_time: parameters["timestamp"], event_uuid: parameters["action-id"], 
                    event_object_uuid: this.get("uuid"), event_object_type: "zone",
                    event_object_name: this.get("name"), 
                    user_id: parameters["user-id"] ? parameters["user-id"] : null,
                    user_name: parameters["user-name"] ? parameters["user-name"] : null, 
                    org_id: this.get('org_id'),
                    details: JSON.stringify(parameters.details)
                });
                hist.save();   
                resolve(true);
             } else {
                resolve(false);
             }        
        }); 
    }
}, {
    /* collection properties */
});

module.exports =  bookshelf.model('zone', Zone)