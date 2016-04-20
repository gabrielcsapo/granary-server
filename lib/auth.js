var basicAuth = require('basic-auth');

module.exports = function(log, conf) {

    var hasPassword = function() {
        return conf.get('password') !== '';
    };

    var checkPassword = function(password) {
        return !hasPassword() || password === conf.get('password');
    };

    var emptyMiddleware = function(req, res, next) {
        next();
    };

    /* ** Note: Password is your Freight Server password **. Username is blank */
    var authMiddleware = function(req, res, next) {
        function unauthorized(res) {
            res.set('WWW-Authenticate', 'Basic realm=Authorization Required');
            return res.sendStatus(401);
        }

        var user = basicAuth(req);
        if (checkPassword(user && user.pass || '')) {
            return next();
        } else {
            return unauthorized(res);
        }
    };

    return {
        checkPassword: checkPassword,
        middleware: (hasPassword() ? authMiddleware : emptyMiddleware)
    };

};
