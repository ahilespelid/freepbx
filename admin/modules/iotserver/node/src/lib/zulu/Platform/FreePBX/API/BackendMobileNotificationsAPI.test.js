import { Promise } from 'bluebird'
import { BackendAPI } from './BackendAPI'
import { BackendMobileNotificationsAPI } from './BackendMobileNotificationsAPI'

jest.mock('./BackendAPI')

describe('BackendMobileNotificationsAPI is', () => {
  let backendMobileNotificationsAPI
  beforeEach(() => {
    backendMobileNotificationsAPI = new BackendMobileNotificationsAPI()
    backendMobileNotificationsAPI.postResource = jest.fn()
  })
  it('Check sendMobileCallNotification calls correct uri', () => {
    backendMobileNotificationsAPI.sendMobileCallNotification('extension', 'callerid', 'name', 'callbackURI')
    expect(backendMobileNotificationsAPI.postResource).toHaveBeenCalledWith(
      'mobile/incoming/extension',
      { callerid: 'name <callerid>',
        callbackURI: 'callbackURI'
      }
    )
  })
  it('Check sendMobileVoicemailNotification call correct uri', () => {
    backendMobileNotificationsAPI.sendMobileVoicemailNotification('extension', 'callerid', 'name')
    expect(backendMobileNotificationsAPI.postResource).toHaveBeenCalledWith(
      'mobile/voicemail/extension',
      { callerid: 'name <callerid>' }
    )
  })
  it('Check sendMobileChatNotification call correct uri', () => {
    backendMobileNotificationsAPI.sendMobileChatNotification('touid', 'fromuid', 'message')
    expect(backendMobileNotificationsAPI.postResource).toHaveBeenCalledWith(
      'mobile/chat/touid',
      {
        message: 'message',
        uid: 'fromuid'
      }
    )
  })
})
