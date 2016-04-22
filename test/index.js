var path = require('path');
var spawn = require('child_process').spawn;

var cli = '';

console.log(process.env.PATH);

describe('granary-server', function() {

    process.GRANARY = 'node ' + path.resolve(__dirname + '../../node_modules/granary/bin/granary');

    before(function(done) {
        this.timeout(50000);
        cli = spawn('npm', ['run', 'start']);
        cli.stdout.on('data', function(data) {
            var message = data.toString('utf8');
            console.log(message);
            if(message.indexOf('INFO freight-server: Granary Server is now running port 8872') > -1) {
                done();
            }
        });
        cli.stderr.on('data', function (data) {
            console.log('err data: ' + data);
            cli.kill();
        });
    })

    after(function() {
        cli.kill();
    });

    // require('./basic/basic');
    // require('./create/create');
    // require('./bower/error_bower');
    require('./extract/extract');
    require('./track/track');
    require('./error/error');
});

process.on('exit', function() {
    cli.kill();
});
