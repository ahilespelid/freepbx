function SocketIOHandler(socket,cache,logger){
  this.socket = socket;
  this.logger = logger;
  this.cache = cache;
  this.user = undefined;
};

SocketIOHandler.prototype = {
  // override this function
  init:function(dispatcher){
    this._init(dispatcher);
  },
  // override this function
  registerListener(devicetk){
    this._registerListener(devicetk);
  },
  // override this function
  unregisterListener(devicetk){
    this._unregisterListener(devicetk);
  },
  eventHandler(event){
    this._eventHandler(event);
  },
  _init:function(dispatcher){
    var handlers = {'register':this.RegistrationHandler,
                    'unregister':this.UnregistrationHandler,
                    'login':this.LoginHandler,                    
                    'error':this.ErrorHandler};
    Object.keys(handlers).forEach((value)=>{
      this.socket.on(value,(msg,fnResponse)=>{
        handlers[value](JSON.parse(msg),fnResponse);
      });
    });

    this.id = this._uniqId();

    // tell the dispatcher to forward events to this connection
    dispatcher.addListener(this.id, this.socket);
   
  },
  _uniqId:function(size){
    size = size || 16;
    var uId = "";
    while(--size>=0){
      var pos = Math.ceil(Math.random()*100)+32;
      while(pos<48 || (pos>57 && pos<65) || (pos>90 && pos<97) || pos>122)
        pos = Math.ceil(Math.random()*100)+32;
      uId+=String.fromCharCode(pos);
    }
    return uId;
  },
  _login:function(fnCallback){
    // Send RESTful API Request to IoTServer
    // change following line by the http request
    (new Promise((resolve,reject)=>{
      resolve({canRead:(device)=>true,
               canWrite:(device)=>true});
    }).then(fnCallback)
     .catch(this.ErrorHandler));
  },
  _checkPermsForRegistration:function(devicetk){
    return new Promise((resolve,reject)=>{
      this._login((user)=>{
        // Send RESTful API Request to IoTServer
        if(user)
          resolve((devicetk && (user.canWrite(devicetk) | user.canRead(devicetk)))? devicetk : undefined);
        else{
          reject('Error no user found');          
        }
      }); 
    });
  },
  _registerListener:function(devicetk){
    var ret = false;
    if(devicetk){      
      if(!this.cache.subscriptions)
        this.cache.subscriptions = {};
      if(!this.cache.subscriptions[devicetk])
        this.cache.subscriptions[devicetk] = {};
      if(!this.cache.subscriptions[devicetk][this.id]){
        this.cache.subscriptions[devicetk][this.id] = this;
        ret = true;
      }
    }
    return ret;
  },
  _unregisterListener:function(devicetk){
    if(devicetk && this.cache.subscriptions &&
       this.cache.subscriptions[devicetk] &&
       this.cache.subscriptions[devicetk][this.id])
      delete this.cache.subscriptions[devicetk][this.id];
    if(devicetk && this.cache.subscriptions &&
       this.cache.subscriptions[devicetk] &&
       !Object.keys(this.cache.subscriptions[devicetk]).length)
      delete this.cache.subscriptions[devicetk];
  },
  _eventHandler:function(event){
    var devicetk = event.server+':'+event.device.id,
        subscriptions = this.cache.subscriptions? this.cache.subscriptions[devicetk] : undefined;
    if(subscriptions){
      Object.keys(subscriptions).forEach((key)=>{
        subscriptions[key].emit(devicetk,JSON.stringify(event));
      });
    }
  },
  _returnError:function(msgRet,fnResponse){
      fnResponse(JSON.stringify({"status":false,
                                 "data":{},
                                 "message":msgRet}));
      this.ErrorHandler(msgRet);
  },
  LoginHandler:function(msg,fnResponse){
    // Get info from IoTServer RESTful API and store the user info in
    // this.user    
    this._login((user)=>{
      if(user){
        this.user = user;
        fnResponse(JSON.stringify({"status":true,
                                   "data":{},
                                   "message":"Logged in"}));
      }
      else{
        fnResponse(JSON.stringify({"status":false,
                                   "data":{},
                                   "message":"Login error"}));
      }                        
    });
  },
  // '40ee61e6-d7ac-45fa-a234-f9241be1cd2c:73974428-bd26-4220-8a7d-86b0a9afd4f1'
  RegistrationHandler:function(msg,fnResponse){
    // Check whether the user has access to the device he wants to get access to.
    if(msg.token_devices && msg.token_devices.length){
      var length = msg.token_devices.length,
          registered_devices = [];      
      while(--length>=0){
        (function(i){
          this._checkPermsForRegistration(msg.token_devices[i])
            .then((device_token)=>{
              if(device_token){
                this.registerListener(device_token);
                registered_devices.push(device_token);
              }
              if(!i){
                fnResponse(JSON.stringify({"status":true,
                                           "data":{"registered_devices":registered_devices},
                                           "message":""}));
              }
            })
            .catch((msg)=>{
              this._returnError(msg);
            });
        })(length);
      }
    }else{
      this._returnError("No token devices found to register");    
    }
  },
  UnregistrationHandler:function(msg,fnResponse){
    // Unregister the user for the given device monitoring
    if(msg.token_devices && msg.token_devices.length){
      var length = msg.token_devices.length;
      while(--length>=0){
        this.unregisterListener(msg.token_devices[length]);        
      }
    }else{
      this._returnError("No token devices found to unregister");
    }
  },
  ErrorHandler:function(reason){
	// TODO print the line that raised the error
	this.logger.error('[SocketIOHandler ERROR] '+reason);
  }
};

exports.SocketIOHandler = SocketIOHandler
