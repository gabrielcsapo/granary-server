var fs = require('fs');
var path = require('path');
var filesize = require('filesize');
var moment = require('moment');
var conf = require('../config/config')().conf;
var log = require('../config/config')().log;

module.exports = function() {
    var Project = require('./project')(log);
    return {
        usage: function(req, res, next) {

            var data = {
                title: 'Granary Server',
                projects: {},
                count: {
                    projects: 0,
                    files: 0
                },
                process: {
                    heap: filesize(process.memoryUsage().heapUsed)
                }
            };

            Project.getProjects().then(function(folders) {
                if(folders.length == 0) {
                    req.data = data;
                    next();
                } else {
                    var storage = conf.get('storage');
                    var counter = 0;
                    data.count.projects = folders.length;

                    var done = function() {
                        if (counter == folders.length) {
                            req.data = data;
                            next();
                        }
                    }

                    counter += folders.length;

                    // TODO: clean this up
                    folders.forEach(function(folder) {
                        fs.readdir(path.join(storage, folder), function(err, files) {
                            if (err) {
                                done();
                            } else {
                                counter += files.length;
                                if(files.length == 0) {
                                    done();
                                }
                                files.forEach(function(file) {
                                    fs.stat(path.join(storage, folder, file), function(err, stat) {
                                        stat.size = filesize(stat.size);
                                        stat.download = '/storage/' + file;
                                        stat.ctime = moment(stat.ctime).format('MMMM Do YYYY, h:mm:ss a');
                                        if(!data.projects[folder]) {
                                            data.projects[folder] = [];
                                        }
                                        var _file = path.join(folder, file);
                                        Project.getStats(_file).then(function(stats) {
                                            if(stats.bundle) {
                                                data.projects[folder].push({
                                                    name: file,
                                                    bundle: stats.bundle,
                                                    downloads: stats.downloads,
                                                    avg_time: stats.avg_time,
                                                    details: stat
                                                });
                                                data.count.files += 1;
                                            }
                                            counter -= 1;
                                            done();
                                        });
                                    });
                                });
                            }
                        });
                    });
                }
            }).catch(function(err) {
                if(err) { log.error(err.toString()); }
                req.data = data;
                next();
            })
        },
        download: function(req, res) {
            if (req.params.file) {
                log.debug('UI Bundle Download request', req.params.file);
                var file = path.join(conf.get('storage'), req.params.folder, req.params.file);
                Project.download(res, file, req.params.folder, req.params.file);
            } else {
                res.sendStatus(404);
            }
        },
        delete: function(req, res) {
            if (req.params.file) {
                log.debug('UI Bundle Delete request', req.params.file);
                Project.remove(path.join(req.params.folder, req.params.file));
                fs.unlinkSync(path.join(conf.get('storage'), req.params.folder, req.params.file));
                log.info('UI Bundle Deleted:', req.params.file);
                res.redirect('/bundles');
            } else {
                res.sendStatus(404);
            }
        }
    }
};
