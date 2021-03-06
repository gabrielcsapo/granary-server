var Promise = require('bluebird');
var mongoose = require('mongoose');
var moment = require('moment');

var StatsSchema = mongoose.Schema({
    name: 'String',
    downloads_over_time: [],
    creates_over_time: []
});

var Stats = mongoose.model('Stats', StatsSchema);

module.exports = function() {
    var self;
    return self = {
        stats: function() {
            return ['downloads_over_time', 'creates_over_time'];
        },
        get: function() {
            return new Promise(function(resolve) {
                Stats.where({name: 'granary'}).findOne(function(err, granary) {
                    if(granary) {
                        resolve(granary);
                    } else {
                        granary = new Stats({name: 'granary'}).save(function() {
                            resolve(granary);
                        });
                    }
                });
            });
        },
        addDownloadStat: function(time) {
            return new Promise(function(resolve) {
                self.get().then(function(stats) {
                    stats.downloads_over_time.push([moment.utc().valueOf(), time]);
                    stats.save(function() {
                        resolve();
                    });
                });
            });
        },
        addCreateStat: function(time) {
            return new Promise(function(resolve) {
                self.get().then(function(stats) {
                    stats.creates_over_time.push([moment.utc().valueOf(), time]);
                    stats.save(function() {
                        resolve();
                    });
                });
            });
        }
    };
};
