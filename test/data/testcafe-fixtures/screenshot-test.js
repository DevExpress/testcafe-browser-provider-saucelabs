fixture `Screenshot`
    .page('https://google.com');

test('Take screenshot', async t => {
    await t.takeScreenshot();
});
