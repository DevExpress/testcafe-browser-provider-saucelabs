import { expect } from 'chai';
import { ClientFunction } from 'testcafe';

fixture `Resize`
    .page('https://google.com');

const getWindowWidth  = ClientFunction(() => window.innerWidth);
const getWindowHeight = ClientFunction(() => window.innerHeight);

test('Resize test', async t => {
    await t.resizeWindow(500, 500);

    var newSize = {
        width:  await getWindowWidth(),
        height: await getWindowHeight()
    };

    expect(newSize.width).to.be.equal(500);
    expect(newSize.height).to.be.equal(500);
});
