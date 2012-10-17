Code.js
=======

Code.js is a small library of utility functions for working in JavaScript. I
started the first version of this while working at Congressional Quarterly,
and have been maintaining it ever since. It does not require jQuery (but will
use it, if it finds it).

The following functions are included in Code.js as of October 16, 2012. They
may change in the future.

* Future - a small implementation of promises/deferreds. Includes when() for
collecting deferreds and regular functions into one collective promise.

* Future.wrap() - converts CPS functions into functions that return promises.

* assert() - quick unit testing assertion, outputting to the console.

* extend() - combine two objects by key.

* commafy() - converts numbers to strings with commas inserted according to AP
style.

* inflate() - a small, non-recursive, Mustache-like templating function

* desync() - call a function after a short delay, but return immediately.
Useful for debugging across the AS3-JS bridge without locking up the Flash VM.

* xmlObjectify() - convert an XML document into a JavaScript native object.

* map/reduce() - standard map/reduce functions. Shimmed onto Array.prototype in
older browsers.

* PubSub - a constructor for PubSub objects. You can pass in an object to have
it extended with the on/off/trigger methods. Code also makes a singleton available
as code.ps.

* Bag - an unsorted collection type for objects, supporting some Underscore-like
features, as well as a "query" method for filtering against an arbitrary set of
attributes.

* Machine - a simple state machine that takes in an object with the following
characteristics:

    var stateList = {
      state_name: {
        enter_function: function() {},
        exit_function: function() {},
        events: {
          event_name: "destination_state"
        }
      }
    }

You can change the machine's state by calling trigger() and passing in a
string matching an event in the current state. Bad events are simply ignored.
Any additional arguments given to trigger() will be passed on to the enter()
and exit() functions, which are bound to the context of the Machine instance.

* encode64/decode64() - standard Base64 translation functions. Shimmed onto
atob() and btoa() in older browsers.

In addition, Code shims Function.bind in older browsers, just because it's too
useful to be without.

This library is in flux as I learn more about JavaScript, or change my habits.
For example, the inheritance functions chain() and augment() were removed
recently since I almost never use them (in favor of regular JavaScript
inheritance). I intend to be ruthless about this, since Code is not meant to
be a replacement for large libraries, but a simple script I can pull in for
quick projects. I've added it to github primarily to keep a history of excised
features, just in case.
