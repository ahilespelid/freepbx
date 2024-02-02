import { Promise } from 'bluebird'
import { BackendAPI } from './BackendAPI'
import { BackendInteractionAPI } from './BackendInteractionAPI'

jest.mock('./BackendAPI')

describe('BackendInteractionAPI is', () => {
  let backendInteractionAPI
  beforeEach(() => {
    backendInteractionAPI = new BackendInteractionAPI()
  })
  it('Check getContactByID function rejects if getResource fails', () => {
    backendInteractionAPI.getResource = jest.fn()
    backendInteractionAPI.getResource.mockReturnValue(Promise.reject(new Error('getResource failed')))
    return expect(backendInteractionAPI.getContactByID('id')).rejects.toEqual(new Error('getResource failed'))
  })
  it('Check getContactByID function resolves', () => {
    backendInteractionAPI.getResource = jest.fn()
    backendInteractionAPI.getResource.mockReturnValue(Promise.resolve({ body: 'contact' }))
    return expect(backendInteractionAPI.getContactByID('id')).resolves.toEqual('contact')
  })
  it('Check getContactIDByCallerID function rejects if getResource fails', () => {
    backendInteractionAPI.getResource = jest.fn()
    backendInteractionAPI.getResource.mockReturnValue(Promise.reject(new Error('getResource failed')))
    return expect(backendInteractionAPI.getContactIDByCallerID('zid', 'callerid')).rejects.toEqual(new Error('getResource failed'))
  })
  it('Check getContactIDByCallerID function resolves if getResource success', () => {
    backendInteractionAPI.getResource = jest.fn()
    backendInteractionAPI.getResource.mockReturnValue(Promise.resolve({ body: 'some-value' }))
    return backendInteractionAPI.getContactIDByCallerID('zid', 'callerid').then(res => {
      expect(res).toEqual('some-value')
      expect(backendInteractionAPI.getResource).toHaveBeenCalledWith(
        'interaction/contact/zid/zid/cid/callerid'
      )
    })
  })
  it('Check getContactIDByCallerID function rejects if postResource fails', () => {
    backendInteractionAPI.postResource = jest.fn()
    backendInteractionAPI.postResource.mockReturnValue(Promise.reject(new Error('postResource failed')))
    return expect(backendInteractionAPI.getContactIDByCallerID('zid', 'callerid', 'name')).rejects.toEqual(new Error('postResource failed'))
  })
  it('Check getContactIDByCallerID function resolves if postResource success', () => {
    backendInteractionAPI.postResource = jest.fn()
    backendInteractionAPI.postResource.mockReturnValue(Promise.resolve({ body: 'some-value' }))
    return backendInteractionAPI.getContactIDByCallerID('zid', 'callerid', 'name').then(res => {
      expect(res).toEqual('some-value')
      expect(backendInteractionAPI.postResource).toHaveBeenCalledWith(
        'interaction/contact/zid/zid/cid/callerid',
        { name: 'name' }
      )
    })
  })
  it('Check getContactIDsByCallerID function rejects if postResource fails', () => {
    backendInteractionAPI.postResource = jest.fn()
    backendInteractionAPI.postResource.mockReturnValue(Promise.reject(new Error('postResource failed')))
    return expect(backendInteractionAPI.getContactIDsByCallerID('zid')).rejects.toEqual(new Error('postResource failed'))
  })
  it('Check getContactIDsByCallerID function resolves', () => {
    backendInteractionAPI.postResource = jest.fn()
    backendInteractionAPI.postResource.mockReturnValue(Promise.resolve({ body: 'some-value' }))
    return backendInteractionAPI.getContactIDsByCallerID('zid', ['number']).then(res => {
      expect(res).toEqual('some-value')
      expect(backendInteractionAPI.postResource).toHaveBeenCalledWith(
        'interaction/contact/zid/zid/cid',
        ['number']
      )
    })
  })
  it('Check getContactIDByZuluID function rejects if getResource fails', () => {
    backendInteractionAPI.getResource = jest.fn()
    backendInteractionAPI.getResource.mockReturnValue(Promise.reject(new Error('getResource failed')))
    return expect(backendInteractionAPI.getContactIDByZuluID('zid')).rejects.toEqual(new Error('getResource failed'))
  })
  it('Check getContactIDByZuluID function resolves', () => {
    backendInteractionAPI.getResource = jest.fn()
    backendInteractionAPI.getResource.mockReturnValue(Promise.resolve({ body: 'some-value' }))
    return backendInteractionAPI.getContactIDByZuluID('zid').then(res => {
      expect(res).toEqual('some-value')
      expect(backendInteractionAPI.getResource).toHaveBeenCalledWith(
        'interaction/contact/zid/zid'
      )
    })
  })
  it('Check getContactIDsByZuluIDs function rejects if postResource fails', () => {
    backendInteractionAPI.postResource = jest.fn()
    backendInteractionAPI.postResource.mockReturnValue(Promise.reject(new Error('postResource failed')))
    return expect(backendInteractionAPI.getContactIDsByZuluIDs(['zids'])).rejects.toEqual(new Error('postResource failed'))
  })
  it('Check getContactIDsByZuluIDs function resolves', () => {
    backendInteractionAPI.postResource = jest.fn()
    backendInteractionAPI.postResource.mockReturnValue(Promise.resolve({ body: 'some-value' }))
    return backendInteractionAPI.getContactIDsByZuluIDs(['zids']).then(res => {
      expect(res).toEqual('some-value')
      expect(backendInteractionAPI.postResource).toHaveBeenCalledWith(
        'interaction/contact/zid',
        ['zids']
      )
    })
  })
  it('Check getInteractionIDByZuluIDCallerIDs function rejects if postResource fails', () => {
    backendInteractionAPI.postResource = jest.fn()
    backendInteractionAPI.postResource.mockReturnValue(Promise.reject(new Error('postResource failed')))
    return expect(backendInteractionAPI.getInteractionIDByZuluIDCallerIDs('zid')).rejects.toEqual(new Error('postResource failed'))
  })
  it('Check getInteractionIDByZuluIDCallerIDs function resolves', () => {
    backendInteractionAPI.postResource = jest.fn()
    backendInteractionAPI.postResource.mockReturnValue(Promise.resolve({ body: 'some-value' }))
    return backendInteractionAPI.getInteractionIDByZuluIDCallerIDs('zid', ['callerids']).then(res => {
      expect(res).toEqual('some-value')
      expect(backendInteractionAPI.postResource).toHaveBeenCalledWith(
        'interaction/interaction/zid/zid/cid',
        ['callerids']
      )
    })
  })
  it('Check getInteractionIDByZuluIDs function rejects if postResource fails', () => {
    backendInteractionAPI.postResource = jest.fn()
    backendInteractionAPI.postResource.mockReturnValue(Promise.reject(new Error('postResource failed')))
    return expect(backendInteractionAPI.getInteractionIDByZuluIDs(['zids'])).rejects.toEqual(new Error('postResource failed'))
  })
  it('Check getInteractionIDByZuluIDs function resolves', () => {
    backendInteractionAPI.postResource = jest.fn()
    backendInteractionAPI.postResource.mockReturnValue(Promise.resolve({ body: 'some-value' }))
    return backendInteractionAPI.getInteractionIDByZuluIDs(['zids']).then(res => {
      expect(res).toEqual('some-value')
      expect(backendInteractionAPI.postResource).toHaveBeenCalledWith(
        'interaction/interaction/zid',
        ['zids']
      )
    })
  })
  it('Check getInteractionByCallerIDs function rejects if postResource fails', () => {
    backendInteractionAPI.postResource = jest.fn()
    backendInteractionAPI.postResource.mockReturnValue(Promise.reject(new Error('postResource failed')))
    return expect(backendInteractionAPI.getInteractionByCallerIDs(['callerids'])).rejects.toEqual(new Error('postResource failed'))
  })
  it('Check getInteractionByCallerIDs function resolves', () => {
    backendInteractionAPI.postResource = jest.fn()
    backendInteractionAPI.postResource.mockReturnValue(Promise.resolve({ body: 'some-value' }))
    return backendInteractionAPI.getInteractionByCallerIDs(['callerids']).then(res => {
      expect(res).toEqual('some-value')
      expect(backendInteractionAPI.postResource).toHaveBeenCalledWith(
        'interaction/interaction/cid',
        ['callerids']
      )
    })
  })
  it('Check getInteractionByID function rejects if getResource fails', () => {
    backendInteractionAPI.getResource = jest.fn()
    backendInteractionAPI.getResource.mockReturnValue(Promise.reject(new Error('getResource failed')))
    return expect(backendInteractionAPI.getInteractionByID('id')).rejects.toEqual(new Error('getResource failed'))
  })
  it('Check getInteractionByID function resolves', () => {
    backendInteractionAPI.getResource = jest.fn()
    backendInteractionAPI.getResource.mockReturnValue(Promise.resolve({ body: 'some-value' }))
    return backendInteractionAPI.getInteractionByID('id').then(res => {
      expect(res).toEqual('some-value')
      expect(backendInteractionAPI.getResource).toHaveBeenCalledWith(
        'interaction/id'
      )
    })
  })
  it('Check addStreamToInteraction function rejects if postResource fails', () => {
    backendInteractionAPI.postResource = jest.fn()
    backendInteractionAPI.postResource.mockReturnValue(Promise.reject(new Error('postResource failed')))
    return expect(backendInteractionAPI.addStreamToInteraction('iid', 'zid', 'mid', 'type', 'body', 'search', 'links', 'when', 'clientData')).rejects.toEqual(new Error('postResource failed'))
  })
  it('Check addStreamToInteraction function resolves', () => {
    backendInteractionAPI.postResource = jest.fn()
    backendInteractionAPI.postResource.mockReturnValue(Promise.resolve({ body: 'some-value' }))
    return backendInteractionAPI.addStreamToInteraction('iid', 'zid', 'mid', 'type', 'body', 'search', 'links', 'when', 'clientData', 'isConf').then(res => {
      expect(res).toEqual('some-value')
      expect(backendInteractionAPI.postResource).toHaveBeenCalledWith(
        'interaction/iid/zid/zid/mid/mid/stream',
        {
          type: 'type',
          body: 'body',
          searchable: 'search',
          links: 'links',
          when: 'when',
          clientData: 'clientData',
          isConf: 'isConf'
        }
      )
    })
  })
  it('Check saveMultipleStreams function reject if postResource fails', () => {
    backendInteractionAPI.postResource = jest.fn()
    backendInteractionAPI.postResource.mockReturnValue(Promise.reject(new Error('postResource failed')))
    return expect(backendInteractionAPI.saveMultipleStreams('iid', 'members', 'contactuuid', 'type', 'body', 'search', 'links')).rejects.toEqual(new Error('postResource failed'))
  })
  it('Check saveMultipleStreams function resolves', () => {
    backendInteractionAPI.postResource = jest.fn()
    backendInteractionAPI.postResource.mockReturnValue(Promise.resolve({ body: 'some-value' }))
    return backendInteractionAPI.saveMultipleStreams('iid', 'members', 'contactuuid', 'type', 'body', 'search', 'links').then(res => {
      expect(res).toEqual('some-value')
      expect(backendInteractionAPI.postResource).toHaveBeenCalledWith(
        'interaction/iid/streams',
        {
          type: 'type',
          contactuuid: 'contactuuid',
          body: 'body',
          searchable: 'search',
          links: 'links',
          members: 'members'
        }
      )
    })
  })
})
