var gulp   = require('gulp');
var eslint = require('gulp-eslint');
var babel  = require('gulp-babel');
var mocha  = require('gulp-mocha');
var del    = require('del');
var path   = require('path');
var spawn  = require('./utils/spawn');


var packageParentDir  = path.join(__dirname, '../');
var packageSearchPath = (process.env.NODE_PATH ? process.env.NODE_PATH + path.delimiter : '') + packageParentDir;


gulp.task('clean', function () {
    return del(['lib', '.screenshots']);
});

gulp.task('lint', function () {
    return gulp
        .src([
            'src/**/*.js',
            'test/**/*.js',
            'Gulpfile.js'
        ])
        .pipe(eslint())
        .pipe(eslint.format())
        .pipe(eslint.failAfterError());
});

gulp.task('build', ['clean', 'lint'], function () {
    return gulp
        .src('src/**/*.js')
        .pipe(babel())
        .pipe(gulp.dest('lib'));
});

gulp.task('test-mocha-internal', ['build'], function () {
    return gulp
        .src('test/mocha/**/*.js')
        .pipe(mocha({
            ui:       'bdd',
            reporter: 'spec',
            timeout:  typeof v8debug === 'undefined' ? 2000 : Infinity // NOTE: disable timeouts in debug
        }));
});

gulp.task('test-mocha', function () {
    return spawn('gulp', ['test-mocha-internal'], { NODE_PATH: packageSearchPath });
});

gulp.task('test-testcafe-internal', ['build'], function () {
    var testCafeCmd = path.join(__dirname, 'node_modules/.bin/testcafe');

    return spawn(testCafeCmd, ['saucelabs:chrome', 'test/testcafe/**/*.js', '-s', '.screenshots']);
});

gulp.task('test-testcafe', function () {
    return spawn('gulp', ['test-testcafe-internal'], { NODE_PATH: packageSearchPath });
});

if (process.env['GULP_TRAVIS_TASK'])
    gulp.task('travis', [process.env['GULP_TRAVIS_TASK']]);

