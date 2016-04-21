GLOBAL._name = 'granary';

var express = require('express');
var bodyParser = require('body-parser');
var path = require('path');
var conf = require('./config/config')();
var log = require('./lib/log')(conf);
var kue = require('kue');

// TODO: move this? this is needed for the server to be able to track bundles
process.env.FREIGHT_PASSWORD = conf.get('password');

var index = require('./routes/index')(log, conf);
var bundleDelete = require('./routes/bundle_delete')(log, conf);
var bundleDownload = require('./routes/bundle_download')(log, conf);
var granaryRoutes = require('./routes/granary')(log, conf);
var granaryAuth = require('./lib/auth')(log, conf);

var app = express();
app.conf = conf;
app.log = log;

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(bodyParser.json({
    limit: conf.get('limit') + 'kb'
}));
app.use(bodyParser.urlencoded({
    limit: conf.get('limit') + 'kb',
    extended: true
}));

app.post('/granary/check', granaryRoutes.check);
app.post('/granary/download', granaryRoutes.download);
app.post('/granary/track', granaryRoutes.track);

app.use('/static', express.static(path.join(__dirname, 'views/static')));
app.get('/storage/*', granaryAuth.middleware, bundleDownload);
app.get('/', granaryAuth.middleware, index);
// TODO: temporary, quick way to add delete
app.get('/ui/delete/:file', granaryAuth.middleware, bundleDelete);
app.use(granaryAuth.middleware);
app.use('/granarys', kue.app);

/// catch 404 and forward to error handler
app.use(function (req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

if (app.get('env') === 'development') {
  app.use(function (err, req, res) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

app.use(function (err, req, res) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});

module.exports = app;
