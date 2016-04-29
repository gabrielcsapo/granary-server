module.exports = function(grunt) {
    grunt.loadNpmTasks('grunt-screenshot');
    grunt.initConfig({
      screenshot: {
        default_options: {
          options: {
            path: './doc',
            files: [{
                type: 'remote',
                src: 'http://localhost:8872',
                dest: 'doc.png',
                delay: 2000
            }],
            viewport: ['1920x1080']
          },
        }
      }
    });
}
