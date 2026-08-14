import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";

const VALUES = Object.freeze([
  Object.freeze({ x: 1, y: 2, value: 0, group: "A" }),
  Object.freeze({ x: 2, y: 4, value: 0.3, group: "B" }),
  Object.freeze({ x: 3, y: 6, value: 1, group: "C" })
]);

test("samples sequential top-level and range palette counts identically", () => {
  const palette = Object.freeze({ name: "viridis", count: 5 });
  const topLevel = chart().createScale({
    id: "temperature",
    type: "sequential",
    domain: [0, 1],
    palette
  });
  const nested = chart().createScale({
    id: "temperature",
    type: "sequential",
    domain: [0, 1],
    range: { palette }
  });

  assert.deepEqual(topLevel.semanticSpec, nested.semanticSpec);
  assert.deepEqual(topLevel.resolvedScales, nested.resolvedScales);
  assert.deepEqual(topLevel.semanticSpec.scales[0].range, {
    palette: { name: "viridis", count: 5 }
  });
  assert.deepEqual(palette, { name: "viridis", count: 5 });
});

test("uses sequential count as concrete gradient-stop count for connected color", () => {
  const before = chart()
    .createCanvas({
      width: 420,
      height: 280,
      margin: { top: 60, right: 100, bottom: 60, left: 60 }
    })
    .createData({ id: "source", values: VALUES })
    .createPointMark({ id: "points", data: "source" })
    .encodeX({ target: "points", field: "x" })
    .encodeY({ target: "points", field: "y" })
    .encodeColor({
      target: "points",
      field: "value",
      fieldType: "quantitative",
      scale: { palette: { name: "viridis", count: 5 } }
    })
    .createLegend({ target: "points", channels: ["color"] });
  const after = before.editScale({
    id: "color",
    palette: { name: "viridis", count: 3 }
  });

  assert.equal(before.resolvedScales.color.range.length, 5);
  assert.equal(after.resolvedScales.color.range.length, 3);
  assert.notDeepEqual(
    before.graphicSpec.objects.points.items.map(item => item.properties.fill),
    after.graphicSpec.objects.points.items.map(item => item.properties.fill)
  );
  assert.equal(after.graphicSpec.objects.colorGradientStrips.items.length > 0, true);
  assert.equal(before.resolvedScales.color.range.length, 5);
});

test("preserves ordinal palette count behavior and rejects one sequential stop", () => {
  const ordinal = chart().createScale({
    id: "groups",
    type: "ordinal",
    domain: ["A", "B", "C"],
    range: { palette: { name: "set2", count: 3 } }
  });
  const prior = chart();
  const options = Object.freeze({
    id: "temperature",
    type: "sequential",
    domain: Object.freeze([0, 1]),
    palette: Object.freeze({ name: "viridis", count: 1 })
  });

  assert.deepEqual(ordinal.semanticSpec.scales[0].range, {
    palette: { name: "set2", count: 3 }
  });
  assert.throws(() => prior.createScale(options), /at least 2/);
  assert.deepEqual(prior.semanticSpec.scales, []);
  assert.deepEqual(options.palette, { name: "viridis", count: 1 });
});
