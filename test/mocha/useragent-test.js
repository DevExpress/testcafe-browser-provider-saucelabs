var expect  = require('chai').expect;
var createTestCafe = require('testcafe');

describe('Useragent info', function () {
    this.timeout(2 * 60 * 1000);

    var testcafe = null;

    before(function () {
        return createTestCafe()
            .then(function (tc) {
                testcafe = tc;
            });
    });

    after(function () {
        return testcafe.close();
    });

    it('Should add a link to Saucelabs', function () {
        var report = '';
        var runner = testcafe.createRunner();

        return runner
            .browsers('saucelabs:chrome')
            .src('test/testcafe/resize-test.js')
            .reporter('json', {
                write: function (data) {
                    report += data;
                },
                end: function (data) {
                    report += data;
                }
            })
            .run()
            .then(function (failedCount) {
                expect(failedCount).to.be.equal(0);

                var reportData = JSON.parse(report);

                expect(reportData.userAgents[0]).to.contain('https://app.saucelabs.com/tests');
            });
    });
});
