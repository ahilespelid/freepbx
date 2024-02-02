const https = require('https');
const BaseWorker = require('./BaseWorker.js');
const { EventEmitter } = require('events');
const util = require('util');
const btoa = require('btoa');
require("tls").DEFAULT_ECDH_CURVE = "auto"; // SMART-935. fix for TLS problems with node.js version 8.16.0. Please remove this after node version upgrade.
var request = require('request').defaults({ encoding: null });

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min;
}

function ImageCaptureWorker(jobUuid) {
   BaseWorker.call(this);
   this._options = undefined;
   this._connection = undefined;
   this._jobUuid = jobUuid;
   this._initialize_timer = undefined;
   this._initialized = false;
   Object.defineProperty(this,"id",{
		get(){ return this._jobUuid; }
	});
}

function initializeCapture(options, emmitter, interval) {
	return new Promise((resolve, reject) =>{
		request(options, function (error, response, body) {
			if (error) {
				emmitter.emit('log', {level: 'error', text: '' + error});
				reject(error);
				return;
			}
			if (response.statusCode != 200) {
				let msg = 'Initialization request Failed with status code ' + response.statusCode
				emmitter.emit('log', {level: 'error', text: msg});
				reject(msg);
				return;
			}
			emmitter.emit('log', {level: 'debug', text: 'Image capture initialized for host ' + options.host});

			if (!emmitter._initialized &&  emmitter._initialize_timer) {
				clearInterval(emmitter._initialize_timer)
				emmitter._initialize_timer = setInterval(initializeCapture, interval, options, emmitter);
				emmitter._initialized = true;
			}
			resolve();
		})
	})
}

// Inherits the prototype methods from the base model.
util.inherits(ImageCaptureWorker,  BaseWorker);

ImageCaptureWorker.prototype.initialize_i = function(config, connection) {
	return new Promise((resolve, reject) =>{
		var self = this;
		self._options = { url: config.protocol + '//' + config.hostname + ':' + config.port + '/' + config.path + '?_=' + getRandomInt(100, 10000), method: config.method, strictSSL: false};

		self._connection = connection;

		if (config.initializeImagePath) {
			var initializeImageOptions = { url: config.protocol + '//' + config.hostname + ':' + config.port + '/' + config.initializeImagePath, method: config.method, strictSSL: false};

			if (config.username && config.password) {
				initializeImageOptions.url = config.protocol + '//' + config.username + ':' + config.password + '@' + config.hostname + ':' + config.port + '/' + config.initializeImagePath;
			}

			var interval = config.initializeRefresh ? parseInt(config.initializeRefresh) : 21600000;
			initializeCapture(initializeImageOptions, self).then(()=>{
				self._initialize_timer = setInterval(initializeCapture, interval, initializeImageOptions, self, interval);
				self._initialized = true;
				resolve();
			}).catch((error)=>{
				// we fail to initialize, so let's make the a temtative every 5 seconds
				self._initialize_timer = setInterval(initializeCapture, 5000, initializeImageOptions, self, interval);
				self._initialized = false;
				resolve();
			});
		}
	})
};

ImageCaptureWorker.prototype.stop_i = function() {
	return new Promise((resolve, reject) =>{
		this._connection = null;
		if (this._initialize_timer) {
			clearInterval(this._initialize_timer);
		}
		this._initialized = false;
		resolve();
	})
}

function bufferToBase64(buf) {
    var binstr = Array.prototype.map.call(buf, function (ch) {
        return String.fromCharCode(ch);
    }).join('');
    return btoa(binstr);
}

ImageCaptureWorker.prototype.doWork_i = function() {
	return new Promise((resolve, reject) =>{
		var self = this;
		if (!self._initialized) {
			resolve();
			return;
		}

		request(self._options, function (error, response, body) {
			if (error) {
				self.emit('log', {level: 'error', text: '' + error});
				resolve();
				return;
			}

			if (response.statusCode != 200) {
				self.emit('log', {level: 'error', text: 'Request Failed with status code ' + response.statusCode});
				resolve();
				return;
			}

			var evt = JSON.stringify({type: 'event', data: new Buffer(body).toString('base64'), device: {type:'intercom', id: self._jobUuid, stream: 'image-capture'}});
			self._connection.send(evt);
			resolve();
		})
	})
};

module.exports = ImageCaptureWorker