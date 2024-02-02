import { Promise } from 'bluebird'
import fs from 'fs'
import ltx from 'ltx'
import uuidv4 from 'uuid/v4'
import freepbx from 'freepbx'
import FreePBX from '.'
import { SessionAPI } from './API/SessionAPI'

jest.mock('fs')
jest.mock('ltx')
jest.mock('freepbx')
jest.mock('uuid/v4')
jest.mock('../../Uanalytics')
jest.mock('./API/SessionAPI')

uuidv4.mockImplementation(() => {
  return 'some-uuid'
})

describe('Platform FreePBX is', () => {
  let uut

  beforeEach(() => {
    uut = new FreePBX()
  })
  it('Check initalize Zulu function rejects if FreePBX exec fails', () => {
    uut._loadPBXVersion = jest.fn()
    uut._loadNodeVersion = jest.fn()
    freepbx.exec.mockReturnValue(Promise.reject(new Error('exec failed')))
    return expect(uut.initialize()).rejects.toEqual(new Error('exec failed'))
  })
  it('Check initalizeZulu function rejects if loadPBX fails', () => {
    uut._loadPBXVersion = jest.fn()
    uut._loadNodeVersion = jest.fn()
    freepbx.exec.mockReturnValue(Promise.resolve({ licensed: true }))
    uut._loadPBX = jest.fn()
    uut._loadPBX.mockRejectedValue(new Error('loadPBX failed'))
    return expect(uut.initialize()).rejects.toEqual(new Error('loadPBX failed'))
  })
  it('Check initalize function resolves all correctly', () => {
    uut._loadPBXVersion = jest.fn()
    uut._loadNodeVersion = jest.fn()
    freepbx.exec.mockReturnValue(Promise.resolve({ licensed: true }))
    uut._loadPBX = jest.fn()
    uut._loadPBX.mockReturnValue(Promise.resolve('some-val'))
    return uut.initialize().then((res) => {
      expect(res).toEqual('some-val')
      expect(uut._loadPBXVersion).toHaveBeenCalledTimes(1)
      expect(uut._loadNodeVersion).toHaveBeenCalledTimes(1)
    })
  })
  it('Check loadPBXVersion function sets _pbxServerVersion', () => {
    fs.readFileSync.mockReturnValue('content')
    ltx.parse.mockReturnValue({
      getChildText: () => {
        return 'some-value'
      }
    })
    uut._loadPBXVersion()
    expect(uut._pbxServerVersion).toEqual('some-value')
  })
  it('Check loadNodeVersion function sets nodeServerVersion', () => {
    fs.readFileSync.mockReturnValue('{"version": "some-version"}')
    uut._loadNodeVersion()
    expect(uut._nodeServerVersion).toEqual('some-version')
  })
  it('Check loadPBX function rejects if connect fails', () => {
    freepbx.connect.mockReturnValue(Promise.reject(new Error('connect failed')))
    return expect(uut._loadPBX()).rejects.toEqual(new Error('connect failed'))
  })
  it('Check loadPBX function rejects if setupDBPool fails', () => {
    freepbx.connect.mockReturnValue(Promise.resolve({
      version: 'version',
      config: 'config',
      kvstore: 'kvstore',
      astman: 'astman',
      db: 'db'
    }))
    uut._astmanReemitWithActionID = jest.fn()
    uut._setupDBPool = jest.fn()
    uut._setupDBPool.mockRejectedValue(new Error('setupDBPool failed'))
    return expect(uut._loadPBX()).rejects.toEqual(new Error('setupDBPool failed'))
  })
  it('Check loadPBX function set all class variables correctly', () => {
    freepbx.connect.mockReturnValue(Promise.resolve({
      version: 'version',
      config: 'config',
      kvstore: 'kvstore',
      astman: 'astman',
      db: 'db'
    }))
    uut._astmanReemitWithActionID = jest.fn()
    uut._setupDBPool = jest.fn()
    uut._setupDBPool.mockReturnValue(Promise.resolve())
    return uut._loadPBX().then(() => {
      expect(uut._freepbxVersion).toEqual('version')
      expect(uut._config).toEqual('config')
      expect(uut._kvstore).toEqual('kvstore')
      expect(uut._astman).toEqual('astman')
      expect(uut._astmanReemitWithActionID).toHaveBeenCalledTimes(1)
      expect(uut._setupDBPool).toHaveBeenCalledWith('db')
    })
  })
  it('Check getter functions', () => {
    uut._pbxServerVersion = 'version'
    uut._nodeServerVersion = 'nodever'
    uut._pbxver = 'pbxver'
    expect(uut.nodeServerVersion).toEqual('nodever')
    expect(uut.version).toEqual('version')
  })
  it('Check setupDBPool function rejects if connection errors', () => {
    const db = {
      on: jest.fn(),
      getConnection: (a) => a(new Error('db error'), '')
    }
    return expect(uut._setupDBPool(db)).rejects.toEqual(new Error('db error'))
  })
  it('Check setupDBPool function resolves', () => {
    const connection = {
      release: jest.fn()
    }
    const db = {
      on: jest.fn(),
      getConnection: (a) => a(null, connection)
    }
    return uut._setupDBPool(db).then(() => {
      expect(db.on).toHaveBeenCalledTimes(4)
      expect(connection.release).toHaveBeenCalledTimes(1)
    })
  })
  it('Check dbQuery function rejects if error', () => {
    const db = {
      getConnection: (a) => a(new Error('db error'), '')
    }
    uut._db = db
    return expect(uut.dbQuery('', '')).rejects.toEqual(new Error('db error'))
  })
  it('Check dbQuery function rejects if query error', () => {
    const connection = {
      query: (a, b) => b(new Error('query error'), '', '')
    }
    const db = {
      getConnection: (a) => a(null, connection)
    }
    uut._db = db
    return expect(uut.dbQuery('sql', 'val')).rejects.toEqual(new Error('query error'))
  })
  it('Check dbQuery function resolve results', () => {
    const connection = {
      query: (a, b) => b(null, 'results', 'fields'),
      release: jest.fn()
    }
    const db = {
      getConnection: (a) => a(null, connection)
    }
    uut._db = db
    return uut.dbQuery('sql', 'val').then((res) => {
      expect(connection.release).toHaveBeenCalledTimes(1)
      expect(res).toEqual('results')
    })
  })
  it('Check getConfig function returns config', () => {
    const config = {
      configs: {
        'some-key': 'some-value'
      }
    }
    uut._config = config
    return expect(uut.getConfig('some-key')).resolves.toEqual('some-value')
  })
  it('Check _astmanReemitWithActionID function emit event', () => {
    const evt = {
      actionid: 'some-id',
      event: 'some-event'
    }
    const astman = {
      on: (a, b) => b(evt)
    }
    uut._astman = astman
    uut.emit = jest.fn()
    uut._astmanReemitWithActionID()
    expect(uut.emit).toHaveBeenCalledWith(
      'some-event-some-id',
      evt
    )
  })
  it('Check astmanAddListener function adds listener', () => {
    const astman = {
      on: jest.fn()
    }
    uut._astman = astman
    uut.astmanAddListener('some-event', 'some-function')
    expect(astman.on).toHaveBeenCalledWith('some-event', 'some-function')
  })
  it('Check astmanRemoveListener function removes listener', () => {
    const astman = {
      removeListener: jest.fn()
    }
    uut._astman = astman
    uut.astmanRemoveListener('some-event', 'some-function')
    expect(astman.removeListener).toHaveBeenCalledWith('some-event', 'some-function')
  })
  it('Check astmanAction function rejects unknown error', () => {
    const astman = {
      action: (a, b) => b(true, '')
    }
    uut._astman = astman
    return expect(uut.astmanAction('data')).rejects.toEqual(new Error('Unknown error'))
  })
  it('Check astmanAction function rejects if error', () => {
    const astman = {
      action: (a, b) => b({ message: 'some-error' }, '')
    }
    uut._astman = astman
    return expect(uut.astmanAction('data')).rejects.toEqual(new Error('some-error'))
  })
  it('Check astmanAction function resolve result', () => {
    const astman = {
      action: (a, b) => b(null, 'some-result')
    }
    uut._astman = astman
    return expect(uut.astmanAction('data')).resolves.toEqual('some-result')
  })
  it('Check astmanDBGet rejects if astmanAction fails', () => {
    uut.astmanAction = jest.fn()
    uut.astmanAction.mockReturnValue(Promise.reject(new Error('astmanAction failed')))
    uut.on = jest.fn()
    uut.removeAllListeners = jest.fn()
    return uut.astmanDBGet('family', 'key').then(() => {
    })
      .catch(err => {
        expect(err).toEqual(new Error('astmanAction failed'))
        expect(uut.removeAllListeners).toHaveBeenCalledWith('dbgetresponse-some-uuid')
      })
  })
  it('Check astmanDBGet rejects by timeout', () => {
    uut.astmanAction = jest.fn()
    uut.astmanAction.mockReturnValue(Promise.resolve())
    uut.on = jest.fn()
    uut.removeAllListeners = jest.fn()
    return uut.astmanDBGet('family', 'key').then(() => {
    })
      .catch(err => {
        expect(err).toEqual(new Error('No response received!'))
        expect(uut.removeAllListeners).toHaveBeenCalledWith('dbgetresponse-some-uuid')
      })
  })
  it('Check astmanDBGet resolves', () => {
    uut.astmanAction = jest.fn()
    uut.astmanAction.mockReturnValue(Promise.resolve())
    uut.on = (a, b) => b({ val: 'some-value' })
    uut.removeAllListeners = jest.fn()
    return uut.astmanDBGet('family', 'key').then(res => {
      expect(res).toEqual('some-value')
      expect(uut.removeAllListeners).toHaveBeenCalledWith('dbgetresponse-some-uuid')
    })
  })
  it('Check kvGet returns kvstore value', () => {
    const kvstore = {
      getConfig: jest.fn()
    }
    kvstore.getConfig.mockReturnValue('some-val')
    uut._kvstore = kvstore
    expect(uut.kvGet('key')).toEqual('some-val')
  })
  it('Check kvSet returns kvstore value', () => {
    const kvstore = {
      setConfig: jest.fn()
    }
    kvstore.setConfig.mockReturnValue('some-val')
    uut._kvstore = kvstore
    expect(uut.kvSet('key', 'value')).toEqual('some-val')
  })

  it('Check newSessionAPI returns a new SessionAPI', () => {
    const actual = uut.newSessionAPI()
    expect(actual).toStrictEqual(SessionAPI.mock.instances[0])
  })
})
