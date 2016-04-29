module.exports = function(app, log, conf) {
    var marked = require('marked');
    var Auth = require('../lib/auth')(log, conf);
    var Granary = require('../controllers/granary')(app, log, conf);
    var UI = require('../controllers/ui')(app, log, conf);

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

    app.use(Auth.middleware);
};
