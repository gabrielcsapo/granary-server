var fs = require('fs');
var path = require('path');
var rimraf = require('rimraf');
var exec = require('child_process').exec;
var assert = require('chai').assert;

var executable = process.GRANARY;
var currentDir = process.cwd();

describe('create', function () {
  var projectName = 'sample-project';

  beforeEach(function (done) {
    process.env.GRANARY_PASSWORD = null;
    process.chdir(path.resolve(__dirname, '..') + '/fixtures/project1');
    var pkg = JSON.parse(fs.readFileSync('package.json'));
    pkg.name = pkg.name + Date.now();
    fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
    rimraf('node_modules', done);
  });

  afterEach(function (done) {
    this.timeout(15000);
    var pkg = JSON.parse(fs.readFileSync('package.json'));
    pkg.name = projectName;
    fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
    rimraf('node_modules', function() {
        process.chdir(currentDir);
        done();
    });
  });

  it('should ask for password, fail on wrong password', function (done) {
    this.timeout(15000);

    exec('GRANARY_PASSWORD=wrong ' + executable + ' create -u http://localhost:8872',
      function (error, stdout, stderr) {
        assert.equal(stderr, 'Wrong Granary Server password.\n');
        done();
      });

  });

  it('should work with a custom directory', function (done) {
    this.timeout(150000);
    process.env.GRANARY_PASSWORD = 'testing';
    process.chdir(currentDir);
    var cmd = executable + ' create -u http://localhost:8872 --directory=' + path.resolve(__dirname, '..') + '/fixtures/project1';

    exec(cmd,
      function (error, stdout, stderr) {
        process.chdir(path.resolve(__dirname, '..') + '/fixtures/project1');
        assert.equal(stderr, '');
        var out =
          '************\n\n' +
          'Bundle does not exist for this project.\n' +
          'Granary Server will now generate a bundle.';
        assert.equal(stdout.substring(0, 96), out);

        var bundleReady = function() {
          exec(executable + ' -u http://localhost:8872',
            function (error, stdout, stderr) {
              assert.equal(stderr, '');

              fs.exists('node_modules/inherits/package.json', function (exists) {
                if (! exists) {
                  setTimeout(function () {
                    bundleReady();
                  }, 1000);
                } else {
                  assert.ok(exists);
                  assert.ok(fs.existsSync('node_modules/rimraf/package.json'));
                  assert.ok(fs.existsSync('node_modules/inherits/package.json'));
                  assert.notOk(fs.existsSync('bower_components'));
                  assert.notOk(fs.existsSync('bower.json'));
                  assert.notOk(fs.existsSync('.bowerrc'));
                  assert.notOk(fs.existsSync('node_modules/mocha'));
                  done();
                }
              });
            });
        };

        bundleReady();

      });
  });


  it('should create a bundle and a bundle can be extracted', function (done) {
    this.timeout(150000);
    process.env.GRANARY_PASSWORD = 'testing';

    exec(executable + ' create -u http://localhost:8872',
      function (error, stdout, stderr) {
        assert.equal(stderr, '');
        var out =
          '************\n\n' +
          'Bundle does not exist for this project.\n' +
          'Granary Server will now generate a bundle.';
        assert.equal(stdout.substring(0, 96), out);

        var bundleReady = function() {
          exec(executable + ' -u http://localhost:8872',
            function (error, stdout, stderr) {
              assert.equal(stderr, '');

              fs.exists('node_modules/inherits/package.json', function (exists) {
                if (! exists) {
                  setTimeout(function () {
                    bundleReady();
                  }, 1000);
                } else {
                  assert.ok(exists);
                  assert.ok(fs.existsSync('node_modules/rimraf/package.json'));
                  assert.notOk(fs.existsSync('bower_components'));
                  assert.notOk(fs.existsSync('bower.json'));
                  assert.notOk(fs.existsSync('.bowerrc'));
                  done();
                }
              });
            });
        };

        bundleReady();

      });
  });

  it('it should not generate blank bundles, bower-error', function (done) {
    this.timeout(150000);

    process.chdir(path.resolve(__dirname, '..') + '/fixtures/projectbowererror');
    var pkg = JSON.parse(fs.readFileSync('bower.json'));
    pkg.name = pkg.name + Date.now();
    fs.writeFileSync('bower.json', JSON.stringify(pkg, null, 2));

    process.env.GRANARY_PASSWORD = 'testing';

    exec(executable + ' create -u http://localhost:8872',
      function (error, stdout, stderr) {
        assert.equal(stderr, '');

        var bundleReady = function () {
          exec(executable + ' -u http://localhost:8872',
            function (error, stdout, stderr) {
              assert.equal(stderr, '');
              assert.isTrue(stdout.indexOf('Bundle does not exist for this project') > 0);
              var pkg = JSON.parse(fs.readFileSync('bower.json'));
              pkg.name = projectName;
              fs.writeFileSync('bower.json', JSON.stringify(pkg, null, 2));
              done();
            });
        };

        setTimeout(function () {
          bundleReady();
        }, 7000);
      });
  });

  it('it should not generate blank bundles', function (done) {
    this.timeout(200000);

    process.env.GRANARY_PASSWORD = 'testing';

    process.chdir(path.resolve(__dirname, '..') + '/fixtures/projectnpmerror');
    var pkg = JSON.parse(fs.readFileSync('package.json'));
    pkg.name = pkg.name + Date.now();
    fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
    rimraf('node_modules', function() {
        exec(executable + ' create -u http://localhost:8872',
          function (error, stdout, stderr) {
            assert.equal(stderr, '');

            var bundleReady = function () {
              exec(executable + ' -u http://localhost:8872',
                function (error, stdout, stderr) {
                  assert.equal(stderr, '');
                  assert.notOk(fs.existsSync('npm-debug.log'), 'npm-debug.log should not exist');
                  var pkg = JSON.parse(fs.readFileSync('package.json'));
                  pkg.name = projectName;
                  fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
                  done();
                });
            };

            setTimeout(function () {
              bundleReady();
            }, 7000);
          });
      });
    });

});
