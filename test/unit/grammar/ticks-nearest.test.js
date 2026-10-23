import assert from "node:assert/strict";
import test from "node:test";
import { niceTicks } from "../../../src/grammar/ticks.js";

const literalCases = [
  [[0, 140], 5, [0, 20, 40, 60, 80, 100, 120, 140]],
  [[0, 110], 5, [0, 20, 40, 60, 80, 100]],
  [[0, 180], 5, [0, 50, 100, 150]],
  [[0, 120], 5, [0, 20, 40, 60, 80, 100, 120]],
  [[-140, 0], 5, [-140, -120, -100, -80, -60, -40, -20, 0]],
  [[140, 0], 5, [0, 20, 40, 60, 80, 100, 120, 140]],
  [[0.7, 0.9], 10, [0.7, 0.72, 0.74, 0.76, 0.78, 0.8, 0.82, 0.84, 0.86, 0.88, 0.9]],
  [[4, 4], 5, [4]],
  [[0.21, 0.29], 1, [0.21, 0.29]]
];

test("nearest tick density matches literal independent domains and reciprocal decimals", () => {
  for (const [domain, count, expected] of literalCases) {
    const original = [...domain], actual = niceTicks(domain, count, "nearest");
    assert.deepEqual(actual, expected);
    assert.deepEqual(domain, original);
    assert(Object.isFrozen(actual));
  }
});

test("omitted and explicit ceiling policies retain the original tick values", () => {
  assert.deepEqual(niceTicks([0, 140], 5), [0, 30, 60, 90, 120]);
  assert.deepEqual(niceTicks([0, 110], 5), [0, 30, 60, 90]);
  for (const [domain, count] of literalCases) {
    assert.deepEqual(niceTicks(domain, count), niceTicks(domain, count, "ceiling"));
  }
});

test("nearest density stays finite, contained, ascending and bounded at numeric limits", () => {
  const domains = [[-Number.MAX_VALUE, Number.MAX_VALUE], [0, Number.MAX_VALUE],
    [0, Number.MIN_VALUE], [Number.MIN_VALUE, Number.MIN_VALUE * 2],
    [1, 1 + Number.EPSILON], [-1e-300, 1e-300], [1e300, 1.7e300]];
  for (let power = -300; power <= 300; power += 20) domains.push([-.37 * 10 ** power, 1.73 * 10 ** power]);
  for (const domain of domains) for (const count of [1, 3, 5, 10, 10000]) {
    const ticks = niceTicks(domain, count, "nearest");
    assert(ticks.length > 0 && ticks.length <= 10000);
    assert(ticks.every((value, index) => Number.isFinite(value) &&
      value >= domain[0] && value <= domain[1] && (index === 0 || value > ticks[index - 1])));
    assert.deepEqual(niceTicks(domain, count, "nearest"), ticks);
  }
});

test("invalid rounding and count inputs fail explicitly", () => {
  for (const rounding of [null, false, 10, "auto", {}, "other"]) {
    assert.throws(() => niceTicks([0, 140], 5, rounding), /rounding/);
  }
  for (const count of [0, -1, .5, Infinity]) {
    assert.throws(() => niceTicks([0, 140], count, "nearest"), /positive integer/);
  }
});
