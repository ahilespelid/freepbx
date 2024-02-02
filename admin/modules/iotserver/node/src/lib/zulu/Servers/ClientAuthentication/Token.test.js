import { Promise } from 'bluebird'
import { Token } from './Token'

describe('Token is', () => {
  let token
  let connection
  let session
  let platform
  beforeEach(() => {
    connection = {
      remoteAddress: 'address',
      connected: true,
      closeDescription: 'description'
    }
    session = {
      clientVersion: 'clientVersion',
      clientType: 'clientType',
      id: 'id',
      api: {
        loginToken: jest.fn()
      }
    }
    platform = {
      astmanAction: jest.fn()
    }
    token = new Token(connection, session, platform)
  })
  it('Check constructor set properties', () => {
    expect(token.connection).toEqual(connection)
    expect(token.session).toEqual(session)
  })
  it('Check authenticate function rejects if astmanAction fails for !token', () => {
    platform.astmanAction.mockRejectedValue(new Error('astmanAction failed'))
    return expect(token.authenticate({})).rejects.toEqual(new Error('astmanAction failed'))
  })
  it('Check authenticate function rejects if !token', () => {
    platform.astmanAction.mockReturnValue(Promise.resolve())
    expect.assertions(2)
    return token.authenticate({}).catch(err => {
      expect(err).toEqual(new Error('Invalid Token'))
      expect(platform.astmanAction).toHaveBeenCalledWith({
        'action': 'userevent',
        'userevent': 'authentication-failed',
        'ip': 'address',
        'username': null
      })
    })
  })
  it('Check authenticate function rejects if loginToken fails', () => {
    const data = {
      token: 'token'
    }
    session.api.loginToken.mockRejectedValue(new Error('loginToken failed'))
    return expect(token.authenticate(data)).rejects.toEqual(new Error('loginToken failed'))
  })
  it('Check authenticate function rejects if !connected', () => {
    const data = {
      token: 'token'
    }
    session.api.loginToken.mockReturnValue(Promise.resolve('body'))
    token.connection.connected = false
    return expect(token.authenticate(data)).rejects.toEqual(new Error('Connection has been previously dropped because: description'))
  })
  it('Check authenticate function rejects if astmanAction fails if status is false', () => {
    const data = {
      token: 'token'
    }
    session.api.loginToken.mockReturnValue(Promise.resolve({
      status: false
    }))
    platform.astmanAction.mockRejectedValue(new Error('astmanAction failed'))
    return expect(token.authenticate(data)).rejects.toEqual(new Error('astmanAction failed'))
  })
  it('Check authenticate function rejects if status is false', () => {
    const data = {
      token: 'token'
    }
    session.api.loginToken.mockReturnValue(Promise.resolve({
      status: false,
      message: 'fail'
    }))
    platform.astmanAction.mockReturnValue(Promise.resolve())
    expect.assertions(2)
    return token.authenticate(data).catch(err => {
      expect(err).toEqual(new Error('fail'))
      expect(platform.astmanAction).toHaveBeenCalledWith({
        'action': 'userevent',
        'userevent': 'authentication-failed',
        'ip': 'address',
        'username': null
      })
    })
  })
  it('Check authenticate function rejects if astmanAction fails for status true', () => {
    const data = {
      token: 'token'
    }
    session.api.loginToken.mockReturnValue(Promise.resolve({
      status: true
    }))
    platform.astmanAction.mockRejectedValue(new Error('astmanAction failed'))
    return expect(token.authenticate(data)).rejects.toEqual(new Error('astmanAction failed'))
  })
  it('Check authenticate function resolves', () => {
    const data = {
      token: 'token'
    }
    session.api.loginToken.mockReturnValue(Promise.resolve({
      status: true,
      data: 'data'
    }))
    platform.astmanAction.mockReturnValue(Promise.resolve())
    expect.assertions(3)
    return token.authenticate(data).then(res => {
      expect(res).toEqual({
        status: true,
        data: 'data'
      })
      expect(platform.astmanAction).toHaveBeenCalledWith({
        'action': 'userevent',
        'userevent': 'authentication-success',
        'ip': 'address',
        'username': null
      })
      expect(session.api.loginToken).toHaveBeenCalledWith(
        {
          version: 'clientVersion',
          type: 'clientType',
          session: 'id',
          ip: 'address',
          token: 'token'
        }
      )
    })
  })
})
