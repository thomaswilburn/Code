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

	var chain = function(from, extension) {
		var f = function() {
			if (this.init) this.init();
		};
		f.prototype = from;
		var r = new f();
		if (extension) {
			extend(r, extension);
		}
		r.constructor = f;
		r.constructor.prototype = r;

		return r;
	};

	var augment = function(target, Interfaces) {
		if (typeof Interfaces == 'function') Interfaces = [Interfaces];
		for (var i = 0; i < Interfaces.length; i++) {
			Interfaces[i].call(target);
		}
		return target;
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

	var IEventDispatcher = function() {
		var attach = function(target) {
			var channel = {};
			var bind = function(event, callback) {
				if (!this.hasOwnProperty('bind')) {
					attach(this);
					return this.bind.apply(this, arguments);
				}
				if (!channel[event]) channel[event] = [];
				channel[event].push(callback);
			};
			var unbind = function(event, callback) {
				if (!this.hasOwnProperty('unbind')) {
					attach(this);
					return this.unbind.apply(this, arguments);
				};
				if (!callback) {
					channel[event] = [];
				} else {
					var filtered = [];
					for (var i = 0; i < channel[event].length; i++) {
						if (channel[event][i] != callback) {
							filtered.push(channel[event][i]);
						}
					}
					channel[event] = filtered;
				}
			};
			var trigger = function(event, data) {
				if (!this.hasOwnProperty('trigger')) {
					attach(this);
					return this.trigger.apply(this, arguments);
				}
				if (!channel[event]) return;
				for (var i = 0; i < channel[event].length; i++) {
					var f = channel[event][i];
					f(data);
				}
			};
			target.bind = target.subscribe = bind;
			target.unbind = target.unsubscribe = unbind;
			target.trigger = target.publish = trigger;
		}
		return function() {
			attach(this);
		}
	}();

	var IObservable = function() {
		var get = function(property) {
			return this[property];
		};
		var set = function(property, value) {
			this[property] = value;
			this.trigger('change');
		}
		return function() {
			this.get = get;
			this.set = set;
		}
	}();

	// SHIMS FOR BASE64
	if (typeof window.atob === 'undefined') {
		window.atob = decode64;
		window.btoa = encode64;
	}

	// Public module object
	var code = {
		assert: assert,
		extend: extend,
		commafy: commafy,
		inflate: inflate,
		chain: chain,
		augment: augment,
		desync: desync,
		xmlObjectify: xmlObjectify,
		map: map,
		reduce: reduce,
		encode64: encode64,
		decode64: decode64,
		IEventDispatcher: IEventDispatcher,
		IObservable: IObservable,
		Future: Future
	};

	//require.js support
	if (typeof define != 'undefined') {
		define('code', code);
	} else {
		window.code = code;
	}

})();
