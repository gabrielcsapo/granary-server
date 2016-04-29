var crypto = require('crypto');
var path = require('path');

module.exports = function(log, conf) {
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
        }
    }
}
