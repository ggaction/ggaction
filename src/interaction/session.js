import { ownHitScene } from "./sceneFrame.js";
import { cloneAndFreeze, freezeOwned } from "../core/immutable.js";
import { ownArray, ownRecord } from "../core/ownData.js";
import { resolveHitCoordinates, transformHitPoint } from "../grammar/hitCoordinates.js";
import { normalizeHitQuery } from "../grammar/hitShapes.js";
import { prepareProgramHitFrame, rebindProgramHitFrame } from "./hitProgram.js";
import { createHitFrameBridge } from "./hitFrame.js";

const IDENTITY = Object.freeze([1, 0, 0, 1, 0, 0]);
const MAX_DISPATCHES = 256;
function options(value, required, optional, label) {
  ownRecord(value, label);
  if (required.some(key => !Object.hasOwn(value, key)) || Object.keys(value).some(key => !required.includes(key) && !optional.includes(key))) {
    throw new TypeError(`${label} contains unsupported or missing options.`);
  }
  return Object.assign(Object.create(null), value);
}
function bindings(value) {
  if (value === undefined) value = [{ type: "inspect" }];
  if (!Array.isArray(value) || value.length > 1) throw new TypeError("Interaction bindings support at most one inspect binding.");
  ownArray(value, "Interaction bindings");
  return freezeOwned(value.map(binding => {
    const request = options(binding, ["type"], ["events", "slop", "hitInvisible"], "Inspect binding");
    if (request.type !== "inspect") throw new TypeError("Unsupported interaction binding type.");
    const events = request.events === undefined ? ["pointermove", "click"] : request.events;
    ownArray(events, "Inspect binding events");
    if (!events.length || events.length > 2 || new Set(events).size !== events.length || events.some(event => !["pointermove", "click"].includes(event))) {
      throw new TypeError("Inspect binding events require distinct pointermove or click values.");
    }
    const query = normalizeHitQuery({ ...(request.slop === undefined ? {} : { slop: request.slop }),
      ...(request.hitInvisible === undefined ? {} : { hitInvisible: request.hitInvisible }) });
    return cloneAndFreeze({ type: "inspect", events, ...(request.slop === undefined ? {} : { slop: query.slop }), hitInvisible: query.hitInvisible });
  }));
}
function nextInteger(value) {
  if (value === Number.MAX_SAFE_INTEGER) throw new RangeError("Interaction frame counter is exhausted.");
  return value + 1;
}
const outcome = status => freezeOwned({ status });
const emptyHit = (frameVersion, diagnostics) => cloneAndFreeze({ target: null, candidates: [], diagnostics,
  statistics: { visited: 0, tested: 0, work: 0 }, frameVersion });

/** Browser-safe inspection lifecycle. Editing gestures have their own later command owners. */
export function createInteractionSession(input) {
  const request = options(input, ["program"], ["bindings"], "Interaction session");
  const configured = bindings(request.bindings);
  let program = request.program, base = prepareProgramHitFrame(program), bridge = createHitFrameBridge(base);
  let rootTransform = IDENTITY, mounted, destroyed = false, generation = 0, lastHit = null, processing = false;
  let state;
  const queue = [], listeners = new Set();
  const snapshot = () => state = freezeOwned({ program, scene: bridge.getState().scene,
    frameVersion: bridge.getState().version, generation, hit: lastHit, mounted: mounted !== undefined, destroyed });
  snapshot();
  const live = () => { if (destroyed) throw new Error("Interaction session is disposed."); };
  const publish = type => {
    const event = freezeOwned({ type, state: snapshot() });
    for (const listener of [...listeners]) if (listeners.has(listener)) listener(event);
  };
  const perform = operation => {
    live();
    if (queue.length >= MAX_DISPATCHES) throw new RangeError("Interaction dispatch queue exceeds its work budget.");
    queue.push(operation);
    if (processing) return outcome("queued");
    processing = true;
    let first, count = 0;
    try {
      while (queue.length) {
        if (++count > MAX_DISPATCHES) throw new RangeError("Interaction dispatch queue exceeds its work budget.");
        const result = queue.shift()();
        first ??= result;
      }
      return first;
    } finally { processing = false; queue.length = 0; }
  };
  const inspect = (point, query = {}) => {
    lastHit = bridge.hit(point, query); publish("inspect"); return outcome("applied");
  };
  const clear = () => { lastHit = null; publish("leave"); return outcome("applied"); };
  const detach = lease => {
    for (const [event, listener] of lease.listeners) lease.element.removeEventListener(event, listener);
    lease.listeners.length = 0; lease.element = undefined;
  };
  const close = () => {
    if (mounted !== undefined) detach(mounted);
    mounted = undefined; lastHit = null; destroyed = true;
    try { publish("destroy"); } finally { listeners.clear(); bridge.dispose(); base = null; rootTransform = IDENTITY; queue.length = 0; }
    return outcome("applied");
  };
  const dispatch = command => {
    live();
    const head = options(command, ["type"], ["point", "pointerType", "slop", "hitInvisible", "scene", "version", "generation"], "Interaction command");
    if (head.type === "inspect") {
      const c = options(head, ["type", "point"], ["pointerType", "slop", "hitInvisible"], "Inspect command");
      const point = transformHitPoint(IDENTITY, c.point), query = normalizeHitQuery(Object.fromEntries(
        ["pointerType", "slop", "hitInvisible"].filter(key => Object.hasOwn(c, key)).map(key => [key, c[key]])));
      return perform(() => inspect(point, query));
    }
    if (head.type === "leave") { options(head, ["type"], [], "Leave command"); return perform(clear); }
    if (head.type === "frame") {
      const c = options(head, ["type", "scene", "version", "generation"], [], "Frame command");
      if (![c.version, c.generation].every(value => Number.isSafeInteger(value) && value >= 0)) throw new TypeError("Frame command counters must be non-negative safe integers.");
      // Snapshot current host data at dispatch; a late result is never inspected.
      const scene = c.generation === generation && c.version > bridge.getState().version ? ownHitScene(c.scene) : undefined;
      return perform(() => {
        if (c.generation !== generation || c.version <= bridge.getState().version) return outcome("stale");
        const frame = rebindProgramHitFrame(base, scene, c.version, rootTransform);
        bridge.updateFrame(frame); lastHit = null; publish("frame"); return outcome("applied");
      });
    }
    throw new TypeError("Unsupported interaction command type.");
  };
  return Object.freeze({
    getState() { return state; },
    dispatch,
    updateProgram(next) {
      return perform(() => {
        const version = nextInteger(bridge.getState().version), nextGeneration = nextInteger(generation);
        const candidate = prepareProgramHitFrame(next, version);
        const frame = rebindProgramHitFrame(candidate, candidate.scene, version, rootTransform);
        bridge.updateFrame(frame); base = candidate; program = next; generation = nextGeneration; lastHit = null;
        publish("program"); return outcome("applied");
      });
    },
    subscribe(listener) {
      live(); if (typeof listener !== "function") throw new TypeError("Interaction subscriber must be a function.");
      listeners.add(listener); return () => listeners.delete(listener);
    },
    mount(element, configuration = {}) {
      live();
      const config = options(configuration, [], ["rootTransform"], "Interaction mount");
      const matrix = config.rootTransform === undefined ? IDENTITY : config.rootTransform;
      transformHitPoint(matrix, { x: 0, y: 0 });
      const transform = cloneAndFreeze(matrix);
      if (!element || !["addEventListener", "removeEventListener", "getBoundingClientRect"].every(key => typeof element[key] === "function")) {
        throw new TypeError("Interaction mount requires an event surface with a client rectangle.");
      }
      const lease = { element, listeners: [] };
      perform(() => {
        const version = nextInteger(bridge.getState().version);
        const frame = rebindProgramHitFrame(base, bridge.getState().scene, version, transform);
        const candidate = createHitFrameBridge(frame);
        try {
          for (const binding of configured) for (const event of [...binding.events, "pointerleave"]) {
            const listener = event === "pointerleave" ? () => { if (!destroyed && mounted === lease) dispatch({ type: "leave" }); }
              : eventObject => {
                if (destroyed || mounted !== lease) return;
                const bounds = element.getBoundingClientRect();
                const coordinates = resolveHitCoordinates({ point: { x: eventObject.clientX, y: eventObject.clientY },
                  rect: { left: bounds.left, top: bounds.top, width: bounds.width, height: bounds.height },
                  rootTransform: transform, childTransforms: [] });
                const query = { pointerType: eventObject.pointerType || "mouse", hitInvisible: binding.hitInvisible,
                  ...(binding.slop === undefined ? {} : { slop: binding.slop }) };
                if (coordinates.localPoint === null) perform(() => {
                  lastHit = emptyHit(bridge.getState().version, coordinates.diagnostics); publish("inspect"); return outcome("applied");
                });
                else dispatch({ type: "inspect", point: coordinates.screenPoint, ...query });
              };
            lease.listeners.push([event, listener]); element.addEventListener(event, listener, { passive: true });
          }
        } catch (error) { detach(lease); candidate.dispose(); throw error; }
        if (mounted !== undefined) detach(mounted);
        bridge.dispose(); bridge = candidate; mounted = lease; rootTransform = transform; lastHit = null; publish("mount");
        return outcome("applied");
      });
      return () => {
        if (destroyed || mounted !== lease) return false;
        perform(() => {
          if (mounted !== lease) return outcome("stale");
          const version = nextInteger(bridge.getState().version), frame = rebindProgramHitFrame(base, bridge.getState().scene, version);
          bridge.updateFrame(frame); detach(lease); mounted = undefined; rootTransform = IDENTITY; lastHit = null; publish("unmount");
          return outcome("applied");
        });
        return true;
      };
    },
    destroy() {
      if (destroyed || queue.includes(close)) return false;
      perform(close);
      return true;
    }
  });
}
