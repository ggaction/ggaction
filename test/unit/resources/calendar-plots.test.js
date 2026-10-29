import test from "node:test";
import assert from "node:assert/strict";
import { chart, prepareDataUpdate, hconcat } from "../../../src/index.js";
import { chart as basicChart } from "../../../src/basic.js";
import { serializeProgram, deserializeProgram } from "../../../src/persistence.js";
import { encodeValue, decodeValue } from "../../../src/persistence/codec.js";
import { getMarkItems, inspectProgram } from "../../../src/inspection.js";
import { exportAccessibleData } from "../../../src/accessibility.js";
import { renderToSVG } from "../../../src/renderers/svg.js";
import { calendarSourcePoints } from "../../../src/grammar/calendar/input.js";

const rows = [{ id: "a", day: "2024-02-28", amount: 0 }, { id: "b", day: "2024-02-29", amount: 7 }, { id: "c", day: "2024-02-29", amount: -2 }];
const intent = { date: "day", value: "amount", start: "2024-02-01", end: "2024-02-29", timeZone: "UTC", weekStartsOn: 1, aggregate: "sum", missing: "empty" };
const base = (values = rows) => chart().createCanvas({ width: 1100, height: 300, margin: { top: 20, left: 20, bottom: 20, right: 140 } })
  .createData({ id: "days", keyField: "id", values }).createCalendarLayout(intent);
const resource = p => p.semanticSpec.resources.find(value => value.kind === "layout");
const cells = p => getMarkItems(p, { target: "calendar" });

test("calendar public layout preserves exact civil aggregation and empty versus zero cells", () => {
  const p = base().createCalendarPlot(), stored = resource(p), items = cells(p);
  assert.equal(stored.inputs[0].id, "days"); assert.equal(stored.options.method, "calendar");
  assert.equal(Object.hasOwn(stored.result, "options"), false);
  assert.equal(stored.result.cells.length, 29); assert.equal(items.length, 29);
  assert.deepEqual(items.filter(item => !item.fields.empty).map(item => [item.fields.date, item.fields.value, item.rows.length]), [["2024-02-28", 0, 1], ["2024-02-29", 5, 2]]);
  assert.equal(items[0].fields.value, null); assert.equal(items[0].rows.length, 0);
  assert.deepEqual(p.resolvedScales["calendar-color"].domain, [0, 5]);
  assert.ok(p.graphicSpec.objects.calendar.items.some(item => item.identity.role === "month-boundary"));
  assert.ok(p.graphicSpec.objects.calendar.items.some(item => item.identity.role === "month-label"));
  assert.equal(basicChart().createCalendarPlot, undefined);
});

test("calendar date identities and row lineage survive reorder, source revision and named selection", () => {
  const original = base().createCalendarPlot().highlightMarks({ id: "chosen", target: "calendar", select: { field: "date", op: "eq", value: "2024-02-29" }, opacity: 0 });
  const before = serializeProgram(original), items = cells(original);
  const revised = original.reviseData({ source: "days", id: "next", values: [...rows].reverse().map(row => ({ ...row, amount: row.amount + 1 })) });
  assert.equal(resource(revised).revision, 1); assert.equal(resource(revised).inputs[0].id, "next");
  assert.deepEqual(cells(revised).map(item => item.key), items.map(item => item.key));
  assert.equal(cells(revised).at(-1).fields.value, 7); assert.equal(cells(revised).at(-1).properties.opacity, 0);
  assert.equal(cells(revised).at(-1).rows.every(row => row.data === "next"), true);
  assert.equal(serializeProgram(original), before);
});

test("calendar editing changes completion and aggregation without duplicating semantic intent", () => {
  const original = base().createCalendarPlot();
  const omitted = original.editLayout({ options: { missing: "omit" } });
  assert.equal(cells(omitted).length, 2); assert.equal(resource(omitted).revision, 1);
  const counted = omitted.editLayout({ options: { aggregate: "count" } });
  assert.deepEqual(resource(counted).options.fields, { date: "day" });
  assert.equal(cells(counted).at(-1).fields.value, 2);
  const averaged = counted.editLayout({ options: { aggregate: "mean", value: "amount" } });
  assert.equal(cells(averaged).at(-1).fields.value, 2.5);
  assert.equal(cells(original).length, 29);
});

test("calendar labels and boundaries derive responsive geometry while selection changes only cells", () => {
  const original = base().createCalendarPlot(), graphics = original.graphicSpec.objects.calendar.items;
  const decorations = graphics.filter(item => item.identity.role !== "body");
  const highlighted = original.highlightMarks({ id: "selection", target: "calendar", select: { field: "value", op: "eq", value: 5 }, fill: "red" });
  assert.deepEqual(highlighted.graphicSpec.objects.calendar.items.filter(item => item.identity.role !== "body"), decorations);
  assert.equal(cells(highlighted).at(-1).properties.fill, "red");
  const resized = original.editCanvas({ width: 700, height: 240 });
  assert.notDeepEqual(resized.graphicSpec.objects.calendar.items.filter(item => item.identity.role === "month-label").map(item => item.properties.x), decorations.filter(item => item.identity.role === "month-label").map(item => item.properties.x));
  assert.deepEqual(cells(resized).map(item => item.key), cells(original).map(item => item.key));
  const disabled = original.editCalendarPlot({ labels: false, monthBoundary: false, color: false, cells: { fill: "green", emptyFill: "none", gap: 0 } });
  assert.equal(disabled.graphicSpec.objects.calendar.items.length, 29); assert.equal(cells(disabled).at(-1).properties.fill, "green");
  assert.equal(disabled.semanticSpec.layers[0].encoding?.color, undefined);
  assert.equal(original.editCalendarPlot({ labels: { month: false, weekday: false, week: false, year: false } }).markConfigs.calendar.calendarPlot.labels.constructor, Object);
});

test("calendar legends use only observed aggregates and color edits preserve guide closure", () => {
  const original = base().createCalendarPlot().createLegend({ target: "calendar" });
  const edited = original.editCalendarPlot({ color: { id: "calendar-color", domain: [-5, 10], range: ["red", "blue"] } });
  assert.deepEqual(edited.resolvedScales["calendar-color"].domain, [-5, 10]);
  assert.ok(Object.keys(edited.guideConfigs.legend).length > 0);
  assert.equal(Object.keys(edited.editCalendarPlot({ color: false }).guideConfigs.legend ?? {}).length, 0);
});

test("calendar failures preserve the entire old program and trace before structural changes", () => {
  const p = base().createCalendarPlot(), snapshot = serializeProgram(p), trace = p.trace;
  for (const run of [
    () => p.createCalendarLayout(intent), () => p.createCalendarPlot(), () => p.editLayout({ order: "input" }),
    () => p.editLayout({ options: {} }), () => p.editLayout({ options: { end: "2024-02-28" } }),
    () => p.editCalendarPlot({}), () => p.editCalendarPlot({ cells: { gap: 1 } }), () => p.editCalendarPlot({ labels: { month: null } }),
    () => p.reviseData({ source: "days", id: "bad", values: [{ id: "a", day: "2024-03-01", amount: 7 }] }),
    () => p.removeResource({ kind: "layout", id: "calendarLayout" }), () => p.removeData({ id: "days" })
  ]) { assert.throws(run); assert.equal(serializeProgram(p), snapshot); assert.equal(p.trace, trace); }
  assert.throws(() => p.removeResource({ kind: "layout", id: "calendarLayout", cascade: true }), /live mark/);
  const removed = p.removeMark({ target: "calendar" }).removeResource({ kind: "layout", id: "calendarLayout" });
  assert.equal(removed.semanticSpec.layers.length, 0); assert.equal(resource(removed), undefined);
});

test("calendar restored cells, month topology, options and source lineage are strictly verified", () => {
  const p = base().createCalendarPlot(), envelope = JSON.parse(serializeProgram(p)), original = decodeValue(envelope.payload);
  assert.deepEqual(deserializeProgram(serializeProgram(p)).graphicSpec, p.graphicSpec);
  for (const mutate of [
    state => { resource(state).result.cells[0].week++; }, state => { resource(state).result.cells.at(-1).value++; },
    state => { resource(state).result.cells.at(-1).sourceIndices.reverse(); }, state => { resource(state).result.months[0].polygons[0].outer.reverse(); },
    state => { resource(state).result.months[0].cells.pop(); }, state => { resource(state).provenance.sourceRows.pop(); },
    state => { resource(state).options.options.weekStartsOn = 7; }, state => { resource(state).options.fields.date = "missing"; },
    state => { state.semanticSpec.layers[0].calendarBinding.layout.revision++; }, state => { state.semanticSpec.layers[0].calendarLabels.month = false; },
    state => { state.materializationConfigs.marks.calendar.calendarPlot.cells.gap = 2; }
  ]) { const state = structuredClone(original); mutate(state); assert.throws(() => deserializeProgram(JSON.stringify({ ...envelope, payload: encodeValue(state) }))); }
});

test("calendar descriptor checks reject unknown fields and source getters before reads", () => {
  let reads = 0;
  const row = {}; Object.defineProperty(row, "day", { enumerable: true, get() { reads++; return "2024-01-01"; } });
  assert.throws(() => calendarSourcePoints([row], { date: "day" })); assert.equal(reads, 0);
  const p = chart().createData({ values: rows });
  for (const patch of [{ date: "missing" }, { value: undefined }, { unknown: true }, { aggregate: "count" }]) assert.throws(() => p.createCalendarLayout({ ...intent, ...patch }));
});

test("empty calendars preserve explicit completion and require an explicit color domain or fixed fill", () => {
  const empty = base([]), before = serializeProgram(empty);
  assert.throws(() => empty.createCalendarPlot(), /explicit domain for empty/);
  assert.equal(serializeProgram(empty), before);
  const filled = empty.createCalendarPlot({ color: false });
  assert.equal(cells(filled).length, 29); assert.ok(cells(filled).every(item => item.fields.empty && item.rows.length === 0));
  const omitted = empty.editLayout({ options: { missing: "omit" } }).createCalendarPlot({ color: { domain: [0, 1] } });
  assert.equal(cells(omitted).length, 0);
  assert.ok(omitted.graphicSpec.objects.calendar.items.some(item => item.identity.role === "year-label"));
  assert.equal(omitted.graphicSpec.objects.calendar.items.some(item => item.identity.role === "month-label"), false);
});

test("calendar inspection, accessible rows, SVG and composition retain the day grain", () => {
  const p = base().createCalendarPlot();
  const report = inspectProgram(p).views.find(view => view.owner.id === "calendar");
  assert.equal(report.rawRows, 3); assert.equal(report.logicalDataItems, 29); assert.ok(report.drawablePrimitives > 29);
  assert.deepEqual(exportAccessibleData(p, { target: "calendar" }).views[0].rows.map(row => row.values), cells(p).map(item => Object.fromEntries(Object.entries(item.fields).map(([key, value]) => [`calendar:${key}`, value]))));
  assert.match(renderToSVG(p), /<rect/); assert.match(renderToSVG(p), /Feb/);
  const composition = hconcat({ programs: [{ id: "left", program: p }, { id: "right", program: p }] });
  const next = composition.editCalendarPlot({ target: { childPath: ["left"], id: "calendar" }, cells: { opacity: 0 } });
  assert.equal(next.children.right, p); assert.ok(cells(next.children.left).every(item => item.properties.opacity === 0));
});

test("prepared source and computed parameter changes update calendar cells and reject stale receipts", async () => {
  let p = chart().createCanvas().createParameter({ id: "gain", value: 1 });
  const response = values => ({ text: JSON.stringify(values), mimeType: "application/json", encoding: "utf-8" });
  const prepared = await prepareDataUpdate(p, { kind: "create", id: "raw", keyField: "id", source: { kind: "url", url: "https://example.test/days.json", format: "json" } },
    { requestToken: "create", load: async () => response(rows) });
  p = p.applyDataUpdate({ prepared, requestToken: "create" }).createComputedData({ id: "weighted", source: "raw", as: "weight",
    expression: { version: 2, registry: "standard@1", root: { type: "binary", op: "multiply", left: { type: "field", name: "amount" }, right: { type: "parameter", id: "gain" } } } })
    .createCalendarLayout({ ...intent, data: "weighted", value: "weight" }).createCalendarPlot();
  const original = serializeProgram(p);
  const refresh = await prepareDataUpdate(p, { kind: "revise", target: "raw", id: "raw2" },
    { requestToken: "refresh", load: async () => response(rows.map(row => ({ ...row, amount: row.amount + 1 }))) });
  const changed = p.applyDataUpdate({ prepared: refresh, requestToken: "refresh" }).editParameter({ target: "gain", value: 2 });
  assert.equal(resource(changed).revision, 2); assert.equal(cells(changed).at(-1).fields.value, 14);
  assert.throws(() => changed.applyDataUpdate({ prepared: refresh, requestToken: "refresh" }), /stale|different/);
  assert.throws(() => p.applyDataUpdate({ prepared: refresh, requestToken: "other" }), /token/);
  assert.equal(serializeProgram(p), original);
  const restored = deserializeProgram(serializeProgram(changed));
  assert.equal(cells(restored).at(-1).fields.value, 14);
});

test("multiple calendar layouts sharing a color scale materialize from the final source candidate", () => {
  const p = base().createCalendarPlot({ id: "one", color: { id: "shared" } })
    .createCalendarLayout({ ...intent, id: "mean", aggregate: "mean" }).createCalendarPlot({ id: "two", color: { id: "shared" } });
  const next = p.reviseData({ source: "days", id: "changed", values: rows.map(row => ({ ...row, amount: row.amount + 3 })) });
  assert.equal(getMarkItems(next, { target: "one" }).at(-1).fields.value, 11);
  assert.equal(getMarkItems(next, { target: "two" }).at(-1).fields.value, 5.5);
  assert.equal(next.resolvedScales.shared.domain.at(-1), 11);
  assert.deepEqual(next.semanticSpec.layers.map(layer => layer.calendarBinding.layout.revision), [1, 1]);
  const trace = next.trace.children.at(-1);
  const visit = node => [node, ...(node.children ?? []).flatMap(visit)];
  const materializers = visit(trace).filter(node => node.op === "materializeCalendarPlot");
  assert.equal(materializers.length, 2);
});

test("calendar styles restore disabled labels, preserve paint and effects, and reject malformed values", () => {
  const p = base().createCalendarPlot({ color: false, labels: false, monthBoundary: false, clip: false });
  const outline = { color: "white", width: 2 }, shadow = { color: "#1238", offsetX: 2 };
  const pattern = { type: "pattern", style: "dots", foreground: "#123456", background: "white", pitch: 6, strokeWidth: 2 };
  const q = p.editCalendarPlot({ cells: { fill: pattern, emptyFill: "none", outline, shadow, opacity: 0.5, gap: 0.25 },
    monthBoundary: { stroke: "red", strokeWidth: 2, opacity: 0 }, labels: { month: { fill: "green", fontSize: 12, fontFamily: "serif", fontWeight: 600, outline, shadow } } });
  const body = q.graphicSpec.objects.calendar.items.filter(item => item.identity.role === "body"), month = q.graphicSpec.objects.calendar.items.find(item => item.identity.role === "month-label");
  assert.equal(body.at(-1).properties.fill.type, "pattern"); assert.deepEqual(body.at(-1).properties.outline, outline);
  assert.equal(month.properties.fontFamily, "serif"); assert.equal(month.properties.shadow.offsetX, 2);
  assert.equal(q.graphicSpec.objects.calendar.items.some(item => item.identity.role === "weekday-label"), false);
  assert.deepEqual(deserializeProgram(serializeProgram(q)).graphicSpec, q.graphicSpec);
  const reset = q.editCalendarPlot({ cells: { outline: false, shadow: false }, labels: { month: { outline: false, shadow: false } }, clip: true });
  assert.equal(reset.graphicSpec.objects.calendar.items.at(-1).properties.outline, undefined);
  assert.equal(reset.graphicSpec.objects.calendar.clip.width > 0, true);
  const saved = serializeProgram(p);
  for (const patch of [{ clip: 1 }, { cells: { opacity: -1 } }, { cells: { opacity: undefined } }, { cells: { strokeWidth: -1 } },
    { cells: { fill: {} } }, { labels: { month: { fontFamily: "" } } }, { labels: { year: { fontSize: 0 } } },
    { labels: { year: { fontWeight: false } } }, { labels: { other: {} } }, { monthBoundary: { fill: "red" } },
    { cells: { outline, stroke: "red" } }]) assert.throws(() => p.editCalendarPlot(patch), JSON.stringify(patch));
  assert.equal(serializeProgram(p), saved);
});

test("calendar source inspection survives missing concrete output while exact item inspection rejects it", async () => {
  const { calendarSelectionPolicy } = await import("../../../src/materialization/selection/policies/calendar.js");
  const { calendarScaleValues } = await import("../../../src/materialization/calendar/scaleValues.js");
  const { resolveCalendarPlot } = await import("../../../src/materialization/calendar/plot.js");
  const p = base().createCalendarPlot(), layer = p.semanticSpec.layers[0], config = p.markConfigs.calendar.calendarPlot;
  const source = calendarSelectionPolicy.resolveSourceItems(p, layer);
  assert.deepEqual(source.map(item => item.key), cells(p).map(item => item.key));
  assert.equal(source[0].graphicIds, undefined); assert.equal(source.at(-1).rows.length, 2);
  const missingGraphic = structuredClone(p.graphicSpec); delete missingGraphic.objects.calendar;
  const missing = { ...p, markConfigs: p.markConfigs, graphicSpec: missingGraphic };
  assert.equal(calendarSelectionPolicy.resolveSourceItems(missing, layer).length, 29);
  assert.throws(() => calendarSelectionPolicy.resolveItems(missing, layer), /materialized cells/);
  const staleGraphic = structuredClone(p.graphicSpec); delete staleGraphic.objects.calendar.items[0].identity;
  assert.throws(() => calendarSelectionPolicy.resolveItems({ ...p, markConfigs: p.markConfigs, graphicSpec: staleGraphic }, layer), /stale cell identity/);
  assert.throws(() => calendarScaleValues(p, { layer, channel: "x" }), /intrinsic color/);
  assert.deepEqual(calendarScaleValues(p, { layer, channel: "color" }), [0, 5]);
  assert.throws(() => resolveCalendarPlot(p, layer, config, {}), /resolved scale/);
  const foreign = { ...p, semanticSpec: { ...p.semanticSpec, resources: [{ ...resource(p), options: { ...resource(p).options, method: "tree" } }] } };
  assert.throws(() => resolveCalendarPlot(foreign, layer, config), /calendar layout/);
  assert.throws(() => p.materializeCalendarPlot({ id: "calendar", scales: "true" }), /boolean/);
  assert.throws(() => base().createPointMark({ id: "point" }).materializeCalendarPlot({ id: "point" }), /calendar mark/);
});

test("calendar restore rejects incomplete style, foreign channel meaning, and malformed bounded geometry", () => {
  const p = base().createCalendarPlot(), envelope = JSON.parse(serializeProgram(p)), state = decodeValue(envelope.payload);
  const mutations = [
    s => { delete resource(s).options.fields.date; }, s => { resource(s).options.options = null; },
    s => { resource(s).result.algorithm = "other"; }, s => { resource(s).result.years = {}; },
    s => { resource(s).result.cells[0].sourceIndices = {}; }, s => { resource(s).result.months[0].polygons[0].outer[0] = [0, 1, 2]; },
    s => { resource(s).result.months[0].polygons[0].outer[0] = [Infinity, 0]; },
    s => { resource(s).result.cells = Array.from({ length: 10001 }, () => resource(s).result.cells[0]); },
    s => { resource(s).result.months[0].polygons[0].holes = {}; },
    s => { s.semanticSpec.layers[0].calendarBinding.extra = true; }, s => { s.semanticSpec.layers[0].calendarBinding.layout.kind = "geometry"; },
    s => { s.semanticSpec.layers[0].encoding.x = {}; }, s => { s.semanticSpec.layers[0].encoding.color.field = "amount"; },
    s => { s.semanticSpec.layers[0].calendarLabels.week = "true"; }, s => { s.semanticSpec.layers[0].conditionals = {}; },
    s => { s.semanticSpec.layers[0].data = "days"; }, s => { s.materializationConfigs.marks.calendar.calendarPlot.clip = 1; },
    s => { delete s.materializationConfigs.marks.calendar.calendarPlot.cells.emptyFill; },
    s => { delete s.materializationConfigs.marks.calendar.calendarPlot.labels.month.fontSize; },
    s => { s.materializationConfigs.marks.calendar.calendarPlot.monthBoundary.opacity = 2; },
    s => { s.materializationConfigs.marks.calendar.calendarPlot.labels.month.extra = true; }
  ];
  for (const mutate of mutations) { const candidate = structuredClone(state); mutate(candidate); assert.throws(() => deserializeProgram(JSON.stringify({ ...envelope, payload: encodeValue(candidate) }))); }
});

test("calendar layouts keep unreferenced resources inert and reject implicit facet partitioning", () => {
  const p = base().createCalendarPlot({ color: false }).createData({ id: "unrelated", values: [{ x: 1 }] });
  const revised = p.reviseData({ source: "unrelated", id: "unrelated2", values: [{ x: 2 }] });
  assert.equal(resource(revised), resource(p)); assert.deepEqual(revised.graphicSpec, p.graphicSpec);
  const saved = serializeProgram(p);
  assert.throws(() => p.facet({ field: "day" }), /data|source|eligible|support|field role/i);
  assert.throws(() => p.repeatCharts({ target: "calendar", channel: "x", fields: ["day", "amount"] }), /data|source|eligible|support|field role/i);
  assert.equal(serializeProgram(p), saved);
});


test("calendar revision closure preserves independent layouts and named scalar resources", () => {
  const p = base().createCalendarPlot({ color: false }).createParameter({ id: "limit", value: 1 })
    .createData({ id: "separate", values: rows }).createCalendarLayout({ ...intent, id: "separateLayout", data: "separate" })
    .createCalendarPlot({ id: "separatePlot", layout: "separateLayout", color: false });
  const next = p.reviseData({ source: "days", id: "newDays", values: rows.map(row => ({ ...row, amount: 2 })) });
  assert.equal(getMarkItems(next, { target: "calendar" }).at(-1).fields.value, 4);
  assert.equal(next.semanticSpec.resources.find(r => r.id === "separateLayout"), p.semanticSpec.resources.find(r => r.id === "separateLayout"));
  assert.equal(next.graphicSpec.objects.separatePlot, p.graphicSpec.objects.separatePlot);
  assert.equal(next.semanticSpec.resources.find(r => r.id === "limit"), p.semanticSpec.resources.find(r => r.id === "limit"));
});
