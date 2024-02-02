const jiliaRest = require('./api/jilia-rest-client.js');
const Gateway = require('../../../../models/Gateway');
const Device = require('../../../../models/Device');
const Group = require('../../../../models/Group');
const config = require('config');
const util = require("util");
const { EventEmitter } = require('events');

function JiliaWatchDog(logger = null){
  var jiliaConfig = config.iot.providers.find(x => x.name === 'jilia');
  this.jilia_rest = new jiliaRest.JiliaRestClient(jiliaConfig.authentication.username, jiliaConfig.authentication.password, 'https://' + jiliaConfig.base_url, null);
}

util.inherits(JiliaWatchDog, EventEmitter);

const JiliaServiceDevices = ['local-authentication-service', 'node-red-service', 'scene-support-service', 
                             'jilia-plus-service', 'hub-management-service', 'software-update-service', 
                             'zigbee-service'];

JiliaWatchDog.prototype.log = function(){
  let prt = undefined;
  if(this.logger){
    prt = this.logger.info;
  }else{
    prt = log.info;
  }
  let str='',
  i=-1,
  length = arguments.length;
  while(++i<(length-1)){
    if(typeof arguments[i] == 'object'){
      str+=JSON.stringify(arguments[i])+' ';
    }
    else{
      str+=arguments[i]+' ';
    }
  }
  prt(str+arguments[i]);
};


JiliaWatchDog.prototype.run = function(jilia_rest) {
  let token = jilia_rest.refreshApiToken();
  token.then((t)=>{
    let servers = jilia_rest.getServers();
    servers.then((servers)=>{
      servers.forEach((server)=> {
        Gateway.where({uuid: server}).fetch().then((gateway)=>{
          if (!gateway) {
            gateway = new Gateway({"name": server, "uuid": server});
          }

          gateway.set("actions", null);
          gateway.set("location_uuid", null);

          gateway.save().then((gateway) => {
            this.emit('object-update', {object: gateway.toJSON(), object_type: 'gateway', event: 'update'});
            let devices = jilia_rest.getDevices(gateway.get('uuid'));
            devices.then((devices)=>{
              devices.forEach((dev)=>{
                if (!JiliaServiceDevices.includes(dev.type) && dev.type != "lighting-scene" && dev.type != "lighting-group") {
                  let devInfo = jilia_rest.getDevice(gateway.get('uuid'), dev.id);
                  devInfo.then((devInfo)=>{
                    Device.where({uuid: devInfo.id}).fetch().then((device)=>{
                      var status = devInfo.properties? devInfo.properties.status : undefined;
                      if (devInfo.type == "occupancy") {
                        status = devInfo.properties.occupancy;
                      } else if (devInfo.type == "light") {
                        status = devInfo.properties.onOff;
                      }
                      if (!status) {
                        status = 'undefined';
                      }
                      var actions = "[";
                      devInfo.actions.forEach((action)=>{
                        actions = actions + "\"" + action + "\",";
                      });
                      if (actions != "[") {
                        actions = actions.substring(0, actions.length-1);
                      }

                      actions = actions + "]";
                      if(devInfo.type == "door-lock") {
                        devInfo.properties["Lock_params"] = {name: "pin", value:"1234"};
                        devInfo.properties["Unlock_params"] =  {name: "pin", value:"1234"};
                      }

                      devInfo.properties.provider = 'jilia';

                      if (!device) {
                        device = new Device({"name": devInfo.name, "uuid": devInfo.id, "type": devInfo.type, 
                          "state": devInfo.properties.state, "status": status, 
                          "gateway_uuid": server, "actions": actions, "details": JSON.stringify(devInfo.properties), "group_uuid": null});
                      }

                      device.set("status", status);
                      device.set("state", devInfo.properties.state);
                      device.set("actions", actions);
                      device.set("details", JSON.stringify(devInfo.properties));
                      device.save().then((device)=>{
                        this.emit('object-update', {object: device.toJSON(), object_type: 'device', event: 'update'});
                      });

                      if (device.get("group_uuid")) {
                        Group.where({uuid: device.get("group_uuid")}).fetch().then((group)=>{

                          if (group && group.get("type") == "Door") {
                            var contact_status = undefined;
                            var lock_status = undefined;
                            var grStatus  = group.get("status").split('-');
                            if (grStatus[0]) {
                              contact_status = grStatus[0];
                            }

                            if (grStatus[1]) {
                              lock_status = grStatus[1];
                            }

                            if (device.get("type") == "contact") {
                              contact_status = device.get("status");
                            } else if (device.get("type") == "door-lock") {
                              lock_status = device.get("status")
                            }

                            if (contact_status && lock_status) {
                              group.set("status", contact_status + " - " + lock_status);
                            } else if (contact_status) {
                              group.set("status", contact_status);
                            } else if (lock_status) {
                              group.set("status", lock_status);
                            }
                            group.save().then((group)=>{
                              this.emit('object-update', {object: group.toJSON(), object_type:'group', event: 'update'});
                            });
                          } else if (group && (group.get("type") == "Occupancy" || group.get("type") == "Motion")) {
                            group.set("status", device.get("status"));
                            group.save().then((group)=>{
                              this.emit('object-update', {object: group.toJSON(), object_type:'group', event: 'update'});
                            });
                          }
                        });
                      }
                    });
                  });
                }
              });
            });
          });
        });
      });  
    }).catch((error)=>{
      this.emit('log', {level: 'error', text: error});
    });
  });  
};

exports.JiliaWatchDog = JiliaWatchDog
