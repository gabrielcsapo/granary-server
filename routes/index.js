module.exports = function(app, log, conf) {
    var Auth = require('../lib/auth')(log, conf);
    var Granary = require('./granary')(log, conf);
    var UI = require('./ui')(log, conf);

    app.get('/', Granary.usage, function(req, res) {
        res.render('index', req.data);
    });

    app.get('/ui/download/:file', Auth.middleware, UI.download);
    // TODO: temporary, quick way to add delete
    app.get('/ui/delete/:file', Auth.middleware, UI.delete);

    app.post('/granary/check', Granary.check);
    app.post('/granary/download', Granary.download);
    app.post('/granary/track', Granary.track);
};
