// Read-only Phase 3 contract evidence. No proposed facade is implemented here.
// Run at the recorded source/types baseline; --record refreshes this snapshot only.
import assert from "node:assert/strict";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { chart } from "../../../../src/index.js";
import { chart as basicChart } from "../../../../src/basic.js";
import { deriveArcSectors } from "../../../../src/grammar/arcs.js";
import { fulfillFacadeGuides } from "../../../../src/actions/guides/facade.js";

const baselineCommit = "9625e71c374868756652fb8dff8153dc61500c6e";
const sourceTree = "9d3bd5e26b67634851e6009faac4b8c7c9e15002";
assert.equal(execFileSync("git", ["rev-parse", "HEAD:src"], { encoding: "utf8" }).trim(), sourceTree);
execFileSync("git", ["diff", "--exit-code", baselineCommit, "--", "src", "types"], { stdio: "pipe" });
const freeze = value => {
  if (value && typeof value === "object") {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
};
const clean = value => JSON.parse(JSON.stringify(value));
const base = values => chart().createCanvas({ width: 1000, height: 700, margin: 150 })
  .createData(freeze({ id: "source", values }));
const pieRows = freeze([{ c: "A", v: 2, color: "warm" }, { c: "A", v: 3, color: "warm" },
  { c: "B", v: 5, color: "cool" }]);
const densityRows = freeze([{ v: 1, g: "A", region: "East" }, { v: 2, g: "A", region: "East" },
  { v: 3, g: "B", region: "West" }, { v: 5, g: "B", region: "West" }]);
const horizonRows = freeze([{ t: 0, v: -4, g: "A" }, { t: 1, v: 4, g: "A" }]);
const layer = (p, id) => p.semanticSpec.layers.find(l => l.id === id);
const data = (p, id) => p.semanticSpec.datasets.find(d => d.id === layer(p, id).data);
const items = (p, id) => p.graphicSpec.objects[id].items;
const arcBase = (rows = pieRows) => base(rows).createArcMark({ id: "pie", data: "source" });
const densityBase = (rows = densityRows) => base(rows).createAreaMark({ id: "density", data: "source" });
const horizonBase = (rows = horizonRows) => base(rows).createAreaMark({ id: "horizon", data: "source" });
const count = p => p.encodeTheta({ target: "pie", field: "c", fieldType: "nominal", aggregate: "count" });
const weighted = p => p.encodeTheta({ target: "pie", field: "c", aggregate: "sum", weight: "v" });
const density = (p, args = {}) => p.encodeDensity({ target: "density", field: "v", ...args });
const horizon = (p, args = {}) => p.encodeHorizon({ target: "horizon", x: "t", y: "v", ...args });
const arcDetails = p => {
  const l = layer(p, "pie");
  return { encoding: l.encoding, sectors: deriveArcSectors(data(p, "pie").values, l, {
    thetaScale: p.resolvedScales[l.encoding.theta.scale], frame: { availableRadius: 200 },
    innerRadiusRatio: p.markConfigs.pie.innerRadius
  }).sectors, config: p.markConfigs.pie, guides: p.semanticSpec.guides };
};
const statisticalDetails = id => p => {
  const d = data(p, id);
  return { layer: layer(p, id), transform: d.transform[0], dataId: d.id, source: d.source,
    rows: d.values.length, first: d.values[0] ?? null, paths: items(p, id).length,
    config: p.markConfigs[id], guides: p.semanticSpec.guides };
};
const result = [];
function probe(id, claim, expected, beforeFactory, run, inspect = () => ({})) {
  const before = beforeFactory();
  const snapshot = structuredClone(before);
  let after, error;
  try { after = run(before); } catch (caught) { error = caught; }
  assert.deepEqual(structuredClone(before), snapshot, `${id}: earlier program/trace changed`);
  const outcome = error === undefined ? "accepted" : "rejected";
  assert.equal(outcome, expected, `${id}: ${error?.message ?? "unexpected success"}`);
  result.push({ id, claim, outcome, inputUnchanged: true,
    ...(error ? { error: error.message } : { details: clean(inspect(after, before)),
      topLevelTrace: after.trace.children.map(child => child.op) }) });
}

probe("A01", "All three proposed facades and Donut alias are absent from full/basic", "accepted", chart,
  p => p, p => {
    const names = ["createPiePlot", "createDensityPlot", "createHorizonPlot", "createDonutPlot"];
    for (const program of [p, basicChart()]) for (const name of names) assert.equal(typeof program[name], "undefined");
    return { absent: names };
  });
probe("P01", "Category count completes two sectors without radius", "accepted", arcBase, count, p => {
  const d = arcDetails(p);
  assert.deepEqual(d.sectors.map(s => [s.theta, s.count, s.endTheta - s.startTheta]), [["A", 2, 240], ["B", 1, 120]]);
  assert.equal(layer(p, "pie").encoding.radius, undefined);
  return d;
});
probe("P02", "Duplicate-category weighted sum yields equal halves", "accepted", arcBase, weighted, p => {
  const d = arcDetails(p);
  assert.deepEqual(d.sectors.map(s => [s.aggregateValue, s.endTheta - s.startTheta]), [[5, 180], [5, 180]]);
  return d;
});
probe("P03", "Donut ratio and degree padding use the existing arc editor", "accepted", () => weighted(arcBase()),
  p => p.editArcMark({ target: "pie", innerRadius: 0.55, padAngle: 2 }), p => {
    const d = arcDetails(p);
    assert.ok(d.sectors.every(s => Math.abs(s.innerRadius - 110) < 1e-10 && s.outerRadius === 200));
    return d;
  });
probe("P04", "Explicit nominal numeric categories remain count partitions", "accepted",
  () => arcBase([{ c: 2 }, { c: 2 }, { c: 3 }]), count, p => {
    assert.deepEqual(arcDetails(p).sectors.map(s => s.count), [2, 1]); return arcDetails(p);
  });
probe("P05", "Zero-total category has no sector but remains in the color legend domain", "accepted",
  () => arcBase([{ c: "A", v: 0 }, { c: "B", v: 5 }]),
  p => fulfillFacadeGuides(weighted(p).encodeColor({ target: "pie", field: "c" }), { axes: false, grid: false }, "pie"), p => {
    assert.equal(items(p, "pie").length, 1);
    assert.deepEqual(p.guideConfigs.legend.color.domain, ["A", "B"]);
    return { ...arcDetails(p), legendDomain: p.guideConfigs.legend.color.domain };
  });
for (const [id, claim, rows] of [
  ["P06", "Negative weight rejects", [{ c: "A", v: -1 }]],
  ["P07", "Nonfinite weight rejects", [{ c: "A", v: Infinity }]],
  ["P08", "All-zero weights reject", [{ c: "A", v: 0 }]],
  ["P09", "Missing category rejects", [{ v: 1 }]]
]) probe(id, claim, "rejected", () => arcBase(rows), weighted);
probe("P10", "Color field can differ when constant within each final slice", "accepted", () => weighted(arcBase()),
  p => p.encodeColor({ target: "pie", field: "color" }), arcDetails);
probe("P11", "Color varying within one final slice rejects", "rejected",
  () => count(arcBase([{ c: "A", color: "warm" }, { c: "A", color: "cool" }])),
  p => p.encodeColor({ target: "pie", field: "color" }));
probe("P12", "Lower field color rejects a preconfigured scalar arc fill", "rejected",
  () => base(pieRows).createArcMark({ id: "pie", data: "source", fill: "black" }),
  p => count(p).encodeColor({ target: "pie", field: "c" }));
const pieGuides = p => fulfillFacadeGuides(p, { axes: false, grid: false }, "pie");
probe("P13", "Existing facade planner reuses compatible arc legend", "accepted",
  () => pieGuides(count(arcBase()).encodeColor({ target: "pie", field: "c" })), pieGuides, (p, before) => {
    assert.deepEqual(p.graphicSpec, before.graphicSpec); return { guides: p.semanticSpec.guides };
  });
probe("P14", "Legend-only facade policy without color is a valid no-op", "accepted", () => count(arcBase()), pieGuides,
  p => { assert.deepEqual(p.semanticSpec.guides, {}); return { guides: p.semanticSpec.guides }; });
probe("P15", "Cartesian facade axis planner does not support pie axes", "rejected", () => count(arcBase()),
  p => fulfillFacadeGuides(p, { axes: {}, grid: false, legend: false }, "pie"));
probe("P16", "Facade legend targeting a different layer rejects", "rejected",
  () => count(arcBase()).encodeColor({ target: "pie", field: "c" }),
  p => fulfillFacadeGuides(p, { axes: false, grid: false, legend: { target: "other" } }, "pie"));
probe("P17", "Theta reassignment sum to count clears stale weight", "accepted", () => weighted(arcBase()), count, p => {
  assert.equal(layer(p, "pie").encoding.theta.weight, undefined); return arcDetails(p);
});
probe("P18", "A reversed partial sweep preserves the weighted partition", "accepted", arcBase,
  p => p.encodeTheta({ target: "pie", field: "c", aggregate: "sum", weight: "v", scale: { range: [180, 0] } }), p => {
    assert.deepEqual(arcDetails(p).sectors.map(s => [s.startTheta, s.endTheta]), [[180, 90], [90, 0]]); return arcDetails(p);
  });
probe("P19", "Existing explicit theta scale domain controls category order", "accepted", arcBase,
  p => p.encodeTheta({ target: "pie", field: "c", aggregate: "count", scale: { domain: ["B", "A"] } }), p => {
    assert.deepEqual(arcDetails(p).sectors.map(s => s.key), ["B", "A"]); return arcDetails(p);
  });

probe("D01", "Baseline density preserves current KDE defaults", "accepted", densityBase, p => density(p), p => {
  assert.equal(data(p, "density").values.length, 100);
  assert.equal(items(p, "density").length, 1); return statisticalDetails("density")(p);
});
probe("D02", "densityChannel x swaps value/density roles and guide titles", "accepted", densityBase,
  p => fulfillFacadeGuides(density(p, { densityChannel: "x" }), {}, "density"), p => {
    assert.equal(layer(p, "density").encoding.x.field, "v_density");
    assert.equal(p.semanticSpec.guides.axis.x.title, "Density"); return statisticalDetails("density")(p);
  });
probe("D03", "Explicit grouping creates separate profiles without automatic color", "accepted", densityBase,
  p => density(p, { groupBy: "g" }), p => {
    assert.equal(items(p, "density").length, 2);
    assert.equal(layer(p, "density").encoding.color, undefined); return statisticalDetails("density")(p);
  });
probe("D04", "Grouped color can use the retained group field with guides", "accepted", densityBase,
  p => fulfillFacadeGuides(density(p, { groupBy: "g" }).encodeColor({ target: "density", field: "g" }), {}, "density"),
  statisticalDetails("density"));
probe("D05", "Raw series-constant metadata is absent from the derived density dataset", "rejected",
  () => density(densityBase(), { groupBy: "g" }), p => p.encodeColor({ target: "density", field: "region" }));
probe("D06", "Finite numeric rows and valid nominal groups survive; invalid rows are filtered", "accepted",
  () => densityBase([...densityRows, { v: null, g: "A" }, { v: 2, g: null }]),
  p => density(p, { groupBy: "g", bandwidth: 1, extent: [0, 6], steps: 7 }), p => {
    const reference = density(densityBase(), { groupBy: "g", bandwidth: 1, extent: [0, 6], steps: 7 });
    assert.deepEqual(data(p, "density").values, data(reference, "density").values); return statisticalDetails("density")(p);
  });
probe("D07", "No finite sample rejects", "rejected", () => densityBase([{ v: null }]), p => density(p));
probe("D08", "Constant sample rejects automatic bandwidth", "rejected", () => densityBase([{ v: 3 }, { v: 3 }]), p => density(p));
probe("D09", "Singleton sample accepts explicit bandwidth and extent", "accepted", () => densityBase([{ v: 3 }]),
  p => density(p, { bandwidth: 1, extent: [0, 6], steps: 7 }), statisticalDetails("density"));
probe("D10", "Count normalization multiplies unit profile by retained group sample count", "accepted", densityBase,
  p => density(p, { groupBy: "g", bandwidth: 1, extent: [0, 6], steps: 7, normalization: "count" }), p => {
    const unit = data(density(densityBase(), { groupBy: "g", bandwidth: 1, extent: [0, 6], steps: 7 }), "density").values;
    data(p, "density").values.forEach((row, i) => assert.ok(Math.abs(row.v_density - unit[i].v_density * 2) < 1e-14));
    return statisticalDetails("density")(p);
  });
probe("D11", "Derived output identity collision rejects", "rejected",
  () => densityBase().createData({ id: "densityDensityData", values: [{ v: 1 }] }), p => density(p));
probe("D12", "A one-step density grid rejects", "rejected", densityBase, p => density(p, { steps: 1 }));
probe("D13", "Statistical edit creates a new density snapshot without changing owner", "accepted",
  () => density(densityBase()), p => p.editDensity({ target: "density", bandwidth: 0.5 }), (p, before) => {
    assert.notEqual(data(p, "density").id, data(before, "density").id);
    assert.equal(data(p, "density").source, "source"); return statisticalDetails("density")(p);
  });
probe("D14", "editDensity has no orientation option", "rejected", () => density(densityBase()),
  p => p.editDensity({ target: "density", densityChannel: "x" }));
probe("D15", "Color varying over the sampled profile rejects", "rejected", () => density(densityBase(), { groupBy: "g" }),
  p => p.encodeColor({ target: "density", field: "v_value", fieldType: "nominal" }));
probe("D16", "Density magnitude domain must include the zero baseline", "rejected", densityBase,
  p => density(p, { densityScale: { domain: [1, 2] } }));

probe("H01", "Signed Horizon creates six ordinary paths with opaque band defaults", "accepted", horizonBase, p => horizon(p), p => {
  assert.equal(items(p, "horizon").length, 6);
  assert.equal(p.markConfigs.horizon.opacity, 1); return statisticalDetails("horizon")(p);
});
probe("H02", "Existing facade planner creates only original x axis and vertical grid", "accepted", horizonBase,
  p => fulfillFacadeGuides(horizon(p), {}, "horizon"), p => {
    assert.deepEqual(Object.keys(p.semanticSpec.guides.axis), ["x"]);
    assert.deepEqual(Object.keys(p.semanticSpec.guides.grid), ["vertical"]);
    assert.equal(p.semanticSpec.guides.legend, undefined); return statisticalDetails("horizon")(p);
  });
probe("H03", "Explicit lower y axis can display folded internal values", "accepted", () => horizon(horizonBase()),
  p => p.createYAxis({ scale: "horizonHorizonAmplitude" }), p => {
    assert.equal(p.semanticSpec.guides.axis.y.scale, "horizonHorizonAmplitude");
    return { guides: p.semanticSpec.guides, foldedDomain: p.resolvedScales.horizonHorizonAmplitude.domain };
  });
probe("H04", "Explicit lower legend can expose internal Horizon band keys", "accepted", () => horizon(horizonBase()),
  p => p.createLegend({ target: "horizon" }), p => {
    assert.ok(p.guideConfigs.legend.color.domain.includes("negative:0"));
    return { guides: p.semanticSpec.guides, legendDomain: p.guideConfigs.legend.color.domain };
  });
probe("H05", "All-baseline Horizon is intentionally empty with a valid x domain", "accepted",
  () => horizonBase([{ t: 0, v: 5 }, { t: 1, v: 5 }]), p => horizon(p, { baseline: 5 }), p => {
    assert.equal(items(p, "horizon").length, 0);
    assert.deepEqual(p.resolvedScales.x.domain, [0, 1]); return statisticalDetails("horizon")(p);
  });
probe("H06", "Multiple unattached Cartesian coordinates require an explicit choice", "rejected",
  () => horizonBase().createCoordinate({ id: "one" }).createCoordinate({ id: "two" }), p => horizon(p));
probe("H07", "Existing coordinate action attaches the intended Horizon owner without new encode options", "accepted",
  () => horizonBase().createCoordinate({ id: "one" }).createCoordinate({ id: "two" }),
  p => horizon(p.createCoordinate({ id: "two", type: "cartesian", layers: ["horizon"] })), p => {
    assert.equal(layer(p, "horizon").coordinate, "two"); return statisticalDetails("horizon")(p);
  });
probe("H08", "encodeHorizon currently rejects a coordinate option", "rejected", horizonBase,
  p => horizon(p, { coordinate: "custom" }));
probe("H09", "Horizon encoding resets an earlier area opacity to one", "accepted",
  () => base(horizonRows).createAreaMark({ id: "horizon", data: "source", opacity: 0.3 }), p => horizon(p), p => {
    assert.equal(p.markConfigs.horizon.opacity, 1); return statisticalDetails("horizon")(p);
  });
probe("H10", "Post-encoding area editor restores explicit opacity", "accepted", horizonBase,
  p => horizon(p).editAreaMark({ target: "horizon", opacity: 0.3 }), p => {
    assert.ok(items(p, "horizon").every(i => i.properties.opacity === 0.3)); return statisticalDetails("horizon")(p);
  });
probe("H11", "Explicit timestamp unit is preserved in Horizon provenance", "accepted",
  () => horizonBase([{ t: 1000, v: -2 }, { t: 2000, v: 2 }]),
  p => horizon(p, { x: { field: "t", fieldType: "temporal", temporalUnit: "timestamp", scale: { nice: false } } }), p => {
    assert.deepEqual(p.resolvedScales.x.domain, [1000, 2000]); return statisticalDetails("horizon")(p);
  });
probe("H12", "Explicit false keeps Horizon ungrouped through JSON", "accepted", horizonBase,
  p => horizon(p, clean({ groupBy: false })), p => {
    assert.equal(data(p, "horizon").transform[0].groupBy, undefined); return statisticalDetails("horizon")(p);
  });
probe("H13", "Grouped Horizon overlays profiles in one coordinate, without panel layout", "accepted",
  () => horizonBase([...horizonRows, { t: 0, v: -2, g: "B" }, { t: 1, v: 2, g: "B" }]),
  p => horizon(p, { groupBy: "g" }), p => {
    assert.equal(p.semanticSpec.layers.length, 1);
    assert.equal(p.semanticSpec.coordinates.length, 1); return statisticalDetails("horizon")(p);
  });
probe("H14", "Horizon edit revises the snapshot and preserves edited opacity", "accepted",
  () => horizon(horizonBase()).editAreaMark({ target: "horizon", opacity: 0.3 }),
  p => p.editHorizon({ target: "horizon", bands: 2 }), (p, before) => {
    assert.notEqual(data(p, "horizon").id, data(before, "horizon").id);
    assert.equal(p.markConfigs.horizon.opacity, 0.3); return statisticalDetails("horizon")(p);
  });
probe("H15", "Zero Horizon bands reject", "rejected", horizonBase, p => horizon(p, { bands: 0 }));
probe("H16", "Original-value y domain is invalid for folded Horizon scale", "rejected", horizonBase,
  p => horizon(p, { y: { field: "v", scale: { domain: [-4, 4] } } }));

const snapshot = { baselineCommit, sourceTree,
  command: "node agent_docs/impl/roadmap6/phase3/baseline.probes.mjs", cases: result };
const destination = new URL("baseline-results.json", import.meta.url);
if (process.argv.includes("--record")) fs.writeFileSync(destination, JSON.stringify(snapshot, null, 2) + "\n");
else assert.deepEqual(snapshot, JSON.parse(fs.readFileSync(destination, "utf8")));
console.log(`${result.length}/${result.length} baseline observations verified; all earlier programs/traces unchanged.`);
for (const item of result) console.log(`${item.id} ${item.outcome}: ${item.error ?? item.claim}`);
