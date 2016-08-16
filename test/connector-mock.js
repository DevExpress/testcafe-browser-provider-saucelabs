var Promise = require('pinkie');


var webdriverMock = {
    viewportSize:   {},
    screenshotPath: '',

    setWindowSize: function (width, height, cb) {
        webdriverMock.viewportSize.width  = width;
        webdriverMock.viewportSize.height = height;

        cb();
    },

    saveScreenshot: function (path, cb) {
        webdriverMock.screenshotPath  = path;

        cb();
    }
};

function ConnectorMock () {
    ConnectorMock.connectCalled      = false;
    ConnectorMock.startBrowserCalled = false;
    ConnectorMock.stopBrowserCalled  = false;
    ConnectorMock.disconnectCalled   = false;

    ConnectorMock.webdriverMock = webdriverMock;
}


ConnectorMock.prototype.connect = function () {
    return new Promise(function (resolve) {
        ConnectorMock.connectCalled = true;

        resolve();
    });
};

ConnectorMock.prototype.waitForFreeMachines = function () {
    return new Promise(function (resolve) {
        resolve();
    });
};

ConnectorMock.prototype.getSessionUrl = function () {
    return new Promise(function (resolve) {
        resolve('https://test-url.com');
    });
};

ConnectorMock.prototype.startBrowser = function () {
    return new Promise(function (resolve) {
        ConnectorMock.startBrowserCalled = true;

        resolve(webdriverMock);
    });
};

ConnectorMock.prototype.stopBrowser = function () {
    return new Promise(function (resolve) {
        ConnectorMock.stopBrowserCalled = true;

        resolve(webdriverMock);
    });
};

ConnectorMock.prototype.disconnect = function () {
    return new Promise(function (resolve) {
        ConnectorMock.disconnectCalled = true;

        resolve();
    });
};

module.exports = ConnectorMock;

