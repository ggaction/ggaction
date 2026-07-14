import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/core/ChartProgram.js";

const values = [
  { x: 1, x2: 20, y: 4, y2: 40, color: "A", category: "K", size: 4, weight: 9 },
  { x: 3, x2: 10, y: 8, y2: 20, color: "B", category: "L", size: 16, weight: 25 }
];

function pointProgram({ titles = {} } = {}) {
  return chart()
    .createCanvas({
      width: 420,
      height: 260,
      margin: { top: 20, right: 140, bottom: 60, left: 60 }
    })
    .createData({ id: "data", values })
    .createPointMark({ id: "points" })
    .encodeX({ field: "x" })
    .encodeY({ field: "y" })
    .encodeColor({ field: "color" })
    .encodeSize({ field: "size" })
    .encodeShape({ field: "color" })
    .createGuides({
      axes: {
        x: titles.x === undefined ? {} : { title: { text: titles.x } },
        y: titles.y === undefined ? {} : { title: { text: titles.y } }
      }
    });
}

test("reassigns position fields through their current scales and inferred guides", () => {
  const before = pointProgram();
  const after = before
    .encodeX({ field: "x2" })
    .encodeY({ field: "y2" });

  assert.equal(after.semanticSpec.layers[0].encoding.x.scale, "x");
  assert.equal(after.semanticSpec.layers[0].encoding.y.scale, "y");
  assert.deepEqual(after.resolvedScales.x.domain, [10, 20]);
  assert.deepEqual(after.resolvedScales.y.domain, [20, 40]);
  assert.equal(after.semanticSpec.guides.axis.x.title, "x2");
  assert.equal(after.semanticSpec.guides.axis.y.title, "y2");
  assert.equal(after.graphicSpec.objects.xAxisTitle.properties.text, "x2");
  assert.equal(after.graphicSpec.objects.yAxisTitle.properties.text, "y2");
  assert.equal(before.semanticSpec.layers[0].encoding.x.field, "x");
  assert.deepEqual(before.resolvedScales.x.domain, [1, 3]);
});

test("preserves explicit axis titles while reassigning their fields", () => {
  const after = pointProgram({ titles: { x: "Custom X", y: "Custom Y" } })
    .encodeX({ field: "x2" })
    .encodeY({ field: "y2" });

  assert.equal(after.semanticSpec.guides.axis.x.title, "Custom X");
  assert.equal(after.semanticSpec.guides.axis.y.title, "Custom Y");
  assert.equal(after.graphicSpec.objects.xAxisTitle.properties.text, "Custom X");
  assert.equal(after.graphicSpec.objects.yAxisTitle.properties.text, "Custom Y");
});

test("uses editScale for same-scale policy changes and rebinds explicit new scales", () => {
  const same = pointProgram().encodeX({
    field: "x2",
    scale: { domain: [0, 30], nice: false }
  });
  const sameNode = same.trace.children.at(-1);
  assert.equal(sameNode.children.some(child => child.op === "editScale"), true);
  assert.deepEqual(same.semanticSpec.scales.find(scale => scale.id === "x"), {
    id: "x",
    type: "linear",
    domain: [0, 30],
    range: "auto",
    nice: false
  });

  const rebound = pointProgram().encodeX({
    field: "x2",
    scale: { id: "alternateX" }
  });
  assert.equal(rebound.semanticSpec.layers[0].encoding.x.scale, "alternateX");
  assert.equal(rebound.semanticSpec.guides.axis.x.scale, "alternateX");
  assert.equal(rebound.guideConfigs.axis.x.title.scale, "alternateX");
  assert.deepEqual(rebound.resolvedScales.alternateX.domain, [10, 20]);
  assert.equal(
    rebound.semanticSpec.scales.some(scale => scale.id === "x"),
    true
  );
});

test("reassigns color, size, and shape with their existing legends", () => {
  let color = chart()
    .createCanvas({ width: 420, height: 260, margin: { top: 20, right: 140, bottom: 40, left: 40 } })
    .createData({ id: "data", values })
    .createPointMark({ id: "points" })
    .encodeColor({ field: "color" })
    .createLegend({ channels: ["color"] });
  color = color.encodeColor({ field: "category" });
  assert.deepEqual(color.resolvedScales.color.domain, ["K", "L"]);
  assert.equal(color.semanticSpec.guides.legend.color.title, "category");
  assert.equal(color.graphicSpec.objects.colorLegendTitle.properties.text, "category");

  let shape = chart()
    .createCanvas({ width: 420, height: 260, margin: { top: 20, right: 140, bottom: 40, left: 40 } })
    .createData({ id: "data", values })
    .createPointMark({ id: "points" })
    .encodeShape({ field: "color" })
    .createLegend({ channels: ["shape"] });
  shape = shape.encodeShape({ field: "category" });
  assert.deepEqual(shape.resolvedScales.shape.domain, ["K", "L"]);
  assert.equal(shape.semanticSpec.guides.legend.series.title, "category");

  let size = chart()
    .createCanvas({ width: 420, height: 300, margin: { top: 20, right: 140, bottom: 40, left: 40 } })
    .createData({ id: "data", values })
    .createPointMark({ id: "points" })
    .encodeColor({ field: "color" })
    .encodeSize({ field: "size" })
    .encodeShape({ field: "color" })
    .createLegend();
  size = size.encodeSize({ field: "weight" });
  assert.deepEqual(size.resolvedScales.size.domain, [9, 25]);
  assert.equal(size.semanticSpec.guides.legend.size.title, "weight");
  assert.equal(size.graphicSpec.objects.sizeLegendTitle.properties.text, "weight");
});

test("rejects incompatible shared-guide rebinds without mutating the source", () => {
  const before = chart()
    .createCanvas({ width: 300, height: 180, margin: 30 })
    .createData({ id: "data", values })
    .createPointMark({ id: "first" })
    .encodeX({ field: "x" })
    .createPointMark({ id: "second" })
    .encodeX({ field: "x2" })
    .createXAxis({ title: { text: "Shared X" } });
  const snapshot = before.semanticSpec;

  assert.throws(
    () => before.encodeX({
      target: "second",
      field: "x",
      scale: { id: "alternateX" }
    }),
    /shared scale "x"/
  );
  assert.equal(before.semanticSpec, snapshot);
  assert.equal(before.semanticSpec.scales.some(scale => scale.id === "alternateX"), false);
});
