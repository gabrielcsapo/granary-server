/*eslint no-console:0*/
var fs = require('fs');
var crypto = require('crypto');

module.exports = function (expectedConfigFile) {

  if (! fs.existsSync(expectedConfigFile)) {
    var buf = crypto.randomBytes(256);
    var hash = crypto.createHash('sha1').update(buf).digest('hex');

    // TODO: refactor
    console.log('***** NOTICE ****** \n');
    console.log('You are missing "' + expectedConfigFile + '"');
    console.log('Creating a configuration automatically for you....');
    console.log('Your Granary Server password is: \n');
    console.log(hash);
    console.log('\n Use the password above to generate bundles.');
    var devSampleFile = JSON.parse(fs.readFileSync(__dirname + '/dev.json-dist'));
    devSampleFile.password = hash;
    fs.writeFileSync(expectedConfigFile, JSON.stringify(devSampleFile), null, 4);
  }

};
