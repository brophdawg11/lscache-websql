lscache-websql
===============================
This is a simple library that provides an [**lscache**](https://github.com/pamelafox/lscache)-like API (using WebSQL instead of localStorage) so that you can cache data on the client and associate an expiration time with each piece of data.  It also provides the additional parameters and functions added by this [fork](https://github.com/brophdawg11/lscache) of the lscache library.  If WebSQL is not supported by the browser, the library degrades by simply not caching and all cache requests return null.

#### Dependencies
* jQuery - For now, for it's Deferred implementation.  The hope is to remove this dependency in the future :)

[Unit Tests](https://rawgithub.com/brophdawg11/lscache-websql/master/tests.html)

Methods
-------

The library exposes 5 methods: `set()`, `get()`, `remove()`, `flush()`, and `isExpired`.

* * *

### lscacheWebsql.set(key, value, mins)
Stores the value. Expires after specified number of minutes.
##### Arguments
1. `key` (**string**)
2. `value` (**Object|string**)
3. `mins` (**number: optional**)

##### Returns
jQuery.Promise to be resolved upon success, or rejected upon failure
* * *

### lscacheWebsql.get(key, skipRemove, allowExpired)
Retrieves specified value from localStorage, if not expired.
##### Arguments
1. `key` (**string**)
2. `skipRemove` (**boolean**) - Skip automatic deletion of a key/value pair if it has expired (default `false`)
3. `allowExpired` (**boolean**) - Allow expired values to be returned (default `false`)

##### Returns
jQuery.Promise to be resolved with the stored value, or rejected upon failure.  Returned values are attempted to be parsed back to their original form using JSON.parse()

* * *

### lscacheWebsql.remove(key)
Removes a value from localStorage.
##### Arguments
1. `key` (**string**)

##### Returns
jQuery.Promise to be resolved upon success, or rejected upon failure

* * *

### lscacheWebsql.flush()
Removes all items from webSql without affecting other data.

##### Returns
jQuery.Promise to be resolved upon success, or rejected upon failure

* * *

Usage
-------

The interface should be familiar to those of you who have used `memcache`, and should be easy to understand for those of you who haven't.

For example, you can store a string for 2 minutes using `lscacheWebsql.set()`:

```js
lscacheWebSql.set('greeting', 'Hello World!', 2)
             .done(function() { console.log('Woohoo!'); })
             .fail(function(e) { console.error('Uh oh: ' + e); }
```

You can then retrieve that string with `lscacheWebsql.get()`:

```js
lscacheWebsql.get('greeting')
             .done(function(val) { console.log(val); })
             .fail(function(e) { console.error('Uh oh: ' + e); }
```

You can remove that string from the cache entirely with `lscacheWebsql.remove()`:

```js
lscacheWebsql.remove('greeting')
             .done(function() { console.log('Woohoo!'); })
             .fail(function(e) { console.error('Uh oh: ' + e); }
```

You can remove all items from the cache entirely with `lscacheWebsql.flush()`:

```js
lscacheWebsql.flush();
             .done(function() { console.log('Woohoo!'); })
             .fail(function(e) { console.error('Uh oh: ' + e); }
```

The library also takes care of serializing objects, so you can store more complex data:

```js
lscacheWebsql.set('data', {'name': 'Pamela', 'age': 26}, 2);
```

And then when you retrieve it, you will get it back as an object:

```js
lscacheWebsql.get('data').name)
             .done(function(val) { console.log(val.name); })
             .fail(function(e) { console.error('Uh oh: ' + e); }
```

Browser Support
----------------

The `lscacheWebsql` library should work in all browsers where `WebSQL` is supported.
A list of those is here:
http://caniuse.com/#feat=sql-storage

