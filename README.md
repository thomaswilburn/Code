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

* encode64/decode64() - standard Base64 translation functions. Shimmed onto
atob() and btoa() in older browsers.

* IEventDispatcher - an interface for creating listeners. *Deprecated*, will be
removed in favor of a pub/sub object.

In addition, Code shims Function.bind in older browsers, just because it's too
useful to be without.

This library is in flux as I learn more about JavaScript, or change my habits.
For example, the inheritance functions chain() and augment() were removed
recently since I almost never use them (in favor of regular JavaScript
inheritance). I intend to be ruthless about this, since Code is not meant to
be a replacement for large libraries, but a simple script I can pull in for
quick projects. Here are a few other things I plan on adding in the future:

* A simple state machine, for handling UI and asynchronous processes.

* Pub/Sub, to replace the existing event interface.

* The Bag collection type from Grue.
