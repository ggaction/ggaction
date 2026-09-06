import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { findDataset } from "../../../../src/selectors/datasets.js";
import { findLayer } from "../../../../src/selectors/layers.js";

const rows = [
  { category: "A", group: "one", value: 1, x: 1, y: 2 },
  { category: "A", group: "one", value: 3, x: 2, y: 3 },
  { category: "B", group: "two", value: 4, x: 3, y: 5 },
  { category: "B", group: "two", value: 6, x: 4, y: 7 }
];

function base() {
  return chart()
    .createCanvas({ width: 480, height: 320, margin: 50 })
    .createData({ id: "source", values: rows });
}

test("creates center points from the exact statistical interval rows and scales", () => {
  const program = base().createIntervalPlot({
    id: "estimate",
    x: "category",
    y: { field: "value", center: "mean", extent: "stdev" },
    point: { radius: 5, fill: "#2563eb" },
    errorBar: { caps: false, stroke: "#1e3a8a" },
    guides: false
  });
  const interval = findLayer(program, "estimateInterval");
  const point = findLayer(program, "estimate");
  const transform = findDataset(program, interval.data).transform[0];
  assert.equal(point.data, interval.data);
  assert.equal(point.encoding.x.scale, interval.encoding.x.scale);
  assert.equal(point.encoding.y.scale, interval.encoding.y.scale);
  assert.equal(point.encoding.y.field, transform.as.center);
  assert.equal(program.graphicSpec.objects.estimate.items.length, 2);
  assert.equal(program.graphicSpec.objects.estimate.items.every(item =>
    item.properties.radius === 5 && item.properties.fill === "#2563eb"
  ), true);
  assert.equal(findLayer(program, "estimateIntervalLowerCap"), undefined);
  assert.deepEqual(program.trace.children.at(-1).children.map(node => node.op), [
    "createErrorBar", "createPointMark", "encodeX", "encodeY",
    "encodePointRadius"
  ]);
});

test("keeps explicit interval centers and categorical offsets aligned", () => {
  const values = [
    { category: "A", group: "one", center: 2, lower: 1, upper: 3 },
    { category: "A", group: "two", center: 4, lower: 3, upper: 5 }
  ];
  const program = chart()
    .createCanvas({ width: 480, height: 320, margin: 50 })
    .createData({ id: "source", values })
    .createIntervalPlot({
      x: { field: "category", fieldType: "nominal" },
      y: { center: "center", lower: "lower", upper: "upper" },
      xOffset: { field: "group" },
      color: "group",
      guides: false
    });
  const interval = findLayer(program, "intervalPlotInterval");
  const point = findLayer(program, "intervalPlot");
  assert.equal(point.data, "source");
  assert.equal(point.encoding.y.field, "center");
  assert.equal(point.encoding.xOffset.scale, interval.encoding.xOffset.scale);
  assert.equal(point.encoding.color.field, "group");
});

test("isolates complete interval scales from earlier chart layers", () => {
  const program = base()
    .createScatterPlot({ id: "observed", x: "x", y: "y", guides: false })
    .createIntervalPlot({
      id: "estimate",
      data: "source",
      x: { field: "category", fieldType: "nominal" },
      y: { field: "value", center: "mean", extent: "stdev" },
      guides: false
    });
  const interval = findLayer(program, "estimateInterval");
  const point = findLayer(program, "estimate");
  assert.equal(interval.encoding.x.scale, "estimateX");
  assert.equal(interval.encoding.y.scale, "estimateY");
  assert.equal(point.encoding.x.scale, "estimateX");
  assert.equal(point.encoding.y.scale, "estimateY");
  assert.equal(program.resolvedScales.estimateX.type, "point");
  assert.equal(program.resolvedScales.estimateY.type, "linear");
});

test("creates scatter and regression children while preserving serialized group:false", () => {
  const program = base().createRegressionPlot({
    id: "fit",
    x: "x",
    y: "y",
    groupBy: false,
    confidenceMethod: "normal",
    level: 0.9,
    point: { radius: 4 },
    line: { strokeWidth: 2 },
    guides: false
  });
  assert.ok(findLayer(program, "fit"));
  assert.ok(findLayer(program, "fitRegressionBands"));
  assert.ok(findLayer(program, "fitRegressionLines"));
  const transform = findDataset(program, "fitRegressionData").transform[0];
  assert.equal(transform.groupBy, undefined);
  assert.equal(transform.confidenceMethod, "normal");
  assert.equal(transform.level, 0.9);
  const regression = program.trace.children.at(-1).children.find(node =>
    node.op === "createRegression"
  );
  assert.equal(Object.hasOwn(regression.args, "groupBy"), true);
  assert.equal(regression.args.groupBy, false);
  assert.equal(JSON.parse(JSON.stringify(regression.args)).groupBy, false);
});

test("rejects invalid facade combinations without changing the caller", () => {
  const source = base();
  const before = JSON.stringify(source);
  for (const create of [
    () => source.createIntervalPlot({ x: "category", y: "value", point: { radius: -1 } }),
    () => source.createIntervalPlot({ x: "category", y: "value", errorBar: { unknown: true } }),
    () => source.createRegressionPlot({ x: "x", y: "y", method: "loess", band: {} }),
    () => source.createRegressionPlot({ x: "category", y: "y" })
  ]) {
    assert.throws(create);
    assert.equal(JSON.stringify(source), before);
  }
});
