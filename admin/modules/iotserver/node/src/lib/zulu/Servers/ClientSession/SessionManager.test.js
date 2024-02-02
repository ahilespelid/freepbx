import { Session } from './Session'
import { SessionManager } from './SessionManager'

jest.mock('./Session')

describe('SessionManager is', () => {
  let sessionManager
  beforeEach(() => {
    sessionManager = new SessionManager()
  })
  it('Check constructor set properties', () => {
    expect(sessionManager.sessions).toEqual({})
  })
  it('Check createSession function throw error if session is defined', () => {
    const fn = sessionManager.isSessionDefined
    sessionManager.isSessionDefined = jest.fn()
    sessionManager.isSessionDefined.mockReturnValue(true)
    expect.assertions(1)
    try {
      sessionManager.createSession('id', {})
    } catch (e) {
      expect(e).toEqual('Session already exists!')
    }
    sessionManager.isSessionDefined = fn
  })
  it('Check createSession function creates a new session', () => {
    const fn = sessionManager.isSessionDefined
    sessionManager.isSessionDefined = jest.fn()
    sessionManager.isSessionDefined.mockReturnValue(false)
    expect.assertions(2)
    try {
      const newSession = sessionManager.createSession('id', {})
      expect(newSession).toEqual(Session.mock.instances[0])
      expect(sessionManager.sessions['id']).toEqual(Session.mock.instances[0])
    } catch (e) {
    }
    sessionManager.isSessionDefined = fn
  })
  it('Check clearSession function does nothing ig session is not defined', () => {
    const fn = sessionManager.isSessionDefined
    sessionManager.isSessionDefined = jest.fn()
    sessionManager.isSessionDefined.mockReturnValue(false)
    sessionManager.sessions['id'] = 'session'
    sessionManager.clearSession('id')
    expect(sessionManager.sessions['id']).toEqual('session')
    sessionManager.isSessionDefined = fn
  })
  it('Check clearSession function deletes session', () => {
    const fn = sessionManager.isSessionDefined
    sessionManager.isSessionDefined = jest.fn()
    sessionManager.isSessionDefined.mockReturnValue(true)
    sessionManager.sessions['id'] = 'session'
    sessionManager.clearSession('id')
    expect(sessionManager.sessions['id']).toEqual(undefined)
    sessionManager.isSessionDefined = fn
  })
  it('Check isSessionDefined function returns true if session is defined', () => {
    sessionManager.sessions['id'] = 'session'
    expect(sessionManager.isSessionDefined('id')).toEqual(true)
  })
  it('Check getSession function returns undefined if session is not defined', () => {
    const fn = sessionManager.isSessionDefined
    sessionManager.isSessionDefined = jest.fn()
    sessionManager.isSessionDefined.mockReturnValue(false)
    expect(sessionManager.getSession('id')).toEqual(undefined)
    sessionManager.isSessionDefined = fn
  })
  it('Check getSession function returns session', () => {
    const fn = sessionManager.isSessionDefined
    sessionManager.isSessionDefined = jest.fn()
    sessionManager.isSessionDefined.mockReturnValue(true)
    sessionManager.sessions['id'] = 'session'
    expect(sessionManager.getSession('id')).toEqual('session')
    sessionManager.isSessionDefined = fn
  })
  it('Check getAllSessions function return all sessions', () => {
    sessionManager.sessions['id1'] = 'session1'
    sessionManager.sessions['id2'] = 'session2'
    expect(sessionManager.getAllSessions()).toEqual({
      'id1': 'session1',
      'id2': 'session2'
    })
  })
})
