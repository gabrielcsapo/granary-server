var fs = require('fs');
var rimraf = require('rimraf');
var archiver = require('archiver');
var Promise = require('bluebird');
var mkdirp = require('mkdirp');
var Job = require('kue').Job;

// TODO: refactor this out into jobs/installer
// TODO: refactor the need to pass log to this, require it from the log file
module.exports = function (log) {

  var bower = require('./installers/bower')(log);
  var npm = require('./installers/npm')(log);

  // TODO: This is a job/installer, rename it
  // TODO: refactor this into not being a singleton
  function JobProcessor() {}

  JobProcessor.setup = function (jobs) {

      var Project = require('./project')(log);

    // TODO: one job at a time, npm can explode? (might need to investigate sandboxing job processing)
    // TODO: can Bower and NPM install the same time? (could be done if the process was threaded, might have an issue with concurrency)
    // TODO: refactor this mess...
    jobs.process('install', 1, function (job, done) {
      var steps = 7;
      var project = job.data.project;
      log.debug('Project Data:', project);
      log.debug('Creating Production Bundle');
      job.progress(0, steps);
      return Promise.resolve()
        .then(function () {
          job.progress(1, steps);
          if (project.npm) {
            job.log('Running NPM Install Production');
            return Project.get(project.productionBundle).then(function(db) {
                return npm.install(db, project, { production: true });
            });
          } else {
            return Promise.resolve();
          }
        })
        .then(function () {
          job.progress(2, steps);
          if (project.bower) {
            job.log('Running Bower Install Production');
            return Project.get(project.productionBundle).then(function(db) {
                return bower.install(db, project, { production: true });
            });
          } else {
            return Promise.resolve();
          }
        })
        .then(function () {
          job.progress(3, steps);
          job.log('Running NPM Production Compression');
          return compressProject(project, project.productionBundlePath);
        })
        .then(function () {
          job.progress(4, steps);
          log.debug('Building NPM Development Bundle');
          if (project.npm) {
              return Project.get(project.developmentBundle).then(function(db) {
                  return npm.install(db, project);
              });
          } else {
            return Promise.resolve();
          }
        })
        .then(function () {
          job.progress(5, steps);
          if (project.bower) {
            log.debug('Building Bower Development Bundle');
            return Project.get(project.developmentBundle).then(function(db) {
                return bower.install(db, project);
            });
          } else {
            return Promise.resolve();
          }
        })
        .then(function () {
          job.progress(6, steps);
          job.log('Running NPM Development Compression');
          return compressProject(project, project.bundlePath);
        })
        .then(function () {
          job.log('Running Cleanup');
          job.progress(7, steps);
          return cleanUp(project);
        })
        .then(function () {
          done();
        }, function (err) {
          rimraf(project.tempPath, function() {
              log.info(err);
              done(err);
          });
        });

    });

    jobs.on('job complete', function (id) {
      Job.get(id, function (err, job) {
        if (err) {
          log.error(err);
          return;
        }
        job.remove(function (err) {
          if (err) {
            log.error(err);
            throw err;
          }
          log.info('removed completed job #%d', job.id);
        });
      });
    });
  };

  function compressProject(project, path, options) {
    options = options || {};
    return new Promise(function (resolve, reject) {
      log.info('Compressing project:', project.name);
      var start = Date.now();

      mkdirp(path.substring(0, path.lastIndexOf('/')), function (err) {
          log.debug('Compress Error: ', err ? err.toString() : null);
          var output = fs.createWriteStream(path);
          var archive = archiver('tar', {
            gzip: true,
            gzipOptions: {
              level: 1
            }
          });

          output.on('close', function () {
            var end = Date.now();
            log.info('Bundle created:', path);
            log.info('Compression completed in ', (end - start) / 1000, 'seconds.', archive.pointer() + ' total bytes');
            resolve();
          });

          archive.on('error', function (err) {
            log.info('Archiver error', err);
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

  // TODO: no reason to create another function, remove reuse
  function cleanUp(project) {
    return new Promise(function (resolve, reject) {
      if (true && project.tempPath && project.tempPath.length > 0) {
        rimraf(project.tempPath, function (er) {
            if (er) {
                reject(er);
            }
            log.debug('Directory Clean:', project.tempPath);
            resolve();
        });
      } else {
        resolve();
      }
    });
  }

  return JobProcessor;
};
