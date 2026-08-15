import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";
import { resolveStoredSelection } from
  "../../../../src/materialization/selection/state.js";

const values = Object.freeze([
  { group: "a", value: 2, alternate: 10 },
  { group: "a", value: 3, alternate: 20 },
  { group: "b", value: 5, alternate: 40 },
  { group: "b", value: 7, alternate: 60 }
]);

function aggregateBars() {
  return chart()
    .createCanvas({
      width: 320,
      height: 240,
      margin: { top: 30, right: 100, bottom: 30, left: 30 }
    })
    .createData({ values })
    .createBarMark()
    .encodeX({ field: "group", fieldType: "nominal" })
    .encodeY({ field: "value", aggregate: "sum", stack: null })
    .encodeBarWidth({ band: 0.7 });
}

test("inherits a matching bar measure aggregate for continuous color", () => {
  const program = aggregateBars().encodeColor({
    field: "value",
    fieldType: "quantitative"
  });
  const layer = program.semanticSpec.layers.find(item => item.id === "bar");

  assert.equal(layer.encoding.color.aggregate, "sum");
  assert.deepEqual(program.resolvedScales.color.domain, [5, 12]);
  assert.equal(program.graphicSpec.objects.bar.items.length, 2);
  assert.equal(
    new Set(program.graphicSpec.objects.bar.items.map(
      child => child.properties.fill
    )).size,
    2
  );
});

test("aggregates a different bar color field at the final rect grain", () => {
  const options = {
    field: "alternate",
    fieldType: "quantitative",
    aggregate: "mean",
    scale: { domain: [0, 100], palette: "viridis" }
  };
  const snapshot = structuredClone(options);
  const program = aggregateBars().encodeColor(options);
  const layer = program.semanticSpec.layers.find(item => item.id === "bar");

  assert.equal(layer.encoding.color.aggregate, "mean");
  assert.deepEqual(program.resolvedScales.color.domain, [0, 100]);
  assert.equal(program.graphicSpec.objects.bar.items.length, 2);
  assert.deepEqual(options, snapshot);
});

test("normalizes continuous-color aggregate bars before mapping geometry", () => {
  const largeValues = Object.freeze([
    { group: "a", value: 406_131.09, alternate: 10 },
    { group: "b", value: 1_517.72, alternate: 60 }
  ]);
  const source = () => chart()
    .createCanvas({
      width: 320,
      height: 240,
      margin: { top: 30, right: 100, bottom: 30, left: 30 }
    })
    .createData({ values: largeValues })
    .createBarMark();
  const vertical = source()
    .encodeX({ field: "group", fieldType: "nominal" })
    .encodeY({ field: "value", aggregate: "sum", stack: "normalize" })
    .encodeColor({
      field: "alternate",
      fieldType: "quantitative",
      aggregate: "mean"
    });
  const horizontal = source()
    .encodeX({ field: "value", aggregate: "sum", stack: "normalize" })
    .encodeY({ field: "group", fieldType: "nominal" })
    .encodeColor({
      field: "alternate",
      fieldType: "quantitative",
      aggregate: "mean"
    });

  assert.deepEqual(vertical.resolvedScales.y.domain, [0, 1]);
  assert.deepEqual(horizontal.resolvedScales.x.domain, [0, 1]);
  assert.deepEqual(
    vertical.graphicSpec.objects.bar.items.map(item => ({
      y: item.properties.y,
      height: item.properties.height
    })),
    [
      { y: 30, height: 180 },
      { y: 30, height: 180 }
    ]
  );
  assert.deepEqual(
    horizontal.graphicSpec.objects.bar.items.map(item => ({
      x: item.properties.x,
      width: item.properties.width
    })),
    [
      { x: 30, width: 190 },
      { x: 30, width: 190 }
    ]
  );
  for (const program of [vertical, horizontal]) {
    for (const item of program.graphicSpec.objects.bar.items) {
      assert.ok(["x", "y", "width", "height"].every(property =>
        Number.isFinite(item.properties[property]) &&
        Math.abs(item.properties[property]) <= 320
      ));
    }
    assert.equal(new Set(program.graphicSpec.objects.bar.items.map(
      item => item.properties.fill
    )).size, 2);
  }
});

test("rejects ambiguous or incompatible aggregate bar color atomically", () => {
  const before = aggregateBars();

  assert.throws(
    () => before.encodeColor({
      field: "alternate",
      fieldType: "quantitative"
    }),
    /requires aggregate when its field differs/
  );
  assert.throws(
    () => before.encodeColor({
      field: "alternate",
      fieldType: "quantitative",
      aggregate: "unsupported"
    }),
    /Unsupported aggregate/
  );
  assert.equal(before.semanticSpec.layers[0].encoding.color, undefined);
  assert.equal(before.semanticSpec.scales.some(scale => scale.id === "color"), false);
});

test("creates and rematerializes a gradient legend for a bar consumer", () => {
  const program = aggregateBars()
    .encodeColor({ field: "value", fieldType: "quantitative" })
    .createLegend({ channels: ["color"] });
  const first = program.graphicSpec.objects.bar.items.map(
    child => child.properties.fill
  );
  const reversed = program.editScale({ id: "color", reverse: true });

  assert.ok(program.graphicSpec.objects.colorGradientStrips);
  assert.deepEqual(
    reversed.graphicSpec.objects.bar.items.map(child => child.properties.fill),
    [...first].reverse()
  );
  assert.notEqual(
    reversed.graphicSpec.objects.colorGradientStrips.items[0].properties.fill,
    program.graphicSpec.objects.colorGradientStrips.items[0].properties.fill
  );
});

test("rematerializes continuous bar and gradient geometry after a Canvas edit", () => {
  const program = aggregateBars()
    .encodeColor({ field: "value", fieldType: "quantitative" })
    .createLegend({ channels: ["color"] });
  const firstBarX = program.graphicSpec.objects.bar.items[0].properties.x;
  const firstLegendX = program.graphicSpec.objects.colorGradientStrips.items[0].properties.x;
  const resized = program.editCanvas({ width: 360 });

  assert.notEqual(
    resized.graphicSpec.objects.bar.items[0].properties.x,
    firstBarX
  );
  assert.notEqual(
    resized.graphicSpec.objects.colorGradientStrips.items[0].properties.x,
    firstLegendX
  );
  assert.equal(program.graphicSpec.objects.canvas.properties.width, 320);
  assert.equal(resized.graphicSpec.objects.canvas.properties.width, 360);
});

test("selects continuous-color bars at their final aggregate rect grain", () => {
  const program = aggregateBars()
    .encodeColor({
      field: "alternate",
      fieldType: "quantitative",
      aggregate: "mean"
    })
    .selectMarks({ target: "bar", channel: "color", op: "max" });
  const selection = resolveStoredSelection(program);

  assert.equal(selection.items.length, 2);
  assert.deepEqual(selection.keys, ["bar/aggregate/1"]);
  assert.deepEqual(
    selection.items.map(item => item.members.length),
    [2, 2]
  );
  assert.deepEqual(
    selection.items.map(item => item.channels.color),
    [15, 50]
  );
});
