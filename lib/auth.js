var basicAuth = require('basic-auth');

// TODO: refactor out log and conf from needing to be passed in
module.exports = function(log, conf) {

    var hasPassword = function() {
        return conf.get('password') !== '';
    };

    var checkPassword = function(password) {
        return !hasPassword() || password === conf.get('password');
    };

    var unauthorized = function(res) {
        res.set('WWW-Authenticate', 'Basic realm=Authorization Required');
        return res.sendStatus(401);
    };

    var logout = function(req, res, next) {
        res.get('WWW-Authenticate');
        res.set('WWW-Authenticate', 'Basic realm=Authorization Required');
        next();
    };

    var authMiddleware = function(req, res, next) {
        if(hasPassword()) {
            var user = basicAuth(req);

            if (checkPassword(user && user.pass || '')) {
                return next();
            } else {
                return unauthorized(res);
            }
        } else {
            next();
        }
    };

    return {
        checkPassword: checkPassword,
        middleware: authMiddleware,
        hasPassword: hasPassword,
        logout: logout
    };

};
