import assert from "node:assert/strict";
import test from "node:test";
import { chart, hconcat } from "../../src/index.js";
import { chart as basic } from "../../src/basic.js";
import { createInteractionSession } from "../../src/interaction.js";
import { getMarkItems } from "../../src/inspection.js";
import { serializeProgram, deserializeProgram } from "../../src/persistence.js";

const rows = [{ id: 1, group: "a" }, { id: "1", group: "a" }, { id: "other", group: "a" }];
const positions = rows.map((row, index) => ({ key: row.id, x: 40 + index * 80, y: 60 }));
const layout = p => p.semanticSpec.resources.find(resource => resource.kind === "layout");
function make(method = "fixed") {
  return chart().createCanvas({ width: 360, height: 260, margin: 0 }).createData({ id: "nodes", values: rows, keyField: "id" })
    .createInferredGraphData({ id: "graph", nodeKey: "id", ruleId: "same", rule: "group", options: { fields: ["group"] } })
    .layoutGraph({ id: "layout", method, options: method === "fixed" ? { positions } : method === "force"
      ? { iterations: 0, initialPositions: positions, pinned: [{ key: "other", fx: 200, fy: 60 }] } : { radius: 80 } })
    .createGraphPlot({ id: "network", origin: [0, 0], labels: {} }).selectMarks({ id: "picked", target: "network", field: "key", op: "eq", value: 1 })
    .highlightMarks({ selection: "picked", color: "gold", dimOthers: false, bringToFront: false });
}
const move = (key, x, y) => ({ type: "moveNode", target: "layout", payload: { key, x, y } });

test("moveNode delegates typed fixed and force coordinates with stable selections and one commit", () => {
  for (const method of ["fixed", "force"]) {
    const p = make(method), original = serializeProgram(p), s = createInteractionSession({ program: p, bindings: [] }), events = [];
    s.subscribe(event => events.push(event)); s.dispatch(move(1, 70, 120));
    const next = s.getState().program, items = getMarkItems(next, { target: "network" });
    assert.equal(layout(next).revision, 1);
    const item = items.find(item => item.fields.kind === "node" && item.fields.key === 1);
    assert.deepEqual([item.properties.x, item.properties.y], [70, 120]);
    assert.equal(item.properties.stroke, "gold");
    assert.deepEqual(next.graphicSpec, p.editLayout({ target: "layout", node: { key: 1, x: 70, y: 120 } }).graphicSpec);
    assert.deepEqual(deserializeProgram(serializeProgram(next)).graphicSpec, next.graphicSpec);
    assert.deepEqual(events.map(event => event.phase), ["commit", "settled"]);
    assert.equal(serializeProgram(p), original); s.destroy();
  }
});

test("single-node layout patches preserve dormant coordinates and pins through source restoration", () => {
  for (const method of ["fixed", "force"]) {
    const p = make(method), reduced = p.reviseData({ source: "nodes", id: "reduced", values: rows.slice(0, 2) });
    const next = reduced.editLayout({ target: "layout", node: { key: 1, x: 90, y: 110 } });
    const values = layout(next).options.options[method === "fixed" ? "positions" : "pinned"];
    assert.deepEqual(values.find(value => value.key === "other"), method === "fixed" ? positions[2] : { key: "other", fx: 200, fy: 60 });
    const restored = deserializeProgram(serializeProgram(next)).reviseData({ source: "reduced", id: "returned", values: rows });
    const nodes = getMarkItems(restored, { target: "network" }).filter(item => item.fields.kind === "node");
    assert.deepEqual(nodes.filter(item => item.fields.key === 1 || item.fields.key === "other").map(item => [item.fields.key, item.properties.x, item.properties.y]), [[1, 90, 110], ["other", 200, 60]]);
    assert.throws(() => reduced.editLayout({ node: { key: "other", x: 0, y: 0 } }), /current graph node/);
  }
});

test("node move rejects inapplicable layouts and malformed positions atomically across scopes", () => {
  const child = make(), p = hconcat({ programs: [{ id: "a", program: child }, { id: "b", program: child }] });
  const s = createInteractionSession({ program: p, bindings: [] });
  s.dispatch({ ...move("1", 100, 80), target: { childPath: ["a"], id: "layout" } });
  assert.equal(s.getState().program.children.b, child);
  const before = s.getState(), serialized = serializeProgram(before.program); let calls = 0;
  for (const payload of [{ key: 1, x: 2 }, { key: 1, x: Infinity, y: 1 }, { key: null, x: 1, y: 1 }, { key: "missing", x: 1, y: 1 },
    { key: 1, get x() { calls++; return 1; }, y: 1 }, { key: 1, x: 1, y: 1, pin: false }]) {
    assert.throws(() => s.dispatch({ type: "moveNode", target: { childPath: ["a"], id: "layout" }, payload }));
  }
  assert.equal(calls, 0); assert.equal(s.getState().program, before.program); assert.equal(serializeProgram(before.program), serialized); s.destroy();
  assert.throws(() => child.editLayout({ node: { key: 1, x: 1, y: 1 }, options: { maxNodes: 10 } }), /cannot also/);
  assert.throws(() => child.editLayout({ node: { key: 1, x: 1, y: 1 }, order: "input" }), /hierarchy order/);
  assert.throws(() => make("circular").editLayout({ node: { key: 1, x: 1, y: 1 } }), /fixed or force/);
  const b = createInteractionSession({ program: basic().createCanvas(), bindings: [] });
  assert.throws(() => b.dispatch(move(1, 1, 1)), /editLayout/); b.destroy();
});

function surface() {
  const listeners = new Map(), captures = new Set(), pending = new Map(); let id = 0;
  return { listeners, captures, pending, host: { getBoundingClientRect: () => ({ left: 10, top: 20, width: 360, height: 260 }),
    addEventListener: (key, fn) => listeners.set(key, fn), removeEventListener: key => listeners.delete(key),
    setPointerCapture: key => captures.add(key), releasePointerCapture: key => captures.delete(key), hasPointerCapture: key => captures.has(key),
    requestAnimationFrame: fn => { pending.set(++id, fn); return id; }, cancelAnimationFrame: key => pending.delete(key) },
    fire(type, x, y, extra = {}) { listeners.get(type)({ pointerId: 1, pointerType: "mouse", clientX: x + 10, clientY: y + 20, ...extra }); },
    flush() { const callbacks = [...pending.values()]; pending.clear(); callbacks.forEach(fn => fn()); }
  };
}

test("node drag coalesces moves from one baseline, targets the preview frame and commits once", () => {
  for (const method of ["fixed", "force"]) {
    const p = make(method), s = createInteractionSession({ program: p, bindings: [{ type: "moveNode", target: "network" }] }), host = surface(), events = [];
    s.subscribe(event => { if (event.phase) events.push(event); }); s.mount(host.host);
    const initial = s.getState();
    host.fire("pointerdown", 42, 62);
    for (let index = 1; index <= 100; index++) host.fire("pointermove", 42 + index / 2, 62 + index);
    assert.equal(host.pending.size, 1); host.flush();
    assert.equal(s.getState().program, p); assert.equal(s.getState().revision, 0);
    const preview = getMarkItems(s.getState().previewProgram, { target: "network" }).find(item => item.fields.key === 1);
    assert.deepEqual([preview.properties.x, preview.properties.y], [90, 160]);
    s.dispatch({ type: "inspect", point: { x: 90, y: 160 }, slop: 0 });
    assert.equal(s.getState().hit.target.role, "node"); assert.equal(s.getState().hit.target.itemKey, preview.key);
    host.fire("pointerup", 92, 162);
    assert.deepEqual(events.map(event => event.phase), ["preview", "preview", "commit", "settled"]);
    assert.equal(s.getState().revision, 1); assert.equal(s.getState().generation, initial.generation + 1);
    assert.equal(s.getState().previewProgram, null); assert.equal(host.pending.size, 0); assert.equal(host.captures.size, 0);
    assert.deepEqual(s.getState().program.graphicSpec, p.editLayout({ target: "layout", node: { key: 1, x: 90, y: 160 } }).graphicSpec);
    s.destroy(); assert.equal(host.listeners.size, 0);
  }
});

test("node drag cancellation and subthreshold movement restore the exact baseline and current hit frame", () => {
  const p = make();
  for (const cancel of ["pointercancel", "lostpointercapture", "blur", "Escape", "updateProgram", "frame", "unmount", "destroy"]) {
    const s = createInteractionSession({ program: p, bindings: [{ type: "moveNode", target: "network" }] }), host = surface(), phases = [];
    s.subscribe(event => { if (event.phase) phases.push(event.phase); }); const unmount = s.mount(host.host);
    const original = s.getState().scene;
    host.fire("pointerdown", 40, 60); host.fire("pointermove", 90, 160); host.flush();
    if (cancel === "Escape") host.listeners.get("keydown")({ key: "Escape" });
    else if (cancel === "updateProgram") s.updateProgram(p);
    else if (cancel === "frame") s.dispatch({ type: "frame", scene: original, generation: s.getState().generation, version: s.getState().frameVersion + 1 });
    else if (cancel === "unmount") unmount();
    else if (cancel === "destroy") s.destroy();
    else host.fire(cancel, 90, 160);
    assert.equal(s.getState().program, p); assert.equal(s.getState().previewProgram, null);
    assert.deepEqual(phases, ["preview", "cancel"]); assert.equal(host.pending.size, 0); assert.equal(host.captures.size, 0);
    if (cancel !== "destroy") {
      s.dispatch({ type: "inspect", point: { x: 40, y: 60 }, slop: 0 }); assert.equal(s.getState().hit.target.role, "node"); s.destroy();
    }
  }
  const s = createInteractionSession({ program: p, bindings: [{ type: "moveNode", target: "network" }] }), host = surface(); s.mount(host.host);
  host.fire("pointerdown", 40, 60); host.fire("pointerup", 41, 61);
  assert.equal(s.getState().program, p); assert.equal(s.getState().revision, 0); s.destroy();
});

test("node dragging rejects unsupported bindings and sampled positions without capturing", () => {
  const p = make(), s = createInteractionSession({ program: p, bindings: [{ type: "moveNode", target: "network" }] }), host = surface(); s.mount(host.host);
  host.fire("pointerdown", 320, 230); assert.equal(host.captures.size, 0);
  const current = s.getState(), scene = { ...current.scene, nodes: current.scene.nodes.map(node => node.type === "circle" ? { ...node, properties: { ...node.properties, x: node.properties.x + 5 } } : node) };
  s.dispatch({ type: "frame", scene, generation: current.generation, version: current.frameVersion + 1 });
  assert.throws(() => host.fire("pointerdown", 45, 60), /committed concrete/); assert.equal(host.captures.size, 0); s.destroy();
  assert.throws(() => createInteractionSession({ program: p.editGraphPlot({ target: "network", origin: "auto" }), bindings: [{ type: "moveNode", target: "network" }] }), /explicit graph plot origin/);
  assert.throws(() => createInteractionSession({ program: make("circular"), bindings: [{ type: "moveNode", target: "network" }] }), /fixed or force/);
  assert.throws(() => createInteractionSession({ program: p, bindings: [{ type: "moveNode", target: "network" }, { type: "select", target: "network", selection: "picked" }] }), /one editing pointer/);
});

test("node dragging maps a nested negative CSS transform and keeps untouched child references", () => {
  const child = make(), p = hconcat({ programs: [{ id: "left", program: child }, { id: "right", program: child }] });
  const target = { childPath: ["right"], id: "network" };
  const s = createInteractionSession({ program: p, bindings: [{ type: "moveNode", target }] }), host = surface();
  const node = s.getState().scene.nodes.filter(node => node.type === "circle")[3];
  s.mount(host.host, { rootTransform: [-2, 0, 0, 1, 1500, 0] });
  const x = 1500 - 2 * (node.offset[0] + node.properties.x), y = node.offset[1] + node.properties.y;
  host.fire("pointerdown", x, y); host.fire("pointermove", x - 40, y + 30); host.flush(); host.fire("pointerup", x - 40, y + 30);
  assert.equal(s.getState().program.children.left, child);
  assert.deepEqual(s.getState().program.children.right.graphicSpec, child.editLayout({ target: "layout", node: { key: 1, x: 60, y: 90 } }).graphicSpec);
  s.destroy();
});

test("node binding lifecycle rejects invalid owners and remains inert after its owner disappears", () => {
  const p = make(), s = createInteractionSession({ program: p, bindings: [{ type: "moveNode", target: "network" }] }), host = surface(); s.mount(host.host);
  s.updateProgram(p.removeMark({ target: "network" })); host.fire("pointerdown", 40, 60); assert.equal(host.captures.size, 0); s.destroy();
  assert.throws(() => createInteractionSession({ program: basic().createCanvas(), bindings: [{ type: "moveNode", target: "none" }] }), /Full layout/);
  const point = chart().createCanvas().createData({ values: [{ x: 1 }] }).createPointMark({ id: "point" });
  assert.throws(() => createInteractionSession({ program: point, bindings: [{ type: "moveNode", target: "point" }] }), /GraphPlot/);
  assert.throws(() => createInteractionSession({ program: p, bindings: [{ type: "moveNode", target: "network", slop: 3 }] }), /unsupported|unknown/i);
});

test("a native edit during node preview cancels it and accepts a fresh exact frame", () => {
  const p = make(), s = createInteractionSession({ program: p, bindings: [{ type: "moveNode", target: "network" }] }), host = surface(); s.mount(host.host);
  host.fire("pointerdown", 40, 60); host.fire("pointermove", 90, 160); host.flush();
  s.dispatch(move("1", 170, 80));
  assert.equal(s.getState().previewProgram, null); assert.equal(host.captures.size, 0);
  assert.deepEqual(s.getState().program.graphicSpec, p.editLayout({ target: "layout", node: { key: "1", x: 170, y: 80 } }).graphicSpec);
  s.dispatch({ type: "inspect", point: { x: 170, y: 80 }, slop: 0 }); assert.equal(s.getState().hit.target.role, "node"); s.destroy();
});

test("node movement updates stored routes once and retains exact edge identities after restore", () => {
  const p = make().bundleGraphEdges({ id: "routes", graph: "graph", layout: "layout", method: "edge-path" }).editGraphPlot({ target: "network", routes: "routes" });
  const s = createInteractionSession({ program: p, bindings: [] }), initial = getMarkItems(p, { target: "network" });
  s.dispatch(move(1, 90, 120));
  const next = deserializeProgram(serializeProgram(s.getState().program)), route = next.semanticSpec.resources.find(resource => resource.kind === "edge-route");
  assert.equal(route.revision, 1); assert.equal(route.inputs.find(ref => ref.kind === "layout").revision, 1);
  assert.deepEqual(getMarkItems(next, { target: "network" }).map(item => item.key), initial.map(item => item.key));
  assert.notDeepEqual(getMarkItems(next, { target: "network" }).find(item => item.fields.kind === "edge").geometry,
    initial.find(item => item.fields.kind === "edge").geometry);
  s.destroy();
});

test("failed node preview releases capture and restores the committed geometry", () => {
  const p = make(), s = createInteractionSession({ program: p, bindings: [{ type: "moveNode", target: "network" }] }), host = surface(), phases = [];
  s.subscribe(event => { if (event.phase) phases.push(event.phase); }); s.mount(host.host);
  host.fire("pointerdown", 40, 60); host.fire("pointermove", 1e308, 1e308);
  assert.throws(() => host.flush());
  assert.equal(s.getState().program, p); assert.equal(s.getState().previewProgram, null);
  assert.equal(host.captures.size, 0); assert.equal(host.pending.size, 0); assert.deepEqual(phases, ["error"]); s.destroy();
});

test("force movement pins the requested node while the deterministic solver updates its neighbors", () => {
  const p = make("force").editLayout({ target: "layout", options: { iterations: 12 } });
  const s = createInteractionSession({ program: p, bindings: [] });
  s.dispatch(move(1, 70, 120));
  const next = s.getState().program, nodes = getMarkItems(next, { target: "network" }).filter(item => item.fields.kind === "node");
  assert.deepEqual([nodes[0].properties.x, nodes[0].properties.y], [70, 120]);
  assert.deepEqual([nodes[2].properties.x, nodes[2].properties.y], [200, 60]);
  assert.notDeepEqual(layout(next).result.nodes[1], layout(p).result.nodes[1]);
  assert.ok(layout(next).result.nodes.every(node => Number.isFinite(node.x) && Number.isFinite(node.y)));
  const replay = createInteractionSession({ program: deserializeProgram(serializeProgram(p)), bindings: [] });
  replay.dispatch(move(1, 70, 120));
  assert.deepEqual(replay.getState().program.graphicSpec, next.graphicSpec);
  assert.equal(layout(next).revision, layout(p).revision + 1); s.destroy(); replay.destroy();
});

test('detaching or remounting a native node preview restores the displayed committed frame',()=>{
 for(const remount of [false,true]){
  const p=make(),s=createInteractionSession({program:p,bindings:[{type:'moveNode',target:'network'}]}),host=surface(),off=s.mount(host.host);
  const initial=s.getState().scene;host.fire('pointerdown',40,60);host.fire('pointermove',80,90);host.flush();
  assert.notDeepEqual(s.getState().scene,initial);if(remount)s.mount(surface().host);else off();
  assert.equal(s.getState().program,p);assert.deepEqual(s.getState().scene,initial);assert.equal(s.getState().history.undoCount,0);
  assert.equal(host.captures.size,0);assert.equal(host.pending.size,0);s.destroy();
 }
});
