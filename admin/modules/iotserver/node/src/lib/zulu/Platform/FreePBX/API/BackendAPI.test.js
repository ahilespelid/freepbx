import { Promise } from 'bluebird'
import { BackendAPI } from './BackendAPI'

describe('BackendAPI is', () => {
  let backendAPI
  beforeEach(() => {
    backendAPI = new BackendAPI()
  })
  it('Check constructor sets properties', () => {
    expect(backendAPI._token).toEqual(null)
    expect(backendAPI._version).toEqual(null)
    expect(backendAPI.options.headers).toEqual({ 'X-SERVER-TOKEN': null })
  })
  it('Check getter function', () => {
    backendAPI._token = 'token'
    expect(backendAPI.token).toEqual('token')
  })
  it('Check setter function', () => {
    backendAPI.token = 'token'
    expect(backendAPI._token).toEqual('token')
    expect(backendAPI.options.headers['X-SERVER-TOKEN']).toEqual('token')
  })
  it('Check sendNotificationEmail post uri', () => {
    backendAPI.postResource = jest.fn()
    backendAPI.sendNotificationEmail('zid', 'sender', 'text')
    expect(backendAPI.postResource).toHaveBeenCalledWith(
      'user/zid/email/notify',
      {
        sender: 'sender',
        text: 'text',
        mentioned: false
      }
    )
  })
  it('Check getUserByUsername rejects if getResource fails', () => {
    backendAPI.getResource = jest.fn()
    backendAPI.getResource.mockReturnValue(Promise.reject(new Error('get Resource failed')))
    return expect(backendAPI.getUserByUsername('username')).rejects.toEqual(new Error('get Resource failed'))
  })
  it('Check getUserByUsername resolves', () => {
    backendAPI.getResource = jest.fn()
    backendAPI.getResource.mockReturnValue(Promise.resolve({ body: 'some-user' }))
    return expect(backendAPI.getUserByUsername('username')).resolves.toEqual('some-user')
  })
  it('Check getVoicemailMessages function rejects if getResource fails', () => {
    backendAPI.getResource = jest.fn()
    backendAPI.getResource.mockReturnValue(Promise.reject(new Error('getResource failed')))
    return expect(backendAPI.getVoicemailMessages('6110')).rejects.toEqual(new Error('getResource failed'))
  })
  it('Check getVoicemailMessages resolves with returned messages', () => {
    backendAPI.getResource = jest.fn()
    backendAPI.getResource.mockReturnValue(Promise.resolve({
      body: {
        voicemail: {
          messages: {
            'msg_id1': {
              callerchan: 'some-channel',
              msg_id: 'msg_id1'
            },
            'msg_id2': {
              callerchan: 'other-channel',
              msg_id: 'msg_id2'
            }
          }
        }
      }
    }))
    return backendAPI.getVoicemailMessages('6110').then(res => {
      expect(res).toStrictEqual({
        'msg_id1': {
          callerchan: 'some-channel',
          msg_id: 'msg_id1'
        },
        'msg_id2': {
          callerchan: 'other-channel',
          msg_id: 'msg_id2'
        }
      })
      expect(backendAPI.getResource).toHaveBeenCalledWith(
        '/voicemail/6110'
      )
    })
  })
  it('Check getVoicemailMessages resolves with undefined if there are no messages', () => {
    backendAPI.getResource = jest.fn()
    backendAPI.getResource.mockReturnValue(Promise.resolve({
      body: null
    }))
    return backendAPI.getVoicemailMessages('6110').then(res => {
      expect(res).toBeUndefined()
      expect(backendAPI.getResource).toHaveBeenCalledWith(
        '/voicemail/6110'
      )
    })
  })

  it('Check getUserCallStatusSettings rejects if getResource rejects', async () => {
    backendAPI.getResource = jest.fn()
      .mockRejectedValue(new Error('fail'))

    await expect(backendAPI.getUserCallStatusSettings('some-user-id')).rejects.toEqual(new Error('fail'))
  })
  it('Check getUserCallStatusSettings returns undefined if there is not call status', async () => {
    backendAPI.getResource = jest.fn()
      .mockResolvedValue(null)

    await expect(backendAPI.getUserCallStatusSettings('some-user-id')).resolves.toBeUndefined()
  })
  it('Check getUserCallStatusSettings returns call status', async () => {
    backendAPI.getResource = jest.fn()
      .mockResolvedValue({
        body: {
          enable_callStatus: 'some-call-status'
        }
      })

    await expect(backendAPI.getUserCallStatusSettings('some-user-id')).resolves.toEqual('some-call-status')
    expect(backendAPI.getResource).toBeCalledWith('/user/some-user-id/callstatus')
  })

  it('Check getSmsOwners rejects if getResource fails', () => {
    backendAPI.getResource = jest.fn()
      .mockRejectedValue(new Error('failed'))
    return expect(backendAPI.getSmsOwners('some-did')).rejects.toEqual(new Error('failed'))
  })
  it('Check getSmsOwners resolves if getResource resolves', async () => {
    backendAPI.getResource = jest.fn()
      .mockResolvedValue({
        body: {
          status: true,
          owners: 'some-owners'
        }
      })
    await expect(backendAPI.getSmsOwners('some-did')).resolves.toEqual('some-owners')
    expect(backendAPI.getResource).toHaveBeenCalledWith('/sms/owners/some-did')
  })
  it('Check getSmsOwners rejects if getResource returns a status of false', async () => {
    backendAPI.getResource = jest.fn()
      .mockResolvedValue({
        body: {
          status: false,
          message: 'some-message'
        }
      })
    await expect(backendAPI.getSmsOwners('some-did')).rejects.toThrow('No sms for did: some-did')
  })
  it('Check getSmsOwners function rejects if getResources resolves nothing', () => {
    backendAPI.getResource = jest.fn()
    backendAPI.getResource.mockResolvedValue(null)
    const did = 'some-did'
    return expect(backendAPI.getSmsOwners(did)).rejects.toEqual(
      new Error('No sms for did: some-did')
    )
  })

  it('Check getRecordingFile rejects if getResource fails', () => {
    backendAPI.getResource = jest.fn()
      .mockRejectedValue(new Error('failed'))
    return expect(backendAPI.getRecordingFile('some-did')).rejects.toEqual(new Error('failed'))
  })
  it('Check getRecordingFile returns null if recording file is missing', async () => {
    backendAPI.getResource = jest.fn()
      .mockResolvedValue(null)
    await expect(backendAPI.getRecordingFile('some-did')).resolves.toEqual(null)
  })
  it('Check getRecordingFile to return recording file', async () => {
    backendAPI.getResource = jest.fn()
      .mockResolvedValue({
        body: {
          recording: {
            recordingfile: 'some-file'
          }
        }
      })
    await expect(backendAPI.getRecordingFile('some-did')).resolves.toEqual('some-file')
    expect(backendAPI.getResource).toHaveBeenCalledWith('/cdr/some-did/recording')

  })
})
