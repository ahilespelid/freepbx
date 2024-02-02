import { Promise } from 'bluebird'
import { EventEmitter } from 'events'
import { SessionManager } from './ClientSession/SessionManager.js'
import { Plaintext as PTAuth } from './ClientAuthentication/Plaintext.js'
import { Token as TNAuth } from './ClientAuthentication/Token.js'
import httpProxy from 'http-proxy'
import https from 'https'
import client from './Client'

jest.mock('fs')
jest.mock('events')
jest.mock('https')
jest.mock('websocket')
jest.mock('http-proxy')
jest.mock('./ClientAuthentication/Plaintext.js')
jest.mock('./ClientAuthentication/Token.js')
jest.mock('./ClientSession/SessionManager')

describe('Client is', () => {
  let platform
  beforeEach(() => {
    platform = {
      getConfig: jest.fn(),
      dbQuery: jest.fn()
    }
  })

  it('Check constructor set properties', () => {
    expect(client._sessionManager).toEqual(null)
    expect(client._apiProxy).toEqual(null)
    expect(client._asteriskProxy).toEqual(null)
    expect(client._webServer).toEqual(null)
    expect(client._webSocketServer).toEqual(null)
    expect(client._platform).toEqual(null)
  })
  it('Check startListeners function rejects if getConfig fails', () => {
    platform.getConfig.mockRejectedValue(new Error('getConfig failed'))
    return expect(client.startListeners(platform)).rejects.toEqual(new Error('getConfig failed'))
  })
  it('Check startListeners function rejects if dbQuery fails', () => {
    platform.getConfig.mockReturnValue(Promise.resolve('value'))
    platform.dbQuery.mockRejectedValue(new Error('dbQuery failed'))
    httpProxy.createProxyServer.mockReturnValue({ on: jest.fn() })
    https.createServer.mockReturnValue({ on: jest.fn() })
    return expect(client.startListeners(platform)).rejects.toEqual(new Error('dbQuery failed'))
  })
  it('Check startListeners function rejects if error', () => {
    platform.getConfig.mockReturnValue(Promise.resolve('value'))
    platform.dbQuery.mockReturnValue(Promise.resolve())
    httpProxy.createProxyServer.mockReturnValue({ on: jest.fn() })
    https.createServer.mockReturnValue({
      on: jest.fn(),
      listen: (a, b, c) => c(new Error('error'))
    })
    return expect(client.startListeners(platform)).rejects.toEqual(new Error('error'))
  })
  it('Check startListeners function resolves', () => {
    const proxy = jest.fn()
    const webServer = jest.fn()
    platform.getConfig.mockReturnValue(Promise.resolve('value'))
    platform.dbQuery.mockReturnValue(Promise.resolve())
    httpProxy.createProxyServer.mockReturnValue({ on: proxy })
    https.createServer.mockReturnValue({
      on: webServer,
      listen: (a, b, c) => c(null)
    })
    return client.startListeners(platform).then(() => {
      expect(proxy).toHaveBeenCalledTimes(3)
      expect(webServer).toHaveBeenCalledTimes(1)
    })
  })
  it('Check isSessionDefined return value of sessionManager function', () => {
    client._sessionManager = {
      isSessionDefined: jest.fn()
    }
    client._sessionManager.isSessionDefined.mockReturnValue(true)
    expect(client.isSessionDefined('id')).toEqual(true)
  })
  it('Check getSession function return value of sessionManager function', () => {
    client._sessionManager = {
      getSession: jest.fn()
    }
    client._sessionManager.getSession.mockReturnValue('session')
    expect(client.getSession('id')).toEqual('session')
  })
  it('Check getAllSessions function return value of sessionManager function', () => {
    client._sessionManager = {
      getAllSessions: jest.fn()
    }
    client._sessionManager.getAllSessions.mockReturnValue('allSessions')
    expect(client.getAllSessions()).toEqual('allSessions')
  })
  it('Check asteriskProxyError function call socket.end function', () => {
    const socket = {
      end: jest.fn()
    }
    client._asteriskProxyError('', '', socket)
    expect(socket.end).toHaveBeenCalledTimes(1)
  })
  it('Check webServerUpgrade function call astersikProxy if req.url==="/ws"', () => {
    const req = {
      url: '/ws'
    }
    client._asteriskProxy = {
      ws: jest.fn()
    }
    client._webServerUpgrade(req, 'socket', 'head')
    expect(client._asteriskProxy.ws).toHaveBeenCalledWith(req, 'socket', 'head')
  })
  it('Check webServerRequest function writeHead 404 if request.url is not correct', () => {
    const req = {
      url: ''
    }
    const response = {
      writeHead: jest.fn(),
      write: jest.fn(),
      end: jest.fn()
    }
    client._webServerRequest(req, response)
    expect(response.writeHead).toHaveBeenCalledWith(404)
    expect(response.write).toHaveBeenCalledTimes(1)
    expect(response.end).toHaveBeenCalledTimes(1)
  })
  it('Check webServerRequest function writeHead 200 if method is OPTIONS', () => {
    const req = {
      url: '/api',
      method: 'OPTIONS'
    }
    const response = {
      writeHead: jest.fn(),
      write: jest.fn(),
      end: jest.fn()
    }
    const setCors = client._setCORS
    client._setCORS = jest.fn()
    client._webServerRequest(req, response)
    expect(response.writeHead).toHaveBeenCalledWith(200)
    expect(response.write).toHaveBeenCalledTimes(1)
    expect(response.end).toHaveBeenCalledTimes(1)
    expect(client._setCORS).toHaveBeenCalledTimes(1)
    client._setCORS = setCors
  })
  it('Check webServerRequest function call apiProxyweb if method is not OPTIONS', () => {
    const req = {
      url: '/api',
      method: 'POST'
    }
    client._apiProxy = {
      web: jest.fn()
    }
    client._webServerRequest(req, {})
    expect(client._apiProxy.web).toHaveBeenCalledTimes(1)
  })
  it('Check apiProxyError calls writeHead with 500', () => {
    const res = {
      writeHead: jest.fn(),
      write: jest.fn(),
      end: jest.fn()
    }
    const err = {
      message: 'some-error'
    }
    client._apiProxyError(err, {}, res, '')
    expect(res.writeHead).toHaveBeenCalledWith(500)
    expect(res.write).toHaveBeenCalledWith('some-error')
    expect(res.end).toHaveBeenCalledTimes(1)
  })
  it('Check apiProxyRequest calls setCORS', () => {
    const setCors = client._setCORS
    client._setCORS = jest.fn()
    client._apiProxyRequest('proxyRes', 'req', 'res')
    expect(client._setCORS).toHaveBeenCalledWith('req', 'res')
    client._setCORS = setCors
  })
  it('Check setCORS function calls headers', () => {
    const req = {
      headers: {
        'access-control-request-method': 'method',
        'access-control-request-headers': 'headers'
      }
    }
    const res = {
      setHeader: jest.fn()
    }
    client._setCORS(req, res)
    expect(res.setHeader).toHaveBeenCalledTimes(3)
  })
  it('Check webSocketServerRequest function to do nothing if resource is not /', () => {
    const req = {
      accept: jest.fn(),
      resource: 'resource'
    }
    client._webSocketServerRequest(req)
    expect(req.accept).toHaveBeenCalledTimes(0)
  })
  it('Check webSocketServerRequest function calls request.accept', () => {
    const req = {
      accept: jest.fn(),
      resource: '/',
      origin: 'origin',
      requestedProtocols: ['value'],
      key: 'key'
    }
    const connection = {
      remoteAddress: 'address',
      on: jest.fn()
    }
    req.accept.mockReturnValue(connection)
    client._sessionManager = {
      createSession: jest.fn()
    }
    client._webSocketServerRequest(req)
    expect(req.accept).toHaveBeenCalledWith('value', 'origin')
    expect(connection.on).toHaveBeenCalledTimes(2)
  })
  it('Check webSocketServerMessage function calls webSocketServerAuthenticate if session is not authenticated', () => {
    const req = {
      key: 'key'
    }
    client._sessionManager = {
      getSession: jest.fn()
    }
    client._sessionManager.getSession.mockReturnValue({ authenticated: false })
    const fn = client._webSocketServerAuthenticate
    client._webSocketServerAuthenticate = jest.fn()
    client._webSocketServerAuthenticate.mockReturnValue(Promise.resolve())
    client._webSocketServerMessage(req, 'connection', 'message')
    expect(client._webSocketServerAuthenticate).toHaveBeenCalledWith(req, 'connection', 'message')
    client._webSocketServerAuthenticate = fn
  })
  it('Check webSocketServerMessage function calls webSocketServerUTFMessage if type is utf8', () => {
    const req = {
      key: 'key'
    }
    client._sessionManager = {
      getSession: jest.fn()
    }
    const message = {
      type: 'utf8'
    }
    client._sessionManager.getSession.mockReturnValue({ authenticated: true })
    const fn = client._webSocketServerUTFMessage
    client._webSocketServerUTFMessage = jest.fn()
    client._webSocketServerMessage(req, 'connection', message)
    expect(client._webSocketServerUTFMessage).toHaveBeenCalledWith(req, 'connection', message)
    client._webSocketServerUTFMessage = fn
  })
  it('Check webSocketServerMessage function calls webSocketServerBinarMessage if type is binary', () => {
    const req = {
      key: 'key'
    }
    client._sessionManager = {
      getSession: jest.fn()
    }
    const message = {
      type: 'binary'
    }
    client._sessionManager.getSession.mockReturnValue({ authenticated: true })
    const fn = client._webSocketServerBinaryMessage
    client._webSocketServerBinaryMessage = jest.fn()
    client._webSocketServerMessage(req, 'connection', message)
    expect(client._webSocketServerBinaryMessage).toHaveBeenCalledWith(req, 'connection', message)
    client._webSocketServerBinaryMessage = fn
  })
  it('Check webSocketServerAuthenticate function drops connection if message cannot be parsed', () => {
    const req = {
      key: 'key'
    }
    client._sessionManager = {
      getSession: jest.fn()
    }
    const message = {
      utf8Data: 'xxx'
    }
    const connection = {
      drop: jest.fn(),
      CLOSE_REASON_UNPROCESSABLE_INPUT: 'reason'
    }
    expect.assertions(1)
    return client._webSocketServerAuthenticate(req, connection, message).then(() => {
    })
      .catch(err => {
        expect(connection.drop).toHaveBeenCalledTimes(1)
      })
  })
  it('Check webSocketServerAuthenticate function drops connection if data command is not login', () => {
    const req = {
      key: 'key'
    }
    client._sessionManager = {
      getSession: jest.fn()
    }
    const message = {
      utf8Data: '{"command": "any"}'
    }
    const connection = {
      drop: jest.fn(),
      CLOSE_REASON_POLICY_VIOLATION: 'reason'
    }
    expect.assertions(1)
    return client._webSocketServerAuthenticate(req, connection, message).then(() => {
    })
      .catch(err => {
        expect(connection.drop).toHaveBeenCalledTimes(1)
      })
  })
  it('Check webSocketServerAuthenticate function drops connection if authentication type is not token or plaintext', () => {
    const req = {
      key: 'key'
    }
    client._sessionManager = {
      getSession: jest.fn()
    }
    client._sessionManager.getSession.mockReturnValue({})
    const message = {
      utf8Data: '{"command":"login","data":{"auth":"any"}}'
    }
    const connection = {
      drop: jest.fn(),
      CLOSE_REASON_POLICY_VIOLATION: 'reason'
    }
    expect.assertions(1)
    return client._webSocketServerAuthenticate(req, connection, message).then(() => {
    })
      .catch(err => {
        expect(connection.drop).toHaveBeenCalledWith('reason', 'Unknown authentication type')
      })
  })
  it('Check webSocketServerAuthenticate function drops connection if authenticate fails', () => {
    const req = {
      key: 'key'
    }
    client._sessionManager = {
      getSession: jest.fn()
    }
    client._sessionManager.getSession.mockReturnValue({})
    const message = {
      utf8Data: '{"command":"login","data":{"auth":"plaintext"}}'
    }
    const connection = {
      drop: jest.fn(),
      CLOSE_REASON_POLICY_VIOLATION: 'reason',
      connected: true
    }
    PTAuth.mockImplementation(() => {
      return {
        authenticate: () => {
          return Promise.reject(new Error('authenticate failed'))
        }
      }
    })
    expect.assertions(1)
    return client._webSocketServerAuthenticate(req, connection, message).then(() => {
    })
      .catch(err => {
        expect(connection.drop).toHaveBeenCalledTimes(1)
      })
  })
  it('Check webSocketServerAuthenticate function resolves for plaintext authentication', () => {
    const req = {
      key: 'key'
    }
    client._sessionManager = {
      getSession: jest.fn()
    }
    const session = jest.fn()
    client._sessionManager.getSession.mockReturnValue({
      sendJSON: session,
      id: 'id'
    })
    const message = {
      utf8Data: '{"command":"login","data":{"auth":"plaintext"}}'
    }
    const output = {
      status: true,
      user: {
        username: 'username'
      },
      token: 'token',
      uuid: 'uuid',
      apps: 'apps',
      appdata: 'appData',
      uid: 'uid',
      login_token: 'login_token',
      serverUUID: 'serverUUID',
      presence: 'presence',
      ucpLink: 'ucpLink',
      PBXVersion: 'PBXVersion',
      PBXBrand: 'PBXBrand',
      featureSet: 'featureSet',
      extensionConfig: 'extensionConfig'
    }
    PTAuth.mockImplementation(() => {
      return {
        authenticate: () => {
          return Promise.resolve(output)
        }
      }
    })
    client.emit = jest.fn()
    platform.nodeServerVersion = 'version'
    client._platform = platform
    expect.assertions(2)
    return client._webSocketServerAuthenticate(req, {}, message).then(() => {
      expect(client.emit).toHaveBeenCalledTimes(1)
      expect(session).toHaveBeenCalledWith({
        status: true,
        type: 'auth',
        message: 'authenticated',
        version: 'version',
        login_token: 'login_token',
        token: 'token',
        uuid: 'uuid',
        serverUUID: 'serverUUID',
        config: {
          status: true,
          user: {
            username: 'username'
          },
          apps: 'apps',
          appdata: 'appData',
          uid: 'uid',
          presence: 'presence',
          ucplink: 'ucpLink',
          PBXVersion: 'PBXVersion',
          PBXBrand: 'PBXBrand',
          uuid: 'uuid',
          featureSet: 'featureSet',
          extensionConfig: 'extensionConfig'
        }
      })
    })
  })
  it('Check webSocketServerAuthenticate function resolves for token authentication', () => {
    const req = {
      key: 'key'
    }
    client._sessionManager = {
      getSession: jest.fn()
    }
    const session = jest.fn()
    client._sessionManager.getSession.mockReturnValue({
      sendJSON: session,
      id: 'id'
    })
    const message = {
      utf8Data: '{"command":"login","data":{"auth":"token"}}'
    }
    const output = {
      status: true,
      user: {
        username: 'username'
      },
      token: 'token',
      uuid: 'uuid',
      apps: 'apps',
      appdata: 'appData',
      uid: 'uid',
      login_token: 'login_token',
      serverUUID: 'serverUUID',
      presence: 'presence',
      ucpLink: 'ucpLink',
      PBXVersion: 'PBXVersion',
      PBXBrand: 'PBXBrand',
      featureSet: 'featureSet',
      extensionConfig: 'extensionConfig'
    }
    TNAuth.mockImplementation(() => {
      return {
        authenticate: () => {
          return Promise.resolve(output)
        }
      }
    })
    client.emit = jest.fn()
    platform.nodeServerVersion = 'version'
    expect.assertions(2)
    return client._webSocketServerAuthenticate(req, {}, message).then(() => {
      expect(client.emit).toHaveBeenCalledTimes(1)
      expect(session).toHaveBeenCalledWith({
        status: true,
        type: 'auth',
        message: 'authenticated',
        version: 'version',
        login_token: 'login_token',
        token: 'token',
        uuid: 'uuid',
        serverUUID: 'serverUUID',
        config: {
          status: true,
          user: {
            username: 'username'
          },
          apps: 'apps',
          appdata: 'appData',
          uid: 'uid',
          presence: 'presence',
          ucplink: 'ucpLink',
          PBXVersion: 'PBXVersion',
          PBXBrand: 'PBXBrand',
          uuid: 'uuid',
          featureSet: 'featureSet',
          extensionConfig: 'extensionConfig'
        }
      })
    })
  })
  it('Check webSocketServerUTFMessage drops connection y message cannot be parsed', () => {
    const connection = {
      drop: jest.fn(),
      CLOSE_REASON_UNPROCESSABLE_INPUT: 'reason'
    }
    const message = {
      utf8Data: 'xxx'
    }
    client._webSocketServerUTFMessage({}, connection, message)
    expect(connection.drop).toHaveBeenCalledTimes(1)
  })
  it('Check webSocketServerUTFMessage function sends error if data does not have command or type', () => {
    const message = {
      utf8Data: '{"id":"some-id"}'
    }
    client._sessionManager = {
      getSession: jest.fn()
    }
    const mock = jest.fn()
    client._sessionManager.getSession.mockReturnValue({
      sendError: mock
    })
    client._webSocketServerUTFMessage({}, {}, message)
    expect(mock).toHaveBeenCalledWith(
      'some-id',
      'Invalid command'
    )
  })
  it('Check webSocketServerUTFMessage function sends error if listener count is 0', () => {
    const message = {
      utf8Data: '{"id":"some-id","command":"some-command","type":"some-type"}'
    }
    client._sessionManager = {
      getSession: jest.fn()
    }
    const mock = jest.fn()
    client._sessionManager.getSession.mockReturnValue({
      sendError: mock
    })
    EventEmitter.listenerCount.mockReturnValue(0)
    client._webSocketServerUTFMessage({}, {}, message)
    expect(mock).toHaveBeenCalledWith(
      'some-id',
      'invalid command'
    )
  })
  it('Check webSocketServerUTFMessage function emit event', () => {
    const message = {
      utf8Data: '{"id":"some-id","command":"some-command","type":"some-type","module":"some-module"}'
    }
    client._sessionManager = {
      getSession: jest.fn()
    }
    client._sessionManager.getSession.mockReturnValue('session')
    client.emit = jest.fn()
    EventEmitter.listenerCount.mockReturnValue(1)
    client._webSocketServerUTFMessage({}, {}, message)
    expect(client.emit).toHaveBeenCalledWith(
      'ws::message::some-module::some-command::some-type',
      'session',
      {
        id: 'some-id',
        command: 'some-command',
        type: 'some-type',
        module: 'some-module'
      }
    )
  })
  it('Check webSocketServerBinaryMessage function sends error if listener count is 0', () => {
    client._sessionManager = {
      getSession: jest.fn()
    }
    const mock = jest.fn()
    client._sessionManager.getSession.mockReturnValue({
      sendError: mock
    })
    const req = {
      key: 'key'
    }
    const data = {
      id: 'some-id'
    }
    EventEmitter.listenerCount.mockReturnValue(0)
    client._webSocketServerBinaryMessage(req, {}, data)
    expect(mock).toHaveBeenCalledWith(
      'some-id',
      'invalid command'
    )
  })
  it('Check webSocketServerBinaryMessage function emits event', () => {
    client._sessionManager = {
      getSession: jest.fn()
    }
    client._sessionManager.getSession.mockReturnValue('session')
    const data = {
      id: 'some-id'
    }
    const req = {
      key: 'key'
    }
    client.emit = jest.fn()
    EventEmitter.listenerCount.mockReturnValue(1)
    client._webSocketServerBinaryMessage(req, {}, data)
    expect(client.emit).toHaveBeenCalledWith(
      'ws::binary',
      'session',
      data
    )
  })
  it('Check webSocketServerClose function rejects if session is not defined', () => {
    const req = {
      key: 'key'
    }
    client._sessionManager = {
      isSessionDefined: jest.fn()
    }
    client._sessionManager.isSessionDefined.mockReturnValue(false)
    return expect(client._webSocketServerClose(req, {}, '', '')).rejects.toEqual(new Error('Session key does not exist'))
  })
  it('Check webSocketServerClose function rejects if dbQuery fails', () => {
    const req = {
      key: 'key'
    }
    client._sessionManager = {
      isSessionDefined: jest.fn(),
      getSession: jest.fn(),
      clearSession: jest.fn()
    }
    client._sessionManager.isSessionDefined.mockReturnValue(true)
    client._sessionManager.getSession.mockReturnValue({
      authenticated: true,
      login_token: 'login_token'
    })
    platform.dbQuery.mockRejectedValue(new Error('dbQuery failed'))
    client._platform = platform
    expect.assertions(2)
    return client._webSocketServerClose(req, {}, '', '').catch(err => {
      expect(err).toEqual(new Error('dbQuery failed'))
      expect(client._sessionManager.clearSession).toHaveBeenCalledWith('key')
    })
  })
  it('Check webSocketServerClose function emits event', () => {
    const req = {
      key: 'key'
    }
    const session = {
      id: 'some-id',
      authenticated: true,
      user: {
        id: 'id'
      },
      token: 'token',
      connection: {
        remoteAddress: 'address'
      }
    }
    client._sessionManager = {
      isSessionDefined: jest.fn(),
      getSession: jest.fn(),
      clearSession: jest.fn()
    }
    client._sessionManager.isSessionDefined.mockReturnValue(true)
    client._sessionManager.getSession.mockReturnValue(session)
    platform.dbQuery.mockReturnValue(Promise.resolve())
    client._platform = platform
    client.emit = jest.fn()
    expect.assertions(2)
    return client._webSocketServerClose(req, {}, '', '').then(() => {
      expect(client.emit).toHaveBeenCalledWith(
        'ws::disconnected',
        session
      )
      expect(client._sessionManager.clearSession).toHaveBeenCalledWith('some-id')
    })
  })
})
