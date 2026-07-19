import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";

const rows = Object.freeze([
  Object.freeze({ x: 1, y: 2, group: "A", size: 1, shape: "A" }),
  Object.freeze({ x: 2, y: 4, group: "A", size: 4, shape: "B" }),
  Object.freeze({ x: 1, y: 3, group: "B", size: 9, shape: "A" }),
  Object.freeze({ x: 2, y: 5, group: "B", size: 16, shape: "B" })
]);

function base(values = rows) {
  return chart()
    .createCanvas({ width: 400, height: 300, margin: 60 })
    .createData({ values });
}

test("creates the shortest scatter plot with stable defaults and wrapped children", () => {
  const source = base();
  const program = source.createScatterPlot({ x: "x", y: "y" });
  const action = program.trace.children.at(-1);

  assert.equal(program.semanticSpec.layers[0].id, "scatterPlot");
  assert.equal(program.semanticSpec.layers[0].mark.type, "point");
  assert.deepEqual(
    program.graphicSpec.objects.scatterPlot.items.map(item => item.properties.radius),
    [3, 3, 3, 3]
  );
  assert.deepEqual(action.children.map(child => child.op), [
    "createPointMark",
    "encodeX",
    "encodeY",
    "createGuides"
  ]);
  assert.equal(source.semanticSpec.layers.length, 0);
  assert.equal(source.graphicSpec.objects.scatterPlot, undefined);
});

test("forwards scatter field encodings and point appearance without retaining input", () => {
  const options = {
    x: { field: "x", scale: { reverse: true } },
    y: "y",
    color: "group",
    size: "size",
    shape: "shape",
    point: { stroke: "#111111", strokeWidth: 1 },
    guides: false
  };
  const program = base().createScatterPlot(options);
  const layer = program.semanticSpec.layers[0];

  assert.equal(layer.encoding.color.field, "group");
  assert.equal(layer.encoding.size.field, "size");
  assert.equal(layer.encoding.shape.field, "shape");
  assert.equal(program.semanticSpec.guides.axis?.x, undefined);
  assert.deepEqual(program.trace.children.at(-1).children.map(child => child.op), [
    "createPointMark",
    "encodeX",
    "encodeY",
    "encodeColor",
    "encodeSize",
    "encodeShape"
  ]);
  options.x.scale.reverse = false;
  options.point.stroke = "red";
  assert.equal(program.resolvedScales.x.range[0] > program.resolvedScales.x.range[1], true);
  assert.equal(program.graphicSpec.objects.scatterPlot.items[0].properties.stroke, "#111111");
});

test("resolves explicit, current, and unique data and rejects ambiguity", () => {
  const unique = chart()
    .createCanvas({ width: 300, height: 240, margin: 50 })
    .createData({ id: "only", values: rows });
  const current = unique
    .createData({ id: "current", values: rows })
    .createScatterPlot({ x: "x", y: "y" });
  const explicit = unique
    .createData({ id: "other", values: rows })
    .createScatterPlot({ data: "only", x: "x", y: "y" });
  const ambiguous = chart()
    .createCanvas({ width: 300, height: 240, margin: 50 })
    .createData({ id: "a", values: rows })
    .createData({ id: "b", values: rows })
    ._withContext({ currentData: undefined });

  assert.equal(current.semanticSpec.layers[0].data, "current");
  assert.equal(explicit.semanticSpec.layers[0].data, "only");
  assert.throws(
    () => ambiguous.createScatterPlot({ x: "x", y: "y" }),
    /requires data when multiple datasets/
  );
  assert.equal(ambiguous.semanticSpec.layers.length, 0);
});

test("requires an explicit id after the facade default is occupied", () => {
  const first = base().createScatterPlot({ x: "x", y: "y", guides: false });

  assert.throws(
    () => first.createScatterPlot({ x: "x", y: "y", guides: false }),
    /requires an explicit createscatterplot id/
  );
  const second = first.createScatterPlot({
    id: "secondScatter",
    x: "x",
    y: "y",
    guides: false
  });
  assert.deepEqual(second.semanticSpec.layers.map(layer => layer.id), [
    "scatterPlot",
    "secondScatter"
  ]);
});

test("rejects invalid scatter facade options atomically", () => {
  const source = base();
  assert.throws(
    () => source.createScatterPlot({ x: "x", y: "y", point: { radius: 4 } }),
    /Unknown createScatterPlot point option "radius"/
  );
  assert.throws(
    () => source.createScatterPlot({
      x: { field: "x", target: "other" },
      y: "y"
    }),
    /owned by the chart facade/
  );
  assert.equal(source.semanticSpec.layers.length, 0);
  assert.equal(source.trace.children.length, 2);
});

test("creates direct and grouped line plots through the approved hierarchy", () => {
  const direct = base().createLinePlot({ x: "x", y: "y", guides: false });
  const grouped = base().createLinePlot({
    id: "series",
    x: "x",
    y: "y",
    color: "group",
    groupBy: "group",
    strokeDash: { field: "group" },
    line: { curve: "step", strokeWidth: 3 },
    guides: {}
  });

  assert.equal(direct.graphicSpec.objects.linePlot.items.length, 1);
  assert.equal(grouped.graphicSpec.objects.series.items.length, 2);
  assert.deepEqual(grouped.trace.children.at(-1).children.map(child => child.op), [
    "createLineMark",
    "encodeX",
    "encodeY",
    "encodeColor",
    "encodeGroup",
    "encodeStrokeDash",
    "createGuides"
  ]);
});

test("creates aggregate temporal lines and preserves child validation", () => {
  const values = [
    { year: "2000-01-01", value: 1, group: "A" },
    { year: "2000-01-01", value: 3, group: "A" },
    { year: "2001-01-01", value: 2, group: "A" }
  ];
  const source = base(values);
  const program = source.createLinePlot({
    x: { field: "year", fieldType: "temporal" },
    y: { field: "value", aggregate: "mean" },
    guides: false
  });

  assert.equal(program.semanticSpec.layers[0].encoding.y.aggregate, "mean");
  assert.equal(program.graphicSpec.objects.linePlot.items[0].properties.commands.length, 2);
  assert.throws(
    () => base().createLinePlot({
      x: "x",
      y: { field: "y", aggregate: "mean" },
      guides: false
    }),
    /Aggregate line y encoding requires a temporal x encoding/
  );
  assert.equal(source.semanticSpec.layers.length, 0);
});

test("rejects ambiguous dash shorthand and Polar-only closure before authoring", () => {
  const source = base();
  assert.throws(
    () => source.createLinePlot({ x: "x", y: "y", strokeDash: "dashed" }),
    /must be an encodeStrokeDash option object/
  );
  assert.throws(
    () => source.createLinePlot({ x: "x", y: "y", line: { closed: true } }),
    /closed lines require Polar line authoring/
  );
  assert.equal(source.semanticSpec.layers.length, 0);
});
