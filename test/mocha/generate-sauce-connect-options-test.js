const expect   = require('chai').expect;
const mockfs   = require('mock-fs');
const sandbox  = require('sinon').createSandbox();
const provider = require('../../lib');

describe('Internal generateSauceConnectOptions test', function () {
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

    it('should generate default sauce connect options', async function () {
        const result = await provider._generateSauceConnectOptions();

        expect(result).eql({ connectorLogging: false });
    });

    it('should provide connect overrides from file', async function () {
        sandbox.stub(process, 'env').value({ 'SAUCE_CONNECT_OVERRIDES_PATH': 'overrides.json' });
        mockfs({
            'overrides.json': JSON.stringify({ directDomains: ['*.google.com'], noSslBumpDomains: 'all' })
        });

        const result = await provider._generateSauceConnectOptions();

        expect(result).eql({
            connectorLogging: false,
            directDomains:    ['*.google.com'], 
            noSslBumpDomains: 'all'
        });
    });

    it('should not override anything if overrides file does not exist', async function () {
        sandbox.stub(process, 'env').value({ 'SAUCE_CAPABILITIES_OVERRIDES_PATH': 'overrides.json' });

        const result = await provider._generateSauceConnectOptions();

        expect(result).eql({
            connectorLogging: false
        });
    });
});
