GLOBAL._name = 'granary';

var express = require('express');
var bodyParser = require('body-parser');
var path = require('path');
var mkdirp = require('mkdirp');
var conf = require('./config/config')();
var log = require('./lib/log')(conf);
var kue = require('kue');

var app = express();
app.conf = conf;
app.log = log;

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use('/static', express.static(path.join(__dirname, 'views/static')));

app.use(bodyParser.json({
    limit: conf.get('limit') + 'kb'
}));
app.use(bodyParser.urlencoded({
    limit: conf.get('limit') + 'kb',
    extended: true
}));

mkdirp(conf.get('storage'), function (err) {});

require('./routes/index')(app, log, conf);

app.use('/granaries', kue.app);

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
