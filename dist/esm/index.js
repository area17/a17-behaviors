var commonjsGlobal$1 = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

function _typeof(obj) {
  "@babel/helpers - typeof";

  if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") {
    _typeof = function (obj) {
      return typeof obj;
    };
  } else {
    _typeof = function (obj) {
      return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
    };
  }

  return _typeof(obj);
}

function _classCallCheck(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

function _defineProperties(target, props) {
  for (var i = 0; i < props.length; i++) {
    var descriptor = props[i];
    descriptor.enumerable = descriptor.enumerable || false;
    descriptor.configurable = true;
    if ("value" in descriptor) descriptor.writable = true;
    Object.defineProperty(target, descriptor.key, descriptor);
  }
}

function _createClass(Constructor, protoProps, staticProps) {
  if (protoProps) _defineProperties(Constructor.prototype, protoProps);
  if (staticProps) _defineProperties(Constructor, staticProps);
  return Constructor;
}

var queryStringHandler = {
  // Doc: https://code.area17.com/a17/a17-helpers/wikis/queryStringHandler-toObject
  // Doc: https://code.area17.com/a17/a17-helpers/wikis/queryStringHandler-fromObject
  // Doc: https://code.area17.com/a17/a17-helpers/wikis/queryStringHandler-updateParameter
  toObject: function toObject(url) {
    /*
    URLSearchParams doesn't work in IE11 :-(
    https://caniuse.com/#search=URLSearchParams
    */
    if (typeof url !== 'string') {
      return {};
    }

    var qsObj = {};
    var search = url && url.indexOf('?') > -1 ? url.split('?')[1] : location.search;
    search.replace(new RegExp('([^?=&]+)(=([^&]*))?', 'g'), function ($0, $1, $2, $3) {
      qsObj[$1] = $3;
    });
    return qsObj;
  },
  fromObject: function fromObject(obj) {
    var queryString = '';
    var count = 0;

    if (Object.getOwnPropertyNames(obj).length > 0) {
      queryString = '?';

      for (var key in obj) {
        if (!obj.hasOwnProperty(key)) {
          continue;
        }

        queryString += (count > 0 ? '&' : '') + key + '=' + encodeURIComponent(obj[key]).replace(/[!'()*]/g, function (c) {
          return '%' + c.charCodeAt(0).toString(16);
        });
        count++;
      }
    }

    return queryString;
  },
  updateParameter: function updateParameter(url, key, value) {
    var re = new RegExp('([?&])' + key + '=.*?(&|#|$)', 'i');

    if (url.match(re)) {
      return url.replace(re, '$1' + key + '=' + value + '$2');
    } else {
      var hash = '';

      if (url.indexOf('#') !== -1) {
        hash = url.replace(/.*#/, '#');
        url = url.replace(/#.*/, '');
      }

      var separator = url.indexOf('?') !== -1 ? '&' : '?';
      return url + separator + key + '=' + value + hash;
    }
  }
};

var ajaxRequest = function ajaxRequest(settings) {
  // Doc: https://code.area17.com/a17/a17-helpers/wikis/ajaxRequest
  // This is a modified version to accept a new sendJSON boolean
  // to send the request with the right content type and data
  var options = settings;
  var request = new XMLHttpRequest();
  var requestUrl = options.url;
  options.queryString = '';

  if (options.data !== undefined && !options.sendJSON) {
    if (queryStringHandler.fromObject) {
      options.queryString = queryStringHandler.fromObject(options.data);
    } else {
      throw new ReferenceError('Missing: queryStringHandler.fromObject');
    }
  }

  if (options.type !== 'POST') {
    requestUrl += requestUrl.indexOf('?') > 0 ? options.queryString.replace('?', '&') : options.queryString;
  }

  request.open(options.type, requestUrl, true);
  request.setRequestHeader('X-Requested-With', 'XMLHttpRequest');

  if (options.type === 'POST') {
    request.setRequestHeader('Content-Type', options.sendJSON ? 'application/json' : 'application/x-www-form-urlencoded; charset=UTF-8');
  }

  if (options.requestHeaders !== undefined && options.requestHeaders.length > 0) {
    for (var i = 0; i < options.requestHeaders.length; i++) {
      var header = options.requestHeaders[i].header;
      var value = options.requestHeaders[i].value;

      if (header !== undefined && value !== undefined) {
        request.setRequestHeader(header, value);
      }
    }
  }

  request.onload = function () {
    if (request.status >= 200 && request.status < 400) {
      // Success!
      if (_typeof(options.onSuccess).toLowerCase() === 'function') {
        options.onSuccess.call(this, request.responseText, request.status);
      }
    } else {
      if (_typeof(options.onError).toLowerCase() === 'function') {
        options.onError.call(this, request.responseText, request.status);
      }

      console.log('We reached our target server, but it returned an error: ' + request.statusText);
    }
  };

  request.onerror = function () {
    console.log('There was a connection error of some sort');

    if (_typeof(options.onError).toLowerCase() === 'function') {
      options.onError.call(this, request.responseText, request.status);
    }
  };

  request.send(options.type === 'POST' ? options.sendJSON ? options.data : options.queryString.replace('?', '') : '');
  return request;
};

var cookieHandler = {
  // Doc: https://code.area17.com/a17/a17-helpers/wikis/cookieHandler-create
  // Doc: https://code.area17.com/a17/a17-helpers/wikis/cookieHandler-delete
  // Doc: https://code.area17.com/a17/a17-helpers/wikis/cookieHandler-read
  create: function create(name, value, days) {
    var expires = '';

    if (days) {
      var date = new Date();
      date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
      expires = '; expires=' + date.toGMTString();
    }

    document.cookie = name + '=' + value + expires + '; path=/';
  },
  "delete": function _delete(name) {
    if (name) {
      this.create(name, '', -1);
    }
  },
  read: function read(name) {
    if (name) {
      var nameEQ = name + '=';
      var ca = document.cookie.split(';');

      for (var i = 0; i < ca.length; i++) {
        var c = ca[i];

        while (c.charAt(0) === ' ') {
          c = c.substring(1, c.length);
        }

        if (c.indexOf(nameEQ) === 0) {
          return c.substring(nameEQ.length, c.length);
        }
      }

      return null;
    }

    return null;
  }
};

var copyTextToClipboard = function copyTextToClipboard(textToCopy, successMsg) {
  // https://code.area17.com/a17/a17-helpers/wikis/copyTextToClipboard
  // http://stackoverflow.com/questions/400212/how-do-i-copy-to-the-clipboard-in-javascript#answer-30810322
  // and then
  // https://stackoverflow.com/questions/47879184/document-execcommandcopy-not-working-on-chrome?rq=1&utm_medium=organic&utm_source=google_rich_qa&utm_campaign=google_rich_qa
  // https://stackoverflow.com/questions/400212/how-do-i-copy-to-the-clipboard-in-javascript?utm_medium=organic&utm_source=google_rich_qa&utm_campaign=google_rich_qa
  if (navigator.clipboard && 'Promise' in window && window.location.protocol == 'https:') {
    navigator.clipboard.writeText(textToCopy).then(function () {
      console.log(successMsg);
    }, function (err) {
      console.error('Could not copy text: ', err);
    });
  } else {
    var textArea = document.createElement('textarea');
    textArea.style.position = 'fixed';
    textArea.style.top = 0;
    textArea.style.left = 0;
    textArea.style.width = '2em';
    textArea.style.height = '2em';
    textArea.style.padding = 0;
    textArea.style.border = 'none';
    textArea.style.outline = 'none';
    textArea.style.boxShadow = 'none';
    textArea.style.background = 'transparent'; //textArea.value = textToCopy;

    textArea.textContent = textToCopy;
    document.body.appendChild(textArea);
    var selection = document.getSelection();
    var range = document.createRange();
    range.selectNode(textArea);
    selection.removeAllRanges();
    selection.addRange(range);

    try {
      var successful = document.execCommand('copy');

      if (successful) {
        window.alert(successMsg || 'Copied to clipboard');
      } else {
        console.log('Could not copy text');
      }
    } catch (err) {
      console.log('Could not copy text');
    }

    document.body.removeChild(textArea);
  }
};

var getCurrentMediaQuery = function getCurrentMediaQuery() {
  // Doc: https://code.area17.com/a17/a17-helpers/wikis/getCurrentMediaQuery
  return getComputedStyle(document.documentElement).getPropertyValue('--breakpoint').trim();
};

var isBreakpoint = function isBreakpoint(bp) {
  // Doc: https://code.area17.com/a17/a17-helpers/wikis/isBreakpoint
  // bail if no breakpoint is passed
  if (!bp) {
    console.error('You need to pass a breakpoint name!');
    return false;
  } // we only want to look for a specific modifier and make sure it is at the end of the string


  var pattern = new RegExp('\\+$|\\-$'); // bps must be in order from smallest to largest

  var bps = ['xs', 'md', 'lg', 'xl', 'xxl']; // override the breakpoints if the option is set on the global A17 object

  if (window.A17 && window.A17.breakpoints) {
    if (Array.isArray(window.A17.breakpoints)) {
      bps = window.A17.breakpoints;
    } else {
      console.warn('A17.breakpoints should be an array. Using defaults.');
    }
  } // store current breakpoint in use


  var currentBp = getCurrentMediaQuery(); // store the index of the current breakpoint

  var currentBpIndex = bps.indexOf(currentBp); // check to see if bp has a + or - modifier

  var hasModifier = pattern.exec(bp); // store modifier value

  var modifier = hasModifier ? hasModifier[0] : false; // store the trimmed breakpoint name if a modifier exists, if not, store the full queried breakpoint name

  var bpName = hasModifier ? bp.slice(0, -1) : bp; // store the index of the queried breakpoint

  var bpIndex = bps.indexOf(bpName); // let people know if the breakpoint name is unrecognized

  if (bpIndex < 0) {
    console.warn('Unrecognized breakpoint. Supported breakpoints are: ' + bps.join(', '));
    return false;
  } // compare the modifier with the index of the current breakpoint in the bps array with the index of the queried breakpoint.
  // if no modifier is set, compare the queried breakpoint name with the current breakpoint name


  if (modifier === '+' && currentBpIndex >= bpIndex || modifier === '-' && currentBpIndex <= bpIndex || !modifier && bp === currentBp) {
    return true;
  } // the current breakpoint isn’t the one you’re looking for


  return false;
};

var purgeProperties = function purgeProperties(obj) {
  // Doc: https://code.area17.com/a17/a17-helpers/wikis/purgeProperties
  for (var prop in obj) {
    if (obj.hasOwnProperty(prop)) {
      delete obj[prop];
    }
  } // alternatives considered: https://jsperf.com/deleting-properties-from-an-object

};

function Behavior$1(node) {
  var _this = this;

  var config = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

  if (!node || !(node instanceof Element)) {
    throw new Error('Node argument is required');
  }

  this.$node = node;
  this.options = Object.assign({}, config.options || {});
  this.__subBehaviors = [];
  this.__isEnabled = false;
  this.__children = config.children; // Auto-bind all custom methods to "this"

  this.customMethodNames.forEach(function (methodName) {
    _this[methodName] = _this[methodName].bind(_this);
  });
  this._binds = {};
  this._data = new Proxy(this._binds, {
    set: function set(target, key, value) {
      _this.updateBinds(key, value);

      target[key] = value;
      return true;
    }
  });
  return this;
}

Behavior$1.prototype = Object.freeze({
  updateBinds: function updateBinds(key, value) {
    var _this2 = this;

    // TODO: cache these before hand?
    var targetEls = this.$node.querySelectorAll('[data-' + this.name.toLowerCase() + '-bindel*=' + key + ']');
    targetEls.forEach(function (target) {
      target.innerHTML = value;
    }); // TODO: cache these before hand?

    var targetAttrs = this.$node.querySelectorAll('[data-' + this.name.toLowerCase() + '-bindattr*="' + key + ':"]');
    targetAttrs.forEach(function (target) {
      var bindings = target.dataset[_this2.name.toLowerCase() + 'Bindattr'];
      bindings.split(',').forEach(function (pair) {
        pair = pair.split(':');

        if (pair[0] === key) {
          if (pair[1] === 'class') {
            // TODO: needs to know what the initial class was to remove it - fix?
            if (_this2._binds[key] !== value) {
              target.classList.remove(_this2._binds[key]);
            }

            if (value) {
              target.classList.add(value);
            }
          } else {
            target.setAttribute(pair[1], value);
          }
        }
      });
    });
  },
  init: function init() {
    // Get options from data attributes on node
    var regex = new RegExp('^data-' + this.name + '-(.*)', 'i');

    for (var i = 0; i < this.$node.attributes.length; i++) {
      var attr = this.$node.attributes[i];
      var matches = regex.exec(attr.nodeName);

      if (matches != null && matches.length >= 2) {
        if (this.options[matches[1]]) {
          console.warn("Ignoring ".concat(matches[1], " option, as it already exists on the ").concat(name, " behavior. Please choose another name."));
        }

        this.options[matches[1]] = attr.value;
      }
    } // Behavior-specific lifecycle


    if (this.lifecycle.init != null) {
      this.lifecycle.init.call(this);
    }

    if (this.lifecycle.resized != null) {
      this.__resizedBind = this.__resized.bind(this);
      window.addEventListener('resized', this.__resizedBind);
    }

    if (this.lifecycle.mediaQueryUpdated != null || this.options.media) {
      this.__mediaQueryUpdatedBind = this.__mediaQueryUpdated.bind(this);
      window.addEventListener('mediaQueryUpdated', this.__mediaQueryUpdatedBind);
    }

    if (this.options.media) {
      this.__toggleEnabled();
    } else {
      this.enable();
    }
  },
  destroy: function destroy() {
    if (this.__isEnabled === true) {
      this.disable();
    } // Behavior-specific lifecycle


    if (this.lifecycle.destroy != null) {
      this.lifecycle.destroy.call(this);
    }

    this.__subBehaviors.forEach(function (sub) {
      sub.destroy();
    });

    if (this.lifecycle.resized != null) {
      window.removeEventListener('resized', this.__resizedBind);
    }

    if (this.lifecycle.mediaQueryUpdated != null || this.options.media) {
      window.removeEventListener('mediaQueryUpdated', this.__mediaQueryUpdatedBind);
    }

    purgeProperties(this);
  },
  getChild: function getChild(childName, context) {
    var multi = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;

    if (context == null) {
      context = this.$node;
    }

    if (this.__children != null && this.__children[childName] != null) {
      return this.__children[childName];
    }

    return context[multi ? 'querySelectorAll' : 'querySelector']('[data-' + this.name.toLowerCase() + '-' + childName.toLowerCase() + ']');
  },
  getChildren: function getChildren(childName, context) {
    return this.getChild(childName, context, true);
  },
  isEnabled: function isEnabled() {
    return this.__isEnabled;
  },
  enable: function enable() {
    this.__isEnabled = true;

    if (this.lifecycle.enabled != null) {
      this.lifecycle.enabled.call(this);
    }
  },
  disable: function disable() {
    this.__isEnabled = false;

    if (this.lifecycle.disabled != null) {
      this.lifecycle.disabled.call(this);
    }
  },
  addSubBehavior: function addSubBehavior(Behavior, node) {
    var config = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    var subBehavior = new Behavior(node, config);
    subBehavior.behaviorName = this.name;
    subBehavior.init();

    this.__subBehaviors.push(subBehavior);

    return subBehavior;
  },
  __toggleEnabled: function __toggleEnabled() {
    var isValidMQ = isBreakpoint(this.options.media);

    if (isValidMQ && !this.__isEnabled) {
      this.enable();
    } else if (!isValidMQ && this.__isEnabled) {
      this.disable();
    }
  },
  __mediaQueryUpdated: function __mediaQueryUpdated() {
    if (this.lifecycle.mediaQueryUpdated != null) {
      this.lifecycle.mediaQueryUpdated.call(this);
    }

    if (this.options.media) {
      this.__toggleEnabled();
    }
  },
  __resized: function __resized() {
    if (this.lifecycle.resized != null) {
      this.lifecycle.resized.call(this);
    }
  }
});

var createBehavior$1 = function createBehavior(name, def) {
  var lifecycle = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

  var fn = function fn() {
    for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    Behavior$1.apply(this, args);
  };

  var customMethodNames = [];
  var customProperties = {
    name: {
      get: function get() {
        return this.behaviorName;
      }
    },
    behaviorName: {
      value: name,
      writable: true
    },
    lifecycle: {
      value: lifecycle
    },
    customMethodNames: {
      value: customMethodNames
    }
  }; // Expose the definition properties as 'this[methodName]'

  var defKeys = Object.keys(def);
  defKeys.forEach(function (key) {
    customMethodNames.push(key);
    customProperties[key] = {
      value: def[key],
      writable: true
    };
  });
  fn.prototype = Object.create(Behavior$1.prototype, customProperties);
  return fn;
};

var debounce = function debounce(func, wait, immediate) {
  // Doc: https://code.area17.com/a17/a17-helpers/wikis/debounce
  var timeout;
  return function () {
    var context = this;
    var args = arguments;

    var later = function later() {
      timeout = null;

      if (!immediate) {
        func.apply(context, args);
      }
    };

    var callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);

    if (callNow) {
      func.apply(context, args);
    }
  };
};

var escapeString = function escapeString(str) {
  // Doc: https://code.area17.com/a17/a17-helpers/wikis/escapeString
  if (typeof str === 'string') {
    var div = document.createElement('div');
    var text = document.createTextNode(str.replace(/<[^>]*>?/g, ''));
    div.appendChild(text);
    return encodeURIComponent(div.textContent);
  } else {
    return '';
  }
};

var extend = function extend() {
  // Doc: https://code.area17.com/a17/a17-helpers/wikis/extend
  var obj = {};
  var i = 0;
  var argumentsLength = arguments.length;
  var key;

  for (; i < argumentsLength; i++) {
    for (key in arguments[i]) {
      if (arguments[i].hasOwnProperty(key)) {
        obj[key] = arguments[i][key];
      }
    }
  }

  return obj;
};

var focusDisplayHandler = function focusDisplayHandler() {
  // Doc: https://code.area17.com/a17/a17-helpers/wikis/focusDisplayHandler
  var attr = 'data-focus-method';
  var touch = 'touch';
  var mouse = 'mouse';
  var key = 'key';
  var focusMethod = false;
  var lastFocusMethod;

  function _onKeyDown() {
    focusMethod = key;
  }

  function _onMouseDown() {
    if (focusMethod === touch) {
      return;
    }

    focusMethod = mouse;
  }

  function _onTouchStart() {
    focusMethod = touch;
  }

  function _onFocus(event) {
    if (!focusMethod) {
      focusMethod = lastFocusMethod;
    }

    if (event.target && typeof event.target.setAttribute === 'function') {
      event.target.setAttribute(attr, focusMethod);
      lastFocusMethod = focusMethod;
      focusMethod = false;
    }
  }

  function _onBlur(event) {
    if (event.target && typeof event.target.removeAttribute === 'function') {
      event.target.removeAttribute(attr);
    }
  }

  function _onWindowBlur() {
    focusMethod = false;
  }

  document.addEventListener('keydown', _onKeyDown, true);
  document.addEventListener('mousedown', _onMouseDown, true);
  document.addEventListener('touchstart', _onTouchStart, true);
  document.addEventListener('focus', _onFocus, true);
  document.addEventListener('blur', _onBlur, true);
  window.addEventListener('blur', _onWindowBlur);
};

function focusTrap() {
  var element;

  function _focus() {
    if (element) {
      if (document.activeElement !== element && !element.contains(document.activeElement)) {
        setTimeout(function () {
          element.focus();

          if (element !== document.activeElement) {
            var focusable = element.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
            focusable[0].focus();
          }
        }, 0);
      }
    } else {
      try {
        document.removeEventListener('focus', _focus);
      } catch (err) {}
    }
  }

  function _trap(event) {
    try {
      document.removeEventListener('focus', _focus);
    } catch (err) {}

    if (!event && !event.detail.element) {
      return;
    }

    element = event.detail.element;
    document.addEventListener('focus', _focus, true);
  }

  function _untrap() {
    document.removeEventListener('focus', _focus);
    element = null;
  }

  document.addEventListener('focus:trap', _trap, false);
  document.addEventListener('focus:untrap', _untrap, false);
}

var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof commonjsGlobal$1 !== 'undefined' ? commonjsGlobal$1 : typeof self !== 'undefined' ? self : {};

function createCommonjsModule(fn, module) {
	return module = { exports: {} }, fn(module, module.exports), module.exports;
}

var fontfaceonload = createCommonjsModule(function (module, exports) {
(function (root, factory) {
	{
		// Node. Does not work with strict CommonJS, but
		// only CommonJS-like environments that support module.exports,
		// like Node.
		module.exports = factory();
	}
}(commonjsGlobal, function () {

	var TEST_STRING = 'AxmTYklsjo190QW',
		SANS_SERIF_FONTS = 'sans-serif',
		SERIF_FONTS = 'serif',

		defaultOptions = {
			tolerance: 2, // px
			delay: 100,
			glyphs: '',
			success: function() {},
			error: function() {},
			timeout: 5000,
			weight: '400', // normal
			style: 'normal',
			window: window
		},

		// See https://github.com/typekit/webfontloader/blob/master/src/core/fontruler.js#L41
		style = [
			'display:block',
			'position:absolute',
			'top:-999px',
			'left:-999px',
			'font-size:48px',
			'width:auto',
			'height:auto',
			'line-height:normal',
			'margin:0',
			'padding:0',
			'font-variant:normal',
			'white-space:nowrap'
		],
		html = '<div style="%s" aria-hidden="true">' + TEST_STRING + '</div>';

	var FontFaceOnloadInstance = function() {
		this.fontFamily = '';
		this.appended = false;
		this.serif = undefined;
		this.sansSerif = undefined;
		this.parent = undefined;
		this.options = {};
	};

	FontFaceOnloadInstance.prototype.getMeasurements = function () {
		return {
			sansSerif: {
				width: this.sansSerif.offsetWidth,
				height: this.sansSerif.offsetHeight
			},
			serif: {
				width: this.serif.offsetWidth,
				height: this.serif.offsetHeight
			}
		};
	};

	FontFaceOnloadInstance.prototype.load = function () {
		var startTime = new Date(),
			that = this,
			serif = that.serif,
			sansSerif = that.sansSerif,
			parent = that.parent,
			appended = that.appended,
			dimensions,
			options = that.options,
			ref = options.reference;

		function getStyle( family ) {
			return style
				.concat( [ 'font-weight:' + options.weight, 'font-style:' + options.style ] )
				.concat( "font-family:" + family )
				.join( ";" );
		}

		var sansSerifHtml = html.replace( /\%s/, getStyle( SANS_SERIF_FONTS ) ),
			serifHtml = html.replace( /\%s/, getStyle(  SERIF_FONTS ) );

		if( !parent ) {
			parent = that.parent = options.window.document.createElement( "div" );
		}

		parent.innerHTML = sansSerifHtml + serifHtml;
		sansSerif = that.sansSerif = parent.firstChild;
		serif = that.serif = sansSerif.nextSibling;

		if( options.glyphs ) {
			sansSerif.innerHTML += options.glyphs;
			serif.innerHTML += options.glyphs;
		}

		function hasNewDimensions( dims, el, tolerance ) {
			return Math.abs( dims.width - el.offsetWidth ) > tolerance ||
				Math.abs( dims.height - el.offsetHeight ) > tolerance;
		}

		function isTimeout() {
			return ( new Date() ).getTime() - startTime.getTime() > options.timeout;
		}

		(function checkDimensions() {
			if( !ref ) {
				ref = options.window.document.body;
			}
			if( !appended && ref ) {
				ref.appendChild( parent );
				appended = that.appended = true;

				dimensions = that.getMeasurements();

				// Make sure we set the new font-family after we take our initial dimensions:
				// handles the case where FontFaceOnload is called after the font has already
				// loaded.
				sansSerif.style.fontFamily = that.fontFamily + ', ' + SANS_SERIF_FONTS;
				serif.style.fontFamily = that.fontFamily + ', ' + SERIF_FONTS;
			}

			if( appended && dimensions &&
				( hasNewDimensions( dimensions.sansSerif, sansSerif, options.tolerance ) ||
				hasNewDimensions( dimensions.serif, serif, options.tolerance ) ) ) {

				options.success();
			} else if( isTimeout() ) {
				options.error();
			} else {
				if( !appended && "requestAnimationFrame" in options.window ) {
					options.window.requestAnimationFrame( checkDimensions );
				} else {
					options.window.setTimeout( checkDimensions, options.delay );
				}
			}
		})();
	}; // end load()

	FontFaceOnloadInstance.prototype.cleanFamilyName = function( family ) {
		return family.replace( /[\'\"]/g, '' ).toLowerCase();
	};

	FontFaceOnloadInstance.prototype.cleanWeight = function( weight ) {
		// lighter and bolder not supported
		var weightLookup = {
			normal: '400',
			bold: '700'
		};

		return '' + (weightLookup[ weight ] || weight);
	};

	FontFaceOnloadInstance.prototype.checkFontFaces = function( timeout ) {
		var _t = this;
		_t.options.window.document.fonts.forEach(function( font ) {
			if( _t.cleanFamilyName( font.family ) === _t.cleanFamilyName( _t.fontFamily ) &&
				_t.cleanWeight( font.weight ) === _t.cleanWeight( _t.options.weight ) &&
				font.style === _t.options.style ) {
				font.load().then(function() {
					_t.options.success( font );
					_t.options.window.clearTimeout( timeout );
				});
			}
		});
	};

	FontFaceOnloadInstance.prototype.init = function( fontFamily, options ) {
		var timeout;

		for( var j in defaultOptions ) {
			if( !options.hasOwnProperty( j ) ) {
				options[ j ] = defaultOptions[ j ];
			}
		}

		this.options = options;
		this.fontFamily = fontFamily;

		// For some reason this was failing on afontgarde + icon fonts.
		if( !options.glyphs && "fonts" in options.window.document ) {
			if( options.timeout ) {
				timeout = options.window.setTimeout(function() {
					options.error();
				}, options.timeout );
			}

			this.checkFontFaces( timeout );
		} else {
			this.load();
		}
	};

	var FontFaceOnload = function( fontFamily, options ) {
		var instance = new FontFaceOnloadInstance();
		instance.init(fontFamily, options);

		return instance;
	};

	return FontFaceOnload;
}));
});

var fontLoadObserver = function fontLoadObserver(fonts) {
  // Doc: https://code.area17.com/a17/a17-helpers/wikis/fontLoadObserver
  if (_typeof(fonts).toLowerCase() !== 'object') {
    return false;
  }

  var counter = 0;
  var total = fonts.variants.length; // cookie name

  var cookieName = 'A17_fonts_cookie_' + fonts.name; // check we have cookie of fonts already loaded or not

  var cookie = cookieHandler.read(cookieName) || ''; // when a fonts is determined to be loaded

  function loaded() {
    counter++; // if we reached the total

    if (counter >= total) {
      document.documentElement.className += ' s-' + fonts.name + '-loaded';
      cookieHandler.create(cookieName, total, 1);
      document.dispatchEvent(new CustomEvent('page:updated'));
    }
  } // if cookie, show fonts (not first page load)


  if (cookie && cookie === total.toString()) {
    counter = cookie;
    loaded();
  } else {
    for (var i = 0; i < total; i++) {
      fontfaceonload(fonts.variants[i].name, {
        success: loaded,
        error: loaded,
        weight: fonts.variants[i].weight || '',
        timeout: 3000
      });
    }
  }
};

var getIndex = function getIndex(node, nodeList) {
  // Doc: https://code.area17.com/a17/a17-helpers/wikis/getIndex
  var nodes = nodeList || node.parentNode.childNodes;
  var nodesLength = nodes.length;
  var n = 0;

  for (var i = 0; i < nodesLength; i++) {
    if (nodes[i] === node) {
      return n;
    }

    if (nodes[i].nodeType === 1) {
      n++;
    }
  }

  return -1;
};

var getMetaContentByName = function getMetaContentByName(name) {
  // Doc: https://code.area17.com/a17/a17-helpers/wikis/getMetaContentByName
  return document.querySelector('meta[name=\'' + name + '\']').getAttribute('content');
};

var getOffset = function getOffset(node) {
  // Doc: https://code.area17.com/a17/a17-helpers/wikis/getOffset
  if (node) {
    var rect = node.getBoundingClientRect();
    return {
      top: rect.top + (document.documentElement.scrollTop || document.body.scrollTop),
      left: rect.left + (document.documentElement.scrollLeft || document.body.scrollLeft),
      bottom: rect.bottom + (document.documentElement.scrollTop || document.body.scrollTop),
      right: rect.right + (document.documentElement.scrollLeft || document.body.scrollLeft),
      width: rect.width,
      height: rect.height
    };
  } else {
    return null;
  }
};

var getUrlParameterByName = function getUrlParameterByName(name, url) {
  // Doc: https://code.area17.com/a17/a17-helpers/wikis/getUrlParameterByName
  var qsObj = queryStringHandler.toObject(url || undefined);
  return qsObj[name] !== undefined ? qsObj[name] : undefined;
};

function ios100vhFix() {
  function setVh() {
    var vh = document.documentElement.clientHeight * 0.01;
    document.documentElement.style.setProperty('--vh', "".concat(vh, "px"));
  }

  window.addEventListener('resize', setVh);
  setVh();
}

var jsonpRequest = function jsonpRequest(settings) {
  // Doc: https://code.area17.com/a17/a17-helpers/wikis/jsonpRequest
  var options = settings;
  var script = document.createElement('script'); // sort out the data object

  options.data = options.data || {};
  options.data.callback = options.callback || 'callback'; // make a query string from the data objects

  options.queryString = '';

  if (options.data !== undefined) {
    if (queryStringHandler.fromObject) {
      options.queryString = queryStringHandler.fromObject(options.data);
    } else {
      console.log('Missing: queryStringHandler.fromObject');
    }
  } // give the script some attributes


  script.type = 'text/javascript';
  script.src = options.url + options.queryString; // look for timeouts

  var timeout = setTimeout(function () {
    // wipe callback function
    window[options.data.callback] = function () {}; // run error function if specified


    if (_typeof(options.onError).toLowerCase() === 'function') {
      options.onError.call(this);
    }
  }, (options.timeout || 5) * 1000); // set up the callback

  window[options.data.callback] = function (data) {
    // no need to clear timeout
    clearTimeout(timeout); // run success function if specified

    if (_typeof(options.onSuccess).toLowerCase() === 'function') {
      options.onSuccess.call(this, data);
    }
  }; // append the script (or go go go!)


  document.getElementsByTagName('head')[0].appendChild(script);
};

var keyCodes = {
  tab: 9,
  enter: 13,
  esc: 27,
  space: 32,
  left: 37,
  up: 38,
  right: 39,
  down: 40
};

// A A17-helperised version of: https://github.com/area17/lazyload
// This version: v2.1.1 - 2018-04-01
// Doc: https://code.area17.com/a17/a17-helpers/wikis/lazyload
var lazyLoad = function lazyLoad(opts) {
  var options = {
    pageUpdatedEventName: 'page:updated',
    // how your app tells the rest of the app an update happened
    elements: 'img[data-src], img[data-srcset], source[data-srcset], iframe[data-src], video[data-src], [data-lazyload]',
    // maybe you just want images?
    rootMargin: '0px',
    // IntersectionObserver option
    threshold: 0,
    // IntersectionObserver option
    maxFrameCount: 10 // 60fps / 10 = 6 times a second

  }; // set up

  var frameLoop;
  var frameCount;
  var els = [];
  var elsLength;
  var observer;
  var checkType;
  /**
   * Converts HTML collections to an array
   * @private
   * @param {Array} array to convert
   * a loop will work in more browsers than the slice method
   */

  function _htmlCollectionToArray(collection) {
    var a = [];
    var i = 0;

    for (a = [], i = collection.length; i;) {
      a[--i] = collection[i];
    }

    return a;
  }
  /**
   * Checks if an element is in the viewport
   * @private
   * @param {Node} element to check.
   * @returns {Boolean} true/false.
   */


  function _elInViewport(el) {
    el = el.tagName === 'SOURCE' ? el.parentNode : el;
    var rect = el.getBoundingClientRect();
    return rect.bottom > 0 && rect.right > 0 && rect.left < (window.innerWidth || document.documentElement.clientWidth) && rect.top < (window.innerHeight || document.documentElement.clientHeight);
  }
  /**
   * Removes data- attributes
   * @private
   * @param {Node} element to update
   */


  function _removeDataAttrs(el) {
    el.removeAttribute('data-src');
    el.removeAttribute('data-srcset');
    el.removeAttribute('data-lazyload');
  }
  /**
   * On loaded, removes event listener, removes data- attributes
   * @private
   */


  function _loaded() {
    this.removeEventListener('load', _loaded);

    _removeDataAttrs(this);
  }
  /**
   * Update an element
   * @private
   * @param {Node} element to update
   */


  function _updateEl(el) {
    var srcset = el.getAttribute('data-srcset');
    var src = el.getAttribute('data-src');
    var dlazyload = el.getAttribute('data-lazyload') !== null; //

    if (srcset) {
      // if source set, update and try picturefill
      el.setAttribute('srcset', srcset);

      if (window.picturefill) {
        window.picturefill({
          elements: [el]
        });
      }
    }

    if (src) {
      // if source set, update
      el.src = src;
    }

    if (dlazyload) {
      el.setAttribute('data-lazyloaded', '');
      el.removeEventListener('load', _loaded);

      _removeDataAttrs(el);
    }
  }
  /**
   * The callback from the IntersectionObserver
   * @private
   * @entries {Nodes} elements being observed by the IntersectionObserver
   */


  function _intersection(entries) {
    // Disconnect if we've already loaded all of the images
    if (elsLength === 0) {
      observer.disconnect();
    } // Loop through the entries


    for (var i = 0; i < entries.length; i++) {
      var entry = entries[i]; // Are we in viewport?

      if (entry.intersectionRatio > 0) {
        elsLength--; // Stop watching this and load the image

        observer.unobserve(entry.target);
        entry.target.addEventListener('load', _loaded, false);

        _updateEl(entry.target);
      }
    }
  }
  /**
   * Loops images, checks if in viewport, updates src/src-set
   * @private
   */


  function _setSrcs() {
    var i; // browser capability check

    if (checkType === 'really-old') {
      elsLength = els.length;

      for (i = 0; i < elsLength; i++) {
        if (els[i]) {
          _updateEl(els[i]);

          _removeDataAttrs(els[i]);
        }
      }

      els = [];
    } else if (checkType === 'old') {
      // debounce checking
      if (frameCount === options.maxFrameCount) {
        // update cache of this for the loop
        elsLength = els.length;

        for (i = 0; i < elsLength; i++) {
          // check if this array item exists, hasn't been loaded already and is in the viewport
          if (els[i] && els[i].lazyloaded === undefined && _elInViewport(els[i])) {
            // cache this array item
            var thisEl = els[i]; // set this array item to be undefined to be cleaned up later

            els[i] = undefined; // give this element a property to stop us running twice on one thing

            thisEl.lazyloaded = true; // add an event listener to remove data- attributes on load

            thisEl.addEventListener('load', _loaded, false); // update

            _updateEl(thisEl);
          }
        } // clean up array


        for (i = 0; i < elsLength; i++) {
          if (els[i] === undefined) {
            els.splice(i, 1);
          }
        } // reset var to decide if to continue running


        elsLength = els.length; // will shortly be set to 0 to start counting

        frameCount = -1;
      } // run again? kill if not


      if (elsLength > 0) {
        frameCount++;
        frameLoop = window.requestAnimationFrame(_setSrcs);
      }
    } else if (checkType === 'new') {
      observer = new IntersectionObserver(_intersection, {
        rootMargin: options.rootMargin,
        threshold: options.threshold
      });
      elsLength = els.length;

      for (i = 0; i < elsLength; i++) {
        if (els[i] && els[i].lazyloaded === undefined) {
          observer.observe(els[i]);
        }
      }
    }
  }
  /**
   * Gets the show on the road
   * @private
   */


  function _init() {
    // kill any old loops if there are any
    if (checkType === 'old') {
      try {
        cancelAnimationFrame(frameLoop);
      } catch (err) {}
    } else if (checkType === 'new') {
      try {
        observer.disconnect();
      } catch (err) {}
    } // grab elements to lazy load


    els = _htmlCollectionToArray(document.querySelectorAll(options.elements));
    elsLength = els.length;
    frameCount = options.maxFrameCount; // go go go

    _setSrcs();
  }
  /**
   * GO GO GO
   * @public
   * @param {object} options (see readme)
   */


  function _lazyLoad() {
    for (var item in opts) {
      if (opts.hasOwnProperty(item)) {
        options[item] = opts[item];
      }
    }

    if (!('addEventListener' in window) || !window.requestAnimationFrame || _typeof(document.body.getBoundingClientRect) === undefined) {
      checkType = 'really-old';
    } else if ('IntersectionObserver' in window) {
      checkType = 'new';
    } else {
      checkType = 'old';
    }

    _init();

    if (options.pageUpdatedEventName) {
      document.addEventListener(options.pageUpdatedEventName, _init, true);
    }
  }

  _lazyLoad();
};

function manageBehaviors$1(loadedBehaviorsModule) {
  var dataAttr = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'behavior';
  var loadedBehaviorNames = Object.keys(loadedBehaviorsModule);
  var loadedBehaviors = {};
  var activeBehaviors = new Map();

  function loopBehaviors(node, cb) {
    if (!('querySelectorAll' in node)) {
      // Ignore text or comment nodes
      return;
    }

    var behaviorNodes = [node].concat([].slice.call(node.querySelectorAll("[data-".concat(dataAttr, "]"))));

    var _loop = function _loop(i) {
      var behaviorNode = behaviorNodes[i];
      var behaviorNames = behaviorNode.dataset && behaviorNode.dataset[dataAttr] && behaviorNode.dataset[dataAttr].split(' ');

      if (behaviorNames) {
        behaviorNames.forEach(function (name) {
          cb(name, behaviorNode);
        });
      }
    };

    for (var i = 0; i < behaviorNodes.length; i++) {
      _loop(i);
    }
  }

  function destroyBehaviors(node) {
    loopBehaviors(node, function (bName, bNode) {
      var nodeBehaviors = activeBehaviors.get(bNode);

      if (!nodeBehaviors || !nodeBehaviors[bName]) {
        console.warn("No behavior ".concat(bName, " instance on:"), bNode);
        return;
      }

      nodeBehaviors[bName].destroy();
      delete nodeBehaviors[bName];

      if (Object.keys(nodeBehaviors).length === 0) {
        activeBehaviors["delete"](bNode);
      }
    });

    if (window.A17) {
      window.A17.activeBehaviors = activeBehaviors;
    }
  }

  function createBehaviors(node) {
    loopBehaviors(node, function (bName, bNode) {
      if (!loadedBehaviors[bName]) {
        console.warn("No loaded behavior called ".concat(bName));
        return;
      }

      var instance = new loadedBehaviors[bName](bNode);
      instance.init();
      var nodeBehaviors = activeBehaviors.get(bNode) || {};
      nodeBehaviors[bName] = instance;
      activeBehaviors.set(bNode, nodeBehaviors);
    });

    if (window.A17) {
      window.A17.activeBehaviors = activeBehaviors;
    }
  }

  function observeBehaviors() {
    var observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        if (mutation.removedNodes) {
          for (var i = 0; i < mutation.removedNodes.length; i++) {
            var node = mutation.removedNodes[i];
            destroyBehaviors(node);
          }
        }
      });
      mutations.forEach(function (mutation) {
        if (mutation.addedNodes) {
          for (var i = 0; i < mutation.addedNodes.length; i++) {
            var node = mutation.addedNodes[i];
            createBehaviors(node);
          }
        }
      });
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: false,
      characterData: false
    });
  }

  loadedBehaviorNames.forEach(function (name) {
    loadedBehaviors[name] = loadedBehaviorsModule[name];
  });
  createBehaviors(document);
  observeBehaviors();
}

var messages = function messages() {
  // Doc: https://code.area17.com/a17/a17-helpers/wikis/messages
  var target = document.querySelectorAll('[data-message-target]');

  if (target.length > 0) {
    target = target[0];
  } else {
    return;
  }

  var messageVisible = false;
  var messageTimer;
  var messages = [];
  var loadMessage = target.getAttribute('data-message') || false;
  var loadMessageType = target.getAttribute('data-message-type') || '';

  function createMessage(message, type) {
    var div = document.createElement('div');
    var span = document.createElement('span');
    span.textContent = message;
    div.appendChild(span);
    div.className = type !== '' ? 'message message--' + type + ' s-hide' : 'message s-hide';
    return div;
  }

  function hideMessage(div) {
    div.className += ' s-hide';
    setTimeout(function () {
      div.parentNode.removeChild(div);
    }, 250);
  }

  function showMessage(div, time) {
    messageVisible = true;
    target.appendChild(div);
    div.className = div.className.replace(new RegExp('(^|\\b)' + 's-hide'.split(' ').join('|') + '(\\b|$)', 'gi'), ' ');
    messageTimer = setTimeout(function () {
      hideMessage(div);
      messageVisible = false;
      messages = [];
    }, time || 3000);
  }

  function newMessage(data) {
    messages.push(createMessage(data.data.message, data.data.type || ''));

    if (!messageVisible) {
      showMessage(messages[messages.length - 1], data.data.time || false);
    } else {
      clearTimeout(messageTimer);
      hideMessage(messages[messages.length - 2]);
      showMessage(messages[messages.length - 1], data.data.time || false);
    }
  }

  document.addEventListener('message', newMessage, false);

  if (loadMessage && loadMessage.length > 0) {
    var loadMessageData = {
      data: {
        message: loadMessage,
        time: 5000,
        type: loadMessageType
      }
    };
    newMessage(loadMessageData);
  }
};

var objectifyForm = function objectifyForm(form) {
  // Doc: https://code.area17.com/a17/a17-helpers/wikis/objectifyForm
  var field;
  var obj = {};

  if (_typeof(form) === 'object' && form.nodeName === 'FORM') {
    var len = form.elements.length;

    for (var i = 0; i < len; i++) {
      field = form.elements[i];

      if (field.name && !field.disabled && field.type !== 'file' && field.type !== 'reset' && field.type !== 'submit' && field.type !== 'button') {
        if (field.type === 'select-multiple') {
          for (var j = form.elements[i].options.length - 1; j >= 0; j--) {
            if (field.options[j].selected) {
              obj[field.name] = field.options[j].value;
            }
          }
        } else if (field.type !== 'checkbox' && field.type !== 'radio' || field.checked) {
          obj[field.name] = field.value;
        }
      }
    }
  }

  return obj;
};

var oritentationChangeFix = function oritentationChangeFix() {
  // Doc: https://code.area17.com/a17/a17-helpers/wikis/oritentationChangeFix
  if (navigator.userAgent.match(/iPhone/i) || navigator.userAgent.match(/iPad/i)) {
    var viewportmeta = document.querySelector('meta[name="viewport"]');

    if (viewportmeta) {
      viewportmeta.content = 'width=device-width, minimum-scale=1.0, maximum-scale=1.0, initial-scale=1.0';
      document.body.addEventListener('gesturestart', function () {
        viewportmeta.content = 'width=device-width, minimum-scale=0.25, maximum-scale=1.6';
      }, false);
    }
  }
};

var resized = function resized() {
  // Doc: https://code.area17.com/a17/a17-helpers/wikis/resized
  var resizeTimer;
  var mediaQuery = getCurrentMediaQuery();

  function informApp() {
    // check media query
    var newMediaQuery = getCurrentMediaQuery(); // tell everything resized happened

    window.dispatchEvent(new CustomEvent('resized', {
      detail: {
        breakpoint: newMediaQuery
      }
    })); // if media query changed, tell everything

    if (newMediaQuery !== mediaQuery) {
      if (window.A17) {
        window.A17.currentMediaQuery = newMediaQuery;
      }

      window.dispatchEvent(new CustomEvent('mediaQueryUpdated', {
        detail: {
          breakpoint: newMediaQuery,
          prevBreakpoint: mediaQuery
        }
      }));
      mediaQuery = newMediaQuery;
    }
  }

  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(informApp, 250);
  });

  if (mediaQuery === '') {
    window.requestAnimationFrame(informApp);
  } else if (window.A17) {
    window.A17.currentMediaQuery = mediaQuery;
  }
};

function responsiveImageUpdate() {
  // Safari doesn't reassess srcset with resize
  // see: https://bugs.webkit.org/show_bug.cgi?id=149899
  // So on resize or ajax, it might pick a lower resolution image
  // and never change unless you refresh the browser
  // The fix:
  // on resized (debounced resize) and page:updated
  // adding an empty string to the sizes attribute
  // which will force the engine to reassess
  // see: https://github.com/ausi/respimagelint/issues/31#issuecomment-420441005
  function update() {
    var sources = document.querySelectorAll('img[srcset][sizes], source[srcset][sizes]');

    for (var i = 0; i < sources.length; i++) {
      sources[i].sizes += '';
    }
  }

  window.addEventListener('resized', update);
  document.addEventListener('page:updated', update);
}

var scrolled = function scrolled() {
  // Doc: https://code.area17.com/a17/a17-helpers/wikis/scrolled
  var lastScrollPos = 0;
  var prevScrollPos = -1;
  var ticking = false;
  window.addEventListener('scroll', function () {
    if (!ticking) {
      window.requestAnimationFrame(function () {
        lastScrollPos = window.pageYOffset;
        document.dispatchEvent(new CustomEvent('scrolled', {
          detail: {
            last: lastScrollPos,
            prev: prevScrollPos
          }
        }));
        prevScrollPos = lastScrollPos;
        ticking = false;
      });
    }

    ticking = true;
  });
};

var sendEventToSegmentio = function sendEventToSegmentio() {
  // Doc: https://code.area17.com/a17/a17-helpers/wikis/sentEventToSegmentio
  var analyticsReady = false;
  var tempStore = [];

  function pushAnalytics(data) {
    if (Object.getOwnPropertyNames(data).length > 0) {
      switch (data.type.toLowerCase()) {
        case 'track':
          analytics.track(data.name, data.properties || {});
          break;

        case 'page':
          analytics.page(data.category || '', data.name || '', data.properties || {});
          break;

        case 'identify':
          analytics.identify(data.userID || '', data.properties || {});
          break;
      }
    }
  }

  function pushOrStore(data) {
    if (analyticsReady) {
      pushAnalytics(data);
    } else {
      tempStore.push(data);
    }
  }

  function pushStored() {
    tempStore.forEach(function (obj, i) {
      pushAnalytics(obj);
      tempStore.splice(i, 1);
    });
  }

  function identify() {
    var userInfo = document.querySelector('meta[name=\'' + name + '\']').getAttribute('content');

    if (userInfo) {
      userInfo = userInfo.split(',');
      var identifyProps = {};
      userInfo.forEach(function (item) {
        var pair = item.split(':');
        identifyProps[pair[0]] = pair[1];
      });
      pushOrStore({
        type: 'identify',
        userID: identifyProps.id || '',
        properties: identifyProps
      });
    }
  }

  function init() {
    if ((typeof analytics === "undefined" ? "undefined" : _typeof(analytics)) !== undefined) {
      analytics.ready(function () {
        analytics.debug(false);
        analyticsReady = true;
        identify();
        pushStored();
      });
    } else {
      setTimeout(init, 1000);
    }
  }

  document.addEventListener('analytics', function (event) {
    pushOrStore(event.detail);
  });
  document.addEventListener('analytics_identify', identify);
  init();
};

var setFocusOnTarget = function setFocusOnTarget(node) {
  //https://code.area17.com/a17/a17-helpers/wikis/setFocusOnTarget
  node.focus();

  if (node !== document.activeElement) {
    node.setAttribute('tabindex', '-1');
    node.focus();
    node.removeAttribute('tabindex');
  }
};

/*
  Based on of Beedle.js (with an unsubscribe mechanism inspired bv vuex)
  https://github.com/andy-piccalilli/beedle

  A demo is available here : http://bp7store.dev.area17.com/
*/
var Store = /*#__PURE__*/function () {
  function Store(params) {
    _classCallCheck(this, Store);

    var self = this; // Add some default objects to hold our actions, mutations and state

    self.actions = {};
    self.mutations = {};
    self.state = {}; // A status enum to set during actions and mutations

    self.status = 'resting'; // We store callbacks for when the state changes in here

    self.callbacks = []; // Look in the passed params object for actions and mutations
    // that might have been passed in

    if (params.hasOwnProperty('actions')) {
      self.actions = params.actions;
    }

    if (params.hasOwnProperty('mutations')) {
      self.mutations = params.mutations;
    } // Set our state to be a Proxy. We are setting the default state by
    // checking the params and defaulting to an empty object if no default
    // state is passed in


    self.state = new Proxy(params.initialState || {}, {
      set: function set(state, key, value) {
        // Set the value as we would normally
        state[key] = value; // Fire off our callback processor because if there's listeners,
        // they're going to want to know that something has changed

        self.processCallbacks(self.state); // Reset the status ready for the next operation

        self.status = 'resting';
        return true;
      }
    });
  }
  /**
   * A dispatcher for actions that looks in the actions
   * collection and runs the action if it can find it
   *
   * @param {string} actionKey
   * @param {mixed} payload
   * @returns {boolean}
   * @memberof Store
   */


  _createClass(Store, [{
    key: "dispatch",
    value: function dispatch(actionKey, payload) {
      var self = this; // Run a quick check to see if the action actually exists
      // before we try to run it

      if (typeof self.actions[actionKey] !== 'function') {
        console.error("Action \"".concat(actionKey, "\" doesn't exist."));
        return false;
      } // Let anything that's watching the status know that we're dispatching an action


      self.status = 'action'; // Actually call the action and pass it the Store context and whatever payload was passed

      return self.actions[actionKey](self, payload);
    }
    /**
     * Look for a mutation and modify the state object
     * if that mutation exists by calling it
     *
     * @param {string} mutationKey
     * @param {mixed} payload
     * @returns {boolean}
     * @memberof Store
     */

  }, {
    key: "commit",
    value: function commit(mutationKey, payload) {
      var self = this; // Run a quick check to see if this mutation actually exists
      // before trying to run it

      if (typeof self.mutations[mutationKey] !== 'function') {
        console.error("Mutation \"".concat(mutationKey, "\" doesn't exist"));
        return false;
      } // Let anything that's watching the status know that we're mutating state


      self.status = 'mutation'; // Get a new version of the state by running the mutation and storing the result of it

      var newState = self.mutations[mutationKey](self.state, payload); // Update the old state with the new state returned from our mutation

      self.state = newState;
      return true;
    }
    /**
     * Fire off each callback that's run whenever the state changes
     * We pass in some data as the one and only parameter.
     * Returns a boolean depending if callbacks were found or not
     *
     * @param {object} data
     * @returns {boolean}
     */

  }, {
    key: "processCallbacks",
    value: function processCallbacks(data) {
      var self = this;

      if (!self.callbacks.length) {
        return false;
      } // We've got callbacks, so loop each one and fire it off


      self.callbacks.forEach(function (callback) {
        return callback(data);
      });
      return true;
    }
    /**
     * Allow an outside entity to subscribe to state changes with a valid callback.
     * Returns a function to later unsubscribe
     *
     * Subscribe :
     * const unsubscribe = store.subscribe(render)
     *
     * Unsubscribe :
     * unsubscribe();
     *
     * @param {function} callback
     * @returns {function}
     */

  }, {
    key: "subscribe",
    value: function subscribe(callback) {
      var self = this;

      if (typeof callback !== 'function') {
        console.error('You can only subscribe to Store changes with a valid function');
        return false;
      } // A valid function, so it belongs in our collection


      self.callbacks.push(callback);
      var callbacksForUnsubscribe = self.callbacks; // Return a function to unsubscribe the callback

      return function unsubscribe() {
        var index = callbacksForUnsubscribe.indexOf(callback);
        callbacksForUnsubscribe.splice(index, 1);
      };
    }
  }]);

  return Store;
}();

var a17helpers$1 = {
  ajaxRequest: ajaxRequest,
  cookieHandler: cookieHandler,
  copyTextToClipboard: copyTextToClipboard,
  createBehavior: createBehavior$1,
  debounce: debounce,
  escapeString: escapeString,
  extend: extend,
  focusDisplayHandler: focusDisplayHandler,
  focusTrap: focusTrap,
  fontLoadObserver: fontLoadObserver,
  getCurrentMediaQuery: getCurrentMediaQuery,
  getIndex: getIndex,
  getMetaContentByName: getMetaContentByName,
  getOffset: getOffset,
  getUrlParameterByName: getUrlParameterByName,
  ios100vhFix: ios100vhFix,
  isBreakpoint: isBreakpoint,
  jsonpRequest: jsonpRequest,
  keycodes: keyCodes,
  lazyLoad: lazyLoad,
  manageBehaviors: manageBehaviors$1,
  messages: messages,
  objectifyForm: objectifyForm,
  oritentationChangeFix: oritentationChangeFix,
  purgeProperties: purgeProperties,
  queryStringHandler: queryStringHandler,
  resized: resized,
  responsiveImageUpdate: responsiveImageUpdate,
  scrolled: scrolled,
  sendEventToSegmentio: sendEventToSegmentio,
  setFocusOnTarget: setFocusOnTarget,
  Store: Store
};

var prod = a17helpers$1;

var a17helpers = prod;

var a17Helpers = a17helpers;

function Behavior(node, config = {}) {
  if (!node || !(node instanceof Element)) {
    throw new Error('Node argument is required');
  }

  this.$node = node;
  this.options = Object.assign({
    intersectionOptions: {
      rootMargin: '20%',
    }
  }, config.options || {});

  this.__isEnabled = false;
  this.__children = config.children;

  // Auto-bind all custom methods to "this"
  this.customMethodNames.forEach(methodName => {
    this[methodName] = this[methodName].bind(this);
  });

  this._binds = {};
  this._data = new Proxy(this._binds, {
      set: (target, key, value) => {
          this.updateBinds(key, value);
          target[key] = value;
          return true;
      }
  });

  this.__isIntersecting = false;
  this.__intersectionObserver;

  return this;
}

Behavior.prototype = Object.freeze({
  updateBinds(key, value) {
      // TODO: cache these before hand?
      const targetEls = this.$node.querySelectorAll('[data-' + this.name.toLowerCase() + '-bindel*=' + key + ']');
      targetEls.forEach((target) => {
          target.innerHTML = value;
      });
      // TODO: cache these before hand?
      const targetAttrs = this.$node.querySelectorAll('[data-' + this.name.toLowerCase() + '-bindattr*="' + key + ':"]');
      targetAttrs.forEach((target) => {
          let bindings = target.dataset[this.name.toLowerCase() + 'Bindattr'];
          bindings.split(',').forEach((pair) => {
              pair = pair.split(':');
              if (pair[0] === key) {
                  if (pair[1] === 'class') {
                      // TODO: needs to know what the initial class was to remove it - fix?
                      if (this._binds[key] !== value) {
                          target.classList.remove(this._binds[key]);
                      }
                      if (value) {
                          target.classList.add(value);
                      }
                  } else {
                      target.setAttribute(pair[1], value);
                  }
              }
          });
      });
  },
  init() {
    // Get options from data attributes on node
    const regex = new RegExp('^data-' + this.name + '-(.*)', 'i');
    for (let i = 0; i < this.$node.attributes.length; i++) {
      const attr = this.$node.attributes[i];
      const matches = regex.exec(attr.nodeName);

      if (matches != null && matches.length >= 2) {
        if (this.options[matches[1]]) {
          console.warn(
            `Ignoring ${
              matches[1]
            } option, as it already exists on the ${name} behavior. Please choose another name.`
          );
        }
        this.options[matches[1]] = attr.value;
      }
    }

    // Behavior-specific lifecycle
    if (this.lifecycle.init != null) {
      this.lifecycle.init.call(this);
    }

    if (this.lifecycle.resized != null) {
      this.__resizedBind = this.__resized.bind(this);
      window.addEventListener('resized', this.__resizedBind);
    }

    if (this.lifecycle.mediaQueryUpdated != null || this.options.media) {
      this.__mediaQueryUpdatedBind = this.__mediaQueryUpdated.bind(this);
      window.addEventListener('mediaQueryUpdated', this.__mediaQueryUpdatedBind);
    }

    if (this.options.media) {
      this.__toggleEnabled();
    } else {
      this.enable();
    }

    this.__intersections();
  },
  destroy() {
    if (this.__isEnabled === true) {
      this.disable();
    }

    // Behavior-specific lifecycle
    if (this.lifecycle.destroy != null) {
      this.lifecycle.destroy.call(this);
    }

    if (this.lifecycle.resized != null) {
      window.removeEventListener('resized', this.__resizedBind);
    }

    if (this.lifecycle.mediaQueryUpdated != null || this.options.media) {
      window.removeEventListener('mediaQueryUpdated', this.__mediaQueryUpdatedBind);
    }

    if (this.lifecycle.intersectionIn != null || this.lifecycle.intersectionOut != null) {
      this.__intersectionObserver.unobserve(this.$node);
      this.__intersectionObserver.disconnect();
    }

    a17Helpers.purgeProperties(this);
  },
  getChild(childName, context, multi = false) {
    if (context == null) {
      context = this.$node;
    }
    if (this.__children != null && this.__children[childName] != null) {
      return this.__children[childName];
    }
    return context[multi ? 'querySelectorAll' : 'querySelector'](
      '[data-' + this.name.toLowerCase() + '-' + childName.toLowerCase() + ']'
    );
  },
  getChildren(childName, context) {
    return this.getChild(childName, context, true);
  },
  isEnabled() {
    return this.__isEnabled;
  },
  enable() {
    this.__isEnabled = true;
    if (this.lifecycle.enabled != null) {
      this.lifecycle.enabled.call(this);
    }
  },
  disable() {
    this.__isEnabled = false;
    if (this.lifecycle.disabled != null) {
      this.lifecycle.disabled.call(this);
    }
  },
  addSubBehavior(SubBehavior, node = this.$node, config = {}) {
    const mb = manageBehaviors;
    if (typeof SubBehavior === 'string') {
      mb.initBehavior(SubBehavior, node, config);
    } else {
      mb.add(SubBehavior);
      mb.initBehavior(SubBehavior.prototype.behaviorName, node, config);
    }
  },
  __toggleEnabled() {
    const isValidMQ = a17Helpers.isBreakpoint(this.options.media);
    if (isValidMQ && !this.__isEnabled) {
      this.enable();
    } else if (!isValidMQ && this.__isEnabled) {
      this.disable();
    }
  },
  __mediaQueryUpdated() {
    if (this.lifecycle.mediaQueryUpdated != null) {
      this.lifecycle.mediaQueryUpdated.call(this);
    }
    if (this.options.media) {
      this.__toggleEnabled();
    }
  },
  __resized() {
    if (this.lifecycle.resized != null) {
      this.lifecycle.resized.call(this);
    }
  },
  __intersections() {
    if (this.lifecycle.intersectionIn != null || this.lifecycle.intersectionOut != null) {
      this.__intersectionObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.target === this.$node) {
            if (entry.isIntersecting) {
              if (!this.__isIntersecting && this.lifecycle.intersectionIn != null) {
                this.__isIntersecting = true;
                this.lifecycle.intersectionIn.call(this);
              }
            } else {
              if (this.__isIntersecting && this.lifecycle.intersectionOut != null) {
                this.__isIntersecting = false;
                this.lifecycle.intersectionOut.call(this);
              }
            }
          }
        });
      }, this.options.intersectionOptions);
      this.__intersectionObserver.observe(this.$node);
    }
  }
});

const createBehavior = (name, def, lifecycle = {}) => {
  const fn = function(...args) {
    Behavior.apply(this, args);
  };

  const customMethodNames = [];

  const customProperties = {
    name: {
      get() {
        return this.behaviorName;
      },
    },
    behaviorName: {
      value: name,
      writable: true,
    },
    lifecycle: {
      value: lifecycle,
    },
    customMethodNames: {
      value: customMethodNames,
    },
  };

  // Expose the definition properties as 'this[methodName]'
  const defKeys = Object.keys(def);
  defKeys.forEach(key => {
    customMethodNames.push(key);
    customProperties[key] = {
      value: def[key],
      writable: true,
    };
  });

  fn.prototype = Object.create(Behavior.prototype, customProperties);
  return fn;
};

let options = {
  dataAttr: 'behavior',
  lazyAttr: 'behavior-lazy',
  intersectionOptions: {
    rootMargin: '20%',
  }
};
let loadedBehaviorNames = [];
let observingBehaviors = false;
const loadedBehaviors = {};
const activeBehaviors = new Map();
let io;
const ioEntries = new Map(); // need to keep a separate map of intersection observer entries as `io.takeRecords()` always returns an empty array, seems broken in all browsers 🤷🏻‍♂️
const intersecting = new Map();

/*
  getBehaviorNames

  Data attribute names can be written in any case,
  but `node.dataset` names are lowercase
  with camel casing for names split by -
  eg: `data-foo-bar` becomes `node.dataset.fooBar`

  bNode - node to grab behavior names from
  attr - name of attribute to pick
*/
function getBehaviorNames(bNode, attr) {
  attr = attr.toLowerCase().replace(/-([a-zA-Z0-9])/ig, (match, p1) => {
    return p1.toUpperCase();
  });
  if (bNode.dataset && bNode.dataset[attr]) {
    return bNode.dataset && bNode.dataset[attr] && bNode.dataset[attr].split(' ');
  } else {
    return [];
  }
}

/*
  importFailed

  bName - name of behavior that failed to import

  Either the imported module didn't look like a behavior module
  or nothing could be found to import
*/
function importFailed(bName) {
  // remove name from loaded behavior names index
  // maybe it'll be included via a script tag later
  const bNameIndex = loadedBehaviorNames.indexOf(bName);
  if (bNameIndex > -1) {
    loadedBehaviorNames.splice(bNameIndex, 1);
  }
}

/*
  destroyBehavior

  All good things must come to an end...
  Ok so likely the node has been removed, possibly by
  a deletion or ajax type page change

  bName - name of behavior to destroy
  bNode - node to destroy behavior on

  `destroy()` is an internal method of a behavior
  in `createBehavior`. Individual behaviors may
  also have their own `destroy` methods (called by
  the `createBehavior` `destroy`)
*/
function destroyBehavior(bName, bNode) {
  const nodeBehaviors = activeBehaviors.get(bNode);
  if (!nodeBehaviors || !nodeBehaviors[bName]) {
    console.warn(`No behavior '${bName}' instance on:`, bNode);
    return;
  }
  // run destroy method, remove, delete
  nodeBehaviors[bName].destroy();
  delete nodeBehaviors[bName];
  if (Object.keys(nodeBehaviors).length === 0) {
    activeBehaviors.delete(bNode);
  }
}

/*
  destroyBehaviors

  bNode - node to destroy behaviors on

  if a node with behaviors is removed from the DOM,
  clean up to save resources
*/
function destroyBehaviors(bNode) {
  const bNodeActiveBehaviors = activeBehaviors.get(bNode);
  if (!bNodeActiveBehaviors) {
    return;
  }
  Object.keys(bNodeActiveBehaviors).forEach(bName => {
    destroyBehavior(bName, bNode);
    // stop intersection observer from watching node
    io.unobserve(bNode);
    ioEntries.delete(bNode);
    intersecting.delete(bNode);
  });
}

/*
  importBehavior

  bName - name of behavior
  bNode - node to initialise behavior on

  Use `import` to bring in a behavior module and run it.
  This runs if there is no loaded behavior of this name.
  After import, the behavior is initialised on the node
*/
function importBehavior(bName, bNode) {
  // first check we haven't already got this behavior module
  if (loadedBehaviorNames.indexOf(bName) > -1 ) {
    return;
  }
  // push to our store of loaded behaviors
  loadedBehaviorNames.push(bName);
  // import
  // webpack interprets this, does some magic
  // process.env variables set in webpack config
  import(`${process.env.BEHAVIORS_PATH}${bName}.${process.env.BEHAVIORS_EXTENSION}`).then(module => {
    // does what we loaded look right?
    if (module.default && typeof module.default === 'function') {
      // import complete, go go go
      loadedBehaviors[bName] = module.default;
      initBehavior(bName, bNode);
    } else {
      console.warn(`Tried to import ${bName}, but it seems to not be a behavior`);
      // fail, clean up
      importFailed(bName);
    }
  }).catch(err => {
    console.warn(`No loaded behavior called: ${bName}`);
    // fail, clean up
    importFailed(bName);
  });
}

/*
  createBehaviors

  node - node to check for behaviors on elements

  assign behaviors to nodes
*/
function createBehaviors(node) {
  // Ignore text or comment nodes
  if (!('querySelectorAll' in node)) {
    return;
  }

  // first check for "critical" behavior nodes
  // these will be run immediately on discovery
  const behaviorNodes = [node, ...node.querySelectorAll(`[data-${options.dataAttr}]`)];
  behaviorNodes.forEach(bNode => {
    // an element can have multiple behaviors
    const bNames = getBehaviorNames(bNode, options.dataAttr);
    // loop them
    if (bNames) {
      bNames.forEach(bName => {
        initBehavior(bName, bNode);
      });
    }
  });

  // now check for "lazy" behaviors
  // these are triggered via an intersection observer
  // these have optional breakpoints at which to trigger
  const lazyBehaviorNodes = [node, ...node.querySelectorAll(`[data-${options.lazyAttr}]`)];
  lazyBehaviorNodes.forEach(bNode => {
    // look for lazy behavior names
    const bNames = getBehaviorNames(bNode, options.lazyAttr);
    const bMap = new Map();
    bNames.forEach(bName => {
      // check for a lazy behavior breakpoint trigger
      const behaviorMedia = bNode.dataset[`${bName.toLowerCase()}Lazymedia`];
      // store
      bMap.set(bName, behaviorMedia || false);
    });
    // store and observe
    if (bNode !== document) {
      ioEntries.set(bNode, bMap);
      intersecting.set(bNode, false);
      io.observe(bNode);
    }
  });
}

/*
  observeBehaviors

  runs a `MutationObserver`, which watches for DOM changes
  when a DOM change happens, insertion or deletion,
  the call back runs, informing us of what changed
*/
function observeBehaviors() {
  // flag to stop multiple MutationObserver
  observingBehaviors = true;
  // set up MutationObserver
  const mo = new MutationObserver(mutations => {
    // report on what changed
    mutations.forEach(mutation => {
      mutation.removedNodes.forEach(node => {
        destroyBehaviors(node);
      });
      mutation.addedNodes.forEach(node => {
        createBehaviors(node);
      });
    });
  });
  // observe changes to the entire document
  mo.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: false,
    characterData: false,
  });
}

/*
  loopLazyBehaviorNodes

  bNodes - elements to check for lazy behaviors

  Looks at the nodes that have lazy behaviors, checks
  if they're intersecting, optionally checks the breakpoint
  and initialises if needed. Cleans up after itself, by
  removing the intersection observer observing of the node
  if all lazy behaviors on a node have been initialised
*/

function loopLazyBehaviorNodes(bNodes) {
  bNodes.forEach(bNode => {
    // first, check if this node is being intersected
    if (intersecting.get(bNode) !== undefined && intersecting.get(bNode) === false) {
      return;
    }
    // now check to see if we have any lazy behavior names
    let lazyBNames = ioEntries.get(bNode);
    if (!lazyBNames) {
      return;
    }
    //
    lazyBNames.forEach((bMedia, bName) => {
      // if no lazy behavior breakpoint trigger,
      // or if the current breakpoint matches
      if (!bMedia || a17Helpers.isBreakpoint(bMedia)) {
        // run behavior on node
        initBehavior(bName, bNode);
        // remove this behavior from the list of lazy behaviors
        lazyBNames.delete(bName);
        // if there are no more lazy behaviors left on the node
        // stop observing the node
        // else update the ioEntries
        if (lazyBNames.size === 0) {
          io.unobserve(bNode);
          ioEntries.delete(bNode);
        } else {
          ioEntries.set(bNode, lazyBNames);
        }
      }
    });
    // end loopLazyBehaviorNodes bNodes loop
  });
}

/*
  intersection

  entries - intersection observer entries

  The intersection observer call back,
  sets a value in the intersecting map true/false
  and if an entry is intersecting, checks if needs to
  init any lazy behaviors
*/
function intersection(entries) {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      intersecting.set(entry.target, true);
      loopLazyBehaviorNodes([entry.target]);
    } else {
      intersecting.set(entry.target, false);
    }
  });
}

/*
  mediaQueryUpdated

  If a resize has happened with enough size that a
  breakpoint has changed, checks to see if any lazy
  behaviors need to be initialised or not
*/
function mediaQueryUpdated() {
  loopLazyBehaviorNodes(Array.from(ioEntries.keys()));
}


/* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Public methods */

/*
  initBehavior

  bName - name of behavior
  bNode - node to initialise behavior on

  Is returned as public method

  Run the `init` method inside of a behavior,
  the internal one in `createBehavior`, which then
  runs the behaviors `init` life cycle method
*/
function initBehavior(bName, bNode, config = {}) {
  // first check we have a loaded behavior
  if (!loadedBehaviors[bName]) {
    // if not, attempt to import it
    importBehavior(bName, bNode);
    return;
  }
  // now check that this behavior isn't already
  // running on this node
  const nodeBehaviors = activeBehaviors.get(bNode) || {};
  if (nodeBehaviors === {} || !nodeBehaviors[bName]) {
    const instance = new loadedBehaviors[bName](bNode, config);
    // update internal store of whats running
    nodeBehaviors[bName] = instance;
    activeBehaviors.set(bNode, nodeBehaviors);
    // init method in the behavior
    instance.init();
    //
    return instance;
  }
}

/*
  addBehaviors

  behaviors - behaviors modules, module or object

  Is returned as public method

  Can pass
  - a singular behavior as created by `createBehavior`,
  - a behavior object which will be passed to `createBehavior`
  - a behavior module
  - a collection of behavior modules

  Adds each behavior to memory, to be initialised to a DOM node when the
  corresponding DOM node exists
*/
function addBehaviors(behaviors) {
    // if singular behavior added, sort into module like structure
    if (typeof behaviors === 'function' && behaviors.prototype.behaviorName) {
      behaviors = { [behaviors.prototype.behaviorName]: behaviors };
    }
    // if an uncompiled behavior object is passed, create it
    if (typeof behaviors === 'string' && arguments.length > 1) {
      behaviors = { [behaviors]: createBehavior(...arguments) };
    }
    // process
    const unique = Object.keys(behaviors).filter((o) => loadedBehaviorNames.indexOf(o) === -1);
    if (unique.length) {
      // we have new unique behaviors, store them
      loadedBehaviorNames = loadedBehaviorNames.concat(unique);
      unique.forEach(bName => {
        loadedBehaviors[bName] = behaviors[bName];
      });
      // try and apply behaviors to any DOM node that needs them
      createBehaviors(document);
      // start the mutation observer looking for DOM changes
      if (!observingBehaviors) {
        observeBehaviors();
      }
    }
}

/*
  nodeBehaviors

  bNode - node on which to get active behaviors on

  Is returned as public method when webpack is set to development mode

  Returns all active behaviors on a node
*/
function nodeBehaviors(bNode) {
  const nodeBehaviors = activeBehaviors.get(bNode);
  if (!nodeBehaviors) {
    console.warn(`No behaviors on:`, bNode);
  } else {
    return nodeBehaviors;
  }
}

/*
  behaviorProperties

  bName - name of behavior to return properties of
  bNode - node on which the behavior is running

  Is returned as public method when webpack is set to development mode

  Returns all properties of a behavior
*/
function behaviorProperties(bName, bNode) {
  const nodeBehaviors = activeBehaviors.get(bNode);
  if (!nodeBehaviors || !nodeBehaviors[bName]) {
    console.warn(`No behavior '${bName}' instance on:`, bNode);
  } else {
    return activeBehaviors.get(bNode)[bName];
  }
}

/*
  behaviorProp

  bName - name of behavior to return properties of
  bNode - node on which the behavior is running
  prop - property to return or set
  value - value to set

  Is returned as public method when webpack is set to development mode

  Returns specific property of a behavior on a node, or runs a method
  or sets a property on a behavior if a value is set. For debuggging.
*/
function behaviorProp(bName, bNode, prop, value) {
  const nodeBehaviors = activeBehaviors.get(bNode);
  if (!nodeBehaviors || !nodeBehaviors[bName]) {
    console.warn(`No behavior '${bName}' instance on:`, bNode);
  } else if (activeBehaviors.get(bNode)[bName][prop]) {
    if (value && typeof value === 'function') {
      return activeBehaviors.get(bNode)[bName][prop];
    } else if (value) {
      activeBehaviors.get(bNode)[bName][prop] = value;
    } else {
      return activeBehaviors.get(bNode)[bName][prop];
    }
  } else {
    console.warn(`No property '${prop}' in behavior '${bName}' instance on:`, bNode);
  }
}

/*
  init

  gets this show on the road

  loadedBehaviorsModule - optional behaviors module to load on init
  opts - any options for this instance
*/

function init(loadedBehaviorsModule, opts) {
  options = {
    ...options, ...opts
  };

  // on resize, check
  a17Helpers.resized();

  // set up intersection observer
  io = new IntersectionObserver(intersection, options.intersectionOptions);

  // if fn run with supplied behaviors, lets add them and begin
  if (loadedBehaviorsModule) {
    addBehaviors(loadedBehaviorsModule);
  }

  // watch for break point changes
  window.addEventListener('mediaQueryUpdated', mediaQueryUpdated);
}

// expose public methods, essentially returning

let exportObj = {
  init: init,
  add: addBehaviors,
  initBehavior: initBehavior
};

if (process.env.MODE && process.env.MODE === 'development') {
  exportObj = {
    ...exportObj,
    initBehavior: initBehavior,
    active: activeBehaviors,
    getBehaviors: nodeBehaviors,
    getProps: behaviorProperties,
    getProp: behaviorProp,
    setProp: behaviorProp,
    callMethod: behaviorProp
  };
}

var manageBehaviors = exportObj;

export { createBehavior, manageBehaviors };
//# sourceMappingURL=index.js.map
