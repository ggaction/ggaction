import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";
import { mapContinuousScaleValues } from
  "../../../../src/grammar/scales.js";

const mixed = [
  { category: "A", group: "one", value: -5 },
  { category: "A", group: "two", value: 0 },
  { category: "B", group: "one", value: 6 },
  { category: "B", group: "two", value: -2 },
  { category: "C", group: "one", value: 9 }
];

const allNegative = [
  { category: "A", group: "one", value: -9 },
  { category: "A", group: "two", value: -4 },
  { category: "B", group: "one", value: -2 },
  { category: "B", group: "two", value: -6 }
];

function build(values, layout, scale) {
  return chart()
    .createCanvas({
      width: 700,
      height: 400,
      margin: { top: 30, right: 140, bottom: 60, left: 70 }
    })
    .createData({ values })
    .createBarMark({ id: "bars" })
    .encodeX({ field: "category", fieldType: "ordinal" })
    .encodeY({
      field: "value",
      aggregate: "sum",
      ...(scale === undefined ? {} : { scale })
    })
    .encodeColor({ field: "group", layout })
    .encodeBarWidth({ band: 0.7 });
}

function approximatelyEqual(actual, expected) {
  assert.equal(Math.abs(actual - expected) < 1e-9, true);
}

test("uses zero as the grouped-bar baseline for mixed signed values", () => {
  const program = build(mixed, "group");
  const items = program.graphicSpec.objects.bars.items;
  const scale = program.resolvedScales.y;
  const baseline = mapContinuousScaleValues([0], scale)[0];

  assert.deepEqual(scale.domain, [-6, 9]);
  assert.equal(items.length, mixed.length);
  assert.equal(items[1].properties.height, 0);
  approximatelyEqual(items[0].properties.y, baseline);
  assert.equal(items[0].properties.y + items[0].properties.height > baseline, true);
  assert.equal(items[2].properties.y < baseline, true);
  approximatelyEqual(
    items[2].properties.y + items[2].properties.height,
    baseline
  );
});

test("preserves signed magnitude ordering for all-negative grouped bars", () => {
  const program = build(allNegative, "group");
  const items = program.graphicSpec.objects.bars.items;

  assert.deepEqual(program.resolvedScales.y.domain, [-10, 0]);
  assert.equal(items[0].properties.height > items[2].properties.height, true);
  assert.equal(items.every(item => item.properties.height >= 0), true);
});

test("uses the same zero endpoint for overlay bars and scale rematerialization", () => {
  const before = build(mixed, "overlay");
  const zeroTrue = build(mixed, "overlay", { zero: true });
  const resized = before.editCanvas({ width: 760, height: 440 });

  assert.deepEqual(before.resolvedScales.y.domain, [-6, 9]);
  assert.deepEqual(zeroTrue.resolvedScales.y.domain, [-6, 9]);
  assert.equal(before.graphicSpec.objects.bars.items.length, 4);
  assert.equal(
    resized.graphicSpec.objects.bars.items.every(
      item => Number.isFinite(item.properties.y) && item.properties.height > 0
    ),
    true
  );
  assert.notStrictEqual(resized.graphicSpec, before.graphicSpec);
});

test("rejects aggregate bar layouts whose explicit scale cannot show zero", () => {
  assert.throws(
    () => build(mixed, "group", { domain: [-6, -1] }),
    /explicit domain containing zero/
  );
  assert.throws(
    () => build(mixed, "overlay", { type: "log" }),
    /does not support zero/
  );
});
