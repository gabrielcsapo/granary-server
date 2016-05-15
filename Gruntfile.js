var path = require('path');
var fs = require('fs');

module.exports = function(grunt) {
    grunt.loadNpmTasks('grunt-screenshot');

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
                        src: 'http://localhost:8872/queue',
                        dest: 'queue.png',
                        delay: 500
                    },{
                        type: 'remote',
                        src: 'http://localhost:8872/ui/granary-sample/production-3bf358bbb935b94ab33536f2ae805e99.tar.gz',
                        dest: 'bundle.png',
                        delay: 500
                    },{
                        type: 'remote',
                        src: 'http://localhost:8872/ui/nope/nope',
                        dest: 'bundle-error.png',
                        delay: 500
                    },{
                        type: 'remote',
                        src: 'http://localhost:8872/stats',
                        dest: 'stats.png',
                        delay: 1000
                    }],
                    viewport: ['1920x1080','1024x768','640x960', '320x480']
                }
            }
        }
    });
    
    grunt.registerTask('build', ['screenshot']);
    grunt.registerTask('default', ['build']);
}
