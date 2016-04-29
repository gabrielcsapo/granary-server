module.exports = function(app, log, conf) {
    var Auth = require('../lib/auth')(log, conf);
    var Granary = require('../controllers/granary')(app, log, conf);
    var UI = require('../controllers/ui')(app, log, conf);

    app.get('/', UI.usage, function(req, res) {
        res.render('index', req.data);
    });

    app.get('/ui/download/:folder/:file', Auth.middleware, UI.download);
    // TODO: temporary, quick way to add delete
    app.get('/ui/delete/:folder/:file', Auth.middleware, UI.delete);

    app.post('/granary/check', Granary.check);
    app.post('/granary/download', Granary.download);
    app.post('/granary/track', Granary.track);

    app.use(Auth.middleware);
};
