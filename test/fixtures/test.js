var expect        = require('chai').expect;
var proxyquire    = require('proxyquire');
var ConnectorMock = require('../connector-mock');
var requestMock   = require('../request-mock');


var sessionUrl = '';

var saucelabsProviderStub = proxyquire('../../', {
    'saucelabs-connector': ConnectorMock,
    'request':             requestMock
});

var saucelabsProvider = createBrowserProvider(saucelabsProviderStub, {
    setUserAgentMetaInfo: function (id, info) {
        if (id === 'id-1')
            sessionUrl = info;
    }
});

describe('API Tests', function () {


    it('Should fetch platform configurations on init', function () {
        this.timeout(10000);

        return saucelabsProvider
            .init()
            .then(function () {
                expect(requestMock.urls).to.include.members([
                    'https://wiki-assets.saucelabs.com/data/selenium_.json',
                    'https://wiki-assets.saucelabs.com/data/appium_.json',
                    'https://wiki-assets.saucelabs.com/data/selendroid_.json',
                    'https://wiki-assets.saucelabs.com/data/selendroid_android_android-emulator.json',
                    'https://wiki-assets.saucelabs.com/data/appium_ios_iphone-simulator.json',
                    'https://wiki-assets.saucelabs.com/data/selenium_pc_windows-10.json',
                    'https://wiki-assets.saucelabs.com/data/selenium_mac_os-x-el-capitan.json'
                ]);
            });
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
                    'Android Emulator Tablet Appium@5.1',
                    'Android Emulator Phone@4.3',
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
            'Android Emulator Tablet@4.3',
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

    it('Should connect to saucelabs and start the browser on openBrowser', function () {
        return saucelabsProvider
            .openBrowser('id-1', 'iPhone Simulator@9.2', 'https://test.com')
            .then(function () {
                expect(ConnectorMock.connectCalled).to.be.true;
                expect(ConnectorMock.startBrowserCalled).to.be.true;

                expect(sessionUrl).to.be.equal('https://test-url.com');
            });
    });

    it('Should use webdriver to resize the window', function () {
        return saucelabsProvider
            .resizeWindow('id-1', {}, 123, 456)
            .then(function () {
                expect(ConnectorMock.webdriverMock.viewportSize).to.deep.equals({ width: 123, height: 456 });
            });
    });

    it('Should use webdriver to take a screenshot', function () {
        return saucelabsProvider
            .takeScreenshot('id-1', {}, 'test.png')
            .then(function () {
                expect(ConnectorMock.webdriverMock.screenshotPath).to.equals('test.png');
            });
    });

    it('Should stop browser on closeBrowser', function () {
        return saucelabsProvider
            .closeBrowser('id-1')
            .then(function () {
                expect(ConnectorMock.stopBrowserCalled).to.be.true;
            });
    });

    it('Should disconnect on dispose', function () {
        return saucelabsProvider
            .dispose()
            .then(function () {
                expect(ConnectorMock.disconnectCalled).to.be.true;
            });
    });
});
