const SocketIOHandler = require('../../socket-io-handler.js').SocketIOHandler;
const jiliaRest = require('./jilia-rest-client.js');

const config = require('config');

Object.extend = Object.extend || function(){
    var length = arguments.length,
    ret={};
    while(--length>=0){
	Object.keys(arguments[length]).forEach((key)=>{
		ret[key] = arguments[length][key];
	    });
    }
    return ret;
}

function JiliaIOHandler(socket,cache,logger){
  SocketIOHandler.call(this,socket,cache,logger);
  this.config  = config.iot.jilia;
  this.connections = {};
  this.rest_token = undefined;
}

JiliaIOHandler.prototype = Object.create(SocketIOHandler.prototype);
JiliaIOHandler.prototype.DEVICES_ALLOWED = {'contact':true,
					    'door-lock':true,
					    'occupancy':true,
					    'sensor':true,
					    'light':true,
					    'water':true,
              'switch': true,
              'thermostat': true,
              'security-keypad': false,
              'shade': false,
              'smoke': false};
JiliaIOHandler.prototype.EVENT_STREAM_ALLOWED = {'status':true,
						 'motion':true,
             'onOff': true,
						 'currentTemperature':true,
						 'batteryLevel':true,
             'state': true,
             'log': false,
             'rawPacket': false,
             'occupancy': true,
             'transition': true,
             'ring': true};

JiliaIOHandler.prototype.init = function(dispatcher){
  var rest = new jiliaRest.JiliaRestClient(this.config.key,
                                           this.config.secret,
                                           this.config.https_url,
                                           this.logger);
    rest.refreshApiToken()
	.then((t)=>{
	    this.rest_token = t;
	    this._init(dispatcher);
	})
	.catch(this.ErrorHandler);
};
/*
JiliaIOHandler.prototype.jiliaEventHandler = function(event){
    if(event.token){
	var arr_message = event.token.split('/');		  
	if(arr_message.length>=4 &&
	   JiliaIOHandler.prototype.DEVICES_ALLOWED[arr_message[1]] &&
	   JiliaIOHandler.prototype.EVENT_STREAM_ALLOWED[arr_message[3]]
	   ){
	    event.server = arr_message[0];
	    event.device = {
		type: arr_message[1], // contact, door-lock, occupancy, sensor, light, water
		id: arr_message[2],
		stream:arr_message[3] // status, motion, state, temperature, batterLevel
	    };
	    this.eventHandler(event);
	}// What should we do with those which doesn't fit the condition?
    }
}*/

JiliaIOHandler.prototype.registerListener = function(devicetk){
 /* if(devicetk && typeof devicetk == 'string'){
    var tks = devicetk.split(':');
    if(tks.length>1 && !this.connections[tks[0]]){
      this.connections[tks[0]] = new jiliaWS.JiliaWSClient(this.config.ws_url,this.logger);
      this.connections[tks[0]].connect(tks[0],this.rest_token,this.logger,this.jiliaEventHandler);      
    }if(tks.length>1)
      this._registerListener(devicetk);
  }*/
}

exports.JiliaIOHandler = JiliaIOHandler; 
