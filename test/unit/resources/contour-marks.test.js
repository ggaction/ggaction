import test from "node:test";
import assert from "node:assert/strict";
import { chart, hconcat, vconcat, prepareDataUpdate } from "../../../src/index.js";
import { serializeProgram, deserializeProgram } from "../../../src/persistence.js";
import { getMarkItems, inspectProgram } from "../../../src/inspection.js";
import { renderToSVG } from "../../../src/renderers/svg.js";
import { createTransitionScene } from "../../../src/scene.js";
import { encodeValue, decodeValue } from "../../../src/persistence/codec.js";
import { contourSelectionPolicy } from "../../../src/materialization/selection/policies/contour.js";
import { contourScaleValues } from "../../../src/materialization/contour/scaleValues.js";
import { exportAccessibleData } from "../../../src/accessibility.js";

const grid = { origin: [0, 0], dx: 1, dy: 1, width: 5, height: 5,
  values: [0, 0, 0, 0, 0, 0, 3, 3, 3, 0, 0, 3, 0, 3, 0, 0, 3, 3, 3, 0, 0, 0, 0, 0, 0] };
const base = () => chart().createCanvas({ width: 500, height: 400, margin: { top: 30, bottom: 60, left: 70, right: 140 } })
  .createContourData({ id: "geometry", grid, thresholds: [1, 2, 3] });
const data = p => p.semanticSpec.resources.find(resource => resource.kind === "geometry");
const commands = p => p.graphicSpec.objects.contour.items.map(item => item.properties.commands);

test("line and filled contours keep opposite hole winding and stable level or band identities", () => {
  for (const mode of ["line", "filled"]) {
    const p = base().createContourMark({ mode }), items = getMarkItems(p, { target: "contour" });
    assert.equal(items.length, mode === "line" ? 3 : 2);
    assert.deepEqual(p.graphicSpec.objects.contour.items.map(child => child.properties.commands.filter(command => command.op === "M").length),
      mode === "line" ? [2, 2, 1, 1, 1, 1] : [2, 2, 2]);
    assert.ok(p.graphicSpec.objects.contour.items.every(child => child.properties.fillRule === "nonzero"));
    if (mode === "line") assert.ok(p.graphicSpec.objects.contour.items.every(child => child.properties.fill === "none"));
    assert.deepEqual(items.map(item => item.fields.value), mode === "line" ? [1, 2, 3] : [1, 2]);
    assert.ok(items.every(item => item.rows.length === 0));
    assert.deepEqual(exportAccessibleData(p, { target: "contour" }).views[0].rows.map(row => row.values), items.map(item =>
      Object.fromEntries(Object.entries(item.fields).map(([key, value]) => [`contour:${key}`, value]))));
    assert.ok(p.graphicSpec.objects.contour.items.every(child => child.identity.lineage.kind === "resource"));
    const reversed = p.editScale({ id: "contour-x", reverse: true });
    assert.deepEqual(getMarkItems(reversed, { target: "contour" }).map(item => item.key), items.map(item => item.key));
    assert.notDeepEqual(commands(reversed), commands(p));
    assert.equal(renderToSVG(deserializeProgram(serializeProgram(reversed))), renderToSVG(reversed));
    for (const format of ["svg", "canvas"]) assert.deepEqual(createTransitionScene(reversed, { format }), createTransitionScene(deserializeProgram(serializeProgram(reversed)), { format }));
  }
});

test("contour guide scales and selected final items refresh after grid and Canvas edits", () => {
  const p = base().createContourMark().createXAxis({ scale: "contour-x" }).createYAxis({ scale: "contour-y" })
    .createLegend({ target: "contour" }).highlightMarks({ id: "selected", target: "contour", select: { field: "value", op: "eq", value: 2 }, opacity: 0 });
  const before = serializeProgram(p), oldKeys = getMarkItems(p, { target: "contour" }).map(item => item.key);
  const q = p.editContourData({ grid: { ...grid, dx: 2 } });
  assert.equal(data(q).revision, 1);
  assert.equal(q.semanticSpec.layers[0].contourBinding.geometry.revision, 1);
  assert.deepEqual(q.resolvedScales["contour-x"].domain, [0, 8]);
  assert.deepEqual(getMarkItems(q, { target: "contour" }).map(item => item.key), oldKeys);
  assert.deepEqual(q.graphicSpec.objects.contour.items.map(child => child.properties.opacity), [1, 1, 0]);
  assert.equal(q.semanticSpec.guides.axis.x.scale, "contour-x");
  const resized = q.editCanvas({ width: 550 });
  assert.notDeepEqual(commands(resized), commands(q));
  const report = inspectProgram(resized).views.find(view => view.owner.id === "contour");
  assert.equal(report.logicalDataItems, 2); assert.equal(report.drawablePrimitives, 3);
  assert.equal(report.sourceRefs[0].kind, "geometry");
  assert.equal(serializeProgram(p), before);
});

test("contour source updates deduplicate shared scale consumers and preserve unrelated native marks", () => {
  const p = base().createContourMark({ x: { id: "shared-x" }, y: { id: "shared-y" } })
    .createData({ id: "points", values: [{ x: 1, y: 1 }] }).createPointMark({ id: "point" })
    .encodeX({ field: "x", fieldType: "quantitative", scale: { id: "shared-x" } })
    .encodeY({ field: "y", fieldType: "quantitative", scale: { id: "shared-y" } });
  const q = p.editContourData({ grid: { ...grid, dx: 2 } });
  assert.deepEqual(q.resolvedScales["shared-x"].domain, [0, 8]);
  assert.notDeepEqual(q.graphicSpec.objects.point, p.graphicSpec.objects.point);
  const walk = node => [node.op, ...node.children.flatMap(walk)];
  assert.equal(walk(q.trace.children.at(-1)).filter(op => op === "materializeContourMark").length, 1);
  assert.equal(walk(q.trace.children.at(-1)).filter(op => op === "rematerializePointMark").length, 1);
});

test("contour mark edits support fixed paints and scoped composition while rejecting invalid changes atomically", () => {
  const p = base().createContourMark({ color: false, fill: { type: "pattern", style: "cross", pitch: 8, foreground: "#900", background: "#fff" } });
  assert.match(renderToSVG(p), /pattern/);
  const before = serializeProgram(p), trace = p.trace;
  for (const run of [() => p.editContourMark({}), () => p.editContourMark({ opacity: 2 }),
    () => p.editContourMark({ mode: "line", fill: "red" }), () => p.editContourMark({ x: { type: "ordinal" } }),
    () => p.editContourData({ grid: { ...grid, dx: -1 } }), () => p.removeResource({ kind: "geometry", id: "geometry" }),
    () => p.encodeX({ target: "contour", field: "arbitrary", fieldType: "quantitative" })]) {
    assert.throws(run); assert.equal(serializeProgram(p), before); assert.equal(p.trace, trace);
  }
  const composition = hconcat({ programs: [{ id: "left", program: p }, { id: "right", program: p }] });
  const q = composition.editContourMark({ target: { childPath: ["left"], id: "contour" }, opacity: 0 });
  assert.equal(q.children.right, p); assert.ok(q.children.left.graphicSpec.objects.contour.items.every(child => child.properties.opacity === 0));
  assert.throws(() => p.removeResource({ kind: "geometry", id: "geometry", cascade: true }), /live mark/);
  const removed = p.removeMark({ target: "contour" }).removeResource({ kind: "geometry", id: "geometry" });
  assert.equal(removed.semanticSpec.layers.length, 0); assert.equal(removed.graphicSpec.objects.contour, undefined);
});

test("empty contour metadata retains valid scale domains without placeholder paths", () => {
  const p = base().editContourData({ grid: { ...grid, values: grid.values.map(() => null) } }).createContourMark();
  assert.equal(data(p).result.contours.thresholds.length, 3);
  assert.deepEqual(p.graphicSpec.objects.contour.items, []);
  assert.deepEqual(getMarkItems(p, { target: "contour" }), []);
  assert.deepEqual(p.resolvedScales["contour-x"].domain, [0, 4]);
  assert.deepEqual(p.resolvedScales["contour-color"].domain, [1, 3]);
});

test("density contour item lineage is bounded before graphics or selections allocate row references", () => {
  const program = chart().createCanvas().createData({ id: "points", values: Array.from({ length: 10000 }, () => ({ x: 0, y: 0 })) })
    .createDensityContourData({ id: "density", x: "x", y: "y", estimator: "histogram", normalization: "count",
      grid: { origin: [0, 0], dx: 1, dy: 1, width: 2, height: 2 }, thresholds: Array.from({ length: 1001 }, (_, i) => i) });
  const trace = program.trace, graphic = program.graphicSpec, semantic = program.semanticSpec;
  assert.throws(() => program.createContourMark({ mode: "line" }), /Contour source lineage work/);
  assert.equal(program.trace, trace); assert.equal(program.graphicSpec, graphic); assert.equal(program.semanticSpec, semantic);
  const empty = program.editContourData({ thresholds: Array.from({ length: 1001 }, (_, i) => 20000 + i) }).createContourMark({ mode: "line" });
  assert.deepEqual(getMarkItems(empty, { target: "contour" }), []);
});

test("contour restore rejects foreign encodings and unresolved style while selection rejects stale concrete identity", () => {
  const program = base().createContourMark({ color: false }), snapshot = serializeProgram(program);
  const envelope = JSON.parse(snapshot), state = decodeValue(envelope.payload);
  const mutations = [
    s => { s.semanticSpec.layers[0].contourBinding.mode = "mesh"; },
    s => { s.materializationConfigs.marks.contour.contour.clip = "true"; },
    s => { delete s.materializationConfigs.marks.contour.contour.opacity; },
    s => { s.semanticSpec.layers[0].encoding.x.field = "rowValue"; },
    s => { s.semanticSpec.layers[0].encoding.x.scale = ""; },
    s => { s.semanticSpec.layers[0].conditionals = {}; },
    s => { s.semanticSpec.layers[0].encoding.z = s.semanticSpec.layers[0].encoding.x; }
  ];
  for (const mutate of mutations) {
    const changed = structuredClone(state); mutate(changed);
    assert.throws(() => deserializeProgram(JSON.stringify({ ...envelope, payload: encodeValue(changed) })));
  }
  assert.throws(() => program.editContourMark({ mode: "mesh" }), /mode/);
  assert.throws(() => program.editContourMark({ clip: "true" }), /boolean/);
  const layer = program.semanticSpec.layers[0];
  const source = contourSelectionPolicy.resolveSourceItems(program, layer);
  assert.deepEqual(source.map(item => item.key), getMarkItems(program, { target: "contour" }).map(item => item.key));
  assert.ok(source.every(item => item.graphicIds === undefined && item.properties.fill === "#2563eb"));
  const missingGraphic = structuredClone(program.graphicSpec); delete missingGraphic.objects.contour;
  const missing = { ...program, markConfigs: program.markConfigs, graphicSpec: missingGraphic };
  assert.equal(contourSelectionPolicy.resolveSourceItems(missing, layer).length, 2);
  assert.throws(() => contourSelectionPolicy.resolveItems(missing, layer), /materialized paths/);
  const stale = structuredClone(program.graphicSpec); delete stale.objects.contour.items[0].identity;
  assert.throws(() => contourSelectionPolicy.resolveItems({ ...program, markConfigs: program.markConfigs, graphicSpec: stale }, layer), /stale path identity/);
  assert.throws(() => contourScaleValues(program, { layer, channel: "size" }), /x, y, or color/);
  const foreign = { ...program, semanticSpec: { ...program.semanticSpec, resources: [{ ...data(program), options: { method: "other" } }] } };
  assert.throws(() => contourScaleValues(foreign, { layer, channel: "x" }), /contour geometry/);
  assert.equal(serializeProgram(program), snapshot);
});

test("contour vertical composition keeps child edits scoped and rejects implicit data partitioning", () => {
  const child = base().createContourMark(), saved = serializeProgram(child);
  const joined = vconcat({ programs: [{ id: "top", program: child }, { id: "bottom", program: child }] });
  const changed = joined.editContourData({ target: { childPath: ["top"], id: "geometry" }, thresholds: [1, 3] });
  assert.equal(changed.children.bottom, child);
  assert.equal(getMarkItems(changed.children.top, { target: "contour" }).length, 1);
  for (const run of [() => child.facet({ field: "value" }), () => child.repeatCharts({ target: "contour", channel: "x", fields: ["x", "y"] })]) assert.throws(run, /eligible|data|source|support|field role/i);
  assert.equal(serializeProgram(child), saved);
});

test("prepared source and computed parameter closures update density contours and reject negative weights atomically", async () => {
  const values = [{ id: "a", x: 0, y: 0, w: 2 }, { id: "b", x: 1, y: 1, w: 3 }];
  let p = chart().createCanvas().createParameter({ id: "gain", value: 1 });
  const response = values => ({ text: JSON.stringify(values), mimeType: "application/json", encoding: "utf-8" });
  const prepared = await prepareDataUpdate(p, { kind: "create", id: "raw", keyField: "id", source: { kind: "url", url: "https://example.test/points.json", format: "json" } }, { requestToken: "create", load: async () => response(values) });
  p = p.applyDataUpdate({ prepared, requestToken: "create" }).createComputedData({ id: "weighted", source: "raw", as: "weight",
    expression: { version: 2, registry: "standard@1", root: { type: "binary", op: "multiply", left: { type: "field", name: "w" }, right: { type: "parameter", id: "gain" } } } })
    .createDensityContourData({ id: "geometry", data: "weighted", x: "x", y: "y", weight: "weight", estimator: "histogram", normalization: "count",
      grid: { origin: [0, 0], dx: 1, dy: 1, width: 2, height: 2 }, thresholds: [0, 1, 2, 4] }).createContourMark();
  const original = serializeProgram(p), trace = p.trace;
  const refresh = await prepareDataUpdate(p, { kind: "revise", target: "raw", id: "raw2" }, { requestToken: "refresh", load: async () => response(values.map(row => ({ ...row, w: row.w * 2 }))) });
  const changed = p.applyDataUpdate({ prepared: refresh, requestToken: "refresh" }).editParameter({ target: "gain", value: 2 });
  assert.equal(data(changed).revision, 2);
  assert.deepEqual(data(changed).result.contours.grid.values, [8, 0, 0, 12]);
  assert.equal(changed.semanticSpec.layers[0].contourBinding.geometry.revision, 2);
  assert.throws(() => p.editParameter({ target: "gain", value: -1 }), /nonnegative/);
  assert.equal(serializeProgram(p), original); assert.equal(p.trace, trace);
});

test("contour scale reassignment preserves guide ownership and fixed color removes its legend", () => {
  const original = base().createContourMark().createLegend(), snapshot = serializeProgram(original);
  const changed = original.editContourMark({ color: { id: "new-color", range: ["white", "red"] } });
  assert.equal(changed.semanticSpec.guides.legend.color.scale, "new-color");
  assert.equal(changed.guideConfigs.legend.gradient.scale, "new-color");
  const discrete = changed.editContourMark({ color: { id: "bins", type: "quantize", range: ["red", "blue"] } });
  assert.equal(discrete.semanticSpec.guides.legend.color.scale, "bins");
  assert.equal(discrete.guideConfigs.legend.gradient, undefined);
  assert.equal(discrete.guideConfigs.legend.interval.scale, "bins");
  const fixed = discrete.editContourMark({ color: false, fill: "purple" });
  assert.equal(fixed.semanticSpec.guides.legend, undefined);
  assert.equal(fixed.semanticSpec.layers[0].encoding.color, undefined);
  assert.ok(fixed.graphicSpec.objects.contour.items.every(item => item.properties.fill === "purple"));
  assert.deepEqual(deserializeProgram(serializeProgram(fixed)).graphicSpec, fixed.graphicSpec);
  assert.equal(serializeProgram(original), snapshot);
  for (const patch of [{ x: { id: "shared" }, y: { id: "shared" } }, { color: { id: "contour-x" } }]) {
    assert.throws(() => original.editContourMark(patch), /across channels/);
    assert.equal(serializeProgram(original), snapshot);
  }
});

test("one source revision preflights both geometries and materializes their shared consumers once", () => {
  const frame = { origin: [0, 0], dx: 1, dy: 1, width: 2, height: 2 };
  const rows = [{ x: 0, y: 0, a: 1, b: 2 }, { x: 1, y: 1, a: 3, b: 4 }];
  const options = { data: "samples", x: "x", y: "y", grid: frame, estimator: "histogram", normalization: "count", thresholds: [0, 1, 2, 5] };
  const scales = { x: { id: "shared-x" }, y: { id: "shared-y" }, color: { id: "shared-color" } };
  const p = chart().createCanvas().createData({ id: "samples", values: rows })
    .createDensityContourData({ ...options, id: "a", weight: "a" }).createDensityContourData({ ...options, id: "b", weight: "b" })
    .createContourMark({ id: "a-mark", geometry: "a", ...scales }).createContourMark({ id: "b-mark", geometry: "b", ...scales });
  const before = serializeProgram(p), trace = p.trace;
  const q = p.reviseData({ source: "samples", id: "revised", values: rows.map(row => ({ ...row, a: row.a * 2, b: row.b * 3 })) });
  const records = [];
  const walk = node => { records.push(node); for (const child of node.children ?? []) walk(child); };
  walk(q.trace.children.at(-1));
  for (const id of ["a-mark", "b-mark"]) assert.equal(records.filter(node => node.op === "materializeContourMark" && node.args.id === id).length, 1);
  for (const id of ["shared-x", "shared-y", "shared-color"]) assert.equal(records.filter(node => node.op === "rematerializeScale" && node.args.id === id).length, 1);
  assert.deepEqual(q.semanticSpec.resources.filter(r => r.kind === "geometry").map(r => [r.revision, r.inputs[0].id]), [[1, "revised"], [1, "revised"]]);
  assert.deepEqual(deserializeProgram(serializeProgram(q)).graphicSpec, q.graphicSpec);
  assert.throws(() => p.reviseData({ source: "samples", id: "bad", values: rows.map(row => ({ ...row, a: row.a * 2, b: -1 })) }));
  assert.equal(serializeProgram(p), before); assert.equal(p.trace, trace);
});
