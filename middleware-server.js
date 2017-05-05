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

const targetServerUrl = process.argv[2];
const localPort = process.argv[3];

var targetServerUrlDetail = url.parse(targetServerUrl);

if (!targetServerUrlDetail.hostname) {
  console.log(colors.red('Invalid target url path. Target url should be a full path of domain with protocol.'));
  process.exit();
}

const targetServer = {
  host: targetServerUrlDetail.hostname,
  port: targetServerUrlDetail.port || (targetServerUrlDetail.protocol === 'https:' ? 443 : 80),
  protocol: targetServerUrlDetail.protocol || 'http:',
  http: http
};

if (targetServerUrlDetail.protocol === 'https:') {
  targetServer.http = https;
}

var server = http.createServer((serverReq, serverRes) => {
  const requestTime = new Date();

  const reqOptions = {
    host: targetServer.host,
    port: targetServer.port,
    path: serverReq.url,
    method: serverReq.method,
    headers: Object.assign(serverReq.headers)
  };

  delete reqOptions.headers['host'];
  delete reqOptions.headers['referer'];

  let serverReqBody = '';
  serverReq.on('data', (chunk) => {
    serverReqBody += chunk;
  });

  serverReq.on('end', () => {
    let req = targetServer.http.request(reqOptions, (res) => {
      let resData = Buffer.from([]);
      res.on('data', (chunk) => {
        resData = Buffer.concat([resData, chunk], resData.length + chunk.length);
      });
      res.on('end', () => {
        serverRes.writeHead(res.statusCode, Object.assign(res.headers, { 'access-control-allow-origin': '*' }));
        serverRes.end(resData);
      });
    });

    req.on('error', (err) => {
      sendErrorResponse(serverRes, err);
    });

    req.write(serverReqBody);

    req.end();
  });

  serverReq.on('error', (err) => {
    sendErrorResponse(serverRes, err);
  });

  console.log(colors.gray('[' + getTimeString(requestTime) + ']') + ' ' + serverReq.method + ' ' + serverReq.url);
});

server.listen(localPort);
console.log(`Listening ` + colors.bold(colors.blue(`${targetServer.protocol}//${targetServer.host}${targetServer.port === 80 ? '' : ':' + targetServer.port}`)) + ` on port ` + colors.bold(colors.blue(`${localPort}`)) + `...`);

/*******************************
 * Helpers
 ******************************/

/**
 * @param {IncomingMessage} res
 * @param {Object} err
 */
const sendErrorResponse = (res, err) => {
  res.writeHead(500, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(err));
};

/**
 * @param {Number} number
 * @param {Number} digit
 */
const fixDigit = (number, digit) => {
  let strNumber = number + '';

  while (strNumber.length < digit) {
    strNumber = '0' + strNumber;
  }

  return strNumber;
};

/**
 * Get time string
 * @param {Number} time
 */
const getTimeString = (time) => {
  const date = new Date(time);

  return fixDigit(date.getHours(), 2) + ':' + fixDigit(date.getMinutes(), 2) + ':' + fixDigit(date.getSeconds(), 2);
};
