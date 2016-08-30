var gulp        = require('gulp');
var babel       = require('gulp-babel');
var mocha       = require('gulp-mocha');
var sequence    = require('gulp-sequence');
var del         = require('del');
var path        = require('path');
var nodeVersion = require('node-version');
var spawn       = require('./utils/spawn');


function gulpTestTask (taskName/*, ...args*/) {
    var internalTaskName = taskName + '-internal';
    var internalTaskArgs = [internalTaskName].concat(Array.prototype.slice.call(arguments, 1));

    gulp.task.apply(gulp, internalTaskArgs);

    gulp.task(taskName, function () {
        if (!process.env.SAUCE_USERNAME || !process.env.SAUCE_ACCESS_KEY)
            throw new Error('Set SAUCE_USERNAME and SAUCE_ACCESS_KEY before testing!');

        var packageParentDir  = path.join(__dirname, '../');
        var packageSearchPath = (process.env.NODE_PATH ? process.env.NODE_PATH + path.delimiter : '') + packageParentDir;
        var gulpCmd           = path.join(__dirname, 'node_modules/.bin/gulp');

        return spawn(gulpCmd, [internalTaskName], { NODE_PATH: packageSearchPath });
    });
}

gulp.task('clean', function () {
    return del(['lib', '.screenshots']);
});

gulp.task('lint', function () {
    // TODO: eslint supports node version 4 or higher.
    // Remove this condition once we get rid of node 0.10 support.
    if (nodeVersion.major === '0')
        return null;

    var eslint = require('gulp-eslint');

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

gulpTestTask('test-mocha', ['build'], function () {
    return gulp
        .src('test/mocha/**/*.js')
        .pipe(mocha({
            ui:       'bdd',
            reporter: 'spec',
            timeout:  typeof v8debug === 'undefined' ? 2000 : Infinity // NOTE: disable timeouts in debug
        }));
});

gulpTestTask('test-testcafe', ['build'], function () {
    var testCafeCmd = path.join(__dirname, 'node_modules/.bin/testcafe');

    return spawn(testCafeCmd, ['saucelabs:chrome', 'test/testcafe/**/*.js', '-s', '.screenshots']);
});

gulpTestTask('test', sequence('test-mocha-internal', 'test-testcafe-internal'));

