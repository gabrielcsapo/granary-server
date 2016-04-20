var fs = require('fs');
var path = require('path');

module.exports = function (log, conf) {

  return function (req, res) {
    var fileName = null;
    try {
      fileName = req.route.params[0];
    } catch (e) {
        res.status(500);
        res.send(e);
    }

    log.debug('UI Bundle Download request', fileName);

    if (! fileName) {
      return res.send(404);
    }

    fileName = fileName.replace(/\//g, '_');
    var filePath = path.join(conf.get('storage'), fileName);

    fs.exists(filePath, function (exists) {
      if (exists) {
        return res.sendFile(filePath);
      } else {
        return res.send(404);
      }
    });
  };
};
