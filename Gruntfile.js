var path = require('path');
var fs = require('fs');

module.exports = function(grunt) {
    grunt.loadNpmTasks('grunt-screenshot');
    grunt.loadNpmTasks('grunt-contrib-pug');
    grunt.initConfig({
        screenshot: {
            default_options: {
                options: {
                    path: './doc',
                    files: [{
                        type: 'remote',
                        src: 'http://localhost:8872',
                        dest: 'main.png',
                        delay: 2000
                    }, {
                        type: 'remote',
                        src: 'http://localhost:8872/bundles',
                        dest: 'bundle.png',
                        delay: 2000
                    }],
                    viewport: ['1920x1080']
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
                    'index.html': ['views/index.jade']
                }
            }
        }
    });
    grunt.registerTask('build', ['screenshot', 'pug']);
}
