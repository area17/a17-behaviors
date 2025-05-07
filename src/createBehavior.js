import purgeProperties from '@area17/a17-helpers/src/purgeProperties';
import isBreakpoint from '@area17/a17-helpers/src/isBreakpoint';
import manageBehaviors from './manageBehaviors';

/**
 * Behavior
 * @typedef {Object.<string, any>|BehaviorDef} Behavior
 * @property {HTMLElement} $node - Dom node associated to the behavior
 * @property {string} name - Name of the behavior
 * @property {Object} options
 * @property {Lifecycle} lifecycle
 */

/**
 * Behavior lifecycle
 * @typedef {Object} Lifecycle
 * @property {BehaviorLifecycleFn} [init] - Init function called when behavior is created
 * @property {BehaviorLifecycleFn} [enabled] - Triggered when behavior state changed (ex: mediaquery update)
 * @property {BehaviorLifecycleFn} [disabled] - Triggered when behavior state changed (ex: mediaquery update)
 * @property {BehaviorLifecycleFn} [mediaQueryUpdated] - Triggered when mediaquery change
 * @property {BehaviorLifecycleFn} [intersectionIn] - Triggered when behavior is visible (enable intersection observer)
 * @property {BehaviorLifecycleFn} [intersectionOut] - Triggered when behavior is hidden (enable intersection observer)
 * @property {BehaviorLifecycleFn} [resized] - Triggered when window is resized
 * @property {BehaviorLifecycleFn} [destroy] - Triggered before behavior will be destroyed and removed
 */

/**
 * @typedef {function} BehaviorLifecycleFn
 * @this Behavior
 */

/**
 * @typedef {function} BehaviorDefFn
 * @this Behavior
 */

/**
 * Behavior definition
 * @typedef {Object.<string, BehaviorDefFn>} BehaviorDef
 */

/**
 * Behavior constructor
 * @constructor
 * @param {HTMLElement} node - A DOM element
 * @param config - behavior options
 * @returns {Behavior}
 */
function Behavior(node, config = {}) {
  if (!node || !(node instanceof Element)) {
    throw new Error('Node argument is required');
  }

  this.$node = this.getChild(node);
  this.options = Object.assign({
    intersectionOptions: {
      rootMargin: '20%',
    }
  }, config.options || {});

  this.__isEnabled = false;
  this.__children = config.children;
  this.__breakpoints = config.breakpoints;
  this.__abortController = new AbortController();

  // Auto-bind all custom methods to "this"
  this.customMethodNames.forEach(methodName => {
    this[methodName] = this.methods[methodName].bind(this);
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
  this.__intersectionObserver = null;

  return this;
}

/**
 *
 * @type {Behavior}
 */
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
    if (typeof this.lifecycle?.init === 'function') {
      this.lifecycle.init.call(this);
    }

    if (typeof this.lifecycle?.resized === 'function') {
      this.__resizedBind = this.__resized.bind(this);
      window.addEventListener('resized', this.__resizedBind);
    }

    if (typeof this.lifecycle.mediaQueryUpdated === 'function' || this.options.media) {
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
    this.__abortController.abort();

    if (this.__isEnabled === true) {
      this.disable();
    }

    // Behavior-specific lifecycle
    if (typeof this.lifecycle?.destroy === 'function') {
      this.lifecycle.destroy.call(this);
    }

    if (typeof this.lifecycle.resized === 'function') {
       window.removeEventListener('resized', this.__resizedBind);
     }

     if (typeof this.lifecycle.mediaQueryUpdated === 'function' || this.options.media) {
       window.removeEventListener('mediaQueryUpdated', this.__mediaQueryUpdatedBind);
     }

    if (this.lifecycle.intersectionIn != null || this.lifecycle.intersectionOut != null) {
      this.__intersectionObserver.unobserve(this.$node);
      this.__intersectionObserver.disconnect();
    }

    purgeProperties(this);
  },
  /**
   * Look for a child of the behavior: data-behaviorName-childName
   * @param {string} childName
   * @param {HTMLElement} context - Define the ancestor where search begin, default is current node
   * @param {boolean} multi - Define usage between querySelectorAll and querySelector
   * @returns {HTMLElement|null}
   */
  getChild(selector, context, multi = false) {
      // lets make a selection
    let selection;
    //
    if (this.__children != null && this.__children[selector] != null) {
      // if the selector matches a pre-selected set, set to that set
      // TODO: confirm what this is and its usage
      selection = this.__children[selector];
    } else if (selector instanceof NodeList) {
      // if a node list has been passed, use it
      selection = selector;
      multi = true;
    } else if (selector instanceof Element || selector instanceof HTMLDocument || selector === window) {
      // if a single node, the document or the window is passed, set to that
      selection = selector;
      multi = false;
    } else {
      // else, lets find named children within the container
      if (context == null) {
        // set a default context of the container node
        context = this.$node;
      }
      // find
      selection = context[multi ? 'querySelectorAll' : 'querySelector'](
        '[data-' + this.name.toLowerCase() + '-' + selector.toLowerCase() + ']'
      );
    }

    if (multi && selection?.length > 0) {
      // apply on/off methods to the selected DOM node list
      selection.on = (type, fn, opt) => {
        selection.forEach(el => {
          this.__on(el, type, fn, opt);
        });
      };
      selection.off = (type, fn) => {
        selection.forEach(el => {
          this.__off(el, type, fn);
        });
      };
      // and apply to the individual nodes within
      selection.forEach(el => {
        el.on = el.on ? el.on : (type, fn, opt) => {
          this.__on(el, type, fn, opt);
        };
        el.off = el.off ? el.off : (type, fn) => {
          this.__off(el, type, fn);
        };
      });
    } else if(selection) {
      // apply on/off methods to the singular selected node
      selection.on = selection.on ? selection.on : (type, fn, opt) => {
        this.__on(selection, type, fn, opt);
      };
      selection.off = selection.off ? selection.off : (type, fn) => {
        this.__off(selection, type, fn);
      };
    }

    // return to variable assignment
    return selection;
  },
  /**
   * Look for children of the behavior: data-behaviorName-childName
   * @param {string} childName
   * @param {HTMLElement} context - Define the ancestor where search begin, default is current node
   * @returns {HTMLElement|null}
   */
  getChildren(childName, context) {
    return this.getChild(childName, context, true);
  },
  isEnabled() {
    return this.__isEnabled;
  },
  enable() {
    this.__isEnabled = true;
    if (typeof this.lifecycle.enabled === 'function') {
      this.lifecycle.enabled.call(this);
    }
  },
  disable() {
    this.__isEnabled = false;
    if (typeof this.lifecycle.disabled === 'function') {
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
  /**
   * Check if breakpoint passed in param is the current one
   * @param {string} bp - Breakpoint to check
   * @returns {boolean}
   */
  isBreakpoint(bp) {
    return isBreakpoint(bp, this.__breakpoints);
  },
  __on(el, type, fn, opt) {
    if (typeof opt === 'boolean' && opt === true) {
      opt = {
        passive: true
      };
    }
    const options = {
      signal: this.__abortController.signal,
      ...opt
    };
    if (!el.attachedListeners) {
      el.attachedListeners = {};
    }
    // check if el already has this listener
    let found = Object.values(el.attachedListeners).find(listener => listener.type === type && listener.fn === fn);
    if (!found) {
      el.attachedListeners[Object.values(el.attachedListeners).length] = {
        type: type,
        fn: fn,
      };
      el.addEventListener(type, fn, options);
    }
  },
  __off(el, type, fn) {
    if (el.attachedListeners) {
      Object.keys(el.attachedListeners).forEach(key => {
        const thisListener = el.attachedListeners[key];
        if (
          (!type && !fn) || // off()
          (type === thisListener.type && !fn) || // match type with no fn
          (type === thisListener.type && fn === thisListener.fn) // match both type and fn
        ) {
          delete el.attachedListeners[key];
          el.removeEventListener(thisListener.type, thisListener.fn);
        }
      });
    } else {
      el.removeEventListener(type, fn);
    }
  },
  __toggleEnabled() {
    const isValidMQ = isBreakpoint(this.options.media, this.__breakpoints);
    if (isValidMQ && !this.__isEnabled) {
      this.enable();
    } else if (!isValidMQ && this.__isEnabled) {
      this.disable();
    }
  },
  __mediaQueryUpdated(e) {
    if (typeof this.lifecycle?.mediaQueryUpdated === 'function') {
      this.lifecycle.mediaQueryUpdated.call(this, e);
    }
    if (this.options.media) {
      this.__toggleEnabled();
    }
  },
  __resized(e) {
    if (typeof this.lifecycle?.resized === 'function') {
      this.lifecycle.resized.call(this, e);
    }
  },
  __intersections() {
    if (this.lifecycle.intersectionIn != null || this.lifecycle.intersectionOut != null) {
      this.__intersectionObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.target === this.$node) {
            if (entry.isIntersecting) {
              if (!this.__isIntersecting && typeof this.lifecycle.intersectionIn === 'function') {
                this.__isIntersecting = true;
                this.lifecycle.intersectionIn.call(this);
              }
            } else {
              if (this.__isIntersecting && typeof this.lifecycle.intersectionOut === 'function') {
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

/**
 * Create a behavior instance
 * @param {string} name - Name of the behavior used for declaration: data-behavior="name"
 * @param {object} methods - define methods of the behavior
 * @param {object} lifecycle - Register behavior lifecycle
 * @returns {Behavior}
 */
const createBehavior = (name, methods = {}, lifecycle = {}) => {
  /**
   *
   * @param args
   */
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
    methods: {
      value: methods,
    },
    customMethodNames: {
      value: customMethodNames,
    },
  };

  // Expose the definition properties as 'this[methodName]'
  const methodsKeys = Object.keys(methods);
  methodsKeys.forEach(key => {
    customMethodNames.push(key);
  });

  fn.prototype = Object.create(Behavior.prototype, customProperties);

  return fn;
};

export default createBehavior;
