import { BaseSession } from './BaseSession'

describe('BaseSession is', () => {
  let baseSession
  let connection
  beforeEach(() => {
    connection = {
      sendUTF: jest.fn()
    }
    baseSession = new BaseSession('sessionid', connection)
  })
  it('Check constructor set properties', () => {
    expect(baseSession.id).toEqual('sessionid')
    expect(baseSession._connection).toEqual(connection)
  })
  it('Check getter functions', () => {
    expect(baseSession.connection).toEqual(connection)
  })
  it('Check sendFalse function calls sendJSON correctly', () => {
    const fn = baseSession.sendJSON
    baseSession.sendJSON = jest.fn()
    baseSession.sendFalse('actionid')
    expect(baseSession.sendJSON).toHaveBeenCalledWith({
      status: false,
      actionid: 'actionid'
    })
    baseSession.sendJSON = fn
  })
  it('Check sendTrue function calls sendJSON correctly', () => {
    const fn = baseSession.sendJSON
    baseSession.sendJSON = jest.fn()
    baseSession.sendTrue('actionid')
    expect(baseSession.sendJSON).toHaveBeenCalledWith({
      status: true,
      actionid: 'actionid'
    })
    baseSession.sendJSON = fn
  })
  it('Check sendError function calls sendJSON correctly', () => {
    const fn = baseSession.sendJSON
    baseSession.sendJSON = jest.fn()
    baseSession.sendError('actionid', 'error')
    expect(baseSession.sendJSON).toHaveBeenCalledWith({
      status: false,
      actionid: 'actionid',
      message: 'error'
    },
    'warn'
    )
    baseSession.sendJSON = fn
  })
  it('Check sendJSON function calls sendUTF correctly', () => {
    baseSession.sendJSON({ data: 'data' })
    expect(connection.sendUTF).toHaveBeenCalledWith('{"data":"data"}')
  })
})
