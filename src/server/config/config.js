var env  = (process.env.ENV || 'development');
var conf = require('./' + env);

conf.envName = env;

module.exports = conf;
