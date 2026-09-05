import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";

const rows = [0, 1].flatMap(g => [1, 2, 3].map(x => ({ x, time: g * 3 + x,
  y: 2 * x + g * 4 + x % 2, group: g ? "B" : "A", auto: g ? "B" : "A", other: x % 2 ? "odd" : "even" })));
function source() { return chart().createCanvas().createData({ id: "rows", values: rows }); }
function transform(program, type) {
  return program.semanticSpec.datasets.flatMap(dataset => dataset.transform ?? []).findLast(t => t.type === type);
}
const json = value => JSON.parse(JSON.stringify(value));

test("Regression JSON false overrides inference while omission and explicit undefined keep their existing meanings", () => {
  const points = source().createScatterPlot({ x: "x", y: "y", color: "group", guides: false });
  assert.equal(transform(points.createRegression({ band: false }), "regression").groupBy, "group");
  for (const options of [{ groupBy: undefined }, json({ groupBy: false })]) {
    const result = points.createRegression({ ...options, band: false });
    assert.equal(transform(result, "regression").groupBy, undefined);
  }
  assert.equal(transform(points.createRegression({ groupBy: "auto", band: false }), "regression").groupBy, "auto");
  const ambiguous = points.encodeShape({ field: "other" });
  assert.throws(() => ambiguous.createRegression({ band: false }), /ambiguous/);
  assert.equal(transform(ambiguous.createRegression({ groupBy: false, band: false }), "regression").groupBy, undefined);
  const regression = points.createRegression({ band: false });
  assert.equal(transform(regression.editRegression({ line: { strokeWidth: 3 } }), "regression").groupBy, "group");
  assert.throws(() => regression.editRegression({ groupBy: undefined }), /groupBy/);
  assert.equal(transform(regression.editRegression(json({ groupBy: false })), "regression").groupBy, undefined);
  assert.throws(() => points.createRegression({ groupBy: "" }), /groupBy/);
});

test("Density JSON false matches ungrouped omission and editors preserve or explicitly clear groups", () => {
  for (const options of [{}, { groupBy: undefined }, json({ groupBy: false })]) {
    assert.equal(transform(source().createAreaMark().encodeDensity({ field: "y", ...options }), "density").groupBy, undefined);
  }
  const density = source().createAreaMark().encodeDensity({ field: "y", groupBy: "auto" });
  assert.equal(transform(density.editDensity({ bandwidth: 1 }), "density").groupBy, "auto");
  assert.throws(() => density.editDensity({ groupBy: undefined }), /groupBy/);
  assert.equal(transform(density.editDensity(json({ groupBy: false })), "density").groupBy, undefined);
  assert.throws(() => source().createAreaMark().encodeDensity({ field: "y", groupBy: "" }), /groupBy/);
  assert.throws(() => source().createDensityData({ id: "invalid", field: "y", groupBy: false }), /groupBy/);
});

test("Horizon JSON false suppresses stored inference and its editor rejects explicit undefined", () => {
  const area = source().createAreaMark().encodeX({ field: "time" }).encodeY({ field: "y" }).encodeGroup({ field: "group" });
  for (const options of [{}, { groupBy: undefined }]) {
    assert.equal(transform(area.encodeHorizon(options), "horizon").groupBy, "group");
  }
  assert.equal(transform(area.encodeHorizon(json({ groupBy: false })), "horizon").groupBy, undefined);
  const horizon = area.encodeHorizon({ groupBy: "auto" });
  assert.equal(transform(horizon.editHorizon({ bands: 2 }), "horizon").groupBy, "auto");
  assert.throws(() => horizon.editHorizon({ groupBy: undefined }), /groupBy/);
  assert.equal(transform(horizon.editHorizon(json({ groupBy: false })), "horizon").groupBy, undefined);
  assert.throws(() => area.encodeHorizon({ groupBy: "" }), /groupBy/);
  const prior = transform(horizon, "horizon");
  assert.throws(() => source().createHorizonData({ id: "invalid", source: "rows", x: prior.x, y: prior.y, as: prior.as, groupBy: false }), /groupBy/);
  assert.throws(() => source().createRegressionData({ id: "invalid", x: "x", y: "y", groupBy: false }), /groupBy/);
});
