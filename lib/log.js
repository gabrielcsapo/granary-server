var bunyan = require('bunyan');

module.exports = function (conf) {
  // TODO: refactor this out
  return bunyan.createLogger({
    name: 'granary-server',
    stream: process.stdout,
    level: conf.get('log').level
  });

};
