import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chart } from "../../../../src/index.js";
import { layoutSeriesPartition } from "../../../../src/grammar/seriesLayout.js";
import { mapSequentialColors } from "../../../../src/grammar/scales/color.js";

process.chdir(fileURLToPath(new URL("../../../../", import.meta.url)));
const baselineCommit = "93dceb3761e170207058e6a7280060fedd471244";
const sourceTree = "6d5a80e311cabdc67dff5da739dcce3346e3841d";
const typesTree = "38cbb7b6d7feaa5b044a56189ea874b8bde5d581";
const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();
assert.equal(git("rev-parse", "HEAD:src"), sourceTree);
assert.equal(git("rev-parse", "HEAD:types"), typesTree);
assert.equal(git("diff", baselineCommit, "--", "src", "types"), "");

const clone = value => JSON.parse(JSON.stringify(value));
function freeze(value) {
  if (value && typeof value === "object") {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}
const a = (op, args = {}) => ({ op, args });
const area = [a("createAreaMark", { id: "m" }), a("encodeX", { field: "x" }), a("encodeY", { field: "value" })];
const bar = [a("createBarMark", { id: "m" }), a("encodeX", { field: "category", fieldType: "nominal" }), a("encodeY", { field: "value", aggregate: "sum" })];
const arc = [a("createArcMark", { id: "m" }), a("encodeTheta", { field: "category", fieldType: "nominal" })];
const point = [a("createPointMark", { id: "m" }), a("encodeX", { field: "x" }), a("encodeY", { field: "value" })];
const rows = [{ x: 0, value: 2, low: 1, high: 3, category: "A", group: "a", region: "r" },
  { x: 1, value: 3, low: 2, high: 6, category: "B", group: "a", region: "r" },
  { x: 2, value: 4, low: 1, high: 5, category: "C", group: "a", region: "r" }];
const groupedRows = [{ x: 0, value: 2, category: "A", group: "a", region: "r" },
  { x: 1, value: 4, category: "B", group: "a", region: "r" },
  { x: 0, value: 1, category: "A", group: "b", region: "r" },
  { x: 1, value: 2, category: "B", group: "b", region: "r" }];
const color = a("encodeColor", { field: "value", fieldType: "quantitative", scale: { type: "sequential", domain: [-2, 8], range: ["blue", "white", "red"] } });
const groupedBar = [...bar, a("encodeColor", { field: "group", layout: "group" })];
const centered = [...area, a("encodeGroup", { field: "group" }), a("encodeY", { field: "value", stack: "center" })];
const cases = freeze([
  { id: "A01", calls: area },
  { id: "A02", calls: [...area, a("encodeY2", { datum: 0 })] },
  { id: "A03", calls: [...area, a("encodeY", { datum: 0 })] },
  { id: "A04", calls: [...area, a("encodeYRange", { lower: "low", upper: "high" })] },
  { id: "A05", calls: [...area, a("encodeYRange", { lower: "high", upper: "low" })] },
  { id: "A06", values: rows.map((r, i) => ({ ...r, high: i === 1 ? null : r.high })), calls: [...area, a("encodeYRange", { lower: "low", upper: "high" })] },
  { id: "A07", calls: [...area.slice(0, 2), a("encodeYRange", { lower: "low", upper: "high", scale: { type: "log" } })] },
  { id: "A08", values: rows.map(r => ({ ...r, low: 0 })), calls: [...area.slice(0, 2), a("encodeYRange", { lower: "low", upper: "high", scale: { type: "log" } })] },
  { id: "A09", calls: [a("createAreaMark", { id: "m" }), a("encodeY", { field: "x" }), a("encodeXRange", { lower: "low", upper: "high" })] },
  { id: "A10", values: groupedRows, calls: [...area, a("encodeGroup", { field: "group" }), a("encodeY", { field: "value", stack: "zero" })] },
  { id: "A11", values: groupedRows, calls: centered },
  { id: "A12", values: groupedRows, calls: [...centered, a("encodeColor", { field: "region", layout: "center" })] },
  { id: "A13", values: groupedRows.slice(0, 3), calls: centered },
  { id: "A14", calls: [...area.slice(0, 2), a("encodeYRange", { lower: { datum: 0 }, upper: "value" })] },
  { id: "A15", calls: [...area, a("encodeYRange", { lower: "low", upper: "high" }), a("encodeYRange", { lower: "low", upper: "value" })] },
  { id: "L01", values: groupedRows, calls: groupedBar },
  { id: "L02", values: groupedRows, calls: [...groupedBar, a("encodeColor", { field: "group", layout: "stack" })] },
  { id: "L03", values: groupedRows, calls: [...groupedBar, a("encodeY", { field: "value", stack: "zero" })] },
  { id: "L04", values: groupedRows, calls: [...bar, a("encodeGroup", { field: "group" })] },
  { id: "L05", values: groupedRows, calls: [...bar, a("encodeColor", { field: "group", layout: "fill" })] },
  { id: "L06", values: groupedRows.map((r, i) => ({ ...r, value: i === 2 ? -1 : r.value })), calls: [...bar, a("encodeColor", { field: "group", layout: "stack" })] },
  { id: "L07", values: groupedRows.map((r, i) => ({ ...r, value: i === 2 ? -1 : r.value })), calls: [...bar, a("encodeColor", { field: "group", layout: "diverging" })] },
  { id: "L08", values: groupedRows, calls: [...area, a("encodeColor", { field: "group", layout: "center" }), a("encodeColor", { field: "group", layout: "overlay" })] },
  { id: "L09", values: groupedRows, calls: [...bar, a("encodeXOffset", { field: "group" })] },
  { id: "R01", calls: [...arc, a("encodeR", { field: "value" })] },
  { id: "R02", calls: [...arc, a("encodeR", { field: "value", scale: { zero: true } })] },
  { id: "R03", calls: [...arc, a("encodeR", { field: "value", scale: { type: "sqrt", zero: true } })] },
  { id: "R04", calls: [a("createArcMark", { id: "m", innerRadius: 0.5 }), ...arc.slice(1), a("encodeR", { field: "value", scale: { zero: true } })] },
  { id: "R05", values: [...rows, { ...rows[0], value: 1 }], calls: [...arc, a("encodeR", { field: "value", scale: { zero: true } })] },
  { id: "R06", calls: [...arc, a("encodeR", { field: "value", aggregate: "sum" })] },
  { id: "R07", calls: [...arc, a("encodeR", { field: "value", mapping: "area" })] },
  { id: "R08", values: rows.map(r => ({ ...r, value: 0 })), calls: [...arc, a("encodeR", { field: "value", scale: { zero: true } })] },
  { id: "R09", calls: [...arc, a("encodeR", { field: "value", scale: { domain: [0, 4], range: [70, 140], type: "sqrt" } })] },
  { id: "O01", calls: [a("createPiePlot", { id: "m", category: "category" }), a("orderCategories", { target: "m", channel: "theta", values: ["C", "A"] })] },
  { id: "O02", calls: [...bar, a("orderCategories", { channel: "x", values: ["C", "A"] })] },
  { id: "O03", calls: [...bar, a("orderCategories", { channel: "x", values: ["unknown"] })] },
  { id: "O04", calls: [...bar, a("orderCategories", { channel: "x", by: "count", direction: "descending" })] },
  { id: "O05", calls: [...bar, a("orderCategories", { channel: "x", values: ["C"] }), a("removeCategoryOrder", { channel: "x" })] },
  { id: "O06", calls: [...bar, a("encodeColor", { field: "category" }), a("orderCategories", { channel: "x", values: ["C"] }), a("createLegend", { target: "m" })] },
  { id: "O07", calls: [a("createPiePlot", { id: "m", category: { field: "category", scale: { domain: ["C", "A", "B"] } } })] },
  { id: "C01", calls: [...point, color] },
  { id: "C02", calls: [...point, color, a("editScale", { id: "color", midpoint: 0 })] },
  { id: "C03", calls: [...point, color, a("editScale", { id: "color", type: "diverging" })] },
  { id: "C04", calls: [...point, color, a("editScale", { id: "color", type: "quantize", range: ["blue", "red"] })] },
  { id: "C05", calls: [...point, color, a("createLegend", { target: "m" }), a("editScale", { id: "color", type: "quantize", range: ["blue", "red"] })] },
  { id: "C06", calls: [...bar, color, a("editScale", { id: "color", type: "quantize", range: ["blue", "red"] })] },
  { id: "C07", calls: [...bar, a("encodeColor", { field: "value", fieldType: "quantitative", scale: { type: "quantize", range: ["blue", "red"] } })] },
  { id: "C08", calls: [...point, color, a("encodeColor", { field: "value", fieldType: "quantitative", scale: { type: "quantize", range: ["blue", "red"] } })] },
  { id: "C09", calls: [...point, color, a("createPointMark", { id: "n" }), a("encodeColor", { target: "n", field: "value", fieldType: "quantitative" }), a("editScale", { id: "color", type: "quantize", range: ["blue", "red"] })] }
]);

function summarize(program) {
  return {
    layers: program.semanticSpec.layers,
    scales: program.semanticSpec.scales,
    resolvedScales: Object.fromEntries(Object.entries(program.resolvedScales).map(([id, s]) => [id, { type: s.type, domain: s.domain, range: s.range }])),
    items: Object.fromEntries(program.semanticSpec.layers.map(layer => [layer.id, (program.graphicSpec.objects[layer.id]?.items ?? []).map(item => item.properties)])),
    guides: program.semanticSpec.guides,
    topLevelTrace: program.trace.children.map(node => node.op)
  };
}

let immutableChecks = 0;
const observations = cases.map(probe => {
  const values = probe.values ?? freeze(clone(rows));
  const inputBefore = clone({ values, calls: probe.calls });
  let program = chart().createCanvas({ width: 1000, height: 700, margin: 150 }).createData({ id: "source", values });
  let failure;
  for (const call of probe.calls) {
    const before = clone(program);
    try {
      const next = program[call.op](call.args);
      assert.deepEqual(clone(program), before);
      program = next;
    } catch (error) {
      assert.deepEqual(clone(program), before);
      failure = { op: call.op, name: error.name, message: error.message };
    }
    immutableChecks += 1;
    assert.deepEqual(clone({ values, calls: probe.calls }), inputBefore);
    if (failure) break;
  }
  return { id: probe.id, values, calls: probe.calls, outcome: failure ? "rejected" : "fulfilled", ...(failure ? { failure } : {}), result: summarize(program) };
});
const evidence = {
  version: 1, baselineCommit, sourceTree, typesTree,
  missingPublicActions: ["createAreaPlot", "createRosePlot", "createRadialBarPlot", "encodeLayout"].map(name => ({ name, exists: typeof chart()[name] === "function" })),
  immutableChecks, observations,
  pureObservations: {
    fill: layoutSeriesPartition([2, 3, 5], "fill"),
    diverging: layoutSeriesPartition([-2, 3, -4, 5], "diverging"),
    center: layoutSeriesPartition([2, 4], "center"),
    asymmetricSequentialColors: mapSequentialColors([-2, 0, 3, 8], [-2, 8], ["blue", "white", "red"])
  }
};
assert.ok(evidence.missingPublicActions.every(entry => !entry.exists));
const output = new URL("baseline-results.json", import.meta.url);
if (process.argv.includes("--record")) await writeFile(output, `${JSON.stringify(evidence, null, 2)}\n`);
else assert.deepEqual(clone(evidence), JSON.parse(await readFile(output, "utf8")));
console.log(JSON.stringify({ probes: observations.length, immutableChecks, outcomes: observations.map(({ id, outcome, failure, result }) => ({ id, outcome, ...(failure ? { error: failure.message } : { items: Object.fromEntries(Object.entries(result.items).map(([id, items]) => [id, items.length])) }) })), pure: evidence.pureObservations }, null, 2));
