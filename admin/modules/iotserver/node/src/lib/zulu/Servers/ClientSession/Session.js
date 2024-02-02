/* jshint node: true, esversion: 6, -W027, -W119, -W033 */
//'use strict'
const BaseSession = require('../../Session/BaseSession');
const log = require('../../../log');
const timestamp = require('unix-timestamp');
const util = require('util');

timestamp.round = true

function Session(sessionid, connection, platform) {
  BaseSession.call(this, sessionid, connection);
  this._user = {}
  this._connected = timestamp.now()
  this._token = null
  this._clientVersion = null
  this._clientType = null
  this._lastConnected = null
  this._contactuuid = null
  this._uid = null
  this._apps = null
  this._appData = null
  this._authenticated = false
  this.api = platform.newSessionAPI()


  Object.defineProperty(this,"authenticated",{
    get(){ return this._authenticated; },
    set(authenticated){
     this._authenticated = authenticated;
   }
 });

  Object.defineProperty(this,"uid",{
    get(){ return this._uid; },
    set(uid){
     this._uid = uid;
   }
 });

  Object.defineProperty(this,"apps",{
    get(){ return this._apps; },
    set(apps){
     this._apps = apps;
   }
 });

  Object.defineProperty(this,"appData",{
    get(){ return this._appData; },
    set(appData){
     this._appData = appData;
   }
 });


  Object.defineProperty(this,"token",{
    get(){ return this._token; },
    set(token){
     this._token = token;
     this.api.token = token; 
   }
 });


  Object.defineProperty(this,"clientVersion",{
    get(){ return this._clientVersion; },
    set(clientVersion){
     this._clientVersion = clientVersion;
   }
 });


  Object.defineProperty(this,"clientType",{
    get(){ return this._clientType; },
    set(clientType){
     this._clientType = clientType;
   }
 });


  Object.defineProperty(this,"user",{
    get(){ return this._user; },
    set(user){
     this._user = user;
   }
 });


  Object.defineProperty(this,"contactuuid",{
    get(){ return this._contactuuid; },
    set(contactuuid){
     this._contactuuid = contactuuid;
   }
 });


  Object.defineProperty(this,"lastConnected",{
    get(){ return this._lastConnected; },
    set(lastConnected){
     this._lastConnected = lastConnected;
   }
 });

  Object.defineProperty(this,"connected",{
    get(){ return this._connected; },
    set(connected){
     this._connected = connected;
   }
 });
}

// Inherits the prototype methods from the base model.
util.inherits(Session, BaseSession);

Session.prototype.sendJSON = function(data, type = 'debug') {
  if (log[type]) {
    log[type](
      'SERVER => [CLIENT] [' +
      this._connection.remoteAddress +
      '] [' +
      this.id +
      ']:' +
      JSON.stringify(data)
      )
  }
  BaseSession.prototype.sendJSON.call(this, data,type)
};


module.exports = Session
