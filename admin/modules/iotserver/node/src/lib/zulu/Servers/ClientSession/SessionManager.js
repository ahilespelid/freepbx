/* jshint node: true, esversion: 6, -W027, -W119, -W033 */
//'use strict'

const Session = require('./Session');
const log = require('../../../log');

function SessionManager (platform) {
  this.sessions = {}
  this._platform = platform
}

SessionManager.prototype =  {

  createSession: function(sessionid, connection) {
    if (this.isSessionDefined(sessionid)) {
      throw 'Session already exists!'
    }
    this.sessions[sessionid] = new Session(sessionid, connection, this._platform)
    return this.sessions[sessionid]
  },

  clearSession: function(sessionid) {
    if (this.isSessionDefined(sessionid)) {
      this.sessions[sessionid] = null
      delete this.sessions[sessionid]
    } else {
      log.warn('Trying to delete an untracked session')
    }
  },

  isSessionDefined: function(sessionid) {
    return (this.sessions[sessionid] !== undefined && this.sessions[sessionid] !== null)
  },

  getSession: function(sessionid) {
    return this.isSessionDefined(sessionid) ? this.sessions[sessionid] : undefined
  },

  getAllSessions: function() {
    return this.sessions
  },

  dispatchToSessions: function(event) {
    for(var sessionid in this.sessions) {
      var session = this.sessions[sessionid];
      if (session && session.authenticated) {
        if (event.type === "log") {

          if (session.user.is_admin) {
            // send log events to only admin users
            session.sendJSON(event, null); 
          }

        } else if ((event.event_type && event.event_type === "notification") && 
          (session.user.is_admin || session.user.iot_permission_groups.some(x => event.data.permission_groups.indexOf(x) !== -1) === true)) {
          // send notifications to only allowed sessions
          delete event.event_type;
          session.sendJSON(event, "debug" ); 
        } else if(event.type !== "image-capture" || (event.type === "image-capture" && session.captures.includes(event.topic))){
          var logType = (event.type !== "image-capture") ? "debug" : null;
          session.sendJSON(event, logType); 
        }
      }
    }
  }

};

module.exports = SessionManager
