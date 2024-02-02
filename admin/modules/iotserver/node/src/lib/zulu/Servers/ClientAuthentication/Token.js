const { Promise } = require('bluebird');
const log = require('../../../log');

function Token(connection, session, platform) {
  this.connection = connection
  this.session = session
  this.platform = platform
}

Token.prototype = {
  
  authenticate: function(data) {
    return new Promise((resolve, reject) => {
      const authData = {
        version: this.session.clientVersion,
        type: this.session.clientType,
        session: this.session.id,
        ip: this.connection.remoteAddress,
        login_type: this.session.isAdminLogin ? 'admin' : 'user'
      }

      if (data.token) {
        authData.token = data.token
      } else {
        log.warn(
          `[${this.session.id}] Invalid token from ${this.connection.remoteAddress}`
        )
        log.warn(
          `[${this.session.id}] Authentication failure for unknown from ${this.connection.remoteAddress}`
        )
        return reject(new Error('Invalid Login credentials'));
      }

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

      return this.session.api.loginToken(authData)
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
        }).catch(err => {
          return reject(err)
        })
    })
  }
};

module.exports = Token
