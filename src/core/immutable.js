const ownedValues = new WeakSet();

export function isPlainObject(value) {
  if (value === null || typeof value !== "object") {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

export function freezeOwned(value) {
  if (value !== null && typeof value === "object") {
    if (ownedValues.has(value)) return value;
    Object.freeze(value);
    ownedValues.add(value);
  }

  return value;
}

export function isOwned(value) {
  return value !== null && typeof value === "object" && ownedValues.has(value);
}

export function cloneAndFreeze(value, ancestors = new WeakSet(), path = "state") {
  const pending = [];
  function copy(input, location) {
    if (typeof input === "function") throw new TypeError(`Cannot store a function at ${location} in a ChartProgram.`);
    if (input === null || typeof input !== "object") return input;
    // A caller's shallow freeze never establishes ownership of descendants.
    if (isOwned(input)) return input;
    if (ancestors.has(input)) throw new TypeError("Cannot store cyclic values in a ChartProgram.");
    const array = Array.isArray(input);
    if (!array && !isPlainObject(input)) throw new TypeError("ChartProgram state only supports plain objects and arrays.");
    const clone = array ? new Array(input.length) : {};
    // Objects snapshot their entries before descent. Arrays retain map's
    // length snapshot and read each present index when it is visited.
    const entries = array ? undefined : Object.entries(input);
    ancestors.add(input);
    pending.push({ input, clone, array, entries, cursor: 0, length: array ? clone.length : entries.length, location });
    return clone;
  }
  const result = copy(value, path);
  while (pending.length) {
    const frame = pending.at(-1);
    if (frame.cursor === frame.length) {
      freezeOwned(frame.clone);
      ancestors.delete(frame.input);
      pending.pop();
      continue;
    }
    const index = frame.cursor++;
    if (frame.array && !(index in frame.input)) continue;
    const [key, item] = frame.array ? [index, frame.input[index]] : frame.entries[index];
    const child = copy(item, frame.array ? `${frame.location}[${key}]` : `${frame.location}.${key}`);
    if (!frame.array && key in Object.prototype) Object.defineProperty(frame.clone, key, {
      value: child, enumerable: true, writable: true, configurable: true
    });
    else frame.clone[key] = child;
  }
  return result;
}

export function removeOwnedPath(source, path) {
  if (!isPlainObject(source)) {
    throw new TypeError("Structural removal requires a plain object source.");
  }
  if (
    !Array.isArray(path) ||
    path.length === 0 ||
    !path.every(key => typeof key === "string" && key.length > 0)
  ) {
    throw new TypeError("Structural removal path must contain names.");
  }

  const [key, ...rest] = path;
  if (!Object.hasOwn(source, key)) {
    return { value: source, removed: false };
  }

  if (rest.length === 0) {
    const { [key]: removedValue, ...remaining } = source;
    void removedValue;
    return { value: freezeOwned(remaining), removed: true };
  }

  const child = source[key];
  if (!isPlainObject(child)) {
    return { value: source, removed: false };
  }
  const removed = removeOwnedPath(child, rest);
  if (!removed.removed) return { value: source, removed: false };

  if (Object.keys(removed.value).length === 0) {
    const { [key]: emptyChild, ...remaining } = source;
    void emptyChild;
    return { value: freezeOwned(remaining), removed: true };
  }
  return {
    value: freezeOwned({ ...source, [key]: removed.value }),
    removed: true
  };
}
