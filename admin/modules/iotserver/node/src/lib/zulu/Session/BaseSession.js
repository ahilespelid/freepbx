/* jshint node: true, esversion: 6, -W027, -W119, -W033 */
//'use strict'
function BaseSession(sessionid, connection) {
  this.id = sessionid
  this._connection = connection

  Object.defineProperty(this,"connection",{
    get(){ return this._connection; },
 });
}

BaseSession.prototype = {
  
  sendFalse: function(actionid) {
    this.sendJSON({
      status: false,
      actionid: actionid
    })
  },

  sendTrue: function(actionid) {
    this.sendJSON({
      status: true,
      actionid: actionid
    })
  },

  sendError: function(actionid, error) {
    this.sendJSON({
      status: false,
      actionid: actionid,
      message: error
    },
    'warn')
  },

  sendJSON: function(data, type = 'debug') {
    this._connection.sendUTF(JSON.stringify(data))
  }
};

module.exports = BaseSession
