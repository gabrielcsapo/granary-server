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
        download: function(res, file, folder_location, file_location) {
            fs.exists(file, function(exists) {
                if (exists) {
                    // TODO: refactor stats into project.download
                    // TODO: refactor file name into something less absolute
                    var _file = path.join(folder_location, file_location);
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
