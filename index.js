var express = require('express');
var path = require('path');
var conf = require('./config/config').conf;
var log = require('./config/config').logger;
var app = express();

app.conf = conf;
app.log = log;

app.set('views', path.resolve(__dirname, 'views'));
app.set('view engine', 'pug');
app.use('/static', express.static(path.resolve(__dirname, 'views/static')));
app.use('/static/c3', express.static(path.resolve(__dirname, 'node_modules', 'c3')));
app.use('/static/font-awesome', express.static(path.resolve(__dirname, 'node_modules', 'font-awesome')));
app.use('/static/d3', express.static(path.resolve(__dirname, 'node_modules', 'd3')));

require('./routes/index')(app, log, conf);

module.exports = app;
