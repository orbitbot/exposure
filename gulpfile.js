var gulp          = require('gulp');
var plugins       = require('gulp-load-plugins')();
var templatecache = require('gulp-angular-templatecache');
var karma         = require('karma').server;
var _             = require('lodash');
var browserSync   = require("browser-sync");
var at            = require('gulp-asset-transform');
var protractor    = require("gulp-protractor").protractor;

var paths = {
  css         : ['src/assets/css/*.css', 'src/app/**/*.css'],
  fonts       : 'src/assets/fonts/*.*',
  images      : 'src/assets/images/**',
  index       : 'src/index.html',
  integration : 'test/integration/*.js',
  js          : 'src/app/**/*.js',
  less        : ['src/assets/less/*.less', 'src/app/**/**/*.less'],
  templates   : 'src/app/components/**/*.html'
};

var config = {
  jshint : 'config/jshint.conf',
  karma  : require('./config/karma.conf')
};


gulp.task('copy-images', function() {
  return gulp.src(paths.images)
    .pipe(plugins.plumber())
    .pipe(plugins.imagemin({ optimizationLevel: 3, progressive: true, interlaced: true }))
    .pipe(plugins.size({ title: 'images', showFiles: true }))
    .pipe(gulp.dest('dist/images'));
});

gulp.task('copy-fonts', function() {
  return gulp.src(paths.fonts)
    .pipe(plugins.plumber())
    .pipe(plugins.size({ title: 'fonts' }))
    .pipe(gulp.dest('dist/fonts'));
});

gulp.task('at-build', function() {
  return gulp.src(paths.index)
    .pipe(plugins.plumber())
    .pipe(at({
      css: {
        tasks: ['concat',
                plugins.size({ title: 'css', showFiles: true })]
      },
      js: {
        tasks: ['concat',
                plugins.size({ title: 'js', showFiles: true })]
      },
      less: {
        tasks: [plugins.recess(),
                plugins.recess.reporter(),
                plugins.less(),
                'concat',
                plugins.size({ title: 'less', showFiles: true})]
      }
    }))
    .pipe(gulp.dest('develop/'))
    .pipe(browserSync.reload({ stream: true }));
});

gulp.task('templates', function () {
  return gulp.src(paths.templates)
    .pipe(plugins.plumber())
    .pipe(templatecache('templates.js', { standalone: true }))
    .pipe(plugins.size({ title: 'templates' }))
    .pipe(gulp.dest('develop/js'))
    .pipe(browserSync.reload({ stream: true }));
});

gulp.task('jshint', function() {
  gulp.src(paths.js)
    .pipe(plugins.jshint(config.jshint))
    .pipe(plugins.jshint.reporter('jshint-stylish'));
});


gulp.task('clean', function(done) {
  del(['develop/**'], done);
});


gulp.task('karma', function(done) {
  karma.start(_.assign({}, config.karma, { singleRun: true, colors: true }), done);
});

gulp.task('karma-ci', function(done) {
  karma.start(_.assign({}, config.karma, { singleRun: false, colors: true, autoWatch: true }), done);
});

gulp.task('integration', ['server'], function(done) {
// gulp.task('integration', function(done) {
  gulp.src(paths.integration)
    .pipe(protractor({
      configFile: "config/protractor.conf",
      args: ['--baseUrl', 'http://localhost:3000/#/']
    }))
    .on('error', function(e) { browserSync.exit(); throw e; })
    .on('end', function() { browserSync.exit(); done(); });
    // .on('error', function(e) { throw e; })
    // .on('end', function() { done(); });
});


gulp.task('server', function() {
  browserSync({
    server: {
      baseDir: 'develop'
    },
    logConnections: true,
    open: false
  });
});

gulp.task('watch', function() {
  gulp.watch([paths.index, paths.css, paths.less, paths.js], ['at-build']);
  gulp.watch([paths.images, paths.fonts], ['copy-assets']);
  gulp.watch([paths.templates], ['templates']);
  gulp.watch([paths.js], ['jshint']);
});

gulp.task('copy-assets', ['copy-images', 'copy-fonts']);
gulp.task('build', ['at-build', 'templates', 'copy-assets']);
gulp.task('develop', ['build', 'server', 'watch', 'karma-ci']);
