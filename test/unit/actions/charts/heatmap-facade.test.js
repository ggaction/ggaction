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
  const source = base();
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
