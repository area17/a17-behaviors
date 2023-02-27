import createBehavior from './createBehavior';

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
  const newMethods = behavior.prototype.methods;
  const methodsKeys = Object.keys(methods);
  methodsKeys.forEach(key => {
    newMethods[key] = methods[key];
  });

  const newLifecycle = behavior.prototype.lifecycle;
  const lifecycleKeys = Object.keys(lifecycle);
  lifecycleKeys.forEach(key => {
    newLifecycle[key] = lifecycle[key];
  });

  return createBehavior(name, newMethods, newLifecycle);
}

export default extendBehavior;
