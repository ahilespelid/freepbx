const Bcrypt = require('bcrypt');
const Joi = require('joi');
const _ = require('lodash');
const BaseModel = require('./helpers/base');
const bookshelf = require('../lib/bookshelf');
const EventHistory = require('./EventHistory');

const required = { is: true, then: Joi.required() };

/**
 * An Extension could be a real user or device.
 * @type Extension
 */
const Device = BaseModel.extend({
    tableName: 'devices',
    idPrefix: 'iot-',
    hasTimestamps: ['createdAt', 'updatedAt'],
    schema: {
	    id: Joi.number().integer(),
	    name: Joi.string().when('$creating',required),
        uuid: Joi.string().when('$creating',required),
        org_id: Joi.string().when('$creating',required),
	    actions: Joi.array().allow(null).items(Joi.string()),
	    details: Joi.string().allow(null),
        type: Joi.string(),
        state: Joi.string().valid('adding', 'discovering', 'calibrating', 'ready', 'unreachable', 'fail', 'unknown'),
        status: Joi.string().allow(null),
        group_uuid: Joi.string().allow(null),
        gateway_uuid: Joi.string().allow(null),
        createdAt: Joi.date(),
        updatedAt: Joi.date(),
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

    group() {
        return this.belongsTo('group', 'group_uuid', 'uuid');
    },


    guestexec(action,parameters){
        return new Promise((resolve, reject) => {
            if (this.get('actions') && this.get('actions').includes(action)) {
                var hist = new EventHistory({event_type: "action", event_value: action, 
                    event_time: parameters["timestamp"], event_uuid: parameters["action-id"], 
                    event_object_uuid: this.get("uuid"), event_object_type: "device", 
                    event_object_name: this.get("name"),
                    user_id:    parameters["guest_id"] ? parameters["guest_id"] : null,
                    user_name:   parameters["guest_name"] ?  parameters["guest_name"] : null,  
                    org_id: this.get('org_id'),
                    user_type:"Guest",
                    details: JSON.stringify(parameters.details)
                });
                hist.save();

                var properties = JSON.parse(this.get('details'));
                var iotManager = parameters['iot-manager'];
                var dispatcher = parameters['event-dispatcher'];

                var params = {};
                if (properties) {
                    var provider = iotManager.getProvider(properties.provider);
                    if (provider) {
                        switch(provider.name){
                            case "cyberdata":
                            params.group = parameters['group'];
                            params.session = parameters['session'];
                            break;
                            case "jilia":
                            params.properties = properties;
                            break;
                        }
                        provider.api.doAction(action, this, params).then((result)=>{
                            resolve(result);
                        });
                    } else {
                        reject('Unknown provider ' + properties.provider);
                    }
                } else {
                    reject('Undefined details for device ' + this.get("uuid"));
                }
            } else {
                resolve('Unsupported action: ' + action)
            }
        }); 
    },
    exec(action,parameters){
        return new Promise((resolve,reject)=>{
            if (this.get('actions') && this.get('actions').includes(action)) {
                var hist = new EventHistory({event_type: "action", event_value: action, 
                    event_time: parameters["timestamp"], event_uuid: parameters["action-id"], 
                    event_object_uuid: this.get("uuid"), event_object_type: "device", 
                    event_object_name: this.get("name"),
                    user_id: parameters["user-id"] ? parameters["user-id"] : null,
                    user_name: parameters["user-name"] ? parameters["user-name"] : null,  
                    org_id: this.get('org_id'),
                    user_type:"User",
                    details: JSON.stringify(parameters.details)
                });
                hist.save();

                var properties = JSON.parse(this.get('details'));
                var iotManager = parameters['iot-manager'];
                var dispatcher = parameters['event-dispatcher'];

                if (properties) {
                    var provider = iotManager.getProvider(properties.provider);
                    if (provider) {
                        var params = {};
                        switch(provider.name){
                            case "cyberdata":
                            params.group = parameters['group'];
                            params.session = parameters['session'];
                            break;
                            case "jilia":
                            params.properties = properties;
                            break;
                        }
                        provider.api.doAction(action, this, params).then((result)=>{
                            resolve(result);
                        });
                    } else {
                        reject('Unknown provider ' + properties.provider);
                    }

                } else {
                    reject('Undefined details for device ' + this.get("uuid"));
                }
            } else {
                resolve('Unsupported action: ' + action)
            }
        }); 
    }
}, {
    /* collection properties */
});

module.exports =  bookshelf.model('device', Device)