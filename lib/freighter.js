var mkdirp = require('mkdirp');

module.exports = function (log, conf, jobs) {

  function Freighter() {}

  Freighter.create = function (project, extra) {

    //TODO: refactor
    mkdirp(project.tempPath, function (err) {
      if (err) {
        log.error(err);
      }

      var install = jobs.create('install', { project: project, hash: project.hash, title: project.name })
        .priority(extra.priority)
        .searchKeys(['title', 'hash'])
        .save();

      install.on('promotion', function () {
        log.debug('Kue Job Promoted');
      });

      install.on('complete', function () {
        log.debug('Kue Job Promoted');
      });

      return project;
    });
  };

  return Freighter;
};
