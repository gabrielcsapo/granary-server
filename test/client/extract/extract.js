var fs = require('fs');
var path = require('path');
var rimraf = require('rimraf');
var exec = require('child_process').exec;
var assert = require('chai').assert;

var executable = process.GRANARY;
var currentDir = process.cwd();

describe('extract', function() {
    var projectName = 'sample-project';

    beforeEach(function(done) {
        process.env.GRANARY_PASSWORD = null;
        process.chdir(path.resolve(__dirname, '..') + '/fixtures/project2');
        var pkg = JSON.parse(fs.readFileSync('package.json'));
        pkg.name = pkg.name + Date.now();
        fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
        rimraf('node_modules', function() {
            rimraf('app', done);
        });
    });

    afterEach(function() {
        var pkg = JSON.parse(fs.readFileSync('package.json'));
        pkg.name = projectName;
        fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
        process.chdir(currentDir);
    });

    it('a full bundle with bower and npm', function(done) {
        this.timeout(2000000);
        process.env.GRANARY_PASSWORD = 'testing';

        exec(executable + ' create -u http://localhost:8872',
            function(error, stdout, stderr) {
                console.log(stderr);
                console.log(error);
                assert.equal(stderr, '');

                var bundleReady = function() {
                    exec(executable + ' -u http://localhost:8872',
                        function(error, stdout, stderr) {
                            assert.equal(stderr, '');

                            fs.exists('node_modules/inherits/package.json', function(exists) {
                                if (!exists) {
                                    setTimeout(function() {
                                        bundleReady();
                                    }, 2000);
                                } else {
                                    assert.ok(exists, 'inherits should exist');
                                    assert.ok(fs.existsSync('node_modules/rimraf/package.json'), 'rimraf should exist');
                                    assert.notOk(fs.existsSync('bower_components'), 'wrong bower dir');
                                    assert.ok(fs.existsSync('app/bower_components/normalize.css/.bower.json'), 'normalize should exist');
                                    var bowerResolution = JSON.parse(fs.readFileSync('app/bower_components/normalize.css/.bower.json')).version;
                                    assert.equal(bowerResolution, '2.0.1', 'should use bower resolutions');
                                    assert.ok(fs.existsSync('app/bower_components/sinon/index.js'), 'sinon should exist');
                                    assert.ok(fs.existsSync('app/bower_components/p/p.js'), 'p should exist');
                                    assert.notOk(fs.existsSync('app/bower_components/bower.json'), 'bower.json wrong');
                                    assert.ok(fs.existsSync('bower.json'), 'keep the original bower.json');
                                    assert.ok(fs.existsSync('.bowerrc'), 'keep the original .bowerrc');
                                    var shrinkwrapPkg = JSON.parse(fs.readFileSync('node_modules/inherits/package.json'));
                                    assert.equal(shrinkwrapPkg.version, '2.0.0');

                                    done();
                                }
                            });
                        });
                };

                bundleReady();

            });
    });

    it('a production bundle', function(done) {
        this.timeout(2000000);
        process.env.GRANARY_PASSWORD = 'testing';

        exec(executable + ' create -u http://localhost:8872',
            function(error, stdout, stderr) {
                console.log(stderr);
                console.log(error);
                assert.equal(stderr, '');

                var bundleReady = function() {
                    exec(executable + ' -u http://localhost:8872 --production',
                        function(error, stdout, stderr) {
                            assert.equal(stderr, '');

                            fs.exists('node_modules/inherits/package.json', function(exists) {
                                if (!exists) {
                                    setTimeout(function() {
                                        bundleReady();
                                    }, 2000);
                                } else {
                                    assert.ok(exists, 'npm module inherits should exist');
                                    assert.notOk(fs.existsSync('node_modules/rimraf/package.json'), 'rimraf should not exist');
                                    assert.notOk(fs.existsSync('bower_components'), 'wrong bower component directory');
                                    assert.ok(fs.existsSync('app/bower_components/normalize.css/.bower.json'), 'normalize should exist');
                                    assert.notOk(fs.existsSync('app/bower_components/sinon/index.js'), 'sinon should not exist in prod');
                                    assert.ok(fs.existsSync('app/bower_components/p/p.js'));
                                    assert.notOk(fs.existsSync('app/bower_components/bower.json'));
                                    assert.ok(fs.existsSync('bower.json'));
                                    assert.ok(fs.existsSync('.bowerrc'));
                                    done();
                                }
                            });
                        });
                };

                bundleReady();
            });
    });

    it('a production bundle using NODE_ENV', function(done) {
        this.timeout(2000000);
        process.env.GRANARY_PASSWORD = 'testing';
        process.env.NODE_ENV = 'production';

        exec(executable + ' create -u http://localhost:8872',
            function(error, stdout, stderr) {
                console.log(stderr);
                console.log(error);
                assert.equal(stderr, '');

                var bundleReady = function() {
                    exec(executable + ' -u http://localhost:8872',
                        function(error, stdout, stderr) {
                            assert.equal(stderr, '');

                            fs.exists('node_modules/inherits/package.json', function(exists) {
                                if (!exists) {
                                    setTimeout(function() {
                                        bundleReady();
                                    }, 2000);
                                } else {
                                    assert.ok(exists, 'npm module inherits should exist');
                                    assert.notOk(fs.existsSync('node_modules/rimraf/package.json'), 'rimraf should not exist');
                                    assert.notOk(fs.existsSync('bower_components'), 'wrong bower component directory');
                                    assert.ok(fs.existsSync('app/bower_components/normalize.css/.bower.json'), 'normalize should exist');
                                    assert.notOk(fs.existsSync('app/bower_components/sinon/index.js'), 'sinon should not exist in prod');
                                    assert.ok(fs.existsSync('app/bower_components/p/p.js'));
                                    assert.notOk(fs.existsSync('app/bower_components/bower.json'));
                                    assert.ok(fs.existsSync('bower.json'));
                                    assert.ok(fs.existsSync('.bowerrc'));

                                    process.env.NODE_ENV = null;
                                    done();
                                }
                            });
                        });
                };

                bundleReady();
            });
    });

    it('a full bundle using NODE_ENV, override by the --production=false option', function(done) {
        this.timeout(2000000);
        process.env.GRANARY_PASSWORD = 'testing';
        process.env.NODE_ENV = 'production';

        exec(executable + ' create -u http://localhost:8872',
            function(error, stdout, stderr) {
                console.log(stderr);
                console.log(error);
                assert.equal(stderr, '');

                var bundleReady = function() {
                    exec(executable + ' -u http://localhost:8872 --production=false',
                        function(error, stdout, stderr) {
                            assert.equal(stderr, '');

                            fs.exists('node_modules/inherits/package.json', function(exists) {
                                if (!exists) {
                                    setTimeout(function() {
                                        bundleReady();
                                    }, 2000);
                                } else {
                                    assert.ok(exists, 'inherits should exist');
                                    assert.ok(fs.existsSync('node_modules/rimraf/package.json'), 'rimraf should exist');
                                    assert.notOk(fs.existsSync('bower_components'), 'wrong bower dir');
                                    assert.ok(fs.existsSync('app/bower_components/normalize.css/.bower.json'), 'normalize should exist');
                                    var bowerResolution = JSON.parse(fs.readFileSync('app/bower_components/normalize.css/.bower.json')).version;
                                    assert.equal(bowerResolution, '2.0.1', 'should use bower resolutions');
                                    assert.ok(fs.existsSync('app/bower_components/sinon/index.js'), 'sinon should exist');
                                    assert.ok(fs.existsSync('app/bower_components/p/p.js'), 'p should exist');
                                    assert.notOk(fs.existsSync('app/bower_components/bower.json'), 'bower.json wrong');
                                    assert.ok(fs.existsSync('bower.json'), 'keep the original bower.json');
                                    assert.ok(fs.existsSync('.bowerrc'), 'keep the original .bowerrc');
                                    var shrinkwrapPkg = JSON.parse(fs.readFileSync('node_modules/inherits/package.json'));
                                    assert.equal(shrinkwrapPkg.version, '2.0.0');

                                    process.env.NODE_ENV = null;
                                    done();
                                }
                            });
                        });
                };

                bundleReady();

            });
    });

});
