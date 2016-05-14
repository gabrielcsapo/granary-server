var marked = require('marked');
var kue = require('kue');
var responseTime = require('response-time');
var bodyParser = require('body-parser');

module.exports = function(app, log, conf) {
    var Auth = require('../lib/auth')(log, conf);
    var Project = require('../controllers/project')(log, conf);
    var Granary = require('../controllers/granary')(log, conf);
    var UI = require('../controllers/ui')(log, conf);

    app.use(bodyParser.json({
        limit: conf.get('limit') + 'kb'
    }));
    app.use(bodyParser.urlencoded({
        limit: conf.get('limit') + 'kb',
        extended: true
    }));


    // TODO: need to have these routes protected by the basic auth route (right now they have their own password checking...)
    app.post('/granary/check', Granary.check);
    app.post('/granary/download', Granary.download);
    app.post('/granary/track', Granary.track);

    app.use(responseTime(function(req, res, time) {
        var file;
        if(req.route) {
            if(req.route.path == '/ui/download/:folder/:file') {
                file = req.originalUrl.replace('/ui/download/', '');
                Project.get(file).then(function(project) {
                    project.download_time = project.download_time ? project.download_time + time : time;
                    project.save(function(err) {
                        console.log(err);
                    });
                });
            } else if(req.route.path == '/granary/download') {
                var project = Project.getDetails(req.body);
                file = project.bundlePath;
                if (req.body.options && req.body.options.production === 'true') {
                    file = project.productionBundlePath;
                }
                file = file.substring(file.indexOf(project.name), file.length);
                Project.get(file).then(function(project) {
                    project.download_time = project.download_time ? project.download_time + time : time;
                    project.save(function(err) {
                        console.log(err);
                    });
                });
            }
        }
    }));

    app.use(Auth.middleware);

    app.get('/', UI.usage, function(req, res) {
        req.data.marked = marked;
        res.render('index', req.data);
    });

    app.get('/bundles', UI.usage, function(req, res) {
        res.render('bundles', req.data);
    });

    app.get('/ui/download/:folder/:file', Auth.middleware, UI.download);
    // TODO: temporary, quick way to add delete
    app.get('/ui/delete/:folder/:file', Auth.logout, Auth.middleware, UI.delete);

    app.use('/granaries', kue.app);

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
