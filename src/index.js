import SauceLabsConnector from 'saucelabs-connector';
import parseCapabilities from 'desired-capabilities';
import requestAPI from 'request';
import Promise from 'pinkie';
import pify from 'pify';
import { flatten, find, assign } from 'lodash';
import * as fs from 'fs';

const AUTH_FAILED_ERROR = 'Authentication failed. Please assign the correct username and access key ' +
                          'to the SAUCE_USERNAME and SAUCE_ACCESS_KEY environment variables.';

const SAUCE_LABS_REQUESTED_MACHINES_COUNT      = 1;
const WAIT_FOR_FREE_MACHINES_REQUEST_INTERVAL  = 60000;
const WAIT_FOR_FREE_MACHINES_MAX_ATTEMPT_COUNT = 45;
const MAX_TUNNEL_CONNECT_RETRY_COUNT           = 3;

const AUTOMATION_APIS = ['selenium', 'appium', 'selendroid'];

const MAC_OS_MAP = {
    'masOS Mojave': 'macOS 10.14',
    'macOS High Sierra': 'macOS 10.13',
    'macOS Sierra': 'macOS 10.12',
    'OS X El Capitan': 'OS X 10.11',
    'OS X Yosemite': 'OS X 10.10'
};

const promisify = fn => pify(fn, Promise);
const request   = promisify(requestAPI, Promise);

const formatAssetPart    = (str, filler) => str.toLowerCase().replace(/[\s.]/g, filler);
const getAssetNameEnding = (part1, part2) => part1 && part2 ? formatAssetPart(part1, '_') + '_' + formatAssetPart(part2, '-') : '';
const getAssetName       = (automationApi, ...args) => `${automationApi}_${getAssetNameEnding(...args)}`;
const getAssetUrl        = (...args) => `https://wiki-assets.saucelabs.com/data/${getAssetName(...args)}.json`;

const isSelenium   = platformInfo => platformInfo.automationApi === 'selenium';
const isAppium     = platformInfo => platformInfo.automationApi === 'appium';
const isSelendroid = platformInfo => platformInfo.automationApi === 'selendroid';

async function fetchAsset (assetNameParts) {
    var url      = getAssetUrl(...assetNameParts);
    var response = await request(url);

    try {
        return JSON.parse(response.body);
    }
    catch (e) {
        return null;
    }
}

function unfoldTreeNode (node, level = Infinity) {
    if (!node)
        return [];

    var unfoldedChildren = node.list && level > 0 ?
        flatten(node.list.map(child => unfoldTreeNode(child, level - 1))) :
        [node.list ? node.list : []];

    return unfoldedChildren.map(child =>[node.name].concat(child));
}

async function getAssetData (assetNameParts, unfoldingLevel = Infinity) {
    var assetDataTree = await fetchAsset(assetNameParts);

    if (!assetDataTree)
        return [];

    return unfoldTreeNode(assetDataTree, unfoldingLevel);
}

async function getDeviceData (automationApi, automationApiData) {
    var assetNamePart1 = automationApi === 'selenium' ? automationApiData[2] : automationApiData[1];
    var assetNamePart2 = automationApi === 'selenium' ? automationApiData[4] : automationApiData[2];

    return await getAssetData([automationApi, assetNamePart1, assetNamePart2], 2);
}

function concatDeviceData (automationApiData, devicesData) {
    return devicesData.map(data => automationApiData.concat(data));
}

function formatAutomationApiData (automationApi, automationApiData) {
    var formattedData = {
        automationApi: automationApi,
        platformGroup: automationApiData[1],
        device:        automationApiData[2]
    };

    if (isSelenium(formattedData)) {
        formattedData.os             = automationApiData[4];
        formattedData.browserName    = automationApiData[6];
        formattedData.browserVersion = automationApiData[7];

        if (formattedData.browserName === 'MS Edge')
            formattedData.browserName = 'MicrosoftEdge';
        else if (formattedData.browserName === 'IE')
            formattedData.browserName = 'Internet Explorer';

        if (MAC_OS_MAP[formattedData.os])
            formattedData.os = MAC_OS_MAP[formattedData.os];
    }
    else {
        formattedData.os            = automationApiData[5];
        formattedData.api           = find(automationApiData, item => item && item.api).api;
        formattedData.platformGroup = formattedData.platformGroup.replace(/^(.+?)(\s.*)?$/, '$1');

        var isAndroid             = formattedData.platformGroup === 'Android';
        var isAndroidJellyBean    = isAndroid && parseFloat(formattedData.os) >= 4.4;
        var isAndroidOnSelendroid = isAndroid && isSelendroid(formattedData);
        var isAndroidOnAppium     = isAndroid && isAppium(formattedData);
        var isUnsupportedAndroid  = isAndroid && (isAndroidJellyBean ? isAndroidOnSelendroid : isAndroidOnAppium);

        if (isUnsupportedAndroid)
            return null;
    }

    return formattedData;
}

async function getAutomationApiInfo (automationApi) {
    var automationApiData = await getAssetData([automationApi]);

    var devicesData = await Promise.all(automationApiData.map(data => getDeviceData(automationApi, data)));

    automationApiData = automationApiData
        .map((data, index) => concatDeviceData(data, devicesData[index]))
        .filter(data => data.length);

    automationApiData = flatten(automationApiData);

    return automationApiData
        .map(data => formatAutomationApiData(automationApi, data))
        .filter(data => data);
}

function getCorrectedSize (currentClientAreaSize, currentWindowSize, requestedSize) {
    var horizontalChrome = currentWindowSize.width - currentClientAreaSize.width;
    var verticalChrome   = currentWindowSize.height - currentClientAreaSize.height;

    return {
        width:  requestedSize.width + horizontalChrome,
        height: requestedSize.height + verticalChrome
    };
}

function getAppiumBrowserName (platformInfo) {
    if (platformInfo.platformGroup === 'iOS')
        return 'Safari';

    if (platformInfo.device.indexOf('Samsung') > -1)
        return 'chrome';

    return 'Browser';
}

function getAdditionalConfig (filename) {
    return new Promise((resolve, reject) => {
        fs.readFile(filename, 'utf8', (err, data) =>
            err ? reject(err) : resolve(JSON.parse(data))
        );
    });
}

export default {
    connectorPromise: Promise.resolve(null),
    openedBrowsers:   {},
    aliasesCache:     [],
    platformsInfo:    [],
    availableAliases: [],

    tunnelConnectRetryCount: 0,

    isMultiBrowser: true,

    _getConnector () {
        this.connectorPromise = this.connectorPromise
            .then(async connector => {
                if (!connector) {
                    connector = new SauceLabsConnector(process.env['SAUCE_USERNAME'], process.env['SAUCE_ACCESS_KEY'], {
                        connectorLogging: false
                    });

                    await connector.connect();
                }

                this.tunnelConnectRetryCount = 0;
                return connector;
            })
            .catch(error => {
                this.tunnelConnectRetryCount++;

                if (this.tunnelConnectRetryCount > MAX_TUNNEL_CONNECT_RETRY_COUNT)
                    throw error;

                this.connectorPromise = Promise.resolve(null);

                return this._getConnector();
            });

        return this.connectorPromise;
    },

    _disposeConnector () {
        this.connectorPromise = this.connectorPromise
            .then(async connector => {
                if (connector)
                    await connector.disconnect();

                return null;
            });

        return this.connectorPromise;
    },

    async _fetchPlatformInfoAndAliases () {
        var automationApiInfoPromises = AUTOMATION_APIS.map(automationApi => getAutomationApiInfo(automationApi));
        var platformsInfo             = await Promise.all(automationApiInfoPromises);

        this.platformsInfo = flatten(platformsInfo);

        var unstructuredBrowserNames = this.platformsInfo
            .map(platformInfo => this._createAliasesForPlatformInfo(platformInfo));

        this.availableBrowserNames = flatten(unstructuredBrowserNames);
    },

    _createAliasesForPlatformInfo (platformInfo) {
        if (platformInfo.device === 'Android Emulator') {
            return [
                this._createAliasesForPlatformInfo(assign({}, platformInfo, { device: 'Android Emulator Tablet' })),
                this._createAliasesForPlatformInfo(assign({}, platformInfo, { device: 'Android Emulator Phone' }))
            ];
        }

        var name     = isSelenium(platformInfo) ? platformInfo.browserName : platformInfo.device;
        var version  = isSelenium(platformInfo) ? platformInfo.browserVersion : platformInfo.os;
        var platform = isSelenium(platformInfo) ? platformInfo['os'] : '';

        return `${name}@${version}${platform ? ':' + platform : ''}`;
    },

    _createQuery (capabilities) {
        var { browserName, browserVersion, platform } = parseCapabilities(capabilities)[0];

        var query = {
            name:     browserName.toLowerCase(),
            version:  browserVersion.toLowerCase(),
            platform: platform.toLowerCase()
        };

        if (/^android emulator/.test(query.name)) {
            query.deviceType = query.name.replace('android emulator ', '');
            query.name       = 'android emulator';
        }

        return query;
    },

    _filterPlatformInfo (query) {
        return this.platformsInfo
            .filter(info => {
                var browserNameMatched = info.browserName && info.browserName.toLowerCase() === query.name;
                var deviceNameMatched  = info.device && info.device.toLowerCase() === query.name;

                var majorBrowserVersionMatch = info.browserVersion && info.browserVersion.match(/^\d+/);
                var majorBrowserVersion      = info.browserVersion && majorBrowserVersionMatch && majorBrowserVersionMatch[0];
                var browserVersionMatched    = info.browserVersion === query.version ||
                    majorBrowserVersion === query.version;

                var platformVersionMatched = info.os === query.version;
                var platformNameMatched    = info.os.toLowerCase() === query.platform;

                var isAnyVersion  = query.version === 'any';
                var isAnyPlatform = query.platform === 'any';

                var desktopBrowserMatched = browserNameMatched &&
                    (browserVersionMatched || isAnyVersion) &&
                    (platformNameMatched || isAnyPlatform);

                var mobileBrowserMatched = deviceNameMatched &&
                    (platformVersionMatched || isAnyVersion);

                return desktopBrowserMatched || mobileBrowserMatched;
            });
    },

    _generateMobileCapabilities (query, platformInfo) {
        var capabilities = { deviceName: platformInfo.device };

        if (platformInfo.automationApi === 'appium') {
            capabilities.browserName  = getAppiumBrowserName(platformInfo);
            capabilities.platformName = platformInfo.platformGroup;

            if (query.version !== 'any')
                capabilities.platformVersion = query.version;
        }
        else {
            capabilities.browserName  = platformInfo.platformGroup;
            capabilities.platform     = platformInfo.api;

            if (query.version !== 'any')
                capabilities.version = query.version;
        }

        if (query.deviceType)
            capabilities.deviceType = query.deviceType;

        return capabilities;
    },

    _generateDesktopCapabilities (query) {
        var capabilities = { browserName: query.name };

        if (query.version !== 'any')
            capabilities.version = query.version;

        if (query.platform !== 'any')
            capabilities.platform = query.platform;

        return capabilities;
    },

    _generateCapabilities (browserName) {
        var query        = this._createQuery(browserName);
        var platformInfo = this._filterPlatformInfo(query)[0];

        return platformInfo.platformGroup === 'Desktop' ?
            this._generateDesktopCapabilities(query) :
            this._generateMobileCapabilities(query, platformInfo);
    },


    // API
    async init () {
        await this._fetchPlatformInfoAndAliases();
    },

    async dispose () {
        await this._disposeConnector();
    },

    async openBrowser (id, pageUrl, browserName) {
        if (!process.env['SAUCE_USERNAME'] || !process.env['SAUCE_ACCESS_KEY'])
            throw new Error(AUTH_FAILED_ERROR);

        var capabilities = this._generateCapabilities(browserName);
        var connector    = await this._getConnector();

        await connector.waitForFreeMachines(
            SAUCE_LABS_REQUESTED_MACHINES_COUNT,
            WAIT_FOR_FREE_MACHINES_REQUEST_INTERVAL,
            WAIT_FOR_FREE_MACHINES_MAX_ATTEMPT_COUNT
        );

        var jobOptions = Object.assign(
            {
                jobName: process.env['SAUCE_JOB'],
                build:   process.env['SAUCE_BUILD']
            },
            process.env['SAUCE_CONFIG_PATH'] ? await getAdditionalConfig(process.env['SAUCE_CONFIG_PATH']) : {}
        );

        var newBrowser = await connector.startBrowser(capabilities, pageUrl, jobOptions);

        this.openedBrowsers[id] = newBrowser;

        var sessionUrl = await connector.getSessionUrl(newBrowser);

        this.setUserAgentMetaInfo(id, `${sessionUrl}`);
    },

    async closeBrowser (id) {
        var connector = await this._getConnector();

        await connector.stopBrowser(this.openedBrowsers[id]);

        delete this.openedBrowsers[id];
    },

    async isValidBrowserName (browserName) {
        return parseCapabilities(browserName).length === 1 && !!this._filterPlatformInfo(this._createQuery(browserName)).length;
    },

    async getBrowserList () {
        return this.availableBrowserNames;
    },

    async resizeWindow (id, width, height, currentWidth, currentHeight) {
        var currentWindowSize     = await this.openedBrowsers[id].getWindowSize();
        var currentClientAreaSize = { width: currentWidth, height: currentHeight };
        var requestedSize         = { width, height };
        var correctedSize         = getCorrectedSize(currentClientAreaSize, currentWindowSize, requestedSize);

        await this.openedBrowsers[id].setWindowSize(correctedSize.width, correctedSize.height);
    },

    async takeScreenshot (id, screenshotPath) {
        await this.openedBrowsers[id].saveScreenshot(screenshotPath);
    },

    async reportJobResult (id, jobResult, jobData) {
        if (jobResult !== this.JOB_RESULT.done && jobResult !== this.JOB_RESULT.errored)
            return;

        var browser   = this.openedBrowsers[id];
        var jobPassed = jobResult === this.JOB_RESULT.done && jobData.total === jobData.passed;

        await browser.sauceJobStatus(jobPassed);
    }
};
