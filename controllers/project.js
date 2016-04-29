var crypto = require('crypto');
var path = require('path');
var fs = require('fs');

module.exports = function(app, log, conf) {
    var db = app.db;
    return {
        getDetails: function(project) {
            // TODO: Switch to something else or keep md5?
            project.hash = project.hash || crypto.createHash('md5').update(JSON.stringify(project)).digest('hex');
            // storage directory for projects
            project.storageDir = conf.get('storage');
            // path where tar.gz will be saved
            project.path = path.join(project.storageDir, project.name);
            project.bundlePath = path.join(project.path, 'development-' + project.hash + '.tar.gz');
            project.productionBundlePath = path.join(project.path, 'production-' + project.hash + '.tar.gz');
            project.downloadPath = path.join(project.name, 'development-' + project.hash + '.tar.gz');
            // temp storage directory where things install to
            project.tempPath = path.join(project.storageDir, project.hash);
            return project;
        },
        getHashStats: function(hash, callback) {
            db.get(hash+'-download', function(err, downloads) {
                db.get(hash+'-download-time', function(err, time) {
                    db.get(hash+'-bundle', function(err, bundle) {
                        callback({
                            downloads: downloads ? downloads : 0,
                            time: time,
                            bundle: bundle,
                            avg_time: time ? time / downloads : 0,
                        });
                    });
                });
            });
        },
        download: function(res, file, name, bundle) {
            fs.exists(file, function(exists) {
                if (exists) {
                    // TODO: refactor file name into something less absolute (hash?)
                    var _file = path.join(name, bundle);
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
        }
    }
}
