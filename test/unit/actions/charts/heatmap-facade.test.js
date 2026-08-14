import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";

const rows = Object.freeze([
  Object.freeze({ x: "A", y: "one", value: 1, group: "low" }),
  Object.freeze({ x: "B", y: "one", value: 2, group: "high" }),
  Object.freeze({ x: "A", y: "two", value: 3, group: "high" })
]);

function base(values = rows) {
  return chart()
    .createCanvas({ width: 400, height: 300, margin: 60 })
    .createData({ values });
}

test("creates the shortest pre-gridded heatmap with one rect per observed row", () => {
  const source = base().editCanvas({ margin: { right: 80 } });
  const program = source.createHeatmap({
    x: { field: "x", fieldType: "ordinal" },
    y: { field: "y", fieldType: "nominal" },
    color: { field: "value", fieldType: "quantitative" }
  });
  const layer = program.semanticSpec.layers[0];

  assert.equal(layer.id, "heatmap");
  assert.equal(layer.mark.type, "rect");
  assert.equal(program.graphicSpec.objects.heatmap.items.length, rows.length);
  assert.deepEqual(program.trace.children.at(-1).children.map(child => child.op), [
    "createRectMark", "encodeX", "encodeY", "encodeColor", "createGuides"
  ]);
  assert.equal(source.semanticSpec.layers.length, 0);
});

test("does not synthesize missing combinations", () => {
  const program = base().createHeatmap({
    x: { field: "x", fieldType: "ordinal" },
    y: { field: "y", fieldType: "nominal" },
    color: { field: "value", fieldType: "quantitative" },
    guides: false
  });

  assert.deepEqual(
    program.graphicSpec.objects.heatmap.items.map(item => item.id),
    ["heatmap:0", "heatmap:1", "heatmap:2"]
  );
});

test("forwards quantitative color, outline appearance, and guide options immutably", () => {
  const options = {
    id: "cells",
    x: { field: "x", fieldType: "ordinal", scale: { reverse: true } },
    y: { field: "y", fieldType: "nominal" },
    color: {
      field: "value",
      fieldType: "quantitative",
      scale: { type: "sequential", palette: "viridis" }
    },
    rect: { opacity: 0.8, stroke: "white", strokeWidth: 1 },
    guides: false
  };
  const program = base().createHeatmap(options);
  const item = program.graphicSpec.objects.cells.items[0].properties;

  assert.equal(program.resolvedScales.x.range[0] > program.resolvedScales.x.range[1], true);
  assert.equal(item.opacity, 0.8);
  assert.equal(item.stroke, "white");
  assert.equal(item.strokeWidth, 1);
  assert.deepEqual(program.trace.children.at(-1).children.map(child => child.op), [
    "createRectMark", "encodeX", "encodeY", "encodeColor"
  ]);
  options.x.scale.reverse = false;
  options.rect.opacity = 0.2;
  assert.equal(program.resolvedScales.x.range[0] > program.resolvedScales.x.range[1], true);
  assert.equal(program.graphicSpec.objects.cells.items[0].properties.opacity, 0.8);
});

test("supports nominal color shorthand through the existing color policy", () => {
  const program = base().createHeatmap({
    x: { field: "x", fieldType: "ordinal" },
    y: { field: "y", fieldType: "nominal" },
    color: "group",
    guides: false
  });

  assert.equal(program.semanticSpec.layers[0].encoding.color.fieldType, "nominal");
  assert.equal(program.resolvedScales.color.type, "ordinal");
});

test("rematerializes cells after Canvas and scale edits", () => {
  const program = base().createHeatmap({
    x: { field: "x", fieldType: "ordinal" },
    y: { field: "y", fieldType: "nominal" },
    color: { field: "value", fieldType: "quantitative" },
    guides: false
  });
  const resized = program.editCanvas({ width: 500, height: 340 });
  const reversed = resized.editScale({ id: "color", reverse: true });

  assert.notEqual(
    resized.graphicSpec.objects.heatmap.items[0].properties.width,
    program.graphicSpec.objects.heatmap.items[0].properties.width
  );
  assert.notEqual(
    reversed.graphicSpec.objects.heatmap.items[0].properties.fill,
    resized.graphicSpec.objects.heatmap.items[0].properties.fill
  );
});

test("rejects missing and conflicting heatmap facade options atomically", () => {
  const source = base();
  const position = {
    x: { field: "x", fieldType: "ordinal" },
    y: { field: "y", fieldType: "nominal" }
  };

  assert.throws(
    () => source.createHeatmap(position),
    /createHeatmap color must be a field string or a plain object/
  );
  assert.throws(
    () => source.createHeatmap({ ...position, color: "group", rect: { fill: "red" } }),
    /Unknown createHeatmap rect option "fill"/
  );
  assert.throws(
    () => source.createHeatmap({
      ...position,
      color: { field: "value", fieldType: "quantitative", target: "other" }
    }),
    /target and coordinate are owned by the chart facade/
  );
  assert.equal(source.semanticSpec.layers.length, 0);
  assert.equal(source.trace.children.length, 2);
});

test("uses current data and requires an explicit id after the stable role is occupied", () => {
  const source = chart()
    .createCanvas({ width: 400, height: 300, margin: 60 })
    .createData({ id: "first", values: rows })
    .createData({ id: "current", values: rows });
  const first = source.createHeatmap({
    x: { field: "x", fieldType: "ordinal" },
    y: { field: "y", fieldType: "nominal" },
    color: { field: "value", fieldType: "quantitative" },
    guides: false
  });

  assert.equal(first.semanticSpec.layers[0].data, "current");
  assert.throws(
    () => first.createHeatmap({
      x: { field: "x", fieldType: "ordinal" },
      y: { field: "y", fieldType: "nominal" },
      color: { field: "value", fieldType: "quantitative" },
      guides: false
    }),
    /requires an explicit createheatmap id/
  );
});

test("creates the shortest binned heatmap through one generated 2D-bin dataset", () => {
  const source = chart()
    .createCanvas({ width: 400, height: 300, margin: 60 })
    .createData({ values: [
      { x: 0, y: 0 },
      { x: 1, y: 1 }
    ] });
  const program = source.createHeatmap({
    x: "x",
    y: "y",
    bin: {},
    guides: false
  });
  const dataset = program.semanticSpec.datasets.find(
    item => item.id === "heatmapBin2DData"
  );
  const layer = program.semanticSpec.layers[0];

  assert.equal(dataset.values.length, 100);
  assert.equal(
    dataset.values.reduce(
      (sum, row) => sum + row.__heatmapBin2DData_count,
      0
    ),
    2
  );
  assert.equal(dataset.transform[0].includeEmpty, true);
  assert.equal(layer.data, "heatmapBin2DData");
  assert.deepEqual(Object.keys(layer.encoding), ["x", "x2", "y", "y2", "color"]);
  assert.equal(program.graphicSpec.objects.heatmap.items.length, 100);
  assert.deepEqual(program.trace.children.at(-1).children.map(child => child.op), [
    "createBin2DData",
    "createRectMark",
    "encodeX",
    "encodeX2",
    "encodeY",
    "encodeY2",
    "encodeColor"
  ]);
  assert.equal(source.semanticSpec.datasets.length, 1);
  assert.equal(source.semanticSpec.layers.length, 0);
});

test("renders finite cells when a binned heatmap spans the full finite range", () => {
  const program = chart()
    .createCanvas({ width: 400, height: 300, margin: 60 })
    .createData({ values: [
      { x: -1e308, y: 0 },
      { x: 1e308, y: 1 }
    ] })
    .createHeatmap({
      x: "x",
      y: "y",
      bin: { bins: { x: 2, y: 1 } },
      guides: false
    });
  const dataset = program.semanticSpec.datasets.at(-1);

  assert.deepEqual(dataset.transform[0].resolved.edges.x, [-1e308, 0, 1e308]);
  assert.equal(program.graphicSpec.objects.heatmap.items.length, 2);
  assert.equal(
    program.graphicSpec.objects.heatmap.items.every(item =>
      ["x", "y", "width", "height"].every(property =>
        Number.isFinite(item.properties[property])
      )
    ),
    true
  );
});

test("rejects unrepresentable and excessive binned heatmap grids atomically", () => {
  const source = chart()
    .createCanvas({ width: 400, height: 300, margin: 60 })
    .createData({ values: [
      { x: 1e15, y: 0 },
      { x: 1e15 + 1, y: 1 }
    ] });

  assert.throws(
    () => source.createHeatmap({
      x: "x",
      y: "y",
      bin: { bins: { x: 100, y: 1 } },
      guides: false
    }),
    /x extent cannot represent 100 distinct bins/
  );
  assert.throws(
    () => source.createHeatmap({
      x: "x",
      y: "y",
      bin: { bins: { x: 10_000, y: 101 } },
      guides: false
    }),
    /grids support at most 1000000 cells/
  );
  assert.equal(source.semanticSpec.datasets.length, 1);
  assert.equal(source.semanticSpec.layers.length, 0);
});

test("forwards binned scale and appearance options without exposing generated fields", () => {
  const program = chart()
    .createCanvas({
      width: 520,
      height: 360,
      margin: { top: 50, right: 140, bottom: 70, left: 70 }
    })
    .createData({ values: [
      { weight: 0, economy: 0 },
      { weight: 1, economy: 1 }
    ] })
    .createHeatmap({
      x: { field: "weight", scale: { domain: "auto", reverse: true } },
      y: "economy",
      bin: {
        bins: { x: 2, y: 2 },
        extent: { x: [0, 1], y: [0, 1] }
      },
      color: { scale: { palette: "blues", domain: [0, 1] } },
      rect: { opacity: 0.8, stroke: "white", strokeWidth: 1 },
      guides: {
        axes: {},
        legend: { position: "right" }
      }
    });
  const item = program.graphicSpec.objects.heatmap.items[0].properties;

  assert.equal(program.resolvedScales.x.range[0] > program.resolvedScales.x.range[1], true);
  assert.deepEqual(program.resolvedScales.x.domain, [0, 1]);
  assert.equal(item.opacity, 0.8);
  assert.equal(item.stroke, "white");
  assert.equal(program.semanticSpec.guides.axis.x.title, "weight");
  assert.equal(program.semanticSpec.guides.axis.y.title, "economy");
  assert.equal(program.semanticSpec.guides.legend.color.title, "Count");
  assert.equal(program.semanticSpec.guides.grid, undefined);
});

test("rejects mixed binned and pre-gridded ownership atomically", () => {
  const source = chart()
    .createCanvas({ width: 400, height: 300, margin: 60 })
    .createData({ values: [{ x: 0, y: 0, value: 1 }] });
  const before = source.trace.children.length;

  assert.throws(
    () => source.createHeatmap({ x: "x", y: "y", bin: null }),
    /bin must be a plain object/
  );
  assert.throws(
    () => source.createHeatmap({
      x: { field: "x", fieldType: "ordinal" },
      y: "y",
      bin: {}
    }),
    /x requires a quantitative field/
  );
  assert.throws(
    () => source.createHeatmap({
      x: { field: "x", aggregate: "mean" },
      y: "y",
      bin: {}
    }),
    /Unknown createHeatmap x option "aggregate"/
  );
  assert.throws(
    () => source.createHeatmap({
      x: "x",
      y: "y",
      bin: {},
      color: { field: "value" }
    }),
    /Unknown createHeatmap binned color option "field"/
  );
  assert.throws(
    () => source.createHeatmap({
      x: "x",
      y: "y",
      bin: {},
      guides: { axes: true }
    }),
    /guides axes must be false or a plain object/
  );
  assert.equal(source.trace.children.length, before);
  assert.equal(source.semanticSpec.layers.length, 0);
});

test("rematerializes a binned facade after Canvas, scale, and data revision changes", () => {
  const program = chart()
    .createCanvas({ width: 400, height: 300, margin: 60 })
    .createData({ values: [
      { x: 0, y: 0 },
      { x: 1, y: 1 }
    ] })
    .createHeatmap({
      x: "x",
      y: "y",
      bin: { bins: 2, extent: { x: [0, 1], y: [0, 1] } },
      guides: false
    });
  const resized = program.editCanvas({ width: 500 });
  const reversed = resized.editScale({ id: "color", reverse: true });
  const revised = reversed.createBin2DData({
    id: "heatmapBin2DData",
    x: "x",
    y: "y",
    bins: 2,
    extent: { x: [0, 1], y: [0, 1] },
    includeEmpty: false
  });

  assert.notEqual(
    resized.graphicSpec.objects.heatmap.items[0].properties.width,
    program.graphicSpec.objects.heatmap.items[0].properties.width
  );
  assert.notEqual(
    reversed.graphicSpec.objects.heatmap.items[0].properties.fill,
    resized.graphicSpec.objects.heatmap.items[0].properties.fill
  );
  assert.equal(
    revised.semanticSpec.layers[0].data,
    "heatmapBin2DDataBin2DDataRevision1"
  );
  assert.equal(revised.graphicSpec.objects.heatmap.items.length, 2);
  assert.equal(program.semanticSpec.layers[0].data, "heatmapBin2DData");
  assert.equal(program.graphicSpec.objects.heatmap.items.length, 4);
});
