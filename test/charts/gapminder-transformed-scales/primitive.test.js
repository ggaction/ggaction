import assert from "node:assert/strict";
import test from "node:test";

import { loadGapminder } from "../../support/data.js";
import { createGapminderTransformedScalePrimitives } from "./primitive.program.js";
import { createGapminderTransformedScaleValues } from "./reference-values.js";

const gapminder = loadGapminder();

test("independently resolves the Gate A filter and transformed mappings", () => {
  const values = createGapminderTransformedScaleValues(gapminder);
  assert.equal(values.rows.length, 62);
  assert.deepEqual(values.domains.x, [100_000, 10_000_000_000]);
  assert.deepEqual(values.domains.y, [0, 8]);
  assert.deepEqual(values.domains.color, [52.1, 82.5]);

  const afghanistan = values.rows.findIndex(row => row.country === "Afghanistan");
  assert.equal(afghanistan, 0);
  assert.ok(Math.abs(values.points[afghanistan].x - 201.10461570878223) < 1e-9);
  assert.ok(Math.abs(values.points[afghanistan].y - 72.51462408014194) < 1e-9);
  assert.equal(values.points[afghanistan].fill, "#433f85");
  assert.deepEqual(values.axes.x.labels, ["100K", "1M", "10M", "100M", "1B", "10B"]);
  assert.deepEqual(values.axes.y.labels, ["0", "2", "4", "6", "8"]);
  assert.equal(values.legend.gradient[0].fill, "#f8e722");
  assert.equal(values.legend.gradient.at(-1).fill, "#450457");
});

test("authors the Gate A semantics and concrete drawing order with primitives only", () => {
  const program = createGapminderTransformedScalePrimitives(gapminder);
  const datasets = Object.fromEntries(
    program.semanticSpec.datasets.map(dataset => [dataset.id, dataset])
  );
  const scales = Object.fromEntries(
    program.semanticSpec.scales.map(scale => [scale.id, scale])
  );

  assert.equal(datasets.data.values.length, 682);
  assert.equal(datasets.gapminder2005.source, "data");
  assert.equal(datasets.gapminder2005.values.length, 62);
  assert.deepEqual(datasets.gapminder2005.transform, [{
    type: "filter",
    field: "year",
    predicate: { op: "eq", value: 2005 }
  }]);
  assert.deepEqual(scales.x, {
    id: "x",
    type: "log",
    base: 10,
    domain: "auto",
    range: "auto",
    nice: true
  });
  assert.deepEqual(scales.y, {
    id: "y",
    type: "sqrt",
    domain: "auto",
    range: "auto",
    nice: true,
    zero: false
  });
  assert.deepEqual(scales.color, {
    id: "color",
    type: "sequential",
    domain: "auto",
    range: { palette: { name: "viridis" } },
    interpolate: "rgb"
  });

  assert.deepEqual(program.graphicSpec.order, [
    "canvas", "horizontalGridLines", "verticalGridLines", "point",
    "colorGradientStrips", "xAxisLine", "xAxisTicks", "xAxisLabels",
    "xAxisTitle", "yAxisLine", "yAxisTicks", "yAxisLabels", "yAxisTitle",
    "colorGradientTicks", "colorGradientLabels", "colorGradientTitle",
    "chartTitle", "chartSubtitle"
  ]);
  assert.equal(program.graphicSpec.objects.point.children.length, 62);
  assert.equal(program.graphicSpec.objects.colorGradientStrips.children.length, 60);
  assert.equal(program.graphicSpec.objects.verticalGridLines.children.length, 6);
  assert.equal(program.graphicSpec.objects.horizontalGridLines.children.length, 5);
  assert.ok(program.trace.children.length > 150);
  assert.equal(program.trace.children.every(node =>
    ["editSemantic", "createGraphics", "editGraphics"].includes(node.op)
  ), true);
});
