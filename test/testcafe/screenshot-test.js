import { expect } from 'chai';
import { statSync } from 'fs';

fixture `Screenshot`
    .page('https://google.com');

test('Take screenshot', async t => {
    var screenshotPath = await t.takeScreenshot();

    expect(statSync(screenshotPath).isFile()).to.be.true;
});
