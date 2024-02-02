/* jshint node: true, esversion: 6, -W027, -W119, -W033 */
'use strict'
import { BackendAPI } from './BackendAPI'
import log from '../../../../log';

export class BackendMobileNotificationsAPI extends BackendAPI {
  constructor () {
    super()
  }

  /**
   * Send Call Notification to mobile client(s)
   * @method sendMobileVoicemailNotification
   * @param  {integer}                        extension    The extension to send the notification to
   * @param  {string}                        calleridnum  The Caller ID Number
   * @param  {string}                        calleridname The Calller ID Name
   * @param  {string}                        callbackURI  URI that mobile device must dial
   * @return {promise}                           Promise of postResource
   */
  sendMobileCallNotification (extension, calleridnum, calleridname, callbackURI) {
    log.info(`Sending call push notification to ${extension}`)
    let uri = 'mobile/incoming/' + extension
    let parameters = {
      callerid: calleridname + ' <' + calleridnum + '>',
      callbackURI: callbackURI
    }
    return this.postResource(uri, parameters)
  }

  /**
   * Send Voicemail Notification to mobile client(s)
   * @method sendMobileVoicemailNotification
   * @param  {integer}                        extension    The extension to send the notification to
   * @param  {string}                        calleridnum  The Caller ID Number
   * @param  {string}                        calleridname The Calller ID Name
   * @return {promise}                           Promise of postResource
   */
  sendMobileVoicemailNotification (extension, calleridnum, calleridname) {
    log.info(`Sending voicemail push notification to ${extension}`)
    let uri = 'mobile/voicemail/' + extension
    let parameters = {
      callerid: calleridname + ' <' + calleridnum + '>'
    }
    return this.postResource(uri, parameters)
  }

  /**
   * Send Chat Notification to mobile client(s)
   * @method sendMobileChatNotification
   * @param  {integer}                   toUID   The UID of the user the message is meant for
   * @param  {integer}                   fromUID The UID of the user the message was from
   * @param  {string}                   message The message body itself
   * @return {promise}                           Promise of postResource
   */
  sendMobileChatNotification (toUID, fromUID, message) {
    log.info(`Sending chat push notification from ${toUID} to ${fromUID}`)
    let uri = 'mobile/chat/' + toUID
    let parameters = {
      message,
      uid: fromUID
    }
    return this.postResource(uri, parameters)
  }

  sendMobileMissedCallNotification (extension, calleridnum, calleridname) {
    log.info(`Sending missedCall push notification to ${extension}`)
    let uri = 'mobile/missedcall/' + extension
    let parameters = {
      callerid: calleridname + ' <' + calleridnum + '>'
    }
    return this.postResource(uri, parameters)
  }

  sendMobileCallCanceledNotification (extension) {
    log.info(`Sending callCanceled push notification to ${extension}`)
    let uri = 'mobile/callcanceled/' + extension
    return this.postResource(uri, {})
  }

  async getMobileTokens (extension) {
    let uri = 'mobile/tokens/' + extension
    let response = await this.getResource(uri)
    return response.body
  }
}
