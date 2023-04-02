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
                var commonBrowsers = [
                    'chrome@100:Mac 13',
                    'safari@16:Mac 13',
                    'MicrosoftEdge@110:Windows 11',
                    'Samsung Galaxy S10 WQHD GoogleAPI Emulator@11.0',
                    'Android GoogleAPI Emulator@12.0',
                    'iPad Simulator@13.0',
                    'iPhone Simulator@13.0',
                ];

                var areBrowsersInList = commonBrowsers
                    .map(function (browser) {
                        return list.indexOf(browser) > -1;
                    });

                expect(areBrowsersInList).eql(Array(commonBrowsers.length).fill(true));
            });
    });

    it('Should validate browser names', function () {
        var browserNames = [
            'Chrome',
            'Safari',
            'Opera:Linux',
            'Firefox',
            'MicrosoftEdge',
            'Internet Explorer@9',
            'Internet Explorer@10:Windows 2008',
            'Internet Explorer@11:Windows 10',
            'iPhone Simulator@9.2',
            'Android Emulator Tablet@8.0',
            'Internet Explorer@5.0',
            'Internet Explorer@11:Linux',
        ];

        var expectedResults = [
            true,
            true,
            false,
            true,
            true,
            true,
            true,
            true,
            false,
            true,
            false,
            false,
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
