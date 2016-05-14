var fs = require('fs');
var rimraf = require('rimraf');
var archiver = require('archiver');
var Promise = require('bluebird');
var mkdirp = require('mkdirp');
var Job = require('kue').Job;

var logger = require('../../config/config').logger;

var bower = require('./installers/bower')(logger);
var npm = require('./installers/npm')(logger);

var installer;
module.exports = installer = {
    setup: function(jobs) {

        var Project = require('../project')();
        var Stats = require('../stats')();

        // TODO: one job at a time, npm can explode? (might need to investigate sandboxing job processing)
        // TODO: can Bower and NPM install the same time? (could be done if the process was threaded, might have an issue with concurrency)
        // TODO: refactor this mess...
        jobs.process('install', 1, function(job, done) {
            var steps = 7;
            var project = job.data.project;
            logger.debug('Project Data:', project);
            logger.debug('Creating Production Bundle');
            job.progress(0, steps);
            return Promise.resolve()
                .then(function() {
                    job.progress(1, steps);
                    if (project.npm) {
                        job.log('Running NPM Install Production');
                        return Project.get(project.productionBundle).then(function(db) {
                            return npm.install(db, project, {
                                production: true
                            });
                        });
                    } else {
                        return Promise.resolve();
                    }
                })
                .then(function() {
                    job.progress(2, steps);
                    if (project.bower) {
                        job.log('Running Bower Install Production');
                        return Project.get(project.productionBundle).then(function(db) {
                            return bower.install(db, project, {
                                production: true
                            });
                        });
                    } else {
                        return Promise.resolve();
                    }
                })
                .then(function() {
                    job.progress(3, steps);
                    job.log('Running NPM Production Compression');
                    return installer.compressProject(project, project.productionBundlePath);
                })
                .then(function() {
                    job.progress(4, steps);
                    logger.debug('Building NPM Development Bundle');
                    if (project.npm) {
                        return Project.get(project.developmentBundle).then(function(db) {
                            return npm.install(db, project);
                        });
                    } else {
                        return Promise.resolve();
                    }
                })
                .then(function() {
                    job.progress(5, steps);
                    if (project.bower) {
                        logger.debug('Building Bower Development Bundle');
                        return Project.get(project.developmentBundle).then(function(db) {
                            return bower.install(db, project);
                        });
                    } else {
                        return Promise.resolve();
                    }
                })
                .then(function() {
                    job.progress(6, steps);
                    job.log('Running NPM Development Compression');
                    return installer.compressProject(project, project.bundlePath);
                })
                .then(function() {
                    job.log('Running Cleanup');
                    job.progress(7, steps);
                    return new Promise(function(resolve, reject) {
                        if (true && project.tempPath && project.tempPath.length > 0) {
                            rimraf(project.tempPath, function(er) {
                                if (er) {
                                    reject(er);
                                }
                                logger.debug('Directory Clean:', project.tempPath);
                                resolve();
                            });
                        } else {
                            resolve();
                        }
                    });
                })
                .then(function() {
                    done();
                }, function(err) {
                    rimraf(project.tempPath, function() {
                        logger.info(err);
                        done(err);
                    });
                });

        });

        jobs.on('job complete', function(id) {
            Job.get(id, function(err, job) {
                Stats.addCreateStat((parseInt(job.duration) / 1000));
                if (err) {
                    logger.error(err);
                    return;
                }
                job.remove(function(err) {
                    if (err) {
                        logger.error(err);
                        throw err;
                    }
                    logger.info('removed completed job #%d', job.id);
                });
            });
        });
    },
    compressProject: function(project, path, options) {
        options = options || {};
        return new Promise(function(resolve, reject) {
            logger.info('Compressing project:', project.name);
            var start = Date.now();

            mkdirp(path.substring(0, path.lastIndexOf('/')), function(err) {
                logger.debug('Compress Error: ', err ? err.toString() : null);
                var output = fs.createWriteStream(path);
                var archive = archiver('tar', {
                    gzip: true,
                    gzipOptions: {
                        level: 1
                    }
                });

                output.on('close', function() {
                    var end = Date.now();
                    logger.info('Bundle created:', path);
                    logger.info('Compression completed in ', (end - start) / 1000, 'seconds.', archive.pointer() + ' total bytes');
                    resolve();
                });

                archive.on('error', function(err) {
                    logger.info('Archiver error', err);
                    reject(err);
                });

                archive.pipe(output);
                archive.bulk([{
                    expand: true,
                    cwd: project.tempPath,
                    src: ['**'],
                    dot: true
                }]);
                archive.finalize();
            });
        });
    }
};
