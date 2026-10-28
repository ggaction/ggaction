// Review-only safety experiment; no product imports or public integration.
export function ownDataSnapshot(value, ancestors = new Set()) {
  if (value === null || typeof value !== 'object') {
    if (typeof value === 'function' || typeof value === 'symbol') throw new TypeError('Unsupported value.');
    return value;
  }
  if (ancestors.has(value)) throw new TypeError('Cycle.');
  const array = Array.isArray(value);
  const prototype = Object.getPrototypeOf(value);
  if (!array && prototype !== Object.prototype && prototype !== null) throw new TypeError('Not a plain record.');
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const keys = Reflect.ownKeys(descriptors);
  if (keys.some(key => typeof key !== 'string')) throw new TypeError('Symbol key.');
  for (const key of keys) {
    const descriptor = descriptors[key];
    if (!Object.hasOwn(descriptor, 'value')) throw new TypeError('Accessor.');
    if (array && key === 'length') continue;
    if (!descriptor.enumerable) throw new TypeError('Non-enumerable key.');
    if (['__proto__', 'constructor', 'prototype'].includes(key)) throw new TypeError('Reserved key.');
    if (array && !/^(?:0|[1-9][0-9]*)$/.test(key)) throw new TypeError('Array property.');
  }
  ancestors.add(value);
  const output = array ? new Array(descriptors.length.value) : Object.create(null);
  try {
    for (const key of keys) {
      if (array && key === 'length') continue;
      output[key] = ownDataSnapshot(descriptors[key].value, ancestors);
    }
    return Object.freeze(output);
  } finally { ancestors.delete(value); }
}
