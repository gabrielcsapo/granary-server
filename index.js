var express = require('express');
var path = require('path');
var mkdirp = require('mkdirp');
var conf = require('./config/config')();
var log = require('./lib/log')(conf);
var app = express();

// TODO: no, remove globals
app.conf = conf;
app.log = log;

app.set('views', path.resolve(__dirname, 'views'));
app.set('view engine', 'pug');
app.use('/static', express.static(path.resolve(__dirname, 'views/static')));
app.use('/static/highcharts', express.static(path.resolve(__dirname, 'node_modules', 'highcharts')));
app.use('/static/jquery', express.static(path.resolve(__dirname, 'node_modules', 'jquery')));

// TODO: refactor this out into config
mkdirp(conf.get('storage'), function (err) {
    if (err) { log.error(err.toString()); }
});

require('./routes/index')(app, log, conf);

module.exports = app;
