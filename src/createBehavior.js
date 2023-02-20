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

const abortController = new AbortController();
const abortControllerSignal = abortController.signal;

function BehaviorCollection(elements) {
  elements.forEach((el, i) => {
    this[i] = el;
  });
}

BehaviorCollection.prototype = {
  forEach:function(func){
    Object.values(this).forEach(value => {
      func.call(value, value);
    })
  },
  on:function(type,fn,opt){
    if (typeof opt === 'boolean' && opt === true) {
      opt = {
        passive: true
      };
    }
    const options = {
      signal: abortController.signal,
      ...opt
    };
    this.forEach(el => {
      el.removeEventListener(type, fn);
      el.addEventListener(type, fn, options);
    });
    return this;
  },
  off:function(type){
    this.forEach(el => {
      el.removeEventListener(type, fn);
    });
    return this;
  },
  /*
  // Add other methods?
  addClass:function(className){
    this.forEach(el => {
      el.classList.add(className);
    });
    return this;
  },
  removeClass:function(className){
    this.forEach(el => {
      el.classList.remove(className);
    });
    return this;
  },
  */
};

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

  this.$node = node;
  this.options = Object.assign({
    intersectionOptions: {
      rootMargin: '20%',
    }
  }, config.options || {});

  this.__isEnabled = false;
  this.__children = config.children;
  this.__breakpoints = config.breakpoints;
  this.__abortController = abortController;
  this.__abortControllerSignal = abortControllerSignal;

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
      window.addEventListener('resized', this.__resizedBind, { signal: this.__abortController.signal });
    }

    if (typeof this.lifecycle.mediaQueryUpdated === 'function' || this.options.media) {
      this.__mediaQueryUpdatedBind = this.__mediaQueryUpdated.bind(this);
      window.addEventListener('mediaQueryUpdated', this.__mediaQueryUpdatedBind, { signal: this.__abortController.signal });
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
  collection(selector, context) {
    let nodes = [];
    if (selector && typeof selector !== 'string') {
      nodes = (selector.forEach) ? selector : [selector];
    } else if (selector) {
      nodes = this.getChildren(selector, context);
    }
    return new BehaviorCollection(nodes);
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
 * @param {BehaviorDef} def - define methods of the behavior
 * @param {Lifecycle} lifecycle - Register behavior lifecycle
 * @returns {Behavior}
 */
const createBehavior = (name, def, lifecycle = {}) => {
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

export default createBehavior;
