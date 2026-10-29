import assert from "node:assert/strict";
import { chart } from "ggaction";
import { chart as basic } from "ggaction/basic";
import { createInteractionSession } from "ggaction/interaction";
import { serializeProgram, deserializeProgram } from "ggaction/persistence";
const make = factory => factory().createCanvas({ width: 200, height: 160, margin: 0 })
  .createData({ id: "rows", values: [{ x: 50, y: 60 }, { x: 50, y: 60 }] })
  .createPointMark({ id: "points" }).encodePointRadius({ value: 8 })
  .encodeX({ field: "x", scale: { domain: [0, 200], range: [0, 200] } })
  .encodeY({ field: "y", scale: { domain: [0, 160], range: [0, 160] } });
export const cases = [
  { id: "interaction/full-basic-immutable-inspection", run() {
    for (const factory of [chart, basic]) {
      const p = make(factory), original = serializeProgram(p), session = createInteractionSession({ program: p });
      assert.deepEqual(session.dispatch({ type: "inspect", point: { x: 50, y: 60 } }), { status: "applied" });
      assert.throws(() => createInteractionSession({ program: p, bindings: [{ type: "inspect", events: null }] }), /array/);
      const hit = session.getState().hit;
      assert.equal(hit.candidates.length, 2); assert.equal(hit.target.role, "point");
      assert.equal(new Set(hit.candidates.map(item => item.itemKey)).size, 2);
      assert.deepEqual(hit.target.localPoint, { x: 50, y: 60 });
      assert.ok(Object.isFrozen(hit.target)); assert.equal(serializeProgram(p), original);
      session.dispatch({ type: "leave" }); assert.equal(session.getState().hit, null);
      assert.equal(session.destroy(), true); assert.equal(session.destroy(), false);
      assert.throws(() => session.dispatch({ type: "leave" }), /disposed/);
    }
  } },
  { id: "interaction/current-frame-and-restored-program", run() {
    const p = make(chart), session = createInteractionSession({ program: p }), state = session.getState();
    const scene = structuredClone(state.scene);
    for (const node of scene.nodes.filter(node => node.type === "circle")) node.properties.x += 30;
    assert.equal(session.dispatch({ type: "frame", scene, version: 1, generation: 0 }).status, "applied");
    scene.nodes.length = 0;
    session.dispatch({ type: "inspect", point: { x: 50, y: 60 } }); assert.equal(session.getState().hit.target, null);
    session.dispatch({ type: "inspect", point: { x: 80, y: 60 } }); assert.equal(session.getState().hit.candidates.length, 2);
    assert.equal(session.dispatch({ type: "frame", scene: null, version: 1, generation: 0 }).status, "stale");
    session.updateProgram(deserializeProgram(serializeProgram(p)));
    assert.equal(session.getState().generation, 1); assert.equal(session.getState().frameVersion, 2);
    assert.equal(session.dispatch({ type: "frame", scene: null, version: 10, generation: 0 }).status, "stale");
    session.dispatch({ type: "inspect", point: { x: 50, y: 60 } }); assert.equal(session.getState().hit.candidates.length, 2);
    session.destroy();
  } },
  { id: "interaction/guide-and-host-cleanup", run() {
    const p = make(chart);
    const session = createInteractionSession({ program: p }), active = new Map();
    const element = { addEventListener(type, listener) { active.set(type, listener); },
      removeEventListener(type) { active.delete(type); }, getBoundingClientRect() { return { left: 10, top: 20, width: 200, height: 160 }; } };
    const release = session.mount(element); assert.equal(active.size, 3);
    active.get("click")({ clientX: 60, clientY: 80, pointerType: "mouse" });
    assert.equal(session.getState().hit.candidates.length, 2);
    assert.equal(release(), true); assert.equal(release(), false); assert.equal(active.size, 0);
    session.updateProgram(chart().createCanvas({ width: 200, height: 160, margin: 40 }).createTitle({ text: "Inspect" }));
    const text = session.getState().scene.nodes.find(node => node.type === "text");
    session.dispatch({ type: "inspect", point: { x: text.properties.x + text.offset[0], y: text.properties.y + text.offset[1] } });
    assert.equal(session.getState().hit.target.role, "chart-title");
    session.destroy();
  } }
];
