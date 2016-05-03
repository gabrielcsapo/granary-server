var marked = require('marked');
var kue = require('kue');
var responseTime = require('response-time');

module.exports = function(app, log, conf) {
    var Auth = require('../lib/auth')(log, conf);
    var Project = require('../controllers/project')(app, log, conf);
    var Granary = require('../controllers/granary')(app, log, conf);
    var UI = require('../controllers/ui')(app, log, conf);

    app.use(Auth.middleware);

    app.use(responseTime(function(req, res, time) {
        var file;
        if(req.route) {
            if(req.route.path == '/ui/download/:folder/:file') {
                file = req.originalUrl.replace('/ui/download/', '');
                app.db.get(file+'-download-time', function(err, value) {
                    if (err) {
                        app.db.put(file+'-download-time', time, function(err) {
                            if (err) { log.error(err.toString()); }
                            return;
                        });
                    } else {
                        value = parseInt(value);
                        value += time;
                        app.db.put(file+'-download-time', value, function(err) {
                            if (err) { log.error(err.toString()); }
                            return;
                        });
                    }
                });
            } else if(req.route.path == '/granary/download') {
                var project = Project.getDetails(req.body);
                file = project.bundlePath;
                if (req.body.options && req.body.options.production === 'true') {
                    file = project.productionBundlePath;
                }
                file = file.substring(file.indexOf(project.name), file.length);
                app.db.get(file+'-download-time', function(err, value) {
                    if (err) {
                        app.db.put(file+'-download-time', time, function(err) {
                            if (err) { log.error(err.toString()); }
                            return;
                        });
                    } else {
                        value = parseInt(value);
                        value += time;
                        app.db.put(file+'-download-time', value, function(err) {
                            if (err) { log.error(err.toString()); }
                            return;
                        });
                    }
                });
            }
        }
    }));

    app.get('/', UI.usage, function(req, res) {
        req.data.marked = marked;
        res.render('index', req.data);
    });

    app.get('/bundles', UI.usage, function(req, res) {
        res.render('bundles', req.data);
    });

    app.get('/ui/download/:folder/:file', Auth.middleware, UI.download);
    // TODO: temporary, quick way to add delete
    app.get('/ui/delete/:folder/:file', Auth.middleware, UI.delete);

    app.post('/granary/check', Granary.check);
    app.post('/granary/download', Granary.download);
    app.post('/granary/track', Granary.track);

    app.use('/granaries', kue.app);
};
