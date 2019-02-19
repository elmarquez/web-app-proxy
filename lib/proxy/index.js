const config = require('config');
const csrf = require('csurf');
const csrfProtection = csrf({cookie: true});
const express = require('express');
const request = require('request');
const session = require('../session');
const S = require('string');
const Utils = require('../utils');

const API = config.get("API");
const UI = config.get("UI");

/**
 * Copy the incoming request headers.
 * @param {Request} req - HTTP request
 * @returns {Object} headers
 */
function getOptions (req) {
  let headers = Object
    .keys(req.headers)
    .reduce((m, k) => {
      m[k] = req.headers[k];
      return m;
    }, {});
  headers['Access-Control-Allow-Origin'] = '*';
  if (headers.hasOwnProperty('host')) {
    delete headers.host;
  }
  return {headers};
}

/**
 * Handle API requests by forwarding them to the designated backend service.
 * @param {Request} req - HTTP request
 * @param {Response} res - HTTP response
 */
function handleApiRequest (req, res) {
  var options = getOptions(req);
  options.url = API + req.url;
  req.log.info(`Forwarding ${req.url} to ${options.url}`);
  if (req.headers.authorization) {
    options.authorization = req.headers.authorization;
  }
  if (req.method === 'DELETE') {
    request.del(options).pipe(res);
  } else if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    request.get(options).pipe(res);
  } else if (req.method === 'POST' || req.method === 'PUT') {
    let body = {};
    request.post(options, body).pipe(res);
  }
}

/**
 * Handle user interface content request.
 * @param {Request} req - HTTP request
 * @param {Response} res - HTTP response
 */
function handleUiRequest (req, res) {
  var options = getOptions(req);
  options.url = UI + req.url;
  req.log.info(`Forwarding ${req.url} to ${options.url}`);
  if (req.method === 'DELETE') {
    request.del(options).pipe(res);
  } else if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    request.get(options).pipe(res);
  } else if (req.method === 'POST' || req.method === 'PUT') {
    let body = {};
    request.post(options, body).pipe(res);
  }
}

/**
 * Execute http request
 * @param req Request
 * @param res Response
 * @param options Request options
 */
function executeRequest(req, res, options) {
  if (req.method === 'DELETE') {
    request.del(options).pipe(res);
  } else if (req.method === 'GET') {
    request.get(options).pipe(res);
  } else if (req.method === 'OPTIONS') {
    request.options(options).pipe(res);
  } else if (req.method === 'POST') {
    options.body = req.body;
    options.json = true;
    request
      .post(options)
      .on('response', function (response) {
        if (S(req.url).startsWith('/login')) {
          if (response.headers.location.indexOf('?error') > -1) {
            response.headers.location = '/login?error';
          } else {
            response.headers.location = '/';
          }
        }
      })
      .pipe(res);
  } else if (req.method === 'PUT') {
    options.body = req.body;
    options.json = true;
    request.put(options).pipe(res);
  }
}

/**
 * Get body data from POST, PUT request and add it to the request
 * object.
 * @param {Object} req Request
 * @param {Object} res Response
 * @param {Object} next Next
 */
function decodeRequestBody (req, res, next) {
  if (req.method === 'POST' || req.method === 'PUT') {
    var data = [];
    req
      .on('data', function (chunk) {
        data.push(chunk);
      })
      .on('end', function () {
        let buffer = Buffer.concat(data);
        let jsonString = buffer.toString('utf8');
        try {
          req.body = JSON.parse(jsonString);
          next();
        } catch (e) {
          console.error(e);
          res.end('Failed to parse JSON body');
        }
      });
  } else {
    next();
  }
}

module.exports = function (app) {
  app.get('/login', csrfProtection, session.getLoginView);
  app.get('/logout', session.handleLogout);
  app.get('/session', session.getSessionStatus);

  app.post('/login', csrfProtection, session.handleLogin);

  app.all('/api/*', Utils.ensureIsAuthenticated, decodeRequestBody, handleApiRequest);
  app.all('/*', Utils.ensureIsAuthenticated, handleUiRequest);

};
