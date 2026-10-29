import assert from "node:assert/strict";
import test from "node:test";
import { chart, hconcat } from "../../src/index.js";
import { chart as basic } from "../../src/basic.js";
import { createInteractionSession } from "../../src/interaction.js";
import { getMarkItems } from "../../src/inspection.js";
import { serializeProgram, deserializeProgram } from "../../src/persistence.js";
import { prepareProgramHitFrame } from "../../src/interaction/hitProgram.js";
import { resolveStoredSelection } from "../../src/materialization/selection/state.js";

const rows = [{ id: "a", x: 1, y: 2, category: 1 }, { id: "b", x: 2, y: 20, category: "1" }, { id: "c", x: 3, y: 4, category: 1 }];
const base = (factory = chart) => factory().createCanvas({ width: 500, height: 350, margin: 100 })
  .createData({ id: "rows", values: rows, keyField: "id" }).createPointMark({ id: "points" })
  .encodeX({ field: "x", scale: { nice: false, zero: false } }).encodeY({ field: "y", scale: { nice: false, zero: false } }).encodeColor({ field: "category" })
  .createLegend({ target: "points", channels: ["color"], position: "right" });
const binding = extra => ({ type: "legend", effect: "visibility", target: "points", channel: "color", scaleDomain: "all-data", ...extra });
const command = extra => ({ type: "setVisibility", target: "points", payload: { channel: "color", values: ["1"], visible: false, scaleDomain: "all-data", ...extra } });
const ids = p => getMarkItems(p, { target: "points" }).map(item => item.fields.id);
function entries(p, type = "rect") {
  const frame = prepareProgramHitFrame(p);
  return frame.entries.filter(e => e.metadata.role === "legend-item" && frame.scene.nodes[e.zIndex].type === type)
    .map(e => ({ point: { x: (e.shape.bounds.left + e.shape.bounds.right) / 2, y: (e.shape.bounds.top + e.shape.bounds.bottom) / 2 }, ...e }));
}
function surface() {
  const listeners = new Map(), captures = new Set();
  return { captures, getBoundingClientRect: () => ({ left: 10, top: 20, width: 1000, height: 700 }),
    addEventListener(type, fn) { const group = listeners.get(type) ?? new Set(); group.add(fn); listeners.set(type, group); },
    removeEventListener(type, fn) { listeners.get(type)?.delete(fn); },
    emit(point, extra = {}, type = "click") { for (const fn of [...listeners.get(type) ?? []]) fn({ clientX: point.x + 10, clientY: point.y + 20, pointerId: 1, pointerType: "mouse", ...extra }); },
    count: () => [...listeners.values()].reduce((sum, group) => sum + group.size, 0),
    setPointerCapture: id => captures.add(id), releasePointerCapture: id => captures.delete(id), hasPointerCapture: id => captures.has(id) };
}
const scope = child => ({ childPath: [child], id: "points" });
const selectedIds = p => { const { items, keys } = resolveStoredSelection(p, "picked"); return items.filter(item => keys.includes(item.key)).map(item => item.fields.id); };

test("visibility symbols and labels remove and restore typed categories with one final native transaction", () => {
  const p = base(), before = serializeProgram(p), session = createInteractionSession({ program: p, bindings: [binding()] }), host = surface(), events = [];
  session.mount(host); session.subscribe(event => { if (event.phase) events.push(event); });
  host.emit(entries(p)[1].point); const hidden = session.getState().program;
  assert.deepEqual(ids(hidden), ["a", "c"]); assert.deepEqual(hidden.resolvedScales.y.domain, [2, 20]);
  assert.deepEqual(hidden.guideConfigs.legend.color.domain, [1, "1"]);
  const labels = entries(hidden, "text").filter(e => entries(hidden).some(symbol => symbol.metadata.itemKey === e.metadata.itemKey));
  host.emit(labels[1].point); assert.deepEqual(ids(session.getState().program), ["a", "b", "c"]);
  host.emit(entries(session.getState().program)[0].point); assert.deepEqual(ids(session.getState().program), ["b"]);
  assert.deepEqual(events.map(e => [e.type, e.phase]), Array.from({ length: 3 }, () => [["setVisibility", "commit"], ["setVisibility", "settled"]]).flat());
  assert.ok(events.every(e => e.current === e.state.program)); assert.equal(serializeProgram(p), before);
  assert.deepEqual(ids(deserializeProgram(serializeProgram(session.getState().program))), ["b"]); session.destroy(); assert.equal(host.count(), 0);
});

test("direct commands preserve user filters, reject invalid input atomically and suppress semantic no-ops", () => {
  const p = base().filterMarks({ target: "points", field: "x", op: "lte", value: 2 }), session = createInteractionSession({ program: p, bindings: [] }), events = [];
  session.subscribe(e => { if (e.phase) events.push(e); });
  assert.equal(session.dispatch(command({ visible: true })).status, "unchanged"); assert.equal(session.getState().revision, 0);
  session.dispatch(command()); const state = session.getState(), snapshot = serializeProgram(state.program);
  assert.deepEqual(ids(state.program), ["a"]); assert.deepEqual(state.program.resolvedScales.y.domain, [2, 20]);
  assert.equal(session.dispatch(command()).status, "unchanged"); assert.equal(session.getState(), state);
  assert.throws(() => session.dispatch(command({ values: ["unknown"] }))); assert.equal(session.getState().program, state.program); assert.equal(serializeProgram(state.program), snapshot);
  session.dispatch({ type: "setVisibility", target: "points", payload: { clear: true } }); assert.deepEqual(ids(session.getState().program), ["a", "b"]);
  assert.deepEqual(events.map(e => e.phase), ["commit", "settled", "error", "commit", "settled"]); session.destroy();
  const plain = createInteractionSession({ program: base(basic), bindings: [] }); assert.throws(() => plain.dispatch(command({ visible: true })), /does not support/); plain.destroy();
});

test("keep-hidden and drop reconcile actual membership before downstream linked selection", () => {
  for (const selectionPolicy of ["keep-hidden", "drop"]) {
    const child = base().selectMarks({ id: "picked", target: "points", field: "id", op: "eq", value: "b" });
    const p = hconcat({ programs: [{ id: "left", program: child }, { id: "right", program: child }] });
    const session = createInteractionSession({ program: p, selectionPolicy, bindings: [{ type: "linkSelection", id: "link", target: scope("right"), selection: "picked", resolve: "global", sources: [{ target: scope("left"), selection: "picked", projection: { type: "rows", sourceData: "rows", targetData: "rows" } }] }] }), events = [];
    session.subscribe(e => { if (e.phase === "commit") events.push(e); });
    session.dispatch({ ...command(), target: scope("left") }); const q = session.getState().program;
    assert.deepEqual(ids(q.children.left), ["a", "c"]); assert.deepEqual(selectedIds(q.children.left), []); assert.deepEqual(selectedIds(q.children.right), []);
    assert.equal(events[0].selectionChanges.find(c => c.target.childPath[0] === "left")[selectionPolicy === "drop" ? "droppedKeys" : "hiddenKeys"].length, 1);
    session.dispatch({ ...command({ visible: true }), target: scope("left") });
    for (const id of ["left", "right"]) assert.deepEqual(selectedIds(session.getState().program.children[id]), selectionPolicy === "drop" ? [] : ["b"]);
    assert.equal(session.getState().revision, 2); session.destroy();
  }
});

test("linked native filters retain hidden members in their own universe and keep visibility after updates", () => {
  const child = base().selectMarks({ id: "universe", target: "points", items: [], empty: "all" });
  const hidden = child.setMarkVisibility({ ...command().payload, target: "points" });
  const p = hconcat({ programs: [{ id: "left", program: child }, { id: "right", program: hidden }] }), original = serializeProgram(p);
  const session = createInteractionSession({ program: p, bindings: [{ type: "linkFilter", id: "filter", target: scope("right"), selection: "universe", resolve: "global", sources: [{ target: scope("left"), selection: "universe", projection: { type: "rows", sourceData: "rows", targetData: "rows" } }] }] }), events = [];
  session.subscribe(e => { if (e.phase === "commit") events.push(e); });
  for (const [wanted, visible] of [[["b"], []], [["a", "b"], ["a"]], [["a"], ["a"]], [["a", "b", "c"], ["a", "c"]]]) {
    session.dispatch({ type: "select", target: scope("left"), payload: { id: "universe", select: { field: "id", op: "oneOf", values: wanted } } });
    const target = session.getState().program.children.right;
    assert.deepEqual(ids(target), visible); assert.deepEqual(ids(target.removeMarkVisibility()), wanted);
    assert.ok(target.markConfigs.points.visibilityFilter); assert.deepEqual(ids(deserializeProgram(serializeProgram(target))), visible);
  }
  assert.equal(events.length, 4); assert.equal(serializeProgram(p), original);
  session.dispatch({ ...command({ visible: true }), target: scope("right") }); assert.deepEqual(ids(session.getState().program.children.right), ["a", "b", "c"]); session.destroy();
});

test("nested current-frame capture cancellation and hidden legend recovery use the same category identity", () => {
  const child = base(), p = hconcat({ id: "joined", programs: [{ id: "left", program: child }, { id: "right", program: child }] });
  const session = createInteractionSession({ program: p, bindings: [binding({ target: scope("right") })] }), host = surface(), phases = [];
  session.mount(host, { rootTransform: [2, 0, 0, 2, 0, 0] }); session.subscribe(e => { if (e.phase) phases.push([e.type, e.phase]); });
  const state = session.getState(), scene = structuredClone(state.scene), key = entries(p).find(e => e.metadata.childPath[0] === "right").nodeKey;
  const node = scene.nodes.find(n => n.key === key); node.properties.x += 10;
  session.dispatch({ type: "frame", scene, generation: state.generation, version: state.frameVersion + 1 });
  const point = { x: 2 * (node.offset[0] + node.properties.x + node.properties.width / 2), y: 2 * (node.offset[1] + node.properties.y + node.properties.height / 2) };
  host.emit(point, {}, "pointerdown"); host.emit(point, { key: "Escape" }, "keydown"); assert.equal(session.getState().program, p);
  host.emit(point, {}, "pointerdown"); host.emit(point, {}, "pointerup"); host.emit(point, { detail: 1 });
  assert.deepEqual(ids(session.getState().program.children.right), ["b"]); assert.equal(session.getState().program.children.left, child);
  assert.deepEqual(phases, [["setVisibility", "cancel"], ["setVisibility", "commit"], ["setVisibility", "settled"]]);
  session.destroy(); assert.equal(host.count(), 0); assert.equal(host.captures.size, 0);
});

test("visibility bindings reject ambiguous, continuous, malformed or unsupported owners without evaluating getters", () => {
  const p = base();
  for (const extra of [{ effect: "other" }, { channel: "x" }, { scaleDomain: undefined }, { scaleDomain: "auto" }, { selection: "picked" }, { slop: -1 }]) assert.throws(() => createInteractionSession({ program: p, bindings: [binding(extra)] }));
  assert.throws(() => createInteractionSession({ program: base(basic), bindings: [binding()] }), /native visibility/);
  const continuous = p.removeLegend().encodeColor({ field: "x", fieldType: "quantitative" }).createLegend({ channels: ["color"] });
  assert.throws(() => createInteractionSession({ program: continuous, bindings: [binding()] }), /categorical/);
  let reads = 0; const bad = binding(); Object.defineProperty(bad, "scaleDomain", { get() { reads++; return "all-data"; } });
  assert.throws(() => createInteractionSession({ program: p, bindings: [bad] })); assert.equal(reads, 0);
});

test("visibility hit misses, overflow summaries and removed legends or children remain dormant", () => {
  const p = base().editLegend({ symbol: { layers: [{ type: "line", length: 16 }] }, overflow: { maxItems: 1, summarySymbol: "first-hidden" } });
  const session = createInteractionSession({ program: p, bindings: [binding({ slop: 0 })] }), host = surface(); session.mount(host);
  const symbols = entries(p, "line"); host.emit(symbols[1].point); host.emit({ x: 0, y: 0 }); assert.equal(session.getState().program, p);
  session.updateProgram(p.removeLegend()); const noLegend = session.getState(); host.emit(symbols[0].point); assert.equal(session.getState(), noLegend); session.destroy();
  const nested = hconcat({ programs: [{ id: "left", program: base() }, { id: "right", program: base() }] });
  const scoped = createInteractionSession({ program: nested, bindings: [binding({ target: scope("right") })] }), scopedHost = surface(); scoped.mount(scopedHost);
  const target = entries(nested).find(entry => entry.metadata.childPath[0] === "right");
  scoped.updateProgram(nested.removeCompositionChild({ target: "right" })); const missing = scoped.getState(); scopedHost.emit(target.point); assert.equal(scoped.getState(), missing); scoped.destroy();
  const source = base().facet({ field: "category", data: "rows" });
  assert.throws(() => createInteractionSession({ program: source, bindings: [binding({ target: { childPath: [], id: "points", facetSource: true } })] }), /facet/);
});

test("link filters preserve dormant hidden categories across source revisions without inventing unknown edits", () => {
  const child = base().selectMarks({ id: "universe", target: "points", items: [], empty: "all" });
  const hidden = child.setMarkVisibility({ ...command().payload, target: "points" });
  const revised = hidden.reviseData({ source: "rows", id: "next", values: rows.filter(row => row.id !== "b") });
  const program = hconcat({ programs: [{ id: "left", program: child }, { id: "right", program: revised }] });
  const session = createInteractionSession({ program, bindings: [{ type: "linkFilter", id: "filter", target: scope("right"), selection: "universe", resolve: "global", sources: [{ target: scope("left"), selection: "universe", projection: { type: "fields", sourceFields: ["id"], targetFields: ["id"] } }] }] });
  session.dispatch({ type: "select", target: scope("left"), payload: { id: "universe", select: { field: "id", op: "eq", value: "c" } } });
  const target = session.getState().program.children.right; assert.deepEqual(ids(target), ["c"]);
  assert.deepEqual(target.semanticSpec.datasets.find(d => d.id === target.semanticSpec.layers[0].data).transform[0].visibility.hidden, ["1"]);
  assert.throws(() => session.dispatch({ ...command({ values: ["not-known"] }), target: scope("right") })); session.destroy();
});


test("scoped visibility no-ops preserve the exact composition, trace, frame and session revision", () => {
  const child = base().setMarkVisibility({ ...command().payload, target: "points" });
  const p = hconcat({ programs: [{ id: "left", program: child }, { id: "right", program: base() }] });
  const session = createInteractionSession({ program: p, bindings: [] }), before = session.getState(), events = [];
  session.subscribe(event => events.push(event));
  assert.equal(session.dispatch({ ...command(), target: scope("left") }).status, "unchanged");
  assert.equal(session.getState(), before); assert.deepEqual(events, []); session.destroy();
});
