var gulp          = require('gulp');
var $             = require('gulp-load-plugins')();
var templatecache = require('gulp-angular-templatecache');
var karma         = require('karma');
var _             = require('lodash');
var browserSync   = require('browser-sync');
var at            = require('gulp-asset-transform');
var protractor    = require('gulp-protractor').protractor;
var del           = require('del');

var paths = {
  css         : ['src/assets/css/*.css', 'src/app/**/*.css'],
  fonts       : 'src/assets/fonts/*.*',
  images      : 'src/assets/images/**',
  index       : 'src/index.html',
  integration : 'test/integration/*.js',
  js          : 'src/app/**/*.js',
  less        : ['src/assets/less/*.less', 'src/app/components/**/*.less'],
  templates   : 'src/app/components/**/*.html'
};

var config = {
  jshint : 'config/jshint.conf',
  karma  : require('./config/karma.conf')
};
var release;

function dest(suffix) {
  return gulp.dest(release ? 'release/' + suffix : 'develop/' + suffix);
}

gulp.task('copy-images', function() {
  return gulp.src(paths.images)
    .pipe($.plumber())
    .pipe($.imagemin({ optimizationLevel: 3, progressive: true, interlaced: true }))
    .pipe($.size({ title: 'images', showFiles: true }))
    .pipe(dest('images'));
});

gulp.task('copy-fonts', function() {
  return gulp.src(paths.fonts)
    .pipe($.plumber())
    .pipe($.size({ title: 'fonts' }))
    .pipe(dest('fonts'));
});

gulp.task('at-build', function() {
  return gulp.src(paths.index)
    .pipe($.plumber())
    .pipe(at({
      css: {
        stream: function(filestream, outputfilename) {
          return filestream
            .pipe($.if(!release, $.sourcemaps.init()))
            .pipe($.concat(outputfilename))
            .pipe($.if(!release, $.sourcemaps.write()))
            .pipe($.if(release, $.minifyCss()))
            .pipe($.size({ title: 'css', showFiles: true }));
          }
      },
      js: {
        stream: function(filestream, outputfilename) {
          return filestream
            .pipe($.concat(outputfilename))
            .pipe($.if(release, $.uglify()))
            .pipe($.size({ title: 'js', showFiles: true }));
        }
      },
      less: {
        stream: function(filestream, outputfilename) {
          return filestream
            .pipe($.if(!release, $.sourcemaps.init()))
            .pipe($.less())
            .pipe($.concat(outputfilename))
            .pipe($.if(!release, $.sourcemaps.write()))
            .pipe($.if(release, $.minifyCss()))
            .pipe($.size({ title: 'less', showFiles: true }));
        }
      }
    }))
    .pipe(dest(''))
    .pipe(browserSync.reload({ stream: true }));
});

gulp.task('templates', function () {
  return gulp.src(paths.templates)
    .pipe($.plumber())
    .pipe(templatecache('templates.js', { standalone: true }))
    .pipe($.if(release, $.uglify()))
    .pipe($.size({ title: 'templates' }))
    .pipe(dest('js'))
    .pipe(browserSync.reload({ stream: true }));
});

gulp.task('jshint', function() {
  gulp.src(paths.js)
    .pipe($.jshint(config.jshint))
    .pipe($.jshint.reporter('jshint-stylish'));
});

gulp.task('less-lint', function() {
  gulp.src(paths.less)
    .pipe($.plumber())
    .pipe($.recess())
    .pipe($.recess.reporter());
});


gulp.task('clean', function(done) {
  del(['develop/**'], done);
});


gulp.task('karma', function(done) {
  var server = new karma.Server(_.assign({}, config.karma, { singleRun: true, colors: true }), done);
  server.start();
});

gulp.task('karma-ci', function(done) {
  var server = new karma.Server(_.assign({}, config.karma, { singleRun: false, colors: true, autoWatch: true }), done);
  server.start();
});

gulp.task('integration', ['server'], function(done) {
  gulp.src(paths.integration)
    .pipe(protractor({
      configFile: 'config/protractor.conf',
      args: ['--baseUrl', 'http://localhost:3000/#/']
    }))
    .on('error', function(e) { browserSync.exit(); throw e; })
    .on('end', function() { browserSync.exit(); done(); });
});


gulp.task('server', function() {
  browserSync({
    server: {
      baseDir: release ? 'release/' : 'develop/'
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
  gulp.watch([paths.less], ['less-lint']);
});

gulp.task('copy-assets', ['copy-images', 'copy-fonts']);
gulp.task('build', ['at-build', 'templates', 'copy-assets']);
gulp.task('develop', ['build', 'server', 'watch', 'karma-ci']);


gulp.task('setRelease', function(done) { release = true; done(); });
gulp.task('testRelease', ['setRelease', 'integration']);

gulp.task('release', ['setRelease', 'build']);
