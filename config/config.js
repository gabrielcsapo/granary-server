 // TODO: refactor this out
var convict = require('convict');
var fs = require('fs');
var crypto = require('crypto');

module.exports = function () {

  // Check if we need to auto configure for a fast start.
  var env = process.env.NODE_ENV || 'dev';
  var configFile = process.env.GRANARY_CONFIG || __dirname + '/' + env + '.json';

  if (!fs.existsSync(configFile)) {
      var buf = crypto.randomBytes(256);
      var hash = crypto.createHash('sha1').update(buf).digest('hex');

      // TODO: refactor
      // TODO: use logger and not console
      console.log('***** NOTICE ****** \n');
      console.log('You are missing "' + configFile + '"');
      console.log('Creating a configuration automatically for you....');
      console.log('Your Granary Server password is: \n');
      console.log(hash);
      console.log('\n Use the password above to generate bundles.');
      var defaultFile = {
          "password": hash
      };
      fs.writeFileSync(configFile, JSON.stringify(defaultFile), null, 4);
  }

  var conf = convict({
    env: {
      doc: 'The applicaton environment.',
      format: [ 'dev', 'test', 'stage', 'prod', 'production' ],
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
      // TODO: You need to create this directory if it does not exist.
      // This directory is also used as a static file directory for Freight bundles.
      doc: 'Default bundle storage directory. Make sure it is somewhere in the Freight Server directory.',
      format: String,
      default: __dirname + '/../storage'
    },
    tempDir: {
      // TODO: You need to create this directory if it does not exist.
      doc: 'Default directory for temporary files.',
      format: String,
      default: __dirname + '/../temp'
    },
    // Redis config, see https://github.com/learnboost/kue#redis-connection-settings
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

  conf.loadFile(configFile);
  conf.validate();

  return conf;
};
