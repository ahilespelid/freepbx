const { Promise } = require('bluebird');
const log = require('../../../log');

function ServiceRegistry(connection, session, platform) {
  this.connection = connection
  this.session = session
  this.platform = platform
}

ServiceRegistry.prototype = {
  
  authenticate: function(data) {
    return new Promise((resolve, reject) => {
      var self = this;

      // first validate the temprary password from the service registry here...
      //log.info(`[${this.session.id}] Authenticating  ${this.connection.remoteAddress} from cloud`)
      this.platform.validateSRTmpPwd(data).then((result)=>{
        if (!result.status) {
          log.warn(`[${this.session.id}] Authentication error: ${result.msg} from ${this.connection.remoteAddress}`)
          return reject(new Error(result.msg))
        }

        const authData = {
          version: this.session.clientVersion,
          type: this.session.clientType,
          session: this.session.id,
          ip: this.connection.remoteAddress,
          login_type: this.session.isAdminLogin ? 'admin' : 'user'
        }

        if (data.username) {
          authData.username = data.username
        } else if (data.email) {
          authData.email = data.email
        } else {
          log.warn(
            `[${this.session.id}] Username not provided from ${this.connection.remoteAddress}`
            )
          log.warn(
            `[${this.session.id}] Authentication failure for unknown from ${this.connection.remoteAddress}`
            )
          return reject(new Error('Invalid Login credentials'))
        }

        let jt = JSON.parse(JSON.stringify(data))
        log.debug(
          'SERVER <= [CLIENT] [' +
          this.connection.remoteAddress +
          '] [' +
          this.session.id +
          ']:' +
          JSON.stringify(jt)
          )
        return this.session.api.generateLoginToken(authData).then(output => {
          if (!this.connection.connected) {
            log.warn(`[${this.session.id}] Connection has been previously dropped because: ${this.connection.closeDescription}`)
            return reject(new Error(`Connection has been previously dropped because: ${this.connection.closeDescription}`))
          }
          if (!output.status) {
            log.warn(
              `[${this.session.id}] Authentication failure from ${this.connection.remoteAddress}`
              )
            return reject(new Error(output.message))
          }
          authData.token = output.login_token;
          authData.username = output.username;
          let jt = JSON.parse(JSON.stringify(data))
          jt.token = 'OBFUSCATED'
          log.debug(
            'SERVER <= [CLIENT] [' +
            this.connection.remoteAddress +
            '] [' +
            this.session.id +
            ']:' +
            JSON.stringify(jt)
            )
          return this.session.api.loginToken(authData).then(output => {
            if (!this.connection.connected) {
              log.warn(`[${this.session.id}] Connection has been previously dropped because: ${this.connection.closeDescription}`)
              return reject(new Error(`Connection has been previously dropped because: ${this.connection.closeDescription}`))
            }
            if (!output.status) {
              log.warn(
                `[${this.session.id}] Authentication failure from ${this.connection.remoteAddress}`
                )
              return reject(new Error(output.message))
            }
            return resolve(output)
          }).catch(err => {
            return reject(err)
          })
        }).catch(err => {
          return reject(err)
        })
      }).catch((error)=>{
        log.warn(
          `[${this.session.id}]: Authentication error: ${error} from ${this.connection.remoteAddress}`
        )
        return reject(error);
      })
    })
  }
};

module.exports = ServiceRegistry
