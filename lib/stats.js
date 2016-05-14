var Promise = require('bluebird');
var mongoose = require('mongoose');
var moment = require('moment');

var StatsSchema = mongoose.Schema({
    name: 'String',
    downloads_over_time: []
});

var Stats = mongoose.model('Stats', StatsSchema);

module.exports = function(log) {
    var self;
    return self = {
        get: function() {
            return new Promise(function(resolve) {
                Stats.where({name: 'granary'}).findOne(function(err, granary) {
                    if(granary) {
                        resolve(granary);
                    } else {
                        granary = new Stats({name: 'granary'}).save(function(err) {
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
                    stats.save(function(err) {
                        resolve();
                    });
                });
            });
        }
    };
};
