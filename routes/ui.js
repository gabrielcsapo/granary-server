var fs = require('fs');
var path = require('path');

module.exports = function (log, conf) {
    return {
        download: function (req, res) {
          var fileName = null;
          try {
            fileName = req.params[0];
          } catch (e) {
              res.status(500);
              res.sendStatus(e);
          }

          log.debug('UI Bundle Download request', fileName);

          if (!fileName) {
            return res.sendStatus(404);
          }

          fileName = fileName.replace(/\//g, '_');
          log.info(fileName);
          var filePath = path.join(conf.get('storage'), fileName);
          console.log(filePath);
          fs.exists(filePath, function (exists) {
            if (exists) {
              return res.sendFile(filePath);
            } else {
              return res.sendStatus(404);
            }
          });
      },
      delete: function (req, res) {
        if (req.params.file) {
          fs.unlink(
            path.join(conf.get('storage'), req.params.file),
            function (err) {
              if (err) {
                log.error(err);
              } else {
                log.info('Bundle Deleted:', req.params.file);
              }
              res.redirect('/');
            });
        } else {
          res.sendStatus(404);
        }
      }
    }
};
