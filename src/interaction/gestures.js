import { cloneAndFreeze, freezeOwned } from "../core/immutable.js";
import { ownArray } from "../core/ownData.js";
import { interactionOptions as options } from "./input.js";

const PRIORITY = Object.freeze({ resize: 60, reorder: 60, annotate: 50, brush: 40, lasso: 40, moveNode: 30, pan: 20, select: 10, inspect: 10 });
const MODIFIERS = Object.freeze(["alt", "ctrl", "meta", "shift"]);
const POINTERS = Object.freeze(["mouse", "pen", "touch"]);
const CANCEL_REASONS = Object.freeze(["Escape", "pointercancel", "lostcapture", "blur", "updateProgram", "unmount", "movement", "destroy"]);
const STATES = new WeakSet();
const BINDINGS = new WeakSet();
const THRESHOLD = 3;

function modifiers(value, required = false) {
  const input = options(value, required ? MODIFIERS : [], required ? [] : MODIFIERS, "Gesture modifiers");
  for (const flag of Object.values(input)) if (typeof flag !== "boolean") throw new TypeError("Gesture modifiers require boolean flags.");
  return input;
}
function binding(value) {
  const input = options(value, ["id", "kind"], ["priority", "modifiers", "pinch"], "Gesture binding");
  if (typeof input.id !== "string" || !input.id.length || input.id.length > 1024 || typeof input.kind !== "string" || !Object.hasOwn(PRIORITY, input.kind)) throw new TypeError("Gesture binding requires a bounded ID and supported kind.");
  const priority = input.priority === undefined ? PRIORITY[input.kind] : input.priority;
  if (!Number.isSafeInteger(priority) || Math.abs(priority) > 1_000_000) throw new RangeError("Gesture priority must be a bounded integer.");
  if (input.pinch !== undefined && (typeof input.pinch !== "boolean" || (input.pinch && input.kind !== "pan"))) throw new TypeError("Only navigation gestures can declare pinch.");
  return cloneAndFreeze({ id: input.id, kind: input.kind, priority, modifiers: modifiers(input.modifiers === undefined ? {} : input.modifiers), pinch: input.pinch === true });
}

// Applicability (owner/hit/role) is determined by the domain adapter. This owner
// arbitrates only its applicable candidates and explicit modifier constraints.
export function normalizeGestureBindings(values) {
  ownArray(values, "Gesture bindings");
  if (values.length > 256) throw new RangeError("Gesture bindings exceed their count budget.");
  const result = values.map(binding), ids = new Set();
  for (let i = 0; i < result.length; i++) {
    const current = result[i];
    if (ids.has(current.id)) throw new TypeError("Gesture binding IDs must be unique.");
    ids.add(current.id);
    for (let j = 0; j < i; j++) {
      const previous = result[j];
      if (current.priority === previous.priority && MODIFIERS.every(key => current.modifiers[key] === undefined || previous.modifiers[key] === undefined || current.modifiers[key] === previous.modifiers[key])) {
        throw new Error("Gesture bindings have ambiguous priority and modifier conditions.");
      }
    }
  }
  freezeOwned(result); BINDINGS.add(result); return result;
}
export function chooseGestureBinding(bindings, flags) {
  if (!BINDINGS.has(bindings)) throw new TypeError("Gesture candidates require normalized bindings.");
  const actual = modifiers(flags, true);
  let selected;
  for (const candidate of bindings) if (MODIFIERS.every(key => candidate.modifiers[key] === undefined || candidate.modifiers[key] === actual[key]) && (!selected || candidate.priority > selected.priority)) selected = candidate;
  return selected ?? null;
}
function state(value) { const result = freezeOwned(value); STATES.add(result); return result; }
export function idleGestureState() { return state({ phase: "idle" }); }
function point(value) {
  const input = options(value, ["x", "y"], [], "Gesture CSS point");
  if (!Number.isFinite(input.x) || !Number.isFinite(input.y)) throw new TypeError("Gesture coordinates must be finite CSS pixels.");
  return freezeOwned({ x: input.x, y: input.y });
}
function pointerId(value) {
  if (!Number.isSafeInteger(value) || value < 0) throw new TypeError("Gesture pointer ID must be a non-negative integer.");
  return value;
}
function distance(a, b) {
  const length = Math.hypot(a.x - b.x, a.y - b.y);
  if (!Number.isFinite(length)) throw new RangeError("Gesture displacement exceeds finite coordinates.");
  return length;
}
function output(next, effects = []) { return freezeOwned({ state: next, effects: freezeOwned(effects) }); }
function release(current) { return current.pointers.map(pointer => freezeOwned({ type: "release", pointerId: pointer.id })); }
function snapshot(current, type, extra = {}) {
  return freezeOwned({ type, binding: current.binding, start: current.start, pointers: current.pointers, ...extra });
}

// State and effects contain only bounded immutable data. The host owns capture,
// RAF, program baselines and publication; no event object or callback is retained.
export function reduceGesture(current, value) {
  if (!STATES.has(current)) throw new TypeError("Gesture reducer requires its own immutable state.");
  const input = options(value, ["type"], ["pointerId", "pointerType", "point", "binding", "reason"], "Gesture event");
  if (!["down", "move", "up", "cancel", "destroy"].includes(input.type)) throw new TypeError("Unsupported gesture event type.");
  if (input.type === "cancel" || input.type === "destroy") {
    options(input, ["type", ...(input.type === "cancel" ? ["reason"] : [])], input.type === "cancel" ? ["pointerId"] : [], "Gesture cancellation");
    const reason = input.type === "destroy" ? "destroy" : input.reason;
    if (!CANCEL_REASONS.includes(reason)) throw new TypeError("Unsupported gesture cancellation reason.");
    const id = input.pointerId === undefined ? undefined : pointerId(input.pointerId);
    if (current.phase === "disposed") return output(current);
    if (id !== undefined && (current.phase === "idle" || !current.pointers.some(pointer => pointer.id === id))) return output(current);
    const next = input.type === "destroy" ? state({ phase: "disposed" }) : idleGestureState();
    return current.phase === "idle" ? output(next) : output(next, [...release(current), snapshot(current, "cancel", { reason })]);
  }
  options(input, ["type", "pointerId", "point", ...(input.type === "down" ? ["pointerType", "binding"] : [])], [], "Gesture pointer event");
  const id = pointerId(input.pointerId), position = point(input.point);
  let selected;
  if (input.type === "down") {
    if (!POINTERS.includes(input.pointerType)) throw new TypeError("Unsupported gesture pointer type.");
    selected = binding(input.binding);
  }
  if (current.phase === "disposed") return output(current);
  if (input.type === "down") {
    if (current.phase === "idle") {
      const next = state({ phase: "armed", binding: selected, start: position, pointers: freezeOwned([freezeOwned({ id, type: input.pointerType, start: position, point: position })]) });
      return output(next, [freezeOwned({ type: "capture", pointerId: id })]);
    }
    if (current.pointers.some(pointer => pointer.id === id) || current.pointers.length === 2 || !current.binding.pinch || !selected.pinch || selected.id !== current.binding.id) return output(current);
    const pointers = freezeOwned([...current.pointers, freezeOwned({ id, type: input.pointerType, start: position, point: position })]);
    distance(pointers[0].point, position);
    const next = state({ ...current, phase: "pinching", pointers });
    return output(next, [freezeOwned({ type: "capture", pointerId: id }), snapshot(next, "preview")]);
  }
  if (current.phase === "idle" || !current.pointers.some(pointer => pointer.id === id)) return output(current);
  const pointers = freezeOwned(current.pointers.map(pointer => pointer.id === id ? freezeOwned({ ...pointer, point: position }) : pointer));
  const moved = distance(pointers[0].start, pointers[0].point) >= THRESHOLD;
  if (pointers.length === 2) distance(pointers[0].point, pointers[1].point);
  const next = state({ ...current, phase: current.phase === "armed" && moved ? "dragging" : current.phase, pointers });
  if (input.type === "move") return output(next, [snapshot(next, next.phase === "armed" ? "inspect" : "preview")]);
  const gesture = next.phase === "armed" ? "click" : next.phase === "pinching" ? "pinch" : "drag";
  return output(idleGestureState(), [...release(next), ...(gesture === "click" ? [] : [snapshot(next, "preview")]), snapshot(next, "commit", { gesture })]);
}
