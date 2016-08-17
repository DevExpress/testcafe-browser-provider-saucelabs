var expect         = require('chai').expect;
var path           = require('path');
var pify           = require('pify');
var Promise        = require('pinkie');
var nodeExec       = require('child_process').exec;
var temp           = require('temp').track();
var readdirSync    = require('fs').readdirSync;
var createTestCafe = require('testcafe');

var exec = pify(nodeExec, Promise);


var SAUCE_USERNAME   = 'testcafe-saucelabs';
var SAUCE_ACCESS_KEY = 'e31c3a48-90db-4f03-b2c4-05d40603ee12';

describe('API', function () {
    this.timeout(2 * 60 * 1000);

    var cwd                = '';
    var tempDirPath        = '';
    var screenshotsDirPath = '';
    var testcafe           = null;

    function runTests (test) {
        var report = '';
        var runner = testcafe.createRunner();

        return runner
            .browsers('saucelabs:chrome')
            .reporter('json', {
                write: function (data) {
                    report += data;
                },

                end: function (data) {
                    report += data;
                }
            })
            .src(path.join(__dirname, 'data/testcafe-fixtures', test))
            .screenshots(screenshotsDirPath)
            .run()
            .then(function (failedCount) {
                var results = JSON.parse(report);

                if (failedCount)
                    throw new Error(results.fixtures[0].tests[0].errs.join('\n'));

                return results;
            });
    }

    before(function () {
        process.env['SAUCE_USERNAME']   = SAUCE_USERNAME;
        process.env['SAUCE_ACCESS_KEY'] = SAUCE_ACCESS_KEY;

        cwd                = process.cwd();
        tempDirPath        = temp.mkdirSync();
        screenshotsDirPath = temp.mkdirSync();

        process.chdir(tempDirPath);

        //eslint-disable no-path-concat
        return exec('npm install ' + path.join(__dirname, '../'))
            .then(function () {
                return createTestCafe();
            })
            .then(function (tc) {
                testcafe = tc;
            });
    });

    after(function () {
        process.chdir(cwd);

        return testcafe.close();
    });

    it('Should add link to Saucelabs in useragent', function () {
        return runTests('simple-test.js')
            .then(function (report) {
                expect(report.userAgents[0]).to.contain('https://saucelabs.com/tests');
            });
    });

    it('Should resize a window', function () {
        return runTests('resize-test.js');
    });

    it('Should take a screenshot', function () {
        return runTests('screenshot-test.js')
            .then(function (report) {
                var screenshotPath = report.fixtures[0].tests[0].screenshotPath;

                if (!screenshotPath)
                    throw new Error('Screenshot path must be set!');

                var useragentDir = readdirSync(screenshotPath)[0];

                if (!useragentDir)
                    throw new Error('No useragent folder created!');

                var screenshotFiles = readdirSync(path.join(screenshotPath, useragentDir))
                    .filter(function (filename) {
                        return /\.png$/.test(filename);
                    });

                expect(screenshotFiles).to.have.length.above(0);
            });
    });
});
