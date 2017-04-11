var expect            = require('chai').expect;
var Promise           = require('pinkie');
var saucelabsProvider = require('../../');


describe('Browser names', function () {
    before(function () {
        this.timeout(20000);

        return saucelabsProvider
            .init();
    });

    after(function () {
        return saucelabsProvider
            .dispose();
    });

    it('Should return list of common browsers and devices', function () {
        return saucelabsProvider
            .getBrowserList()
            .then(function (list) {
                expect(list).to.include.members([
                    'Chrome@51.0:OS X 10.9',
                    'Firefox@45.0:Linux',
                    'Safari@9.0:OS X 10.11',
                    'Internet Explorer@9.0:Windows 7',
                    'Internet Explorer@10.0:Windows 8',
                    'Internet Explorer@11.0:Windows 8.1',
                    'MicrosoftEdge@13.10586:Windows 10',
                    'iPhone 6 Device@9.3',
                    'Samsung Galaxy S7 Device@6.0',
                    'Android Emulator Phone@4.4',
                    'iPad Simulator@9.3',
                    'iPhone Simulator@9.2'
                ]);
            });
    });

    it('Should validate browser names', function () {
        var browserNames = [
            'Chrome',
            'Safari',
            'Opera:Linux',
            'Firefox',
            'MicrosoftEdge',
            'IE@9',
            'IE@10.0:Windows 8',
            'IE@11:Windows 10',
            'iPhone Simulator@9.2',
            'Android Emulator Tablet@4.4',
            'IE@5.0',
            'IE@11:Linux'
        ];

        var expectedResults = [
            true,
            true,
            true,
            true,
            true,
            true,
            true,
            true,
            true,
            true,
            false,
            false
        ];

        var validationPromises = browserNames
            .map(function (browserName) {
                return saucelabsProvider.isValidBrowserName(browserName);
            });

        return Promise
            .all(validationPromises)
            .then(function (results) {
                expect(results).to.deep.equals(expectedResults);
            });
    });
});
