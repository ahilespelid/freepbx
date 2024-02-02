import { Promise } from 'bluebird'
import { SessionAPI } from './SessionAPI'

describe('SessionAPI is', () => {
  let sessionAPI
  beforeEach(() => {
    sessionAPI = new SessionAPI()
    sessionAPI.getResource = jest.fn()
    sessionAPI.postResource = jest.fn()
  })
  it('Check constructor set properties', () => {
    expect(sessionAPI._token).toEqual(null)
    expect(sessionAPI._version).toEqual(null)
    expect(sessionAPI.options.headers).toEqual(
      {
        'X-AUTH-TOKEN': null,
        'X-CLIENT-VERSION': null
      }
    )
  })
  it('Check getters functions', () => {
    sessionAPI._token = 'token'
    sessionAPI._version = 'version'
    expect(sessionAPI.token).toEqual('token')
    expect(sessionAPI.version).toEqual('version')
  })
  it('Check setters functions', () => {
    sessionAPI.token = 'token2'
    sessionAPI.version = 'version2'
    expect(sessionAPI._token).toEqual('token2')
    expect(sessionAPI.options.headers['X-AUTH-TOKEN']).toEqual('token2')
    expect(sessionAPI._version).toEqual('version2')
    expect(sessionAPI.options.headers['X-CLIENT-VERSION']).toEqual('version2')
  })

  it('Check loginPlaintext when postResource fails', async () => {
    sessionAPI.postResource.mockRejectedValue(new Error('failed'))
    const actual = sessionAPI.loginPlaintext('some-param')
    await expect(actual).rejects.toEqual(new Error('failed'))
  })
  it('Check loginPlaintext when postResource succeeds', async () => {
    sessionAPI.postResource.mockResolvedValue({ body: 'some-login'})
    const actual = sessionAPI.loginPlaintext('some-param')
    await expect(actual).resolves.toEqual('some-login')
    expect(sessionAPI.postResource).toHaveBeenCalledWith('/user/login/plaintext', 'some-param')
  })

  it('Check loginToken when postResource fails', async () => {
    sessionAPI.postResource.mockRejectedValue(new Error('failed'))
    const actual = sessionAPI.loginToken('some-param')
    await expect(actual).rejects.toEqual(new Error('failed'))
  })
  it('Check loginToken when postResource succeeds', async () => {
    sessionAPI.postResource.mockResolvedValue({ body: 'some-login'})
    const actual = sessionAPI.loginToken('some-param')
    await expect(actual).resolves.toEqual('some-login')
    expect(sessionAPI.postResource).toHaveBeenCalledWith('/user/login/token', 'some-param')
  })

  it('Check getConfig when getResource fails', async () => {
    sessionAPI.getResource.mockRejectedValue(new Error('failed'))
    const actual = sessionAPI.getConfig()
    await expect(actual).rejects.toEqual(new Error('failed'))
  })
  it('Check getConfig when getResource succeeds', async () => {
    sessionAPI.getResource.mockResolvedValue({
      body: 'some-config'
    })
    const actual = sessionAPI.getConfig()
    await expect(actual).resolves.toEqual('some-config')
  })

  it('Check getContactAvatar when getResource fails', async () => {
    sessionAPI.getResource.mockRejectedValue(new Error('failed'))
    const actual = sessionAPI.getContactAvatar('some-username')
    await expect(actual).rejects.toEqual(new Error('failed'))
  })
  it('Check getContactAvatar when getResource succeeds', async () => {
    sessionAPI.getResource.mockResolvedValue({
      body: 'some-avatar'
    })
    const actual = sessionAPI.getContactAvatar('some-username')
    await expect(actual).resolves.toEqual('some-avatar')
    expect(sessionAPI.getResource).toHaveBeenCalledWith('/contactmanager/some-username/avatar')
  })

  it('Check getLegacyContacts when getResource fails', async () => {
    sessionAPI.getResource.mockRejectedValue(new Error('failed'))
    const actual = sessionAPI.getLegacyContacts()
    await expect(actual).rejects.toEqual(new Error('failed'))
  })
  it('Check getLegacyContacts when getResource succeeds', async () => {
    sessionAPI.getResource.mockResolvedValue({
      body: 'some-contacts'
    })
    const actual = sessionAPI.getLegacyContacts()
    await expect(actual).resolves.toEqual('some-contacts')
    expect(sessionAPI.getResource).toHaveBeenCalledWith('/contactmanager')
  })

  it('Check getLegacyContactImage when getResource fails', async () => {
    sessionAPI.getResource.mockRejectedValue(new Error('failed'))
    const actual = sessionAPI.getLegacyContactImage('some-did')
    await expect(actual).rejects.toEqual(new Error('failed'))
  })
  it('Check getLegacyContactImage when getResource succeeds', async () => {
    sessionAPI.getResource.mockResolvedValue({
      body: 'some-image'
    })
    const actual = sessionAPI.getLegacyContactImage('some-did')
    await expect(actual).resolves.toEqual('some-image')
    expect(sessionAPI.getResource).toHaveBeenCalledWith('/contactmanager/some-did/image')
  })

  it('Check getContacts when getResource fails', async () => {
    sessionAPI.getResource.mockRejectedValue(new Error('failed'))
    const actual = sessionAPI.getContacts()
    await expect(actual).rejects.toEqual(new Error('failed'))
  })
  it('Check getContacts when getResource succeeds', async () => {
    sessionAPI.getResource.mockResolvedValue({
      body: 'some-contacts'
    })
    const actual = sessionAPI.getContacts()
    await expect(actual).resolves.toEqual('some-contacts')
    expect(sessionAPI.getResource).toHaveBeenCalledWith('contact')
  })

  it('Check sendFax when postResource fails', async () => {
    sessionAPI.postResource.mockRejectedValue(new Error('failed'))
    const actual = sessionAPI.sendFax('some-fax')
    await expect(actual).rejects.toEqual(new Error('failed'))
  })
  it('Check sendFax when postResource succeeds', async () => {
    sessionAPI.postResource.mockResolvedValue({
      body: 'some-result'
    })
    const actual = sessionAPI.sendFax('some-fax')
    await expect(actual).resolves.toEqual('some-result')
    expect(sessionAPI.postResource).toHaveBeenCalledWith('fax', 'some-fax')
  })

  it('Check setDeviceToken when postResource fails', async () => {
    sessionAPI.postResource.mockRejectedValue(new Error('failed'))
    const actual = sessionAPI.setDeviceToken('some-exten', 'some-token')
    await expect(actual).rejects.toEqual(new Error('failed'))
  })
  it('Check setDeviceToken when postResource succeeds', async () => {
    sessionAPI.postResource.mockResolvedValue({
      body: 'some-result'
    })
    const actual = sessionAPI.setDeviceToken('some-exten', 'some-token')
    await expect(actual).resolves.toEqual('some-result')
    expect(sessionAPI.postResource).toHaveBeenCalledWith('mobile/token/some-exten', 'some-token')
  })

  it('Check getPresenceStateList when getResource fails', async () => {
    sessionAPI.getResource.mockRejectedValue(new Error('failed'))
    const actual = sessionAPI.getPresenceStateList()
    await expect(actual).rejects.toEqual(new Error('failed'))
  })
  it('Check getPresenceStateList when getResource succeeds', async () => {
    sessionAPI.getResource.mockResolvedValue({
      body: {
        states: 'some-presences'
      }
    })
    const actual = sessionAPI.getPresenceStateList()
    await expect(actual).resolves.toEqual('some-presences')
    expect(sessionAPI.getResource).toHaveBeenCalledWith('/presencestate/list')
  })
  it('Check getPresenceStateList when getResource returns no body', async () => {
    sessionAPI.getResource.mockResolvedValue({
      body: null
    })
    const actual = sessionAPI.getPresenceStateList()
    await expect(actual).resolves.toBeUndefined()
  })

  it('Check setPresenceState when postResource fails', async () => {
    sessionAPI.postResource.mockRejectedValue(new Error('failed'))
    const actual = sessionAPI.setPresenceState('some-state-id')
    await expect(actual).rejects.toEqual(new Error('failed'))
  })
  it('Check setPresenceState when postResource succeeds', async () => {
    sessionAPI.postResource.mockResolvedValue({ body: 'some-response'})
    const actual = sessionAPI.setPresenceState('some-state-id')
    await expect(actual).resolves.toEqual('some-response')
    expect(sessionAPI.postResource).toHaveBeenCalledWith('presencestate/set', {id: 'some-state-id'})
  })

  it('Check sendSMS when postResource fails', async () => {
    sessionAPI.postResource.mockRejectedValue(new Error('failed'))
    const actual = sessionAPI.sendSMS('some-message')
    await expect(actual).rejects.toEqual(new Error('failed'))
  })
  it('Check sendSMS when postResource succeeds', async () => {
    sessionAPI.postResource.mockResolvedValue({ body: 'some-response'})
    const actual = sessionAPI.sendSMS('some-message')
    await expect(actual).resolves.toEqual('some-response')
    expect(sessionAPI.postResource).toHaveBeenCalledWith('sms', 'some-message')
  })

  it('Check getAllSmsDids when getResource fails', async () => {
    sessionAPI.getResource.mockRejectedValue(new Error('failed'))
    const actual = sessionAPI.getAllSmsDids()
    await expect(actual).rejects.toEqual(new Error('failed'))
  })
  it('Check getAllSmsDids when getResource succeeds', async () => {
    sessionAPI.getResource.mockResolvedValue({
      body: {
        dids: 'some-dids'
      }
    })
    const actual = sessionAPI.getAllSmsDids()
    await expect(actual).resolves.toEqual('some-dids')
    expect(sessionAPI.getResource).toHaveBeenCalledWith('smsdids')
  })
  it('Check getAllSmsDids when getResource returns no body', async () => {
    sessionAPI.getResource.mockResolvedValue({
      body: null
    })
    const actual = sessionAPI.getAllSmsDids()
    await expect(actual).resolves.toBeUndefined()
  })
})
