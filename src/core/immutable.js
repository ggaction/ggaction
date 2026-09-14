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
    Object.freeze(value);
    ownedValues.add(value);
  }

  return value;
}

export function isOwned(value) {
  return value !== null && typeof value === "object" && ownedValues.has(value);
}

export function cloneAndFreeze(value, ancestors = new WeakSet(), path = "state") {
  if (typeof value === "function") {
    throw new TypeError(`Cannot store a function at ${path} in a ChartProgram.`);
  }
  if (value === null || typeof value !== "object") {
    return value;
  }

  // Only library-owned values are recursively immutable; Object.freeze alone
  // does not prove ownership of a caller's descendants.
  if (isOwned(value)) return value;

  if (ancestors.has(value)) {
    throw new TypeError("Cannot store cyclic values in a ChartProgram.");
  }

  ancestors.add(value);

  let clone;

  if (Array.isArray(value)) {
    clone = value.map((item, index) => cloneAndFreeze(item, ancestors, `${path}[${index}]`));
  } else if (isPlainObject(value)) {
    clone = Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        cloneAndFreeze(item, ancestors, `${path}.${key}`)
      ])
    );
  } else {
    throw new TypeError("ChartProgram state only supports plain objects and arrays.");
  }

  ancestors.delete(value);
  return freezeOwned(clone);
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
