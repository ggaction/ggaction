import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../src/index.js";
import { chart as basic } from "../../src/basic.js";
import { serializeProgram, deserializeProgram } from "../../src/persistence.js";
import { createInteractionSession } from "../../src/interaction.js";
import { createTransitionScene } from "../../src/scene.js";

const pointProgram = (factory = chart) => factory().createCanvas({ width: 300, height: 200 })
  .createData({ id: "d", values: [{ id: "a", x: 1, y: 2 }, { id: "b", x: 2, y: 3 }], keyField: "id" })
  .createPointMark({ id: "points" }).encodeX({ field: "x" }).encodeY({ field: "y" });
const point = { x: 70, y: 140 };
function surface(rect = { left: 50, top: 80, width: 300, height: 200 }) {
  const listeners = new Map();
  return { listeners, getBoundingClientRect: () => rect,
    addEventListener(type, listener) { const entries = listeners.get(type) ?? new Set(); entries.add(listener); listeners.set(type, entries); },
    removeEventListener(type, listener) { listeners.get(type)?.delete(listener); },
    emit(type, event = {}) { for (const listener of [...listeners.get(type) ?? []]) listener(event); },
    count() { return [...listeners.values()].reduce((sum, entries) => sum + entries.size, 0); } };
}

test("Full and Basic headless sessions inspect immutable current items and notify once", () => {
  for (const factory of [chart, basic]) {
    const program = pointProgram(factory), before = serializeProgram(program), session = createInteractionSession({ program });
    const events = [], unsubscribe = session.subscribe(event => events.push(event));
    assert.equal(session.getState().scene, createTransitionScene(program, { format: "canvas" }));
    assert.deepEqual(session.dispatch({ type: "inspect", point }), { status: "applied" });
    assert.equal(events.length, 1); assert.equal(events[0].type, "inspect");
    assert.equal(session.getState().hit.target.ownerId, "points");
    assert.deepEqual(session.getState().hit.target.localPoint, point);
    assert.equal(serializeProgram(program), before);
    const state = session.getState(); assert.equal(session.getState(), state); assert.ok(Object.isFrozen(state.hit));
    session.dispatch({ type: "leave" }); assert.equal(session.getState().hit, null);
    assert.equal(unsubscribe(), true); assert.equal(unsubscribe(), false); session.destroy();
  }
});

test("mount owns passive listeners and maps client pixels once across scaled and rotated roots", () => {
  const session = createInteractionSession({ program: pointProgram() }), element = surface();
  const unmount = session.mount(element, { rootTransform: [0, 2, -2, 0, 400, 0] });
  assert.equal(element.count(), 3);
  element.emit("pointermove", { clientX: 170, clientY: 220, pointerType: "mouse" });
  assert.equal(session.getState().hit.target.ownerId, "points");
  assert.deepEqual(session.getState().hit.target.screenPoint, { x: 120, y: 140 });
  assert.deepEqual(session.getState().hit.target.localPoint, point);
  element.emit("pointerleave"); assert.equal(session.getState().hit, null);
  const another = surface(); const second = session.mount(another);
  assert.equal(element.count(), 0); assert.equal(unmount(), false);
  another.emit("click", { clientX: 120, clientY: 220 }); assert.equal(session.getState().hit.target.ownerId, "points");
  assert.equal(second(), true); assert.equal(second(), false); assert.equal(another.count(), 0);
  assert.equal(session.getState().mounted, false); session.destroy();
});

test("current sampled frame replaces endpoint geometry and rejects stale generations atomically", () => {
  const program = pointProgram(), session = createInteractionSession({ program }), state = session.getState();
  const scene = structuredClone(state.scene), node = scene.nodes.find(node => node.type === "circle");
  node.properties.x += 50;
  const command = { type: "frame", scene, version: 7, generation: state.generation };
  assert.deepEqual(session.dispatch(command), { status: "applied" });
  node.properties.x = 999;
  session.dispatch({ type: "inspect", point }); assert.equal(session.getState().hit.target, null);
  session.dispatch({ type: "inspect", point: { x: 120, y: 140 } }); assert.equal(session.getState().hit.target.ownerId, "points");
  const frameState = session.getState();
  assert.deepEqual(session.dispatch({ ...command, scene: null }), { status: "stale" }); assert.equal(session.getState(), frameState);
  const bad = structuredClone(frameState.scene); bad.nodes.find(node => node.type === "circle").key = "unknown";
  assert.throws(() => session.dispatch({ ...command, version: 8, scene: bad }), /identity/); assert.equal(session.getState(), frameState);
  const next = deserializeProgram(serializeProgram(program.editCanvas({ width: 400 })));
  session.updateProgram(next); assert.equal(session.getState().generation, 1); assert.equal(session.getState().hit, null);
  assert.deepEqual(session.dispatch({ ...command, version: 999, scene: null }), { status: "stale" });
  assert.equal(session.getState().program, next); assert.equal(session.getState().frameVersion, 8);
  assert.throws(() => session.updateProgram({}), /immutable/); assert.equal(session.getState().program, next); session.destroy();
});

test("reentrant dispatch uses FIFO and bounds feedback without changing any program", () => {
  const session = createInteractionSession({ program: pointProgram() }), events = [];
  session.subscribe(event => { events.push(event.type); if (event.type === "inspect") assert.deepEqual(session.dispatch({ type: "leave" }), { status: "queued" }); });
  session.dispatch({ type: "inspect", point }); assert.deepEqual(events, ["inspect", "leave"]);
  const remove = session.subscribe(event => { if (event.type === "leave") session.dispatch({ type: "leave" }); });
  assert.throws(() => session.dispatch({ type: "leave" }), /work budget/); remove();
  session.dispatch({ type: "inspect", point }); assert.equal(session.getState().hit, null); session.destroy();
});

test("failed host mounting retains the prior exact frame and listeners", () => {
  const session = createInteractionSession({ program: pointProgram() }), original = surface(); session.mount(original);
  const state = session.getState(), broken = surface();
  broken.addEventListener = () => { throw new Error("host failure"); };
  assert.throws(() => session.mount(broken), /host failure/);
  assert.equal(session.getState(), state); assert.equal(original.count(), 3); assert.equal(broken.count(), 0);
  original.emit("pointermove", { clientX: 120, clientY: 220 }); assert.equal(session.getState().hit.target.ownerId, "points");
  session.destroy(); assert.equal(original.count(), 0);
});

test("empty or singular client viewports diagnose no hit and explicit inspect bindings stay narrow", () => {
  const session = createInteractionSession({ program: pointProgram(), bindings: [{ type: "inspect", events: ["click"], slop: 0, hitInvisible: false }] });
  const empty = surface({ left: 0, top: 0, width: 0, height: 100 }); session.mount(empty);
  assert.equal(empty.count(), 2); empty.emit("click", { clientX: 0, clientY: 0 });
  assert.equal(session.getState().hit.target, null); assert.equal(session.getState().hit.diagnostics[0].code, "hit-empty-viewport");
  const singular = surface(); session.mount(singular, { rootTransform: [0, 0, 0, 0, 0, 0] });
  singular.emit("click", { clientX: 100, clientY: 100 }); assert.equal(session.getState().hit.diagnostics[0].code, "hit-transform-singular");
  session.destroy();
  const headless = createInteractionSession({ program: pointProgram(), bindings: [] }), element = surface(); headless.mount(element);
  assert.equal(element.count(), 0); headless.dispatch({ type: "inspect", point }); assert.ok(headless.getState().hit.target); headless.destroy();
});

test("destroy disposes once, clears queued callbacks and leaves a readable terminal snapshot", () => {
  const session = createInteractionSession({ program: pointProgram() }), element = surface(); const unmount = session.mount(element), events = [];
  session.subscribe(event => { events.push(event.type); if (event.type === "inspect") { assert.equal(session.destroy(), true); assert.equal(session.destroy(), false); session.dispatch({ type: "leave" }); } });
  element.emit("click", { clientX: 120, clientY: 220 }); assert.deepEqual(events, ["inspect", "destroy"]);
  assert.equal(element.count(), 0); assert.equal(session.destroy(), false); assert.equal(unmount(), false);
  assert.equal(session.getState().destroyed, true); assert.equal(session.getState().mounted, false);
  for (const operation of [() => session.dispatch({ type: "leave" }), () => session.mount(element), () => session.subscribe(() => {}), () => session.updateProgram(pointProgram())]) {
    assert.throws(operation, /disposed/);
  }
  const retry = createInteractionSession({ program: pointProgram() });
  retry.subscribe(event => { if (event.type === "inspect") { retry.destroy(); throw new Error("subscriber failed"); } });
  assert.throws(() => retry.dispatch({ type: "inspect", point }), /subscriber failed/);
  assert.equal(retry.getState().destroyed, false); assert.equal(retry.destroy(), true);
});

test("closed options, accessor frames and malformed bindings reject before changing session state", () => {
  const program = pointProgram(), session = createInteractionSession({ program }), state = session.getState();
  for (const bindings of [null, [{ type: "drag" }], [{ type: "inspect", events: null }], [{ type: "inspect", events: [] }], [{ type: "inspect", events: ["click", "click"] }], [{ type: "inspect" }, { type: "inspect" }]]) {
    assert.throws(() => createInteractionSession({ program, bindings }));
  }
  assert.throws(() => createInteractionSession({ program, clock: {} }), /unsupported/);
  for (const command of [{ type: "drag" }, { type: "leave", point }, { type: "inspect", point: { x: NaN, y: 0 } }, { type: "frame", scene: {}, version: -1, generation: 0 }]) assert.throws(() => session.dispatch(command));
  let calls = 0; const scene = structuredClone(state.scene); Object.defineProperty(scene.nodes[0], "properties", { enumerable: true, get() { calls++; return {}; } });
  assert.throws(() => session.dispatch({ type: "frame", scene, version: 1, generation: 0 }), /accessors/); assert.equal(calls, 0);
  assert.throws(() => session.subscribe(null), /function/); assert.throws(() => session.mount({}), /surface/);
  assert.throws(() => session.mount(surface(), { rootTransform: [1] }), /six/);
  assert.throws(() => session.mount(surface(), { rootTransform: null }), /six/);
  assert.equal(session.getState(), state); session.destroy();
});

test("frame snapshots reject excessive nodes, cyclic values and executable properties before replacement", () => {
  const session = createInteractionSession({ program: pointProgram() }), state = session.getState();
  const submit = scene => session.dispatch({ type: "frame", scene, version: 1, generation: 0 });
  assert.throws(() => submit({ nodes: Array(100001) }), /node budget/);
  const cycle = structuredClone(state.scene); cycle.nodes[0].properties.extra = cycle;
  assert.throws(() => submit(cycle), /cycles/);
  const callable = structuredClone(state.scene); callable.nodes[0].properties.extra = () => {};
  assert.throws(() => submit(callable), /plain data/);
  const excessive = structuredClone(state.scene); excessive.nodes[0].properties.extra = "x".repeat(10_000_001);
  assert.throws(() => submit(excessive), /snapshot work budget/);
  const shape = structuredClone(state.scene); shape.nodes.find(node => node.type === "circle").properties.radius = -1;
  assert.throws(() => submit(shape), /not be negative/);
  assert.equal(session.getState(), state); session.destroy();
});

test("queued frame commands snapshot caller bytes before a subscriber can mutate them", () => {
  const session = createInteractionSession({ program: pointProgram() });
  session.subscribe(event => {
    if (event.type !== "inspect") return;
    const state = session.getState(), scene = structuredClone(state.scene), node = scene.nodes.find(node => node.type === "circle");
    node.properties.x = 90;
    assert.deepEqual(session.dispatch({ type: "frame", scene, version: 1, generation: 0 }), { status: "queued" });
    node.properties.x = 1000;
  });
  session.dispatch({ type: "inspect", point });
  assert.equal(session.getState().scene.nodes.find(node => node.type === "circle").properties.x, 90);
  session.destroy();
});
