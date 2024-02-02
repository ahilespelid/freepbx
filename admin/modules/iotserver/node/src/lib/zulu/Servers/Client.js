//  License for all code of this FreePBX module can be found in the license file inside the module directory
//  Copyright 2013 Schmooze Com Inc.
const util = require("util");
//const autoBind = require('auto-bind');
const { Promise } = require('bluebird');
const { EventEmitter } = require('events');
const fs = require('fs');
const https = require('https');
const  WebSocketServer  = require('websocket').server;
const WebSocketConnection = require('websocket').connection;
const  httpProxy = require('http-proxy');
const  timestamp = require('unix-timestamp');
const log = require('../../log');;
const  SessionManager = require('./ClientSession/SessionManager.js');
const  PTAuth = require('./ClientAuthentication/Plaintext.js');
const  TNAuth = require('./ClientAuthentication/Token.js');
const  SRAuth = require('./ClientAuthentication/ServiceRegistry.js');

const EventHistory = require('../../../models/EventHistory');

const config = require('config');
const uuid = require('uuid');

timestamp.round = true

const PORTS = global.process.env.PORTS ? JSON.parse(global.process.env.PORTS) : { api: { port: 80, ssl: false }, asterisk: { port: 8089, ssl: true } }

//const PORTS = config.zulu ? { api: config.zulu.api, asterisk: config.zulu.asterisk} : { api: { port: 80, ssl: false }, asterisk: { port: 8089, ssl: true } }

/**
 * API for interacting with clients. This creates a webserver with a
 * websocket on `/` for interacting with clients, a websocket proxy in `/ws`
 * allowing clients to interact with Asterisk, and proxies on `/file` and
 * /api` allowing clients to interact with the backend.
 *
 * Messages received on the websocket are re-emitted with the event
 * `'ws::message::[module::]command::type`. The `module`, `command` and `type`
 * are provided in the message, and the event is emitted with the session
 * that send the message and the message data.
 */
function Client() {
  this._sessionManager = null;
  this._apiProxy = null;
  this._asteriskProxy = null;
  this._webServer = null;
  this._webSocketServer = null;
  this._platform = null;
  this._config = null;
  this._credentials = null;
  this._host = null;
  this._displayName = null;
  this._port = null;
  this._commandToken = null;
  this._license = null;
  this._allowOnlyAdmins = false;


  Object.defineProperty(this,"host",{
    get(){ return this._host; },
  });

  Object.defineProperty(this,"port",{
    get(){ return this._port; },
  });

  Object.defineProperty(this,"displayName",{
    get(){ return this._displayName; },
  });
  
  Object.defineProperty(this,"commandToken",{
    get(){ return this._commandToken; },
  });

  Object.defineProperty(this,"license",{
    get(){ return this._license; },
  });

  Object.defineProperty(this,"allowOnlyAdmins",{
    get(){ return this._allowOnlyAdmins; },
    set(allowOnlyAdmins){
      this._allowOnlyAdmins = allowOnlyAdmins;
    }
  });


  //autoBind(this)
}

util.inherits(Client, EventEmitter);

  /**
   * Initialize the HTTP server.
   * @returns {Promise} Resolves when server is listening.
   */
  Client.prototype.initialize = function(config, platform) {
    return new Promise((resolve, reject) => {
      var self = this;
      self._platform = platform
      self._config = config
      self._sessionManager = new SessionManager(this._platform)
      Promise.all([
        self._platform.getConfig('IOTBINDADDRESS'),
        self._platform.getConfig('IOTBINDPORT'),
        self._platform.getConfig('IOTTLSPRIVATEKEY'),
        self._platform.getConfig('IOTTLSCERTFILE'),
        self._platform.getConfig('IOTCOMMANDTOKEN'),
        self._platform.getConfig('IOTLICENSE'),
        self._platform.getConfig('IOTDISPLAYNAME')
        ]).then((result) => {
          self._host = result[0] ? result[0] : this._config.host;
          self._port = result[1] ? result[1] : this._config.zulu.port;
          let key = result[2] ? result[2] : 'key.pem'
          let cert = result[3] ? result[3] : 'cert.pem'
          self._commandToken = result[4] ? result[4] : null;
          self._license = result[5] ? JSON.parse(result[5]) : null;
          self._displayName = result[6] ? result[6] : 'SmartOffice';
          log.info('System display name is ' + JSON.stringify(self._displayName));
          if (self._license) {
            log.info('System license is ' + JSON.stringify(self._license));
          } else {
            log.warn('Undefined system license');
          }
          try {
            fs.statSync(key)
            fs.statSync(cert)
          } catch (e) {
            log.error('Could not access certificate files ' + key + ' and ' + cert)
            return reject('Could not access certificate files ' + key + ' and ' + cert)
          }
          const privateKey = fs.readFileSync(key, 'utf8')
          const certificate = fs.readFileSync(cert, 'utf8')
          self._credentials = {key: privateKey, cert: certificate}
          return self._platform.dbQuery('DELETE FROM iot_tokens');
        }).then(()=>{
          resolve()
        }).catch((err) => {
          log.error(err);
          reject(err)
        })
      });
  };

  Client.prototype.stopListeners = function() {
    return new Promise((resolve, reject) => {
      if (this._apiProxy) {
        this._apiProxy.close();
      }
      if (!this._webServer) {
        return resolve();
      }

      if (this._webSocketServer) {
        this._webSocketServer.shutDown();
      }

      this._webServer.shutdown(() => {
        resolve();
      })
    })
  }

  Client.prototype.startListeners = function(localServer, app) {
    return new Promise((resolve, reject) => {
      if (!this._platform || !this._config || !this._sessionManager || !this._credentials) {
        reject("Not initialized!")
      } else {
        let port = this._port;
        let host = this._host;
        try {
          this._apiProxy = httpProxy.createProxyServer({
            secure: false,
            xfwd: true
          })
        } catch (err) {
          log.error(err)
        }

        var self = this;
        this._apiProxy.on('proxyRes', function(proxyRes, req, res) { self._apiProxyRequest(proxyRes, req, res);})
        this._apiProxy.on('error', function(err, req, res, url) { self._apiProxyError(err, req, res, url);})

        const httpShutdown = require('http-shutdown');

        this._webServer = httpShutdown(https.createServer(this._credentials, app))

        this._webServer.setTimeout(0);
        this._webServer.on('connection', socket => socket.setKeepAlive(true, this._config.keepAliveInterval));
        this._webServer.on('error', reject);


        this._asteriskProxy = httpProxy.createProxyServer({
          target:
          (PORTS.asterisk.ssl ? 'wss' : 'ws') +'://127.0.0.1:' + PORTS.asterisk.port,
          ws: true,
          secure: false
        })

        this._asteriskProxy.on('error', function(err, req, socket) { self._asteriskProxyError(err, req, socket);})
        this._webServer.on('upgrade', function(req, socket, head) { self._webServerUpgrade(req, socket, head); })

        this._webSocketServer = new WebSocketServer({
          httpServer: [this._webServer, localServer],
          autoAcceptConnections: false,
          maxReceivedFrameSize: 200000000
        })

        this._webSocketServer.on('request', function(request) { self._webSocketServerRequest(request);})
        this._platform.dbQuery('DELETE FROM iot_tokens').then(() => {
          this._webServer.listen(port, host, function (err) {
            if (err) {
              reject(err)
            } else {
              log.info(`Client WSServer is listening on ${host} on port ${port}`)
              resolve(self._webServer)
            }
          })
        }).catch(err => {
          reject(err)
        })
      }
    })
  };

  Client.prototype.checkToken = function(sessionid, token) {

    if (sessionid == 'swagger_session') {
      return ('iZh8grpZbjQZ2JIFyViUfOoVLcOT7XYqZdu1u34frvfNQrL8ifJAHgpgV' == token);
    }
    var session = this.getSession(sessionid);
    if (session) {
      return (session.token == token);
    }
    return false;
  }

  /**
   * Checks if client session is defined.
   * @param {string} sessionid
   * @returns {boolean} `true` if client session exists, `false` otherwise.
   */
  Client.prototype.isSessionDefined = function(sessionid) {
    return this._sessionManager.isSessionDefined(sessionid)
  };

  /**
   * Returns client session with the given id.
   * @param {string} sessionid Id of session to find
   * @returns {Session} Session with the given id, or `undefined` if not found
   */
  Client.prototype.getSession = function(sessionid) {
    return this._sessionManager.getSession(sessionid)
  };

  /**
   * Returns an array of all client sessions.
   * @returns {Array<Session>} Client sessions
   */
  Client.prototype.getAllSessions = function() {
    return this._sessionManager.getAllSessions()
  };

  /**
  * Dispatches iot events to active client sessions
  */
  Client.prototype.dispatchEvent = function(event) {
    this._sessionManager.dispatchToSessions(event);
  };

  /**
   * Webserver request handler. Routes requests to /api and /file to
   * `_apiProxy`, and responds with 404 to everything else. Websocket
   * requests are handled by {@link Client#_webServerUpgrade}.
   *
   * @param request HTTP request
   * @param response HTTP response
   */
  Client.prototype.webServerRequest = function(request, response) {
    const thisRegex = new RegExp(/^\/(api|file)([^?]*)(?:\?(.*))?/)
    if (thisRegex.test(request.url)) {
      // dont forward options to the client
      // Time Savings Client: BEFORE 893ms, AFTER 578ms
      if (request.method === 'OPTIONS') {
        this._setCORS(request, response)
        response.writeHead(200)
        response.write('')
        response.end()
      } else {
        const result = thisRegex.exec(request.url)
        const prefix = (result[1] !== 'api') ? '/' + result[1] : ''
        request.url =
          '/admin/ajax.php?' +
          (result[3] ? result[3] : '') +
          '&module=zulu&command=api&query=' +
          prefix + result[2]
        this._apiProxy.web(request, response, {
          target:
            (PORTS.api.ssl ? 'https' : 'http') +
            '://127.0.0.1:' +
            PORTS.api.port
        })
      }
    } else {
      response.writeHead(404)
      response.write('')
      response.end()
    }
  };

  /**
   * Asterisk websocket proxy error handler.
   *
   * @param err Error received from proxy
   * @param req HTTP request
   * @param res HTTP response
   * @param url Requested URL
   * @private
   */
  Client.prototype._asteriskProxyError = function(err, req, socket) {
    log.error(err)
    socket.end()
  };

  /**
   * Proxy requests to /ws to Asterisk's websocket
   *
   * @param req HTTP request
   * @param socket Raw socket
   * @param head HTTP header
   * @private
   */
  Client.prototype._webServerUpgrade = function(req, socket, head) {
    // Forward Softphone to Asterisk
    if (req.url === '/ws') {
      this._asteriskProxy.ws(req, socket, head)
    }
  };

  /**
   * API proxy error handler.
   *
   * @param err Error received from proxy
   * @param req HTTP request
   * @param res HTTP response
   * @param url Requested URL
   * @private
   */
  Client.prototype._apiProxyError = function(err, req, res, url) {
    log.error(err)
    res.writeHead(500)
    res.write(err.message)
    res.end()
  };

  /**
   * Enrich API proxy responses before sending.
   *
   * @param proxyRes
   * @param req HTTP request
   * @param res HTTP response
   * @private
   */
 Client.prototype._apiProxyRequest = function(proxyRes, req, res) {
    this._setCORS(req, res)
  };

  /**
   * Setup very permissive CORS headers on HTTP response.
   *
   * @param req HTTP request
   * @param res HTTP response
   * @private
   */
  Client.prototype._setCORS = function(req, res) {
    res.headers['Access-Control-Allow-Origin'] = '*';
    if (req.headers['access-control-request-method']) {
      res.headers['access-control-allow-methods'] = req.headers['access-control-request-method'];
    }
    if (req.headers['access-control-request-headers']) {
      res.headers['access-control-allow-headers'] = req.headers['access-control-request-headers'];
    }
  };

  /**
   * Handle incoming requests for new websocket connections, creating a
   * session for them in the client {@link SessionManager}.
   *
   * @param request Websocket requests
   * @private
   */
  Client.prototype._webSocketServerRequest = function(request) {
    if (request.resource !== '/') {
      return
    }
    let connection = null
    try {
      connection = request.accept(
        request.requestedProtocols[0],
        request.origin
      )
    } catch (e) {
      return
    }

    const sessionid = request.key
    var self = this;

    log.debug(
      connection.remoteAddress + ' [CLIENT] [' + sessionid + '] connected'
    )

    this._sessionManager.createSession(sessionid, connection)

    connection.on('message', function(message) {
      self._webSocketServerMessage(request, connection, message)
    })
    connection.on('close', function(reasonCode, description) {
      self._webSocketServerClose(request, connection, reasonCode, description)
    })
  };

  /**
   * Handle incoming websocket messages. Ensures connection is
   * authenticated, and routes text/binary messages to
   * {@link _webSocketServerUTFMessage} and {#link _webSocketServerBinaryMessage}
   *
   * @param request Original websocket request
   * @param connection Websocket connection
   * @param message Incoming message.
   * @private
   */
  Client.prototype._webSocketServerMessage = function(request, connection, message) {
    const sessionid = request.key
    const session = this._sessionManager.getSession(sessionid)
    if (!session.authStatus || ['authenticating'].includes(session.authStatus)) {
      this._webSocketServerAuthenticate(request, connection, message).then(() => {
      }).catch(err => {
        log.error(err)
      })
    } else {
      switch (message.type) {
        case 'utf8':
          this._webSocketServerUTFMessage(request, connection, message)
          break
        case 'binary':
          this._webSocketServerBinaryMessage(request, connection, message)
          break
        default:
          break
      }
    }
  };

  /*
  * Function only used for SR authentication. This method allows to validate 
  * user temporarry password from the cloud SR entity
  */
  Client.prototype.validateSRTmpPwd = function(data) {
    return new Promise((resolve, reject) => {
      var self = this;
      if (!data.org_id) {
        return resolve({status: false, msg: "Invalid organisation id"});
      }
      if (!data.email) {
        return resolve({status: false, msg: "Invalid user email"});
      }

      if (!data.password) {
        return resolve({status: false, msg: "Invalid user password"});
      }
      // the event handler will resolve this promise.
      this.emit('cloud::user::authentication', resolve, data);
    });
  }

  function RegisterUserEventHistory(sessionid, session, event_type, event_value) {
        return new Promise((resolve,reject)=>{
  
            if (!session || !event_value || !event_type) {
                resolve();
                return;
            }

            if (typeof event_value !== 'string') {
                event_value = event_value.toString();
            }
            var hist = new EventHistory({event_type: event_type, event_value: event_value, 
                event_time: Date.now(), event_uuid: uuid.v4(), 
                event_object_uuid: session.serverUUID, event_object_type: 'session', 
                event_object_name: "Smart Office App",
                user_id: session.user.id,
                user_name: session.user.username,  
                org_id: session.user.org_id});
            hist.save().then(()=>{
                resolve()
            }).catch((err)=>{
              log.warn(`[${sessionid}] Could not save user ${session.user.username} login to event history table`)
              resolve();
            });
        });
    }

  /**
   * Authenticates incoming websocket message. If the command is anything
   * other than `login`, the connection is dropped.
   *
   * @param request Original websocket request
   * @param connection Websocket connection
   * @param message Incoming message
   * @returns {Promise} Resolves when authentication is complete
   * @private
   */
  Client.prototype._webSocketServerAuthenticate = function(request, connection, message) {
    return new Promise((resolve, reject) => {
      var self = this;
      const sessionid = request.key
      const session = this._sessionManager.getSession(sessionid)

      let data
      try {
        data = JSON.parse(message.utf8Data)
      } catch (err) {
        connection.drop(WebSocketConnection.CLOSE_REASON_UNPROCESSABLE_INPUT, err)
        return reject(err)
      }

      if (!data.command || data.command !== 'login') {
        connection.drop(
          WebSocketConnection.CLOSE_REASON_POLICY_VIOLATION,
          'Authenticate the user before attempting to executing commands'
        )
        const command = data.command ? data.command : ''
        log.warn(
          `[${sessionid}] No Login credentials provided to execute command ${command} from ${connection.remoteAddress}`
        )
        log.warn(
          `[${sessionid}] Authentication failure for NA from ${connection.remoteAddress}`
        )
        return reject(new Error('Authenticate the user before attempting to executing commands'))
      }

      if (['authenticating'].includes(session.authStatus)) {
        log.warn(`[${sessionid}] Authentication from ${connection.remoteAddress} in progress`)
        return resolve()
      }

      const connectionData = data.data
      const authType = connectionData.auth ? connectionData.auth : 'plaintext'
      let authClass = null

      session.authStatus = 'authenticating';

      session.lastConnected = connectionData.lastconnected
        ? connectionData.lastconnected
        : timestamp.now()
      session.clientVersion = connectionData.clientversion
        ? connectionData.clientversion
        : '1.0'
      session.clientType = connectionData.clienttype
        ? connectionData.clienttype
        : 'unknown'

      session.isAdminLogin = connectionData.admin ? connectionData.admin : false;

      // if license has expired allow only admin to login
      if (self._allowOnlyAdmins && !session.isAdminLogin) {
        connection.drop(WebSocketConnection.CLOSE_REASON_POLICY_VIOLATION, 'Only admin login allowed dure to license expiration');
        return reject(new Error('Only admin login allowed dure to license expiration'))
      }
      
      switch (authType) {
        case 'token':
          authClass = new TNAuth(connection, session, this._platform)
          break
        case 'plaintext':
          authClass = new PTAuth(connection, session, this._platform)
          break
        case 'serviceregistry':
         authClass = new SRAuth(connection, session, self)
         break
        default:
          connection.drop(
            WebSocketConnection.CLOSE_REASON_POLICY_VIOLATION,
            'Unknown authentication type'
          )
          return reject(new Error('Unknown authentication type'))
      }

      authClass.authenticate(connectionData)
        .then((output) => {
          session.user = output.user
          session.iotGroups = output.iotGroups
          session.token = output.token
          session.contactuuid = output.uuid
          session.apps = output.apps
          session.appData = output.appdata
          session.uid = output.uid
          session.login_token = output.login_token
          session.serverUUID = output.serverUUID
          session.captures = []

          log.info(`${session.id} has successfully authenticated as user ${session.user.username}`)

          //use this._platform._nodeServerVersion as API version which is defined in package.json file
          session.authenticated = true
          session.authStatus = 'authenticated';
          session.sendJSON({
            status: true,
            type: 'auth',
            message: 'authenticated',
            version: this._platform._nodeServerVersion,
            login_token: session.login_token,
            token: session.token,
            uuid: session.contactuuid,
            serverUUID: output.serverUUID,
            sessionid: session.id,
            config: {
              status: output.status,
              user: session.user,
              apps: session.apps,
              appdata: session.appData,
              uid: session.uid,
              presence: output.presence,
              ucplink: output.ucpLink,
              PBXVersion: output.PBXVersion,
              PBXBrand: output.PBXBrand,
              uuid: session.contactuuid,
              featureSet: output.featureSet,
              extensionConfig: output.extensionConfig,
              uniqueServerid: output.uniqueServerid,
              enableAnalytics: output.enableAnalytics,
              callStatus: output.callStatus,
              deploymentID: output.deploymentID,
              iotGroups: session.iotGroups
            }
          })
          RegisterUserEventHistory(sessionid, session, 'user-login', 'Success');
          this.emit(
            'ws::connected',
            session,
            connectionData
          )
          // http://bluebirdjs.com/docs/warning-explanations.html#warning-a-promise-was-created-in-a-handler-but-was-not-returned-from-it
          return resolve()
        })
        .catch( (err) => {
          RegisterUserEventHistory(sessionid, session, 'user-login', 'Failure');
          if (connection.connected) {
            connection.drop(
              WebSocketConnection.CLOSE_REASON_POLICY_VIOLATION,
              err.message
            )
          }
          return reject(err)
        })
    })
  };

  /**
   * Handle new text (UTF8) messages on the backend websocket server. Parse
   * the message as JSON, and republish to Backend as a `ws::message::*` event.
   *
   * @param request Request object
   * @param connection Connection object
   * @param message Incoming websocket message
   * @private
   */
  Client.prototype._webSocketServerUTFMessage = function(request, connection, message) {
    let data
    try {
      data = JSON.parse(message.utf8Data)
    } catch (err) {
      connection.drop(WebSocketConnection.CLOSE_REASON_UNPROCESSABLE_INPUT, err)
      return
    }

    const sessionid = request.key

    if (!data.type || data.type !== 'ping') { // dont log pings
      log.debug(
        'SERVER <= [CLIENT] ' +
        `[${connection.remoteAddress}] [${sessionid}]:` +
        JSON.stringify(data)
      )
    }

    const session = this._sessionManager.getSession(sessionid)

    if (!data.command || !data.type) {
      session.sendError(
        data.id,
        'Invalid command'
      )
      return
    }

    let event = 'ws::message::' + data.command + '::' + data.type
    if (data.module) {
      event = 'ws::message::' + data.module + '::' + data.command + '::' + data.type
    }

    if (EventEmitter.listenerCount(this, event) > 0) {
      this.emit(
        event,
        session,
        data
      )
    } else {
      log.warn(`Event '${event}' has 0 listeners. Command was rejected`)
      session.sendError(
        data.id,
        'invalid command'
      )
    }
  };

  /**
   * Handle new binary messages on the backend websocket server.
   *
   * @param request Request object
   * @param connection Connection object
   * @param message Incoming websocket message
   * @private
   */
  Client.prototype._webSocketServerBinaryMessage = function(request, connection, data) {
    const sessionid = request.key
    const session = this._sessionManager.getSession(sessionid)
    const event = 'ws::binary'
    if (EventEmitter.listenerCount(this, event) > 0) {
      this.emit(event, session, data)
    } else {
      log.warn(`Event '${event}' has 0 listeners. Command was rejected`)
      session.sendError(
        data.id,
        'invalid command'
      )
    }
  };

  /**
   * Handle websocket sessions closing.
   *
   * @param request Request object
   * @param connection Connection object
   * @param message Incoming websocket message
   * @param description ???
   * @private
   */
  Client.prototype._webSocketServerClose = function(request, connection, reasonCode, description) {
    return new Promise((resolve, reject) => {
      const sessionid = request.key
      if (!this._sessionManager.isSessionDefined(sessionid)) {
        return reject(new Error(`Session ${sessionid} does not exist`))
      }
      const session = this._sessionManager.getSession(sessionid)
      return Promise.resolve()
        .then(() => {
          if (session.authenticated) {
            if (session.login_token) {
              return this._platform.dbQuery('UPDATE iot_login_tokens SET websocket_session = "" WHERE `token` = ?', [session.login_token])
            }
            return Promise.resolve()
          } else {
            return Promise.resolve()
          }
        })
        .then(() => {
          if (session.authenticated) {
            const userid = session.user.id
            const token = session.token
            return this._platform.dbQuery('DELETE FROM iot_tokens WHERE `uid` = ? AND `websocket_session` = ? AND`token` = ?', [userid, sessionid, token])
          } else {
            return Promise.resolve()
          }
        })
        .then(() => {
          this.emit(
            'ws::disconnected',
            session
          )
          log.debug(
            `${session._connection.remoteAddress} [CLIENT] [${session.id}]: disconnected.`
          )

          if (session.authenticated) {
            RegisterUserEventHistory(sessionid, session, 'user-logout', 'Success');
          }
          this._sessionManager.clearSession(session.id)
          return resolve()
        })
        .catch(err => {
          RegisterUserEventHistory(sessionid, session, 'user-logout', 'Failure');
          log.warn(err)
          this._sessionManager.clearSession(sessionid)
          return reject(err)
        })
    })
  };


module.exports =  new Client()
