var assignIn            = require('lodash').assignIn;
var Promise             = require('pinkie');

var defaultPluginHelper = {
    runInitScript: function () {
        return new Promise(function (resolve) {
            resolve();
        });
    },

    waitForConnectionReady: function () {
        return new Promise(function (resolve) {
            resolve();
        });
    },

    reportWarning: function () {
        return;
    },

    setUserAgentMetaInfo: function () {
        return;
    }
};

function createBrowserProvider (browserProviderStub, pluginHelper) {
    return assignIn({}, defaultPluginHelper, pluginHelper, browserProviderStub);
}

global.createBrowserProvider = createBrowserProvider;

after(function () {
    delete global.createBrowserProvider;
});
