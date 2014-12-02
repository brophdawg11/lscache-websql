/* jshint undef:true, browser:true, node:true */
/* global QUnit, test, equal, strictEqual, asyncTest, stop, start, define */

var startTests = function (lscacheWebsql) {

  var originalConsole = window.console;
  var Automator = window.Automator;

  QUnit.module('lscache-websql', {
    setup: function() {
      // Reset before each test
      try {
        stop();
        lscacheWebsql.enableWarnings(true);
        lscacheWebsql.flush().then(start);
      } catch(e) {
        console.error('Could not flush lscacheWebsql');
      }
    },
    teardown: function() {
      // Reset before each test
      try {
        stop();
        lscacheWebsql.flush().then(start);
      } catch(e) {
        console.error('Could not flush lscacheWebsql');
      }
      window.console = originalConsole;
      lscacheWebsql.enableWarnings(false);
    }
  });

  function partial(func) {
    var args = Array.prototype.slice.call(arguments, 1);
    return function () {
      var args2 = Array.prototype.slice.call(arguments, 0);
      return func.apply(null, args.concat(args2));
    };
  }

  function assertVal(toBe, val) {
    strictEqual(val, toBe, 'Expected value to be ' + toBe);
  }

  function assertArr(toBe, val) {
    strictEqual(val.length, toBe.length, 'Expected value to have length ' + toBe.length);
  }

  function assertObj(toBe, val) {
    var key;
    for (key in toBe) {
      assertVal(val[key], toBe[key]);
    }
    for (key in val) {
      assertVal(val[key], toBe[key]);
    }
  }

  asyncTest('Testing set() and get() with string', function() {
    var key = 'thekey',
        value = 'thevalue',
        a = new Automator(),
        supported = false;

    a.automate([ partial(lscacheWebsql.set, key, value, 1),
                 lscacheWebsql.supported,
                 function (s) { supported = s; },  // Cache val
                 partial(lscacheWebsql.get, key),
                 function (val) {
                   if (supported) {
                     strictEqual(val, value, 'We expect value to be ' + value);
                   } else {
                     strictEqual(val, null, 'We expect null value');
                   }
                 },
                 start ]);
  });

  asyncTest('Testing set() with number value', function() {
    var key = 'numberkey',
        value = 2,
        a = new Automator();

    a.automate([ partial(lscacheWebsql.set, key, value, 3),
                 partial(lscacheWebsql.get, key),
                 partial(assertVal, value),
                 start ]);
  });

  asyncTest('Testing set() with array value', function() {
    var key = 'arraykey',
        value = ['a', 'b', 3],
        a = new Automator();

    a.automate([ partial(lscacheWebsql.set, key, value, 3),
                 partial(lscacheWebsql.get, key),
                 partial(assertArr, value),
                 start ]);
  });

  asyncTest('Testing set() with object value', function() {
    var key = 'objectkey',
        value = { key1 : 'Test', key2: 1 },
        a = new Automator();

    a.automate([ partial(lscacheWebsql.set, key, value, 3),
                 partial(lscacheWebsql.get, key),
                 partial(assertObj, value),
                 start ]);
  });

  asyncTest('Testing remove()', function() {
    var key = 'thekey',
        a = new Automator();

    a.automate([ partial(lscacheWebsql.set, key, 'bla', 2),
                 partial(lscacheWebsql.remove, key),
                 partial(lscacheWebsql.get, key),
                 partial(assertVal, null),
                 start ]);
  });

  asyncTest('Testing flush()', function() {
    var key = 'thekey',
        a = new Automator();

    a.automate([ partial(lscacheWebsql.set, key, 'bla', 100),
                 partial(lscacheWebsql.flush),
                 partial(lscacheWebsql.get, key),
                 partial(assertVal, null),
                 start ]);
  });

  // test('Testing quota exceeding', function() {
  //   var key = 'thekey';

  //   // Figure out this browser's localStorage limit -
  //   // Chrome is around 2.6 mil, for example
  //   var stringLength = 10000;
  //   var longString = (new Array(stringLength+1)).join('s');
  //   var num = 0;
  //   while(num < 10000) {
  //     try {
  //       localStorage.setItem(key + num, longString);
  //       num++;
  //     } catch (e) {
  //       break;
  //     }
  //   }
  //   localStorage.clear();
  //   // Now add enough to go over the limit
  //   var approxLimit = num * stringLength;
  //   var numKeys = Math.ceil(approxLimit/(stringLength+8)) + 1;
  //   var currentKey;
  //   var i = 0;

  //   for (i = 0; i <= numKeys; i++) {
  //     currentKey = key + i;
  //     lscacheWebsql.set(currentKey, longString, i+1);
  //   }
  //   // Test that last-to-expire is still there
  //   equal(lscacheWebsql.get(currentKey), longString, 'We expect newest value to still be there');
  //   // Test that the first-to-expire is kicked out
  //   equal(lscacheWebsql.get(key + '0'), null, 'We expect oldest value to be kicked out (null)');

  //   // Test trying to add something thats bigger than previous items,
  //   // check that it is successfully added (requires removal of multiple keys)
  //   var veryLongString = longString + longString;
  //   lscacheWebsql.set(key + 'long', veryLongString, i+1);
  //   equal(lscacheWebsql.get(key + 'long'), veryLongString, 'We expect long string to get stored');

  //   // Try the same with no expiry times
  //   localStorage.clear();
  //   for (i = 0; i <= numKeys; i++) {
  //     currentKey = key + i;
  //     lscacheWebsql.set(currentKey, longString);
  //   }
  //   // Test that latest added is still there
  //   equal(lscacheWebsql.get(currentKey), longString, 'We expect value to be set');
  // });

  // We do these tests last since they must wait 1 minute each
  // asyncTest('Test isExpired() function', function () {
  //   var key = 'thekey',
  //       value = 'thevalue',
  //       a = new Automator();

  //   a.automate([ partial(lscacheWebsql.set, key, value, 1),
  //                61 * 1000,
  //                partial(lscacheWebsql.isExpired, key),
  //                partial(assertVal, true),
  //                start ]);
  // });

  // asyncTest('Testing set() and get() with string and expiration', function () {
  //   var key = 'thekey',
  //       value = 'thevalue',
  //       a = new Automator();

  //   a.automate([ partial(lscacheWebsql.set, key, value, 1),

  //                // Should be valid after 1 seconds
  //                1 * 1000,
  //                partial(lscacheWebsql.get, key),
  //                partial(assertVal, value),

  //                // Should be invalid after 61 seconds
  //                60 * 1000,
  //                partial(lscacheWebsql.get, key),
  //                partial(assertVal, null),
  //                start ]);
  // });

  // asyncTest('Test get() skipRemove/allowExpired parameters', function () {
  //   var key = 'thekey',
  //       value = 'thevalue',
  //       a = new Automator();

  //   a.automate([ partial(lscacheWebsql.set, key, value, 1),
  //                61 * 1000,

  //                // Include skipRemove parameter.  Should return null but
  //                // leave the value in the db
  //                partial(lscacheWebsql.get, key, true),
  //                partial(assertVal, null),

  //                // Include skipRemove and allowExpired.  Should return the
  //                // expired value and leave it in the db
  //                partial(lscacheWebsql.get, key, true, true),
  //                partial(assertVal, value),

  //                // Call with allowExpired but without skipRemove.  Should
  //                // return the expired value and remove it
  //                partial(lscacheWebsql.get, key, false, true),
  //                partial(assertVal, value),

  //                // Call normally, should return null because the item was
  //                // deleted last call
  //                partial(lscacheWebsql.get, key),
  //                partial(assertVal, null),

  //                start ]);
  // });

  //if (QUnit.config.autostart === false) {
    QUnit.start();
  //}
};

if (typeof module !== "undefined" && module.exports) {
  var lscacheWebsql = require('../lscache-websql');
  var qunit = require('qunit');
  startTests(lscacheWebsql);
} else if (typeof define === 'function' && define.amd) {
  QUnit.config.autostart = false;
  require(['../lscache-websql'], startTests);
} else {
  // Assuming that lscache has been properly included
  startTests(lscacheWebsql);
}
