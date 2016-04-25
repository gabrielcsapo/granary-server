var path = require('path');
var spawn = require('child_process').spawn;

var cli = '';

describe('granary-server', function() {

    process.GRANARY = 'node ' + path.resolve(require.resolve('granary'), '..', 'bin', 'granary')

    before(function(done) {
        this.timeout(50000);
        cli = spawn('npm', ['run', 'start']);
        cli.stdout.on('data', function(data) {
            var message = data.toString('utf8');
            console.log(message); // eslint-disable-line no-console
            if(message.indexOf('INFO freight-server: Granary Server is now running port 8872') > -1) {
                done();
            }
        });
        cli.stderr.on('data', function (data) {
            console.log('err data: ' + data); // eslint-disable-line no-console
            cli.kill();
        });
    })

    after(function() {
        cli.kill();
    });

    require('./client');

});

process.on('exit', function() {
    cli.kill();
});
