var fs = require('fs');
var kue = require('kue');
var Job = require('kue/lib/queue/job');
var reds = require('reds');
var conf = require('../config/config').conf;
var logger = require('../config/config').logger;

module.exports = function() {
    var Project = require('./project')(logger);
    var installer = require('./jobs/installer')(logger);
    logger.debug('Redis Configuration', conf.get('redis'));
    // TODO: refactor this out into setup file
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

    installer.setup(jobs);

    var Tracker = require('./jobs/tracker')(logger, conf, jobs);
    var Auth = require('../lib/auth')(logger, conf);
    var Routes = {};

    // TODO: refactor this
    // TODO: send back response.state for front-end to know what state the backend is in
    // TODO: remove the tree of if statements
    // TODO: refactor this to not be a middleware function
    Routes.check = function(req, res) {
        if (!req.body && !req.body.project && !req.body.project.name) {
            return res.sendStatus(404);
        }

        var project = req.body.project;
        var extra = req.body.extra;

        project = Project.getDetails(project);

        logger.debug('Incoming Project', project, extra);

        // check if Granary file exists
        fs.exists(project.bundlePath, function(bundleExists) {
            var response = {
                creating: false,
                available: false,
                project: project,
                authenticated: Auth.checkPassword(extra.password)
            };

            if (bundleExists) {
                response.available = true;
                response.hash = project.hash;
            }

            if (Auth.checkPassword(extra.password) && extra.create === 'true') {
                // TODO: restart stale job if timeout > x.
                getSearch().query(project.hash).end(function(err, ids) {
                    if (err) { logger.error(err.toString()); }
                    if (ids.length == 0) {
                        if (!bundleExists || extra.force === 'true') {
                            try {
                                fs.unlinkSync(project.bundlePath);
                                fs.unlinkSync(project.productionBundlePath);
                            } catch (ex) { /* doesn't matter if it fails */ }
                            response.creating = true;
                            response.hash = project.hash;
                            Project.create(project, extra, jobs);
                            return res.json(response);
                        } else {
                            return res.json(response);
                        }
                    } else if (ids.length == 1) {
                        Job.get(ids[0], function(err, job) {
                            if (err) {
                                return res.json(err);
                            }
                            if(job._state == 'failed') {
                                job.remove(function() {
                                    logger.error('Failed Job removed :', job.data.project.name);
                                    response.description = 'job failed; restarting;'
                                    return res.json(response);
                                })
                            } else {
                                response.creating = true;
                                response.hash = project.hash;
                                response.progress = job._progress;
                                response.state = job._state;
                                response.started_at = job.started_at;
                                response.duration = job.duration;
                                return res.json(response);
                            }
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

    // TODO: refactor this to not be a middleware function
    Routes.download = function(req, res) {
        logger.debug('Download request', req.body);

        if (!req.body && !req.body.name) {
            return res.sendStatus(404);
        }

        var project = Project.getDetails(req.body);
        var file = project.bundlePath;

        if (req.body.options && req.body.options.production === 'true') {
            file = project.productionBundlePath;
        }

        // TODO: refactor this, yeah shut up it is terrible
        Project.download(res, file, project.name, file.substring(file.indexOf(project.name) + project.name.length + 1, file.length));
    };

    // TODO: refactor this to not be a middleware function
    Routes.stats = function(req, res) {
        logger.debug('Stats request', req.body);
        if (!req.body && !req.body.name && !req.body.download_opts) {
            return res.sendStatus(404);
        }

        var project = Project.getDetails(req.body.download_opts);

        var file = project.developmentBundle;

        if (req.body.download_opts.opts && req.body.download_opts.opts.production === 'true') {
            file = project.productionBundle;
        }

        Project.get(file).then(function(project) {
            project.client_stats.push({
                total_time: req.body.total_time,
                zip_time: req.body.zip_time,
                gyp_time: req.body.gyp_time
            });
            project.save(function() {
                return res.sendStatus(200);
            });
        });
    };

    // TODO: refactor this to not be a middleware function
    Routes.track = function(req, res) {
        if (req.body && req.body.repository && req.body.password && req.body.branch) {
            logger.debug('Tracking request:', req.body);

            var extraOptions = {
                trackDirectory: req.body.trackDirectory
            };

            Tracker.create(req.body.repository, req.body.branch, extraOptions, function(err) {
                if (err) {
                    // fetch $REPO, run granary on it
                    // keep fetching the $BRANCH, run granary on it
                    logger.debug('Cannot track repository: ', err);
                    return res.sendStatus(500);
                } else {
                    return res.sendStatus(200);
                }
            });

        } else {
            logger.debug('Repository or password not set');
            return res.sendStatus(500);
        }

    };

    return Routes;
};
