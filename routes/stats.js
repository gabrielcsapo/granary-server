var Stats = require('../lib/stats')();

module.exports = function(app) {
    app.get('/stats', function(req, res) {
        res.render('stats');
    });

    app.get('/stats/downloads_over_time', function(req, res) {
        Stats.get().then(function(stats) {
            res.send(stats.downloads_over_time);
        });
    })
    // TODO: add route for create requests
}
