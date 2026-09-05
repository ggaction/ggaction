// Phase 2 contract review evidence, not a production test dependency.
// Run from the repository root. --record updates only this review's snapshot.
import assert from "node:assert/strict";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { chart } from "../../../../src/index.js";
import { chart as basicChart } from "../../../../src/basic.js";

const baselineCommit = "bbc8a3fc256c9afa877f696ed6ade1f51ffb7522";
const sourceTree = "bd17aeb7d38e1d184bc714a182e13feea5923279";
assert.equal(execFileSync("git", ["rev-parse", "HEAD:src"], { encoding: "utf8" }).trim(), sourceTree,
  "This snapshot describes the Phase 2 baseline; review source changes before replaying it.");
execFileSync("git", ["diff", "--exit-code", baselineCommit, "--", "src", "types"], { stdio: "pipe" });
const rows = ["KR", "JP", "US", "CA"].flatMap((country, groupIndex) =>
  [1, 2, 3, 4].map(x => {
    const y = 2 * x + groupIndex + (x % 2) / 10;
    return { country, continent: groupIndex < 2 ? "Asia" : "America",
      category: country, x, y, low: y - 1, high: y + 1,
      width: groupIndex + 1, varying: x, when: `2025-0${x}-01` };
  }));
const base = () => chart().createCanvas({ width: 1000, height: 700, margin: 150 })
  .createData({ values: rows });
const line = () => base().createLinePlot({ id: "line", x: "x", y: "y", groupBy: "country", guides: false });
const point = () => base().createScatterPlot({ id: "point", x: "x", y: "y", color: "country", guides: false });
const band = () => base().createErrorBand({ id: "band", x: { field: "x" },
  y: { center: "y", lower: "low", upper: "high" }, groupBy: "country" })
  .encodeColor({ target: "band", field: "country" }).createLegend({ target: "band" });
const layer = (p, id) => p.semanticSpec.layers.find(l => l.id === id);
const items = (p, id) => p.graphicSpec.objects[id]?.items ?? [];
const clean = value => JSON.parse(JSON.stringify(value));
const result = [];
function probe(id, claim, expected, beforeFactory, run, inspect = () => ({})) {
  const before = beforeFactory();
  const snapshot = structuredClone(before);
  let after;
  let error;
  try { after = run(before); } catch (caught) { error = caught; }
  assert.deepEqual(structuredClone(before), snapshot, `${id}: input program/trace mutated`);
  const outcome = error === undefined ? "accepted" : "rejected";
  assert.equal(outcome, expected, `${id}: ${error?.message ?? "unexpected success"}`);
  result.push({ id, claim, outcome, inputUnchanged: true,
    ...(error ? { error: error.message } : { details: clean(inspect(after, before)) }) });
}
const encoding = id => p => ({ encoding: layer(p, id)?.encoding, count: items(p, id).length });
const guides = p => ({ guides: p.semanticSpec.guides });
probe("G01", "Omitted guides on Scatter then Line", "rejected", base,
  p => p.createScatterPlot({ x: "x", y: "y" }).createLinePlot({ x: "x", y: "y" }));
probe("G02", "Existing explicit composition with second guides:false", "accepted", base,
  p => p.createScatterPlot({ x: "x", y: "y" }).createLinePlot({ x: "x", y: "y", guides: false }), guides);
probe("G03", "Repeated lower createXAxis remains strict", "rejected", base,
  p => p.createScatterPlot({ x: "x", y: "y" }).createXAxis());
probe("G04", "Box can remain deferred", "accepted", base,
  p => p.createBoxPlot({ id: "box" }), encoding("box"));
probe("G05", "Gradient can remain deferred", "accepted", base,
  p => p.createGradientPlot({ id: "gradient" }), encoding("gradient"));
for (const [id, options] of [["G06", {}], ["G07", { guides: {} }]]) {
  probe(id, `Complete Box guides ${id === "G06" ? "omitted" : "{}"}`, "accepted", base,
    p => p.createBoxPlot({ x: { field: "category", fieldType: "nominal" },
      y: { field: "y", fieldType: "quantitative" }, ...options }), guides);
}
probe("G08", "Only x axis line authored before chart composition", "accepted", base,
  p => p.createScatterPlot({ x: "x", y: "y", guides: false }).createXAxisLine(), guides);

probe("S01", "Country series with one continent color each", "rejected", line,
  p => p.encodeColor({ field: "continent" }));
probe("S02", "Line constant width encoder", "rejected", line, p => p.encodeStrokeWidth({ value: 4 }));
probe("S03", "Line series field width encoder", "accepted", line,
  p => p.encodeStrokeWidth({ field: "width" }), encoding("line"));
probe("S04", "Line constant opacity encoder", "rejected", line, p => p.encodeOpacity({ value: 0.5 }));
probe("S05", "Existing Line constant style editor reference", "accepted", line,
  p => p.editLineMark({ strokeWidth: 4, opacity: 0.5 }),
  p => ({ styles: items(p, "line").map(i => ({ width: i.properties.strokeWidth, opacity: i.properties.opacity })) }));
probe("S06", "Scatter point.radius shorthand", "rejected", base,
  p => p.createScatterPlot({ x: "x", y: "y", point: { radius: 5 }, guides: false }));
probe("S07", "Existing explicit point radius reference", "accepted", point,
  p => p.encodePointRadius({ value: 5 }), p => ({ radius: p.markConfigs.point.radius }));
probe("S08", "Tuple group fields", "rejected", line,
  p => p.encodeGroup({ fields: ["country", "continent"] }));
probe("S09", "Area group and distinct constant-within-series color", "rejected", base,
  p => p.createAreaMark({ id: "area" }).encodeX({ field: "x" })
    .encodeYRange({ lower: "low", upper: "high" }).encodeGroup({ field: "country" })
    .encodeColor({ field: "continent" }));
probe("S10", "Existing Rule style owner chain", "accepted", base,
  p => p.createRuleMark({ id: "rule" }).encodeX({ field: "x", fieldType: "quantitative" })
    .encodeY({ field: "y", fieldType: "quantitative" })
    .encodeStroke({ value: "black" }).encodeStrokeWidth({ value: 4 })
    .encodeStrokeDash({ value: "dashed" }).encodeOpacity({ value: 0.5 }),
  p => ({ config: p.markConfigs.rule, encoding: layer(p, "rule").encoding }));
probe("S11", "ErrorBand fill overrides graphics but leaves field legend", "accepted", band,
  p => p.editErrorBand({ fill: "black" }), p => {
    assert.equal(layer(p, "band").encoding.color.field, "country");
    assert.ok(Object.keys(p.semanticSpec.guides.legend).length > 0);
    assert.ok(items(p, "band").every(i => i.properties.fill === "black"));
    return { color: layer(p, "band").encoding.color, legend: p.semanticSpec.guides.legend,
      fills: items(p, "band").map(i => i.properties.fill) };
  });
probe("S12", "Existing explicit removeEncoding then ErrorBand fill reference", "accepted", band,
  p => p.removeEncoding({ target: "band", channel: "color" }).editErrorBand({ target: "band", fill: "black" }),
  p => {
    assert.equal(layer(p, "band").encoding.color, undefined);
    return { color: layer(p, "band").encoding.color ?? null,
      legend: p.semanticSpec.guides.legend, fills: items(p, "band").map(i => i.properties.fill) };
  });
probe("S13", "Line scalar edit while width field is active", "accepted",
  () => line().encodeStrokeWidth({ field: "width" }), p => p.editLineMark({ strokeWidth: 9 }),
  (p, before) => {
    const widths = q => items(q, "line").map(i => i.properties.strokeWidth);
    assert.deepEqual(widths(p), widths(before));
    return { requested: p.markConfigs.line.strokeWidth, actual: widths(p),
      encoding: layer(p, "line").encoding.strokeWidth };
  });
probe("S14", "Line width with ambiguous values inside a series", "rejected", line,
  p => p.encodeStrokeWidth({ field: "varying" }));
probe("S15", "Point scalar opacity leaves field encoding and its legend active", "accepted",
  () => point().encodeOpacity({ field: "width" }).createLegend({ target: "point", channels: ["opacity"] }),
  p => p.editPointMark({ opacity: 0.1 }), p => {
    assert.equal(layer(p, "point").encoding.opacity.field, "width");
    assert.ok(items(p, "point").every(i => i.properties.opacity === 0.1));
    return { opacity: p.markConfigs.point.opacity, encoding: layer(p, "point").encoding.opacity,
      legend: p.semanticSpec.guides.legend };
  });
probe("S16", "ErrorBand field color after constant fill still paints the constant", "accepted", band,
  p => p.removeEncoding({ target: "band", channel: "color" }).editErrorBand({ fill: "black" })
    .encodeColor({ target: "band", field: "country" }), p => {
    assert.equal(layer(p, "band").encoding.color.field, "country");
    assert.ok(items(p, "band").every(i => i.properties.fill === "black"));
    return { color: layer(p, "band").encoding.color, fills: items(p, "band").map(i => i.properties.fill) };
  });
probe("S17", "Existing Point constant opacity assignment removes field and opacity legend", "accepted",
  () => point().encodeOpacity({ field: "width" }).createLegend({ target: "point", channels: ["opacity"] }),
  p => p.encodeOpacity({ value: 0.1 }), p => {
    assert.equal(layer(p, "point").encoding.opacity, undefined);
    return { encoding: layer(p, "point").encoding.opacity ?? null, legend: p.semanticSpec.guides.legend };
  });
probe("S18", "Basic entry has no point-radius child registered", "accepted", basicChart, p => p,
  p => ({ encodePointRadius: typeof p.encodePointRadius, encodeRadius: typeof p.encodeRadius,
    encodeOpacity: typeof p.encodeOpacity }));

const regressions = p => ({ transforms: p.semanticSpec.datasets.flatMap(d =>
  (d.transform ?? []).filter(t => t.type === "regression").map(t => ({ type: t.type, groupBy: t.groupBy ?? null }))) });
for (const [id, claim, args, expected] of [
  ["I01", "Regression omitted group infers country", {}, "accepted"],
  ["I02", "Regression explicit undefined disables grouping", { groupBy: undefined }, "accepted"],
  ["I03", "JSON erases Regression undefined and restores inference", clean({ groupBy: undefined }), "accepted"],
  ["I04", "Regression JSON-safe false opt-out", { groupBy: false }, "rejected"]
]) probe(id, claim, expected, point, p => p.createRegression({ band: false, ...args }), regressions);
probe("I05", "createData has no source schema option", "rejected", () => chart().createCanvas(),
  p => p.createData({ values: rows, schema: { width: { fieldType: "quantitative" } } }));
const timeBase = () => chart().createCanvas().createData({ values: [{ t: 1000, y: 1 }, { t: 2000, y: 2 }] });
probe("I06", "Existing numeric temporal four-digit year heuristic", "accepted", timeBase,
  p => p.createScatterPlot({ x: { field: "t", fieldType: "temporal", scale: { nice: false } }, y: "y", guides: false }),
  p => ({ domain: p.resolvedScales.x.domain }));
probe("I07", "Explicit temporalUnit timestamp is currently unsupported", "rejected", timeBase,
  p => p.createScatterPlot({ x: { field: "t", fieldType: "temporal", temporalUnit: "timestamp" }, y: "y", guides: false }));
probe("I08", "Numeric color shorthand stays nominal", "accepted", base,
  p => p.createScatterPlot({ x: "x", y: "y", color: "width", guides: false }), encoding("scatterPlot"));
probe("I09", "Bar omitted aggregate stays mean", "accepted", base,
  p => p.createBarPlot({ x: "country", y: "y", guides: false }), encoding("barPlot"));
probe("I10", "Density create-side false opt-out is rejected", "rejected", base,
  p => p.createAreaMark().encodeDensity({ field: "y", groupBy: false }));
probe("I11", "Horizon create-side false opt-out is rejected", "rejected", base,
  p => p.createAreaMark().encodeHorizon({ x: "x", y: "y", groupBy: false }));

probe("O01", "Bar width before positions", "rejected", base,
  p => p.createBarMark().encodeBarWidth({ band: 0.5 }));
probe("O02", "Existing completed Bar width reference", "accepted", base,
  p => p.createBarMark().encodeX({ field: "country", fieldType: "nominal" })
    .encodeY({ field: "y" }).encodeBarWidth({ band: 0.5 }),
  p => ({ ...encoding("bar")(p), width: p.markConfigs.bar.barWidth }));
probe("O03", "Bar measure before category without aggregate", "rejected", base,
  p => p.createBarMark().encodeY({ field: "y" }).encodeX({ field: "country", fieldType: "nominal" }));
probe("O04", "Existing category-first lower Bar reference", "accepted", base,
  p => p.createBarMark().encodeX({ field: "country", fieldType: "nominal" }).encodeY({ field: "y" }), encoding("bar"));
probe("O05", "Missing measure field fails before completion", "rejected", base,
  p => p.createBarMark().encodeY({ field: "missing" }));
probe("O06", "Invalid pending width still fails immediately", "rejected", base,
  p => p.createBarMark().encodeBarWidth({ pixels: -1 }));

const snapshot = { baselineCommit, sourceTree, command: "node agent_docs/impl/roadmap6/phase2/baseline.probes.mjs", cases: result };
const destination = new URL("baseline-results.json", import.meta.url);
if (process.argv.includes("--record")) fs.writeFileSync(destination, JSON.stringify(snapshot, null, 2) + "\n");
else assert.deepEqual(snapshot, JSON.parse(fs.readFileSync(destination, "utf8")));
console.log(`${result.length}/${result.length} baseline observations verified; all input programs and traces unchanged.`);
for (const item of result) console.log(`${item.id} ${item.outcome}: ${item.error ?? item.claim}`);
