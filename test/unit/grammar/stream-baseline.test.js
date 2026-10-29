import assert from "node:assert/strict";
import test from "node:test";
import { layoutWiggleSeries } from "../../../src/grammar/streamBaseline.js";

function bounds(actual, expected) {
  assert.equal(actual.length, expected.length);
  actual.forEach((segment, index) => ["start", "end"].forEach((key, side) =>
    assert.ok(Math.abs(segment[key] - expected[index][side]) <= 4 * Number.EPSILON * Math.max(1, Math.abs(expected[index][side])), `${key}: ${segment[key]}`)));
}

test("wiggle uses independently solved weighted center changes", () => {
  // Column1: centers change [1/2, 1/2], so b1=-1/2.
  // Column2: centers change [-1/2, -3/2], equal weights => b2=1/2.
  const result = layoutWiggleSeries([[1, 3], [2, 2], [1, 1]]);
  bounds(result[0], [[0, 1], [1, 4]]);
  bounds(result[1], [[-.5, 1.5], [1.5, 3.5]]);
  // At column2 both weights are1, hence the mean center change is-1 and b2=.5.
  bounds(result[2], [[.5, 1.5], [1.5, 2.5]]);
});

test("wiggle minimizes the local weighted slope objective and conserves thickness", () => {
  const columns = [[2, 3, 1], [4, 2, 5], [3, 7, 2], [6, 1, 4]];
  const result = layoutWiggleSeries(columns);
  for (let j = 0; j < columns.length; j += 1) {
    for (let i = 0; i < columns[j].length; i += 1) {
      const segment = result[j][i];
      assert.ok(Math.abs(segment.end - segment.start - columns[j][i]) < 1e-13);
      if (i) assert.equal(segment.start, result[j][i - 1].end);
    }
    if (!j) continue;
    const objective = displacement => columns[j].reduce((sum, value, i) => {
      const previousCenter = (result[j - 1][i].start + result[j - 1][i].end) / 2;
      const center = (result[j][i].start + result[j][i].end) / 2 + displacement;
      return sum + value * (center - previousCenter) ** 2;
    }, 0);
    for (const displacement of [-2, -.1, .1, 2]) assert.ok(objective(0) < objective(displacement));
  }
});

test("wiggle preserves zero columns and explicitly resets each missing run", () => {
  const result = layoutWiggleSeries([[1, 3], [2, 2], [0, 0], null, [2, 2], [2, 2]]);
  bounds(result[2], [[-.5, -.5], [-.5, -.5]]);
  for (const segment of result[2]) assert.equal(segment.start, segment.end);
  assert.equal(result[3], null);
  assert.deepEqual(result[4].map(({ start, end }) => [start, end]), [[0, 2], [2, 4]]);
  assert.deepEqual(result[5], result[4]);
  assert.deepEqual(layoutWiggleSeries([]), []);
  assert.deepEqual(layoutWiggleSeries([null, null]), [null, null]);
  assert.deepEqual(layoutWiggleSeries([[0, -0]]).map(column => column.map(({ start, end }) => [start, end])), [[[0, 0], [0, 0]]]);
});

test("wiggle is scale-equivariant at finite tiny and large magnitudes", () => {
  const columns = [[1, 2], [2, 1], [1, 3]];
  const unit = layoutWiggleSeries(columns);
  for (const scale of [1e-307, 1e307]) {
    const result = layoutWiggleSeries(columns.map(column => column.map(value => value * scale)));
    for (let j = 0; j < columns.length; j += 1) for (let i = 0; i < 2; i += 1) {
      for (const key of ["start", "end"]) assert.ok(Math.abs(result[j][i][key] / scale - unit[j][i][key]) < 1e-14);
    }
  }
});

test("wiggle rejects malformed, unrepresentable and oversized inputs before returning geometry", () => {
  for (const values of [undefined, {}, [[]], [[1], [1, 2]], [[NaN]], [[Infinity]], [[-1]], Array(1), [[1, , 2]]]) {
    assert.throws(() => layoutWiggleSeries(values));
  }
  assert.throws(() => layoutWiggleSeries([[Number.MAX_VALUE, Number.MAX_VALUE]]), /finite numeric range/);
  assert.throws(() => layoutWiggleSeries([[1e300, 1e-300]]), /distinct finite bounds/);
  assert.throws(() => layoutWiggleSeries(Array(10001).fill(null)), /must not exceed/);
  assert.throws(() => layoutWiggleSeries([Array(5001).fill(1), Array(5001).fill(1)]), /must not exceed/);
  let calls = 0; const column = [1]; Object.defineProperty(column, "0", { get() { calls += 1; return 1; } });
  assert.throws(() => layoutWiggleSeries([column]), /data propert/); assert.equal(calls, 0);
});

test("wiggle freezes derived geometry without changing caller arrays", () => {
  const columns = [[1, 3], [2, 2]], before = structuredClone(columns), result = layoutWiggleSeries(columns);
  assert.deepEqual(columns, before); assert.equal(Object.isFrozen(columns[0]), false);
  assert.ok(Object.isFrozen(result) && Object.isFrozen(result[0]) && Object.isFrozen(result[0][0]));
});
