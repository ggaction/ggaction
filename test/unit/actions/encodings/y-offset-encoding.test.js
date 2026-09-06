import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";

const values = [
  { year: 1850, perc: 1, sex: "men", job: "Actor" },
  { year: 1850, perc: 9, sex: "women", job: "Agent" },
  { year: 1860, perc: 2, sex: "men", job: "Agent" },
  { year: 1860, perc: 8, sex: "women", job: "Actor" }
];

function horizontalBarProgram() {
  return chart()
    .createCanvas({
      width: 420,
      height: 300,
      margin: { top: 30, right: 40, bottom: 50, left: 60 }
    })
    .createData({ id: "jobs", values })
    .createBarMark({ id: "bars" })
    .encodeX({ field: "perc", aggregate: "mean", scale: { zero: true } })
    .encodeY({ field: "year", fieldType: "ordinal" });
}

test("encodes horizontal grouped color through a nested yOffset action", () => {
  const program = horizontalBarProgram()
    .encodeColor({ field: "sex", layout: "group" })
    .encodeBarWidth();
  const encoding = program.semanticSpec.layers[0].encoding;
  const rectangles = program.graphicSpec.objects.bars.items.map(
    item => item.properties
  );

  assert.deepEqual(encoding.yOffset, {
    field: "sex",
    fieldType: "nominal",
    scale: "yOffset"
  });
  assert.equal(encoding.xOffset, undefined);
  assert.deepEqual(program.resolvedScales.yOffset, {
    type: "ordinal",
    domain: ["men", "women"],
    range: [0, 110],
    step: 55,
    start: 0,
    bandwidth: 55,
    paddingInner: 0,
    paddingOuter: 0
  });
  assert.deepEqual(rectangles.map(rect => rect.height), [39.6, 39.6, 39.6, 39.6]);
  assert.deepEqual(
    rectangles.map(rect => Number(rect.y.toFixed(6))),
    [37.7, 92.7, 147.7, 202.7]
  );
  assert.deepEqual(rectangles.map(rect => rect.width), [32, 288, 64, 256]);

  const colorNode = program.trace.children.at(-2);
  assert.equal(colorNode.op, "encodeColor");
  assert.equal(colorNode.children.find(child => child.op === "layoutSeries").children.some(child => child.op === "encodeYOffset"), true);
  assert.equal(colorNode.children.some(child => child.op === "encodeXOffset"), false);
});

test("supports direct yOffset padding, categorical field types, and reversed ranges", () => {
  const direct = horizontalBarProgram().encodeYOffset({
    field: "sex",
    fieldType: "ordinal",
    paddingInner: 0.2,
    paddingOuter: 0.1,
    scale: { range: [110, 0] }
  });

  assert.deepEqual(direct.semanticSpec.layers[0].encoding.yOffset, {
    field: "sex",
    fieldType: "ordinal",
    scale: "yOffset"
  });
  assert.deepEqual(direct.markConfigs.bars.yOffset, {
    paddingInner: 0.2,
    paddingOuter: 0.1
  });
  assert.deepEqual(direct.resolvedScales.yOffset.range, [110, 0]);
  assert.equal(direct.resolvedScales.yOffset.step < 0, true);
  assert.equal(direct.graphicSpec.objects.bars.items.length, 4);

  const grouped = direct.encodeColor({ field: "sex", layout: "group" });
  assert.equal(grouped.graphicSpec.objects.bars.items.length, 4);
  assert.deepEqual(grouped.markConfigs.bars.yOffset, {
    paddingInner: 0.2,
    paddingOuter: 0.1
  });
});

test("resizes yOffset slots while color-domain edits preserve series positions", () => {
  const before = horizontalBarProgram()
    .encodeColor({ field: "sex", layout: "group" })
    .encodeBarWidth();
  const resized = before.editCanvas({ height: 400 });
  const reordered = before.encodeColor({
    field: "sex",
    scale: { domain: ["women", "men"] }
  });

  assert.equal(before.resolvedScales.yOffset.range[1], 110);
  assert.equal(resized.resolvedScales.yOffset.range[1], 160);
  assert.notEqual(
    resized.graphicSpec.objects.bars.items[0].properties.height,
    before.graphicSpec.objects.bars.items[0].properties.height
  );
  assert.deepEqual(reordered.resolvedScales.yOffset.domain, ["men", "women"]);
  assert.deepEqual(
    reordered.graphicSpec.objects.bars.items.slice(0, 2).map(item => item.properties.fill),
    ["#f58518", "#4c78a8"]
  );
});

test("dodges point rows symmetrically within categorical y slots", () => {
  const program = chart()
    .createCanvas({
      width: 300,
      height: 400,
      margin: { top: 20, right: 20, bottom: 40, left: 40 }
    })
    .createData({ values: [
      { category: "A", model: "one", value: 1 },
      { category: "A", model: "two", value: 2 },
      { category: "B", model: "one", value: 3 },
      { category: "B", model: "two", value: 4 }
    ] })
    .createPointMark()
    .encodeX({ field: "value" })
    .encodeY({ field: "category", fieldType: "ordinal" })
    .encodeYOffset({ field: "model" });
  const y = program.graphicSpec.objects.point.items.map(
    item => item.properties.y
  );

  assert.equal(y[0] < y[1], true);
  assert.equal(y[2] < y[3], true);
  assert.equal(y[2] > y[1], true);
  assert.deepEqual(program.resolvedScales.yOffset.range, [0, 170]);
});

test("rejects offset channels that do not match the bar category direction", () => {
  assert.throws(
    () => horizontalBarProgram().encodeXOffset({ field: "sex" }),
    /x category encoding/
  );
  const vertical = chart()
    .createCanvas({ width: 420, height: 300 })
    .createData({ values })
    .createBarMark()
    .encodeX({ field: "year", fieldType: "ordinal" })
    .encodeY({ field: "perc" });
  assert.throws(
    () => vertical.encodeYOffset({ field: "sex" }),
    /y category encoding/
  );
  assert.throws(
    () => horizontalBarProgram().encodeYOffset({ field: "sex", fieldType: "quantitative" }),
    /Unsupported categorical field type/
  );
});
