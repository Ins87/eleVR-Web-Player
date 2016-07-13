var gulp = require('gulp');
var $ = require('gulp-load-plugins')();
var _ = require('lodash');


var depFiles = [
  'node_modules/gl-matrix/dist/gl-matrix-min.js',
];

var srcFiles = [
  'lib/util.js',
  'js/controls.js',
  'js/player-webgl.js',
  'js/webvr.js',
  'js/phonevr.js',
  'js/elevr-player.js',
];

gulp.task('watch', ['build'], function () {
  gulp.watch(srcFiles, ['build']);
});

gulp.task('build', function () {
  var files = _.union(
    depFiles,
    srcFiles
  );

  return gulp.src(files, {base: './'})
    .pipe($.concat('player.js'))
    .pipe(gulp.dest('dist'));
});
