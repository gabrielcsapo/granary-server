var path = require('path');
var fs = require('fs');

module.exports = function(grunt) {
    grunt.loadNpmTasks('grunt-screenshot');
    grunt.loadNpmTasks('grunt-contrib-pug');
    grunt.initConfig({
        screenshot: {
            granary: {
                options: {
                    path: './screenshot',
                    files: [{
                        type: 'remote',
                        src: 'http://localhost:8872',
                        dest: 'main.png',
                        delay: 500
                    }, {
                        type: 'remote',
                        src: 'http://localhost:8872/bundles',
                        dest: 'bundles.png',
                        delay: 500
                    },{
                        type: 'remote',
                        src: 'http://localhost:8872/ui/granary-sample/development-3bf358bbb935b94ab33536f2ae805e99.tar.gz',
                        dest: 'bundle.png',
                        delay: 500
                    },{
                        type: 'remote',
                        src: 'http://localhost:8872/ui/nope/nope',
                        dest: 'bundle-error.png',
                        delay: 500
                    }],
                    viewport: ['1920x1080','1024x768','640x960', '320x480']
                }
            }
        },
        pug: {
            compile: {
                options: {
                    data: {
                        presentation: true,
                        marked: require('marked'),
                        src: fs.readFileSync(path.join(__dirname, 'views/static/img/logo.png')).toString('base64')
                    }
                },
                files: {
                    'index.html': ['views/index.pug']
                }
            }
        }
    });
    grunt.registerTask('build', ['screenshot', 'pug']);
    grunt.registerTask('default', ['build']);
}
