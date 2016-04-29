var fs = require('fs');
var path = require('path');

module.exports = function(app, log, conf) {
    var db = app.db;
    return {
        download: function(req, res) {
            if (req.params.file) {
                log.debug('UI Bundle Download request', req.params.file);
                var file = path.join(conf.get('storage'), req.params.folder, req.params.file);
                fs.exists(file, function(exists) {
                    if (exists) {
                        // TODO: refactor stats into project.download
                        // TODO: refactor file name into something less absolute
                        var _file = path.join(req.params.folder, req.params.file);
                        db.get(_file + '-download', function (err, value) {
                            if (err) {
                                db.put(_file + '-download', 1, function (err) {
                                    console.log(err);
                                    return res.sendFile(file);
                                });
                            } else {
                                var num = 1;
                                num += parseInt(value);
                                db.put(_file + '-download', num, function (err) {
                                    return res.sendFile(file);
                                });
                            }
                        });
                    } else {
                        return res.sendStatus(404);
                    }
                });
            } else {
                res.sendStatus(404);
            }
        },
        // TODO: make sure we clean up the stats when we delete a project or file
        delete: function(req, res) {
            if (req.params.file) {
                log.debug('UI Bundle Delete request', req.params.file);
                fs.unlink(
                    path.join(conf.get('storage'), req.params.folder, req.params.file),
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
