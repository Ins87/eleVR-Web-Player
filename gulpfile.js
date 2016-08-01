let gulp = require('gulp');
let $ = require('gulp-load-plugins')();
let _ = require('lodash');
let es = require('event-stream');


let depFiles = [
  'node_modules/gl-matrix/dist/gl-matrix-min.js',
];

let srcFiles = [
  'shaders/**/*.js',
  'lib/util.js',
  'js/phonevr.js',
  'js/player-controls.js',
  'js/player-webgl.js',
  'js/webvr.js',
  'js/elevr-player.js',
];

gulp.task('connect', function () {
  $.connect.server({
    root: './',
    livereload: true,
  });
});

gulp.task('watch', ['connect', 'build'], function () {
  gulp.watch(srcFiles, ['build']); // Todo $.connect.reload
});

gulp.task('build', function () {
  let depStream = gulp.src(depFiles, {base: './'});
  let srcStream = gulp.src(srcFiles).pipe($.babel({
    presets: ['es2015'],
  }));

  return es.merge(depStream, srcStream)
    .pipe($.sourcemaps.init())
    .pipe($.concat('player.min.js'))
    .pipe($.uglify())
    .pipe($.sourcemaps.write('.'))
    .pipe(gulp.dest('dist'));
});
