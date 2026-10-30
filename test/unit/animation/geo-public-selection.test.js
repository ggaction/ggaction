import assert from "node:assert/strict";
import test from "node:test";
import { planTransition, sampleTransition } from "../../../src/animation.js";
import { createInteractionSession } from "../../../src/interaction.js";
import { getMarkItems } from "../../../src/inspection.js";
import { serializeProgram } from "../../../src/persistence.js";
import { resolveStoredSelection } from "../../../src/materialization/selection/state.js";
import { animationGeoFrame } from "../../support/animation-geo-frame.js";

const accept = (session, frame) => session.dispatch({ type: "frame", frame,
  version: session.getState().frameVersion + 1, generation: session.getState().generation });
function transition(variant) {
  const from = animationGeoFrame(variant).from.selectMarks({ id: "picked", target: "places", items: [], empty: "none" });
  const to = from.editProjection({ translatePx: [600, 150] });
  const plan = planTransition({ from, to, options: { durationMs: 100, easing: "linear" } });
  return { from, to, plan, frame: sampleTransition(plan, 50) };
}

test("public native Geo middle-only frame supports keyboard selection without endpoint indices", () => {
  const { from, to, frame } = transition("point"), before = serializeProgram(from);
  assert.deepEqual(getMarkItems(from), []); assert.deepEqual(getMarkItems(to), []);
  const decision = frame.decisions.find(value => value.kind === "geographic");
  assert.ok(decision); assert.equal(Object.hasOwn(decision, "targetIndex"), false);
  const session = createInteractionSession({ program: from, selectionPolicy: "drop", bindings: [{
    type: "keyboard", targets: [{ target: "places", activation: { type: "select", selection: "picked" } }]
  }] });
  try {
    accept(session, frame);
    session.dispatch({ type: "focus", target: "places", itemKey: decision.itemKey });
    assert.deepEqual(session.getState().focus.screenPoint, { x: 200, y: 150 });
    session.dispatch({ type: "activate" });
    const next = session.getState().program;
    assert.deepEqual(resolveStoredSelection(next, "picked").selector.items, [decision.itemKey]);
    assert.deepEqual(resolveStoredSelection(next, "picked").keys, []);
    assert.deepEqual(resolveStoredSelection(next, "picked", { membership: true }).keys, [decision.itemKey]);
    assert.equal(session.getState().history.undoCount, 1); assert.equal(session.getState().animationFrame, null);
    assert.equal(serializeProgram(from), before);
    session.dispatch({ type: "undo" }); assert.equal(session.getState().program, from);
  } finally { session.destroy(); }
});

test("public native graticule frame click keeps target hit revision and current source intent", () => {
  const { from, frame } = transition("graticule"), before = serializeProgram(from), listeners = new Map();
  const host = {
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 400, height: 300 }),
    addEventListener(type, callback) { const callbacks = listeners.get(type) ?? new Set(); callbacks.add(callback); listeners.set(type, callbacks); },
    removeEventListener(type, callback) { listeners.get(type)?.delete(callback); }
  };
  const session = createInteractionSession({ program: from, bindings: [{ type: "select", target: "places", selection: "picked", onMiss: "ignore" }] });
  try {
    session.mount(host); accept(session, frame);
    session.dispatch({ type: "inspect", point: { x: 200, y: 150 }, slop: 0 });
    const hit = session.getState().hit;
    assert.equal(hit.target.ownerId, "places");
    assert.deepEqual(hit.target.resourceRefs, [{ kind: "projection", id: "map", revision: 1 }]);
    const key = hit.target.itemKey;
    assert.ok(frame.decisions.some(value => value.kind === "geographic" && value.itemKey === key));
    for (const callback of listeners.get("click") ?? []) callback({ clientX: 200, clientY: 150 });
    const next = session.getState().program;
    assert.deepEqual(resolveStoredSelection(next, "picked").selector.items, [key]);
    assert.deepEqual(resolveStoredSelection(next, "picked", { membership: true }).keys, [key]);
    assert.equal(session.getState().history.undoCount, 1); assert.equal(serializeProgram(from), before);
  } finally { session.destroy(); }
  assert.equal([...listeners.values()].reduce((count, callbacks) => count + callbacks.size, 0), 0);
});
