var Granary = require('../lib/granary')();

module.exports = function(app) {
    // TODO: need to have these routes protected by the basic auth route (right now they have their own password checking...)
    app.post('/granary/check', Granary.check);
    app.post('/granary/download', Granary.download);
    app.post('/granary/stats', Granary.stats);
}
