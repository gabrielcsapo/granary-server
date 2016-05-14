var fs = require('fs');
var path = require('path');
var spawn = require('cross-spawn-async');
var Promise = require('bluebird');

module.exports = function(log) {

    var install = function(db, project, options) {
        options = options || {};
        return new Promise(function(resolve, reject) {
            db.bower_logs = [];

            log.info('Bower Installing:', project.name);

            // TODO: remove sync methods
            fs.writeFileSync(project.tempPath + '/bower.json', JSON.stringify({
                dependencies: project.bower.dependencies,
                devDependencies: options.production ? [] : project.bower.devDependencies,
                resolutions: project.bower.resolutions,
                name: project.name
            }, null, 4));
            if (project.bower.rc) {
                fs.writeFileSync(project.tempPath + '/.bowerrc', JSON.stringify(project.bower.rc));
            }

            var cmd = path.resolve(require.resolve('bower'), '..', '..', 'bin', 'bower');
            var args = ['install', '--config.interactive=false'];
            if (options.production) {
                args.push('--production');
            }

            var cli = spawn(cmd, args, {
                cwd: project.tempPath
            });

            cli.stdout.on('data', function(data) {
                if (data && data.length > 0) {
                    db.bower_logs.push(data.toString().trim());
                }
            });

            cli.stderr.on('data', function(data) {
                if (data && data.length > 0) {
                    db.bower_logs.push(data.toString().trim());
                }
            });

            cli.on('close', function(code) {
                cli.kill('SIGINT');
                db.save();
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

    };

    return {
        install: install
    }
};
