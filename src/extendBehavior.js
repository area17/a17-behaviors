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
  const newMethods = Object.assign(Object.assign({}, behavior.prototype.methods), methods);
  const newLifecycle = Object.assign(Object.assign({}, behavior.prototype.lifecycle), lifecycle);

  return createBehavior(name, newMethods, newLifecycle);
}

export default extendBehavior;
