import assert from "node:assert/strict";
import test from "node:test";
import { deriveRegression, normalizeRegressionTransform } from "../../../../src/grammar/regression/index.js";
import { quadraticLoess, quadraticNeighborhood } from "../../../oracles/loess-quadratic.js";

const options = { x: "x", y: "y", method: "loess", degree: 2, span: 1 };
const fit = (rows, extra = {}) => deriveRegression(rows, { ...options, ...extra });
const close = (actual, expected, tolerance = 1e-9) => assert.ok(
  Math.abs(actual - expected) <= tolerance * (1 + Math.max(Math.abs(actual), Math.abs(expected))), `${actual} != ${expected}`);
const compare = (actual, expected) => actual.forEach((row, i) => { assert.equal(row.x, expected[i].x); close(row.y, expected[i].y); });
const quadratic = x => 2 * x * x - 3 * x + 4;
const rows = Array.from({ length: 11 }, (_, i) => ({ x: i - 5, y: quadratic(i - 5) }));

test("LOESS degree one preserves the exact ordinary and robust default shape", () => {
  for (const robustIterations of [0, 2]) {
    const implicit = deriveRegression(rows, { ...options, degree: undefined, robustIterations });
    assert.deepEqual(deriveRegression(rows, { ...options, degree: 1, robustIterations }), implicit);
    assert.equal(Object.hasOwn(implicit.parameters, "degree"), false);
    assert.equal(Object.hasOwn(implicit.models[0], "degree"), false);
  }
  assert.deepEqual(normalizeRegressionTransform({ ...options, degree: 1 }), {
    type: "regression", method: "loess", x: "x", y: "y", span: 1
  });
  assert.equal(normalizeRegressionTransform(options).degree, 2);
});

test("quadratic LOESS matches literal polynomials and an independent weighted system", () => {
  const predict = [-5, -2.5, 0, 1.5, 5, 6];
  for (const robustIterations of [0, 2]) {
    const result = fit(rows, { robustIterations, predict: { values: predict } });
    result.values.forEach(row => close(row.y, quadratic(row.x)));
    compare(quadraticLoess(rows, { span: 1, predict }), result.values);
    assert.equal(result.models[0].degree, 2);
    assert.equal(result.fields.lower, undefined);
  }
  const independent = [{ x: -2, y: 3 }, { x: -1, y: 0 }, { x: 0, y: 2 }, { x: 1, y: 5 }, { x: 2, y: 2 }];
  // At zero the endpoints have zero tricube weight; the three interior points interpolate y(0)=2.
  close(quadraticNeighborhood(independent, 0, 1), 2);
  compare(fit(independent, { predict: { values: [-1.25, 0, 0.75] } }).values,
    quadraticLoess(independent, { span: 1, predict: [-1.25, 0, 0.75] }));
});

test("quadratic LOESS retains affine and quadratic fits under translated and scaled coordinates", () => {
  for (const response of [quadratic, x => 2 * x + 1]) {
    for (const [offset, scale, responseScale] of [[1e9, 3, 1], [0, 1e150, 1e150], [0, 1e-150, 1e-150]]) {
      const transformed = rows.map(row => ({ x: offset + row.x * scale, y: response(row.x) * responseScale }));
      const result = fit(transformed, { predict: { values: [-2.5, 0, 1.5].map(x => offset + x * scale) } });
      result.values.forEach((row, i) => close(row.y / responseScale, response([-2.5, 0, 1.5][i])));
    }
  }
  const extremes = [-1, -0.5, 0, 0.5, 1].map(x => ({ x: x * Number.MAX_VALUE, y: x * x }));
  fit(extremes).values.forEach((row, i) => close(row.y, [1, 0.25, 0, 0.25, 1][i]));
});

test("rank deficient neighborhoods use their weighted constant without expanding ties", () => {
  const tiny = fit([{ x: 0, y: 1 }, { x: 2, y: 5 }], { span: 0.01, predict: { values: [0, 1, 2] } });
  assert.equal(tiny.models[0].neighborCount, 2);
  assert.deepEqual(tiny.values, [{ x: 0, y: 1 }, { x: 1, y: 3 }, { x: 2, y: 5 }]);
  const tied = [{ x: 0, y: 0 }, { x: 0, y: 6 }, { x: 0, y: 9 }, { x: 0, y: 30 }, { x: 1, y: 10 }];
  const result = fit(tied, { span: 0.01 });
  assert.equal(result.models[0].neighborCount, 3);
  assert.deepEqual(result.models[0].fits[0].neighborIndices, [0, 1, 2]);
  close(result.values[0].y, 5);
  close(fit([tied[3], ...tied.slice(0, 3), tied[4]], { span: 0.01 }).values[0].y, 12);
});

test("quadratic robust fits and prediction grids follow final residual weights", () => {
  const noisy = Array.from({ length: 20 }, (_, x) => ({ x, y: 0.2 * x * x + 0.01 * Math.sin(x) + (x === 2 ? 80 : 0) }));
  const predict = [0, 0.5, 1.5, 8.25, 19, 20];
  const result = fit(noisy, { span: 0.7, robustIterations: 2, predict: { values: predict } });
  compare(result.values, quadraticLoess(noisy, { span: 0.7, robustIterations: 2, predict }));
  assert.equal(result.models[0].residualWeights[2], 0);
  const error = result => result.values.reduce((sum, row) => sum + Math.abs(row.y - 0.2 * row.x * row.x), 0);
  assert.ok(error(result) < error(fit(noisy, { span: 0.7, predict: { values: predict } })) / 10);
  const zeros = [{ x: 0, y: 100 }, { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }];
  const zeroResult = fit(zeros, { span: 0.1, robustIterations: 3 });
  assert.deepEqual(zeroResult.models[0].residualWeights, [0, 0, 1, 1, 1]);
  close(zeroResult.values[0].y, 50);
  compare(zeroResult.values, quadraticLoess(zeros, { span: 0.1, robustIterations: 3 }));
});

test("group order and empty policy remain explicit and source rows remain immutable", () => {
  const source = Object.freeze(rows.map(row => Object.freeze({ ...row, g: "B" })));
  const frozen = JSON.stringify(source);
  const grouped = [...source, ...rows.map(row => ({ ...row, y: row.y + 10, g: "A" }))];
  const result = fit(grouped, { groupBy: "g" });
  assert.deepEqual(result.groups, ["B", "A"]);
  result.values.forEach(row => close(row.y, quadratic(row.x) + (row.g === "A" ? 10 : 0)));
  fit(source);
  assert.equal(JSON.stringify(source), frozen);
  assert.throws(() => fit([]), /at least two rows/);
  assert.deepEqual(fit([], { groupBy: "g" }).values, []);
  for (const invalid of [[{ x: 0, y: 1 }], [{ x: 1, y: 2 }, { x: 1, y: 4 }]]) assert.throws(() => fit(invalid), /varying x/);
});

test("degree, finite values, generated rows and cumulative quadratic work validate before fitting", () => {
  for (const degree of [0, 3, 1.5, NaN, Infinity, null, "2"]) assert.throws(() => fit(rows, { degree }), /LOESS degree/);
  for (const extra of [{ interval: false }, { interval: "mean" }, { level: 0.95 }]) assert.throws(() => fit(rows, extra), /confidence intervals/);
  for (const value of [NaN, Infinity, "1"]) assert.throws(() => fit([{ x: 0, y: value }, { x: 1, y: 2 }]), /finite number/);
  assert.throws(() => fit([-2, -1, 0, 1, 2].map(x => ({ x, y: x * x * 1e307 })),
    { predict: { values: [10] } }), /outside the finite numeric range/);
  assert.throws(() => fit(rows, { predict: { values: Array.from({ length: 10001 }, (_, x) => x) } }), /row count/);
  const large = Array.from({ length: 160 }, (_, x) => ({ x, y: x + 1 }));
  assert.equal(fit(large, { degree: 1, robustIterations: 12 }).values.length, 160);
  assert.throws(() => fit(large, { robustIterations: 12 }), /computation/);
  const groups = [...large.map(row => ({ ...row, g: "A" })), ...large.map(row => ({ ...row, g: "B" }))];
  assert.equal(fit(large, { robustIterations: 5 }).values.length, 160);
  assert.throws(() => fit(groups, { groupBy: "g", robustIterations: 5 }), /computation/);
});
