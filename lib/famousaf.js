/**
 * Famous.af but with Node!
 *
 * @author Jared Allard <jaredallard@outlook.com>
 * @license MIT
 * @version 1.0.0.
 **/

'use strict';

const request = require('request'),
      debug   = require('debug'),
      async   = require('async');

let endpoints = require('./endpoints.js');


/**
 * @class Famousaf
 **/
class Famousaf {

  /**
   * Constuct the Famous instance.
   *
   * @param {String} OAUTH_TOKEN - OAuth token provided by Twitter.
   * @param {String} OAUTH_VERIFIER - OAuth Verifier provided, by guess who, Twitter.
   * @constructor
   **/
  constructor(OAUTH_TOKEN, OAUTH_VERIFIER) {

  }

  /**
   * Make a $METHOD request to $PATH on endpoint.
   *
   * If callback is empty, it will use promises instead.
   *
   * @param {String} method - GET/PUT/POST whatever you want.
   * @param {String} path   - path ontop of Famous API Endpoint.
   * @param {Object} params - Data to send in multipart/form-data.
   * @param {Function} callback - returns to with: (err, data)
   * @returns {undefined} use the callback.
   **/
  request(method, path, params, callback) {
    return new Promise((resolve, reject) => {
      let _returnErrors = (err) => {
        if(callback && typeof callback === 'function') {
          return callback(err);
        }

        return reject(err);
      }
    })
  }
}
