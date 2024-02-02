const Bcrypt = require('bcrypt');
const Joi = require('joi');
const _ = require('lodash');
const BaseModel = require('./helpers/base');
const bookshelf = require('../lib/bookshelf');
const EventHistory = require('./EventHistory');
const Group = require('./Group');

const required = { is: true, then: Joi.required() };

/**
 * An Extension could be a real user or device.
 * @type Extension
 */
const Scene = BaseModel.extend({
    tableName: 'scenes',
    idPrefix: 'iot-',
    hasTimestamps: ['createdAt', 'updatedAt'],
    schema: {
	    id: Joi.number().integer(),
	    name: Joi.string().when('$creating',required),
        uuid: Joi.string().when('$creating',required),
        org_id: Joi.string().when('$creating',required),
	    actions: Joi.array().allow(null).items(Joi.string()),
	    details: Joi.string().allow(null),
        zone_uuid: Joi.string().allow(null),
        temperature: Joi.number().allow(null),
        createdAt: Joi.date(),
        updatedAt: Joi.date(),
	},

    permissions() {
        return this.hasMany('scene_permission', 'scene_uuid', 'uuid');
    },

    groups() {
        return this.hasMany('group', 'scene_uuid', 'uuid');
    },

    zone() {
        return this.belongsTo('zone', 'zone_uuid', 'uuid');
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
    		Group.where({scene_uuid:this.get('uuid')}).fetchAll()
    		.then((groups)=>{
    			if(groups){

                    var hist = new EventHistory({event_type: "action", event_value: action, 
                        event_time: parameters["timestamp"], event_uuid: parameters["action-id"], 
                        event_object_uuid: this.get("uuid"), event_object_type: "scene",
                        event_object_name: this.get("name"), 
                        user_id: parameters["user-id"] ? parameters["user-id"] : null,
                        user_name: parameters["user-name"] ? parameters["user-name"] : null, 
                        org_id: this.get('org_id'),
                        details: JSON.stringify(parameters.details)
                    });
                    hist.save();
                    
    				groups.forEach((group)=>{
    					group.exec(action,parameters);
    				});

    				resolve(true);
    			} else {
    				resolve(false);
    			}
    		});
    	});	
    }
}, {
    /* collection properties */
});

module.exports =  bookshelf.model('scene', Scene)
