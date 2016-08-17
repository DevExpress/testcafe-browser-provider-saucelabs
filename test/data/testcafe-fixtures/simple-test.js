fixture `Simple`
    .page('https://google.com');

test('Simple test', async t => {
    await t.wait(500);
});
