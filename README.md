# testcafe-browser-provider-saucelabs
[![Build Status](https://travis-ci.org/DevExpress/testcafe-browser-provider-saucelabs.svg)](https://travis-ci.org/DevExpress/testcafe-browser-provider-saucelabs)
[![Build Status](https://ci.appveyor.com/api/projects/status/47hkm5kr9c6ftb9u/branch/master?svg=true)](https://ci.appveyor.com/project/DevExpress/testcafe-browser-provider-saucelabs/branch/master)

This plugin integrates [TestCafe](http://devexpress.github.io/testcafe) with the [SauceLabs Testing Cloud](https://saucelabs.com/).

## Install

```
npm install testcafe-browser-provider-saucelabs
```

## Usage
Before using this plugin, save the SauceLabs username and access key to environment variables `SAUCE_USERNAME` and `SAUCE_ACCESS_KEY`, as described in [SauceLabs documentation](https://wiki.saucelabs.com/display/DOCS/Best+Practice%3A+Use+Environment+Variables+for+Authentication+Credentials).

You can determine the available browser aliases by running
```
testcafe -b saucelabs
```

If you run tests from the command line, use the browser alias when specifying browsers:

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

## Configuration

Use the following environment variables to set additional configuration options:

 - `SAUCE_JOB` - the text that will be displayed as Job Name on SauceLabs,

 - `SAUCE_BUILD` - the text that will be displayed as Build Name on SauceLabs.

 - `SAUCE_CONFIG_PATH` - Path to a file which contains additional job options as JSON. See [SauceLabs Test Configuration](https://wiki.saucelabs.com/display/DOCS/Test+Configuration+Options#TestConfigurationOptions) for a full list.
 
 - `SAUCE_SCREEN_RESOLUTION` - allows setting the screen resolution for desktop browsers in the `${width}x${height}` format, has no effect when specified for a mobile browser. See [Specifying the Screen Resolution](https://wiki.saucelabs.com/display/DOCS/Test+Configuration+Options#TestConfigurationOptions-SpecifyingtheScreenResolution) for additional information. 
 
Example:
```sh
export SAUCE_SCREEN_RESOLUTION="1920x1080"
export SAUCE_JOB="E2E TestCafe"
export SAUCE_BUILD="Build 42"
testcafe saucelabs:safari,saucelabs:chrome tests/
```
 
## Author
Developer Express Inc. (https://devexpress.com)
