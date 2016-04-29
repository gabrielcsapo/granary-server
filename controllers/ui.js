var fs = require('fs');
var path = require('path');
var filesize = require('filesize');
var moment = require('moment');

module.exports = function(app, log, conf) {
    var Project = require('./project')(app, log, conf);
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

            Project.getProjects().then(function(err, folders) {
                if(err) { log.error(err.toString()); }

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
                                return;
                            } else {
                                counter += files.length;
                                files.forEach(function(file) {
                                    fs.stat(path.join(storage, folder, file), function(err, stat) {
                                        stat.size = filesize(stat.size);
                                        stat.download = '/storage/' + file;
                                        stat.ctime = moment(stat.ctime).format('MMMM Do YYYY, h:mm:ss a');
                                        if(!data.projects[folder]) {
                                            data.projects[folder] = [];
                                        }
                                        var _file = path.join(folder, file);
                                        Project.getHashStats(_file, function(stats) {
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
            });
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
        // TODO: make sure we clean up the stats when we delete a project or file
        delete: function(req, res) {
            if (req.params.file) {
                log.debug('UI Bundle Delete request', req.params.file);
                fs.unlink(
                    path.join(conf.get('storage'), req.params.folder, req.params.file),
                    function(err) {
                        if (err) {
                            log.error(err);
                        } else {
                            log.info('UI Bundle Deleted:', req.params.file);
                        }
                        res.redirect('/');
                    }
                );
            } else {
                res.sendStatus(404);
            }
        }
    }
};
