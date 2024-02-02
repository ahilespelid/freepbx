import { Promise } from 'bluebird'
import request from 'request'
import { BaseAPI } from './BaseAPI'

jest.mock('request')

describe('BaseAPI is', () => {
  let baseAPI
  beforeEach(() => {
    baseAPI = new BaseAPI()
  })
  it('Check constructor set properties', () => {
    expect(baseAPI.port).toEqual(8002)
    expect(baseAPI.options).toEqual(
      {
        baseUrl: 'https://127.0.0.1:8002/api/',
        json: true,
        strictSSL: false,
        timeout: 20000
      }
    )
  })
  it('Check postResource function reject if error', () => {
    request.mockImplementation((a, b) => b('some-error', '', ''))
    return expect(baseAPI.postResource('uri', 'body')).rejects.toEqual(new Error('some-error'))
  })
  it('Check postResource function reject if status code is 500', () => {
    request.mockImplementation((a, b) => b(null, { statusCode: 500, statusMessage: 'some-message' }, ''))
    return expect(baseAPI.postResource('uri', 'body')).rejects.toEqual(new Error('some-message'))
  })
  it('Check postResource function resolves', () => {
    request.mockImplementation((a, b) => b(null, { statusCode: 400 }, 'some-body'))
    return baseAPI.postResource('uri', 'body').then(res => {
      expect(res).toEqual(
        {
          response: { statusCode: 400 },
          body: 'some-body'
        }
      )
      expect(baseAPI.options.method).toEqual('POST')
      expect(baseAPI.options.uri).toEqual('uri')
      expect(baseAPI.options.body).toEqual('body')
    })
  })
  it('Check getResource function reject if error', () => {
    request.mockImplementation((a, b) => b('some-error', '', ''))
    return expect(baseAPI.getResource('uri')).rejects.toEqual(new Error('some-error'))
  })
  it('Check getResource function reject if status code is 500', () => {
    request.mockImplementation((a, b) => b(null, { statusCode: 500, statusMessage: 'some-message' }, ''))
    return expect(baseAPI.getResource('uri')).rejects.toEqual(new Error('some-message'))
  })
  it('Check getResource function resolves', () => {
    request.mockImplementation((a, b) => b(null, { statusCode: 400 }, 'some-body'))
    return baseAPI.getResource('uri').then(res => {
      expect(res).toEqual(
        {
          response: { statusCode: 400 },
          body: 'some-body'
        }
      )
      expect(baseAPI.options.method).toEqual('GET')
      expect(baseAPI.options.uri).toEqual('uri')
    })
  })
  it('Check putResource function reject if error', () => {
    request.mockImplementation((a, b) => b('some-error', '', ''))
    return expect(baseAPI.putResource('uri', 'body')).rejects.toEqual(new Error('some-error'))
  })
  it('Check putResource function reject if status code is 500', () => {
    request.mockImplementation((a, b) => b(null, { statusCode: 500, statusMessage: 'some-message' }, ''))
    return expect(baseAPI.putResource('uri', 'body')).rejects.toEqual(new Error('some-message'))
  })
  it('Check putResource function resolves', () => {
    request.mockImplementation((a, b) => b(null, { statusCode: 400 }, 'some-body'))
    return baseAPI.putResource('uri', 'body').then(res => {
      expect(res).toEqual(
        {
          response: { statusCode: 400 },
          body: 'some-body'
        }
      )
      expect(baseAPI.options.method).toEqual('PUT')
      expect(baseAPI.options.uri).toEqual('uri')
      expect(baseAPI.options.body).toEqual('body')
    })
  })
  it('Check deleteResource function reject if error', () => {
    request.mockImplementation((a, b) => b('some-error', '', ''))
    return expect(baseAPI.deleteResource('uri')).rejects.toEqual(new Error('some-error'))
  })
  it('Check deleteResource function reject if status code is 500', () => {
    request.mockImplementation((a, b) => b(null, { statusCode: 500, statusMessage: 'some-message' }, ''))
    return expect(baseAPI.deleteResource('uri')).rejects.toEqual(new Error('some-message'))
  })
  it('Check deleteResource function resolves', () => {
    request.mockImplementation((a, b) => b(null, { statusCode: 400 }, 'some-body'))
    return baseAPI.deleteResource('uri').then(res => {
      expect(res).toEqual(
        {
          response: { statusCode: 400 },
          body: 'some-body'
        }
      )
      expect(baseAPI.options.method).toEqual('DELETE')
      expect(baseAPI.options.uri).toEqual('uri')
    })
  })
  it('Check patchResource function reject if error', () => {
    request.mockImplementation((a, b) => b('some-error', '', ''))
    return expect(baseAPI.patchResource('uri', 'body')).rejects.toEqual(new Error('some-error'))
  })
  it('Check patchResource function reject if status code is 500', () => {
    request.mockImplementation((a, b) => b(null, { statusCode: 500, statusMessage: 'some-message' }, ''))
    return expect(baseAPI.patchResource('uri', 'body')).rejects.toEqual(new Error('some-message'))
  })
  it('Check patchResource function resolves', () => {
    request.mockImplementation((a, b) => b(null, { statusCode: 400 }, 'some-body'))
    return baseAPI.patchResource('uri', 'body').then(res => {
      expect(res).toEqual(
        {
          response: { statusCode: 400 },
          body: 'some-body'
        }
      )
      expect(baseAPI.options.method).toEqual('PATCH')
      expect(baseAPI.options.uri).toEqual('uri')
      expect(baseAPI.options.body).toEqual('body')
    })
  })
})
