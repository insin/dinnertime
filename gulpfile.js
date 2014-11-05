var beep = require('beepbeep')
var browserify = require('browserify')
var del = require('del')
var gulp = require('gulp')
var gutil = require('gulp-util')
var source = require('vinyl-source-stream')
var jshint = require('gulp-jshint')
var plumber = require('gulp-plumber')
var react = require('gulp-react')
var rename = require('gulp-rename')
var streamify = require('gulp-streamify')
var template = require('gulp-template')
var uglify = require('gulp-uglify')

var pkg = require('./package.json')
var production = gutil.env.production

var jsSrcFiles = './src/**/*.js'
var jsxSrcFiles = jsSrcFiles + 'x'
var jsBuildFiles = './build/modules/**/*.js'
var jsExt = (production ? 'min.js' : 'js')

process.env.NODE_ENV = (production ? 'production' : 'development')
process.env.VERSION = pkg.version

/** Delete everything from /build/modules */
gulp.task('clean-modules', function(cb) {
  del('./build/modules/**', cb)
})

/** Copy non-jsx JavaScript to /build/modules */
gulp.task('copy-js', ['clean-modules'], function() {
  return gulp.src(jsSrcFiles)
    .pipe(gulp.dest('./build/modules'))
})

gulp.task('transpile-jsx', ['clean-modules'], function() {
  return gulp.src(jsxSrcFiles)
    .pipe(plumber())
    .pipe(react())
    .pipe(gulp.dest('./build/modules'))
})

/** Lint everything in /build/modules */
gulp.task('lint', ['copy-js', 'transpile-jsx'], function() {
  return gulp.src(jsBuildFiles)
    .pipe(jshint('./.jshintrc'))
    .pipe(jshint.reporter('jshint-stylish'))
})

var broken = false
var needsFixed = false

/** Bundle app.js */
gulp.task('build-app', ['lint'], function() {
  var b = browserify('./build/modules/app.js', {
    debug: !production
  , detectGlobals: false
  })
  b.external('react/addons')
  b.external('react')
  b.external('newforms')
  b.transform('envify')

  var stream = b.bundle()
    .on('error', function(err) {
      gutil.log(err.message)
      beep(2, 0)
      broken = true
      this.emit('end')
    })
    .on('end', function() {
      if (broken) {
        needsFixed = true
      }
      else if (needsFixed) {
        beep()
        needsFixed = false
      }
      broken = false
    })
    .pipe(source('app.js'))
    .pipe(gulp.dest('./build'))

  if (production) {
    stream = stream
      .pipe(rename('app.min.js'))
      .pipe(streamify(uglify()))
      .pipe(gulp.dest('./build'))
  }

  return stream
})

/** Build app.js and copy it to /dist */
gulp.task('copy-app', ['build-app'], function() {
  return gulp.src('./build/app.' + jsExt)
    .pipe(gulp.dest('./dist'))
})

/** Build an external bundle containing all dependencies of app.js */
gulp.task('build-deps', function() {
  var b = browserify({detectGlobals: false})
  b.require('react/addons')
  b.require('react/addons', {expose: 'react'})
  b.require('newforms')
  b.transform('envify')

  return b.bundle()
    .pipe(source('deps.js'))
    .pipe(gulp.dest('./build'))
    .pipe(rename('deps.min.js'))
    .pipe(streamify(uglify()))
    .pipe(gulp.dest('./build'))
})

/** Delete everything from /dist */
gulp.task('clean-dist', function(cb) {
  del('./dist/**', cb)
})

/** Regenerate /dist from scratch */
gulp.task('dist-copy', ['clean-dist', 'build-app', 'build-deps'], function() {
  return gulp.src(['./build/app.' + jsExt, './build/deps.' + jsExt, './public/**'])
    .pipe(gulp.dest('./dist'))
})

/** Regenerate /dist from scratch and template index.html */
gulp.task('dist', ['dist-copy'], function() {
  return gulp.src('./templates/index.html')
    .pipe(template({
      jsExt: jsExt
    }))
    .pipe(gulp.dest('./dist'))
})

/** Copy CSS to /dist */
gulp.task('dist-css', function() {
  return gulp.src('./public/*.css')
    .pipe(gulp.dest('./dist'))
})

gulp.task('watch', ['copy-app'], function() {
  gulp.watch([jsSrcFiles, jsxSrcFiles], ['copy-app'])
  gulp.watch('./public/*.css', ['dist-css'])
})

gulp.task('default', ['watch'])
