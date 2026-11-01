import test from "node:test";
import assert from "node:assert/strict";
import { chart, hconcat } from "../../src/index.js";
import { createInteractionSession } from "../../src/interaction.js";
import { serializeProgram, deserializeProgram } from "../../src/persistence.js";
import { resolveStoredSelection } from "../../src/materialization/selection/state.js";

const chartWithRegion = () => chart().createCanvas({ width: 300, height: 200, margin: 0 })
  .createData({ id: "rows", keyField: "id", values: [{ id: "a", x: 50, y: 60 }, { id: "b", x: 200, y: 130 }] })
  .createPointMark({ id: "points" }).encodePointRadius({ value: 8 })
  .encodeX({ field: "x", scale: { domain: [0, 300], range: [0, 300] } })
  .encodeY({ field: "y", scale: { domain: [0, 200], range: [0, 200] } })
  .selectMarks({ id: "picked", target: "points", region: { x: { ranges: [{ min: 20, max: 100 }] } } });
const resize = (program = chartWithRegion(), binding = {}) => createInteractionSession({ program,
  bindings: [{ type: "resize", target: "points", selection: "picked", axis: "x", ...binding }] });
const range = program => resolveStoredSelection(program, "picked").selector.region.x.ranges[0];
function surface(width = 300, height = 200) {
  const listeners = new Map(), frames = new Map(), captures = new Set(); let sequence = 0;
  return { frames, captures,
    getBoundingClientRect: () => ({ left: 10, top: 20, width, height }),
    addEventListener(type, fn) { const set = listeners.get(type) ?? new Set(); set.add(fn); listeners.set(type, set); },
    removeEventListener(type, fn) { listeners.get(type)?.delete(fn); },
    setPointerCapture(id) { captures.add(id); }, hasPointerCapture: id => captures.has(id),
    releasePointerCapture(id) { captures.delete(id); this.fire("lostpointercapture", 0, 0, { pointerId: id }); },
    requestAnimationFrame(fn) { frames.set(++sequence, fn); return sequence; }, cancelAnimationFrame(id) { frames.delete(id); },
    flush() { const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(fn => fn()); },
    fire(type, x = 0, y = 0, extra = {}) { for (const fn of [...listeners.get(type) ?? []]) fn({ pointerId: 1, pointerType: "mouse", button: 0, clientX: x + 10, clientY: y + 20, ...extra }); },
    count: () => [...listeners.values()].reduce((n, set) => n + set.size, 0)
  };
}

test("selection resize readonly handles share the exact CSS points used by capture and one native commit", () => {
  const program = chartWithRegion(), before = serializeProgram(program), session = resize(program), host = surface(), events = [];
  assert.deepEqual(session.getSelectionHandles().handles.map(value => value.point), [{ x: 20, y: 100 }, { x: 100, y: 100 }]);
  assert.ok(Object.isFrozen(session.getSelectionHandles().handles[0].point));
  session.mount(host); session.subscribe(event => { if (event.phase) events.push(event.phase); });
  host.fire("pointerdown", 100, 100);
  for (let x = 101; x <= 200; x++) host.fire("pointermove", x, 100);
  assert.equal(host.frames.size, 1); assert.equal(session.getState().program, program);
  host.flush(); assert.equal(session.getSelectionHandles().handles[1].point.x, 200);
  assert.equal(range(session.getState().previewProgram).max, 200);
  host.fire("pointerup", 230, 100);
  assert.ok(Math.abs(range(session.getState().program).max - 230) < 1e-12);
  assert.equal(session.getState().history.undoCount, 1); assert.equal(session.getState().previewProgram, null);
  assert.deepEqual(events, ["preview", "preview", "commit", "settled"]);
  assert.equal(serializeProgram(program), before);
  assert.deepEqual(range(deserializeProgram(serializeProgram(session.getState().program))), range(session.getState().program));
  session.dispatch({ type: "undo" }); assert.equal(range(session.getState().program).max, 100);
  session.destroy(); assert.equal(host.count(), 0); assert.throws(() => session.getSelectionHandles(), /disposed/);
});

test("selection resize cancellation restores the queried baseline and ignores late up and RAF", () => {
  for (const reason of ["Escape", "pointercancel", "lostpointercapture", "blur", "unmount", "destroy"]) {
    const program = chartWithRegion(), session = resize(program), host = surface(), events = [], detach = session.mount(host);
    session.subscribe(event => { if (event.phase) events.push(event.phase); });
    host.fire("pointerdown", 20, 100); host.fire("pointermove", 70, 100); host.flush(); host.fire("pointermove", 80, 100);
    const late = [...host.frames.values()];
    if (reason === "Escape") host.fire("keydown", 0, 0, { key: "Escape" });
    else if (reason === "destroy") session.destroy(); else if (reason === "unmount") detach(); else host.fire(reason);
    late.forEach(fn => fn()); host.fire("pointerup", 90, 100);
    assert.equal(session.getState().program, program); assert.equal(session.getState().history.undoCount, 0);
    assert.deepEqual(events, ["preview", "cancel"]); assert.equal(host.captures.size, 0); assert.equal(host.frames.size, 0);
    if (reason !== "destroy") assert.deepEqual(session.getSelectionHandles().handles.map(value => value.point.x), [20, 100]);
    session.destroy();
  }
});

test("selection resize preserves an untouched exclusive boundary when the dragged side crosses it", () => {
  const program = chartWithRegion().editMarkSelection({ selection: "picked", region: { x: { ranges: [{ min: 20, max: 100, maxInclusive: false }] } } });
  const session = resize(program), host = surface(); session.mount(host);
  host.fire("pointerdown", 20, 100); host.fire("pointerup", 150, 100);
  assert.deepEqual(range(session.getState().program), { min: 100, minInclusive: false, max: 150, maxInclusive: true });
  session.destroy();
});

test("selection resize rejects ambiguous handles and never guesses rectangles from keys, lasso or empty regions", () => {
  const program = chartWithRegion();
  for (const select of [{ items: [] }, { items: [], screenPolygon: [{ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 20, y: 0 }] }, { region: { x: { ranges: [] } } }]) {
    const session = resize(program.editMarkSelection({ selection: "picked", ...select }));
    assert.deepEqual(session.getSelectionHandles().handles, []); session.destroy();
  }
  const near = resize(program.editMarkSelection({ selection: "picked", region: { x: { ranges: [{ min: 20, max: 22 }] } } })), host = surface();
  near.mount(host); assert.throws(() => host.fire("pointerdown", 21, 100), /ambiguous/);
  assert.equal(host.captures.size, 0); assert.equal(near.getState().history.undoCount, 0); near.destroy();
  const same = resize(program.editMarkSelection({ selection: "picked", region: { x: { ranges: [{ min: 20, max: 20 }] } } }));
  assert.throws(() => same.getSelectionHandles(), /ambiguous/); same.destroy();
  assert.throws(() => createInteractionSession({ program, bindings: [
    { type: "resize", target: "points", selection: "picked", axis: "x" },
    { type: "resize", target: "points", selection: "picked", axis: "x" }
  ] }), /ambiguous priority/);
});

test("selection resize query and touch hit use child placement, root transforms and native owner clips", () => {
  const child = chartWithRegion(), program = hconcat({ gap: 20, programs: [{ id: "left", program: child }, { id: "right", program: child }] });
  const session = resize(program, { target: { childPath: ["right"], id: "points" } }), host = surface(640, 200);
  session.mount(host, { rootTransform: [2, 0, 0, 2, 7, 11] });
  const handles = session.getSelectionHandles().handles;
  assert.deepEqual(handles[1].point, { x: 847, y: 211 });
  host.fire("pointerdown", 852, 211, { pointerType: "touch" });
  host.fire("pointerup", 1007, 211, { pointerType: "touch" });
  assert.equal(range(session.getState().program.children.right).max, 180); assert.equal(session.getState().program.children.left, child);
  session.destroy();
  const clipped = resize(child.editGraphics({ target: "points", property: "clip", value: { x: 50, y: 0, width: 250, height: 200 } }));
  assert.deepEqual(clipped.getSelectionHandles().handles.map(value => value.handle), ["x-max"]); clipped.destroy();
});

test("selection resize taps and a drag returning to its baseline do not write history", () => {
  const program = chartWithRegion(), session = resize(program), host = surface(); session.mount(host);
  host.fire("pointerdown", 100, 100); host.fire("pointerup", 100, 100);
  assert.equal(session.getState().program, program);
  host.fire("pointerdown", 100, 100); host.fire("pointermove", 150, 100); host.flush(); host.fire("pointerup", 100, 100);
  assert.equal(session.getState().program, program); assert.equal(session.getState().history.undoCount, 0); session.destroy();
});

test("category axis handles reorder the native domain, marks and legend with one history entry", () => {
  const rows = [{ id: "a", category: "A", value: 1 }, { id: "b", category: "B", value: 2 }, { id: "c", category: "C", value: 3 }];
  const program = chart().createCanvas({ width: 600, height: 400, margin: { top: 30, right: 120, bottom: 80, left: 80 } }).createData({ id: "rows", keyField: "id", values: rows })
    .createBarPlot({ id: "bars", x: "category", y: "value", color: "category" })
    .editLegend({ order: { channel: "x" } }).selectMarks({ id: "picked", target: "bars", field: "category", op: "eq", value: "C" });
  const before = serializeProgram(program), session = createInteractionSession({ program, bindings: [{ type: "reorder", target: "bars", channel: "x" }] });
  const host = surface(600, 400), events = []; session.mount(host); session.subscribe(event => { if (event.phase) events.push(event.phase); });
  const label = program.graphicSpec.objects.xAxisLabels.items.find(item => item.properties.text === "A").properties;
  host.fire("pointerdown", label.x, label.y);
  assert.equal(host.captures.size, 1);
  for (let i = 0; i < 100; i++) host.fire("pointermove", 480 + i, label.y);
  assert.equal(host.frames.size, 1); host.flush();
  assert.deepEqual(session.getState().previewProgram.resolvedScales.x.domain, ["B", "C", "A"]);
  assert.equal(session.getState().program, program); host.fire("pointerup", 580, label.y);
  const next = session.getState().program;
  assert.deepEqual(next.resolvedScales.x.domain, ["B", "C", "A"]);
  assert.deepEqual(next.graphicSpec.objects.colorLegendLabels.items.map(item => item.properties.text), ["B", "C", "A"]);
  assert.deepEqual(next.semanticSpec.datasets.find(item => item.id === "rows").values, rows);
  assert.deepEqual(resolveStoredSelection(next, "picked").keys, resolveStoredSelection(program, "picked").keys);
  assert.deepEqual(events, ["preview", "preview", "commit", "settled"]); assert.equal(session.getState().history.undoCount, 1);
  assert.equal(serializeProgram(program), before); session.dispatch({ type: "undo" }); assert.equal(session.getState().program, program); session.destroy();
});

test("category handles ignore titles and direct marks, cancel previews and preserve typed categories", () => {
  const program = chart().createCanvas({ width: 600, height: 400, margin: { top: 30, right: 120, bottom: 80, left: 80 } })
    .createData({ id: "rows", values: [{ category: 1, value: 1 }, { category: "1", value: 2 }, { category: false, value: 3 }] })
    .createBarPlot({ id: "bars", x: "category", y: "value" });
  const session = createInteractionSession({ program, bindings: [{ type: "reorder", target: "bars", channel: "x" }] }), host = surface(600, 400);
  session.mount(host); host.fire("pointerdown", 200, 100); assert.equal(host.captures.size, 0);
  const labels = program.graphicSpec.objects.xAxisLabels.items;
  const label = labels[1].properties; host.fire("pointerdown", label.x, label.y); host.fire("pointermove", 580, label.y); host.flush();
  assert.deepEqual(session.getState().previewProgram.resolvedScales.x.domain, [1, false, "1"]);
  host.fire("keydown", 0, 0, { key: "Escape" }); host.fire("pointerup", 580, label.y);
  assert.equal(session.getState().program, program); assert.equal(session.getState().history.undoCount, 0);
  host.fire("pointerdown", label.x, label.y); host.fire("pointerup", 580, label.y);
  assert.deepEqual(session.getState().program.resolvedScales.x.domain, [1, false, "1"]); session.destroy();
});

test("category resize retains the fixed category at touching band edges and supports crossing", () => {
  const program = chart().createCanvas({ width: 300, height: 200, margin: 0 })
    .createData({ values: [{ c: 1, y: 1 }, { c: "1", y: 2 }, { c: false, y: 3 }] })
    .createPointMark({ id: "points" }).encodeX({ field: "c", fieldType: "nominal", scale: { type: "band", paddingInner: 0, paddingOuter: 0 } }).encodeY({ field: "y" })
    .selectMarks({ id: "picked", target: "points", region: { x: { values: ["1"] } } });
  for (const [endpoint, expected] of [[250, ["1", false]], [50, [1, "1"]], [200, ["1"]]]) {
    const session = resize(program), host = surface(); session.mount(host);
    assert.deepEqual(session.getSelectionHandles().handles.map(h => h.point.x), [100, 200]);
    host.fire("pointerdown", 200, 100); host.fire("pointermove", 230, 100); host.flush(); host.fire("pointerup", endpoint, 100);
    assert.deepEqual(resolveStoredSelection(session.getState().program, "picked").selector.region.x.values, expected);
    assert.equal(session.getState().history.undoCount, endpoint === 200 ? 0 : 1); session.destroy();
  }
});

test("xy corner resize chooses the nearest handle after farther ties and preserves unchanged axis intent", () => {
  const program = chartWithRegion().editMarkSelection({ selection: "picked", region: {
    x: { ranges: [{ min: 20, max: 100 }] }, y: { ranges: [{ min: 20, max: 100, maxInclusive: false }] }
  } });
  const session = resize(program, { axis: "xy", slop: 100 }), host = surface(); session.mount(host);
  assert.equal(session.getSelectionHandles().handles.length, 8);
  host.fire("pointerdown", 100, 100); host.fire("pointerup", 150, 150);
  assert.deepEqual(resolveStoredSelection(session.getState().program, "picked").selector.region, {
    x: { ranges: [{ min: 20, minInclusive: true, max: 150, maxInclusive: true }] },
    y: { ranges: [{ min: 20, minInclusive: true, max: 150, maxInclusive: true }] }
  });
  session.dispatch({ type: "undo" });
  host.fire("pointerdown", 100, 60); host.fire("pointerup", 150, 60);
  assert.equal(resolveStoredSelection(session.getState().program, "picked").selector.region.y.ranges[0].maxInclusive, false); session.destroy();
});

test("native log and time resize use domain inverse values rather than pixel deltas", () => {
  for (const temporal of [false, true]) {
    const start = temporal ? 1709251200000 : 1, end = temporal ? start + 86400000 : 1000;
    const min = temporal ? start + 21600000 : 10, max = temporal ? start + 43200000 : 100;
    const program = chart().createCanvas({ width: 300, height: 200, margin: 0 }).createData({ values: [{ x: min, y: 1 }] })
      .createPointMark({ id: "points" }).encodeX({ field: "x", fieldType: temporal ? "temporal" : "quantitative", scale: { type: temporal ? "time" : "log", domain: [start, end] } })
      .encodeY({ field: "y" }).selectMarks({ id: "picked", target: "points", region: { x: { ranges: [{ min, max }] } } });
    const session = resize(program), host = surface(); session.mount(host);
    const handle = session.getSelectionHandles().handles[1]; host.fire("pointerdown", handle.point.x, handle.point.y); host.fire("pointerup", 225, 100);
    assert.equal(range(session.getState().program).min, min);
    assert.ok(Math.abs(range(session.getState().program).max - (temporal ? start + 64800000 : 10 ** 2.25)) < 1e-9); session.destroy();
  }
});

test("theta resize preserves directed seam and errors atomically at the center", () => {
  const program = chart().createCanvas({ width: 200, height: 200, margin: 0 }).createData({ values: [{ a: 0, r: 1 }, { a: 90, r: 1 }, { a: 270, r: 1 }] })
    .createPolarScatterPlot({ id: "points", theta: { field: "a", scale: { domain: [0, 360] } }, radius: "r", guides: false })
    .selectMarks({ id: "picked", target: "points", region: { theta: { ranges: [{ min: 0, max: 90 }, { min: 270, max: 360 }] } }, screenAngles: [3 * Math.PI / 2, Math.PI / 2] });
  const session = resize(program, { axis: "theta" }), host = surface(200, 200); session.mount(host);
  const handle = session.getSelectionHandles().handles[1];
  host.fire("pointerdown", handle.point.x, handle.point.y); assert.throws(() => host.fire("pointerup", 100, 100), /center/);
  assert.equal(session.getState().program, program); assert.equal(session.getState().history.undoCount, 0); assert.equal(host.captures.size, 0);
  host.fire("pointerdown", handle.point.x, handle.point.y); host.fire("pointerup", 100, 200);
  assert.deepEqual(resolveStoredSelection(session.getState().program, "picked").selector.region.theta.ranges,
    [{ min: 0, minInclusive: true, max: 180, maxInclusive: true }, { min: 270, minInclusive: true, max: 360, maxInclusive: true }]);
  session.destroy();
});

test("handle binding own data is closed and invalid replacement leaves mounted state intact", () => {
  const program = chartWithRegion(); let reads = 0;
  const original = Object.getOwnPropertyDescriptor(Object.prototype, "slop");
  Object.defineProperty(Object.prototype, "slop", { configurable: true, get() { reads++; throw new Error("inherited getter"); } });
  try { const session = resize(program); session.getSelectionHandles(); session.destroy(); } finally {
    if (original) Object.defineProperty(Object.prototype, "slop", original); else delete Object.prototype.slop;
  }
  assert.equal(reads, 0);
  for (const binding of [{ axis: undefined }, { axis: "radius" }, { mode: "toggle" }, { channels: { x: "y" } }, { slop: -1 }]) {
    assert.throws(() => resize(program, binding));
  }
  assert.equal(reads, 0);
  const raw = { type: "resize", target: "points", selection: "picked", get axis() { reads++; return "x"; } };
  assert.throws(() => createInteractionSession({ program, bindings: [raw] }), /own data/); assert.equal(reads, 0);
  const session = resize(program), host = surface(); session.mount(host);
  assert.throws(() => session.mount(host, { rootTransform: [1, 0] }));
  host.fire("pointerdown", 100, 100); host.fire("pointerup", 180, 100); assert.equal(range(session.getState().program).max, 180); session.destroy();
});

test("native y and theta category handles preserve resolved reversed order and directed domain cut", () => {
  for (const channel of ["y", "theta"]) for (const reverse of [false, true]) {
    const seed = chart().createCanvas({ width: 500, height: 500, margin: 80 }).createData({ values: [{ c: "A", r: 1 }, { c: "B", r: 2 }, { c: "C", r: 3 }] });
    const p = channel === "theta" ? seed.createPolarScatterPlot({ id: "points", theta: { field: "c", fieldType: "nominal", scale: { type: "band", paddingInner: 0, paddingOuter: 0, reverse } }, radius: "r" })
      : seed.createPointMark({ id: "points" }).encodeX({ field: "r" }).encodeY({ field: "c", fieldType: "nominal", scale: { type: "band", reverse } }).createYAxis({ title: false });
    const session = createInteractionSession({ program: p, bindings: [{ type: "reorder", target: "points", channel }] }), host = surface(500, 500); session.mount(host);
    const start = p.graphicSpec.objects[`${channel}AxisLabels`].items[1].properties;
    host.fire("pointerdown", start.x, start.y);
    if (channel === "theta") host.fire("pointerup", 250, 80); // Native directed cut is the first domain boundary.
    else host.fire("pointerup", start.x, reverse ? 490 : 10);
    assert.deepEqual(session.getState().program.resolvedScales[channel].domain, ["B", "A", "C"]);
    assert.equal(session.getState().history.undoCount, 1); session.destroy();
  }
});

test("handle queries reject collapsed CSS geometry and defer missing owners without guessing", () => {
  const session = resize(), host = surface(); session.mount(host, { rootTransform: [1, 0, 0, 1, 1e20, 0] });
  assert.throws(() => session.getSelectionHandles(), /coincident/); assert.equal(session.getState().history.undoCount, 0); session.destroy();
  const s = resize(); s.updateProgram(chartWithRegion().removeMarkSelection({ selection: "picked" }));
  assert.deepEqual(s.getSelectionHandles().handles, []); s.destroy();
  for (const binding of [{ type: "reorder", target: "points", channel: "color" }, { type: "reorder", target: "points", channel: "x" }, { type: "reorder", target: "missing", channel: "x" }]) {
    assert.throws(() => createInteractionSession({ program: chartWithRegion(), bindings: [binding] }));
  }
});

test("category handles use scoped axis identities, reject center/cut ambiguity and keep missing owners idle", () => {
  const child = chart().createCanvas({ width: 500, height: 500, margin: 80 }).createData({ values: [{ c: "A", r: 1 }, { c: "B", r: 2 }, { c: "C", r: 3 }] })
    .createPolarScatterPlot({ id: "points", theta: { field: "c", fieldType: "nominal", scale: { type: "band", range: [0, 180], paddingInner: 0, paddingOuter: 0 } }, radius: "r" });
  const program = hconcat({ gap: 20, programs: [{ id: "left", program: child }, { id: "right", program: child }] });
  const target = { childPath: ["right"], id: "points" }, session = createInteractionSession({ program, bindings: [{ type: "reorder", target, channel: "theta", slop: 0 }] }), host = surface(1020, 500); session.mount(host);
  const label = child.graphicSpec.objects.thetaAxisLabels.items[1].properties;
  host.fire("pointerdown", label.x, label.y); assert.equal(host.captures.size, 0);
  for (const end of [{ x: 770, y: 250 }, { x: 600, y: 250 }]) {
    host.fire("pointerdown", 520 + label.x, label.y); assert.equal(host.captures.size, 1);
    assert.throws(() => host.fire("pointerup", end.x, end.y), /center|ambiguous/); assert.equal(session.getState().program, program); assert.equal(host.captures.size, 0);
  }
  host.fire("pointerdown", 520 + label.x, label.y); host.fire("pointerup", 770, 70);
  assert.deepEqual(session.getState().program.children.right.resolvedScales.theta.domain, ["B", "A", "C"]); assert.equal(session.getState().program.children.left, child);
  session.updateProgram(chart().createCanvas()); host.fire("pointerdown", 770, 70); assert.equal(host.captures.size, 0); session.destroy();
});

test("selection handles obey path clips and shared work accounting before returning output", async () => {
  const p = chartWithRegion().editGraphics({ target: "points", property: "clip", value: { type: "path", fillRule: "evenodd", commands: [
    { op: "M", x: 50, y: 20 }, { op: "L", x: 250, y: 20 }, { op: "L", x: 250, y: 180 }, { op: "L", x: 50, y: 180 }, { op: "Z" }
  ] } });
  const s = resize(p); assert.deepEqual(s.getSelectionHandles().handles.map(h => h.handle), ["x-max"]); s.destroy();
  const { prepareResizeHandles, normalizeResizeBinding } = await import("../../src/interaction/regionResize.js"), { prepareProgramHitFrame } = await import("../../src/interaction/hitProgram.js");
  const base = prepareProgramHitFrame(p), binding = normalizeResizeBinding(p, { type: "resize", target: "points", selection: "picked", axis: "x" }, []); let work = 0;
  const result = prepareResizeHandles(p, binding, base, base.scene, [1, 0, 0, 1, 0, 0], base, count => { work += count; });
  assert.equal(result.handles.length, 1); assert.ok(work > 0);
  assert.throws(() => prepareResizeHandles(p, binding, base, base.scene, [1, 0, 0, 1, 0, 0], base, () => { throw new RangeError("shared work exceeded"); }), /shared work exceeded/);
  assert.equal(s.getState().program, p);
});
