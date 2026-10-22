import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";

const rows = [{ x: 0, y: 2, group: "A", value: 1 }, { x: 90, y: 3, group: "A", value: 1 },
  { x: 0, y: 4, group: "B", value: 8 }, { x: 90, y: 5, group: "B", value: 8 }];
const base = () => chart().createCanvas({ width: 900, height: 600, margin: 140 }).createData({ values: rows });

test("Parallel continuous color maps each row and creates a gradient guide", () => {
  const p = base().createParallelCoordinates({ id: "plot", dimensions: ["x", "y"], color: { field: "value", fieldType: "quantitative" } });
  assert.equal(p.graphicSpec.objects.plot.items.length, 4);
  const colors = p.graphicSpec.objects.plot.items.map(item => item.properties.stroke);
  assert.equal(colors[0], colors[1]);
  assert.equal(colors[2], colors[3]);
  assert.notEqual(colors[0], colors[2]);
  assert.ok(p.guideConfigs.legend.gradient);
  assert.deepEqual(deserializeProgram(serializeProgram(p)).graphicSpec, p.graphicSpec);
});

test("Parallel temporal appearance parses source values before continuous mapping", () => {
  const p = chart().createCanvas({ width: 900, height: 600, margin: 140 })
    .createData({ values: rows.map((row, index) => ({ ...row, date: `${2000 + index}-01-01` })) })
    .createParallelCoordinates({ id: "plot", dimensions: ["x", "y"], color: { field: "date", fieldType: "temporal" } });
  assert.equal(new Set(p.graphicSpec.objects.plot.items.map(item => item.properties.stroke)).size, 4);
  assert.ok(p.resolvedScales.color.domain.every(Number.isFinite));
});

test("Cartesian and Polar continuous color respect explicit series instead of regrouping numeric values", () => {
  for (const create of [p => p.createLinePlot({ id: "plot", x: "x", y: "y", groupBy: "group", guides: false }),
    p => p.createPolarLinePlot({ id: "plot", theta: "x", radius: "y", groupBy: "group", guides: false })]) {
    const original = create(base());
    const p = original.encodeColor({ target: "plot", field: "value", fieldType: "quantitative" }).createLegend();
    assert.equal(p.graphicSpec.objects.plot.items.length, 2);
    assert.notEqual(p.graphicSpec.objects.plot.items[0].properties.stroke, p.graphicSpec.objects.plot.items[1].properties.stroke);
    assert.ok(p.guideConfigs.legend.gradient);
    assert.throws(() => original.encodeColor({ target: "plot", field: "x", fieldType: "quantitative" }), /one value within each series/);
    assert.equal(original.semanticSpec.layers[0].encoding.color, undefined);
  }
});
