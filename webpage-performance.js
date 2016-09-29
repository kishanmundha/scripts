var http = require('http');
var util = require('util');
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

var interval = 1000;

//console.log(process.argv);

//console.log(options);

if ( process.argv.length <= 2) {
    console.log('usage: node webpage-performance <url> [-i <interval>]');
    return;
}

var args = [];
(function() {
    for(var i=2; i<process.argv.length; i++) {
        args.push(process.argv[i]);
    }
})();

var argUrl = args[0];

//console.log(url.parse(argUrl));

options.host = url.parse(argUrl).hostname;
options.port = url.parse(argUrl).port || 80;
options.path = url.parse(argUrl).path;

if ( !options.host || !options.path ) {
    console.log(colors.red('Invalid url'));
    console.log(colors.cyan('URL Format should be like "http://domain"'));
    return;
}

args.splice(0, 1);

if(args.length > 0 && args[0] == '-i' && args[1]) {
    var _interval = parseInt(args[1]);

    if(isNaN(_interval))
        _interval = 1;
    
    interval = _interval * 1000;
}

var testPage = function() {

    var requestTime = new Date();

    var req = http.request(options, function(res) {
		res.setEncoding('utf8');
        //console.log(res.statusCode);
		var resData = '';
        res.on('data', function (chunk) {
			//console.log("body: " + chunk);
            //console.log(colors.grey(chunk));
			resData += chunk;
		});
		res.on('end', function() {
            var responseTime = new Date();

            var statusCode = res.statusCode;

            var str = colors.grey('[' + getTimeString(requestTime) + ']...[' + getTimeString(responseTime) + ']');
            str += ' ' + colors.magenta(statusCode);
            str += ' \t' + colors.cyan(getSizeString(resData.length));
            str += ' \t' + colors.yellow((responseTime-requestTime) + 'ms');
            console.log(str);
            setTimeout(testPage, interval);
		});
	});
	
    req.on('error', function(err) {
        console.log(colors.grey('[' + getTimeString(requestTime) + '] ') + colors.red(err));
        setTimeout(testPage, 1000);
    })

	req.end();
}

console.log(colors.grey('Testing page ') + colors.cyan(options.path) + colors.grey(' on ') + colors.cyan(options.host) + colors.grey(' at port ') + colors.cyan(options.port));

setTimeout(testPage, 1000);

//////////////////////////////////////////////

var getTimeString = function(date) {
    var d = date
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

    callTime = h + ':' + m + ':' + s + '.' + ms;

    return callTime;
};

var getSizeString = function(size) {
    var sizeMap = ['Bytes', 'KB', 'MB', 'GB'];
    var indx = 0;

    while (size > 1024 && indx < sizeMap.length) {
        size /= 1024;

        indx ++;
    }

    size = parseInt(size);

    return size + ' ' + sizeMap[indx];
}