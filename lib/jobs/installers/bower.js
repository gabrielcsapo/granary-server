var fs = require('fs');
var path = require('path');
var spawn = require('cross-spawn-async');
var Promise = require('bluebird');

module.exports = function(log) {

    var install = function(db, project, options) {
        db.bower_logs = [];
        options = options || {};
        return new Promise(function(resolve, reject) {
            log.info('Bower Installing:', project.name);
            var start = Date.now();

            var cmd = path.resolve(require.resolve('bower'), '..', '..', 'bin', 'bower');
            var args = ['install', '--loglevel=debug'];
            if (options.production) {
                args.push('--production');
            }

            if (options.production) {
                fs.writeFileSync(path.join(project.tempPath, 'bower.json'), project.bower_bundle_production);
            } else {
                fs.writeFileSync(path.join(project.tempPath, 'bower.json'), project.bower_bundle_development);
            }
            if (project.bower.rc) {
                fs.writeFileSync(project.tempPath + '/.bowerrc', JSON.stringify(project.bower.rc));
            }

            try {
                var bower = spawn(cmd, args, {
                    cwd: project.tempPath
                });

                bower.stdout.on('data', function(data) {
                    db.bower_logs.push(data.toString('utf8'));
                });

                bower.stderr.on('data', function(data) {
                    db.bower_logs.push(data.toString('utf8'));
                });

                bower.on('close', function(code) {
                    bower.kill('SIGINT');
                    var end = Date.now();
                    var time = (end - start) / 1000;
                    db.bower_time = time;
                    db.save(function() {
                        if (code === 0) {
                            log.info('Bower Install complete:', project.name);
                            fs.unlink(project.tempPath + '/bower.json', function() {
                                fs.unlink(project.tempPath + '/.bowerrc', function() {
                                    return resolve();
                                });
                            });
                        } else {
                            return reject(db.bower_logs);
                        }
                    });
                });
            } catch (ex) {
                log.error('Bower Exception', ex, 'with command', cmd);
                reject(ex);
            }

        });

    };

    return {
        install: install
    }
};
