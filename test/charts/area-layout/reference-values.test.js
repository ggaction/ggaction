import assert from "node:assert/strict";
import test from "node:test";
import { mapReferencePosition, partitionReference, splitReferenceSegments } from "../../oracles/series-area.js";
import { areaReference, barReference } from "./reference-values.js";

const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-10, `${actual} != ${expected}`);

test("series partitions match literal endpoints and preserve thickness", () => {
  assert.deepEqual(partitionReference([2, 1], "stack"), [[0, 2], [2, 3]]);
  assert.deepEqual(partitionReference([2, 1], "fill"), [[0, 2 / 3], [2 / 3, 1]]);
  assert.deepEqual(partitionReference([2, 1], "center"), [[-1.5, 0.5], [0.5, 1.5]]);
  assert.deepEqual(partitionReference([-2, 3, -4, 5], "diverging"), [[0, -2], [0, 3], [-2, -6], [3, 8]]);
  assert.deepEqual(partitionReference([0, 0], "fill"), [[0, 0], [0, 0]]);
  for (const values of [[0, 0], [1, 2, 3], [0.25, 5, 1.75], [20, 0, 10]]) {
    const total = values.reduce((a, b) => a + b, 0);
    for (const mode of ["group", "overlay", "stack", "fill", "center"]) {
      const pairs = partitionReference(values, mode);
      pairs.forEach(([a, b], i) => close(b - a, mode === "fill" ? total ? values[i] / total : 0 : values[i]));
      if (mode === "fill") close(pairs.at(-1)[1], total ? 1 : 0);
      if (mode === "center") close(pairs[0][0] + pairs.at(-1)[1], 0);
    }
  }
  for (const mode of ["stack", "fill", "center"]) assert.throws(() => partitionReference([-1, 2], mode), RangeError);
  assert.throws(() => partitionReference([Infinity], "stack"), TypeError);
});

test("diverging partitions accumulate each sign without changing input order", () => {
  for (const values of [[-2, 3, -4, 5], [1, -1, 0], [-1, -2], [1, 2]]) {
    const pairs = partitionReference(values, "diverging");
    let positive = 0, negative = 0;
    pairs.forEach(([a, b], i) => {
      close(b - a, values[i]);
      if (values[i] < 0) { close(a, negative); negative += values[i]; close(b, negative); }
      else { close(a, positive); positive += values[i]; close(b, positive); }
    });
    close(positive + negative, values.reduce((a, b) => a + b, 0));
  }
});

test("area baseline and crossing ribbon match literal screen coordinates", () => {
  assert.deepEqual(areaReference("area-simple").segments[0].commands, [
    { op: "M", x: 150, y: 350 }, { op: "L", x: 500, y: 150 }, { op: "L", x: 850, y: 250 },
    { op: "L", x: 850, y: 550 }, { op: "L", x: 500, y: 550 }, { op: "L", x: 150, y: 550 }, { op: "Z" }
  ]);
  const signed = areaReference("area-signed-baseline");
  assert.deepEqual(signed.measureDomain, [-2, 3]);
  assert.deepEqual(signed.segments[0].commands.slice(0, 3).map(p => p.y), [230, 550, 150]);
  assert.deepEqual(signed.segments[0].commands.slice(3, 6).map(p => p.y), [310, 310, 310]);
  const crossing = areaReference("ribbon-crossing");
  assert.deepEqual(crossing.boundaries[0].samples.map(p => [p.lower, p.upper]), [[1, 3], [6, 2], [1, 5]]);
  assert.deepEqual(crossing.measureDomain, [1, 6]);
});

test("horizontal area uses log distance on the value axis", () => {
  const ref = areaReference("area-horizontal-log");
  assert.deepEqual(ref.xDomain, [1, 4]);
  assert.deepEqual(ref.yDomain, [1, 3]);
  const commands = ref.segments[0].commands;
  close(commands[0].x, 500); close(commands[1].x, 850); close(commands[2].x, 704.7368752524047);
  assert.deepEqual(commands.slice(0, 3).map(p => p.y), [550, 350, 150]);
  assert.deepEqual(commands.slice(3, 6).map(p => p.x), [150, 150, 150]);
  let prior = -Infinity;
  for (const value of [1, 1.25, 2, 3, 4]) {
    const mapped = mapReferencePosition(value, [1, 4], [150, 850], "log");
    assert.ok(mapped > prior && mapped >= 150 && mapped <= 850); prior = mapped;
  }
});

test("missing endpoint splits paths and discards isolated samples", () => {
  const ref = areaReference("area-missing-break");
  assert.deepEqual(ref.segments.map(s => s.samples.map(p => p.position)), [[0, 1], [3, 4]]);
  const sample = position => ({ position, lower: 1, upper: 0 });
  assert.deepEqual(splitReferenceSegments([sample(0), { position: 1, lower: null, upper: 0 }, sample(2)]), []);
  assert.throws(() => splitReferenceSegments([{ position: 0, lower: NaN, upper: 0 }]), TypeError);
});

test("series area fixtures have independently anchored extents and boundaries", () => {
  for (const [id, domain, first] of [
    ["area-stack", [0, 6], [[0, 2], [2, 3]]],
    ["area-fill", [0, 1], [[0, 2 / 3], [2 / 3, 1]]],
    ["area-center", [-3, 3], [[-1.5, 0.5], [0.5, 1.5]]],
    ["area-diverging", [-1, 6], [[0, 2], [0, -1]]]
  ]) {
    const ref = areaReference(id);
    assert.deepEqual(ref.measureDomain, domain);
    assert.deepEqual(ref.boundaries.map(b => [b.samples[0].lower, b.samples[0].upper]), first);
  }
});

test("colorless bar targets distinguish grouped slots from stacked totals", () => {
  const grouped = barReference("bar-layout-roundtrip"), stacked = barReference("bar-independent-stack");
  assert.deepEqual(grouped.domain, [0, 4]); assert.deepEqual(stacked.domain, [0, 6]);
  assert.deepEqual(grouped.items[0], { x: 166.33333333333334, y: 350, width: 84, height: 200,
    fill: "#4c78a8", stroke: "white", strokeWidth: 0.5 });
  close(stacked.items[0].x, 182.66666666666669); close(stacked.items[0].height, 133.33333333333331);
  close(stacked.items[1].height, 66.66666666666669);
  for (let i = 0; i < 6; i += 2) {
    assert.equal(stacked.items[i].x, stacked.items[i + 1].x);
    assert.ok(grouped.items[i].x + grouped.items[i].width < grouped.items[i + 1].x);
    close(stacked.items[i + 1].y + stacked.items[i + 1].height, stacked.items[i].y);
  }
});
