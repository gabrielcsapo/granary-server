var fs = require('fs');
var path = require('path');
var kue = require('kue');
var marked = require('marked');
var UI = require('../lib/ui')();
var Auth = require('../lib/auth')();
var Project = require('../lib/project')();

var conf = require('../config/config').conf;

module.exports = function(app) {
    app.use(Auth.middleware);

    app.get('/', UI.usage, function(req, res) {
        req.data.marked = marked;
        req.data.url = req.protocol + '://' + req.headers.host;
        res.render('index', req.data);
    });

    app.get('/bundles', UI.usage, function(req, res) {
        res.render('bundles', req.data);
    });

    app.get('/queue', function(req, res) {
        res.render('queue');
    });

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
}
