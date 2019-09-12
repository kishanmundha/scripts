#!/usr/bin/env node

var http = require('http');
var https = require('https');
var url = require('url');
var colors = require('colors');
var Buffer = require('buffer').Buffer;

if (process.argv.length <= 3) {
  console.log('usage: node middleware-server <target> <localport>');
  process.exit();
}

var targetServerUrl = process.argv[2];
var localPort = process.argv[3];

var targetServerUrlDetail = url.parse(targetServerUrl);

if (!targetServerUrlDetail.hostname) {
  console.log(colors.red('Invalid target url path. Target url should be a full path of domain with protocol.'));
  process.exit();
}

var targetServer = {
  host: targetServerUrlDetail.hostname,
  port: targetServerUrlDetail.port || (targetServerUrlDetail.protocol === 'https:' ? 443 : 80),
  protocol: targetServerUrlDetail.protocol || 'http:',
  http: http
};

if (targetServerUrlDetail.protocol === 'https:') {
  targetServer.http = https;
}

var server = http.createServer(function (serverReq, serverRes) {
  var requestTime = new Date();

  if (serverReq.method === 'OPTIONS') {
    serverRes.writeHead(200, Object.assign({}, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Allow-Methods': 'GET, PUT, POST, DELETE, HEAD'
    }));
    serverRes.end();
    return;
  }

  var reqOptions = {
    host: targetServer.host,
    port: targetServer.port,
    path: serverReq.url,
    method: serverReq.method,
    headers: Object.assign(serverReq.headers)
  };

  delete reqOptions.headers['host'];
  delete reqOptions.headers['referer'];

  var serverReqBody = '';
  serverReq.on('data', function (chunk) {
    serverReqBody += chunk;
  });

  serverReq.on('end', function () {
    var req = targetServer.http.request(reqOptions, function (res) {
      var resData = Buffer.from([]);
      res.on('data', function (chunk) {
        resData = Buffer.concat([resData, chunk], resData.length + chunk.length);
      });
      res.on('end', function () {
        serverRes.writeHead(res.statusCode, Object.assign(res.headers, {
          'access-control-allow-origin': '*',
          'access-control-allow-headers': '*',
          'access-control-allow-methods': 'GET, PUT, POST, DELETE, HEAD'
        }));
        serverRes.end(resData);
      });
    });

    req.on('error', function (err) {
      sendErrorResponse(serverRes, err);
    });

    req.write(serverReqBody);

    req.end();
  });

  serverReq.on('error', function (err) {
    sendErrorResponse(serverRes, err);
  });

  console.log(colors.gray('[' + getTimeString(requestTime) + ']') + ' ' + serverReq.method + ' ' + serverReq.url);
});

server.listen(localPort);
console.log('Listening ' + colors.bold(colors.blue(targetServer.protocol + '//' + targetServer.host + (targetServer.port === 80 ? '' : ':' + targetServer.port))) + ' on port ' + colors.bold(colors.blue(localPort)) + '...');

/*******************************
 * Helpers
 ******************************/

/**
 * @param {IncomingMessage} res
 * @param {Object} err
 */
var sendErrorResponse = function (res, err) {
  res.writeHead(500, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(err));
};

/**
 * @param {Number} number
 * @param {Number} digit
 */
var fixDigit = function (number, digit) {
  var strNumber = number + '';

  while (strNumber.length < digit) {
    strNumber = '0' + strNumber;
  }

  return strNumber;
};

/**
 * Get time string
 * @param {Number} time
 */
var getTimeString = function (time) {
  var date = new Date(time);

  return fixDigit(date.getHours(), 2) + ':' + fixDigit(date.getMinutes(), 2) + ':' + fixDigit(date.getSeconds(), 2);
};
