import timestamp from 'unix-timestamp'
import { BaseSession } from '../../Session/BaseSession'
import { Session } from './Session'

jest.mock('../../Session/BaseSession')
jest.mock('unix-timestamp')

timestamp.now.mockReturnValue(100)

describe('Session is', () => {
  let session
  let sessionAPI
  let platform
  beforeEach(() => {
    sessionAPI = {}
    platform = {
      newSessionAPI: jest.fn().mockReturnValue(sessionAPI)
    }
    session = new Session('sessionid', 'connection', platform)
  })
  it('Check constructor set properties', () => {
    expect(session._connected).toEqual(100)
    expect(session._authenticated).toEqual(false)
    expect(session._user).toEqual({})
    expect(session._token).toEqual(null)
    expect(session._clientVersion).toEqual(null)
    expect(session._clientType).toEqual(null)
    expect(session._lastConnected).toEqual(null)
    expect(session._contactuuid).toEqual(null)
    expect(session._uid).toEqual(null)
    expect(session._apps).toEqual(null)
    expect(session._appData).toEqual(null)
    expect(session.api).toStrictEqual(sessionAPI)
    expect(platform.newSessionAPI).toBeCalled()
  })
  it('Check getter functions', () => {
    session._authenticated = true
    session._uid = 'uid'
    session._apps = 'apps'
    session._appData = 'appData'
    session._token = 'token'
    session._clientVersion = 'clientVersion'
    session._clientType = 'clientType'
    session._user = 'user'
    session._contactuuid = 'contactuuid'
    session._lastConnected = 'lastConnected'
    session._connected = 1
    expect(session.authenticated).toEqual(true)
    expect(session.connected).toEqual(1)
    expect(session.uid).toEqual('uid')
    expect(session.apps).toEqual('apps')
    expect(session.appData).toEqual('appData')
    expect(session.token).toEqual('token')
    expect(session.clientVersion).toEqual('clientVersion')
    expect(session.clientType).toEqual('clientType')
    expect(session.user).toEqual('user')
    expect(session.contactuuid).toEqual('contactuuid')
    expect(session.lastConnected).toEqual('lastConnected')
  })
  it('Check setter functions', () => {
    session.authenticated = true
    session.uid = 'uid'
    session.apps = 'apps'
    session.appData = 'appData'
    session.token = 'token'
    session.clientVersion = 'clientVersion'
    session.clientType = 'clientType'
    session.user = 'user'
    session.contactuuid = 'contactuuid'
    session.lastConnected = 'lastConnected'
    expect(session._authenticated).toEqual(true)
    expect(session._uid).toEqual('uid')
    expect(session._apps).toEqual('apps')
    expect(session._appData).toEqual('appData')
    expect(session._token).toEqual('token')
    expect(session.api.token).toEqual('token')
    expect(session._clientVersion).toEqual('clientVersion')
    expect(session.api.version).toEqual('clientVersion')
    expect(session._clientType).toEqual('clientType')
    expect(session._user).toEqual('user')
    expect(session._contactuuid).toEqual('contactuuid')
    expect(session._lastConnected).toEqual('lastConnected')
  })
  it('Check sendJSON function calls parent sendJSON', () => {
    session.connection = {
      remoteAddress: 'address'
    }
    session.sendJSON('data', 'type')
    expect(BaseSession.prototype.sendJSON).toHaveBeenCalledTimes(1)
    expect(BaseSession.prototype.sendJSON).toHaveBeenCalledWith('data', 'type')
  })
})
