var crypto = require('crypto');
var path = require('path');
var fs = require('fs');
var mkdirp = require('mkdirp');
var Promise = require('bluebird');
var mongoose = require('mongoose');
var conf = require('../config/config').conf;

var ProjectSchema = mongoose.Schema({
    hash: String,
    download_count: Number,
    download_time: Number,
    time: Date,
    bundle: Object,
    bower_time: Number,
    bower_logs: Array,
    npm_time: Number,
    npm_logs: Array,
    client_stats: Array
});

var Project = mongoose.model('Project', ProjectSchema);

mongoose.connect('mongodb://localhost/granary-server');

module.exports = function(log) {
    var self = {};
    return self = {
        get: function(hash) {
            return new Promise(function(resolve, reject) {
                Project.where({
                    hash: hash
                }).findOne(function(err, project) {
                    if (err) {
                        reject(err);
                    }
                    if (project) {
                        resolve(project);
                    } else {
                        project = new Project({
                            hash: hash
                        }).save(function() {
                            resolve(project);
                        });
                    }
                });
            });
        },
        remove: function(hash) {
            Project.where({
                hash: hash
            }).findOneAndRemove();
        },
        getProjects: function() {
            return new Promise(function(resolve, reject) {
                var storage = conf.get('storage');
                fs.readdir(storage, function(err, folders) {
                    if (err) {
                        log.error(err);
                        reject(err);
                    }
                    folders = folders.filter(function(folder) {
                        return fs.lstatSync(path.join(storage, folder)).isDirectory();
                    });
                    folders = folders.sort();
                    resolve(folders);
                });
            });
        },
        getDetails: function(project) {
            project.hash = project.hash || crypto.createHash('md5').update(JSON.stringify(project)).digest('hex');
            project.path = path.join(conf.get('storage'), project.name);

            if (project.bower) {
                project.bower_bundle_development = JSON.stringify({
                    dependencies: project.bower.dependencies,
                    devDependencies: project.bower.devDependencies,
                    resolutions: project.bower.resolutions,
                    name: project.name
                }, null, 4);

                project.bower_bundle_production = JSON.stringify({
                    dependencies: project.bower.dependencies,
                    devDependencies: [],
                    resolutions: project.bower.resolutions,
                    name: project.name
                }, null, 4);
            }
            if (project.npm) {
                project.npm_bundle_development = JSON.stringify({
                    dependencies: project.npm.dependencies,
                    devDependencies: project.npm.devDependencies,
                    name: project.name
                }, null, 4);

                project.npm_bundle_production = JSON.stringify({
                    dependencies: project.npm.dependencies,
                    devDependencies: {},
                    name: project.name
                }, null, 4);
            }

            project.developmentBundle = path.join(project.name, 'development-' + project.hash + '.tar.gz');
            project.productionBundle = path.join(project.name, 'production-' + project.hash + '.tar.gz');

            if (project.npm || project.bower) {
                self.get(project.developmentBundle).then(function(_project) {
                    _project.bundle = JSON.stringify({
                        npm: project.npm,
                        bower: project.bower
                    });
                    _project.save();
                });

                self.get(project.productionBundle).then(function(_project) {
                    _project.bundle = JSON.stringify({
                        npm: project.npm,
                        bower: project.bower
                    });
                    _project.save();
                });
            }

            project.bundlePath = path.join(project.path, 'development-' + project.hash + '.tar.gz');
            project.productionBundlePath = path.join(project.path, 'production-' + project.hash + '.tar.gz');
            project.downloadPath = path.join(project.name, 'development-' + project.hash + '.tar.gz');
            project.tempPath = path.join(conf.get('temp'), project.hash);
            return project;
        },
        getStats: function(hash) {
            return new Promise(function(resolve) {
                self.get(hash).then(function(project) {
                    var response = project.toObject();
                    project.download_count = project.download_count || 0;
                    response.avg_time = project.download_time ? project.download_time / project.download_count : 0;

                    var client_time;
                    response.client_stats.forEach(function(cs) {
                        client_time =+ cs.total_time;
                    });
                    var total_time = (response.npm_time ? response.npm_time : 0) + (response.bower_time ? response.bower_time : 0);
                    client_time = client_time ? client_time / response.client_stats.length : total_time;

                    response.install_time_saved = total_time - client_time;
                    response.npm_logs = response.npm_logs.join('<br>');
                    response.bower_logs = response.bower_logs.join('<br>');
                    resolve(response);
                });
            });
        },
        create: function(project, extra, jobs) {
            mkdirp(project.tempPath, function(err) {
                if (err) {
                    log.error(err);
                }

                var install = jobs.create('install', {
                        project: project,
                        hash: project.hash,
                        title: project.name
                    })
                    .priority(extra.priority)
                    .searchKeys(['title', 'hash'])
                    .save();

                install.on('promotion', function() {
                    log.debug('Kue Job Promoted');
                });

                install.on('complete', function() {
                    log.debug('Kue Job Promoted');
                });

                return project;
            });
        },
        download: function(res, file) {
            fs.exists(path.resolve(conf.get('storage'), file), function(exists) {
                if (exists) {
                    self.get(file).then(function(project) {
                        project.download_count = project.download_count ? project.download_count += 1 : 1;
                        project.save(function() {
                            return res.sendFile(path.resolve(conf.get('storage'), file));
                        });
                    });
                } else {
                    return res.sendStatus(404);
                }
            });
        }
    }
}
