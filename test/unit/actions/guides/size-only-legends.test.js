import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";

const values = Object.freeze([
  Object.freeze({ x: 1, y: 2, magnitude: 10, group: "A" }),
  Object.freeze({ x: 2, y: 3, magnitude: 20, group: "B" }),
  Object.freeze({ x: 3, y: 5, magnitude: 30, group: "A" })
]);

function sizeBase() {
  return chart()
    .createCanvas({ margin: { right: 180 } })
    .createData({ values })
    .createPointMark({ id: "points" })
    .encodeX({ field: "x" })
    .encodeY({ field: "y" })
    .encodeSize({ field: "magnitude" });
}

function assertSizeLegend(program, count) {
  assert.deepEqual(program.semanticSpec.guides.legend.size, {
    scale: "size",
    title: "magnitude"
  });
  assert.equal(program.graphicSpec.objects.sizeLegendSymbols.items.length, count);
  assert.equal(program.graphicSpec.objects.sizeLegendLabels.items.length, count);
  const radii = program.graphicSpec.objects.sizeLegendSymbols.items.map(
    item => item.properties.radius
  );
  assert.equal(radii.every((value, index) => index === 0 || value > radii[index - 1]), true);
  assert.deepEqual(
    program.graphicSpec.objects.sizeLegendLabels.items.map(
      item => item.properties.text
    ),
    count === 4 ? ["10", "16.7", "23.3", "30"] : ["10", "15", "20", "25", "30"]
  );
}

test("creates an explicit standalone size legend for a point mark", () => {
  const base = sizeBase();
  const program = base.createLegend({
    target: "points",
    channels: ["size"],
    position: "right",
    count: 4
  });

  assertSizeLegend(program, 4);
  assert.equal(program.semanticSpec.guides.legend.series, undefined);
  assert.equal(program.semanticSpec.guides.legend.color, undefined);
  assert.equal(base.semanticSpec.guides.legend?.size, undefined);
});

test("infers one standalone size target with createLegend and createGuides", () => {
  const inferred = sizeBase().createLegend({ channels: ["size"], count: 4 });
  const automatic = sizeBase().createGuides();

  assertSizeLegend(inferred, 4);
  assertSizeLegend(automatic, 5);
  assert.ok(automatic.semanticSpec.guides.axis.x);
  assert.ok(automatic.semanticSpec.guides.axis.y);
});

test("requires a target for multiple size points and accepts an explicit one", () => {
  const multiple = sizeBase()
    .createPointMark({ id: "other" })
    .encodeX({ target: "other", field: "x", scale: { id: "otherX" } })
    .encodeY({ target: "other", field: "y", scale: { id: "otherY" } })
    .encodeSize({
      target: "other",
      field: "magnitude",
      scale: { id: "otherSize" }
    });

  assert.throws(
    () => multiple.createLegend({ channels: ["size"] }),
    /explicit target/
  );
  const explicit = multiple.createLegend({
    target: "other",
    channels: ["size"],
    count: 3
  });
  assert.equal(explicit.guideConfigs.legend.size.target, "other");
  assert.equal(explicit.graphicSpec.objects.sizeLegendSymbols.items.length, 3);
});

test("keeps composite point series and size legend dispatch unchanged", () => {
  const program = sizeBase()
    .encodeColor({ field: "group" })
    .encodeShape({ field: "group" })
    .createLegend({ target: "points", position: "right", count: 4 });

  assert.ok(program.semanticSpec.guides.legend.series);
  assertSizeLegend(program, 4);
  assert.throws(
    () => sizeBase().createLegend({ channels: ["size"], position: "left" }),
    /position "right"/
  );
});
