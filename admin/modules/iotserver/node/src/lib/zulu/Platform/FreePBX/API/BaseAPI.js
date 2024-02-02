/* jshint node: true, esversion: 6, -W027, -W119, -W033 */
//'use strict'
require("tls").DEFAULT_ECDH_CURVE = "auto"; // SMART-935. fix for TLS problems with node.js version 8.16.0. Please remove this after node version upgrade.
const request = require('request');
const { Promise } = require('bluebird');
const log = require('../../../../log');
const config = require('config');

const PORTS = global.process.env.PORTS ? JSON.parse(global.process.env.PORTS) : { api: { port: 80, ssl: false }, asterisk: { port: 8089, ssl: true }, zulu: { port: config.zulu.port, bindAddress: config.host } }

function BaseAPI() {
  this.port = PORTS.zulu.port
  let bindAddress = PORTS.zulu.bindAddress
  bindAddress = (bindAddress === '0.0.0.0') ? '127.0.0.1' : bindAddress
  this.options = {
    baseUrl: 'https://' + bindAddress + ':' + this.port + '/api/',
    json: true,
    strictSSL: false,
    timeout: 20000
  }
}

BaseAPI.prototype =  { 
 
  postResource: function(uri, body) {
    log.debug(`API <= [POST] [${uri}] [${JSON.stringify(body)}]`)
    return new Promise((resolve, reject) => {
      this.options.method = 'POST'
      this.options.uri = uri
      this.options.body = body
      request(this.options, (error, response, respbody) => {
        if (error) {
          reject(new Error(error))
          return
        }
        if (respbody) {
          log.debug(`API => [POST] [${uri}]: ${JSON.stringify(respbody)}`)
        }
        
        if (response.statusCode === 500) {
          return reject(new Error(response.statusMessage))
        }
        return resolve({ response: response, body: respbody })
      })
    });
  },

  getResource: function(uri) {
    log.debug(`API <= [GET] [${uri}]`)
    return new Promise((resolve, reject) => {
      this.options.method = 'GET'
      this.options.uri = uri
      request(this.options, (error, response, body) => {
        if (error) {
          reject(new Error(error))
          return
        }
        log.debug(`API => [GET] [${uri}]: ${JSON.stringify(body)}`)
        if (response.statusCode === 500) {
          return reject(new Error(response.statusMessage))
        }
        return resolve({ response: response, body: body })
      })
    });
  },

  putResource: function(uri, body) {
    log.debug(`API <= [PUT] [${uri}] [${JSON.stringify(body)}]`)
    return new Promise((resolve, reject) => {
      this.options.method = 'PUT'
      this.options.uri = uri
      this.options.body = body
      request(this.options, (error, response, body) => {
        if (error) {
          reject(new Error(error))
          return
        }
        log.debug(`API => [PUT] [${uri}]: ${JSON.stringify(body)}`)
        if (response.statusCode === 500) {
          return reject(new Error(response.statusMessage))
        }
        return resolve({ response: response, body: body })
      })
    });
  },

  deleteResource: function(uri) {
    log.debug(`API <= [DELETE] [${uri}]`)
    return new Promise((resolve, reject) => {
      this.options.method = 'DELETE'
      this.options.uri = uri
      request(this.options, (error, response, body) => {
        if (error) {
          reject(new Error(error))
          return
        }
        log.debug(`API => [DELETE] [${uri}]: ${JSON.stringify(body)}`)
        if (response.statusCode === 500) {
          return reject(new Error(response.statusMessage))
        }
        return resolve({ response: response, body: body })
      })
    });
  },

  patchResource: function(uri, body) {
    log.debug(`API <= [PATCH] [${uri}]`)
    return new Promise((resolve, reject) => {
      this.options.method = 'PATCH'
      this.options.uri = uri
      this.options.body = body
      request(this.options, (error, response, body) => {
        if (error) {
          reject(new Error(error))
          return
        }
        log.debug(`API => [PATCH] [${uri}]: ${JSON.stringify(body)}`)
        if (response.statusCode === 500) {
          return reject(new Error(response.statusMessage))
        }
        resolve({ response: response, body: body })
      })
    });
  }
};

module.exports = BaseAPI; 
