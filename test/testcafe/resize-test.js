import { expect } from 'chai';


fixture `Resize`
    .page('https://google.com');

test('Resize test', async t => {
    var originalSize = await t.eval(() => ({
        width:  window.innerWidth,
        height: window.innerHeight
    }));

    await t.resizeWindow(500, 500);

    var newSize = await t.eval(() => ({
        width:  window.innerWidth,
        height: window.innerHeight
    }));

    expect(newSize.width).to.be.not.equal(originalSize.width);
    expect(newSize.height).to.be.not.equal(originalSize.height);
});
