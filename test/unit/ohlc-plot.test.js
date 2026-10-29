import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { chart, hconcat, prepareFontResource, prepareTextMetrics } from "../../src/index.js";
import { chart as basic } from "../../src/basic.js";
import { ChartProgram } from "../../src/ChartProgram.js";
import { getMarkItems, inspectProgram } from "../../src/inspection.js";
import { serializeProgram, deserializeProgram, serializeGraphic, deserializeGraphic } from "../../src/persistence.js";
import { createInteractionSession } from "../../src/interaction.js";
import { exportAccessibleData } from "../../src/accessibility.js";
const rows = [{ id: 1, x: "A", l: 1, h: 9, o: 3, c: 7, group: "first" }, { id: "1", x: "B", l: 2, h: 8, o: 6, c: 4, group: "second" }, { id: "flat", x: "C", l: 4, h: 6, o: 5, c: 5, group: "first" }];
const base = () => chart().createCanvas({ width: 340, height: 240, margin: 20 }).createData({ id: "d", values: rows, keyField: "id" });
const options = { id: "prices", x: "x", low: "l", high: "h", open: "o", close: "c", width: { pixels: 20 }, yScale: { domain: [0, 10] }, guides: false };
const build = patch => base().createOHLCPlot({ ...options, ...patch });
const items = p => getMarkItems(p, { target: "prices" });
const graphics = p => p.graphicSpec.objects.prices.items;
test("OHLC public facade preserves literal price roles, typed keys, Full-only surface and one logical item", () => {
  const p = build(); assert.equal(items(p).length, 3); assert.equal(graphics(p).length, 6);
  assert.equal(new Set(items(p).map(item => item.key)).size, 3);
  assert.deepEqual(graphics(p).slice(0, 2).map(item => item.properties), [
    { x1: 70, x2: 70, y1: 200, y2: 40, stroke: "#334155", strokeWidth: 1, opacity: 1 },
    { x: 60, y: 80, width: 20, height: 80, fill: "#16a34a", stroke: "#334155", strokeWidth: 1, opacity: 1 }
  ]);
  assert.equal(inspectProgram(p).views[0].logicalDataItems, 3); assert.equal(basic().createOHLCPlot, undefined);
  assert.deepEqual(exportAccessibleData(p, { target: "prices" }).views[0].rows.map(row => row.values["prices:close"]), [7, 4, 5]);
});
test("OHLC source reorder, scale and Canvas revise rematerialize every price part and preserve codec", () => {
  const p = build(), before = serializeProgram(p), keys = items(p).map(item => item.key);
  const q = p.reviseData({ source: "d", id: "d2", values: [...rows].reverse() }).editCanvas({ width: 640 }).editScale({ id: "prices-y", domain: [0, 20] });
  assert.deepEqual(items(q).map(item => item.key), [...keys].reverse());
  assert.equal(graphics(q)[0].properties.y1, 180); assert.equal(graphics(q)[0].identity.lineage.revision, 1);
  assert.equal(serializeProgram(p), before);
  assert.deepEqual(deserializeProgram(serializeProgram(q)).graphicSpec, q.graphicSpec);
  assert.deepEqual(deserializeGraphic(serializeGraphic(q)).graphicSpec, q.graphicSpec);
});
test("OHLC edit labels, doji, fields and body effects retain source geometry", () => {
  const p = build(); const q = p.editOHLCPlot({ labels: { content: "close" }, doji: "none", body: { outline: { color: "#000", width: 1 }, shadow: { color: "#00000080", blurRadius: 1, offsetX: 2, offsetY: 2 } } });
  assert.equal(graphics(q).length, 8); assert.deepEqual(graphics(q).filter(item => item.type === "text").map(item => item.properties.text), ["7", "4", "5"]);
  assert.ok(graphics(q).find(item => item.type === "rect").properties.shadow);
  const clean = q.editOHLCPlot({ labels: false, body: { outline: false, shadow: false }, clip: false });
  assert.equal(clean.graphicSpec.objects.prices.clip, undefined); assert.equal(graphics(clean)[1].properties.shadow, undefined);
  assert.equal(graphics(p).length, 6);
});
test("OHLC invalid:omit-row applies to scale domains, final items and labels together", () => {
  const p = chart().createCanvas().createData({ id: "d", keyField: "id", values: [...rows, { id: "bad", x: "BAD", l: 20, h: 10, o: 15, c: 12 }] }).createOHLCPlot({ ...options, yScale: {}, invalid: "omit-row", labels: {} });
  assert.equal(items(p).length, 3); assert.deepEqual(p.resolvedScales["prices-x"].domain, ["A", "B", "C"]);
  assert.deepEqual(p.resolvedScales["prices-y"].domain, [1, 9]);
  assert.equal(graphics(p).filter(item => item.type === "text").length, 3);
  assert.throws(() => p.editOHLCPlot({ invalid: "error" }), /finite low/);
});
test("OHLC highlights and hits one compound row without duplicating stem/body selections", () => {
  const p = build(), key = items(p)[0].key;
  const q = p.selectMarks({ id: "s", target: "prices", field: "id", op: "eq", value: 1 }).highlightMarks({ selection: "s", fill: "#0000ff", stroke: "#ff0000", offset: { x: 2, y: 3 } });
  const children = graphics(q).filter(item => item.identity.key === key);
  assert.equal(children[0].properties.x1, 72); assert.equal(children[0].properties.y1, 203);
  assert.equal(children[1].properties.fill, "#0000ff"); assert.equal(children[1].properties.x, 62);
  assert.equal(items(q.editCanvas({ width: 640 })).length, 3);
  assert.equal(items(p.filterMarks({ target: "prices", field: "c", op: "gt", value: 4 })).length, 2);
  const session = createInteractionSession({ program: p }); session.dispatch({ type: "inspect", point: { x: 70, y: 100 } });
  assert.equal(session.getState().hit.target.itemKey, key); session.destroy();
});
test("OHLC standard axes, color legends and explicit scale editing use shared consumers", () => {
  let p = base().editCanvas({ width: 500, height: 320, margin: { top: 30, bottom: 60, left: 60, right: 150 } }).createOHLCPlot({ ...options, guides: {}, color: "group" });
  assert.equal(p.semanticSpec.guides.axis.y.scale, "prices-y"); assert.equal(p.semanticSpec.guides.legend.color.scale, "prices-color");
  p = p.editOHLCPlot({ color: { field: "c", fieldType: "quantitative" } });
  assert.notEqual(graphics(p)[1].properties.fill, graphics(p)[3].properties.fill);
  p = p.editOHLCPlot({ color: false }); assert.equal(p.semanticSpec.layers[0].encoding.color, undefined);
  assert.equal(graphics(p)[1].properties.fill, "#16a34a");
});
test("OHLC facet and nested scoped edit retain one price owner per child", () => {
  const p = build().facet({ field: "group" });
  assert.deepEqual(Object.values(p.children).map(child => items(child).length), [2, 1]);
  const nested = hconcat({ programs: [{ id: "left", program: build() }, { id: "right", program: build() }] });
  const q = nested.editOHLCPlot({ target: { childPath: ["right"], id: "prices" }, doji: "none" });
  assert.equal(graphics(q.children.left).length, 6); assert.equal(graphics(q.children.right).length, 5);
});
test("OHLC complete invalid candidates fail before the first state-changing child", () => {
  const calls = [];
  class Capturing extends ChartProgram { editSemantic(args) { calls.push(args); return super.editSemantic(args); } createGraphics(args) { calls.push(args); return super.createGraphics(args); } createScale(args) { calls.push(args); return super.createScale(args); } }
  const p = new Capturing({ ...base() });
  for (const patch of [{ low: null }, { high: "missing" }, { open: "missing" }, { width: { pixels: -1 } }, { doji: "rect" }, { labels: { content: "missing" } }, { x: { field: "x", scale: { domain: ["Z"] } } }, { guides: { axes: { y: { scale: "wrong" } } } }]) {
    calls.length = 0; assert.throws(() => p.createOHLCPlot({ ...options, ...patch })); assert.deepEqual(calls, []);
  }
  assert.throws(() => build().editOHLCPlot({}), /nonempty/);
});

test("OHLC temporal interval and quantitative pixel widths reuse exact shared mappings", () => {
  const temporal = chart().createCanvas({ width: 340, height: 240, margin: 20 }).createData({ id: "d", values: rows.map((row, i) => ({ ...row, date: `2024-01-0${i + 1}`, n: i })) });
  const p = temporal.createOHLCPlot({ ...options, x: { field: "date", fieldType: "temporal", scale: { domain: [Date.UTC(2024, 0, 1), Date.UTC(2024, 0, 4)] } }, width: { interval: { unit: "day", insetStart: 2, insetEnd: 3 } } });
  assert.equal(graphics(p)[1].properties.width, 95); assert.equal(graphics(p)[1].properties.x, 22); assert.equal(graphics(p)[0].properties.x1, 69.5);
  const numeric = temporal.createOHLCPlot({ ...options, x: { field: "n", fieldType: "quantitative", scale: { domain: [0, 3] } }, width: { pixels: 10 } });
  assert.equal(graphics(numeric)[1].properties.x, 15);
  assert.throws(() => numeric.editOHLCPlot({ width: { band: .5 } }), /categorical/);
  assert.throws(() => numeric.editOHLCPlot({ width: { interval: { unit: "day" } } }), /temporal/);
  const defaultWidth = temporal.createOHLCPlot({ ...options, id: "default", x: "n", width: { pixels: 5 } });
  assert.equal(defaultWidth.graphicSpec.objects.default.items[1].properties.width, 5);
});
test("OHLC native categorical width, theme, explicit styles and label highlighting remain distinct", () => {
  const { width, ...auto } = options;
  const p = base().createOHLCPlot({ ...auto, labels: {} });
  assert.equal(graphics(p)[1].properties.width, 72);
  const themed = p.applyTheme({ theme: "dark" });
  assert.equal(graphics(themed)[1].properties.fill, "#16a34a");
  assert.notEqual(graphics(themed)[2].properties.fill, graphics(p)[2].properties.fill);
  assert.deepEqual(themed.removeTheme().graphicSpec, p.graphicSpec);
  const q = p.selectMarks({ id: "s", target: "prices", field: "id", op: "eq", value: 1 }).highlightMarks({ selection: "s", fill: "#ff0000", stroke: "#00f", strokeWidth: 2 });
  const label = graphics(q).find(item => item.identity.key === items(p)[0].key && item.identity.role === "label");
  assert.equal(label.properties.fill, "#ff0000"); assert.equal(label.properties.stroke, undefined);
  assert.equal(p.editOHLCPlot({ labels: false }).editOHLCPlot({ labels: {} }).markConfigs.prices.ohlcPlot.labels.fontSize, 12);
});
test("OHLC empty and malformed materializations retain fail-closed identities", async () => {
  const { ohlcSelectionPolicy } = await import("../../src/materialization/selection/policies/ohlc.js");
  const p = build(), layer = p.semanticSpec.layers[0];
  const absent = { ...p, markConfigs: p.markConfigs, resolvedScales: p.resolvedScales, graphicSpec: { ...p.graphicSpec, objects: { canvas: p.graphicSpec.objects.canvas } } };
  assert.equal(ohlcSelectionPolicy.resolveSourceItems(absent, layer).length, 3);
  assert.throws(() => ohlcSelectionPolicy.resolveItems(absent, layer), /materialized/);
  assert.throws(() => ohlcSelectionPolicy.resolveItems({ ...absent, graphicSpec: { objects: { canvas: p.graphicSpec.objects.canvas, prices: { items: [] } } } }, layer), /stale/);
  assert.throws(() => p.materializeOHLCPlot({ id: "prices", scales: 1 }), /boolean/);
  assert.throws(() => p.createPointMark({ id: "other" }).materializeOHLCPlot({ id: "other" }), /OHLC mark/);
  const empty = chart().createCanvas().createData({ id: "empty", values: [] }).createOHLCPlot({ ...options, x: { field: "x", fieldType: "nominal", scale: { domain: ["A"] } } });
  assert.deepEqual(graphics(empty), []);
  for (const patch of [{ x: { field: "x", scale: 1 } }, { yScale: 1 }, { color: { field: "group", scale: 1 } }, { labels: { content: undefined } }, { color: { field: "group", fieldType: "bad" } }]) assert.throws(() => build().editOHLCPlot(patch));
});


test("OHLC exact font metrics and shared guide rebindings reject before state-changing children", async () => {
  const bytes = new Uint8Array(readFileSync(new URL("../fixtures/fonts/metric-fixture.ttf", import.meta.url)));
  const family = "ggaction Metric Fixture", requestToken = "ohlc-font";
  const decode = value => Object.fromEntries(["contentHash", "family", "style", "weight", "metricsProviderVersion"].map(key => [key, value[key]]));
  const measure = ({ asset, queries }) => ({ contentHash: asset.contentHash, metricsProviderVersion: asset.metricsProviderVersion, widths: queries.map(query => query.text.length * query.fontSize * .6) });
  let p = build({ labels: { fontFamily: family, fontSize: 12, fontWeight: 400 } });
  p = p.createFontResource({ prepared: await prepareFontResource(p, { kind: "create", id: "font", uri: "fixture:font", mimeType: "font/ttf", expectedHash: createHash("sha256").update(bytes).digest("hex"), family, style: "normal", weight: 400, metricsProviderVersion: "fixture@1" }, { requestToken, load: () => ({ bytes, mimeType: "font/ttf" }), decode }), requestToken });
  p = p.applyTextMetrics({ prepared: await prepareTextMetrics(p, { id: "exact", fonts: ["font"] }, { requestToken, decode, measure }), requestToken });
  assert.ok(graphics(p).filter(item => item.type === "text").every(item => item.properties.font));
  const before = serializeProgram(p), calls = [];
  class Capturing extends ChartProgram { editSemantic(args) { calls.push(args); return super.editSemantic(args); } createGraphics(args) { calls.push(args); return super.createGraphics(args); } createScale(args) { calls.push(args); return super.createScale(args); } }
  assert.throws(() => new Capturing({ ...p }).editOHLCPlot({ labels: { fontSize: 13 } }), error => error.assetCode === "metrics-required");
  assert.deepEqual(calls, []); assert.equal(serializeProgram(p), before);
  assert.equal(graphics(p.editOHLCPlot({ labels: false })).length, 6);
  assert.deepEqual(deserializeProgram(before).graphicSpec, p.graphicSpec);
  const guided = base().editCanvas({ width: 500, height: 400, margin: 80 }).createOHLCPlot({ ...options, guides: {} })
    .createOHLCPlot({ ...options, id: "shared", yScale: { id: "prices-y" }, guides: false });
  calls.length = 0;
  assert.throws(() => new Capturing({ ...guided }).editOHLCPlot({ target: "prices", yScale: { id: "other-y" } }), /requires one Y scale/);
  assert.deepEqual(calls, []);
});
test("OHLC whole-row omission controls inference and rebinding/removal preserves owned consumers", () => {
  const p = chart().createCanvas().createData({ id: "d", values: [{ x: 1, l: 1, h: 5, o: 2, c: 4 }, { x: "excluded", l: 5, h: 1, o: 3, c: 4 }] })
    .createOHLCPlot({ ...options, invalid: "omit-row", width: { pixels: 5 } });
  assert.equal(p.semanticSpec.layers[0].encoding.x.fieldType, "quantitative");
  const q = build().createData({ id: "other", values: rows.map(row => ({ ...row, c: row.o })), keyField: "id" }).bindMarkData({ target: "prices", data: "other" });
  assert.equal(graphics(q).filter(item => item.type === "rect").length, 0);
  assert.equal(items(q).length, 3);
  const removed = q.removeMark({ target: "prices" });
  assert.equal(removed.graphicSpec.objects.prices, undefined); assert.equal(removed.markConfigs.prices, undefined);
  assert.equal(removed.removeData({ id: "other" }).semanticSpec.datasets.length, 1);
});

test("OHLC line roles use explicit path contours for outlines and preserve role highlights", () => {
  const p = build({ body: { outline: { color: "#fff", width: 3 } }, stem: { outline: { color: "#000", width: 2 } } });
  assert.deepEqual(graphics(p)[0].properties.commands, [{ op: "M", x: 70, y: 200 }, { op: "L", x: 70, y: 40 }]);
  assert.equal(graphics(p).at(-1).type, "path");
  const q = p.selectMarks({ id: "s", target: "prices", field: "id", op: "eq", value: 1 }).highlightMarks({ selection: "s", fill: "#00f", offset: { x: 2, y: 3 } });
  const stem = graphics(q).find(child => child.identity.key === items(p)[0].key && child.identity.role === "stem");
  assert.equal(stem.properties.fill, undefined);
  assert.deepEqual(stem.properties.commands[0], { op: "M", x: 72, y: 203 });
  assert.equal(graphics(p.editOHLCPlot({ body: { outline: false }, stem: { outline: false } }))[0].type, "line");
});

test("OHLC structured paints, color scale edits and coordinate fitting reuse shared consumers", () => {
  const pattern = { type: "pattern", style: "diagonal", pitch: 8, strokeWidth: 2, foreground: "#ff0000", background: "#ffffff", coordinateSpace: "plot" };
  const radial = { type: "radial-gradient", center: { x: .5, y: .5 }, focal: { x: .5, y: .5 }, radius: .5, stops: [{ offset: 0, color: "#ffffff" }, { offset: 1, color: "#000000" }] };
  const p = build({ body: { upFill: pattern, downFill: radial }, labels: { fill: radial } });
  assert.equal(graphics(p)[1].properties.fill.type, "pattern");
  assert.equal(graphics(p)[4].properties.fill.type, "radial-gradient");
  const fitted = p.editCoordinate({ target: p.semanticSpec.layers[0].coordinate, aspect: { mode: "frame", ratio: 1 } });
  assert.equal(fitted.graphicSpec.objects.prices.clip.width, fitted.graphicSpec.objects.prices.clip.height);
  const q = fitted.editOHLCPlot({ color: "group" }).editColorScale({ target: "prices", range: ["#000000", "#ffffff"] });
  assert.equal(graphics(q)[1].properties.fill, "#000000");
  assert.deepEqual(deserializeProgram(serializeProgram(q)).graphicSpec, q.graphicSpec);
});

test("OHLC shares the frame price identity and rejects independent scales before any child writes", () => {
  const writes = [];
  class Capturing extends ChartProgram {
    editSemantic(args) { writes.push(args); return super.editSemantic(args); }
    createGraphics(args) { writes.push(args); return super.createGraphics(args); }
    editGraphics(args) { writes.push(args); return super.editGraphics(args); }
    createScale(args) { writes.push(args); return super.createScale(args); }
  }
  const values = [{ index: 1, low: 4, high: 9, open: 5, close: 7 }, { index: 2, low: 5, high: 10, open: 8, close: 6 }];
  const source = new Capturing().createCanvas({ width: 400, height: 300, margin: 50 })
    .createData({ id: "d", values }).createPointMark({ id: "points" })
    .encodeX({ field: "index", scale: { id: "sharedX" } })
    .encodeY({ field: "low", scale: { id: "price" } });
  const snapshot = program => JSON.stringify({ semantic: program.semanticSpec, graphic: program.graphicSpec });
  const before = snapshot(source);
  const options = { id: "prices", data: "d", x: { field: "index", scale: { id: "sharedX" } }, low: "low", high: "high", open: "open", close: "close", guides: false };
  writes.length = 0;
  assert.throws(() => source.createOHLCPlot(options), /requires one Y scale/);
  assert.equal(writes.length, 0);
  assert.equal(snapshot(source), before);
  const shared = source.createOHLCPlot({ ...options, yScale: { id: "price" } });
  assert.equal(shared.semanticSpec.layers.find(layer => layer.id === "prices").encoding.y2.scale, "price");
  writes.length = 0;
  assert.throws(() => shared.editOHLCPlot({ target: "prices", yScale: { id: "independent" } }), /requires one Y scale/);
  assert.equal(writes.length, 0);
  assert.equal(snapshot(source), before);
});
