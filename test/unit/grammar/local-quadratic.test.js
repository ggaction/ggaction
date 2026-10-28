import assert from "node:assert/strict";
import test from "node:test";

import { predictLocalQuadratic } from "../../../src/grammar/regression/localQuadratic.js";
import { trySolveLinearSystem } from "../../../src/grammar/regression/linearSystem.js";

function close(actual, expected, tolerance = 1e-9) {
  assert.ok(Math.abs(actual - expected) <= tolerance + tolerance * Math.max(Math.abs(actual), Math.abs(expected)), `${actual} != ${expected}`);
}

test("local quadratic reproduces independent quadratic and affine formulas under transformed x", () => {
  for (const formula of [x => 2 * x * x - 3 * x + 4, x => 2 * x + 1]) {
    for (const [offset, scale] of [[0, 1], [100, 5], [1e150, 1e149], [-1e-150, 1e-151]]) {
      const points = [-2, -1, 0, 1, 2].map((x, index) => ({ x: offset + scale * x, y: formula(x), weight: index + 1 }));
      for (const query of [-1, 0, 0.25, 1, 3]) close(predictLocalQuadratic(points, offset + scale * query), formula(query));
    }
  }
});

test("local quadratic matches an independent noisy least-squares literal", () => {
  // The normal equations give intercept=-3/5, slope=1/5, quadratic=1.
  const points = [-1, 0, 1, 2].map(x => ({ x, y: x === 2 ? 4 : 0, weight: 1 }));
  close(predictLocalQuadratic(points, 0), -0.6);
  close(predictLocalQuadratic(points, 0.5), -0.25);
  close(predictLocalQuadratic([...points].reverse(), 0.5), -0.25);
});

test("singular neighborhoods retain their constant weighted mean without adding neighbors", () => {
  for (const query of [-10, 0, 1, 10]) {
    assert.equal(predictLocalQuadratic([{ x: 0, y: 2, weight: 1 }, { x: 0, y: 8, weight: 3 }], query), 6.5);
    assert.equal(predictLocalQuadratic([{ x: 0, y: 2, weight: 1 }, { x: 2, y: 8, weight: 3 }], query), 6.5);
    assert.equal(predictLocalQuadratic([{ x: 0, y: 7, weight: 1 }], query), 7);
  }
  assert.equal(predictLocalQuadratic([{ x: 1, y: 0, weight: 1 }, { x: 1, y: 0, weight: 3 }], 1), 0);
  assert.equal(predictLocalQuadratic([{ x: 1, y: -0, weight: 1 }], 1), 0);
});

test("local quadratic keeps tied observations and ignores validated zero-weight residuals", () => {
  const points = [-2, -1, 0, 1, 2].map(x => ({ x, y: x * x, weight: 1 }));
  const tied = [...points, { x: 1, y: 1, weight: 4 }];
  close(predictLocalQuadratic(tied, 0.5), 0.25);
  close(predictLocalQuadratic([...tied].reverse(), 0.5), 0.25);
  close(predictLocalQuadratic([...tied, { x: 0, y: 1e308, weight: 0 }], 0.5), 0.25);
  close(predictLocalQuadratic(tied.map(point => ({ ...point, weight: point.weight * 1e307 })), 0.5), 0.25);
  close(predictLocalQuadratic(tied.map(point => ({ ...point, weight: point.weight * 1e-307 })), 0.5), 0.25);
  // The LOESS caller must restore ordinary distance weights before this kernel.
  assert.throws(() => predictLocalQuadratic(tied.map(point => ({ ...point, weight: 0 })), 0.5), /positive weight/);
});

test("local quadratic handles full-range coordinates and scaled responses without overflow", () => {
  const points = [-1, -0.5, 0, 0.5, 1].map(x => ({ x: x * 1e308, y: 2 * x * x - 3 * x + 4, weight: 1 }));
  close(predictLocalQuadratic(points, 1.5e308), 4);
  const largeY = [-1, -0.5, 0, 0.5, 1].map(x => ({ x, y: (x * x - 0.5) * 1e308, weight: 1 }));
  close(predictLocalQuadratic(largeY, 0.2) / 1e308, -0.46);
  assert.throws(() => predictLocalQuadratic(largeY, 3), /finite numeric range/);
});

test("scaled numerical rank policy has deterministic constant fallback", () => {
  const points = [{ x: 1, y: 0, weight: 1 }, { x: 1 + 1e-8, y: 3, weight: 1 }, { x: 2, y: 3, weight: 1 }];
  close(predictLocalQuadratic(points, 1.5), 2);
  close(predictLocalQuadratic(points.map(point => ({ ...point, x: point.x * 1e100 })), 1.5e100), 2);
  assert.equal(trySolveLinearSystem([[1, 0], [0, 0.5e-12]], [1, 1]), undefined);
  assert.deepEqual(trySolveLinearSystem([[1, 0], [0, 1e-12]], [1, 1e-12]), [1, 1]);
  assert.deepEqual(trySolveLinearSystem([[0, 1], [1, 0]], [2, 3]), [3, 2]);
});

test("local quadratic validates all inputs including zero-weight observations before computing", () => {
  const good = { x: 0, y: 1, weight: 1 };
  for (const query of [NaN, Infinity, "1", null]) assert.throws(() => predictLocalQuadratic([good], query), /finite/);
  for (const points of [null, {}, [null], [new Date()], new Array(1)]) assert.throws(() => predictLocalQuadratic(points, 0), /array|object|dense/);
  assert.throws(() => predictLocalQuadratic([], 0), /positive weight/);
  for (const patch of [{ x: NaN }, { y: Infinity }, { y: "1" }, { weight: -1 }, { weight: Infinity }, { weight: null }]) {
    assert.throws(() => predictLocalQuadratic([{ ...good, ...patch }], 0), /finite/);
  }
  assert.throws(() => predictLocalQuadratic([{ ...good, weight: 0, y: NaN }], 0), /finite/);
  assert.throws(() => predictLocalQuadratic([{ ...good, extra: 1 }], 0), /Unknown/);
  assert.throws(() => predictLocalQuadratic([{}], 0), /finite/);
  assert.throws(() => predictLocalQuadratic(new Array(312500), 0), /computation/);
  let calls = 0;
  const getter = { enumerable: true, get() { calls++; throw new Error("executed"); } };
  assert.throws(() => predictLocalQuadratic([Object.defineProperty({ ...good }, "x", getter)], 0), /accessors/);
  assert.throws(() => predictLocalQuadratic(Object.defineProperty([], "0", getter), 0), /accessors/);
  assert.equal(calls, 0);
});

test("local quadratic and shared solve preserve every caller-owned input", () => {
  const points = [{ x: -1, y: 1, weight: 1 }, { x: 0, y: 0, weight: 2 }, { x: 1, y: 1, weight: 1 }];
  const before = structuredClone(points);
  close(predictLocalQuadratic(points, 0.5), 0.25);
  assert.deepEqual(points, before);
  assert.ok(points.every(point => !Object.isFrozen(point)));
  const matrix = [[0, 1], [1, 0]], vector = [2, 3];
  trySolveLinearSystem(matrix, vector);
  assert.deepEqual(matrix, [[0, 1], [1, 0]]);
  assert.deepEqual(vector, [2, 3]);
});
