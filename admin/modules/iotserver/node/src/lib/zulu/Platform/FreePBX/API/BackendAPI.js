/* jshint node: true, esversion: 6, -W027, -W119, -W033 */
const BaseAPI = require('./BaseAPI');
const util = require('util');

/**
 * Base class for interacting with backend services.
 *
 * @property {string} token Server token for authenticating with the backend
 */
 function BackendAPI() {
  BaseAPI.call(this);
  this._token = null
  this._version = null
  this.options.headers = {
    'X-SERVER-TOKEN': null
  }

  Object.defineProperty(this,"token",{
    get(){ return this._token; },
    set(token){
      this._token = token;
      this.options.headers['X-SERVER-TOKEN'] = token
    }
  });
}

// Inherits the prototype methods from the base model.
util.inherits(BackendAPI, BaseAPI);

/**
  * Send a notification email.
  *
  * @param {string} zid Id of the user to whom to send the message
  * @param {string} sender Email address of the sender
  * @param {string} text Text of the email
  * @param {boolean} mentioned
*/
BackendAPI.prototype.sendNotificationEmail = function(zid, sender, data) {
  return new Promise((resolve, reject) => {
    this.postResource('user/' +zid +'/email/notify',{sender: sender, data: data}).then(res => {
      return resolve(res.body)
    }).catch(err => {
      return reject(err);
    });
  })
}


BackendAPI.prototype.getSRCredentials = function() {
  return new Promise((resolve, reject) => {
    this.getResource('sr/credentials').then(res => {
      return resolve(res.body)
    }).catch(err => {
      return reject(err);
    });
  })
}

// data: {fname: <first_name>, lname: <last_name>, email: <email>, company: <company>}
BackendAPI.prototype.addUser = function(data) {
  return new Promise((resolve, reject) => {
    this.postResource('user/add', data).then(res => {
      return resolve(res.body)
    }).catch(err => {
      return reject(err);
    });
  })
}

/**
  * Gets the user with the given username.
  *
  * @param {string} username Username to lookup
  * @returns {Promise<*>} Associated user object
  */
BackendAPI.prototype.getUserByUsername = function(username) {
  return new Promise((resolve, reject) => {
    this.getResource('user/' + username)
    .then(result => {
      return resolve(result.body)
    })
    .catch(err => {
      return reject(err)
    })
  })
}

/**
 * Gets all user permissions
 * 
 * @returns {Promise<*>} Array with user's permissions information
 */
BackendAPI.prototype.getUsersPermissions = function () {
  return new Promise((resolve, reject) => {
    this.getResource('user/all/permissions')
      .then(result => {
        return resolve(result.body);
      })
      .catch(err => {
        return reject(err);
      })
  })
}

BackendAPI.prototype.getDisplayName = function () {
  return new Promise((resolve, reject) => {
    this.getResource('displayname')
      .then(result => {
        return resolve({display_name: result.body.data});
      })
      .catch(err => {
        return reject(err);
      })
  })
}

BackendAPI.prototype.updateDisplayName = function (data) {
  return new Promise((resolve, reject) => {
    this.postResource('displayname/update', data).then(res => {
      return resolve(res.body)
    }).catch(err => {
      return reject(err);
    });
  })
}

module.exports = BackendAPI; 
  

  

