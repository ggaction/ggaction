import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";

const rows = [
  { country: "A", value: 20 },
  { country: "B", value: 45 },
  { country: "C", value: 30 }
];

function bars() {
  return chart()
    .createCanvas({
      width: 360,
      height: 260,
      margin: { top: 20, right: 20, bottom: 40, left: 50 }
    })
    .createData({ id: "rows", values: rows })
    .createBarMark({ id: "bars" })
    .encodeX({
      field: "country",
      fieldType: "nominal",
      scale: { paddingInner: 0.2, paddingOuter: 0.1 }
    })
    .encodeY({
      field: "value",
      aggregate: "mean",
      scale: { nice: true, zero: true }
    })
    .encodeBarWidth({ band: 0.72 });
}

test("inherits compatible layered point positions without repeated encodings", () => {
  const source = bars();
  const program = source
    .createPointMark({ id: "centers" })
    .encodeRadius({ value: 4 });
  const point = program.semanticSpec.layers.find(layer => layer.id === "centers");
  const barChildren = program.graphicSpec.objects.bars.items;
  const pointChildren = program.graphicSpec.objects.centers.items;

  assert.equal(point.data, "rows");
  assert.equal(point.coordinate, "main");
  assert.deepEqual(point.encoding, {
    x: {
      field: "country",
      fieldType: "nominal",
      scale: "x"
    },
    y: {
      field: "value",
      fieldType: "quantitative",
      scale: "y"
    }
  });
  assert.equal(point.encoding.y.aggregate, undefined);
  assert.ok(pointChildren.every((child, index) =>
    Math.abs(
      child.properties.x -
      (barChildren[index].properties.x + barChildren[index].properties.width / 2)
    ) < 1e-9
  ));
  assert.deepEqual(
    pointChildren.map(child => child.properties.y),
    barChildren.map(child => child.properties.y)
  );
  assert.equal(source.semanticSpec.layers.some(layer => layer.id === "centers"), false);
});

test("prefers the current eligible layer and rejects an ambiguous fallback", () => {
  const twoSources = bars()
    .createPointMark({ id: "firstOverlay" })
    .encodeRadius({ value: 3 });
  const current = twoSources.createPointMark({ id: "secondOverlay" });
  assert.deepEqual(
    current.semanticSpec.layers.find(layer => layer.id === "secondOverlay").encoding,
    twoSources.semanticSpec.layers.find(layer => layer.id === "firstOverlay").encoding
  );

  const inheritedLine = twoSources.createLineMark({ id: "pendingLine" });
  assert.deepEqual(
    inheritedLine.semanticSpec.layers.find(layer => layer.id === "pendingLine").encoding,
    {
      y: twoSources.semanticSpec.layers.find(
        layer => layer.id === "firstOverlay"
      ).encoding.y
    }
  );

  const withoutEligibleCurrent = twoSources
    .createData({ id: "otherRows", values: rows })
    .createRuleMark({ id: "pendingRule", data: "otherRows" })
    ._withContext({ currentData: "rows" });
  assert.throws(
    () => withoutEligibleCurrent.createPointMark({ id: "ambiguousOverlay" }),
    /Layered mark inference is ambiguous/
  );
});

test("uses the shared compatible inheritance policy for every ordinary mark", () => {
  const barSource = bars();
  const point = barSource.createPointMark({ id: "pointLayer" });
  const rule = barSource.createRuleMark({ id: "ruleLayer" });
  const bar = barSource.createBarMark({ id: "barLayer" });
  for (const [program, id] of [
    [point, "pointLayer"],
    [rule, "ruleLayer"],
    [bar, "barLayer"]
  ]) {
    const layer = program.semanticSpec.layers.find(candidate => candidate.id === id);
    assert.equal(layer.data, "rows", id);
    assert.equal(layer.coordinate, "main", id);
    assert.equal(layer.encoding.x.field, "country", id);
    assert.equal(layer.encoding.y.field, "value", id);
  }
  assert.equal(
    point.semanticSpec.layers.find(layer => layer.id === "pointLayer").encoding.y.aggregate,
    undefined
  );
  assert.equal(
    bar.semanticSpec.layers.find(layer => layer.id === "barLayer").encoding.y.aggregate,
    "mean"
  );
  assert.ok(point.graphicSpec.objects.pointLayer.items.length > 0);
  assert.ok(bar.graphicSpec.objects.barLayer.items.length > 0);

  const scatter = chart()
    .createCanvas({ width: 320, height: 220, margin: 40 })
    .createData({ id: "xy", values: rows.map((row, index) => ({ x: index, y: row.value })) })
    .createPointMark({ id: "source" })
    .encodeX({ field: "x" })
    .encodeY({ field: "y" });
  const line = scatter.createLineMark({ id: "lineLayer" });
  const area = scatter.createAreaMark({ id: "areaLayer" });
  assert.deepEqual(
    line.semanticSpec.layers.find(layer => layer.id === "lineLayer").encoding,
    scatter.semanticSpec.layers.find(layer => layer.id === "source").encoding
  );
  assert.deepEqual(
    area.semanticSpec.layers.find(layer => layer.id === "areaLayer").encoding,
    scatter.semanticSpec.layers.find(layer => layer.id === "source").encoding
  );
  assert.ok(line.graphicSpec.objects.lineLayer.items.length > 0);
  assert.equal(area.graphicSpec.objects.areaLayer.items.length, 0);
});

test("inherits a shared mean grain from temporal bars into a line", () => {
  const source = chart()
    .createCanvas({ width: 360, height: 260, margin: 40 })
    .createData({ values: [
      { year: "2000-01-01", value: 10 },
      { year: "2000-01-01", value: 14 },
      { year: "2001-01-01", value: 20 }
    ] })
    .createBarMark({ id: "bars" })
    .encodeX({ field: "year", fieldType: "temporal" })
    .encodeY({ field: "value", aggregate: "mean" });
  const layered = source.createLineMark({ id: "trend" });
  const trend = layered.semanticSpec.layers.find(layer => layer.id === "trend");
  const bars = layered.graphicSpec.objects.bars.items;
  const commands = layered.graphicSpec.objects.trend.items[0].properties.commands;

  assert.deepEqual(trend.encoding, {
    x: { field: "year", fieldType: "temporal", scale: "x" },
    y: {
      field: "value",
      fieldType: "quantitative",
      scale: "y",
      aggregate: "mean"
    }
  });
  assert.equal(trend.encoding.y.stack, undefined);
  assert.equal(commands.length, bars.length);
  bars.forEach((bar, index) => {
    assert.ok(Math.abs(
      bar.properties.x + bar.properties.width / 2 - commands[index].x
    ) < 1e-9);
    assert.equal(bar.properties.y, commands[index].y);
  });
  assert.equal(source.semanticSpec.layers.some(layer => layer.id === "trend"), false);
});
