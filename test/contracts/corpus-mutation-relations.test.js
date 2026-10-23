import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../src/index.js";
import { loadCars } from "../support/data.js";
import { injectMissing, renameFields, scaleNumericFields, shuffleRows } from "../support/datasets/mutations.js";

const seed = "cars-metamorphic-v1";
const rows = shuffleRows(loadCars().filter(row => Number.isFinite(row.Horsepower) && Number.isFinite(row.Miles_per_Gallon)), seed)
  .slice(0, 48).map(row => ({ x: row.Horsepower, y: row.Miles_per_Gallon, group: row.Origin }));
const original = structuredClone(rows);
const summary = (values, field = "y") => chart().createData({ id: "input", values }).createSummaryData({
  id: "summary", groupBy: "group", aggregates: [
    { op: "mean", field, as: "mean" }, { op: "sum", field, as: "sum" }, { op: "missing", field, as: "missing" }
  ]
}).semanticSpec.datasets.find(dataset => dataset.id === "summary").values;
const points = (values, x = "x", y = "y", factor = 1) => chart()
  .createCanvas({ width: 400, height: 300, margin: 30 }).createData({ values })
  .createScatterPlot({ id: "points", x: { field: x, scale: { domain: [0, 300 * factor], nice: false } },
    y: { field: y, scale: { domain: [0, 60], nice: false } }, guides: false }).graphicSpec.objects.points.items.map(item => [item.properties.x, item.properties.y]);

test(`renaming fields preserves summary values and point geometry (${seed})`, () => {
  const renamed = renameFields(rows, { x: "power", y: "mileage" });
  assert.deepEqual(summary(renamed, "mileage"), summary(rows));
  assert.deepEqual(points(renamed, "power", "mileage"), points(rows));
  assert.deepEqual(rows, original);
});

test(`rescaling data and its domain preserves geometry while changing aggregates (${seed})`, () => {
  const scaled = scaleNumericFields(rows, ["x", "y"], 8);
  const before = summary(rows), after = summary(scaled);
  for (const [index, entry] of before.entries()) {
    assert.equal(after[index].mean, entry.mean * 8);
    assert.equal(after[index].sum, entry.sum * 8);
    assert.equal(after[index].missing, entry.missing);
  }
  assert.deepEqual(points(scaleNumericFields(rows, ["x"], 8), "x", "y", 8), points(rows));
  assert.deepEqual(rows, original);
});

test(`missing-value injection agrees with an independent grouped reduction (${seed})`, () => {
  const missing = injectMissing(rows, ["y"], { every: 3 });
  for (const entry of summary(missing)) {
    const group = missing.filter(row => row.group === entry.group);
    const finite = group.filter(row => Number.isFinite(row.y)).map(row => row.y);
    assert.equal(entry.missing, group.length - finite.length);
    assert.ok(Math.abs(entry.mean - finite.reduce((sum, value) => sum + value, 0) / finite.length) < 1e-10);
  }
  assert.ok(summary(missing).some(entry => entry.missing > 0));
  assert.deepEqual(rows, original);
});

test("mutation helpers reject collisions and numeric overflow without changing input", () => {
  const values = [{ a: 1, b: 2, large: Number.MAX_VALUE }];
  const before = structuredClone(values);
  assert.throws(() => renameFields(values, { a: "b" }), /overwrite/);
  assert.throws(() => renameFields(values, { a: "x", b: "x" }), /overwrite/);
  assert.deepEqual(renameFields(values, { a: "b", b: "a" }), [{ b: 1, a: 2, large: Number.MAX_VALUE }]);
  assert.throws(() => scaleNumericFields(values, ["large"], 2), /overflow/);
  assert.deepEqual(values, before);
});

// Qualification reports distinguish selected real data from synthetic stress overlays.
const { datasetProfile } = await import("../support/datasets/profile.js");
const { mkdir, writeFile } = await import("node:fs/promises");
const output = new URL("../../.artifacts/corpus/", import.meta.url);
await mkdir(output, { recursive: true });
const reports = [];
test.after(async () => {
  await writeFile(new URL("mutation-relations.json", output), JSON.stringify({
    seed, original: rows, renamed: renameFields(rows, { x: "power", y: "mileage" }),
    rescaled: scaleNumericFields(rows, ["x", "y"], 8), missing: injectMissing(rows, ["y"], { every: 3 }),
    profile: datasetProfile(rows, { sourceRows: loadCars().length, numericFields: ["x", "y"], categoryFields: ["group"] })
  }, null, 2));
  await writeFile(new URL("size-and-pathologies.json", output), JSON.stringify(reports, null, 2));
});

for (const [count, groups, tier] of [[32, 4, "small"], [512, 32, "medium"], [4096, 256, "large"]]) {
  test(`bounded ${tier} point consumer preserves ${count} rows and ${groups} categories`, () => {
    const values = Array.from({ length: count }, (_, index) => ({ x: index % 300, y: index % 60, group: `g${index % groups}` }));
    const positions = points(values);
    assert.equal(positions.length, count);
    assert.ok(positions.every(([x, y]) => Number.isFinite(x) && Number.isFinite(y) && x >= 30 && x <= 370 && y >= 30 && y <= 270));
    const profile = datasetProfile(values, { numericFields: ["x", "y"], categoryFields: ["group"] });
    assert.equal(profile.sizeTier, tier);
    assert.equal(profile.categories.group, groups);
    reports.push({ id: `size-${tier}`, origin: "synthetic", consumer: "createScatterPlot", postcondition: "row cardinality and finite in-bounds positions", profile });
  });
}

for (const [id, values, expected] of [
  ["missing", [{ group: "a", y: null }, { group: "a", y: 4 }], { mean: 4, sum: 4, missing: 1 }],
  ["duplicates", [{ group: "a", y: 4 }, { group: "a", y: 4 }], { mean: 4, sum: 8, missing: 0 }],
  ["signed-zero", [{ group: "a", y: -4 }, { group: "a", y: 0 }, { group: "a", y: 4 }], { mean: 0, sum: 0, missing: 0 }],
  ["constant", [{ group: "a", y: 2 }, { group: "a", y: 2 }, { group: "a", y: 2 }], { mean: 2, sum: 6, missing: 0 }],
  ["large-magnitude", [{ group: "a", y: 1e100 }, { group: "a", y: 1e100 }], { mean: 1e100, sum: 2e100, missing: 0 }]
]) {
  test(`pathology ${id} retains its explicit aggregate postcondition`, () => {
    assert.deepEqual(summary(values), [{ group: "a", ...expected }]);
    reports.push({ id, origin: "synthetic-overlay", consumer: "createSummaryData", expected,
      profile: datasetProfile(values, { numericFields: ["y"], categoryFields: ["group"] }) });
  });
}
