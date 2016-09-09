# testcafe-browser-provider-saucelabs
[![Build Status](https://travis-ci.org/DevExpress/testcafe-browser-provider-saucelabs.svg)](https://travis-ci.org/DevExpress/testcafe-browser-provider-saucelabs)
[![Build Status](https://ci.appveyor.com/api/projects/status/47hkm5kr9c6ftb9u/branch/master?svg=true)](https://ci.appveyor.com/project/DevExpress/testcafe-browser-provider-saucelabs/branch/master)

This is the [TestCafe](http://devexpress.github.io/testcafe) browser provider plugin for the integration with the [SauceLabs Testing Cloud](https://saucelabs.com/).

## Install

```
npm install testcafe-browser-provider-saucelabs
```

## Usage
Before using the provider, save the SauceLabs username and access key to environment variables `SAUCELABS_USERNAME` and `SAUCELABS_ACCESS_KEY`, as described in [SauceLabs documentation](https://wiki.saucelabs.com/display/DOCS/Best+Practice%3A+Use+Environment+Variables+for+Authentication+Credentials).

You can determine the available browser aliases by running
```
testcafe -b saucelabs
```

When you run tests from the command line, use the browser alias when specifying browsers:

```
testcafe "saucelabs:Chrome@beta:Windows 10" 'path/to/test/file.js'
```


When you use API, pass the alias to the `browsers()` method:

```js
testCafe
    .createRunner()
    .src('path/to/test/file.js')
    .browsers('saucelabs:Chrome@beta:Windows 10')
    .run();
```

## Author
Developer Express Inc. (https://devexpress.com)
