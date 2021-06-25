const expect   = require('chai').expect;
const sandbox  = require('sinon').createSandbox();
const provider = require('../../');

describe('Internal generateCapabilities test', function () {
    const desktopUA = 'Chrome@88.0:macOS 11.00';

    before(function () {
        this.timeout(20000);
        return provider.init();
    });

    afterEach(function () {
        sandbox.restore();
    });

    after(function () {
        return provider.dispose();
    });

    it('should generate basic desktop capabilities', async function () {
        const testCases = [
            {
                desktopUA,
                expected: {
                    browserName: 'chrome',
                    version:     '88.0',
                    platform:    'macos 11.00'
                }
            },
            {
                desktopUA: 'Chrome@88.0:macOS 10.15',
                expected:  {
                    browserName: 'chrome',
                    version:     '88.0',
                    platform:    'macos 10.15'
                }
            },
            {
                desktopUA: 'Chrome@88.0:macOS 10.14',
                expected:  {
                    browserName: 'chrome',
                    version:     '88.0',
                    platform:    'macos 10.14'
                }
            },
            {
                desktopUA: 'Chrome@88.0:macOS 10.13',
                expected:  {
                    browserName: 'chrome',
                    version:     '88.0',
                    platform:    'macos 10.13'
                }
            },
            {
                desktopUA: 'Chrome@88.0:macOS 10.12',
                expected:  {
                    browserName: 'chrome',
                    version:     '88.0',
                    platform:    'macos 10.12'
                }
            },
            {
                desktopUA: 'Chrome@88.0:OS X 10.11',
                expected:  {
                    browserName: 'chrome',
                    version:     '88.0',
                    platform:    'os x 10.11'
                }
            },
            {
                desktopUA: 'Chrome@87.0:OS X 10.10',
                expected:  {
                    browserName: 'chrome',
                    version:     '87.0',
                    platform:    'os x 10.10'
                }
            }
        ];

        const promises = testCases.map(async testCase => {
            const result = await provider._generateCapabilities(testCase.desktopUA);

            expect(result).eql(testCase.expected);
        });

        return await Promise.all(promises);
    });

    it('should set the screen resolution from SAUCE_SCREEN_RESOLUTION', async function () {
        sandbox.stub(process, 'env').value({ 'SAUCE_SCREEN_RESOLUTION': '1920x1200' });

        const result = await provider._generateCapabilities(desktopUA);

        expect(result).eql({
            browserName:      'chrome',
            version:          '88.0',
            platform:         'macos 11.00',
            screenResolution: '1920x1200'
        });
    });

    it('should provide capabilities overrides from file', async function () {
        sandbox.stub(process, 'env').value({ 'SAUCE_CAPABILITIES_OVERRIDES_PATH': 'test/mocha/data/capabilities_overrides.json' });

        const result = await provider._generateCapabilities(desktopUA);

        expect(result).eql({
            browserName:       'chrome',
            version:           '88.0',
            platform:          'macos 11.00',
            extendedDebugging: true
        });
    });

    it('should not override anything if overrides file does not exist', async function () {
        sandbox.stub(process, 'env').value({ 'SAUCE_CAPABILITIES_OVERRIDES_PATH': 'does-not-exist.json' });

        const result = await provider._generateCapabilities(desktopUA);

        expect(result).eql({
            browserName: 'chrome',
            version:     '88.0',
            platform:    'macos 11.00'
        });
    });
});
