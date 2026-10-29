import assert from "node:assert/strict";
import test from "node:test";
import { chooseGestureBinding, idleGestureState, normalizeGestureBindings, reduceGesture } from "../../src/interaction/gestures.js";

const flags = extra => ({ alt: false, ctrl: false, meta: false, shift: false, ...extra });
const one = extra => chooseGestureBinding(normalizeGestureBindings([{ id: "selection", kind: "brush", ...extra }]), flags());
const down = (binding = one(), extra = {}) => ({ type: "down", pointerId: 1, pointerType: "mouse", point: { x: 10, y: 20 }, binding, ...extra });
const move = (x, y, extra = {}) => ({ type: "move", pointerId: 1, point: { x, y }, ...extra });
const up = (x, y, extra = {}) => ({ ...move(x, y, extra), type: "up" });
const types = result => result.effects.map(effect => effect.type);

test("gesture priority follows semantic handles and matches explicit modifier conjunctions", () => {
  const bindings = normalizeGestureBindings([
    { id: "inspect", kind: "inspect" }, { id: "pan", kind: "pan", pinch: true },
    { id: "node", kind: "moveNode" }, { id: "brush", kind: "brush", modifiers: { shift: true } },
    { id: "annotation", kind: "annotate", modifiers: { meta: true } },
    { id: "resize", kind: "resize", modifiers: { ctrl: true } }
  ]);
  assert.equal(chooseGestureBinding(bindings, flags()).id, "node");
  assert.equal(chooseGestureBinding(bindings, flags({ shift: true })).id, "brush");
  assert.equal(chooseGestureBinding(bindings, flags({ shift: true, meta: true })).id, "annotation");
  assert.equal(chooseGestureBinding(bindings, flags({ shift: true, meta: true, ctrl: true })).id, "resize");
  const conditional = normalizeGestureBindings([{ id: "on", kind: "select", modifiers: { alt: true } }]);
  assert.equal(chooseGestureBinding(conditional, flags()), null);
  assert.equal(chooseGestureBinding(conditional, flags({ alt: true })).id, "on");
  assert.equal(chooseGestureBinding(normalizeGestureBindings([]), flags()), null);
});

test("overlapping modifier requirements reject ties while disjoint alternatives stay deterministic", () => {
  assert.throws(() => normalizeGestureBindings([{ id: "a", kind: "brush" }, { id: "b", kind: "lasso" }]), /ambiguous/);
  assert.throws(() => normalizeGestureBindings([{ id: "a", kind: "select", modifiers: { shift: true } }, { id: "b", kind: "inspect", modifiers: { ctrl: true } }]), /ambiguous/);
  const bindings = normalizeGestureBindings([{ id: "a", kind: "select", modifiers: { shift: true } }, { id: "b", kind: "inspect", modifiers: { shift: false } }]);
  assert.equal(chooseGestureBinding(bindings, flags()).id, "b");
  assert.equal(chooseGestureBinding(bindings, flags({ shift: true })).id, "a");
  assert.equal(chooseGestureBinding(normalizeGestureBindings([{ id: "low", kind: "resize", priority: -1 }, { id: "high", kind: "inspect", priority: 0 }]), flags()).id, "high");
});

test("CSS Euclidean threshold is exactly three pixels and up always processes its final point", () => {
  const idle = idleGestureState(), armed = reduceGesture(idle, down());
  assert.deepEqual(types(armed), ["capture"]); assert.equal(armed.state.phase, "armed");
  const below = reduceGesture(armed.state, move(11.8, 22.399999));
  assert.equal(below.state.phase, "armed"); assert.deepEqual(types(below), ["inspect"]);
  const at = reduceGesture(armed.state, move(13, 20));
  assert.equal(at.state.phase, "dragging"); assert.deepEqual(types(at), ["preview"]);
  const back = reduceGesture(at.state, move(10, 20)); assert.equal(back.state.phase, "dragging");
  const click = reduceGesture(armed.state, up(12.9, 20));
  assert.deepEqual(types(click), ["release", "commit"]); assert.equal(click.effects[1].gesture, "click");
  const jump = reduceGesture(armed.state, up(16, 28));
  assert.deepEqual(types(jump), ["release", "preview", "commit"]); assert.equal(jump.effects[2].gesture, "drag");
  assert.deepEqual(jump.effects[1].pointers[0].point, { x: 16, y: 28 });
  assert.equal(idle.phase, "idle"); assert.deepEqual(armed.state.pointers[0].point, { x: 10, y: 20 });
});

test("one hundred moves produce one terminal commit and a late up is inert", () => {
  let current = reduceGesture(idleGestureState(), down()).state;
  const effects = [];
  for (let i = 1; i <= 100; i++) { const result = reduceGesture(current, move(10 + i, 20)); current = result.state; effects.push(...result.effects); }
  const done = reduceGesture(current, up(111, 20)); effects.push(...done.effects);
  assert.equal(effects.filter(effect => effect.type === "commit").length, 1);
  assert.equal(effects.filter(effect => effect.type === "cancel").length, 0);
  assert.equal(done.state.phase, "idle"); assert.deepEqual(types(reduceGesture(done.state, up(111, 20))), []);
  assert.deepEqual(done.effects.at(-1).pointers[0].point, { x: 111, y: 20 });
});

test("Escape after preview cancels once, releases capture and ignores late input", () => {
  const baseline = Object.freeze({ trace: Object.freeze(["authored"]), value: 7 });
  let current = reduceGesture(idleGestureState(), down()).state, terminal = [], captures = new Set([1]);
  for (const x of [15, 20, 30]) current = reduceGesture(current, move(x, 20)).state;
  for (const event of [{ type: "cancel", reason: "Escape" }, up(30, 20), { type: "cancel", reason: "Escape" }]) {
    const result = reduceGesture(current, event); current = result.state;
    for (const effect of result.effects) { if (effect.type === "release") captures.delete(effect.pointerId); if (["cancel", "commit"].includes(effect.type)) terminal.push(effect.type); }
  }
  assert.deepEqual(terminal, ["cancel"]); assert.equal(captures.size, 0); assert.equal(baseline.value, 7); assert.deepEqual(baseline.trace, ["authored"]);
});

test("every cancellation path is terminal once from armed or dragging", () => {
  for (const reason of ["pointercancel", "lostcapture", "blur", "updateProgram", "unmount", "movement", "destroy"]) for (const dragging of [false, true]) {
    let current = reduceGesture(idleGestureState(), down()).state;
    if (dragging) current = reduceGesture(current, move(40, 20)).state;
    assert.deepEqual(types(reduceGesture(current, { type: "cancel", reason, pointerId: 99 })), []);
    const done = reduceGesture(current, { type: "cancel", reason, pointerId: 1 });
    assert.deepEqual(types(done), ["release", "cancel"]); assert.equal(done.effects[1].reason, reason);
    assert.deepEqual(types(reduceGesture(done.state, up(40, 20))), []);
  }
});

test("pointer ownership is stable and secondary input cannot steal an ordinary gesture", () => {
  const current = reduceGesture(idleGestureState(), down()).state;
  for (const event of [down(), down(one(), { pointerId: 2 }), move(90, 90, { pointerId: 2 }), up(90, 90, { pointerId: 2 })]) {
    const result = reduceGesture(current, event); assert.equal(result.state, current); assert.deepEqual(result.effects, []);
  }
  const idle = idleGestureState(); assert.equal(reduceGesture(idle, move(10, 10)).state, idle);
});

test("pinch promotion requires the same explicit navigation binding and captures at most two pointers", () => {
  const pan = one({ kind: "pan", pinch: true });
  let current = reduceGesture(idleGestureState(), down(pan, { pointerType: "touch" })).state;
  const other = one({ id: "other", kind: "pan", pinch: true });
  assert.equal(reduceGesture(current, down(other, { pointerId: 2 })).state, current);
  const promoted = reduceGesture(current, down(pan, { pointerId: 2, pointerType: "touch", point: { x: 40, y: 20 } }));
  assert.equal(promoted.state.phase, "pinching"); assert.deepEqual(types(promoted), ["capture", "preview"]);
  current = promoted.state;
  assert.equal(reduceGesture(current, down(pan, { pointerId: 3 })).state, current);
  const moved = reduceGesture(current, move(50, 20, { pointerId: 2 })); assert.equal(moved.state.pointers[0].id, 1);
  const end = reduceGesture(moved.state, up(60, 20, { pointerId: 2 }));
  assert.deepEqual(types(end), ["release", "release", "preview", "commit"]); assert.equal(end.effects.at(-1).gesture, "pinch");
  assert.deepEqual(end.effects.slice(0, 2).map(effect => effect.pointerId), [1, 2]);
  const zero = reduceGesture(reduceGesture(idleGestureState(), down(pan)).state, down(pan, { pointerId: 2 }));
  assert.equal(zero.state.phase, "pinching");
  const disabled = one({ kind: "pan", pinch: false }), single = reduceGesture(idleGestureState(), down(disabled)).state;
  assert.equal(reduceGesture(single, down(pan, { pointerId: 2 })).state, single);
});

test("destroy releases active pointers once and leaves a terminal immutable state", () => {
  const active = reduceGesture(idleGestureState(), down()).state;
  const end = reduceGesture(active, { type: "destroy" }); assert.deepEqual(types(end), ["release", "cancel"]); assert.equal(end.state.phase, "disposed");
  for (const event of [{ type: "destroy" }, { type: "cancel", reason: "blur" }, down(), move(10, 20), up(10, 20)]) assert.equal(reduceGesture(end.state, event).state, end.state);
  assert.deepEqual(types(reduceGesture(idleGestureState(), { type: "destroy" })), []);
  assert.deepEqual(types(reduceGesture(idleGestureState(), { type: "cancel", reason: "lostcapture", pointerId: 1 })), []);
});

test("input validation is closed, bounded and atomic without running getters", () => {
  const invalid = [null, {}, { id: "", kind: "select" }, { id: "x", kind: "unknown" }, { id: "x", kind: {} }, { id: "x", kind: "select", priority: NaN }, { id: "x", kind: "select", priority: 1.5 }, { id: "x", kind: "select", priority: 1_000_001 }, { id: "x", kind: "select", modifiers: null }, { id: "x", kind: "select", modifiers: { shift: 1 } }, { id: "x", kind: "select", pinch: true }, { id: "x", kind: "pan", pinch: null }];
  for (const input of invalid) assert.throws(() => normalizeGestureBindings([input]));
  assert.throws(() => normalizeGestureBindings([{ id: "x", kind: "select" }, { id: "x", kind: "pan" }]), /unique/);
  assert.throws(() => normalizeGestureBindings(Array.from({ length: 257 }, (_, i) => ({ id: String(i), kind: "select", priority: i }))), /budget/);
  const bounded = normalizeGestureBindings(Array.from({ length: 256 }, (_, i) => ({ id: String(i), kind: "select", priority: i })));
  assert.equal(chooseGestureBinding(bounded, flags()).id, "255");
  assert.throws(() => chooseGestureBinding([], flags()), /normalized/);
  assert.throws(() => chooseGestureBinding(bounded, {}));
  let calls = 0; const getter = { id: "x", get kind() { calls++; return "select"; } };
  assert.throws(() => normalizeGestureBindings([getter])); assert.equal(calls, 0);
  assert.throws(() => reduceGesture({ phase: "idle" }, down()), /own immutable/);
  const current = reduceGesture(idleGestureState(), down()).state, before = JSON.stringify(current);
  for (const event of [{ type: "unknown" }, { type: "cancel", reason: "other" }, { type: "destroy", reason: "blur" }, move(NaN, 0), move(0, Infinity), move(0, 0, { pointerId: -1 }), down(one(), { pointerType: "trackpad" }), { ...move(0, 0), extra: true }]) assert.throws(() => reduceGesture(current, event));
  assert.equal(JSON.stringify(current), before);
  const extreme = reduceGesture(idleGestureState(), down(one(), { point: { x: 1e308, y: 0 } })).state;
  assert.throws(() => reduceGesture(extreme, move(-1e308, 0)), /finite/);
  const value = down(); const owned = reduceGesture(idleGestureState(), value).state; value.point.x = 100;
  assert.equal(owned.start.x, 10); assert.ok(Object.isFrozen(owned.pointers)); assert.throws(() => { owned.pointers[0].point.x = 500; });
});
