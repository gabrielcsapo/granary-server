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
// TODO: bleh, this shouldn't be, maybe move highcharts and jquery to static directory? 
app.use('/static/highcharts', express.static(path.resolve(__dirname, 'node_modules', 'highcharts')));
app.use('/static/jquery', express.static(path.resolve(__dirname, 'node_modules', 'jquery')));

require('./routes/index')(app, log, conf);

module.exports = app;
