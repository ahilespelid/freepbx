const config = require('config');
const env = config.environment;

module.exports = {
    [env]: config.knex,
};
