var crypto = require('crypto');
var fs = require('fs');
var path = require('path');
var kue = require('kue');
var Job = require('kue/lib/queue/job');
var reds = require('reds');
var filesize = require('filesize');
var async = require('async');
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
        project.hash = crypto.createHash('md5').update(JSON.stringify(project)).digest('hex');
        // storage directory for projects
        project.storageDir = conf.get('storage');
        // path where tar.gz will be saved
        project.bundlePath = path.join(project.storageDir, project.name + '-' + project.hash + '.tar.gz');
        project.productionBundlePath = path.join(project.storageDir, project.name + '-production-' + project.hash + '.tar.gz');
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
            process: {
                heap: filesize(memory.heapUsed)
            }
        };

        fs.readdir(storage, function(err, files) {
            if (err) {
                log.error(err);
                throw err;
            }

            async.map(files,
                function(file, complete) {
                    fs.stat(path.join(storage, file), function(err, stat) {
                        stat.size = filesize(stat.size);
                        stat.download = '/storage/' + file;
                        stat.ctime = moment(stat.ctime).format('MMMM Do YYYY, h:mm:ss a');
                        if (file.indexOf('tar.gz') > -1) {
                            complete(err, {
                                name: file,
                                details: stat
                            });
                        } else {
                            complete(err, {});
                        }
                    });
                },
                function(err, results) {
                    if (err) {
                        log.error('Failed to get statistics on all bundle files');
                        throw err;
                    }

                    var bundles = results.filter(function(file) {
                        return file.hasOwnProperty('name');
                    });

                    bundles.sort(function(a, b) {
                        return b.details.mtime.getTime() - a.details.mtime.getTime();
                    });

                    data.files = bundles;
                    req.data = data;
                    next();
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
        if (req.body.hash) {
            var hashFile = path.join(conf.get('storage'), req.body.name + '-' + req.body.hash + '.tar.gz');
            if (req.body.options && req.body.options.production === 'true') {
                hashFile = path.join(conf.get('storage'), req.body.name + '-production-' + req.body.hash + '.tar.gz');
            }

            fs.exists(hashFile, function(exists) {
                if (exists) {
                    log.debug('Download bundle:', hashFile);
                    return res.sendFile(hashFile);
                } else {
                    log.debug('Bundle does not exist:', hashFile);
                    return res.sendStatus(404);
                }
            });
        } else {
            log.debug('Hash not set.');
            return res.sendStatus(404);
        }

    };

    Routes.track = function(req, res) {
        if (req.body && req.body.repository && req.body.password && req.body.branch) {
            log.debug('Tracking request:', req.body);

            if (!freightAuth.checkPassword(req.body.password)) {
                log.debug('Password does not match');
                return res.sendStatus(403);
            }

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
