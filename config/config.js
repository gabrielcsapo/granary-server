 // TODO: refactor this out
 var convict = require('convict');
 var fs = require('fs');
 var crypto = require('crypto');
 var bunyan = require('bunyan');
 var mkdirp = require('mkdirp');

 var logger = bunyan.createLogger({
     name: 'granary-server',
     stream: process.stdout,
     level: 'info'
 });

 var env = process.env.NODE_ENV || 'dev';
 var configFile = process.env.GRANARY_CONFIG || __dirname + '/' + env + '.json';

 if (!fs.existsSync(configFile)) {
     var buf = crypto.randomBytes(256);
     var hash = crypto.createHash('sha1').update(buf).digest('hex');

     // TODO: refactor
     logger.info('***** NOTICE ******');
     logger.info('You are missing "' + configFile);
     logger.info('Creating a configuration automatically for you....');
     logger.info('Your Granary Server password is: ', hash);
     logger.info('Use the password above to generate bundles.');
     var defaultFile = JSON.stringify({
         "password": hash
     });
     fs.writeFileSync(configFile, defaultFile, null, 4);
 }

 var conf = convict({
     env: {
         doc: 'The applicaton environment.',
         format: ['dev', 'test', 'stage', 'prod', 'production'],
         default: 'dev',
         env: 'NODE_ENV'
     },
     log: {
         level: {
             default: 'info',
             env: 'LOG_LEVEL'
         }
     },
     ip: {
         doc: 'The IP address to bind.',
         format: 'ipaddress',
         default: '127.0.0.1',
         env: 'IP_ADDRESS'
     },
     port: {
         doc: 'The port to bind.',
         format: 'port',
         default: 8872,
         env: 'PORT'
     },
     limit: {
         doc: 'The bundle transmission size limit, in kb.',
         format: 'nat',
         default: 500
     },
     password: {
         doc: 'The password that is used to create Freight bundles.',
         format: String,
         default: ''
     },
     storage: {
         doc: 'Default bundle storage directory. Make sure it is somewhere in the Granary Server directory.',
         format: String,
         default: __dirname + '/../storage'
     },
     temp: {
         doc: 'Default directory for temporary files.',
         format: String,
         default: __dirname + '/../temp'
     },
     redis: {
         port: {
             doc: 'Redis Port',
             format: 'port',
             default: 6379,
             env: 'REDIS_PORT'
         },
         host: {
             doc: 'Redis IP address to bind.',
             default: '127.0.0.1',
             env: 'REDIS_IP'
         },
         auth: {
             doc: 'Redis Password.',
             format: String,
             default: '',
             env: 'REDIS_PASSWORD'
         },
         options: {
             doc: 'Redis Options.',
             format: Object,
             default: {}
         }
     },
     track: {
         delay: {
             doc: 'Repository update check delay in milliseconds',
             format: 'nat',
             default: 60 * 60000
         }
     }
 });

 mkdirp(conf.get('storage'), function (err) {
     if (err) { logger.error(err.toString()); }
 });

 mkdirp(conf.get('temp'), function (err) {
     if (err) { logger.error(err.toString()); }
 });

 logger.level(conf.get('log').level);
 conf.loadFile(configFile);
 conf.validate();

 module.exports = {
     conf: conf,
     logger: logger
 };
