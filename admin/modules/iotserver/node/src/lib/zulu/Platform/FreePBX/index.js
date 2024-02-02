const util = require("util");
const fs = require('fs');
const ltx = require('ltx');
const  freepbx = require('freepbx');
const { Promise } = require('bluebird');
const uuidv4 = require('uuid/v4');
const log = require('../../../log');
const { EventEmitter } = require('events');
const  SessionAPI  =  require('./API/SessionAPI');

const KV_MODULE = 'FreePBX\\modules\\Iotserver'

function FreePBX() {
  this._nodeServerVersion = null
  this._pbxServerVersion = null
  this._freepbxVersion = null
  this._db = null
  this._astman = null
  this._config = null
  this._kvstore = null
}

util.inherits(FreePBX, EventEmitter);

  
  FreePBX.prototype.initialize = async function() {
    this._loadPBXVersion()
    this._loadNodeVersion()
    /**
     * * License Check * *
     * $bootstrap_settings["skip_astman"] = true
     * $restrict_mods = true;
     * include("/etc/freepbx.conf"); print json_encode(array("licensed" => FreePBX::Zulu()->licensed()));
     */
    /*const f = "eval(str_rot13(gzinflate(str_rot13(base64_decode('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')))));"
    const res = await freepbx.exec(`php -r "${f}"`)
    if (!res.licensed) {
      log.error(new Error('Zulu is not licensed!'))
      process.exit(-1)
    }*/

    return this._loadPBX();
  };

  FreePBX.prototype._loadPBXVersion = function() {
    //let contents = fs.readFileSync(global.__rootDir + '/../module.xml', 'utf8')
    //let xml = ltx.parse(contents)
    this._pbxServerVersion = '14.0.56.4'//;xml.getChildText('version')
  };

  FreePBX.prototype._loadNodeVersion = function() {
    let pjson = JSON.parse(fs.readFileSync(global.process.cwd() + '/package.json'))
    this._nodeServerVersion = pjson.version
  };

  FreePBX.prototype._loadPBX = async function() {
    try {
      const f = await freepbx.connect()
      this._freepbxVersion = f.version
      this._config = f.config
      this._kvstore = f.kvstore
      //this._astman = f.astman
      await this._setupDBPool(f.db)
    } catch (err) {
      log.error(err)
      throw err
    }
  };

  FreePBX.prototype.getnodeServerVersion = function() {
    return this._nodeServerVersion
  };

  FreePBX.prototype.getversion = function() {
    return this._pbxServerVersion
  };

 /* hasFeature (feature) {
    switch (feature) {
      case 'screensharing':
        // requires FreePBX >= 14.0
        return versionCompare(this._freepbxVersion, '14.0', '>=')
      default:
        // has all other features by default
        return true
    }
  }*/

  FreePBX.prototype._setupDBPool = function(db) {
    this._db = db
    this._db.on('acquire', this._dbPoolAcquire)
    this._db.on('connection', this._dbPoolConnection)
    this._db.on('enqueue', this._dbPoolEnqueue)
    this._db.on('release', this._dbPoolRelease)

    // attempt to get a connection, and reject the promise if it fails
    return new Promise((resolve, reject) => {
      this._db.getConnection((err, connection) => {
        if (err) {
          return reject(err)
        }
        connection.release()
        resolve()
      })
    })
  };

  FreePBX.prototype._dbPoolAcquire = function(connection) {
    log.debug(`DB connection ${connection.threadId} acquired`)
  };

  FreePBX.prototype._dbPoolConnection = function(connection) {
    log.debug(`DB connection ${connection.threadId} made`)
  };

  FreePBX.prototype._dbPoolEnqueue = function() {
    log.debug(`Waiting for available DB connection slot`)
  };

  FreePBX.prototype._dbPoolRelease = function(connection) {
    log.debug(`DB connection ${connection.threadId} released`)
  };

  FreePBX.prototype.dbQuery = function(sql, values) {
    return new Promise((resolve, reject) => {
      this._db.getConnection((err, connection) => {
        if (err) {
          return reject(err)
        }
        if (values) {
          log.debug(`Executing SQL '${sql}' with params: ${JSON.stringify(values)}`)
        } else {
          log.debug(`Executing SQL '${sql}'`)
        }
        connection.query({
          sql,
          values
        }, (error, results, fields) => {
          if (error) {
            return reject(error)
          }
          connection.release()
          resolve(results)
        })
      })
    })
  };

  FreePBX.prototype.getConfig = function(key) {
    switch (key) {
      case 'IOT_SHOULD_HTTPS':
        return true
      default:
        log.debug(`Getting PBX Config for key '${key}'`)
        return Promise.resolve(this._config.configs[key]) // TODO - why is this async?
    }
  };

  FreePBX.prototype.kvGet = function(key, id = 'noid') {
    log.debug(`Getting value of ${KV_MODULE}\\${key}`)
    return this._kvstore.getConfig(KV_MODULE, key, id)
  }

  FreePBX.prototype.kvSet = function(key, value, id = 'noid') {
    log.debug(`Setting ${KV_MODULE}\\${key} to ${value}`)
    return this._kvstore.setConfig(KV_MODULE, key, value, id)
  }

  FreePBX.prototype.kvDel = function(key, id = 'noid') {
    log.debug(`Deleting value of ${KV_MODULE}\\${key}`)
    return this._kvstore.delConfig(KV_MODULE, key, id)
  }

  FreePBX.prototype.newSessionAPI = function() {
    return new SessionAPI()
  };


module.exports = FreePBX
