import { Plaintext } from './Plaintext'

describe('Plaintext is', () => {
  let plaintext
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
        loginPlaintext: jest.fn()
      }
    }
    platform = {
      astmanAction: jest.fn()
    }
    plaintext = new Plaintext(connection, session, platform)
  })
  it('Check constructor set properties', () => {
    expect(plaintext.connection).toEqual(connection)
    expect(plaintext.session).toEqual(session)
  })
  it('Check authenticate function rejects if astmanAction fails for !username or password', async () => {
    platform.astmanAction.mockRejectedValue(new Error('astmanAction failed'))
    await expect(plaintext.authenticate({})).rejects.toThrowError('astmanAction failed')
  })
  it('Check authenticate function rejects if !username or password', async () => {
    platform.astmanAction.mockResolvedValue(null)
    expect.assertions(2)
    await plaintext.authenticate({}).catch(err => {
      expect(err).toEqual(new Error('Invalid Login credentials'))
      expect(platform.astmanAction).toHaveBeenCalledWith({
        'action': 'userevent',
        'userevent': 'authentication-failed',
        'ip': 'address',
        'username': null
      })
    })
  })
  it('Check authenticate function rejects if loginPlaintext fails', async () => {
    const data = {
      username: 'username',
      plaintext: 'plaintext'
    }
    session.api.loginPlaintext.mockRejectedValue(new Error('loginPlaintext failed'))
    await expect(plaintext.authenticate(data)).rejects.toEqual(new Error('loginPlaintext failed'))
  })
  it('Check authenticate function rejects if !connected', async () => {
    const data = {
      username: 'username',
      plaintext: 'plaintext'
    }
    session.api.loginPlaintext.mockResolvedValue({
      body: 'body'
    })
    plaintext.connection.connected = false
    await expect(plaintext.authenticate(data)).rejects.toEqual(new Error('Connection has been previously dropped because: description'))
  })
  it('Check authenticate function rejects if astmanAction fails if status is false', async () => {
    const data = {
      username: 'username',
      plaintext: 'plaintext'
    }
    session.api.loginPlaintext.mockResolvedValue({
      body: {
        status: false
      }
    })
    platform.astmanAction.mockRejectedValue(new Error('astmanAction failed'))
    await expect(plaintext.authenticate(data)).rejects.toEqual(new Error('astmanAction failed'))
  })
  it('Check authenticate function rejects if status is false', async () => {
    const data = {
      username: 'username',
      plaintext: 'plaintext'
    }
    session.api.loginPlaintext.mockResolvedValue({
      status: false,
      message: 'fail'
    })
    platform.astmanAction.mockResolvedValue(null)
    expect.assertions(2)
    await plaintext.authenticate(data).catch(err => {
      expect(err).toEqual(new Error('fail'))
      expect(platform.astmanAction).toHaveBeenCalledWith({
        'action': 'userevent',
        'userevent': 'authentication-failed',
        'ip': 'address',
        'username': 'username'
      })
    })
  })
  it('Check authenticate function rejects if astmanAction fails for status true', async () => {
    const data = {
      username: 'username',
      plaintext: 'plaintext'
    }
    session.api.loginPlaintext.mockResolvedValue({
      body: {
        status: true
      }
    })
    platform.astmanAction.mockRejectedValue(new Error('astmanAction failed'))
    await expect(plaintext.authenticate(data)).rejects.toEqual(new Error('astmanAction failed'))
  })
  it('Check authenticate function resolves', async () => {
    const data = {
      username: 'username',
      plaintext: 'plaintext'
    }
    session.api.loginPlaintext.mockResolvedValue({
      status: true,
      data: 'data'
    })
    platform.astmanAction.mockResolvedValue(null)
    expect.assertions(3)
    const res = await plaintext.authenticate(data)
    expect(res).toEqual({
      status: true,
      data: 'data'
    })
    expect(platform.astmanAction).toHaveBeenCalledWith({
      'action': 'userevent',
      'userevent': 'authentication-success',
      'ip': 'address',
      'username': 'username'
    })
    expect(session.api.loginPlaintext).toHaveBeenCalledWith(
      {
        version: 'clientVersion',
        type: 'clientType',
        session: 'id',
        ip: 'address',
        username: 'username',
        password: 'plaintext'
      }
    )
  })
})
