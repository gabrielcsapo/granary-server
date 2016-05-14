var responseTime = require('response-time');
var bodyParser = require('body-parser');

module.exports = function(app, log, conf) {
    var Project = require('../lib/project')();
    var Stats = require('../lib/stats')();

    app.use(bodyParser.json({
        limit: conf.get('limit') + 'kb'
    }));
    app.use(bodyParser.urlencoded({
        limit: conf.get('limit') + 'kb',
        extended: true
    }));

    app.use(responseTime(function(req, res, time) {
        var file;

        if(req.route) {
            if(req.route.path == '/ui/download/:folder/:file') {
                file = req.originalUrl.replace('/ui/download/', '');
                Stats.addDownloadStat(time).then(function(){
                    Project.get(file).then(function(project) {
                        project.download_time = project.download_time ? project.download_time + time : time;
                        project.save();
                    });
                });
            } else if(req.route.path == '/granary/download') {
                var project = Project.getDetails(req.body);
                file = project.bundlePath;
                if (req.body.options && req.body.options.production === 'true') {
                    file = project.productionBundlePath;
                }
                file = file.substring(file.indexOf(project.name), file.length);
                Stats.addDownloadStat(time).then(function(){
                    Project.get(file).then(function(project) {
                        project.download_time = project.download_time ? project.download_time + time : time;
                        project.save();
                    });
                });
            }
        }
    }));

    require('./granary')(app);
    require('./stats')(app);
    require('./ui')(app);

    app.use(function (req, res, next) {
      var err = new Error('Not Found');
      err.status = 404;
      next(err);
    });

    if (app.get('env') === 'development') {
      app.use(function (err, req, res) {
        res.status(err.status || 500);
        res.render('error', {
          message: err.message,
          error: err
        });
      });
    }

    app.use(function (err, req, res) {
      res.status(err.status || 500);
      res.render('error', {
        message: err.message,
        error: {}
      });
    });
};
