import test from "node:test";
import assert from "node:assert/strict";
import { chart, hconcat } from "../../src/index.js";
import { chart as basic } from "../../src/basic.js";
import { createInteractionSession } from "../../src/interaction.js";
import { getMarkItems } from "../../src/inspection.js";
import { serializeProgram, deserializeProgram } from "../../src/persistence.js";
import { resolveStoredSelection } from "../../src/materialization/selection/state.js";

const rows = [{ id: "a", category: "A", x: 1, y: 3 }, { id: "b", category: "B", x: 2, y: 2 }, { id: "c", category: "C", x: 3, y: 1 }];
const points = (factory = chart) => factory().createCanvas({ width: 360, height: 240, margin: 30 })
  .createData({ id: "rows", keyField: "id", values: rows }).createPointMark({ id: "points" })
  .encodeX({ field: "x", scale: { nice: false, zero: false } }).encodeY({ field: "y", scale: { nice: false, zero: false } }).createXAxis({ title: false }).createYAxis({ title: false });
const filter = (select, extra = {}) => ({ type: "filter", target: "points", payload: { select }, ...extra });
const selected = program => { const r = resolveStoredSelection(program, "picked"); return r.items.filter(item => r.keys.includes(item.key)).map(item => item.fields.id); };

test("direct filters update native data, domains and guides in one immutable transaction and clear restores only the filter", () => {
  const p = points().selectMarks({ id: "picked", field: "id", op: "eq", value: "c" }), before = serializeProgram(p);
  const session = createInteractionSession({ program: p, bindings: [] }), events = [];
  session.subscribe(event => { if (event.phase) events.push(event); });
  session.dispatch(filter({ field: "x", op: "gte", value: 2 }, { transactionId: "filter", origin: "user" }));
  const q = session.getState().program;
  assert.deepEqual(getMarkItems(q, { target: "points" }).map(item => item.fields.id), ["b", "c"]);
  assert.deepEqual(q.resolvedScales.x.domain, [2, 3]); assert.deepEqual(q.resolvedScales.y.domain, [1, 2]);
  assert.deepEqual(selected(q), ["c"]); assert.notDeepEqual(q.graphicSpec.objects.xAxisLabels, p.graphicSpec.objects.xAxisLabels);
  assert.equal(q.trace.children.at(-1).op, "filterMarks"); assert.equal(session.getState().revision, 1);
  assert.deepEqual(events.map(event => [event.phase, event.transactionId, event.origin]), [["commit", "filter", "user"], ["settled", "filter", "user"]]);
  assert.deepEqual(deserializeProgram(serializeProgram(q)).graphicSpec, q.graphicSpec);
  session.dispatch({ type: "filter", target: "points", payload: { clear: true } });
  const restored = session.getState().program;
  assert.deepEqual(restored.resolvedScales.x.domain, [1, 3]); assert.deepEqual(selected(restored), ["c"]);
  assert.equal(restored.trace.children.at(-1).op, "removeMarkFilter"); assert.equal(serializeProgram(p), before);
  session.destroy();
});

test("filter replace compose empty and hidden policies retain native final-item meaning", () => {
  for (const selectionPolicy of ["keep-hidden", "drop"]) {
    const p = points().selectMarks({ id: "picked", field: "id", op: "eq", value: "a" });
    const session = createInteractionSession({ program: p, selectionPolicy, bindings: [] }), events = [];
    session.subscribe(e => { if (e.phase === "commit") events.push(e); });
    session.dispatch(filter({ field: "x", op: "gte", value: 2 }));
    assert.equal(events[0].selectionChanges[0][selectionPolicy === "drop" ? "droppedKeys" : "hiddenKeys"].length, 1);
    session.dispatch(filter({ field: "x", op: "lt", value: 3 }, { payload: { select: { field: "x", op: "lt", value: 3 }, mode: "compose" } }));
    assert.deepEqual(getMarkItems(session.getState().program, { target: "points" }).map(item => item.fields.id), ["b"]);
    session.dispatch(filter({ items: [] }, { payload: { select: { items: [] }, mode: "replace" } }));
    assert.deepEqual(getMarkItems(session.getState().program, { target: "points" }), []);
    session.dispatch({ type: "filter", target: "points", payload: { clear: true } });
    assert.deepEqual(selected(session.getState().program), selectionPolicy === "drop" ? [] : ["a"]); session.destroy();
  }
});

test("reorder synchronizes axis legend and selection keys while preserving source row order", () => {
  const p = chart().createCanvas({ width: 600, height: 400, margin: { top: 30, right: 120, bottom: 80, left: 80 } }).createData({ id: "rows", keyField: "id", values: rows })
    .createBarPlot({ id: "bars", x: "category", y: "y", color: "category" }).editLegend({ order: { channel: "x" } }).selectMarks({ id: "picked", target: "bars", field: "category", op: "eq", value: "C" });
  const session = createInteractionSession({ program: p, bindings: [] }), before = serializeProgram(p);
  const keys = resolveStoredSelection(p, "picked").keys;
  session.dispatch({ type: "reorder", target: "bars", payload: { channel: "x", values: ["C", "A"] } });
  let q = session.getState().program;
  assert.deepEqual(q.resolvedScales.x.domain, ["C", "A", "B"]);
  assert.deepEqual(q.graphicSpec.objects.colorLegendLabels.items.map(item => item.properties.text), ["C", "A", "B"]);
  assert.deepEqual(resolveStoredSelection(q, "picked").keys, keys);
  assert.deepEqual(q.semanticSpec.datasets.find(data => data.id === "rows").values, rows);
  assert.notDeepEqual(q.graphicSpec.objects.xAxisLabels, p.graphicSpec.objects.xAxisLabels);
  assert.deepEqual(deserializeProgram(serializeProgram(q)).graphicSpec, q.graphicSpec);
  session.dispatch({ type: "reorder", target: "bars", payload: { channel: "x", by: { field: "y", aggregate: "sum" }, direction: "ascending" } });
  assert.deepEqual(session.getState().program.resolvedScales.x.domain, ["C", "B", "A"]);
  session.dispatch({ type: "reorder", target: "bars", payload: { channel: "x", clear: true } });
  q = session.getState().program; assert.deepEqual(q.resolvedScales.x.domain, ["A", "B", "C"]);
  assert.deepEqual(resolveStoredSelection(q, "picked").keys, keys); assert.equal(serializeProgram(p), before); session.destroy();
});

test("direct filters propagate existing linked selection once without callback feedback", () => {
  const child = points().selectMarks({ id: "picked", items: [], empty: "all" });
  const p = hconcat({ programs: [{ id: "left", program: child }, { id: "right", program: child }] });
  const left = { childPath: ["left"], id: "points" }, right = { childPath: ["right"], id: "points" };
  const command = filter({ field: "x", op: "gte", value: 2 }, { target: left, transactionId: "linked-filter", origin: "user" });
  const session = createInteractionSession({ program: p, bindings: [{ type: "linkSelection", id: "rows", target: right, selection: "picked", resolve: "global",
    sources: [{ target: left, selection: "picked", projection: { type: "rows", sourceData: "rows", targetData: "rows" } }] }] }), events = [];
  session.subscribe(event => { if (event.phase) events.push(event); if (event.phase === "commit") session.dispatch(command); });
  session.dispatch(command);
  assert.deepEqual(events.map(event => event.phase), ["commit", "settled"]); assert.equal(session.getState().revision, 1);
  assert.deepEqual(events[0].affectedOwners, [left, right]); assert.deepEqual(selected(session.getState().program.children.right), ["b", "c"]);
  assert.deepEqual(session.getState().program.children.right.resolvedScales.x.domain, [1, 3]); session.destroy();
});

test("scoped direct filters regenerate facet sources and preserve unrelated concat children", () => {
  const child = points(), p = hconcat({ programs: [{ id: "left", program: child }, { id: "right", program: child }] });
  const session = createInteractionSession({ program: p, bindings: [] });
  session.dispatch(filter({ field: "x", op: "gte", value: 2 }, { target: { childPath: ["left"], id: "points" } }));
  assert.equal(session.getState().program.children.right, child); assert.deepEqual(session.getState().program.children.left.resolvedScales.x.domain, [2, 3]);
  session.dispatch({ type: "filter", target: { childPath: ["left"], id: "points" }, payload: { clear: true } });
  const parentKey = getMarkItems(p, { target: { childPath: ["left"], id: "points" } })[1].key;
  session.dispatch(filter({ items: [parentKey] }, { target: { childPath: ["left"], id: "points" } }));
  assert.deepEqual(getMarkItems(session.getState().program.children.left, { target: "points" }).map(item => item.fields.id), ["b"]);
  assert.equal(session.getState().program.children.right, child); session.destroy();
  const facet = child.facet({ field: "category" }), scoped = createInteractionSession({ program: facet, bindings: [] });
  scoped.dispatch(filter({ field: "x", op: "gte", value: 2 }, { target: { childPath: [], id: "points", facetSource: true } }));
  assert.deepEqual(Object.values(scoped.getState().program.children).flatMap(c => getMarkItems(c, { target: "points" }).map(item => item.fields.id)), ["b", "c"]); scoped.destroy();
});

test("invalid controls fail atomically and cannot inject selectors, owners or executable inputs", () => {
  const p = points(), session = createInteractionSession({ program: p, bindings: [] }), saved = serializeProgram(p), events = [];
  session.subscribe(event => { if (event.phase) events.push(event); });
  for (const command of [
    filter({ field: "x", op: "unsupported", value: 1 }), filter({ items: [], target: "other" }), filter({ where: {} }),
    filter({ region: { x: { ranges: [] } } }), filter({ items: [] }, { payload: { select: { items: [] }, mode: "bad" } }),
    filter({ items: [] }, { payload: { select: { items: [] }, recompute: true } }),
    { type: "filter", target: "points", payload: {} }, { type: "filter", target: "points", payload: { clear: false } },
    { type: "filter", target: "points", payload: { clear: true, select: { items: [] } } },
    { type: "filter", target: "points", payload: { clear: true } },
    { type: "reorder", target: "points", payload: { channel: "x", values: [1] } },
    { type: "reorder", target: "points", payload: { clear: true } },
    { type: "reorder", target: "points", payload: { clear: true, channel: "x", values: [] } }
  ]) {
    const state = session.getState(); assert.throws(() => session.dispatch(command), undefined, JSON.stringify(command));
    assert.equal(session.getState().program, p); assert.equal(session.getState().scene, state.scene); assert.equal(session.getState().revision, 0);
  }
  assert.equal(events.length, 13); assert.ok(events.every(e => e.phase === "error"));
  let reads = 0; assert.throws(() => session.dispatch(filter({ get items() { reads++; return []; } }))); assert.equal(reads, 0); assert.equal(events.length, 13);
  assert.equal(serializeProgram(p), saved); session.destroy();
  const unsupported = createInteractionSession({ program: points(basic), bindings: [] });
  assert.throws(() => unsupported.dispatch(filter({ items: [] })), /does not support/);
  assert.throws(() => unsupported.dispatch({ type: "reorder", target: "points", payload: { channel: "x", values: [1] } }), /does not support/); unsupported.destroy();
});


test("filtering an explicit category order projects visible values and clearing restores authored order", () => {
  const p = chart().createCanvas({ width: 600, height: 400, margin: { top: 30, right: 120, bottom: 80, left: 80 } })
    .createData({ id: "rows", keyField: "id", values: rows })
    .createBarPlot({ id: "bars", x: "category", y: "y", color: "category" }).editLegend({ order: { channel: "x" } });
  const session = createInteractionSession({ program: p, bindings: [] }), baseline = serializeProgram(p);
  session.dispatch({ type: "reorder", target: "bars", payload: { channel: "x", values: ["C", "A"] } });
  const ordered = session.getState().program;
  session.dispatch({ type: "filter", target: "bars", payload: { select: { field: "category", op: "neq", value: "A" } } });
  const filtered = session.getState().program;
  assert.deepEqual(filtered.resolvedScales.x.domain, ["C", "B"]);
  assert.deepEqual(filtered.graphicSpec.objects.colorLegendLabels.items.map(item => item.properties.text), ["C", "B"]);
  assert.deepEqual(filtered.semanticSpec.layers[0].encoding.x.categoryOrder.values, ["C", "A"]);
  assert.deepEqual(deserializeProgram(serializeProgram(filtered)).graphicSpec, filtered.graphicSpec);
  assert.throws(() => session.dispatch({ type: "reorder", target: "bars", payload: { channel: "x", values: ["Unknown"] } }), /Unknown category/);
  assert.equal(session.getState().program, filtered);
  session.dispatch({ type: "filter", target: "bars", payload: { clear: true } });
  assert.deepEqual(session.getState().program.resolvedScales.x.domain, ["C", "A", "B"]);
  assert.deepEqual(session.getState().program.graphicSpec, ordered.graphicSpec);
  assert.equal(serializeProgram(p), baseline); session.destroy();
});
