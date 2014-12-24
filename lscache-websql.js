/**
 * lscache-websql library
 * Copyright (c) 2014, Matt Brophy
 *
 * Largely inspired by Pamela Fox's lscache library
 *   https://github.com/pamelafox/lscache
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/* jshint undef:true, browser:true, node:true */
/* global define, $ */

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define([], factory);
    } else if (typeof module !== 'undefined' && module.exports) {
        // CommonJS/Node module
        module.exports = factory();
    } else {
        // Browser globals
        root.lscacheWebsql = factory();
    }
}(this, function () {

  // Suffix for the key name on the expiration items in localStorage
  var CACHE_SUFFIX = '-cacheexpiration';

  // expiration date radix (set to Base-36 for most space savings)
  var EXPIRY_RADIX = 10;

  // time resolution in minutes
  var EXPIRY_UNITS = 60 * 1000;

  // ECMAScript max Date (epoch + 1e8 days)
  //var MAX_DATE = Math.floor(8.64e15/EXPIRY_UNITS);

  var cachedJSON;
  var warnings = false;

  var dbName = '__lscache-websql__';
  var dbVersion = '1.0';
  var dbDesc = 'lscache-websql db';
  var dbSize = 10 * 1024 * 1024;
  var db;

  var tblName = 'data';
  var tblKeyCol = 'key';
  var tblValCol = 'val';

  var supportedDfd = new $.Deferred();

  function partial(func) {
    var args = Array.prototype.slice.call(arguments, 1);
    return function () {
      var args2 = Array.prototype.slice.call(arguments, 0);
      return func.apply(null, args.concat(args2));
    };
  }

  function createTable() {
    return executeTx('CREATE TABLE IF NOT EXISTS ' + tblName +
                     ' (' + tblKeyCol + ' unique, ' + tblValCol + ')');
  }

  // Check support and init
  if (!('openDatabase' in window)) {
    supportedDfd.reject('openDatabase not defined!');
  } else {
    db = openDatabase(dbName, dbVersion, dbDesc, dbSize);
    createTable().done(supportedDfd.resolve)
                 .fail(supportedDfd.reject);
  }

  function executeTx(sql, paramArr) {
    var dfd = new $.Deferred();
    warn('Executing sql: ' + sql);
    warn(paramArr);
    db.transaction(function (tx) {
      tx.executeSql(sql, paramArr,
                    function (tx, result) {
                      dfd.resolve(result);
                    },
                    function (tx, err) {
                      dfd.reject(err);
                    });
    });
    return dfd.promise().fail(function (e) {
      warn('tx.executeSql failed: ' + e.message);
    });
  }

  // Determines if native JSON (de-)serialization is supported in the browser.
  function supportsJSON() {
    /*jshint eqnull:true */
    if (cachedJSON === undefined) {
      cachedJSON = (window.JSON != null);
    }
    return cachedJSON;
  }

  /**
   * Returns the full string for the localStorage expiration item.
   * @param {String} key
   * @return {string}
   */
  function expirationKey(key) {
    return key + CACHE_SUFFIX;
  }

  /**
   * Returns the number of minutes since the epoch.
   * @return {number}
   */
  function currentTime() {
    return Math.floor((new Date().getTime())/EXPIRY_UNITS);
  }

  /**
   * Wrapper functions for localStorage methods
   */

  function getItem(key, cb) {
    var func = partial(executeTx,
                       'SELECT ' + tblValCol + ' FROM ' + tblName + ' WHERE ' + tblKeyCol + ' = ?',
                       [ key ]);
    return supportedDfd.then(func);
  }

  function setItem(key, value, cb) {
    var insertFunc = partial(executeTx,
                       'INSERT OR REPLACE INTO ' + tblName +
                       ' (' + tblKeyCol + ', ' + tblValCol + ') ' +
                       'VALUES (?, ?)',
                       [ key, value ]);
    return supportedDfd.then(insertFunc);
  }

  function removeItem(key) {
    var func = partial(executeTx,
                       'DELETE FROM ' + tblName + ' WHERE ' + tblKeyCol + ' = ?',
                       [ key ]);
    return supportedDfd.then(func);
  }

  function warn(message, err) {
    if ( warnings &&
         ('console' in window) &&
         typeof window.console.warn === 'function' ) {
      window.console.warn('lscacheWebsql - ' + message);
      if (err) {
        window.console.warn('lscacheWebsql - The error was: ' + err.message);
      }
    }
  }

  var lscacheWebsql = {
    /**
     * Stores the value in localStorage. Expires after specified number of minutes.
     * @param {string} key
     * @param {Object|string} value
     * @param {number} time
     */
    set: function(key, value, time) {
      return supportedDfd.then(function () {

        function setExpiration(results) {
          // If a time is specified, store expiration info in localStorage
          if (time) {
            return setItem(expirationKey(key), (currentTime() + time).toString(EXPIRY_RADIX))
                   // Return the prior answer after we set the expiration
                   .then(function () {
                     return results;
                   })
                   // Otherwise remove the item we just set since we failed to
                   // set an expiration.  Use .fail() to preserve the error result
                   .fail(function () {
                     return removeItem(key);
                   });
          } else {
            // In case they previously set a time, remove that info from localStorage.
            return new $.Deferred()
                        .resolve(results)
                        .done(function () {
                          return removeItem(expirationKey(key));
                        });
          }
        }

        var msg;

        // If we don't get a string value, try to stringify
        // In future, localStorage may properly support storing non-strings
        // and this can be removed.
        if (typeof value !== 'string') {
          if (!supportsJSON()) {
            msg = 'Unable to stringify non-string value, ignoring';
            warn(msg);
            return new $.Deferred().reject(msg);
          }
          try {
            value = JSON.stringify(value);
          } catch (e) {
            // Sometimes we can't stringify due to circular refs
            // in complex objects, so we won't bother storing then.
            msg = 'Unable to stringify circular references, ignoring';
            warn(msg);
            return new $.Deferred().reject(msg);
          }
        }

        try {
          return setItem(key, value).then(setExpiration);
        } catch (e) {
          // if (e.name === 'QUOTA_EXCEEDED_ERR' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED' || e.name === 'QuotaExceededError') {
          //   // If we exceeded the quota, then we will sort
          //   // by the expire time, and then remove the N oldest
          //   var storedKeys = [];
          //   var storedKey;
          //   for (var i = 0; i < localStorage.length; i++) {
          //     storedKey = localStorage.key(i);

          //     if (storedKey.indexOf(CACHE_PREFIX + cacheBucket) === 0 && storedKey.indexOf(CACHE_SUFFIX) < 0) {
          //       var mainKey = storedKey.substr((CACHE_PREFIX + cacheBucket).length);
          //       var exprKey = expirationKey(mainKey);
          //       var expiration = getItem(exprKey);
          //       if (expiration) {
          //         expiration = parseInt(expiration, EXPIRY_RADIX);
          //       } else {
          //         // TODO: Store date added for non-expiring items for smarter removal
          //         expiration = MAX_DATE;
          //       }
          //       storedKeys.push({
          //         key: mainKey,
          //         size: (getItem(mainKey)||'').length,
          //         expiration: expiration
          //       });
          //     }
          //   }
          //   // Sorts the keys with oldest expiration time last
          //   storedKeys.sort(function(a, b) { return (b.expiration-a.expiration); });

          //   var targetSize = (value||'').length;
          //   while (storedKeys.length && targetSize > 0) {
          //     storedKey = storedKeys.pop();
          //     warn("Cache is full, removing item with key '" + key + "'");
          //     removeItem(storedKey.key);
          //     removeItem(expirationKey(storedKey.key));
          //     targetSize -= storedKey.size;
          //   }
          //   try {
          //     setItem(key, value);
          //   } catch (e) {
          //     // value may be larger than total quota
          //     warn("Could not add item with key '" + key + "', perhaps it's too big?", e);
          //     return;
          //   }
          // } else {
          //   // If it was some other error, just give up.
             msg = 'Could not add item with key \'' + key + '\'';
             warn(msg, e);
             return new $.Deferred().reject(msg);
          //   return;
          // }
        }
      });
    },

    /**
     * Checks whether a given key is expired
     * @param {string} key
     * @return {Boolean}
     */
    isExpired: function(key) {
      return supportedDfd.then(function () {
        var exprKey = expirationKey(key);
        return getItem(exprKey).then(function (sqlResultSet) {
          try {
            var expr = sqlResultSet.rows.item(0)[tblValCol];
            if (expr) {
              var expirationTime = parseInt(expr, EXPIRY_RADIX);

              // Check if we should actually kick item out of storage
              if (currentTime() >= expirationTime) {
                return true;
              }
            }
          } catch (e) {}

          return false;
        });
      });
    },

    /**
     * Retrieves specified value from localStorage, if not expired.
     * @param {string} key
     * @param {boolean} skipRemove Don't remove the item if expired [Default: false]
     * @param {boolean} allowExpr  Allow returning of expired values  [Default: false]
     * @return {string|Object}
     */
    get: function(key, skipRemove, allowExpired) {
      skipRemove = (skipRemove === true);  // Default false
      allowExpired = (allowExpired === true); // Default false

      return supportedDfd.then(function () {

        return lscacheWebsql.isExpired(key).then(function (expired) {
          var value = new $.Deferred(),
              dfd = new $.Deferred().resolve();

          if (expired) {
            if (!skipRemove) {
              var exprKey = expirationKey(key);
              dfd = dfd.then(function () {
                      return getItem(key).then(value.resolve, value.reject);
                    })
                    .then(function (v) {
                      return removeItem(key);
                    })
                    .then(function (value) {
                      return removeItem(exprKey);
                    });
            }
            if (!allowExpired) {
              return null;
            }
          }

          // Tries to de-serialize stored value if its an object, and returns the normal value otherwise.
          dfd = dfd.then(function () {

            function parseValue (sqlResultSet) {
              var value = null;

              try {
                value = sqlResultSet.rows.item(0)[tblValCol];
                if (!value || !supportsJSON()) {
                  return value;
                }
                // We can't tell if its JSON or a string, so we try to parse
                return JSON.parse(value);
              } catch (e) {
                // If we can't parse, it's probably because it isn't an object
                return value;
              }
            }

            if (value.state() === 'pending') {
              return getItem(key).then(parseValue);
            } else {
              return value.then(parseValue);
            }
          });

          return dfd.promise();
        });
      });
    },

    /**
     * Removes a value from localStorage.
     * Equivalent to 'delete' in memcache, but that's a keyword in JS.
     * @param {string} key
     */
    remove: function(key) {
      return supportedDfd
              .then(function () {
                removeItem(key);
              })
              .then(function () {
                removeItem(expirationKey(key));
              });
    },

    /**
     * Returns whether local storage is supported.
     * Currently exposed for testing purposes.
     * @return {boolean}
     */
    supported: function() {
      return supportedDfd
              .then(function () {
                      return true;
                    },
                    function () {
                      return false;
                    });
    },

    /**
     * Flushes all lscache items and expiry markers without affecting rest of localStorage
     */
    flush: function(cb) {
      return supportedDfd
              .then(partial(executeTx, 'DELETE FROM ' + tblName, []));
    },

    /**
     * Sets whether to display warnings when an item is removed from the cache or not.
     */
    enableWarnings: function(enabled) {
      warnings = enabled;
    }
  };

  // Return the module
  return lscacheWebsql;
}));
