var request = require('request');

var requestMock = function () {
    requestMock.urls.push(arguments[0]);

    request.apply(void 0, arguments);
};

requestMock.urls = [];

module.exports = requestMock;
