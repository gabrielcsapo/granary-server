GLOBAL._name = 'granary';

var express = require('express');
var path = require('path');
var mkdirp = require('mkdirp');
var conf = require('./config/config')();
var log = require('./lib/log')(conf);
var levelup = require('levelup');

mkdirp(conf.get('storage'), function (err) {
    if (err) { log.error(err.toString()); }
});

var app = express();
app.db = levelup('./db');
app.conf = conf;
app.log = log;

app.set('views', path.resolve(__dirname, 'views'));
app.set('view engine', 'jade');
app.use('/static', express.static(path.resolve(__dirname, 'views/static')));

require('./routes/index')(app, log, conf);

module.exports = app;
