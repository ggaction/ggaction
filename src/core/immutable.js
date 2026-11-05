import { STAGE_ROWS } from "./stages.js";

// Exact-object ownership is a module-private field on the owned value itself.
// A process-wide weak table rehashes in place under short-lived registrations
// (see agent_docs/impl/roadmap9/qualification/OWNED_MARK_DECISION.md). Only this
// module can add or test the mark; copies, clones, spreads and proxy targets of
// an owned value are not owned, and a parent never vouches for its descendants.
class OwnedTarget { constructor(value) { return value; } }
class OwnedMark extends OwnedTarget {
  #owned;
  // Return the constructed value so minifiers cannot drop the marking call.
  static add(value) { return new OwnedMark(value); }
  static has(value) { return #owned in value; }
}
// Engines that refuse private fields on non-extensible objects keep the same
// exact-object semantics through this fallback.
const unmarkableOwnedValues = new WeakSet();

export function isPlainObject(value) {
  if (value === null || typeof value !== "object") {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

export function freezeOwned(value) {
  if (value !== null && typeof value === "object") {
    if (isOwned(value)) return value;
    Object.freeze(value);
    try {
      if (OwnedMark.add(value) !== value) throw new TypeError("Ownership mark did not attach to its value.");
    } catch (error) {
      if (!(error instanceof TypeError)) throw error;
      unmarkableOwnedValues.add(value);
    }
  }

  return value;
}

// A fresh record whose every member is a primitive or an owned value is
// already a complete immutable value. Owning it lets cloneAndFreeze reuse it;
// any unowned object member leaves the record for an ordinary copy.
export function ownWhenMembersOwned(value) {
  if (!Array.isArray(value) && !isPlainObject(value)) return value;
  for (const member of Object.values(value)) {
    if (member !== null && typeof member === "object" ? !isOwned(member) : typeof member === "function") return value;
  }
  return freezeOwned(value);
}

export function isOwned(value) {
  return value !== null && typeof value === "object" &&
    (OwnedMark.has(value) || unmarkableOwnedValues.has(value));
}

export function cloneAndFreeze(value, ancestors = new WeakSet(), path = "state") {
  const state = cloneFrames(value, ancestors, path);
  while (state.pending.length) state.step();
  return state.result;
}

// The same copy as cloneAndFreeze, yielding between batches of visited values.
export function* cloneAndFreezeStages(value, ancestors = new WeakSet(), path = "state") {
  const state = cloneFrames(value, ancestors, path);
  for (let steps = 1; state.pending.length; steps++) {
    state.step();
    if (steps % STAGE_ROWS === 0) yield;
  }
  return state.result;
}

// One explicit-stack copy shared by the synchronous and staged forms.
function cloneFrames(value, ancestors, path) {
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
  const step = () => {
    const frame = pending.at(-1);
    if (frame.cursor === frame.length) {
      freezeOwned(frame.clone);
      ancestors.delete(frame.input);
      pending.pop();
      return;
    }
    const index = frame.cursor++;
    if (frame.array && !(index in frame.input)) return;
    const [key, item] = frame.array ? [index, frame.input[index]] : frame.entries[index];
    const child = copy(item, frame.array ? `${frame.location}[${key}]` : `${frame.location}.${key}`);
    if (!frame.array && key in Object.prototype) Object.defineProperty(frame.clone, key, {
      value: child, enumerable: true, writable: true, configurable: true
    });
    else frame.clone[key] = child;
  };
  return { result, pending, step };
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
