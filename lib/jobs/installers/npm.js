var fs = require('fs');
var path = require('path');
var spawn = require('cross-spawn-async');
var Promise = require('bluebird');

module.exports = function(log) {

    var install = function(db, project, options) {
        options = options || {};
        return new Promise(function(resolve, reject) {
            db.npm_logs = [];

            var start = Date.now();
            log.info('NPM Installing:', project.name);

            var cmd = path.resolve(require.resolve('npm'), '..', '..', 'bin', 'npm-cli.js');
            var args = ['install', '--ignore-scripts'];

            if (options.production) {
                args.push('--production');
            }

            if (options.production) {
                fs.writeFileSync(path.join(project.tempPath, 'package.json'), project.npm_bundle_production);
            } else {
                fs.writeFileSync(path.join(project.tempPath, 'package.json'), project.npm_bundle_development);
            }
            if (project.npm.shrinkwrap) {
                var shrinkwrap = JSON.stringify(project.npm.shrinkwrap);
                fs.writeFileSync(path.join(project.tempPath, 'npm-shrinkwrap.json'), shrinkwrap);
            }

            try {
                var npm = spawn(cmd, args, {
                    cwd: project.tempPath
                });
                npm.stdout.on('data', function(data) {
                    db.npm_logs.push(data.toString())
                });

                npm.stderr.on('data', function(data) {
                    db.npm_logs.push(data.toString())
                });

                npm.on('close', function(code) {
                    npm.kill('SIGINT');
                    var end = Date.now();
                    var time = (end - start) / 1000;
                    db.npm_time = time;
                    db.save(function() {
                        log.info('NPM Install Completed: ', project.name, ' completed in ', (end - start) / 1000, 'seconds.', 'Code:', code);
                        if (code === 0) {
                            fs.unlink(path.join(project.tempPath, 'package.json'), function() {
                                fs.unlink(path.join(project.tempPath, 'npm-shrinkwrap.json'), function() {
                                    return resolve();
                                });
                            });
                        } else {
                            fs.unlink(path.join(project.tempPath, 'npm-debug.log'), function() {
                                return reject(db.npm_logs);
                            });
                        }
                    });
                });
            } catch (e) {
                log.error('NPM Exception', e, 'with command', cmd);
                reject(e);
            }

        });
    };

    return {
        install: install
    }
};
