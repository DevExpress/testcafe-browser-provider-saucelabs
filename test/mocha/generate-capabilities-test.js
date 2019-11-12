const expect = require('chai').expect;
const mockfs = require('mock-fs');
const sandbox = require('sinon').createSandbox();
const provider = require('../../');

describe('Internal generateCapabilities test', function () {
    const desktopUA = 'Chrome@51.0:OS X 10.10';

    before(function () {
        this.timeout(20000);
        return provider.init();
    });

    afterEach(function () {
        sandbox.restore();
        mockfs.restore();
    });

    after(function () {
        return provider.dispose();
    });

    it('should generate basic desktop capabilities', async function () {
        const result = await provider._generateCapabilities(desktopUA);

        expect(result).eql({
            browserName: 'chrome',
            version:     '51.0',
            platform:    'os x 10.10'
        });
    });

    it('should set the screen resolution from SAUCE_SCREEN_RESOLUTION', async function () {
        sandbox.stub(process, 'env').value({ 'SAUCE_SCREEN_RESOLUTION': '1920x1200' });

        const result = await provider._generateCapabilities(desktopUA);

        expect(result).eql({
            browserName:      'chrome',
            version:          '51.0',
            platform:         'os x 10.10',
            screenResolution: '1920x1200'
        });
    });

    it('should provide capabilities overrides from file', async function () {
        sandbox.stub(process, 'env').value({ 'SAUCE_CAPABILITIES_OVERRIDES_PATH': 'overrides.json' });
        mockfs({
            'overrides.json': JSON.stringify({ extendedDebugging: true })
        });

        const result = await provider._generateCapabilities(desktopUA);

        expect(result).eql({
            browserName:       'chrome',
            version:           '51.0',
            platform:          'os x 10.10',
            extendedDebugging: true
        });
    });

    it('should not override anything if overrides file does not exist', async function () {
        sandbox.stub(process, 'env').value({ 'SAUCE_CAPABILITIES_OVERRIDES_PATH': 'overrides.json' });

        const result = await provider._generateCapabilities(desktopUA);

        expect(result).eql({
            browserName: 'chrome',
            version:     '51.0',
            platform:    'os x 10.10'
        });
    });
});
