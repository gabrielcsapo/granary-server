var basicAuth = require('basic-auth');

module.exports = function(log, conf) {

    var hasPassword = function() {
        return conf.get('password') !== '';
    };

    var checkPassword = function(password) {
        return !hasPassword() || password === conf.get('password');
    };

    var authMiddleware = function(req, res, next) {
        if(hasPassword()) {
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
        } else {
            next();
        }
    };

    return {
        checkPassword: checkPassword,
        middleware: authMiddleware,
        hasPassword: hasPassword
    };

};
