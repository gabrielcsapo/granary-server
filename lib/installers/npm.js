var fs = require('fs');
var path = require('path');
var Promise = require('bluebird');

module.exports = function(log) {

    var install = function(project, options) {
        options = options || {};
        return new Promise(function(resolve, reject) {

            log.info('NPM Installing:', project.name);

            var npmJson = JSON.stringify({
                dependencies: project.npm.dependencies,
                devDependencies: options.production ? {} : project.npm.devDependencies,
                name: project.name
            }, null, 4);
            fs.writeFileSync(path.join(project.tempPath, 'package.json'), npmJson);
            if (project.npm.shrinkwrap) {
                var shrinkwrap = JSON.stringify(project.npm.shrinkwrap);
                fs.writeFileSync(path.join(project.tempPath, 'npm-shrinkwrap.json'), shrinkwrap);
            }

            var npm = require("npm");
            npm.load({
                loaded: false,
                prefix: project.tempPath
            }, function(err) {
                if (err) {
                    log.error('NPM Exception', err);
                }
                npm.config.set('ignore-scripts', true);
                if (options.production) {
                    npm.config.set('production', true);
                }
                npm.prefix = project.tempPath;
                npm.commands.install(project.tempPath, [], function(err) {
                    if (!err) {
                        log.info('NPM Install Complete:', project.name);
                        fs.unlink(path.join(project.tempPath, 'package.json'), function() {
                            fs.unlink(path.join(project.tempPath, 'npm-shrinkwrap.json'), function() {
                                return resolve();
                            });
                        });
                    } else {
                        log.info('NPM Install Failed', project.name, 'Error:', err);
                        fs.unlink(path.join(project.tempPath, 'npm-debug.log'), function() {
                            return reject(err);
                        });
                    }
                });
            });

        });
    };

    return {
        install: install
    }
};
