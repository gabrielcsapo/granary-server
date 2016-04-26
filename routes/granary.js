var crypto = require('crypto');
var fs = require('fs');
var path = require('path');
var kue = require('kue');
var Job = require('kue/lib/queue/job');
var reds = require('reds');
var filesize = require('filesize');
var moment = require('moment');

module.exports = function(log, conf) {

    var processor = require('../lib/job_processor')(log);
    log.debug('Redis Configuration', conf.get('redis'));
    var jobs = kue.createQueue({
        redis: conf.get('redis'),
        disableSearch: false
    });

    var search;

    function getSearch() {
        if (search) return search;
        reds.createClient = require('kue/lib/redis').createClient;
        return search = reds.createSearch(jobs.client.getKey('search'));
    }

    function getProjectDetails(project) {
        // TODO: Switch to something else or keep md5?
        project.hash = project.hash || crypto.createHash('md5').update(JSON.stringify(project)).digest('hex');
        // storage directory for projects
        project.storageDir = conf.get('storage');
        // path where tar.gz will be saved
        project.path = path.join(project.storageDir, project.name);
        project.bundlePath = path.join(project.path, 'development-' + project.hash + '.tar.gz');
        project.productionBundlePath = path.join(project.path, 'production-' + project.hash + '.tar.gz');
        // temp storage directory where things install to
        project.tempPath = path.join(project.storageDir, project.hash);
        return project;
    }

    processor.setup(jobs);

    var freighter = require('../lib/freighter')(log, conf, jobs);
    var tracker = require('../lib/tracker')(log, conf, jobs);
    var freightAuth = require('../lib/auth')(log, conf);
    var Routes = {};

    Routes.usage = function(req, res, next) {
        var memory = process.memoryUsage();
        var storage = conf.get('storage');

        var data = {
            title: 'Granary Server',
            projects: {},
            count: {
                projects: 0,
                files: 0
            },
            process: {
                heap: filesize(memory.heapUsed)
            }
        };

        fs.readdir(storage, function(err, folders) {
            if (err) {
                log.error(err);
                throw err;
            }

            folders = folders.filter(function(folder) {
                return fs.lstatSync(path.join(storage, folder)).isDirectory();
            });

            var counter = 0;
            data.count.project = folders.length;

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
                                data.projects[folder].push({
                                    name: file,
                                    details: stat
                                });
                                data.count.files += 1;
                                counter -= 1;
                                done();
                            });
                        });
                    }
                });
            });
        });
    }

    Routes.check = function(req, res) {
        if (!req.body && !req.body.project && !req.body.project.name) {
            return res.sendStatus(404);
        }

        var project = req.body.project;
        var extra = req.body.extra;

        project = getProjectDetails(project);

        log.debug('Incoming Project', project, extra);

        // check if Granary file exists
        fs.exists(project.bundlePath, function(bundleExists) {
            var response = {
                creating: false,
                available: false,
                authenticated: freightAuth.checkPassword(extra.password)
            };

            if (bundleExists) {
                response.available = true;
                response.hash = project.hash;
            }

            if (freightAuth.checkPassword(extra.password) && extra.create === 'true') {
                // TODO: delete stale jobs, try again to cache, fail if tries too many times.
                // TODO: restart stale job if timeout > x.
                getSearch().query(project.hash).end(function(err, ids) {
                    if (ids.length == 0) {
                        if (!bundleExists || extra.force === 'true') {
                            try {
                                fs.unlinkSync(project.bundlePath);
                                fs.unlinkSync(project.productionBundlePath);
                            } catch (ex) { /* doesn't matter if it fails */ }
                            response.creating = true;
                            response.hash = project.hash;
                            freighter.create(project, extra);
                            return res.json(response);
                        } else {
                            return res.json(response);
                        }
                    } else if (ids.length == 1) {
                        Job.get(ids[0], function(err, job) {
                            if (err) {
                                return res.json(err);
                            }
                            response.creating = true;
                            response.hash = project.hash;
                            response.progress = job._progress;
                            response.state = job._state;
                            response.started_at = job.started_at;
                            response.duration = job.duration;
                            return res.json(response);
                        });
                    } else {
                        return res.json(response);
                    }
                });
            } else {
                return res.json(response);
            }
        });
    };

    Routes.download = function(req, res) {
        log.debug('Download request', req.body);
        if (!req.body && !req.body.name) {
            return res.sendStatus(404);
        }

        var project = getProjectDetails(req.body);
        var file = project.bundlePath;
        if (req.body.options && req.body.options.production === 'true') {
            file = project.productionBundlePath;
        }

        fs.exists(file, function(exists) {
            if (exists) {
                log.debug('Download bundle:', file);
                return res.sendFile(file);
            } else {
                log.debug('Bundle does not exist:', file);
                return res.sendStatus(404);
            }
        });
    };

    Routes.track = function(req, res) {
        if (req.body && req.body.repository && req.body.password && req.body.branch) {
            log.debug('Tracking request:', req.body);

            var extraOptions = {
                trackDirectory: req.body.trackDirectory
            };

            tracker.create(req.body.repository, req.body.branch, extraOptions, function(err) {
                if (err) {
                    // fetch $REPO, run freight on it
                    // keep fetching the master branch, run freight on it
                    log.debug('Cannot track repository: ', err);
                    return res.sendStatus(500);
                } else {
                    return res.sendStatus(200);
                }
            });

        } else {
            log.debug('Repository or password not set');
            return res.sendStatus(500);
        }

    };

    return Routes;
};
