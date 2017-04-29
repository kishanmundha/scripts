#!/usr/bin/env node

/* eslint indent: ["error", 4] */
/* eslint quotes: off */

var http = require('http');
var colors = require('colors');
var url = require('url');

var options = {
    host: 'localhost',
    port: 57504,
    path: '/',
    headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.111 Safari/537.36',
        'Pragma': 'no-cache',
        'Cache-Control': 'no-cache',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Encoding': 'gzip, deflate, sdch',
        'Accept-Language': 'en-US,en;q=0.8',
        'Proxy-Connection': 'keep-alive'
    }
};

var requestCount = 10;

if (process.argv.length <= 2) {
    console.log('usage: node bulk-api-test <url> [-n <number of api per second>]');
    process.exit();
}

var args = [];
(function () {
    for (var i = 2; i < process.argv.length; i++) {
        args.push(process.argv[i]);
    }
})();

var argUrl = args[0];

var urlDetail = url.parse(argUrl);

options.host = urlDetail.hostname;
options.port = urlDetail.port || (urlDetail.protocol === 'https:' ? 443 : 80);
options.protocol = urlDetail.protocol || 'http:';
options.path = urlDetail.path;

if (options.protocol === 'https:') {
    http = require('https');
}

if (!options.host || !options.path) {
    console.log(colors.red('Invalid url'));
    console.log(colors.cyan('URL Format should be like "http://domain"'));
    process.exit();
}

args.splice(0, 1);

if (args.length > 0 && args[0] === '-n' && args[1]) {
    var _count = parseInt(args[1]);

    if (isNaN(_count)) {
        _count = 1;
    }

    requestCount = _count;
}

var testPage = function () {
    var results = [];

    for (var i = 0; i < requestCount; i++) {
        (function () {
            var index = i + 1;
            var requestTime = new Date();

            var result = {
                index: index,
                requestTime: requestTime,
                resolved: false
            };

            results.push(result);

            var req = http.request(options, function (res) {
                res.setEncoding('utf8');
                // console.log(res.statusCode);
                var resData = '';
                res.on('data', function (chunk) {
                    // console.log("body: " + chunk);
                    // console.log(colors.grey(chunk));
                    resData += chunk;
                });
                res.on('end', function () {
                    var responseTime = new Date();

                    var statusCode = res.statusCode;
                    var statusMessage = res.statusMessage;

                    result.responseTime = responseTime;
                    result.statusCode = statusCode;
                    result.responseTimeMs = (responseTime - requestTime);
                    result.resolved = true;

                    var str = '';
                    str += colors.blue('[' + getIndexNumberString(index, requestCount) + ']');
                    str += colors.grey(' [' + getTimeString(requestTime) + ']...[' + getTimeString(responseTime) + ']');
                    str += ' ' + colors.magenta(statusCode + ' ' + statusMessage);
                    str += ' \t' + colors.cyan(getSizeString(resData.length));
                    str += ' \t' + colors.yellow((responseTime - requestTime) + 'ms');
                    console.log(str);
                });
            });

            req.on('error', function (err) {
                result.resolved = true;
                console.log(colors.grey('[' + getTimeString(requestTime) + '] ') + colors.red(err));
            });

            req.end();
        })();
    }

    var isDone = function () {
        return results.filter(function (result) {
            return !result.resolved;
        }).length === 0;
    };

    var showReportRange = function (results) {
        console.log(' ');

        var minIndex, maxIndex;

        minIndex = results[0].index;
        maxIndex = results[results.length - 1].index;

        var successCount = results.filter(function (result) {
            return result.statusCode === 200;
        }).length;

        var failedCount = results.filter(function (result) {
            return result.statusCode !== 200;
        }).length;

        var avgResponseTime = 0;
        if (successCount > 0) {
            var totalResponseTime = 0;
            results.forEach(function (result) {
                if (result.statusCode === 200) {
                    totalResponseTime += result.responseTimeMs;
                }
            });

            avgResponseTime = parseInt((totalResponseTime / successCount).toFixed(0));
        }

        console.log(colors.grey('Range : [' + minIndex + '-' + maxIndex + ']'));
        console.log(colors.green('Success request : ' + successCount));
        if (failedCount === 0) {
            console.log('Failed request : ' + failedCount);
        } else {
            console.log(colors.red('Failed request : ' + failedCount));
        }
        console.log('Average response time : ' + colors.yellow(avgResponseTime + 'ms'));
    };

    var showReport = function () {
        if (!isDone()) {
            setTimeout(showReport, 1000);
            return;
        }

        console.log(' ');
        console.log(colors.rainbow('Overview'));
        console.log('==============');

        showReportRange(results);

        if (results.length > 100) {
            var rSize = parseInt(results.length / 4);
            var r1 = results.filter(function (result) {
                return result.index <= rSize;
            });
            var r2 = results.filter(function (result) {
                return result.index > rSize && result.index <= (rSize * 2);
            });
            var r3 = results.filter(function (result) {
                return result.index > (rSize * 2) && result.index <= (rSize * 3);
            });

            var r4 = results.filter(function (result) {
                return result.index > (rSize * 3);
            });

            showReportRange(r1);
            showReportRange(r2);
            showReportRange(r3);
            showReportRange(r4);
        }
    };

    setTimeout(showReport, 1000);
};

console.log(colors.grey('Testing page ') + colors.cyan(options.path) + colors.grey(' on ') + colors.cyan(options.host) + colors.grey(' at port ') + colors.cyan(options.port));

setTimeout(testPage, 1000);

/*********************************
 * Helpers
**********************************/

/**
 * Convert date to time string format
 * @param {Date} date
 * @return {String}
 */
var getTimeString = function (date) {
    var d = date;
    var h = d.getHours();
    var m = d.getMinutes();
    var s = d.getSeconds();
    var ms = d.getMilliseconds();

    var _h = "00" + h;
    h = _h.substring(_h.length - 2);

    var _m = "00" + m;
    m = _m.substring(_m.length - 2);

    var _s = "00" + s;
    s = _s.substring(_s.length - 2);

    var _ms = "000" + ms;
    ms = _ms.substring(_ms.length - 3);

    var callTime = h + ':' + m + ':' + s + '.' + ms;

    return callTime;
};

/**
 * Convert long value to string format size of data
 * @param {Number} size
 */
var getSizeString = function (size) {
    var sizeMap = ['Bytes', 'KB', 'MB', 'GB'];
    var indx = 0;

    while (size > 1024 && indx < sizeMap.length) {
        size /= 1024;

        indx++;
    }

    size = parseInt(size);

    return size + ' ' + sizeMap[indx];
};

/**
 * @param {Number} index
 * @param {Number} maxSize
 * @return {String}
 */
var getIndexNumberString = function (index, maxSize) {
    index = '' + index;
    maxSize = '' + maxSize;

    while (maxSize.length > index.length) {
        index = '0' + index;
    }

    return index;
};
