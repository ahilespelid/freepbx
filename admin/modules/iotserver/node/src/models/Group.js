const Bcrypt = require('bcrypt');
const Joi = require('joi');
const _ = require('lodash');
const BaseModel = require('./helpers/base');
const bookshelf = require('../lib/bookshelf');
const EventHistory = require('./EventHistory');
const Device = require('./Device');

const required = { is: true, then: Joi.required() };

/**
 * An Extension could be a real user or device.
 * @type Extension
 */
const Group = BaseModel.extend({
    tableName: 'groups',
    idPrefix: 'iot-',
    hasTimestamps: ['createdAt', 'updatedAt'],
    schema: {
	    id: Joi.number().integer(),
	    name: Joi.string().when('$creating',required),
        state: Joi.string().valid('OK', 'Alarmed'),
        uuid: Joi.string().when('$creating',required),
        org_id: Joi.string().when('$creating',required),
	    actions: Joi.array().allow(null).items(Joi.string()),
	    details: Joi.string().allow(null),
        type: Joi.string().valid("Outside Door", "Contact", "Occupancy", "Light", "Switch", "Sensor", "Shade", "Intercom", "Motion", "Alarm", "Smoke Sensor", "Water Sensor", "Air Quality Sensor", "Temperature Sensor"),
        status: Joi.string().allow(null),
        scene_uuid: Joi.string().allow(null),
        createdAt: Joi.date(),
        updatedAt: Joi.date(),
	},

    permissions() {
        return this.hasMany('group_permission', 'group_uuid', 'uuid');
    },

    devices() {
        return this.hasMany('device', 'group_uuid', 'uuid');
    },

    scene() {
        return this.belongsTo('scene', 'scene_uuid', 'uuid');
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
            if (this.get('actions') && this.get('actions').includes(action)) {

                var hist = new EventHistory({event_type: "action", event_value: action, 
                    event_time: parameters["timestamp"], event_uuid: parameters["action-id"], 
                    event_object_uuid: this.get("uuid"), event_object_type: "group", 
                    event_object_name: this.get("name"),
                    user_id: parameters["user-id"] ? parameters["user-id"] : null,
                    user_name: parameters["user-name"] ? parameters["user-name"] : null,
                    org_id: this.get('org_id'),
                    user_type:"User",
                    details: JSON.stringify(parameters.details)
                });
                hist.save();
                parameters['group'] = this;
                Device.where({group_uuid:this.get("uuid")}).fetchAll().then((devices)=>{
                    if (devices) {
                        devices.forEach((device)=>{
                            device.exec(action,parameters);
                        });
                    }
                });
            }
            resolve(true);
        });	
    },
    
    guestexec(action,parameters){
        return new Promise((resolve, reject) => {
            if (this.get('actions') && this.get('actions').includes(action)) {

                var hist = new EventHistory({event_type: "action", event_value: action, 
                    event_time: parameters["timestamp"], event_uuid: parameters["action-id"], 
                    event_object_uuid: this.get("uuid"), event_object_type: "group", 
                    event_object_name: this.get("name"),
                    user_id:  parameters["guest_id"] ? parameters["guest_id"] : null,
                    user_name: parameters["guest_name"] ?parameters["guest_name"] : null,
                    org_id: this.get('org_id'),
                    user_type:"Guest",
                    details: JSON.stringify(parameters.details)
                });
                hist.save();
                parameters['group'] = this;
                Device.where({ group_uuid: this.get("uuid") }).fetchAll().then((devices) => {
                    if (devices) {
                        devices.forEach((device) => {
                            device.guestexec(action,parameters);
                        });
                    }
                });
            }
            resolve(true);
        });	
    }
}, {
    /* collection properties */
});

module.exports =  bookshelf.model('group', Group)
