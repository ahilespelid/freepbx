const RestClient = require('node-rest-client').Client;
const BaseWorker = require('./BaseWorker.js');
const { EventEmitter } = require('events');
const util = require('util');

function WeatherUpdateWorker(jobUuid, coordinates) {
   BaseWorker.call(this);
   var options = {
        // will replace content-types used to match responses in JSON and XML parsers
        mimetypes: {
            json: ["application/json", "application/json;charset=utf-8"],
            xml: ["application/xml", "application/xml;charset=utf-8"]
        },
    };
   this._baseUrl = undefined;
   this._apiKey = undefined;
   this._client = new RestClient(options);
   this._coordinates = coordinates;
   this._jobUuid = jobUuid;
   Object.defineProperty(this,"id",{
		get(){ return this._jobUuid; }
	});
}

// Inherits the prototype methods from the base model.
util.inherits(WeatherUpdateWorker,  BaseWorker);

function callRestMethod(client, method, args) {

    return new Promise(function(resolve, reject){
        var req =  client.methods[method](args, function (data, response) {
            //console.log(response);
            if (Buffer.isBuffer(data)) {
              try {
                data = JSON.parse(data.toString());
                resolve(data);
              } catch (error) {
                reject(error);
              }
            } else {
                resolve(data);
            }
        });

        req.on('requestTimeout', function (req) {
            err = method + ': Request timeout has expired, client timeout. Make sure server is listening.';
            reject(err);
            req.abort();
        });

        req.on('responseTimeout', function (res) {
            err = method + ': Response timeout has expired.';
            reject(err); 
        });

        req.on('error', function (err) {
            reject(err);
        });
    });
}

// coordinates format: [lon, lat]
WeatherUpdateWorker.prototype.initialize_i = function(config, connection) {
  return new Promise((resolve, reject) =>{
    this._baseUrl = config.url;
    this._apiKey = config.api_key;
    this._client.registerMethod("getWeather", "http://" + this._baseUrl + '/weather', "GET");
    this.emit('log', {level: 'debug', text: 'Initialized Weather refresh job for  ' + this._jobUuid + ' with coordinates lat=' + this._coordinates[1] + '&lon='+ this._coordinates[0]});
    resolve();
  })
}

WeatherUpdateWorker.prototype.stop_i = function() {
  return new Promise((resolve, reject) =>{
    this._client = null;
    resolve();
  });
}

WeatherUpdateWorker.prototype.doWork_i = function() {
  return new Promise((resolve, reject) =>{
    var self = this;

    if (!this._coordinates || this._coordinates.length != 2) {
      self.emit('log', {level: 'error', text: 'Invalid coordinates for job ' + this._jobUuid});
    }

    var args = {
      data: { units: 'metric', APPID: this._apiKey, lat: this._coordinates[1], lon: this._coordinates[0]},
      parameters: { units: 'metric', APPID: this._apiKey, lat: this._coordinates[1], lon: this._coordinates[0]}
    };

    callRestMethod(self._client, 'getWeather', args).then((resp)=>{
      var msg = {type:'weather', id: self._jobUuid, data: {currentTemperature: resp.main.temp, timezone: resp.timezone}};
      self.emit('job::result', msg);
      resolve();
    }).catch((error)=>{
      self.emit('log', {level: 'error', text: 'Weather refresh failed for  ' + self._jobUuid + '. Error: ' + error});
      resolve();
    });
  })
};

module.exports = WeatherUpdateWorker