var marked = require('marked');
var kue = require('kue');
var path = require('path');
var fs = require('fs');
var responseTime = require('response-time');
var bodyParser = require('body-parser');

module.exports = function(app, log, conf) {
    var Auth = require('../lib/auth')();
    var Project = require('../lib/project')(log, conf);
    var Stats = require('../lib/stats')(log);
    var Granary = require('../lib/granary')(log, conf);
    var UI = require('../lib/ui')();

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

    // TODO: need to have these routes protected by the basic auth route (right now they have their own password checking...)
    // TODO: refactor this out into routes/api.js
    app.post('/granary/check', Granary.check);
    app.post('/granary/download', Granary.download);
    app.post('/granary/stats', Granary.stats);
    app.post('/granary/track', Granary.track);

    // TODO: this should not be all pages
    app.use(Auth.middleware);

    // TODO: refactor this out into routes/ui.js
    app.get('/', UI.usage, function(req, res) {
        req.data.marked = marked;
        res.render('index', req.data);
    });

    app.get('/bundles', UI.usage, function(req, res) {
        res.render('bundles', req.data);
    });

    app.get('/queue', function(req, res) {
        res.render('queue');
    });

    // TODO: refactor this into routes/stats.js
    app.get('/stats', function(req, res) {
        res.render('stats');
    });

    app.get('/stats/downloads_over_time', function(req, res) {
        Stats.get().then(function(stats) {
            res.send(stats.downloads_over_time);
        });
    })

    // TODO: split the ui routes into another file
    app.get('/ui/:folder/:file', function(req, res) {
        var folder = req.params.folder;
        var file = req.params.file;
        fs.exists(path.join(conf.get('storage'), folder, file), function(exists) {
            if(exists) {
                Project.getStats(path.join(folder, file)).then(function(bundle) {
                    res.render('bundle', {bundle: bundle});
                });
            } else {
                res.render('error', {
                  message: 'Bundle does not exist',
                  error: {
                      status: 404
                  }
                });
            }
        });
    });
    app.get('/ui/download/:folder/:file', Auth.middleware, UI.download);
    app.get('/ui/delete/:folder/:file', Auth.logout, Auth.middleware, UI.delete);

    app.use('/kue', kue.app);

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
