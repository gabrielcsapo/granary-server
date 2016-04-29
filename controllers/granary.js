var fs = require('fs');
var path = require('path');
var kue = require('kue');
var Job = require('kue/lib/queue/job');
var reds = require('reds');
var moment = require('moment');

module.exports = function(app, log, conf) {
    var db = app.db;
    var Project = require('./project')(log, conf);
    var processor = require('../lib/job_processor')(log);
    log.debug('Redis Configuration', conf.get('redis'));
    var jobs = kue.createQueue({
        redis: conf.get('redis'),
        disableSearch: false
    });

    var search;
    // TODO: refactor this out
    function getSearch() {
        if (search) return search;
        reds.createClient = require('kue/lib/redis').createClient;
        return search = reds.createSearch(jobs.client.getKey('search'));
    }

    processor.setup(jobs);

    var freighter = require('../lib/freighter')(log, conf, jobs);
    var tracker = require('../lib/tracker')(log, conf, jobs);
    var freightAuth = require('../lib/auth')(log, conf);
    var Routes = {};

    // TODO: refactor this
    // TODO: send back response.state for front-end to know what state the backend is in
    // TODO: remove the tree of if statements
    Routes.check = function(req, res) {
        if (!req.body && !req.body.project && !req.body.project.name) {
            return res.sendStatus(404);
        }

        var project = req.body.project;
        var extra = req.body.extra;

        // TODO: always send project back in response payload
        project = Project.getDetails(project);

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
                response.project = project;
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
                            // TODO: refactor this crap into Project.create?
                            var bundle = {
                                npm: project.npm,
                                bower: project.bower
                            };
                            db.put(project.bundlePath.substring(project.bundlePath.indexOf(project.name), project.bundlePath.length) + '-bundle', JSON.stringify(bundle), function (err) {
                                db.put(project.productionBundlePath.substring(project.productionBundlePath.indexOf(project.name), project.productionBundlePath.length) + '-bundle', JSON.stringify(bundle), function (err) {
                                    freighter.create(project, extra);
                                    return res.json(response);
                                });
                            });
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

        var project = Project.getDetails(req.body);
        var file = project.bundlePath;
        if (req.body.options && req.body.options.production === 'true') {
            file = project.productionBundlePath;
        }

        // TODO: refactor into project download
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
