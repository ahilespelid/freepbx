/* jshint node: true, esversion: 6, -W027, -W119, -W033 */
//'use strict'
const dash = require('lodash');
const util = require('util');
const BaseAPI = require('./BaseAPI');

function SessionAPI() {
  BaseAPI.call(this);
  this._token = null;
  this._version = null;
  this.options.headers = {
    'X-AUTH-TOKEN': null,
    'X-CLIENT-VERSION': null
  };

  Object.defineProperty(this,"token",{
    get(){ return this._token; },
    set(token){
     this._token = token;
     this.options.headers['X-AUTH-TOKEN'] = token
   }
 });

  Object.defineProperty(this,"version",{
    get(){ return this._version; },
    set(version){
     this._version = version;
     this.options.headers['X-CLIENT-VERSION'] = version;
   }
 });
}

// Inherits the prototype methods from the base model.
util.inherits(SessionAPI, BaseAPI);

  /**
   * Login using plaintext authentication
   *
   * @param {object} authData Authentication data
   * @param {string} authData.username Login username
   * @param {string} authData.password Login password
   * @param {string} authData.version Client version
   * @param {string} authData.type Client type
   * @param {string} authData.session Session ID
   * @param {string} authData.ip Client IP address
   * @returns {Promise<T>} Login response
   */
  SessionAPI.prototype.loginPlaintext = function(authData) {
    return this.postResource('/user/login/plaintext', authData)
      .then(res => res.body)
  };

  /**
   * Login using token authentication
   *
   * @param {object} authData
   * @param {string} authData.token Login token
   * @param {string} authData.version Client version
   * @param {string} authData.type Client type
   * @param {string} authData.session Session ID
   * @param {string} authData.ip Client IP address
   * @returns {Promise<T>}
   */
  SessionAPI.prototype.loginToken = function(authData) {
    return this.postResource('/user/login/token', authData)
      .then(res => res.body)
  };


   SessionAPI.prototype.generateLoginToken = function(authData) {
    return this.postResource('/user/generate/login/token', authData)
      .then(res => res.body)
  };



  /**
   * Get user config
   *
   * @returns {Promise<T>}
   */
  SessionAPI.prototype.getConfig = function() {
    return this.getResource('/user/config')
      .then(res => res.body)
  };

  /**
   * Get iot groups info
   *
   * @returns {Promise<T>}
   */
  SessionAPI.prototype.getAllGroups = function() {
    return this.getResource('/user/iotgroups')
      .then(res => res.body)
  };

  /**
   * Get the avatar for a user
   *
   * @param {string} username Username for the avatar to retrive
   * @returns {Promise<T>}
   */
  SessionAPI.prototype.getContactAvatar = function(username) {
    return this.getResource(`/contactmanager/${username}/avatar`)
      .then(res => res.body)
  };

  /**
   * Legacy (for pre-3.0 Zulu Desktop) method for retrieving contacts
   *
   * @returns {Promise<Array<T>>}
   */
  SessionAPI.prototype.getLegacyContacts = function() {
    return this.getResource('/contactmanager')
      .then(res => res.body)
  };

  /**
   * Legacy (for pre-3.0 Zulu Desktop) for retrieving the image for a contact.
   *
   * @param {string} did
   * @returns {Promise<T>}
   */
  SessionAPI.prototype.getLegacyContactImage = function(did) {
    return this.getResource(`/contactmanager/${did}/image`)
      .then(res => res.body)
  };

  /**
   * Retrieve a list of contacts.
   *
   * @returns {Promise<Array<T>>}
   */
  SessionAPI.prototype.getContacts = function() {
    return this.getResource('contact')
      .then(res => res.body)
  };

  /**
   * @typedef FaxFile
   *
   * @property {string} mime File type (application/pdf, image/tiff, application/postscript)
   * @property {string} data Base64 encoded file data
   */
  /**
   * Send a fax
   *
   * @param {object} faxdata
   * @param {Array<FaxFile>} faxdata.files Files to fax
   * @param {string} resolution Fax res (superfine, standard, fine (default))
   * @param {string} to Destination number
   * @param {boolean} coverpage Whether to send a cover page
   * @param {string} [recipientname] Cover page recipient name
   * @param {string} [message] Cover page message
   * @param {string} [myname] Cover page sender name
   * @param {string} [mytelephone] Cover page sender telephone
   * @param {string} [myemail] Cover page send email
   * @returns {Promise<T>}
   */
  SessionAPI.prototype.sendFax = function(faxdata) {
    return this.postResource('fax', faxdata)
      .then(res => res.body)
  };

  /**
   * Set mobile device push token
   *
   * @param {string} defaultExtension Extension?
   * @param {object} data
   * @param {string} data.platform Platform (android or ios)
   * @param {string} data.token Mobile push token
   * @returns {Promise<T>}
   */
  SessionAPI.prototype.setDeviceToken = function(defaultExtension, data) {
    return this.postResource('mobile/token/' + defaultExtension, data)
      .then(res => res.body)
  };

  /**
   * Return a list of valid presence states.
   *
   * @returns {Promise<T>}
   */
  SessionAPI.prototype.getPresenceStateList = function() {
    return this.getResource('/presencestate/list')
      .then(res => dash.get(res.body, 'states'))
  };

  /**
   * Changes the current presence state.
   *
   * @param stateId
   * @returns {Promise<T>}
   */
  SessionAPI.prototype.setPresenceState = function(stateId) {
    return this.postResource('presencestate/set', { id: stateId })
      .then(res => res.body)
  };

  /**
   * Send an SMS message.
   *
   * @param message
   * @returns {Promise<T>}
   */
  SessionAPI.prototype.sendSMS = function(message) {
    return this.postResource('sms', message)
      .then(res => res.body)
  };

  /**
   * Get SMS enabled DIDs.
   *
   * @returns {Promise<T>}
   */
  SessionAPI.prototype.getAllSmsDids = function() {
    return this.getResource('smsdids')
      .then(res => dash.get(res.body, 'dids'))
  };

module.exports = SessionAPI; 
