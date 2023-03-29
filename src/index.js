import SauceLabsConnector from 'saucelabs-connector';
import parseCapabilities from 'desired-capabilities';
import Promise from 'pinkie';
import util from 'util';
import { assign } from 'lodash';
import * as fs from 'fs';
import { getRequest } from './promisified-get-request';

const AUTH_FAILED_ERROR = 'Authentication failed. Please assign the correct username and access key ' +
                          'to the SAUCE_USERNAME and SAUCE_ACCESS_KEY environment variables.';

const SAUCE_LABS_REQUESTED_MACHINES_COUNT      = 1;
const WAIT_FOR_FREE_MACHINES_REQUEST_INTERVAL  = 60000;
const WAIT_FOR_FREE_MACHINES_MAX_ATTEMPT_COUNT = 45;
const MAX_TUNNEL_CONNECT_RETRY_COUNT           = 3;

const readFile  = util.promisify(fs.readFile);

const isDesktop = platformInfo => platformInfo.platformGroup === 'Desktop';

async function readConfigFromFile (filename) {
    try {
        const data = await readFile(filename, 'utf8');

        return JSON.parse(data);
    }
    catch (err) {
        return {};
    }
}


async function fetchPlatforms () {
    if (!process.env['SAUCE_USERNAME'] || !process.env['SAUCE_ACCESS_KEY'])
        throw new Error(AUTH_FAILED_ERROR);

    const host = process.env.SAUCE_API_HOST || 'us-west-1.saucelabs.com';
    const response = await getRequest(`https://api.${host}/rest/v1.1/info/platforms/all`, process.env['SAUCE_USERNAME'], process.env['SAUCE_ACCESS_KEY']);

    try {
        return JSON.parse(response.body);
    }
    catch (e) {
        return null;
    }
}

function formatAutomationApiData (platform) {
    let platformGroup;

    switch (platform.api_name) {
        case 'android':
            platformGroup = 'Android';
            break;
        case 'iphone':
        case 'ipad':
            platformGroup = 'iOS';
            break;
        default:
            platformGroup = 'Desktop';
    }

    const formattedData = {
        automationBackend: platform.automation_backend,
        platformGroup:     platformGroup,
    };

    if (platformGroup === 'Desktop') {
        formattedData.os = platform.os;
        formattedData.browserName = platform.api_name;
        formattedData.browserVersion = platform.short_version;

        if (platform.os.startsWith('Windows'))
            formattedData.device = 'PC';
        else if (platform.os.startsWith('Mac'))
            formattedData.device = 'Mac';
    }
    // Filtering out the combo of webdriver + mobile. We would have duplicate entries otherwise.
    else if ((platformGroup === 'Android' || platformGroup === 'iOS') && platform.automation_backend === 'appium') {
        formattedData.os = platform.short_version;
        formattedData.device = platform.long_name;
    }
    else
        return null;

    return formattedData;
}

async function getAutomationApiInfo () {
    const platforms = await fetchPlatforms();

    return platforms
        .map(platform => formatAutomationApiData(platform))
        .filter(platform => platform);
}

function getCorrectedSize (currentClientAreaSize, currentWindowSize, requestedSize) {
    const horizontalChrome = currentWindowSize.width - currentClientAreaSize.width;
    const verticalChrome   = currentWindowSize.height - currentClientAreaSize.height;

    return {
        width:  requestedSize.width + horizontalChrome,
        height: requestedSize.height + verticalChrome
    };
}

function getAppiumBrowserName (platformInfo) {
    if (platformInfo.platformGroup === 'iOS')
        return 'safari';

    if (platformInfo.platformGroup === 'Android')
        return 'chrome';

    throw new Error(`unsupported platform group ${platformInfo.platformGroup}`);
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
                    const sauceConnectOptions = await this._generateSauceConnectOptions();

                    connector = new SauceLabsConnector(
                        process.env['SAUCE_USERNAME'],
                        process.env['SAUCE_ACCESS_KEY'],
                        sauceConnectOptions
                    );

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

    async _generateSauceConnectOptions () {
        const defaults = {
            connectorLogging: false
        };

        const overrides = process.env['SAUCE_CONNECT_OVERRIDES_PATH'] ? await readConfigFromFile(process.env['SAUCE_CONNECT_OVERRIDES_PATH']) : {};

        return Object.assign({},
            defaults,
            overrides
        );
    },

    async _fetchPlatformInfoAndAliases () {
        this.platformsInfo = await getAutomationApiInfo();

        const unstructuredBrowserNames = this.platformsInfo
            .map(platformInfo => this._createAliasesForPlatformInfo(platformInfo))
            .flat();

        this.availableBrowserNames = unstructuredBrowserNames.sort();
    },

    _createAliasesForPlatformInfo (platformInfo) {
        if (platformInfo.device === 'Android Emulator') {
            return [
                this._createAliasesForPlatformInfo(assign({}, platformInfo, { device: 'Android Emulator Tablet' })),
                this._createAliasesForPlatformInfo(assign({}, platformInfo, { device: 'Android Emulator Phone' }))
            ];
        }

        const name     = isDesktop(platformInfo) ? platformInfo.browserName : platformInfo.device;
        const version  = isDesktop(platformInfo) ? platformInfo.browserVersion : platformInfo.os;
        const platform = isDesktop(platformInfo) ? platformInfo['os'] : '';

        return `${name}@${version}${platform ? ':' + platform : ''}`;
    },

    _createQuery (capabilities) {
        const { browserName, browserVersion, platform } = parseCapabilities(capabilities)[0];

        const query = {
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
                const browserNameMatched = info.browserName && info.browserName.toLowerCase() === query.name;
                const deviceNameMatched  = info.device && info.device.toLowerCase() === query.name;

                const majorBrowserVersionMatch = info.browserVersion && info.browserVersion.match(/^\d+/);
                const majorBrowserVersion      = info.browserVersion && majorBrowserVersionMatch && majorBrowserVersionMatch[0];
                const browserVersionMatched    = info.browserVersion === query.version ||
                    majorBrowserVersion === query.version;

                const platformVersionMatched = info.os === query.version;
                const platformNameMatched    = info.os.toLowerCase() === query.platform;

                const isAnyVersion  = query.version === 'any';
                const isAnyPlatform = query.platform === 'any';

                const desktopBrowserMatched = browserNameMatched &&
                    (browserVersionMatched || isAnyVersion) &&
                    (platformNameMatched || isAnyPlatform);

                const mobileBrowserMatched = deviceNameMatched &&
                    (platformVersionMatched || isAnyVersion);

                return desktopBrowserMatched || mobileBrowserMatched;
            });
    },

    _generateMobileCapabilities (query, platformInfo) {
        // sanity check
        if (platformInfo.automationBackend !== 'appium')
            throw new Error('tried generating mobile capabilities for non appium backend');

        const capabilities = {
            deviceName:   platformInfo.device,
            browserName:  getAppiumBrowserName(platformInfo),
            platformName: platformInfo.platformGroup
        };

        if (query.version !== 'any')
            capabilities.platformVersion = query.version;

        if (query.deviceType)
            capabilities.deviceType = query.deviceType;

        return capabilities;
    },

    _generateDesktopCapabilities (query) {
        const capabilities = { browserName: query.name };

        if (query.version !== 'any')
            capabilities.version = query.version;

        if (query.platform !== 'any')
            capabilities.platform = query.platform;
        if (process.env['SAUCE_SCREEN_RESOLUTION'])
            capabilities.screenResolution = process.env['SAUCE_SCREEN_RESOLUTION'];
        return capabilities;
    },

    async _generateCapabilities (browserName) {
        const query        = this._createQuery(browserName);
        const platformInfo = this._filterPlatformInfo(query)[0];

        const capabilities = platformInfo.platformGroup === 'Desktop' ?
            this._generateDesktopCapabilities(query) :
            this._generateMobileCapabilities(query, platformInfo);

        let capabilitiesOverride = {};

        if (process.env['SAUCE_CAPABILITIES_OVERRIDES_PATH'])
            capabilitiesOverride = await readConfigFromFile(process.env['SAUCE_CAPABILITIES_OVERRIDES_PATH']);

        return Object.assign({},
            capabilities,
            capabilitiesOverride
        );
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

        const capabilities = await this._generateCapabilities(browserName);
        const connector    = await this._getConnector();

        await connector.waitForFreeMachines(
            SAUCE_LABS_REQUESTED_MACHINES_COUNT,
            WAIT_FOR_FREE_MACHINES_REQUEST_INTERVAL,
            WAIT_FOR_FREE_MACHINES_MAX_ATTEMPT_COUNT
        );

        const jobOptions = Object.assign(
            {
                jobName: process.env['SAUCE_JOB'],
                build:   process.env['SAUCE_BUILD']
            },
            process.env['SAUCE_CONFIG_PATH'] ? await readConfigFromFile(process.env['SAUCE_CONFIG_PATH']) : {}
        );

        const newBrowser = await connector.startBrowser(capabilities, pageUrl, jobOptions);

        this.openedBrowsers[id] = newBrowser;

        const sessionUrl = await connector.getSessionUrl(newBrowser);

        this.setUserAgentMetaInfo(id, `${sessionUrl}`);
    },

    async closeBrowser (id) {
        const connector = await this._getConnector();

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
        const currentWindowSize     = await this.openedBrowsers[id].getWindowSize();
        const currentClientAreaSize = { width: currentWidth, height: currentHeight };
        const requestedSize         = { width, height };
        const correctedSize         = getCorrectedSize(currentClientAreaSize, currentWindowSize, requestedSize);

        await this.openedBrowsers[id].setWindowSize(correctedSize.width, correctedSize.height);
    },

    async takeScreenshot (id, screenshotPath) {
        await this.openedBrowsers[id].saveScreenshot(screenshotPath);
    },

    async reportJobResult (id, jobResult, jobData) {
        if (jobResult !== this.JOB_RESULT.done && jobResult !== this.JOB_RESULT.errored)
            return;

        const browser   = this.openedBrowsers[id];
        const jobPassed = jobResult === this.JOB_RESULT.done && jobData.total === jobData.passed;

        await browser.sauceJobStatus(jobPassed);
    }
};
