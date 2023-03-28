'use strict';

var getCurrentMediaQuery = function() {
  // Doc: https://github.com/area17/a17-behaviors/wiki/getCurrentMediaQuery

  return getComputedStyle(document.documentElement).getPropertyValue('--breakpoint').trim().replace(/"/g, '');
};

var resized = function() {
  // Doc: https://github.com/area17/a17-behaviors/wiki/resized

  var resizeTimer;
  var mediaQuery = getCurrentMediaQuery();

  function informApp() {
    // check media query
    var newMediaQuery = getCurrentMediaQuery();

    // tell everything resized happened
    window.dispatchEvent(new CustomEvent('resized', {
      detail: {
        breakpoint: newMediaQuery
      }
    }));

    // if media query changed, tell everything
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

  window.addEventListener('resize', function() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(informApp, 250);
  });

  if (mediaQuery === '') {
    window.requestAnimationFrame(informApp);
  } else if (window.A17) {
    window.A17.currentMediaQuery = mediaQuery;
  }
};

const isBreakpoint = function (breakpoint, breakpoints) {
  // Doc: https://github.com/area17/a17-behaviors/wiki/isBreakpoint

  // bail if no breakpoint is passed
  if (!breakpoint) {
    console.error('You need to pass a breakpoint name!');
    return false
  }

  // we only want to look for a specific modifier and make sure it is at the end of the string
  const regExp = new RegExp('\\+$|\\-$');

  // bps must be in order from smallest to largest
  let bps = ['xs', 'sm', 'md', 'lg', 'xl', 'xxl'];

  // override the breakpoints if the option is set on the global A17 object
  if (window.A17 && window.A17.breakpoints) {
    if (Array.isArray(window.A17.breakpoints)) {
      bps = window.A17.breakpoints;
    } else {
      console.warn('A17.breakpoints should be an array. Using defaults.');
    }
  }

  // override the breakpoints if a set of breakpoints is passed through as a parameter (added for A17-behaviors to allow usage with no globals)
  if (breakpoints) {
    if (Array.isArray(breakpoints)) {
      bps = breakpoints;
    } else {
      console.warn('isBreakpoint breakpoints should be an array. Using defaults.');
    }
  }

  // store current breakpoint in use
  const currentBp = getCurrentMediaQuery();

  // store the index of the current breakpoint
  const currentBpIndex = bps.indexOf(currentBp);

  // check to see if bp has a + or - modifier
  const hasModifier = regExp.exec(breakpoint);

  // store modifier value
  const modifier = hasModifier ? hasModifier[0] : false;

  // store the trimmed breakpoint name if a modifier exists, if not, store the full queried breakpoint name
  const bpName = hasModifier ? breakpoint.slice(0, -1) : breakpoint;

  // store the index of the queried breakpoint
  const bpIndex = bps.indexOf(bpName);

  // let people know if the breakpoint name is unrecognized
  if (bpIndex < 0) {
    console.warn(
      'Unrecognized breakpoint. Supported breakpoints are: ' + bps.join(', ')
    );
    return false
  }

  // compare the modifier with the index of the current breakpoint in the bps array with the index of the queried breakpoint.
  // if no modifier is set, compare the queried breakpoint name with the current breakpoint name
  if (
    (modifier === '+' && currentBpIndex >= bpIndex) ||
    (modifier === '-' && currentBpIndex <= bpIndex) ||
    (!modifier && breakpoint === currentBp)
  ) {
    return true
  }

  // the current breakpoint isn’t the one you’re looking for
  return false
};

var purgeProperties = function(obj) {
  // Doc: https://github.com/area17/a17-behaviors/wiki/purgeProperties
  for (var prop in obj) {
    if (obj.hasOwnProperty(prop)) {
      delete obj[prop];
    }
  }

  // alternatives considered: https://jsperf.com/deleting-properties-from-an-object
};

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

  this.$node = node;
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

let options = {
  dataAttr: 'behavior',
  lazyAttr: 'behavior-lazy',
  intersectionOptions: {
    rootMargin: '20%',
  },
  breakpoints: ['xs', 'sm', 'md', 'lg', 'xl', 'xxl']
};

let loadedBehaviorNames = [];
let observingBehaviors = false;
const loadedBehaviors = {};
const activeBehaviors = new Map();
const behaviorsAwaitingImport = new Map();
let io;
const ioEntries = new Map(); // need to keep a separate map of intersection observer entries as `io.takeRecords()` always returns an empty array, seems broken in all browsers 🤷🏻‍♂️
const intersecting = new Map();

/**
 * getBehaviorNames
 *
 * Data attribute names can be written in any case,
 * but `node.dataset` names are lowercase
 * with camel casing for names split by -
 * eg: `data-foo-bar` becomes `node.dataset.fooBar`
 *
 * @param {HTMLElement} bNode - node to grab behavior names from
 * @param {string} attr - name of attribute to pick
 * @returns {string[]}
 */
function getBehaviorNames(bNode, attr) {
  attr = attr.toLowerCase().replace(/-([a-zA-Z0-9])/ig, (match, p1) => {
    return p1.toUpperCase();
  });
  if (bNode.dataset && bNode.dataset[attr]) {
    return bNode.dataset[attr].split(' ').filter(bName => bName);
  } else {
    return [];
  }
}

/**
 *  importFailed
 *
 *
 *  Either the imported module didn't look like a behavior module
 *  or nothing could be found to import
 *
 * @param {string }bName - name of behavior that failed to import
 */
function importFailed(bName) {
  // remove name from loaded behavior names index
  // maybe it'll be included via a script tag later
  const bNameIndex = loadedBehaviorNames.indexOf(bName);
  if (bNameIndex > -1) {
    loadedBehaviorNames.splice(bNameIndex, 1);
  }
}

/**
 *  destroyBehavior
 *
 *
 *  All good things must come to an end...
 *  Ok so likely the node has been removed, possibly by
 *  a deletion or ajax type page change
 *
 * @param {string} bName - name of behavior to destroy
 * @param {string} bNode  - node to destroy behavior on
 */
function destroyBehavior(bName, bNode) {
  const nodeBehaviors = activeBehaviors.get(bNode);
  if (!nodeBehaviors || !nodeBehaviors[bName]) {
    console.warn(`No behavior '${bName}' instance on:`, bNode);
    return;
  }

  /**
   *   run destroy method, remove, delete
   *   `destroy()` is an internal method of a behavior in `createBehavior`. Individual behaviors may
   *   also have their own `destroy` methods (called by
   *   the `createBehavior` `destroy`)
   */
  nodeBehaviors[bName].destroy();
  delete nodeBehaviors[bName];
  if (Object.keys(nodeBehaviors).length === 0) {
    activeBehaviors.delete(bNode);
  }
}

/**
 * destroyBehaviors
 *
 * if a node with behaviors is removed from the DOM,
 * clean up to save resources
 *
 * @param {HTMLElement} rNode -node to destroy behaviors on (and inside of)
 */
function destroyBehaviors(rNode) {
  const bNodes = Array.from(activeBehaviors.keys());
  bNodes.push(rNode);
  bNodes.forEach(bNode => {
    // is the active node the removed node
    // or does the removed node contain the active node?
    if (rNode === bNode || rNode.contains(bNode)) {
      // get behaviors on node
      const bNodeActiveBehaviors = activeBehaviors.get(bNode);
      // if some, destroy
      if (bNodeActiveBehaviors) {
        Object.keys(bNodeActiveBehaviors).forEach(bName => {
          destroyBehavior(bName, bNode);
          // stop intersection observer from watching node
          io.unobserve(bNode);
          ioEntries.delete(bNode);
          intersecting.delete(bNode);
        });
      }
    }
  });
}

/**
 * importBehavior
 *
 * Use `import` to bring in a behavior module and run it.
 * This runs if there is no loaded behavior of this name.
 * After import, the behavior is initialised on the node
 *
 * @param {string} bName - name of behavior
 * @param {HTMLElement} bNode - node to initialise behavior on
 */
function importBehavior(bName, bNode) {
  // first check we haven't already got this behavior module
  if (loadedBehaviorNames.indexOf(bName) > -1) {
    // if no, store a list of nodes awaiting this behavior to load
    const awaitingImport = behaviorsAwaitingImport.get(bName) || [];
    if (!awaitingImport.includes(bNode)) {
      awaitingImport.push(bNode);
    }
    behaviorsAwaitingImport.set(bName, awaitingImport);
    return;
  }
  // push to our store of loaded behaviors
  loadedBehaviorNames.push(bName);
  // import
  // webpack interprets this, does some magic
  // process.env variables set in webpack config
  try {
    import(
      /**
       * Vite bundler rises a warning because import url start with a variable
       * @see: https://github.com/rollup/plugins/tree/master/packages/dynamic-import-vars#limitations
       * Warning will be hidden with the below directive vite-ignore
       */
      /* @vite-ignore */
      `${process.env.BEHAVIORS_PATH}/${(process.env.BEHAVIORS_COMPONENT_PATHS[bName]||'').replace(/^\/|\/$/ig,'')}/${bName}.${process.env.BEHAVIORS_EXTENSION}`
    ).then(module => {
      behaviorImported(bName, bNode, module);
    }).catch(err => {
      console.warn(`No loaded behavior called: ${bName}`);
      // fail, clean up
      importFailed(bName);
    });
  } catch(err1) {
    try {
      import(
        /**
         * Vite bundler rises a warning because import url start with a variable
         * @see: https://github.com/rollup/plugins/tree/master/packages/dynamic-import-vars#limitations
         * Warning will be hidden with the below directive vite-ignore
         */
        /* @vite-ignore */
        `${process.env.BEHAVIORS_PATH}/${bName}.${process.env.BEHAVIORS_EXTENSION}`
      ).then(module => {
        behaviorImported(bName, bNode, module);
      }).catch(err => {
        console.warn(`No loaded behavior called: ${bName}`);
        // fail, clean up
        importFailed(bName);
      });
    } catch(err2) {
      console.warn(`Unknown behavior called: ${bName}. \nIt maybe the behavior doesn't exist, check for typos and check Webpack has generated your file. \nIf you are using dynamically imported behaviors, you may also want to check your webpack config. See https://github.com/area17/a17-behaviors/wiki/Setup#webpack-config`);
      // fail, clean up
      importFailed(bName);
    }
  }
}

/**
 * behaviorImported
 *
 * Run when a dynamic import is successfully imported,
 * sets up and runs the behavior on the node
 *
 * @param {string} bName - name of behavior
 * @param {HTMLElement} bNode - node to initialise behavior on
 * @param module  - imported behavior module
 */
function behaviorImported(bName, bNode, module) {
  // does what we loaded look right?
  if (module.default && typeof module.default === 'function') {
    // import complete, go go go
    loadedBehaviors[bName] = module.default;
    initBehavior(bName, bNode);
    // check for other instances of this behavior that where awaiting load
    if (behaviorsAwaitingImport.get(bName)) {
      behaviorsAwaitingImport.get(bName).forEach(node => {
        initBehavior(bName, node);
      });
      behaviorsAwaitingImport.delete(bName);
    }
  } else {
    console.warn(`Tried to import ${bName}, but it seems to not be a behavior`);
    // fail, clean up
    importFailed(bName);
  }
}

/**
 * createBehaviors
 *
 * assign behaviors to nodes
 *
 * @param {HTMLElement} node - node to check for behaviors on elements
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

/**
 * observeBehaviors
 *
 * runs a `MutationObserver`, which watches for DOM changes
 * when a DOM change happens, insertion or deletion,
 * the call back runs, informing us of what changed
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

/**
 * loopLazyBehaviorNodes
 *
 * Looks at the nodes that have lazy behaviors, checks
 * if they're intersecting, optionally checks the breakpoint
 * and initialises if needed. Cleans up after itself, by
 * removing the intersection observer observing of the node
 * if all lazy behaviors on a node have been initialised
 *
 * @param {HTMLElement[]} bNodes - elements to check for lazy behaviors
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
      if (!bMedia || isBreakpoint(bMedia, options.breakpoints)) {
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

/**
 * intersection
 *
 * The intersection observer call back,
 * sets a value in the intersecting map true/false
 * and if an entry is intersecting, checks if needs to
 * init any lazy behaviors
 *
 * @param {IntersectionObserverEntry[]} entries
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

/**
 * mediaQueryUpdated
 *
 * If a resize has happened with enough size that a
 * breakpoint has changed, checks to see if any lazy
 * behaviors need to be initialised or not
*/
function mediaQueryUpdated() {
  loopLazyBehaviorNodes(Array.from(ioEntries.keys()));
}


/* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Public methods */


/**
 * initBehavior
 *
 * Return behavior instance if behavior is already loaded
 *
 * Run the `init` method inside a behavior,
 * the internal one in `createBehavior`, which then
 * runs the behaviors `init` life cycle method
 *
 * @param {string} bName - name of behavior
 * @param {HTMLElement} bNode - node to initialise behavior on
 * @param config
 * @returns {Behavior|void}
 */
function initBehavior(bName, bNode, config = {}) {
  // first check we have a loaded behavior
  if (!loadedBehaviors[bName]) {
    // if not, attempt to import it
    importBehavior(bName, bNode);
    return;
  }
  // merge breakpoints into config
  config = {
    breakpoints: options.breakpoints,
    ...config
  };
  // now check that this behavior isn't already
  // running on this node
  const nodeBehaviors = activeBehaviors.get(bNode) || {};
  if (nodeBehaviors === {} || !nodeBehaviors[bName]) {
    const instance = new loadedBehaviors[bName](bNode, config);
    // update internal store of whats running
    nodeBehaviors[bName] = instance;
    activeBehaviors.set(bNode, nodeBehaviors);
    // init method in the behavior
    try {
      instance.init();
      return instance;
    } catch(err) {
      console.log(`Error in behavior '${ bName }' on:`, bNode);
      console.log(err);
    }
  }
}

/**
 * addBehaviors
 *
 * Adds each behavior to memory, to be initialised to a DOM node when the
 * corresponding DOM node exists
 *
 * Can pass
 * - a singular behavior as created by `createBehavior`,
 * - a behavior object which will be passed to `createBehavior`
 * - a behavior module
 * - a collection of behavior modules
 *
 * @param {function|string} behaviors
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
    }
}

/**
 * nodeBehaviors
 *
 *  Is returned as public method when webpack is set to development mode
 *
 *  Returns all active behaviors on a node
 *
 * @param {string} bNode - node on which to get active behaviors on
 * @returns {Object.<string, Behavior>}
 */
function nodeBehaviors(bNode) {
  const nodeBehaviors = activeBehaviors.get(bNode);
  if (!nodeBehaviors) {
    console.warn(`No behaviors on:`, bNode);
  } else {
    return nodeBehaviors;
  }
}

/**
 * behaviorProperties
 *
 * Is returned as public method when webpack is set to development mode
 *
 * Returns all properties of a behavior
 *
 * @param {string} bName - name of behavior to return properties of
 * @param {string} bNode - node on which the behavior is running
 * @returns {Behavior|void}
 */
function behaviorProperties(bName, bNode) {
  const nodeBehaviors = activeBehaviors.get(bNode);
  if (!nodeBehaviors || !nodeBehaviors[bName]) {
    console.warn(`No behavior '${bName}' instance on:`, bNode);
  } else {
    return activeBehaviors.get(bNode)[bName];
  }
}

/**
 * behaviorProp
 *
 * Is returned as public method when webpack is set to development mode
 *
 * Returns specific property of a behavior on a node, or runs a method
 * or sets a property on a behavior if a value is set. For debuggging.
 *
 * @param {string} bName - name of behavior to return properties of
 * @param {string} bNode - node on which the behavior is running
 * @param {string} prop - property to return or set
 * @param [value] - value to set
 * @returns {*}
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
/**
 * init
 *
 * gets this show on the road
 *
 * @param [loadedBehaviorsModule]  - optional behaviors module to load on init
 * @param opts - any options for this instance
 */
function init(loadedBehaviorsModule, opts = {}) {
  options = {
    ...options, ...opts
  };

  // on resize, check
  resized();

  // set up intersection observer
  io = new IntersectionObserver(intersection, options.intersectionOptions);

  // if fn run with supplied behaviors, lets add them and begin
  if (loadedBehaviorsModule) {
    addBehaviors(loadedBehaviorsModule);
  }

  // try and apply behaviors to any DOM node that needs them
  createBehaviors(document);

  // start the mutation observer looking for DOM changes
  if (!observingBehaviors) {
    observeBehaviors();
  }

  // watch for break point changes
  window.addEventListener('mediaQueryUpdated', mediaQueryUpdated);
}

/**
 * addAndInit
 *
 * Can pass
 * - a singular behavior as created by `createBehavior`,
 * - a behavior object which will be passed to `createBehavior`
 * - a behavior module
 * - a collection of behavior modules
 *
 * @param [behaviors]  - optional behaviors module to load on init
 * (all arguments are passed to addBehaviors)
 */
function addAndInit() {
  if (arguments) {
    addBehaviors.apply(null, arguments);

    // try and apply behaviors to any DOM node that needs them
    createBehaviors(document);
  }
}

// expose public methods, essentially returning

let exportObj = {
  init: init,
  add: addAndInit,
  initBehavior: initBehavior,
  get currentBreakpoint() {
    return getCurrentMediaQuery();
  }
};

try {
  if (process.env.MODE === 'development') {
    Object.defineProperty(exportObj, 'loaded', {
      get: () => {
        return loadedBehaviorNames;
      }
    });
    exportObj.activeBehaviors = activeBehaviors;
    exportObj.active = activeBehaviors;
    exportObj.getBehaviors = nodeBehaviors;
    exportObj.getProps = behaviorProperties;
    exportObj.getProp = behaviorProp;
    exportObj.setProp = behaviorProp;
    exportObj.callMethod = behaviorProp;
  }
} catch(err) {
  // no process.env.mode
}

var manageBehaviors = exportObj;

/**
 * Extend an existing a behavior instance
 * @param {module} behavior - behavior you want to extend
 * @param {string} name - Name of the extended behavior used for declaration: data-behavior="name"
 * @param {object} methods - define methods of the behavior
 * @param {object} lifecycle - Register behavior lifecycle
 * @returns {Behavior}
 *
 * NB: methods or lifestyle fns with the same name will overwrite originals
 */
function extendBehavior(behavior, name, methods = {}, lifecycle = {}) {
  const newMethods = Object.assign(Object.assign({}, behavior.prototype.methods), methods);
  const newLifecycle = Object.assign(Object.assign({}, behavior.prototype.lifecycle), lifecycle);

  return createBehavior(name, newMethods, newLifecycle);
}

exports.createBehavior = createBehavior;
exports.extendBehavior = extendBehavior;
exports.manageBehaviors = manageBehaviors;
