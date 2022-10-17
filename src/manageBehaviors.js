import resized from '@area17/a17-helpers/src/resized';
import getCurrentMediaQuery from '@area17/a17-helpers/src/getCurrentMediaQuery';
import isBreakpoint from '@area17/a17-helpers/src/isBreakpoint';
import createBehavior from './createBehavior';

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
    return bNode.dataset[attr].split(' ');
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
      `${process.env.BEHAVIORS_PATH}/${(process.env.BEHAVIORS_COMPONENT_PATHS[bName]||'').replace(/^\/|\/$/ig,'')}/${bName}.${process.env.BEHAVIORS_EXTENSION || 'js' }`
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
        `${process.env.BEHAVIORS_PATH}/${bName}.${process.env.BEHAVIORS_EXTENSION || 'js' }`
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
      // try and apply behaviors to any DOM node that needs them
      createBehaviors(document);
      // start the mutation observer looking for DOM changes
      if (!observingBehaviors) {
        observeBehaviors();
      }
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
  }

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
}

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

export default exportObj;
