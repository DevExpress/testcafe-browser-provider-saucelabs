# testcafe-browser-provider-saucelabs
[![Build Status](https://travis-ci.org/DevExpress/testcafe-browser-provider-saucelabs.svg)](https://travis-ci.org/DevExpress/testcafe-browser-provider-saucelabs)

This is the **saucelabs** browser provider plugin for [TestCafe](http://devexpress.github.io/testcafe).

## Install

```
npm install -g testcafe-browser-provider-saucelabs
```

## Usage

Before using the provider store SauceLabs username and access key in environment variables `SAUCELABS_USERNAME` 
and `SAUCELABS_ACCESS_KEY`, as described in [SauceLabs documentation](https://wiki.saucelabs.com/display/DOCS/Best+Practice%3A+Use+Environment+Variables+for+Authentication+Credentials).

You can figure out available browser aliases by running
```
testcafe -b saucelabs
    "saucelabs:Chrome@dev:Windows 10"
    "saucelabs:Chrome@beta:Windows 10"
    "saucelabs:Chrome@51.0:Windows 10"
    "saucelabs:Chrome@50.0:Windows 10"
    "saucelabs:Chrome@49.0:Windows 10"
    ...
```

When you run tests from the command line, use the browser alias when specifying browsers:

```
testcafe chrome,"saucelabs:Chrome@beta:Windows 10" 'path/to/test/file.js'
```


When you use API, pass the alias to the `browsers()` method:

```js
testCafe
    .createRunner()
    .src('path/to/test/file.js')
    .browsers('chrome', 'saucelabs:Chrome@beta:Windows 10')
    .run();
```

## Author
Developer Express Inc. (https://devexpress.com)
