const BaseWorker = require('./BaseWorker.js');
const { EventEmitter } = require('events');
const util = require('util');

const Zone = require('../../models/Zone');
const Scene = require('../../models/Scene');
const Group = require('../../models/Group');
const Device = require('../../models/Device');

const AGGREGATION_METRICS_LIST = ["currentTemperature"]

function MetricsAggregationWorker(jobUuid) {
   BaseWorker.call(this);
   this._jobUuid = jobUuid;
   Object.defineProperty(this,"id",{
		get(){ return this._jobUuid; }
	});
}

// Inherits the prototype methods from the base model.
util.inherits(MetricsAggregationWorker,  BaseWorker);


MetricsAggregationWorker.prototype.initialize_i = function(config, connection) {
  return new Promise((resolve, reject) =>{
    var self = this;
    self.emit('log', {level: 'debug', text: 'Initialized metrics aggregation service worker'});
    resolve();
  });
}

MetricsAggregationWorker.prototype.stop_i = function() {
  return new Promise((resolve, reject) =>{
    var self = this;
    resolve();
  });
}

function computeMetricAggregate(metric, components) {

  var arr = []
  components.forEach((component)=>{
    component.details = component.details ? component.details : {};
    component.details = (typeof component.details === 'string') ? JSON.parse(component.details) : component.details;
    if (component[metric]) {
      arr.push(parseFloat(component[metric]));
    } else if (component.details[metric]) {
      arr.push(parseFloat(component.details[metric]));
    }
  })

  if (arr.length) {
    var sum = arr.reduce(function(a, b) { return a + b; });
    var avg = sum /arr.length;
    return  Number((avg).toFixed(1));
  } else {
    return undefined;
  }

}

MetricsAggregationWorker.prototype.doWork_i = function() {
  return new Promise((resolve, reject) =>{
    var self = this;
    var _groups = undefined
    var _scenes = undefined
    var _zones = undefined
    self.emit('log', {level: 'debug', text: 'Running metrics aggregation service work'});
    Group.fetchAll({withRelated: ['devices']}).then((groups)=>{
      _groups = groups? groups.toJSON() : [];
      _groups.forEach((group)=>{
        group.details = group.details ? JSON.parse(group.details) : {};
        group.devices = group.devices ?  group.devices : [];
        AGGREGATION_METRICS_LIST.forEach((metric)=>{
          let value = computeMetricAggregate(metric, group.devices)
          if (value !== undefined) {
            if (group.details[metric] === undefined || Number(group.details[metric]) != Number(value)) {
              group.details[metric] = value;
              var msg = {type:'metrics-aggregation', topic: 'groups:' + group.uuid , data: {stream:"currentTemperature", value: value}};
              self.emit('job::result', msg);
            } 
          }
        })
      })
      return Scene.fetchAll()
    }).then((scenes)=>{
      _scenes = scenes? scenes.toJSON() : [];
      _scenes.forEach((scene)=>{
        var scGroups = _groups.filter(x => x.scene_uuid = scene.uuid);
        AGGREGATION_METRICS_LIST.forEach((metric)=>{
          let value = computeMetricAggregate(metric, scGroups)
          if (value !== undefined) {
            switch(metric) {
              case 'currentTemperature':

              if (scene.temperature === undefined || Number(scene.temperature) != Number(value)) {
                scene.temperature = value;
                var msg = {type:'metrics-aggregation', topic: 'scenes:' + scene.uuid , data: {stream:"currentTemperature", value: value}};
                self.emit('job::result', msg);
              }
              break;
            }
          }
        }, _scenes)
      }, _scenes)
      return Zone.fetchAll()
    }).then((zones) => {
      _zones = zones? zones.toJSON() : [];
      _zones.forEach((zone)=>{
         var zScenes = _scenes.filter(x => x.zone_uuid = zone.uuid);
         AGGREGATION_METRICS_LIST.forEach((metric)=>{
          var name = metric;
          if (metric === "currentTemperature"){
            name = "temperature";
          }
          let value = computeMetricAggregate(name, zScenes)
          if (value !== undefined) {
            switch(metric) {
              case 'currentTemperature':
              if (zone.temperature === undefined || Number(zone.temperature) != Number(value)) {
                zone.temperature = value;
                var msg = {type:'metrics-aggregation', topic: 'zones:' + zone.uuid , data: {stream:"currentTemperature", value: value}};
                self.emit('job::result', msg);
              }
              break;
            }
          }
         })
      })
      resolve();
    }).catch((error)=>{
      self.emit('log', {level: 'error', text: '' + error});
      resolve();
    })
  });
};

module.exports = MetricsAggregationWorker