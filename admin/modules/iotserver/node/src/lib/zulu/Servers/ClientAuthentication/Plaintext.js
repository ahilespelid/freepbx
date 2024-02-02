const { Promise } = require('bluebird')
const log = require('../../../log');

function Plaintext(connection, session, platform) {
  this.connection = connection
  this.session = session
  this.platform = platform
}

Plaintext.prototype = {
 
  authenticate: function(data) {
    return new Promise((resolve, reject) => {
      const authData = {
        version: this.session.clientVersion,
        type: this.session.clientType,
        session: this.session.id,
        ip: this.connection.remoteAddress,
        login_type: this.session.isAdminLogin ? 'admin' : 'user'
      }

      if (data.username && data.plaintext) {
        authData.username = data.username
        authData.password = data.plaintext
      } else {
        log.warn(
          `[${this.session.id}] Username or Password not provided from ${this.connection.remoteAddress}`
        )
        log.warn(
          `[${this.session.id}] Authentication failure for unknown from ${this.connection.remoteAddress}`
        )
        return reject(new Error('Invalid Login credentials'))
      }

      let jt = JSON.parse(JSON.stringify(data))
      jt.plaintext = 'OBFUSCATED'
      log.debug(
        'SERVER <= [CLIENT] [' +
        this.connection.remoteAddress +
        '] [' +
        this.session.id +
        ']:' +
        JSON.stringify(jt)
      )

      return this.session.api.loginPlaintext(authData)
        .then(output => {
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
        })
        .catch(err => {
          return reject(err)
        })
    })
  }
};

module.exports = Plaintext
