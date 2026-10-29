import test from "node:test";
import assert from "node:assert/strict";
import { chart, hconcat } from "../../src/index.js";
import { chart as basic } from "../../src/basic.js";
import { createInteractionSession } from "../../src/interaction.js";
import { resolveStoredSelection } from "../../src/materialization/selection/state.js";
import { serializeProgram, deserializeProgram } from "../../src/persistence.js";
import { renderToSVG } from "../../src/renderers/svg.js";

const program = () => chart().createCanvas({ width: 300, height: 200, margin: 0 })
  .createData({ id: "rows", keyField: "id", values: [{ id: "a", x: 50, y: 60 }, { id: "b", x: 200, y: 130 }] })
  .createPointMark({ id: "points" }).encodePointRadius({ value: 8 })
  .encodeX({ field: "x", scale: { domain: [0, 300], range: [0, 300] } })
  .encodeY({ field: "y", scale: { domain: [0, 200], range: [0, 200] } })
  .selectMarks({ id: "picked", target: "points", items: [] });
const ids = p => { const r = resolveStoredSelection(p, "picked"); return r.items.filter(item => r.keys.includes(item.key)).map(item => item.fields.id); };
const create = (p = program(), extra = {}) => createInteractionSession({ program: p, bindings: [{ type: "brush", target: "points", selection: "picked", ...extra }] });
function surface(width = 300, height = 200) {
  const listeners = new Map(), frames = new Map(), captures = new Set(); let sequence = 0;
  return {
    captures, frames,
    getBoundingClientRect: () => ({ left: 10, top: 20, width, height }),
    addEventListener(type, listener) { const set = listeners.get(type) ?? new Set(); set.add(listener); listeners.set(type, set); },
    removeEventListener(type, listener) { listeners.get(type)?.delete(listener); },
    setPointerCapture(id) { captures.add(id); }, hasPointerCapture: id => captures.has(id),
    releasePointerCapture(id) { captures.delete(id); this.fire("lostpointercapture", 0, 0, { pointerId: id }); },
    requestAnimationFrame(callback) { const id = ++sequence; frames.set(id, callback); return id; },
    cancelAnimationFrame(id) { frames.delete(id); },
    flush() { const pending = [...frames.values()]; frames.clear(); pending.forEach(fn => fn()); },
    fire(type, x = 0, y = 0, extra = {}) { for (const fn of [...listeners.get(type) ?? []]) fn({ pointerId: 1, pointerType: "mouse", button: 0, clientX: x + 10, clientY: y + 20, ...extra }); },
    count: () => [...listeners.values()].reduce((sum, set) => sum + set.size, 0)
  };
}

test("brush previews coalesce per frame from the same baseline and final up commits one native edit", () => {
  const p = program().highlightMarks({ selection: "picked", color: "red", bringToFront: false }), before = serializeProgram(p);
  const session = create(p), host = surface(), events = []; session.mount(host); session.subscribe(event => { if (event.phase) events.push(event); });
  host.fire("pointerdown", 20, 20);
  for (let index = 1; index <= 100; index++) host.fire("pointermove", 20 + index, 90);
  assert.equal(host.frames.size, 1); assert.equal(session.getState().program, p); assert.equal(session.getState().previewProgram, null);
  host.flush(); const first = session.getState().previewProgram;
  assert.deepEqual(ids(first), ["a"]); assert.equal(session.getState().program, p); assert.equal(session.getState().revision, 0);
  assert.match(renderToSVG(first), /#3b82f6/); assert.equal(first.graphicSpec.objects["interaction-selection-preview"].items.length, 1);
  host.fire("pointermove", 130, 95); assert.equal(host.frames.size, 1);
  host.fire("pointerup", 230, 160); assert.equal(host.frames.size, 0);
  assert.deepEqual(ids(session.getState().program), ["a", "b"]); assert.equal(session.getState().previewProgram, null);
  assert.equal(session.getState().revision, 1); assert.equal(session.getState().program.trace.children.length, p.trace.children.length + 1);
  assert.equal(session.getState().program.trace.children.at(-1).op, "editMarkSelection");
  assert.equal(session.getState().program.graphicSpec.objects["interaction-selection-preview"], undefined);
  assert.deepEqual(events.map(event => event.phase), ["preview", "preview", "commit", "settled"]);
  assert.equal(new Set(events.map(event => event.transactionId)).size, 1);
  for (const event of events) assert.equal(event.previous, p);
  assert.equal(events[0].current, p); assert.equal(events[0].state.previewProgram, first);
  assert.equal(serializeProgram(p), before); session.destroy(); assert.equal(host.count(), 0);
});

test("Escape, cancel, lost capture, blur, unmount and destroy discard previews and late callbacks", () => {
  for (const type of ["Escape", "pointercancel", "lostpointercapture", "blur", "unmount", "destroy"]) {
    const p = program(), source = serializeProgram(p), session = create(p), host = surface(), events = [];
    const unmount = session.mount(host); session.subscribe(event => { if (event.phase) events.push(event.phase); });
    host.fire("pointerdown", 20, 20); host.fire("pointermove", 100, 100); host.flush();
    host.fire("pointermove", 230, 180); const late = [...host.frames.values()];
    if (type === "unmount") unmount(); else if (type === "destroy") session.destroy(); else if (type === "Escape") host.fire("keydown", 0, 0, { key: "Escape" }); else host.fire(type);
    for (const callback of late) callback(); host.fire("pointerup", 230, 180);
    assert.deepEqual(events, ["preview", "cancel"]); assert.equal(session.getState().program, p);
    assert.equal(session.getState().previewProgram, null); assert.equal(host.frames.size, 0); assert.equal(host.captures.size, 0);
    assert.equal(serializeProgram(p), source); session.destroy();
  }
});

test("toggle previews never accumulate and empty brush endpoints retain explicit empty meaning", () => {
  const p = program().editMarkSelection({ selection: "picked", field: "id", op: "eq", value: "a" });
  const session = create(p, { mode: "toggle", axis: "x" }), host = surface(); session.mount(host);
  host.fire("pointerdown", 20, 100);
  for (const x of [90, 95, 100]) { host.fire("pointermove", x, 100); host.flush(); assert.deepEqual(ids(session.getState().previewProgram), []); }
  host.fire("pointerup", 100, 100); assert.deepEqual(ids(session.getState().program), []);
  assert.equal(session.getState().program.semanticSpec.resources.find(resource => resource.id === "picked").revision, 2); session.destroy();
  const empty = create(), tap = surface(); empty.mount(tap); tap.fire("pointerdown", 50, 60); tap.fire("pointerup", 50, 60);
  assert.deepEqual(ids(empty.getState().program), []); assert.equal(empty.getState().revision, 1); empty.destroy();
});

test("lasso stores current CSS polygon and stable keys through resize and codec", () => {
  const p = program(), session = create(p, { type: "lasso" }), host = surface(); session.mount(host, { rootTransform: [2, 0, 0, 2, 0, 0] });
  const polygon = [{ x: 70, y: 90 }, { x: 130, y: 90 }, { x: 130, y: 150 }, { x: 70, y: 150 }];
  host.fire("pointerdown", polygon[0].x, polygon[0].y);
  for (const point of polygon.slice(1)) host.fire("pointermove", point.x, point.y);
  host.flush(); assert.deepEqual(ids(session.getState().previewProgram), ["a"]);
  host.fire("pointerup", polygon[0].x, polygon[0].y);
  const next = session.getState().program, resource = next.semanticSpec.resources.find(resource => resource.id === "picked");
  assert.deepEqual(resource.options.screenPolygon, polygon); assert.deepEqual(ids(next), ["a"]);
  assert.deepEqual(ids(deserializeProgram(serializeProgram(next.editCanvas({ width: 600 })))), ["a"]); session.destroy();
});

test("nested owner placements preserve scoped lasso keys and leave siblings unchanged", () => {
  const child = program(), p = hconcat({ programs: [{ id: "left", program: child }, { id: "right", program: child }] });
  const session = create(p, { type: "lasso", target: { childPath: ["right"], id: "points" } }), host = surface(640, 200);
  session.mount(host); const node = session.getState().scene.nodes.find(node => node.type === "circle" && node.offset[0] > 0), x = node.offset[0];
  host.fire("pointerdown", x + 30, 40); host.fire("pointermove", x + 75, 40); host.fire("pointermove", x + 75, 80); host.fire("pointerup", x + 30, 80);
  const next = session.getState().program;
  assert.deepEqual(ids(next.children.right), ["a"]); assert.equal(next.children.left, p.children.left);
  assert.deepEqual(ids(deserializeProgram(serializeProgram(next)).children.right), ["a"]); session.destroy();
});

test("frame and external program changes cancel active drafts before replacing the committed baseline", () => {
  for (const replacement of ["frame", "program", "command"]) {
    const p = program(), session = create(p), host = surface(), phases = []; session.mount(host); session.subscribe(event => { if (event.phase) phases.push(event.phase); });
    host.fire("pointerdown", 20, 20); host.fire("pointermove", 100, 100); host.flush();
    if (replacement === "frame") { const state = session.getState(); session.dispatch({ type: "frame", scene: state.scene, version: state.frameVersion + 1, generation: state.generation }); }
    else if (replacement === "program") session.updateProgram(p.editCanvas({ width: 400 }));
    else session.dispatch({ type: "clearSelection", target: "points", payload: { id: "picked" } });
    host.fire("pointerup", 230, 180); assert.deepEqual(phases.slice(0, 2), ["preview", "cancel"]); assert.equal(session.getState().previewProgram, null);
    assert.deepEqual(ids(session.getState().program), []); session.destroy();
  }
});

test("geometry and scheduling failures reject atomically and release preview capture", () => {
  const p = program(), session = create(p), missing = surface(); delete missing.requestAnimationFrame;
  assert.throws(() => session.mount(missing), /scheduling/); assert.equal(missing.count(), 0);
  const partial = surface(); delete partial.releasePointerCapture; assert.throws(() => session.mount(partial), /capture/);
  const host = surface(); session.mount(host); host.fire("pointerdown", -1, 10); assert.equal(host.captures.size, 0); session.destroy();
  const conflict = p.createGraphics({ id: "interaction-selection-preview", type: "collection", parent: "canvas" });
  const failed = create(conflict), target = surface(), phases = []; failed.mount(target); failed.subscribe(event => { if (event.phase) phases.push(event.phase); });
  target.fire("pointerdown", 20, 20); target.fire("pointermove", 100, 100); assert.throws(() => target.flush(), /conflicts/);
  assert.deepEqual(phases, ["error"]); assert.equal(failed.getState().program, conflict); assert.equal(failed.getState().previewProgram, null); assert.equal(target.captures.size, 0);
  target.fire("pointerup", 100, 100); assert.deepEqual(phases, ["error"]); failed.destroy();
});

test("bindings reject ambiguous axes, unsupported domains and competing edit owners before mounting", () => {
  const p = program();
  for (const extra of [{ axis: "angular" }, { axis: "x", channels: { y: "y" } }, { channels: { x: "y" } }, { mode: "bad" }, { type: "lasso", axis: "x" }]) assert.throws(() => create(p, extra));
  assert.throws(() => createInteractionSession({ program: p, bindings: [{ type: "brush", target: "points", selection: "picked" }, { type: "select", target: "points", selection: "picked" }] }), /at most/);
  assert.throws(() => create(basic().createCanvas()), /selection|owner|Full/i);
  const changed = p.encodeX({ field: "x", scale: { type: "sqrt", domain: [0, 300], range: [0, 300] } });
  assert.throws(() => create(changed), /inversion/);
});

test("categorical bands, reversed log and temporal intervals retain typed domain predicates", () => {
  const scenarios = [
    { values: [{ id: "a", x: "A", y: 60 }, { id: "b", x: "B", y: 60 }, { id: "c", x: "C", y: 60 }],
      encoding: { field: "x", fieldType: "nominal", scale: { type: "band", domain: ["A", "B", "C"], range: [0, 300], padding: 0 } }, from: 110, to: 190,
      expected: { values: ["B"] }, ids: ["b"] },
    { values: [{ id: "a", x: 1, y: 60 }, { id: "b", x: 10, y: 60 }, { id: "c", x: 100, y: 60 }],
      encoding: { field: "x", scale: { type: "log", domain: [1, 100], range: [0, 200], reverse: true } }, from: 50, to: 150, ids: ["b"] },
    { values: [{ id: "a", x: 1709251200000, y: 60 }, { id: "b", x: 1709337600000, y: 60 }, { id: "c", x: 1709424000000, y: 60 }],
      encoding: { field: "x", fieldType: "temporal", temporalUnit: "timestamp", scale: { domain: [1709251200000, 1709424000000], range: [0, 200], nice: false } }, from: 50, to: 150,
      expected: { ranges: [{ min: 1709294400000, max: 1709380800000, minInclusive: true, maxInclusive: true }] }, ids: ["b"] }
  ];
  for (const scenario of scenarios) {
    const p = chart().createCanvas({ width: 300, height: 200, margin: 0 }).createData({ id: "rows", values: scenario.values }).createPointMark({ id: "points" })
      .encodeX(scenario.encoding).encodeY({ field: "y", scale: { domain: [0, 200], range: [0, 200] } }).selectMarks({ id: "picked", items: [] });
    const session = create(p, { axis: "x" }), host = surface(); session.mount(host);
    host.fire("pointerdown", scenario.from, 100); host.fire("pointerup", scenario.to, 100);
    const next = session.getState().program, axis = next.semanticSpec.resources.find(resource => resource.id === "picked").options.predicate.region.x;
    assert.deepEqual(ids(next), scenario.ids); if (scenario.expected) assert.deepEqual(axis, scenario.expected);
    else { assert.ok(Math.abs(axis.ranges[0].min - Math.sqrt(10)) < 1e-12); assert.ok(Math.abs(axis.ranges[0].max - Math.sqrt(1000)) < 1e-12); }
    session.destroy();
  }
});

test("aggregate end-channel brushes use the stored primary scale without changing endpoint meaning", () => {
  const p = chart().createCanvas({ width: 300, height: 200, margin: 0 }).createData({ id: "rows", values: [{ id: "a", g: "A", y: 3 }, { id: "a", g: "A", y: 6 }, { id: "b", g: "B", y: 5 }] })
    .createBarPlot({ id: "bars", x: "g", y: { field: "y", aggregate: "sum" }, guides: false })
    .editScale({ id: "y", domain: [0, 10], range: [200, 0] }).selectMarks({ id: "picked", items: [] });
  const session = create(p, { target: "bars", axis: "y", channels: { y: "y2" } }), host = surface(); session.mount(host);
  host.fire("pointerdown", 120, 10); host.fire("pointerup", 120, 40);
  const r = resolveStoredSelection(session.getState().program, "picked");
  assert.deepEqual(r.items.filter(item => r.keys.includes(item.key)).map(item => item.channels.y2), [9]); session.destroy();
  assert.throws(() => create(program(), { axis: "x", channels: { x: "x2" } }), /explicit resolved/);
});

test("lasso follows sampled frame anchors while brush rejects an inferred animation scale", () => {
  for (const type of ["brush", "lasso"]) {
    const session = create(program(), { type }), host = surface(); session.mount(host);
    const state = session.getState(), scene = structuredClone(state.scene);
    for (const node of scene.nodes) if (node.type === "circle") node.properties.x += 80;
    session.dispatch({ type: "frame", scene, version: state.frameVersion + 1, generation: state.generation });
    if (type === "brush") { assert.throws(() => host.fire("pointerdown", 110, 40), /committed concrete frame/); assert.equal(host.captures.size, 0); }
    else { host.fire("pointerdown", 110, 40); host.fire("pointermove", 150, 40); host.fire("pointermove", 150, 80); host.fire("pointerup", 110, 80); assert.deepEqual(ids(session.getState().program), ["a"]); }
    session.destroy();
  }
});

test("lasso excludes invisible or clipped anchors and handles empty owners without first-item inference", () => {
  const invisible = program().encodeOpacity({ value: 0 }), session = create(invisible, { type: "lasso" }), host = surface(); session.mount(host);
  host.fire("pointerdown", 20, 20); host.fire("pointermove", 100, 20); host.fire("pointermove", 100, 100); host.fire("pointerup", 20, 100);
  assert.deepEqual(ids(session.getState().program), []); session.destroy();
  const clipped = program().editGraphics({ target: "points", property: "clip", value: { x: 0, y: 0, width: 40, height: 200 } }), c = create(clipped, { type: "lasso" }), ch = surface(); c.mount(ch);
  ch.fire("pointerdown", 20, 20); ch.fire("pointermove", 100, 20); ch.fire("pointermove", 100, 100); ch.fire("pointerup", 20, 100);
  assert.deepEqual(ids(c.getState().program), []); c.destroy();
  const empty = program().filterMarks({ target: "points", field: "id", op: "eq", value: "absent" }), s = create(empty), h = surface(); s.mount(h);
  h.fire("pointerdown", 20, 20); h.fire("pointerup", 100, 100); assert.deepEqual(ids(s.getState().program), []); s.destroy();
});

test("lasso point budget fails before accepting a partial draft and releases pending scheduling", () => {
  const p = program(), session = create(p, { type: "lasso" }), host = surface(), phases = []; session.mount(host);
  session.subscribe(event => { if (event.phase) phases.push(event.phase); }); host.fire("pointerdown", 20, 20);
  for (let index = 0; index < 9999; index++) host.fire("pointermove", 30 + index % 100, 30 + (index % 2));
  assert.equal(host.frames.size, 1); assert.throws(() => host.fire("pointermove", 250, 150), /point budget/);
  assert.deepEqual(phases, ["error"]); assert.equal(session.getState().program, p); assert.equal(host.captures.size, 0); assert.equal(host.frames.size, 0); session.destroy();
});

test("lasso combines resource body and label geometry into one logical anchor", () => {
  const p = chart().createCanvas({ width: 300, height: 200, margin: 0 })
    .createData({ id: "rows", values: [{ id: "root", parent: null, v: 10 }, { id: "child", parent: "root", v: 10 }], keyField: "id" })
    .createHierarchyData({ id: "hierarchy", key: "id", parent: "parent", value: "v" })
    .layoutHierarchy({ id: "layout", method: "tree", options: { nodeSize: [20, 20], siblingGap: 40, depthGap: 60, orientation: "vertical" } })
    .createTreePlot({ id: "tree", labels: { offset: [0, 0] } }).selectMarks({ id: "picked", target: "tree", items: [] });
  const session = create(p, { type: "lasso", target: "tree" }), host = surface(); session.mount(host);
  host.fire("pointerdown", 0, 0); host.fire("pointermove", 300, 0); host.fire("pointermove", 300, 200); host.fire("pointerup", 0, 200);
  const result = resolveStoredSelection(session.getState().program, "picked");
  assert.ok(result.keys.length >= 2); assert.equal(new Set(result.keys).size, result.keys.length); session.destroy();
});

test("linked brush previews update the same candidate closure and reject competing target writers", () => {
  const child = program(), p = hconcat({ programs: [{ id: "source", program: child }, { id: "target", program: child }] });
  const source = { childPath: ["source"], id: "points" }, target = { childPath: ["target"], id: "points" };
  const link = { type: "linkSelection", id: "rows", target, selection: "picked", resolve: "global", sources: [{ target: source, selection: "picked", projection: { type: "rows", sourceData: "rows", targetData: "rows" } }] };
  assert.throws(() => createInteractionSession({ program: p, bindings: [link, { type: "brush", target, selection: "picked" }] }), /owned by its binding/);
  const session = createInteractionSession({ program: p, bindings: [link, { type: "brush", target: source, selection: "picked" }] }), host = surface(640, 200), events = [];
  session.mount(host); session.subscribe(event => { if (event.phase) events.push(event); });
  host.fire("pointerdown", 20, 20); host.fire("pointermove", 100, 100); host.flush();
  assert.deepEqual(ids(session.getState().previewProgram.children.target), ["a"]); assert.equal(session.getState().program, p);
  assert.deepEqual(events[0].affectedOwners, [source, target]); host.fire("pointerup", 100, 100);
  assert.deepEqual(ids(session.getState().program.children.target), ["a"]); assert.equal(session.getState().revision, 1); session.destroy();
});
