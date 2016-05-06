/**
 * Famous.af but with Node!
 *
 * @author Jared Allard <jaredallard@outlook.com>
 * @license MIT
 * @version 1.0.0.
 **/

'use strict';

const request      = require('request'),
      debug        = require('debug')('famous'),
      EventEmitter = require('events'),
      jsdom        = require('jsdom'),
      WebSocket    = require('ws'),
      FormData     = require('form-data'),
      async        = require('async');

let endpoints = require('./endpoints.js');

module.exports = class Famousaf {

  /**
   * Constuct the Famous instance.
   *
   * @param {String} COOKIE - Cookie used to login. Obtain from dev-tools.
   *
   * @todo Use some other form of authentication with the API.
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
   * @returns {Promise} new promise.
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

        let parsed;
        try {
          parsed = JSON.parse(body);
        } catch(e) {
          return _returnErrors('Failed to parse json.');
        }

        // parse API errors.
        if(parsed.meta) {
          if(parsed.meta.error_message) {
            return _returnErrors(parsed.meta);
          }
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
   *
   * @param {String} path   -  /api/<path>
   * @param {Object} params - ?key=value
   * @param {Function} cb   - optional callback.
   * @returns {Promise} new promise.
   **/
  get(path, params, cb) {
    return this.request('GET', path, params, cb)
  }

  /**
   * Symlink for Famousaf#request for POST requests.
   *
   * @param {String} path   -  /api/<path>
   * @param {Object} params - data to send in multipart/form-data
   * @param {Function} cb   - optional callback.
   * @returns {Promise} new promise.
   */
  post(path, params, cb) {
    return this.request('POST', path, params, cb);
  }

  /**
   * Get the API version.
   *
   * @param {Function} cb - optional callback
   * @returns {Promises} promise object.
   **/
  APIVersion(cb) {
    return this.get('', {}, cb);
  }

  /**
   * Connect to and consume events from the websocket.
   *
   * @returns {events#EventEmitter} a new EventEmitter instance.
   **/
  stream() {
    debug('stream', 'instance WebSocket for socket stream.')
    let ws = new WebSocket(endpoints.STREAM, {
      headers: {
        'Origin': endpoints.HOST,
        'Cookie': this.getAuthCookie()
      }
    });

    class FamousStream extends EventEmitter {};

    let event = new FamousStream();

    ws.on('message', data => {
      debug('stream', 'received message');

      let parsed;
      try {
        parsed = JSON.parse(data);
      } catch(e) {
        debug('stream', 'received invalid JSON over stream:', data);
        return;
      }

      if(parsed.type === 'update' && parsed.subtype === 'notification') {
        let TEXT     = parsed.data.notification.text_formatted;
        let doc      = jsdom.jsdom(TEXT);
        let isNewFan = /biggest fan/g;

        /**
         * Determine if it's a new fan event.
         **/
        if(isNewFan.test(TEXT)) {
          let people = doc.getElementsByTagName("person");
          let amounts = doc.getElementsByTagName("b");

          let IDs = parsed.data.notification.involved_people_ids;

          debug('stream:jsdom', 'found people:', people);

          let person = people[1].innerHTML;
          let owner  = people[0].innerHTML;

          let theyspent = amounts[0].innerHTML;
          let wegot     = amounts[1].innerHTML;

          return event.emit('newFan',
            {
              name: person,
              id: IDs[0]
            },
            {
              name: owner,
              id: IDs[1]
            },
            theyspent,
            wegot
          );
        }
      }

      // return the standard unknown / all statuses up dates event.
      return event.emit('message', parsed);
    });

    ws.on('open', () => {
      debug('stream', 'socket is OPEN');
    });

    return event;
  }

  /**
   * Get Information about who you are.
   **/
  me(cb) {
    return this.get('me', {}, cb);
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
