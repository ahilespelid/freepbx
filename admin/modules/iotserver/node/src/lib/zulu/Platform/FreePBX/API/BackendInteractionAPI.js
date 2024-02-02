/* jshint node: true, esversion: 6, -W027, -W119, -W033 */
'use strict'

import { Promise } from 'bluebird'
import uuidv4 from 'uuid/v4'
import { BackendAPI } from './BackendAPI'
import timestamp from 'unix-timestamp'

timestamp.round = true

export class BackendInteractionAPI extends BackendAPI {
  constructor () {
    super()
  }

  /**
   * Get Contact by ID
   * @method getContactByID
   * @return {string}                        The Contact UUID
   */
  getContactByID (id) {
    return new Promise((resolve, reject) => {
      return this.getResource('interaction/contact/uuid/' + id)
        .then(result => {
          return resolve(result.body)
        })
        .catch(err => {
          return reject(err)
        })
    })
  }

  /**
   * Get Contact UUID by Caller ID
   * @method getContactIDByCallerID
   * @param  {integer}               zuluID   The Zulu ID
   * @param  {string}               callerID The Caller ID to lookup
   * @return {string}                        The Contact UUID
   */
  getContactIDByCallerID (zuluID, callerID, callerIDName = '') {
    return new Promise((resolve, reject) => {
      if (callerIDName.length === 0) {
        return this.getResource('interaction/contact/zid/' + zuluID + '/cid/' + callerID)
          .then(result => {
            return resolve(result.body)
          })
          .catch(err => {
            return reject(err)
          })
      } else {
        return this.postResource(
          'interaction/contact/zid/' + zuluID + '/cid/' + callerID,
          { name: callerIDName }
        )
          .then(result => {
            return resolve(result.body)
          })
          .catch(err => {
            return reject(err)
          })
      }
    })
  }

  /**
   * Get Contact UUIDs by array of Caller IDs
   * @method getContactIDsByCallerID
   * @param  {integer}                zuluID         The Zulu ID
   * @param  {Array}                 [callerIDs=[]] Array of Caller IDs to lookup
   * @return {Array}                        The Contact UUIDs
   */
  getContactIDsByCallerID (zuluID, callerIDs = []) {
    return new Promise((resolve, reject) => {
      return this.postResource('interaction/contact/zid/' + zuluID + '/cid', callerIDs)
        .then(result => {
          return resolve(result.body)
        })
        .catch(err => {
          return reject(err)
        })
    })
  }

  /**
   * Get the ContactUUID by ZuluID
   * @method getContactIDByZuluID
   * @param  {integer}             zuluID The Zulu ID
   * @return {string}                    The Contact UUID
   */
  getContactIDByZuluID (zuluID) {
    return new Promise((resolve, reject) => {
      return this.getResource('interaction/contact/zid/' + zuluID)
        .then(result => {
          return resolve(result.body)
        })
        .catch(err => {
          return reject(err)
        })
    })
  }

  /**
   * Get Contact UUID by array of ZuluIDs
   * @method getContactIDsByZuluIDs
   * @param  {Array}                [zuluIDs=[]] Array of Zulu IDs
   * @return {Array}                        The Contact UUIDs
   */
  getContactIDsByZuluIDs (zuluIDs = []) {
    return new Promise((resolve, reject) => {
      return this.postResource('interaction/contact/zid', zuluIDs)
        .then(result => {
          return resolve(result.body)
        })
        .catch(err => {
          return reject(err)
        })
    })
  }

  /**
   * Get Interaction UUID By array of Caller IDs
   * @method getInteractionIDByZuluIDCallerIDs
   * @param  {integer}                          zuluID         The Zulu ID
   * @param  {Array}                           [callerIDs=[]] Array of CallerIDs
   * @return {String}                                         Interaction ID
   */
  getInteractionIDByZuluIDCallerIDs (zuluID, callerIDs = []) {
    return new Promise((resolve, reject) => {
      return this.postResource('interaction/interaction/zid/' + zuluID + '/cid', callerIDs)
        .then(result => {
          return resolve(result.body)
        })
        .catch(err => {
          return reject(err)
        })
    })
  }

  /**
   * Get Interaction UUID by array of Zulu IDs
   * @method getInteractionIDByZuluIDs
   * @param  {Array}                   [zuluIDs=[]] Array of Zulu IDs
   * @return {String}                               Interaction ID
   */
  getInteractionIDByZuluIDs (zuluIDs = []) {
    return new Promise((resolve, reject) => {
      return this.postResource('interaction/interaction/zid', zuluIDs)
        .then(result => {
          return resolve(result.body)
        })
        .catch(err => {
          return reject(err)
        })
    })
  }

  /**
   * Get Interaction UUID by array of Caller IDs
   * @method getInteractionByCallerIDs
   * @param  {Array}                   [callerIDs=[]] Array of Caller IDs
   * @return {string}                                 The Interaction UUID
   */
  getInteractionByCallerIDs (callerIDs = []) {
    // return interaction ID and zulu with associated contactuuids
    return new Promise((resolve, reject) => {
      return this.postResource('interaction/interaction/cid', callerIDs)
        .then(result => {
          return resolve(result.body)
        })
        .catch(err => {
          return reject(err)
        })
    })
  }

  /**
   * Get Interaction by ID
   * @method getInteractionByCallerIDs
   * @param  {String}                   interactionID The interaction ID
   * @return {string}                                 Information about the interaction
   */
  getInteractionByID (interactionID) {
    return new Promise((resolve, reject) => {
      return this.getResource('interaction/' + interactionID)
        .then(result => {
          return resolve(result.body)
        })
        .catch(err => {
          return reject(err)
        })
    })
  }

  /**
   * Add a stream event to an interaction
   * @method addStreamToInteraction
   * @param  {string}               interactionID The Interaction ID
   * @param  {integer}               zuluID        The Zulu User ID
   * @param  {string}               memberID      The Member ID of the member who generated the stream
   * @param  {string}               type          The type of the stream
   * @param  {Object}               [body={}]     Body of extra data
   * @param  {string}               [searchable=null] String used for streams searching
   */
  addStreamToInteraction (interactionID, zuluID, memberID, type, body = {}, searchable = null, links = null, when = null, clientData = null, isConf = null) {
    const stream = {
      type: type,
      body: body,
      searchable: searchable,
      links: links,
      when: when,
      clientData: clientData,
      isConf: isConf
    }

    return new Promise((resolve, reject) => {
      return this.postResource(
        'interaction/' +
        interactionID +
        '/zid/' +
        zuluID +
        '/mid/' +
        memberID +
        '/stream',
        stream
      )
        .then(result => {
          return resolve(result.body)
        })
        .catch(err => {
          return reject(err)
        })
    })
  }

  saveMultipleStreams (interaction_id, members, contactuuid, type, body = {}, searchable = null, links = null) {
    return new Promise((resolve, reject) => {
      let parameters = {
        type: type,
        contactuuid: contactuuid,
        body: body,
        searchable: searchable,
        links: links,
        members: members
      }
      return this.postResource(
        'interaction/' +
        interaction_id +
        '/streams',
        parameters
      )
        .then(result => {
          return resolve(result.body)
        })
        .catch(err => {
          return reject(err)
        })
    })
  }

  isUserDialedWithFeatureCode (number) {
    return new Promise((resolve, reject) => {
      return this.getResource(
        'interaction/' +
        number +
        '/userfcdialed'
      )
        .then(result => {
          return resolve(result.body)
        })
        .catch(err => {
          return reject(err)
        })
    })
  }

  getContactuuidByExtension(extension) {
    return new Promise((resolve, reject) => {
      return this.getResource(
        'interaction/' +
        extension +
        '/contactuuid'
      )
        .then(result => {
          return resolve(result.body)
        })
        .catch(err => {
          return reject(err)
        })
    })
  }

  updateBodyStream(streamid, interactionid, body) {
    return new Promise((resolve, reject) => {
      let parameters = {
        body: body
      }
      return this.putResource(
        'interaction/' +
        interactionid +
        '/stream/' +
        streamid,
        parameters
      )
        .then(result => {
          return resolve(result.body)
        })
        .catch(err => {
          return reject(err)
        })
    })
  }

  addMemberToInteraction (interactionid, memberid) {
    return new Promise((resolve, reject) => {
      return this.postResource(
        'interaction/' +
        interactionid +
        '/member/' +
        memberid,
        {}
      )
        .then(result => {
          return resolve(result.body)
        })
        .catch(err => {
          return reject(err)
        })
    })
  }
}
