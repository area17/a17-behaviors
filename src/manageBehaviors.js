import createBehavior from './createBehavior';
import isBreakpoint from '@area17/a17-helpers';

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
      if (!bMedia || isBreakpoint(bMedia)) {
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
  }

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
}

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
  }
}

export default exportObj;
