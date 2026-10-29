import test from "node:test";
import assert from "node:assert/strict";
import { chart, hconcat } from "../../src/index.js";
import { createInteractionSession } from "../../src/interaction.js";
import { resolveStoredSelection } from "../../src/materialization/selection/state.js";
import { serializeProgram, deserializeProgram } from "../../src/persistence.js";
import { resolveCoordinatePolarFrame } from "../../src/materialization/coordinateBounds.js";
const rows = [0, 5, 90, 180, 355, 360].map(angle => ({ id: `p${angle}`, angle, radius: 1 }));
const program = (scale = {}, values = rows) => chart().createCanvas({ width: 200, height: 200, margin: 0 })
  .createData({ id: "rows", keyField: "id", values })
  .createPolarScatterPlot({ id: "points", theta: { field: "angle", scale: { domain: [0, 360], ...scale } }, radius: { field: "radius", scale: { domain: [0, 1] } }, guides: false })
  .selectMarks({ id: "picked", target: "points", items: [] });
const ids = p => { const selected = resolveStoredSelection(p, "picked"); return selected.items.filter(item => selected.keys.includes(item.key)).map(item => item.fields.id); };
const stored = p => p.semanticSpec.resources.find(r => r.id === "picked").options;
const point = angle => ({ x: 100 + 80 * Math.sin(angle * Math.PI / 180), y: 100 - 80 * Math.cos(angle * Math.PI / 180) });
function surface(width = 200) {
  const listeners = new Map(), frames = new Map(), captures = new Set(); let next = 0;
  return { frames, captures, getBoundingClientRect: () => ({ left: 0, top: 0, width, height: 200 }),
    addEventListener: (key, fn) => listeners.set(key, fn), removeEventListener: key => listeners.delete(key),
    setPointerCapture: id => captures.add(id), hasPointerCapture: id => captures.has(id), releasePointerCapture: id => captures.delete(id),
    requestAnimationFrame: fn => { frames.set(++next, fn); return next; }, cancelAnimationFrame: id => frames.delete(id),
    flush() { const pending = [...frames.values()]; frames.clear(); pending.forEach(fn => fn()); },
    fire(type, position = point(0), extra = {}) { listeners.get(type)?.({ pointerId: 1, pointerType: "mouse", button: 0, clientX: position.x, clientY: position.y, ...extra }); }
  };
}
function setup(p = program(), target = "points", mode = "replace") {
  const s = createInteractionSession({ program: p, bindings: [{ type: "brush", axis: "theta", target, selection: "picked", mode }] }), host = surface(p.children ? 440 : 200);
  s.mount(host); return { s, host };
}
test("angular seam preview preserves typed domain and normalized radians then commits once", () => {
  const p = program().highlightMarks({ selection: "picked", color: "red", bringToFront: false }), serialized = serializeProgram(p), { s, host } = setup(p), phases = [];
  s.subscribe(e => { if (e.phase) phases.push(e.phase); });
  host.fire("pointerdown", point(350)); host.fire("pointermove", point(5)); host.fire("pointermove", point(10));
  assert.equal(host.frames.size, 1); host.flush();
  const preview = s.getState().previewProgram; assert.deepEqual(ids(preview), ["p0", "p5", "p355", "p360"]); assert.equal(s.getState().program, p);
  const graphic = preview.graphicSpec.objects["interaction-selection-preview"];
  assert.ok(graphic.items[0].properties.commands.some(command => command.op === "C")); assert.deepEqual(graphic.clip, { x: 0, y: 0, width: 200, height: 200 });
  host.fire("pointerup", point(10)); const next = s.getState().program;
  assert.deepEqual(ids(next), ["p0", "p5", "p355", "p360"]); assert.equal(next.trace.children.length, p.trace.children.length + 1);
  assert.deepEqual(phases, ["preview", "preview", "commit", "settled"]); assert.equal(host.captures.size, 0); assert.equal(host.frames.size, 0);
  const options = stored(next); assert.equal(options.mode, "predicate"); assert.equal(options.predicate.region.theta.ranges.length, 2);
  assert.ok(Math.abs(options.predicate.screenAngles[0] - 350 * Math.PI / 180) < 1e-14);
  assert.ok(Math.abs(options.predicate.screenAngles[1] - 10 * Math.PI / 180) < 1e-14);
  assert.deepEqual(ids(deserializeProgram(serializeProgram(next.editCanvas({ width: 400 })))), ids(next));
  assert.equal(serializeProgram(p), serialized); s.destroy();
});
test("angular inverse retains reverse and shifted ranges rather than reapplying reversal", () => {
  for (const [scale, expected] of [[{ reverse: true }, ["p0", "p5", "p355", "p360"]], [{ range: [-180, 180] }, ["p180"]]]) {
    const { s, host } = setup(program(scale)); host.fire("pointerdown", point(350)); host.fire("pointerup", point(10)); assert.deepEqual(ids(s.getState().program), expected); s.destroy();
  }
});
test("angular cancellation keeps exact baseline and empty endpoints commit an explicit empty region", () => {
  for (const terminal of ["pointercancel", "lostpointercapture", "blur", "Escape"]) {
    const p = program(), { s, host } = setup(p), phases = []; s.subscribe(e => { if (e.phase) phases.push(e.phase); });
    host.fire("pointerdown", point(350)); host.fire("pointermove", point(10)); host.flush();
    host.fire(terminal === "Escape" ? "keydown" : terminal, point(10), { key: "Escape" }); host.fire("pointerup", point(10));
    assert.equal(s.getState().program, p); assert.equal(s.getState().previewProgram, null); assert.deepEqual(phases, ["preview", "cancel"]); assert.equal(host.captures.size, 0); s.destroy();
  }
  const { s, host } = setup(); host.fire("pointerdown", point(90)); host.fire("pointerup", point(90));
  assert.deepEqual(ids(s.getState().program), []); assert.deepEqual(stored(s.getState().program).predicate.region.theta.ranges, []); s.destroy();
});
test("angular center and outside-disc starts do not capture and center endpoints fail atomically", () => {
  const p = program(), { s, host } = setup(p), phases = []; s.subscribe(e => { if (e.phase) phases.push(e.phase); });
  for (const start of [{ x: 100, y: 100 }, { x: 0, y: 0 }]) { host.fire("pointerdown", start); assert.equal(host.captures.size, 0); host.fire("pointerup", point(10)); }
  host.fire("pointerdown", point(350)); assert.throws(() => host.fire("pointerup", { x: 100, y: 100 }), /center/);
  assert.equal(s.getState().program, p); assert.deepEqual(phases, ["error"]); assert.equal(host.captures.size, 0); assert.equal(host.frames.size, 0); s.destroy();
});
test("angular set updates retain screen metadata with stable item keys", () => {
  const p = program().editMarkSelection({ selection: "picked", field: "id", op: "eq", value: "p90" }), { s, host } = setup(p, "points", "add");
  host.fire("pointerdown", point(350)); host.fire("pointerup", point(10));
  assert.deepEqual(ids(s.getState().program), ["p0", "p5", "p90", "p355", "p360"]); assert.equal(stored(s.getState().program).mode, "item-keys");
  assert.equal(stored(deserializeProgram(serializeProgram(s.getState().program))).screenAngles.length, 2); s.destroy();
});
test("angular child-scoped native edits preserve sibling identity and current concrete owner center", () => {
  const child = program(), p = hconcat({ programs: [{ id: "left", program: child }, { id: "right", program: child }] }), { s, host } = setup(p, { childPath: ["right"], id: "points" });
  const offset = s.getState().scene.nodes.find(node => node.type === "circle" && node.offset[0] > 0).offset[0];
  const mapped = angle => ({ ...point(angle), x: point(angle).x + offset });
  host.fire("pointerdown", mapped(350)); host.fire("pointerup", mapped(10));
  assert.deepEqual(ids(s.getState().program.children.right), ["p0", "p5", "p355", "p360"]); assert.equal(s.getState().program.children.left, child); s.destroy();
});
test("angular metadata rejects inactive invalid state and never turns Cartesian data into theta", () => {
  const p = program();
  for (const screenAngles of [[0], [0, 2 * Math.PI], [NaN, 1], [0, 1, 2]]) assert.throws(() => p.editMarkSelection({ selection: "picked", region: { theta: { ranges: [] } }, screenAngles }));
  assert.throws(() => p.editMarkSelection({ selection: "picked", region: { x: { ranges: [] } }, screenAngles: [0, 1] }), /theta/);
  assert.throws(() => p.editMarkSelection({ selection: "picked", items: [], screenAngles: [0, 1], screenPolygon: [] }), /not both/);
  assert.throws(() => createInteractionSession({ program: p, bindings: [{ type: "brush", axis: "theta", channels: { theta: "theta2" }, target: "points", selection: "picked" }] }), /matching position/);
});
test("angular native selection uses time domains, typed categories and rejects proportional sectors", () => {
  const cases = [
    { type: "time", domain: [0, 86400000], values: [0, 1000000, 43200000, 86400000], end: 90, expected: ["p0", "p1000000", "p86400000"] }
  ];
  for (const c of cases) {
    let p = program({ domain: c.domain }, c.values.map(angle => ({ id: `p${angle}`, angle, radius: 1 })));
    p = p.encodeTheta({ field: "angle", fieldType: c.type === "time" ? "temporal" : "quantitative", scale: { id: "temporal-angle", type: c.type, domain: c.domain } });
    const { s, host } = setup(p); host.fire("pointerdown", point(0)); host.fire("pointerup", point(c.end)); assert.deepEqual(ids(s.getState().program), c.expected); s.destroy();
  }
  const p = chart().createCanvas({ width: 200, height: 200, margin: 0 }).createData({ values: [{ c: "a", r: 1 }, { c: "b", r: 2 }, { c: "c", r: 3 }] })
    .createPolarScatterPlot({ id: "points", theta: { field: "c", fieldType: "nominal", scale: { type: "band", paddingInner: 0, paddingOuter: 0 } }, radius: "r", guides: false }).selectMarks({ id: "picked", target: "points", items: [] });
  const { s, host } = setup(p); host.fire("pointerdown", point(350)); host.fire("pointerup", point(10));
  assert.deepEqual(stored(s.getState().program).predicate.region.theta.values, ["a", "c"]); s.destroy();
  const arc = chart().createCanvas({ width: 200, height: 200, margin: 0 }).createData({ values: [{ c: "a" }, { c: "b" }, { c: "b" }] })
    .createArcMark({ id: "arc" }).encodeTheta({ field: "c", aggregate: "count" }).selectMarks({ id: "picked", target: "arc", items: [] });
  assert.throws(() => setup(arc, "arc"), /proportional sectors/);
});
test("angular root transforms and native conditional selection preserve the same final item grain", () => {
  const p = program().encodeColor({ conditions: [{ when: { selection: "picked" }, value: { value: "red" } }], otherwise: { value: "gray" } });
  const s = createInteractionSession({ program: p, bindings: [{ type: "brush", axis: "theta", target: "points", selection: "picked" }] }), host = surface(400);
  s.mount(host, { rootTransform: [-1, 0, 0, 1, 300, 0] });
  const mapped = angle => ({ x: 300 - point(angle).x, y: point(angle).y });
  host.fire("pointerdown", mapped(350)); host.fire("pointerup", mapped(10));
  assert.deepEqual(ids(s.getState().program), ["p0", "p5", "p355", "p360"]); s.destroy();
});

test("sector preview rejects executable nested frame inputs before reading them",()=>{
 const p=program(),before=serializeProgram(p);let reads=0;
 assert.throws(()=>p.materializeSelectionPreview({sector:{frame:{get centerX(){reads++;return 100;},centerY:100,availableRadius:100},startTheta:0,endTheta:90,outerRadius:100}}),/own data/);
 assert.equal(reads,0);assert.equal(serializeProgram(p),before);
 for(const sector of [{}, {frame:{centerX:100,centerY:100}}, {frame:{centerX:100,centerY:100,availableRadius:100,extra:true}}]) assert.throws(()=>p.materializeSelectionPreview({sector}));
 assert.throws(()=>p.materializeSelectionPreview({points:[],sector:{}}),/points or a sector/);
 assert.throws(()=>p.materializeSelectionPreview({sector:{unknown:true}}),/unsupported/);
});

test("nested responsive angular gestures keep resolved owner geometry through resize and restoration", () => {
  const child = program().editCanvas({ width: 300, height: 260, margin: 20, responsive: {} }).createTitle({ text: "Polar view" });
  const inner = hconcat({ id: "inner", programs: [{ id: "left", program: child }, { id: "right", program: child }] });
  const p = hconcat({ id: "outer", programs: [{ id: "overview", program: child }, { id: "detail", program: inner }] });
  const target = { childPath: ["detail", "right"], id: "points" }, { s, host } = setup(p, target), before = serializeProgram(p);
  const mapped = (angle, current) => {
    const owner = current.children.detail.children.right, layer = owner.semanticSpec.layers.find(layer => layer.id === "points");
    const frame = resolveCoordinatePolarFrame(owner, layer.coordinate);
    const offset = s.getState().scene.nodes.filter(node => node.type === "circle").sort((a, b) => b.offset[0] - a.offset[0])[0].offset;
    return { x: offset[0] + frame.centerX + frame.availableRadius * .8 * Math.sin(angle * Math.PI / 180),
      y: offset[1] + frame.centerY - frame.availableRadius * .8 * Math.cos(angle * Math.PI / 180) };
  };
  host.fire("pointerdown", mapped(350, p)); host.fire("pointermove", mapped(10, p)); host.flush();
  assert.deepEqual(ids(s.getState().previewProgram.children.detail.children.right), ["p0", "p5", "p355", "p360"]);
  const resized = p.editCanvas({ target: { childPath: ["detail", "right"] }, width: 420 });
  s.updateProgram(resized); assert.equal(s.getState().previewProgram, null); assert.equal(host.captures.size, 0);
  host.fire("pointerup", mapped(10, resized)); assert.equal(s.getState().program, resized);
  host.fire("pointerdown", mapped(350, resized)); host.fire("pointermove", mapped(10, resized)); host.flush(); host.fire("pointerup", mapped(10, resized));
  const next = s.getState().program;
  assert.equal(next.children.overview, resized.children.overview); assert.equal(next.children.detail.children.left, resized.children.detail.children.left);
  assert.deepEqual(ids(next.children.detail.children.right), ["p0", "p5", "p355", "p360"]);
  assert.deepEqual(ids(deserializeProgram(serializeProgram(next)).children.detail.children.right), ["p0", "p5", "p355", "p360"]);
  assert.equal(serializeProgram(p), before); s.destroy();
});
