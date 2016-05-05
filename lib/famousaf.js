/**
 * Famous.af but with Node!
 *
 * @author Jared Allard <jaredallard@outlook.com>
 * @license MIT
 * @version 1.0.0.
 **/

'use strict';

const request  = require('request'),
      debug    = require('debug')('famous'),
      FormData = require('form-data'),
      async    = require('async');

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
  constructor(COOKIE) {
    this.COOKIE = COOKIE;

    // verify the construct.
    if (!COOKIE) {
      throw 'Missing COOKIE.';
    }

    debug('constructor', 'construct is VALID.')
  }

  /**
   * Return the Authentication Cookie if we have it.
   *
   * @returns {String} cookie for authentication.
   **/
  getAuthCookie() {
    return this.COOKIE || null;
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
   * @param {String} urlOverride - override uri.
   * @returns {undefined} use the callback.
   **/
  request(method, path, params, callback, urlOverride) {
    return new Promise((resolve, reject) => {

      // return errors to both a callback or a promise.
      let _returnErrors = (err) => {
        if(callback && typeof callback === 'function') {
          return callback(err);
        }

        return reject(err);
      }

      // remove starting / and trailing / for input.
      path = path.replace(/^\//g, '');
      path = path.replace(/\/$/g, '');

      let uri = endpoints.API_HOST + '/' + path;

      let reqOpts = {
        method: method,
        headers: {
          'Accept': '*/*',
          'Origin': endpoints.HOST,
          'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.75 Safari/537.36',
          'Cookie': this.getAuthCookie()
        },
        gzip: true
      }

      if(urlOverride) {
        uri = urlOverride;
      }

      // serialize params object into GET Params.
      if(method === 'GET' && params) {
        debug('request', 'convert params into GET params.');

        let str = '';
        for (let key in params) {
            if (str != '') {
                str += '&';
            }
            str += key + '=' + encodeURIComponent(params[key]);
        }

        uri+= '?'+str;
      } else {
        debug('request', 'type is now multipart/form-data')
        reqOpts.formData = params;
      }

      reqOpts.uri = uri;

      // make the request.
      debug('request', method, uri);
      request(reqOpts, (err, res, body) => {
        if(res.statusCode === 301) {
          debug('request', 'follow 301 ->', res.headers.location);

          return this.request(method, path, params, callback, res.headers.location)
        }

        if(err) {
          return _returnErrors(err);
        }

        let parsed = JSON.parse(body);

        // parse API errors.
        if(parsed.meta.error_message) {
          return _returnErrors(parsed.meta);
        }

        // use callbacks otherwise.
        if(callback && typeof callback === 'function') {
          return callback(false, parsed, res);
        }

        return resolve({
          data: parsed,
          res: res
        });
      });
    });
  }

  /**
   * Symlink for Famousaf#request for GET requests.
   **/
  get(path, params, cb) {
    return this.request('GET', path, params, cb)
  }

  /**
   * Symlink for Famousaf#request for POST requests.
   */
  post(path, params, cb) {
    return this.request('POST', path, params, cb);
  }

  /**
   * Get Information about who you are.
   **/
  me(cb) {
    return this.post('me', {}, cb);
  }

  /**
   * Get Info about a User.
   *
   * @param {String} user - name or ID.
   * @param {Function} cb - optional callback.
   *
   * @returns {Promise} promise to use.
   **/
  whois(user, cb) {
    return this.get('people/'+user, {}, cb);
  }

  /**
   * Attempt to become the fan of $USER.
   *
   * @param {String} user - name or ID.
   * @param {Function} cb - callback, this is optional.
   *
   * @returns {Promise} promise to use if wanted.
   **/
  fan(user, cb) {
    return new Promise((resolve, reject) => {
      async.waterfall([
        /**
         * Get info about the user.
         **/
        (next) => {
          this.whois(user, (err, person) => {
            if(err) {
              return next(err);
            }

            let bump_uuid = person.data.last_bump.bump_uuid;
            let id        = person.data.id;

            debug('fan', 'got bump_uuid:', bump_uuid);
            debug('fan', 'their id is:', id);

            // hot inject the id.
            user = id;

            return next(false, bump_uuid);
          });
        },

        /**
         * Become the fan of user.
         **/
        (bump_uuid, next) => {
          this.post('people/'+user+'/fave', {
            bump_uuid: bump_uuid
          }, (err, data, res) => {
            if(err) {
              return next(err);
            }

            return next(false, {
              data: data,
              res: res
            });
          });
        }

        // Final step: parse the information.
      ], (err, resp) => {
        // parse errors into callback or promise syntax.
        if(err) {
          if(cb && typeof cb === 'function') {
            return cb(err);
          }

          return reject(err);
        }

        debug('fan', 'became fan of', user);
        return resolve({
          data: data,
          res: res
        })
      });
    })
  }
}

let famous = new Famousaf('<cookie for now...>');

// Example #1: promises, can also use famous#post
famous.request('POST', 'me', {})
  .catch(err => {
    console.error(err);
  })
  .then(resp => {
    console.log('got', resp.data);
  });

// Become a fan!
famous.fan('rylorjs')
  .catch(err => {
    return console.error('error', err);
  })
  .then(resp => {
    return console.log('got', resp.data);
  })

// Example #2: Use callbacks. can also use famous#post
famous.request('POST', 'me', {}, (err, body, res) => {
  if(err) {
    return console.error(err);
  }

  console.log('got', body);
});
