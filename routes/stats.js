var Stats = require('../lib/stats')();

module.exports = function(app) {
    app.get('/stats', function(req, res) {
        res.render('stats', {stats: Stats.stats()});
    });

    Stats.stats().forEach(function(stat) {
        app.get('/stats/' + stat, function(req, res) {
            Stats.get().then(function(stats) {
                var cols = [];
                cols[0] = ['x'];
                cols[1] = ['time'];
                stats[stat].forEach(function(s) {
                    cols[0].push(s[0]);
                    cols[1].push(s[1]);
                });
                res.send(cols);
            });
        });
    });

}
