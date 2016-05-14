var crypto = require('crypto');
var path = require('path');
var fs = require('fs');
var mkdirp = require('mkdirp');
var Promise = require('bluebird');
var mongoose = require('mongoose');

var ProjectSchema = mongoose.Schema({
    hash: String,
    download_count: Number,
    download_time: Number,
    time: Date,
    bundle: Object
});

var Project = mongoose.model('Project', ProjectSchema);

mongoose.connect('mongodb://localhost/granary-server');

module.exports = function(log, conf) {
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
                        var project = new Project({
                            hash: hash
                        }).save(function(err) {
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
            // TODO: Switch to something else or keep md5?
            project.hash = project.hash || crypto.createHash('md5').update(JSON.stringify(project)).digest('hex');
            // storage directory for projects
            project.storageDir = conf.get('storage');
            // path where tar.gz will be saved
            project.path = path.join(project.storageDir, project.name);
            project.developmentBundle = 'development-' + project.hash + '.tar.gz';
            project.productionBundle = 'production-' + project.hash + '.tar.gz'

            self.get(path.join(project.name, project.developmentBundle)).then(function(_project) {
                _project.bundle = JSON.stringify({
                    npm: project.npm || {},
                    bower: project.bower || {}
                });
                _project.save();
            });

            self.get(path.join(project.name, project.productionBundle)).then(function(_project) {
                _project.bundle = JSON.stringify({
                    npm: project.npm || {},
                    bower: project.bower || {}
                });
                _project.save();
            });

            project.bundlePath = path.join(project.path, project.developmentBundle);
            project.productionBundlePath = path.join(project.path, project.productionBundle);
            project.downloadPath = path.join(project.name, 'development-' + project.hash + '.tar.gz');
            // temp storage directory where things install to
            project.tempPath = path.join(project.storageDir, project.hash);
            return project;
        },
        getStats: function(hash, callback) {
            return new Promise(function(resolve, reject) {
                self.get(hash).then(function(project) {
                    resolve({
                        downloads: project.download_count || 0,
                        bundle: project.bundle || "{}",
                        avg_time: project.download_time ? project.download_time / project.download_count : 0
                    });
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
        download: function(res, file, name, bundle) {
            fs.exists(file, function(exists) {
                if (exists) {
                    // TODO: refactor file name into something less absolute (hash?)
                    // TODO: use name as the hash, this will then have a files array where we can store individual stats
                    var hash = path.join(name, bundle);
                    self.get(hash).then(function(project) {
                        project.download_count = project.download_count ? project.download_count += 1 : 1;
                        project.save(function(err) {
                            return res.sendFile(file);
                        });
                    });
                } else {
                    return res.sendStatus(404);
                }
            });
        }
    }
}
