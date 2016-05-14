var fs = require('fs');
var path = require('path');
var spawn = require('cross-spawn-async');
var Promise = require('bluebird');

module.exports = function(log) {

    var install = function(db, project, options) {
        options = options || {};
        return new Promise(function(resolve, reject) {
            db.npm_logs = [];

            log.info('NPM Installing:', project.name);

            var cli = null;
            var cmd = path.resolve(require.resolve('npm'), '..', '..', 'bin', 'npm-cli.js');
            var args = ['install', '--ignore-scripts'];

            if (options.production) { args.push('--production'); }

            var package = JSON.stringify({
                dependencies: project.npm.dependencies,
                devDependencies: options.production ? {} : project.npm.devDependencies,
                name: project.name
            }, null, 4);

            fs.writeFileSync(path.join(project.tempPath, 'package.json'), package);

            if (project.npm.shrinkwrap) {
                var shrinkwrap = JSON.stringify(project.npm.shrinkwrap);
                fs.writeFileSync(path.join(project.tempPath, 'npm-shrinkwrap.json'), shrinkwrap);
            }

            try {
                var start = Date.now();
                cli = spawn(cmd, args, {
                    cwd: project.tempPath
                });
                cli.stdout.on('data', function(data) {
                    if (data && data.length > 0) {
                        db.npm_logs.push(data.toString().trim())
                    }
                });

                cli.stderr.on('data', function(data) {
                    if (data && data.length > 0) {
                        db.npm_logs.push(data.toString().trim())
                    }
                });

                cli.on('close', function(code) {
                    cli.kill('SIGINT');
                    db.save();
                    var end = Date.now();
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
            } catch (e) {
                log.error('NPM Exception', e, 'with command', cmd);
            }

        });
    };

    return {
        install: install
    }
};
