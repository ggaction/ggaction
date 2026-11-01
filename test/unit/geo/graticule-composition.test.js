import assert from "node:assert/strict";
import test from "node:test";
import { createGraticuleComparison, refreshGraticuleComparison, graticuleMeasurements } from "../../../examples/geographic-marks/comparison.js";
import { getMarkItems } from "../../../src/inspection.js";
import { serializeProgram, deserializeProgram } from "../../../src/persistence.js";
const gridItems = p => getMarkItems(p.children.grid, { target: "graticule" });
const points = p => getMarkItems(p.children.analysis, { target: "values" });
const labels = p => p.children.analysis.graphicSpec.objects.colorLegendLabels.items.map(item => item.properties.text);
const ticks = p => p.children.analysis.graphicSpec.objects.xAxisTicks.items.map(item => item.properties.x1);
const originalFields = [
  ["longitude", -40], ["longitude", 0], ["longitude", 40],
  ["latitude", -20], ["latitude", 0], ["latitude", 20]
];

test("graticule raw typed axis and degree values drive an explicitly isolated analytical scale and legend", () => {
  const p = createGraticuleComparison(), before = serializeProgram(p), grid = p.children.grid;
  assert.deepEqual(gridItems(p).map(item => [item.fields.axis, item.fields.value]), originalFields);
  assert.deepEqual(points(p).map(item => [item.fields.axis, item.fields.value]), originalFields);
  assert.deepEqual(points(p).map(item => item.fields.id), gridItems(p).map(item => item.key));
  assert.deepEqual(points(p).map(item => item.properties.x), [40, 190, 340, 115, 190, 265]);
  assert.deepEqual(labels(p), ["longitude", "latitude"]);
  const colored = p.encodeColor({ target: { childPath: ["analysis"], id: "values" }, field: "sign" });
  assert.deepEqual(labels(colored), ["negative", "zero", "positive"]);
  assert.deepEqual(points(colored).map(item => item.properties.fill), ["#dc2626", "#2563eb", "#059669", "#dc2626", "#2563eb", "#059669"]);
  const scaled = colored.editScale({ target: { childPath: ["analysis"] }, id: "degrees", domain: [-80, 80] });
  assert.deepEqual(points(scaled).map(item => item.properties.x), [115, 190, 265, 152.5, 190, 227.5]);
  assert.deepEqual(ticks(p), [40, 190, 340]); assert.deepEqual(ticks(scaled), [115, 190, 265]);
  for (const q of [colored, scaled]) {
    assert.equal(q.children.grid, grid); assert.equal(q.children.grid.graphicSpec, grid.graphicSpec);
    assert.equal(q.children.grid.semanticSpec.resources, grid.semanticSpec.resources);
  }
  const moved = scaled.editProjection({ target: { childPath: ["grid"], id: "map" }, translatePx: [325, 247] });
  assert.equal(moved.children.analysis, scaled.children.analysis);
  assert.deepEqual(graticuleMeasurements(moved.children.grid), graticuleMeasurements(grid));
  assert.notDeepEqual(moved.children.grid.graphicSpec, grid.graphicSpec);
  const projection = moved.children.grid.semanticSpec.resources.find(resource => resource.kind === "projection");
  assert.equal(projection.revision, 1);
  const denser = moved.editGraticule({ target: { childPath: ["grid"], id: "graticule" }, stepDeg: [20, 20] });
  const expected = [["longitude", -40], ["longitude", -20], ["longitude", 0], ["longitude", 20], ["longitude", 40], ["latitude", -20], ["latitude", 0], ["latitude", 20]];
  assert.deepEqual(gridItems(denser).map(item => [item.fields.axis, item.fields.value]), expected);
  assert.equal(denser.children.analysis, scaled.children.analysis);
  assert.equal(denser.children.grid.semanticSpec.resources.find(resource => resource.kind === "projection"), projection);
  for (const previous of gridItems(p)) assert.equal(gridItems(denser).find(item => item.fields.axis === previous.fields.axis && item.fields.value === previous.fields.value).key, previous.key);
  const revised = refreshGraticuleComparison(denser);
  assert.equal(revised.children.grid, denser.children.grid);
  assert.deepEqual(points(revised).map(item => [item.fields.axis, item.fields.value]), expected);
  assert.deepEqual(points(revised).map(item => item.fields.id), gridItems(denser).map(item => item.key));
  assert.deepEqual(points(revised).map(item => item.rows[0].revision), Array(8).fill(1));
  assert.deepEqual(points(revised).map(item => item.properties.x), [115, 152.5, 190, 227.5, 265, 152.5, 190, 227.5]);
  assert.deepEqual(ticks(revised), ticks(scaled)); assert.deepEqual(labels(revised), labels(scaled));
  const restored = deserializeProgram(serializeProgram(revised));
  assert.deepEqual(restored.graphicSpec, revised.graphicSpec); assert.deepEqual(gridItems(restored), gridItems(revised)); assert.deepEqual(points(restored), points(revised));
  assert.throws(() => p.editGraticule({ target: { childPath: ["grid"], id: "graticule" }, stepDeg: [0, 20] }), /step/i);
  assert.equal(serializeProgram(p), before);
});
