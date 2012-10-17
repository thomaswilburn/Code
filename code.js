/**
* code - a small library for JavaScript
* Written by Thomas Wilburn
* Licensed under the WTFPL:
* http://sam.zoy.org/wtfpl/COPYING
*/

(function() {
	"use strict";

	// PRIVATE
	var templateCache = {};
	var translation = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
	var noop = function() {};

	// SHIM FOR FUNCTION.BIND
	// Note: this shim for bind() includes currying, but not constructor or callable checks
	if (typeof Function.prototype.bind == 'undefined') {
		Function.prototype.bind = function(context) {
			var f = this;
			var args = Array.prototype.slice.call(arguments, 1);
			return function() {
				f.apply(context, args.concat(Array.prototype.slice.call(arguments)));
			};
		};
	};

	var Future = function() {
		if (arguments.length) {
			var args = Array.prototype.slice.call(arguments);
			return Future.when.apply({}, args);
		}
		if (!(this instanceof Future)) return new Future();

		var resolved = false;
		var failed = false;
		var whenDone = [];
		var whenFailed = [];
		var whenEver = [];
		var args;

		this.resolve = function() {
			if (resolved) return;
			resolved = true;
			args = Array.prototype.slice.apply(arguments);
			var callbacks = whenDone.concat(whenEver);
			for (var i = 0; i < callbacks.length; i++) {
				var f = callbacks[i];
				f.apply(this, arguments);
			}
		}

		this.reject = function() {
			if (resolved) return;
			resolved = true;
			failed = true;
			args = Array.prototype.slice.apply(arguments);
			var callbacks = whenFailed.concat(whenEver);
			for (var i = 0; i < callbacks.length; i++) {
				var f = callbacks[i];
				f.apply(this, arguments);
			}
		}

		this.isResolved = function() {
			return resolved;
		}

		this.isFailed = function() {
			return failed;
		}

		this.done = function(f) {
			if (resolved && !failed) {
				f.apply(this, args);
			} else {
				whenDone.push(f);
			}
		}

		this.fail = function(f) {
			if (resolved && failed) {
				f.apply(this, args);
			} else {
				whenFailed.push(f);
			}
		}

		this.always = function(f) {
			if (resolved) {
				f.apply(this, args);
			} else {
				whenEver.push(f);
			}
		}

		this.promise = function(target) {
			target = target || {};
			target.done = this.done;
			target.fail = this.fail;
			target.always = this.always;
			target.isResolved = this.isResolved;
			target.isFailed = this.isFailed;
			return target;
		}

	};

	Future.wrap = function(f, context) {
		context = context || {};
		var wrapper = function() {
			var args = Array.prototype.slice.call(arguments);
			var deferred = new Future();
			args.push(deferred.resolve);
			f.apply(context, args);
			return deferred;
		};
		return wrapper;
	};

	Future.when = function() {
		var args = Array.prototype.slice.call(arguments);
		var resolvedCount = 0;
		var resolved = [];
		var when = new Future();
		for (var i = 0; i < args.length; i++) {
			var result = args[i]();
			if (typeof result.done != 'function') {
				resolved[i] = result;
				resolvedCount++;
			} else {
				var onResult = (function(n) {
					return function() {
						resolved[n] = Array.prototype.slice.call(arguments);
						resolvedCount++;
						if (resolvedCount == args.length) {
							when.resolve(resolved);
						}
					}
				})(i);
				result.done(onResult);
			}
		}
		if (resolvedCount == args.length) {
			when.resolve(resolved);
		}
		return when;
	}

	var assert = function(assertion, message) {
		if (assertion) {
			if (console && console.info) console.info('Pass: ' + message);
		} else {
			throw('Fail: ' + message);
		}
	}

	var extend = function(target, hash) {
		for (var key in hash) {
			var copy = hash[key];
			if (target === copy) {
				continue;
			}
			if (typeof copy !== 'undefined') {
				target[key] = copy;
	    }
		}
		return target;
	};

	var commafy = function(s) {
		s = s + "";
		var period = s.indexOf('.');
		if (period == -1) period = s.length;
		for (var i = (s.length - period) + 3; i < s.length; i +=4) {
			s = s.substr(0, s.length - i) + ',' + s.substr(s.length - i);
		}
		s = s.replace(/\-\,/, '-');
		s = s.replace(/\$\,/, '$');
		s = s.replace(/\$\-/, '-$');
		return s;
	};

	var inflate = function(template, replacements, prewrapped) {
		var input, keyList = [];
		if (templateCache[template]) {
			input = templateCache[template].text;
			keyList = templateCache[template].keys;
		} else {
			input = document.getElementById(template);
			if (!input) throw("Error in inflate(): no template for '" + template + ".'");
			input = input.innerHTML.replace(/^[\n\r\s]/, '').replace(/[\n\r\s]+$/, '');
			templateCache[template] = {};
			templateCache[template].text = input;
			templateCache[template].keys = [];
			var matches = input.match(/\{\{.*?\}\}/g);
			if (matches) for (var i = 0; i < matches.length; i++) {
				var match = matches[i].replace(/[{}]/g, '');
				templateCache[template].keys.push(match);
			}
			keyList = templateCache[template].keys;
		}
		var output = input;
		for (var j = 0; j < keyList.length; j++) {
			var key = keyList[j];
			var needle = '{{' + key + '}}';
			var sub = replacements && replacements[key] != undefined ? replacements[key] : "";
			output = output.replace(needle, sub);
		}
		if (prewrapped && typeof $ !== 'undefined') return $(output);
		return output;
	};

	var desync = function(f) {
		return function() {
			var args = arguments;
			setTimeout(function() {
				f.apply(this, args);
			}, 4);
		}
	};

	var xmlObjectify = function(xml) {
		if (xml.jquery) {
			xml = xml.get(0);
		}
		var i = 0, structure = { };
		var objectify = multimedia.xmlObjectify;
		var cast = function(untyped) {
			var typed;
			if (!parseFloat(untyped) && parseFloat(untyped) !== 0) {
				if (untyped.toLowerCase() == "true" || untyped.toLowerCase() == "false") {
					if (untyped.toLowerCase() == "true") {
						typed = true;
					} else {
						typed = false;
					}
				} else {
					typed = untyped;
				}
			} else {
				typed = parseFloat(untyped);
			}
			return typed;
		}

		var attrList = xml.attributes;
		if (attrList) for (i = 0; i < attrList.length; i++) {
			var attr = attrList[i].nodeName;
			var xmlVal = xml.getAttribute(attr) + "";
			structure[attr] = cast(xmlVal);
		}

		var childList = xml.childNodes;
		if (childList && childList.length) for (i = 0; i < childList.length; i++) {
			var branch = childList[i];
			var propName = branch.nodeName;
			if (propName == "#text") {
				if (branch.data && branch.data.replace(/[\W\n\r]/g, '')) {
					var textContent = branch.data;
					return cast(textContent);
				}
				continue;
			}
			if (propName == 'xml') continue;
			if (structure[propName]) {
				if (structure[propName].push) {
					structure[propName].push(objectify(branch));
				} else {
					var leaf = objectify(branch);
					structure[propName] = [structure[propName], leaf];
				}
			} else {
				structure[propName] = objectify(branch);
			}
		} else return null;

		return structure;
	};

	var map = function(a, f) {
		if (typeof a == 'function') {
			f = a;
			a = this;
		}
		var mapped = [];
		for (var i = 0; i < a.length; i++) {
			var prime = f(a[i], i);
			if (prime !== null) {
				mapped.push(prime);
			}
		}
		return mapped;
	};

	if (!Array.prototype.map) Array.prototype.map = map;

	var reduce = function(a, f, memo) {
		if (typeof a == 'function') {
			memo = f;
			f = a;
			a = this;
		}
		memo = typeof memo === 'undefined' ? 0 : memo;
		for (var i = 0; i < a.length; i++) {
			memo = f(a[i], memo);
		}
		return memo;
	};

	if (!Array.prototype.reduce) Array.prototype.reduce = reduce;

	var encode64 = function(plaintext) {
		var encoded = "";
		for (var i = 0; i < plaintext.length; i += 3) {
			var a = plaintext.charCodeAt(i);
			var b = plaintext.charCodeAt(i + 1);
			var c = plaintext.charCodeAt(i + 2);

			a = a << 16;
			b = !isNaN(b) ? b << 8 : 0;
			c = !isNaN(c) ? c : 0;

			var buffer = a + b + c;
			var chunk = "";

			var d = translation.charAt(buffer >> 18);
			var e = translation.charAt((buffer >> 12) & 0x3F);
			var f = translation.charAt((buffer >> 6) & 0x3F);
			var g = translation.charAt(buffer & 0x3F);

			if (c) {
				chunk = f + g;
			} else {
				chunk = "=";
				if (b) {
					chunk = f + chunk;
				} else {
					chunk = "=" + chunk;
				}
			}
			chunk = d + e + chunk;
			encoded += chunk;
		}
		return encoded;
	};

	var decode64 = function(cipher) {
		var decoded = "";
		for (var i = 0; i < cipher.length; i += 4) {
			var octets = 0;
			for (var j = 0; j < 4; j++) {
				var character = cipher.charAt(i + j);
				if (character && character != "=") {
					octets += translation.indexOf(character) << ((3 - j) * 6);
				}
			}

			var a = octets >> 16;
			var b = (octets >> 8) & 0xFF;
			var c = octets & 0xFF;

			decoded += String.fromCharCode(a);
			if (b) decoded += String.fromCharCode(b);
			if (c) decoded += String.fromCharCode(c);
		}
		return decoded;
	};

	// SHIMS FOR BASE64
	if (typeof window.atob === 'undefined') {
		window.atob = decode64;
		window.btoa = encode64;
	}

	var PubSub = function(onto) {

		if (!onto && !(this instanceof PubSub)) return new PubSub();
		var target = onto || this;

		var channels = {};

		target.on = function(event, callback, context) {
			if (!channels[event]) {
				channels[event] = [];
			}
			var channel = channels[event];
			context = context || {};
			channel.push({
				callback: callback,
				context: context
			});
		};

		target.off = function(event, callback) {
			if (!channels[event]) return;
			if (!callback) {
				channels[event] = [];
			} else {
				var channel = channels[event];
				var filtered = [];
				for (var i = 0; i < channel.length; i++) {
					if (channel[i].callback !== callback) {
						filtered.push(channel[i]);
					}
				}
				channels[event] = filtered;
			}
		}

		target.trigger = function(event) {
			if (!channels[event]) return;
			var args = Array.prototype.slice.call(arguments, 1);
			var callbacks = channels[event].slice(); //copy, so it's immutable during firing.
			for (var i = 0; i < callbacks.length; i++) {
				var f = callbacks[i].callback;
				var c = callbacks[i].context;
				setTimeout(function() {
					f.apply(c, args); //trigger each in the next tick.
				}, 0);
			}
		}
	};

	var Bag = function(array) {
	  if (!(this instanceof Bag)) return new Bag(array);
	  this.items = [];
	  if (array) {
	    if (typeof array.toArray != 'undefined') {
	      array = array.toArray();
	    }
	    this.items = this.items.concat(array);
	  }
	  this.length = this.items.length;
	};
	Bag.prototype = {
		push: function() {
		  this.items.push.apply(this.items, Array.prototype.slice.call(arguments));
		  this.length = this.items.length;
		  return this;
		},
		remove: function(item) {
		  var remaining = [];
		  for (var i = 0; i < this.items.length; i++) {
		    if (this.items[i] != item) remaining.push(this.items[i]);
		  }
		  this.items = remaining;
		  this.length = this.items.length;
		  return this;
		},
		first: function() {
		  return this.items[0];
		},
		at: function(n) {
		  return this.items[n];
		},
		filter: function(f) {
		  var filtered = [];
		  for (var i = 0; i < this.items.length; i++) {
		    if (f(this.items[i])) filtered.push(this.items[i]);
		  }
		  return new Bag(filtered);
		},
		map: function(f) {
		  var mapped = this.items.map(f);
		  return new Bag(mapped);
		},
		mapGet: function(p) {
		  return this.items.map(function(item) {
		    return item[p];
		  });
		},
		mapSet: function(p, value) {
		  for (var i = 0; i < this.items.length; i++) {
		    this.items[i][p] = value;
		  }
		  return this;
		},
		invoke: function(name) {
		  var args = Array.prototype.slice.call(arguments, 1);
		  var map = [];
		  for (var i = 0; i < this.items.length; i++) {
		    var item = this.items[i];
		    if (typeof item[name] != 'function') continue;
		    var result = item[name].apply(item, args);
		    if (typeof result != 'undefined') {
		      map.push(result);
		    }
		  }
		  return new Bag(map);
		},
		each: function(f) {
		  for (var i = 0; i < this.items.length; i++) {
		    f(this.items[i]);
		  }
		  return this;
		},
		toArray: function() {
		  return this.items;
		},
		combine: function() {
		  var args = Array.prototype.slice.call(arguments);
		  for (var i = 0; i < args.length; i++) {
		    var adding = args[i];
		    if (adding instanceof Bag) {
		      this.items = this.items.concat(adding.items);
		    } else {
		      this.items = this.items.concat(adding);
		    }
		    this.length = this.items.length;
		    return this;
		  }
		},
		query: function(selectors) {
		  selectors = selectors.split(',');
		  var matcher = '^\\s*(\\w+)\\s*([<>!~$*^?=]{0,2})\\s*\\"{0,1}([^\\"]*)\\"{0,1}\\s*$';
		  var tests = {
		    '=': function(a, b) { return a === b },
		    '>': function(a, b) { return a > b },
		    '>=': function(a, b) { return a >= b },
		    '<': function(a, b) { return a <= b },
		    '!=': function(a, b) { return a !== b },
		    '?': function(a) { return a },
		    '~=': function(a, b) {
		      if (typeof a.length == 'undefined') return false;
		      if (typeof Array.prototype.indexOf != 'undefined') {
		        return a.indexOf(b) != -1;
		      } else {
		        for (var i = 0; i < a.length; i++) {
		          if (a[i] == b) return true;
		        }
		        return false;
		      }
		    },
		    '^=': function(a, b) {
		      if (typeof a != 'string') return false;
		      return a.search(b) == 0
		    },
		    '$=': function(a, b) {
		      if (typeof a != 'string') return false;
		      return a.search(b) == a.length - b.length
		    },
		    '*=': function(a, b) {
		      if (typeof a != 'string') return false;
		      return a.search(b) != -1
		    },
		    fail: function() { return false }
		  }
		  for (var i = 0; i < selectors.length; i++) {
		    var parts = new RegExp(matcher).exec(selectors[i]);
		    if (!parts) throw('Bad selector: ' + selectors[i]);
		    selectors[i] = {
		      key: parts[1],
		      operator: parts[2]
		    };
		    var value = parts[3].replace(/^\s*|\s*$/g, '');
		    if (value == "true" || value == "false") {
		      value = value == "true";
		    } else if (value != "" && !isNaN(value)) {
		      value = parseFloat(value);
		    }
		    selectors[i].value = value;
		  };
		  var passed = [];
		  for (var i = 0; i < this.items.length; i++) {
		    var item = this.items[i];
		    var hit = true;
		    for (var j = 0; j < selectors.length; j++) {
		      var s = selectors[j];
		      if (typeof item[s.key] == 'undefined') {
		        hit = false;
		        break;
		      } else if (s.operator) {
		        var f = tests[s.operator] || tests.fail;
		        if (!f(item[s.key], s.value)) {
		          hit = false;
		          break;
		        }
		      }
		    }
		    if (hit) {
		      passed.push(item);
		    }
		  }
		  return new Bag(passed);
		}
	};

	var Machine = function(states, startAs) {
		if (!(this instanceof Machine)) return new Machine(states, startAs);
		this.states = states;
		this.currentState = startAs || null;
	};
	Machine.prototype = {
		states: null,
		currentState: null,
		trigger: function(event) {
			var args = Array.prototype.slice.call(arguments, 1);
			var state = this.states[this.currentState];
			var dest = state.events[event];
			if (dest && this.states[dest]) {
				if (typeof state.exit == 'function') state.exit.apply(this, args);
				this.currentState = dest;
				state = this.states[dest];
				if (typeof state.enter == 'function') state.enter.apply(this, args);
			}
		}
	};

	// Public module object
	var code = {
		assert: assert,
		extend: extend,
		commafy: commafy,
		inflate: inflate,
		desync: desync,
		xmlObjectify: xmlObjectify,
		map: map,
		reduce: reduce,
		encode64: encode64,
		decode64: decode64,
		PubSub: PubSub,
		ps: new PubSub(),
		Future: Future,
		Bag: Bag,
		Machine: Machine
	};

	//require.js support
	if (typeof define != 'undefined') {
		define('code', code);
	} else {
		window.code = code;
	}

})();
