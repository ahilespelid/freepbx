const util = require('util');
const Location = require('../iot/location-api.js');
const Zone = require('../iot/zone-api.js');
const Scene = require('../iot/scene-api.js');
const Group = require('../iot/group-api.js');
const Device = require('../iot/device-api.js');
const Gateway = require('../iot/gateway-api.js');
const History = require('../iot/history-api.js');
const Property = require('../iot/user-property-api.js');
const CommonApi = require('../iot/common-api.js');
const uuid = require('uuid');
const dispatcher = require('../../lib/iot/event-dispatcher.js');
const iotManager = dispatcher.getIoTManager()
const iot_backend_server = dispatcher.getIoTBackendServer()
const log = require('../../lib/log');
const classMapping = {"Location": Location, "Zone": Zone, "Scene": Scene, "Group": Group, "Gateway": Gateway, "Device": Device};


/*
 For a controller in a127 (which this is) you should export the functions referenced
 in your Swagger document by name.

 Either:
  - The HTTP Verb of the corresponding operation (get, put, post, delete, etc)
  - Or the operationId associated with the operation in your Swagger document

  In the starter/skeleton project the 'get' operation on the '/hello' path has
  an operationId named 'hello'. Here, we specify that in the exports of this
  module that 'hello' maps to the function named 'hello'
 */
module.exports = {
    getLocations,
    getLocation,
    createLocation,
    deleteLocation,
    updateLocation,
    locationAddPermission,
    locationRemovePermission,
    locationAddZone,
    locationRemoveZone,
    getZones,
    getZone,
    createZone,
    deleteZone,
    updateZone,
    zoneAddPermission,
    zoneRemovePermission,
    zoneAddScene,
    zoneRemoveScene,
    zoneDoAction,
    getScenes,
    getScene,
    createScene,
    deleteScene,
    updateScene,
    sceneAddPermission,
    sceneRemovePermission,
    sceneAddGroup,
    sceneRemoveGroup,
    sceneDoAction,
    getGroups,
    getGroupTypes,
    getGroup,
    createGroup,
    deleteGroup,
    updateGroup,
    groupAddDevice,
    groupRemoveDevice,
    groupDoAction,
    getDevices,
    getDevicesPhysicalTypes,
    getDevice,
    addDevice,
    updateDevice,
    removeDevice,
    startDeviceCalibration,
    stopDeviceCalibration,
    clearPinCode,
    setPinCode,
    pairDevice,
    deviceDoAction,
    getProviders,
    getGateways,
    getGateway,
    addGateway,
    removeGateway,
    updateGateway,
    setGatewayDebug,
    getGatewayDebug,
    getGatewayLogs,
    getHistory,
    getUserHistory,
    getObjectHistory,
    getUserFavorite,
    addUserFavorite,
    removeUserFavorite,
    getAll,
    setLogLevel,
    getLogLevel,
};


function setLogLevel(req, res) {
  CommonApi.setLoggingLevel(req.swagger.params.data.value.level).then((lev)=>{
    res.json({level: lev});
  }).catch((error)=>{
    log.error(error);
    res.json({Error: error});
  });
}

function getLogLevel(req, res) {

  CommonApi.getLoggingLevel().then((lev)=>{
    res.json({level: lev});
  }).catch((error)=>{
    log.error(error);
    res.json({Error: error});
  });
}

function getAll(req, res) {

  var q = require('q');
  var promises = [];
  var response = {};
  Object.keys(classMapping).forEach((key)=>{
    var api = classMapping[key];
    if (!["Gateway",  "Device"].includes(key)) {
      promises.push(api.getAll(null, null, true));
    } else {
      promises.push(api.getAll(true));
    }
  })
  promises.push(Property.getUserFavorites(null, null, true));
  q.all(promises).then((results)=>{
    results.forEach((result)=>{
        Object.keys(result).forEach( (key)=>{
          response[key] = result[key];
        })
      })
      res.json(response);
  }).catch((error)=>{
    log.error(error);
    res.json({Error: error});
  });
}

/*
  Functions in a127 controllers used for operations should take two parameters:

  Param 1: a handle to the request object
  Param 2: a handle to the response object
 */
function getLocations(req, res) {
    // variables defined in the Swagger document can be referenced using
    // req.swagger.params.{parameter_name}
    //const name = req.swagger.params.name.value || 'stranger';

    // this sends back a JSON response which is a single string
    Location.getAll().then((locations)=>{
      res.json(locations);
    });
    //console.log(res);
}

function getLocation(req, res) {
  Location.getLocation(req.swagger.params.uuid.value).then((location)=>{
    res.json(location);
  });
}

function createLocation(req, res) {
  var dt = req.swagger.params.data.value;
  dt.org_id = iot_backend_server.org_id;
  Location.createLocation(dt).then((location)=>{
    res.json(location);
  });
}

function deleteLocation(req, res) {
   Location.deleteLocation(req.swagger.params.uuid.value).then((locations)=>{
    res.json(locations);
  });
}

function locationAddZone(req, res) {
   Location.addZone(req.swagger.params.uuid.value, req.swagger.params.zone_uuid.value).then((zone)=>{
    res.json(zone);
  });
}

function locationRemoveZone(req, res) {
  Location.removeZone(req.swagger.params.uuid.value, req.swagger.params.zone_uuid.value).then((zones)=>{
    res.json(zones);
  });
}

function locationAddPermission(req, res) {
   Location.addPermission(req.swagger.params.uuid.value, req.swagger.params.data.value).then((permission)=>{
    res.json(permission);
  });
}

function locationRemovePermission(req, res) {
  Location.removePermission(req.swagger.params.uuid.value, req.swagger.params.data.value).then((permissions)=>{
    res.json(permissions);
  });
}

function getZones(req, res) {
    Zone.getAll().then((zones)=>{
      res.json(zones);
    });
}

function getZone(req, res) {
  Zone.getZone(req.swagger.params.uuid.value).then((zone)=>{
    res.json(zone);
  });
}

function createZone(req, res) {
   Zone.createZone(req.swagger.params.data.value).then((zone)=>{
    res.json(zone);
  });
}

function deleteZone(req, res) {
   Zone.deleteZone(req.swagger.params.uuid.value).then((zones)=>{
    res.json(zones);
  });
}

function zoneAddPermission(req, res) {
   Zone.addPermission(req.swagger.params.uuid.value, req.swagger.params.data.value).then((permission)=>{
    res.json(permission);
  });
}

function zoneRemovePermission(req, res) {
  Zone.removePermission(req.swagger.params.uuid.value, req.swagger.params.data.value).then((permissions)=>{
    res.json(permissions);
  });
}

function zoneAddScene(req, res) {
   Zone.addScene(req.swagger.params.uuid.value, req.swagger.params.scene_uuid.value).then((scene)=>{
    res.json(scene);
  });
}

function zoneRemoveScene(req, res) {
  Zone.removeZone(req.swagger.params.uuid.value, req.swagger.params.scene_uuid.value).then((scenes)=>{
    res.json(scenes);
  });
}

function zoneDoAction(req, res) {
  Zone.doAction(req.swagger.params.uuid.value, req.swagger.params.action.value, {'iot-manager':iotManager, 'event-dispatcher': dispatcher, 
    'timestamp': Date.now(), 'action-id': uuid.v4(), 'user-id': "swagger-api", 'user-name': "swagger-api"}).then((result)=>{
    res.json(result);
  });
}

function getScenes(req, res) {
    Scene.getAll().then((scenes)=>{
      res.json(scenes);
    });
}

function getScene(req, res) {
  Scene.getScene(req.swagger.params.uuid.value).then((scene)=>{
    res.json(scene);
  });
}

function createScene(req, res) {
   Scene.createScene(req.swagger.params.data.value).then((scene)=>{
    res.json(scene);
  });
}

function deleteScene(req, res) {
   Scene.deleteScene(req.swagger.params.uuid.value).then((scenes)=>{
    res.json(scenes);
  });
}

function sceneAddPermission(req, res) {
   Scene.addPermission(req.swagger.params.uuid.value, req.swagger.params.data.value).then((permission)=>{
    res.json(permission);
  });
}

function sceneRemovePermission(req, res) {
  Scene.removePermission(req.swagger.params.uuid.value, req.swagger.params.permission_id.value).then((permissions)=>{
    res.json(permissions);
  });
}

function sceneAddGroup(req, res) {
   Scene.addGroup(req.swagger.params.uuid.value, req.swagger.params.group_uuid.value).then((group)=>{
    res.json(group);
  });
}

function sceneRemoveGroup(req, res) {
  Scene.removeGroup(req.swagger.params.uuid.value, req.swagger.params.group_uuid.value).then((groups)=>{
    res.json(groups);
  });
}

function sceneDoAction(req, res) {
  Scene.doAction(req.swagger.params.uuid.value, req.swagger.params.action.value, {'iot-manager':iotManager, 'event-dispatcher': dispatcher, 
    'timestamp': Date.now(), 'action-id': uuid.v4(), 'user-id': "swagger-api", 'user-name': "swagger-api"}).then((result)=>{
    res.json(result);
  });
}

function getGroups(req, res) {
    Group.getAll().then((groups)=>{
      res.json(groups);
    });
}

function getGroupTypes(req, res) {
  Group.getTypes().then((types)=>{
    res.json(types);
  }).catch((error)=>{
    log.error(error);
    res.json({Error: error});
  });
}


function getGroup(req, res) {
  Group.getGroup(req.swagger.params.uuid.value).then((group)=>{
    res.json(group);
  });
}

function createGroup(req, res) {
   Group.createGroup(req.swagger.params.data.value).then((group)=>{
    res.json(group);
  });
}

function deleteGroup(req, res) {
   Group.deleteGroup(req.swagger.params.uuid.value).then((groups)=>{
    res.json(groups);
  });
}

function groupAddDevice(req, res) {
   Group.addDevice(req.swagger.params.uuid.value, req.swagger.params.device_uuid.value).then((device)=>{
    res.json(device);
  });
}

function groupRemoveDevice(req, res) {
  Group.removeDevice(req.swagger.params.uuid.value, req.swagger.params.device_uuid.value).then((devices)=>{
    res.json(devices);
  });
}

function groupDoAction(req, res) {
  Group.doAction(req.swagger.params.uuid.value, req.swagger.params.action.value, {'iot-manager':iotManager, 'event-dispatcher': dispatcher, 
    'timestamp': Date.now(), 'action-id': uuid.v4(), 'user-id': "swagger-api", 'user-name': "swagger-api"}).then((result)=>{
    res.json(result);
  });
}

function getDevices(req, res) {
    Device.getAll().then((devices)=>{
      res.json(devices);
    });
}

function getDevicesPhysicalTypes(req, res) {
  res.json(Device.DEVICES_PHY_TYPES);
}

function getDevice(req, res) {
  Device.getDevice(req.swagger.params.uuid.value).then((device)=>{
    res.json(device);
  });
}

function addDevice(req, res) {
  Device.addDevice(req.swagger.params.data.value, iotManager).then((resp)=>{
      res.json(resp);
  });
}

function removeDevice(req, res) {
  Device.removeDevice(req.swagger.params.uuid.value, iotManager).then((resp)=>{
      res.json(resp);
  });
}

function startDeviceCalibration(req, res) {
  Device.startCalibration(req.swagger.params.uuid.value, iotManager).then((resp)=>{
    res.json(resp);
  }).catch((error)=>{
    log.error(error);
    res.json({Error: error});
  });
}
function stopDeviceCalibration(req, res) {
  Device.stopCalibration(req.swagger.params.uuid.value, iotManager).then((resp)=>{
    res.json(resp);
  }).catch((error)=>{
    log.error(error);
    res.json({Error: error});
  });
}

function pairDevice(req, res) {
  Device.pairDevice(req.swagger.params.uuid.value, iotManager).then((resp)=>{
    res.json(resp);
  }).catch((error)=>{
    log.error(error);
    res.json({Error: error});
  });
}

function deviceDoAction(req, res) {
  Device.doAction(req.swagger.params.uuid.value, req.swagger.params.action.value, {'iot-manager':iotManager, 'event-dispatcher': dispatcher, 
      'timestamp': Date.now(), 'action-id': uuid.v4(), 'user-id': "swagger-api",'user-name':  "swagger-api"}).then((result)=>{
        res.json(result);
  }).catch((error)=>{
    log.error(error);
    res.json({Error: error});
  });
}


function setPinCode(req, res) {
  /*Device.setPinCodesImpl([req.swagger.params.uuid.value], [req.swagger.params.user_id.value]).then(()=>{
    res.json({status: true});
  }).catch((error)=>{
    log.error(error);
    res.json({Error: error});
  });*/
  res.json({status: true});
}

function clearPinCode(req, res) {
 /* Device.clearPinCodesImpl([req.swagger.params.uuid.value], [req.swagger.params.user_id.value]).then(()=>{
    res.json({status: true});
  }).catch((error)=>{
    log.error(error);
    res.json({Error: error});
  });*/
  res.json({status: true});
}

function getProviders(req, res) {
  Gateway.getProviders().then((providers)=>{
    res.json(providers);
  }).catch((error)=>{
    log.error(error);
    res.json({Error: error});
  });
}

function getGateways(req, res) {
    Gateway.getAll().then((gateways)=>{
      res.json(gateways);
    });
}

function getGateway(req, res) {
  Gateway.getGateway(req.swagger.params.uuid.value).then((gateway)=>{
    res.json(gateway);
  });
}

function addGateway(req, res) {
  Gateway.addGateway(req.swagger.params.data.value, iotManager).then((resp)=>{
      res.json(resp);
  }).catch((err)=>{
    log.error(err);
    res.json({Error: err});
  });
}

function removeGateway(req, res) {
  Gateway.removeGateway(req.swagger.params.uuid.value, iotManager).then((resp)=>{
      res.json(resp);
  });
}

function updateImpl(uuid, settings, className, req, res) {

  var data = {};
  
  settings.forEach((setting)=>{
    data[setting.name] = setting.value;
  })

  classMapping[className]["update"+className](uuid, data).then((resp)=>{
    res.json(resp);
  }).catch((error)=>{
    log.error(error);
    res.json({Error: error});
  })
}


function updateLocation(req, res) {
  return updateImpl(req.swagger.params.uuid.value, req.swagger.params.data.value, "Location", req, res);
}

function updateZone(req, res) {
  return updateImpl(req.swagger.params.uuid.value,req.swagger.params.data.value, "Zone", req, res);
}

function updateScene(req, res) {
  return updateImpl(req.swagger.params.uuid.value, req.swagger.params.data.value, "Scene", req, res);
}

function updateGroup(req, res) {
  return updateImpl(req.swagger.params.uuid.value, req.swagger.params.data.value, "Group", req, res);
}

function updateGateway(req, res) {
  return updateImpl(req.swagger.params.uuid.value, req.swagger.params.data.value, "Gateway", req, res);
}


function setGatewayDebug(req, res) {
  Gateway.setGatewayDebug(req.swagger.params.uuid.value, iotManager, req.swagger.params.data.value).then((resp)=>{
    res.json(resp);
  }).catch((err)=>{
    log.error(err);
    res.json({Error: err});
  });
}

function getGatewayDebug(req, res) {
  Gateway.getGatewayDebug(req.swagger.params.uuid.value, iotManager).then((resp)=>{
    res.json(resp);
  }).catch((err)=>{
    log.error(err);
    res.json({Error: err});
  });
}

function getGatewayLogs(req, res) {
  Gateway.getGatewayLogs(req.swagger.params.uuid.value, iotManager).then((resp)=>{
    res.attachment(req.swagger.params.uuid.value + '_logs.tar')
    res.set('Content-Type', 'application/x-tar')
    res.send(resp);
  }).catch((err)=>{
    log.error(err);
    res.json({Error: err});
  });
}

function updateDevice(req, res) {
  return updateImpl(req.swagger.params.uuid.value, req.swagger.params.data.value, "Device", req, res);
}

function getHistory(req, res) {
  History.getAll().then((events)=>{
    res.json(events);
  }).catch((error)=>{
   log.error(error);
   res.json({Error: error});

 });
}

function getObjectHistory(req, res) {
  History.getObjectEvents(req.swagger.params.uuid.value).then((events)=>{
    res.json(events);
  }).catch((error)=>{
   log.error(error);
   res.json({Error: error});

 });
}

function getUserHistory(req, res) {
  History.getUserEvents(req.swagger.params.username.value).then((events)=>{
    res.json(events);
  }).catch((error)=>{
   log.error(error);
   res.json({Error: error});

 });
}


function  getUserFavorite(req, res) {
  var data = {};
  var q = require('q');
  var promises = [];
  Property.getUserFavorites(req.swagger.params.user_id.value, null).then((favorites)=>{
    res.json(favorites);
  }).catch((error)=>{
    log.error(error);
    res.json({Error: error});
  });

}

function addUserFavorite(req, res) {
  var dt = req.swagger.params.data.value;
  dt.org_id = iot_backend_server.org_id;
  Property.addUserFavorites(req.swagger.params.data.value.user_id, null, dt).then(()=>{
      res.json({status: true});
    }).catch((error)=>{
      log.error(error);
      res.json({Error: error});
    })  
}

function removeUserFavorite(req, res) {
  Property.removeUserFavorites(req.swagger.params.data.value.user_id, null, req.swagger.params.data.value).then(()=>{
      res.json({status: true});
    }).catch((error)=>{
      log.error(error);
      res.json({Error: error});
    })
}