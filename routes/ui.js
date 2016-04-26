var fs = require('fs');
var path = require('path');

module.exports = function(log, conf) {
    return {
        download: function(req, res) {
            if (req.params.file) {
                log.debug('UI Bundle Download request', req.params.file);
                var file = path.join(conf.get('storage'), req.params.file);
                fs.exists(file, function(exists) {
                    if (exists) {
                        return res.sendFile(file);
                    } else {
                        return res.sendStatus(404);
                    }
                });
            } else {
                res.sendStatus(404);
            }
        },
        delete: function(req, res) {
            if (req.params.file) {
                log.debug('UI Bundle Delete request', req.params.file);
                fs.unlink(
                    path.join(conf.get('storage'), req.params.file),
                    function(err) {
                        if (err) {
                            log.error(err);
                        } else {
                            log.info('UI Bundle Deleted:', req.params.file);
                        }
                        res.redirect('/');
                    }
                );
            } else {
                res.sendStatus(404);
            }
        }
    }
};
