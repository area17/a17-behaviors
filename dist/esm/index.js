var getCurrentMediaQuery = function() {
  // Doc: https://code.area17.com/a17/a17-helpers/wikis/getCurrentMediaQuery

  return getComputedStyle(document.documentElement).getPropertyValue('--breakpoint').trim().replace(/"/g, '');
};

var resized = function() {
  // Doc: https://code.area17.com/a17/a17-helpers/wikis/resized

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
  // Doc: https://code.area17.com/a17/a17-helpers/wikis/isBreakpoint

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
  // Doc: https://code.area17.com/a17/a17-helpers/wikis/purgeProperties
  for (var prop in obj) {
    if (obj.hasOwnProperty(prop)) {
      delete obj[prop];
    }
  }

  // alternatives considered: https://jsperf.com/deleting-properties-from-an-object
};

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

    purgeProperties(this);
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
    const mb = exportObj;
    if (typeof SubBehavior === 'string') {
      mb.initBehavior(SubBehavior, node, config);
    } else {
      mb.add(SubBehavior);
      mb.initBehavior(SubBehavior.prototype.behaviorName, node, config);
    }
  },
  isBreakpoint(bp) {
    return isBreakpoint(bp, this.__breakpoints);
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
    if (this.lifecycle.mediaQueryUpdated != null) {
      this.lifecycle.mediaQueryUpdated.call(this, e);
    }
    if (this.options.media) {
      this.__toggleEnabled();
    }
  },
  __resized(e) {
    if (this.lifecycle.resized != null) {
      this.lifecycle.resized.call(this, e);
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

  rNode - node to destroy behaviors on (and inside of)

  if a node with behaviors is removed from the DOM,
  clean up to save resources
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
    import(`${process.env.BEHAVIORS_PATH}${process.env.BEHAVIORS_COMPONENT_PATHS[bName]||''}${bName}.${process.env.BEHAVIORS_EXTENSION }`).then(module => {
      behaviorImported(bName, bNode, module);
    }).catch(err => {
      console.warn(`No loaded behavior called: ${bName}`);
      // fail, clean up
      importFailed(bName);
    });
  } catch(err1) {
    try {
      import(`${process.env.BEHAVIORS_PATH}${bName}.${process.env.BEHAVIORS_EXTENSION}`).then(module => {
        behaviorImported(bName, bNode, module);
      }).catch(err => {
        console.warn(`No loaded behavior called: ${bName}`);
        // fail, clean up
        importFailed(bName);
      });
    } catch(err2) {
      console.warn(`Unknown behavior called: ${bName}. \nIt maybe the behavior doesn't exist, check for typos and check Webpack has generated your file. \nYou might also want to check your webpack config plugins DefinePlugin for process.env.BEHAVIORS_EXTENSION, process.env.BEHAVIORS_PATH and or process.env.BEHAVIORS_COMPONENT_PATHS. See https://github.com/area17/a17-behaviors/wiki/02-Setup#webpackcommonjs`);
      // fail, clean up
      importFailed(bName);
    }
  }
}

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
  resized();

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
  initBehavior: initBehavior,
  get currentBreakpoint() {
    return getCurrentMediaQuery();
  }
};

if (process.env.MODE && process.env.MODE === 'development') {
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

export { createBehavior, exportObj as manageBehaviors };
//# sourceMappingURL=index.js.map
