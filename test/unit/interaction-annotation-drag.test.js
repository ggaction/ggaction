import assert from "node:assert/strict";
import test from "node:test";
import { chart, hconcat } from "../../src/index.js";
import { chart as basic } from "../../src/basic.js";
import { createInteractionSession } from "../../src/interaction.js";
import { getMarkItems } from "../../src/inspection.js";
import { serializeProgram, deserializeProgram } from "../../src/persistence.js";
import { prepareMovementFrame } from "../../src/interaction/movementFrame.js";
import { prepareProgramHitFrame } from "../../src/interaction/hitProgram.js";

const note = () => chart().createCanvas({ width: 300, height: 200, margin: 0 })
  .createAnnotation({ id: "note", space: "screen", x: 40, y: 60, text: "Move", align: "center", baseline: "middle", fontSize: 20, dx: 2, dy: -3 });
const props = p => p.graphicSpec.objects.note.items[0].properties;
function surface() {
  const listeners = new Map(), captures = new Set(), pending = new Map(); let id = 0;
  return { listeners, captures, pending, host: { getBoundingClientRect: () => ({ left: 10, top: 20, width: 300, height: 200 }),
    addEventListener: (key, fn) => listeners.set(key, fn), removeEventListener: key => listeners.delete(key),
    setPointerCapture: key => captures.add(key), releasePointerCapture: key => captures.delete(key), hasPointerCapture: key => captures.has(key),
    requestAnimationFrame: fn => { pending.set(++id, fn); return id; }, cancelAnimationFrame: key => pending.delete(key) },
    fire(type, x, y, extra = {}) { listeners.get(type)?.({ pointerId: 1, pointerType: "mouse", clientX: x + 10, clientY: y + 20, ...extra }); },
    flush() { const callbacks = [...pending.values()]; pending.clear(); callbacks.forEach(fn => fn()); }
  };
}
function mounted(p, target = "note", rootTransform) {
  const session = createInteractionSession({ program: p, bindings: [{ type: "annotate", target }] }), host = surface(), phases = [];
  session.subscribe(event => { if (event.phase) phases.push(event); });
  const unmount = session.mount(host.host, rootTransform ? { rootTransform } : {});
  return { session, host, phases, unmount };
}

test("annotation dragging coalesces native offsets, keeps its screen anchor and commits one final frame", () => {
  const p = note(), before = serializeProgram(p), { session, host, phases } = mounted(p);
  host.fire("pointerdown", 42, 57);
  for (let i = 1; i <= 100; i++) host.fire("pointermove", 42 + i / 2, 57 + i);
  assert.equal(host.pending.size, 1); host.flush();
  assert.equal(session.getState().history.undoCount, 0);
  assert.equal(session.getState().program, p); assert.equal(session.getState().revision, 0);
  assert.deepEqual([props(session.getState().previewProgram).x, props(session.getState().previewProgram).y], [92, 157]);
  session.dispatch({ type: "inspect", point: { x: 92, y: 157 }, slop: 0 });
  assert.equal(session.getState().hit.target.ownerId, "note");
  assert.deepEqual(session.getState().hit.target.rowKeys, []);
  host.fire("pointerup", 102, 147);
  const next = session.getState().program;
  assert.equal(session.getState().history.undoCount, 1);
  assert.deepEqual([props(next).x, props(next).y], [102, 147]);
  assert.deepEqual(next.semanticSpec.layers[0].annotationAnchor, { space: "screen", x: 40, y: 60 });
  assert.deepEqual(next.graphicSpec, p.editAnnotation({ dx: 62, dy: 87 }).graphicSpec);
  assert.deepEqual(phases.map(event => event.phase), ["preview", "preview", "commit", "settled"]);
  assert.equal(new Set(phases.map(event => event.transactionId)).size, 1);
  assert.equal(session.getState().revision, 1); assert.equal(session.getState().previewProgram, null);
  assert.equal(host.captures.size, 0); assert.equal(host.pending.size, 0); assert.equal(serializeProgram(p), before);
  assert.deepEqual(deserializeProgram(serializeProgram(next)).graphicSpec, next.graphicSpec);
  session.destroy(); assert.equal(host.listeners.size, 0);
});

test("annotation offset drag preserves data, plot, source-item and feature anchor meanings", () => {
  const source = chart().createCanvas({ width: 300, height: 200, margin: 20 }).createData({ values: [{ x: 1, y: 2 }, { x: 3, y: 4 }] })
    .createPointMark({ id: "points" }).encodeX({ field: "x" }).encodeY({ field: "y" });
  const geo = chart().createCanvas({ width: 300, height: 200, margin: 0 }).createProjection({ id: "map", type: "identity" }).createCoordinate({ type: "geo" })
    .createGeometryData({ id: "places", format: "geojson", coordinateKind: "planar", featureKey: "id", values: { type: "FeatureCollection", features: [{ type: "Feature", id: "city", properties: {}, geometry: { type: "Point", coordinates: [40, 60] } }] } });
  const style = { id: "note", text: "Move", align: "center", baseline: "middle", dx: 2, dy: -3 };
  const programs = [source.createAnnotation({ ...style, x: 2, y: 3 }), source.createAnnotation({ ...style, space: "plot", x: .5, y: .5 }),
    source.createAnnotation({ ...style, source: "points" }), geo.createGeoAnnotation({ ...style, anchor: { type: "feature", key: "city" } })];
  for (const p of programs) {
    const { session, host } = mounted(p), first = props(p), original = getMarkItems(p, { target: "note" });
    host.fire("pointerdown", first.x, first.y); host.fire("pointerup", first.x + 20, first.y + 10, { pointerType: "touch" });
    const next = session.getState().program, isGeo = p.semanticSpec.layers.at(-1).mark.type === "geo";
    const expected = isGeo ? p.editGeoAnnotation({ target: "note", dx: 22, dy: 7 }) : p.editAnnotation({ target: "note", dx: 22, dy: 7 });
    assert.deepEqual(next.graphicSpec, expected.graphicSpec);
    assert.deepEqual(next.semanticSpec, p.semanticSpec);
    assert.deepEqual(getMarkItems(next, { target: "note" }).map(item => [item.key, item.rows]), original.map(item => [item.key, item.rows]));
    for (const [i, item] of next.graphicSpec.objects.note.items.entries()) assert.deepEqual([item.properties.x, item.properties.y], [p.graphicSpec.objects.note.items[i].properties.x + 20, p.graphicSpec.objects.note.items[i].properties.y + 10]);
    session.destroy();
  }
});

test("annotation cancellations restore exact baseline, trace, hit frame and host resources", () => {
  for (const reason of ["Escape", "pointercancel", "lostpointercapture", "blur", "updateProgram", "frame", "unmount", "destroy"]) {
    const p = note(), saved = serializeProgram(p), { session, host, phases, unmount } = mounted(p), initial = session.getState();
    host.fire("pointerdown", 42, 57); host.fire("pointermove", 92, 157); host.flush();
    if (reason === "Escape") host.listeners.get("keydown")({ key: "Escape" });
    else if (reason === "updateProgram") session.updateProgram(p);
    else if (reason === "frame") session.dispatch({ type: "frame", scene: initial.scene, generation: initial.generation, version: session.getState().frameVersion + 1 });
    else if (reason === "unmount") unmount();
    else if (reason === "destroy") session.destroy();
    else host.fire(reason, 92, 157);
    host.fire("pointerup", 92, 157);
    assert.equal(session.getState().program, p); assert.equal(serializeProgram(p), saved);
    assert.equal(session.getState().previewProgram, null); assert.deepEqual(phases.map(event => event.phase), ["preview", "cancel"]);
    assert.equal(session.getState().history.undoCount, 0);
    assert.equal(host.captures.size, 0); assert.equal(host.pending.size, 0);
    if (reason !== "destroy") { session.dispatch({ type: "inspect", point: { x: 42, y: 57 }, slop: 0 }); assert.equal(session.getState().hit.target.ownerId, "note"); session.destroy(); }
  }
});

test("annotation nested transforms preserve the other child and logical namespace", () => {
  const child = note(), p = hconcat({ programs: [{ id: "left", program: child }, { id: "right", program: child }] });
  const target = { childPath: ["right"], id: "note" }, { session, host } = mounted(p, target, [0, -2, -1, 0, 500, 1000]);
  const node = session.getState().scene.nodes.filter(node => node.type === "text")[1];
  const x = 500 - (node.offset[1] + 57), y = 1000 - 2 * (node.offset[0] + 42);
  host.fire("pointerdown", x, y); host.fire("pointerup", x - 30, y - 40);
  const next = session.getState().program;
  assert.equal(next.children.left, child);
  assert.deepEqual(next.children.right.graphicSpec, child.editAnnotation({ dx: 22, dy: 27 }).graphicSpec);
  assert.equal(getMarkItems(next, { target })[0].key, getMarkItems(p, { target })[0].key);
  session.dispatch({ type: "undo" }); assert.equal(session.getState().program, p);
  session.dispatch({ type: "inspect", point: { x, y }, slop: 0 });
  assert.equal(session.getState().hit.target.itemKey, getMarkItems(p, { target })[0].key);
  session.dispatch({ type: "redo" }); assert.equal(session.getState().program, next);
  session.destroy();
});

test("annotation bindings fail closed for encoded offsets, invalid owners and stale sampled frames", () => {
  const p = note();
  for (const binding of [{ type: "annotate", target: "note", slop: 3 }, { type: "annotate", target: "missing" }]) assert.throws(() => createInteractionSession({ program: p, bindings: [binding] }));
  assert.throws(() => createInteractionSession({ program: basic().createCanvas(), bindings: [{ type: "annotate", target: "note" }] }), /Full annotation/);
  const source = chart().createCanvas().createData({ values: [{ x: 1, y: 2 }] }).createPointMark({ id: "point" }).encodeX({ field: "x" }).encodeY({ field: "y" });
  assert.throws(() => createInteractionSession({ program: source, bindings: [{ type: "annotate", target: "point" }] }), /Text or geographic annotation/);
  const encoded = source.createAnnotation({ id: "note", text: "Move", x: 1, y: 2 }).encodeDx({ value: 2 });
  assert.throws(() => createInteractionSession({ program: encoded, bindings: [{ type: "annotate", target: "note" }] }), /encoded offsets/);
  const { session, host } = mounted(p); host.fire("pointerdown", 250, 150); assert.equal(host.captures.size, 0);
  const state = session.getState(), scene = { ...state.scene, nodes: state.scene.nodes.map(node => node.type === "text" ? { ...node, properties: { ...node.properties, x: node.properties.x + 5 } } : node) };
  session.dispatch({ type: "frame", scene, generation: state.generation, version: state.frameVersion + 1 });
  assert.throws(() => host.fire("pointerdown", 47, 57), /committed concrete/); assert.equal(host.captures.size, 0);
  session.updateProgram(p.removeMark({ target: "note" })); host.fire("pointerdown", 42, 57); assert.equal(host.captures.size, 0); session.destroy();
  const base = prepareProgramHitFrame(p), keys = new Set(base.scene.nodes.filter(node => node.type === "text").map(node => node.key));
  assert.throws(() => prepareMovementFrame(base, { ...base.scene, nodes: [] }, [1,0,0,1,0,0], { childPath: [] }, { x: 1, y: 1 }, keys), /committed concrete/);
  assert.throws(() => prepareMovementFrame(base, base.scene, [0,0,0,1,0,0], { childPath: [] }, { x: 1, y: 1 }, keys), /invertible/);
});

test("annotation coordinate overflow and native edits release capture without exposing intermediate states", () => {
  const p = note(), failed = mounted(p, "note", [.5,0,0,.5,0,0]);
  failed.host.fire("pointerdown", 21, 28.5); failed.host.fire("pointermove", 1e308, 1e308);
  failed.host.flush(); assert.equal(failed.session.getState().program, p);
  assert.deepEqual(failed.phases.map(event => event.phase), ["cancel"]); assert.equal(failed.host.captures.size, 0); failed.session.destroy();
  const { session, host } = mounted(p);
  host.fire("pointerdown", 42, 57); host.fire("pointerup", 43, 58);
  assert.equal(session.getState().revision, 0);
  host.fire("pointerdown", 42, 57); host.fire("pointermove", 92, 157); host.flush();
  session.dispatch({ type: "annotate", target: "note", payload: { text: "Keyboard", dx: 10 } });
  assert.equal(session.getState().previewProgram, null); assert.equal(host.captures.size, 0);
  assert.deepEqual(session.getState().program.graphicSpec, p.editAnnotation({ text: "Keyboard", dx: 10 }).graphicSpec);
  session.destroy();
});


test("history commands cancel active annotation previews and only actual restores produce commits", () => {
  for (const type of ["undo", "redo", "reset"]) {
    const p = note(), { session, host, phases } = mounted(p);
    host.fire("pointerdown", 42, 57); host.fire("pointermove", 92, 157); host.flush();
    assert.equal(session.dispatch({ type }).status, "unchanged");
    host.fire("pointerup", 92, 157);
    assert.equal(session.getState().program, p); assert.equal(session.getState().previewProgram, null);
    assert.equal(session.getState().history.undoCount, 0); assert.equal(host.pending.size, 0); assert.equal(host.captures.size, 0);
    assert.deepEqual(phases.map(event => event.phase), ["preview", "cancel"]); session.destroy();
  }
  const p = note(), { session, host, phases } = mounted(p);
  session.dispatch({ type: "annotate", target: "note", payload: { dx: 12 } });
  host.fire("pointerdown", 52, 57); host.fire("pointermove", 102, 157); host.flush();
  session.dispatch({ type: "undo" }); host.fire("pointerup", 102, 157);
  assert.equal(session.getState().program, p); assert.equal(session.getState().history.redoCount, 1);
  assert.deepEqual(phases.map(event => event.phase), ["commit", "settled", "preview", "cancel", "commit", "settled"]);
  session.dispatch({ type: "inspect", point: { x: 42, y: 57 }, slop: 0 }); assert.equal(session.getState().hit.target.ownerId, "note"); session.destroy();
});
