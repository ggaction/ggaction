import assert from "node:assert/strict";
import test from "node:test";
import { flattenVariableWidthPath, flattenPathCommands } from "../../../src/grammar/pathGeometry.js";
import { sampleTrailCurve } from "../../../src/grammar/trailCurve.js";
import { buildPairedCurvePathCommands, CURVE_INTERPOLATIONS } from "../../../src/grammar/curveCommands.js";

const p = (x, y, width) => ({ x, y, width });
const line = [{ op: "M", x: 0, y: 0 }, { op: "L", x: 10, y: 0 }];
const cubic = [{ op: "M", x: 0, y: 0 }, { op: "C", x1: 10 / 3, y1: 0, x2: 20 / 3, y2: 0, x: 10, y: 0 }];

test("width sampling refines a straight centerline when cubic width varies", () => {
  const width = [{ op: "M", x: 0, y: 2 }, { op: "C", x1: 10 / 3, y1: 10, x2: 20 / 3, y2: 10, x: 10, y: 2 }];
  assert.equal(flattenPathCommands(cubic).subpaths[0].points.length, 2);
  const result = flattenVariableWidthPath(cubic, width, { tolerance: .01 });
  assert.equal(result.diagnostics.length, 0);
  assert.ok(result.subpaths[0].points.length > 4);
  assert.equal(Math.max(...result.subpaths[0].points.map(p => p.width)), 8);
  for (const point of result.subpaths[0].points) {
    const t = point.x / 10, expected = 2 + 24 * t * (1 - t);
    assert.ok(Math.abs(point.width - expected) < 1e-12);
  }
  const endpoints = result.subpaths[0].points;
  for (let i = 1; i < endpoints.length; i++) {
    const left = endpoints[i - 1], right = endpoints[i], t = (left.x + right.x) / 20;
    assert.ok(Math.abs((left.width + right.width) / 2 - (2 + 24 * t * (1 - t))) <= .01);
  }
});

test("private width sampling preserves the legacy exact geometry return shape", () => {
  assert.deepEqual(flattenPathCommands(line), { subpaths: [{ closed: false, hasSegments: true, points: [{ x: 0, y: 0 }, { x: 10, y: 0 }] }], diagnostics: [] });
  const widths = [{ op: "M", x: 0, y: 2 }, { op: "L", x: 10, y: 6 }];
  assert.deepEqual(flattenVariableWidthPath(line, widths).subpaths[0].points, [p(0, 0, 2), p(10, 0, 6)]);
  const closed = flattenVariableWidthPath([...line, { op: "Z" }], [...widths, { op: "Z" }]);
  assert.deepEqual(closed.subpaths[0].points.at(-1), p(0, 0, 2));
  assert.equal(closed.subpaths[0].closed, true);
});

test("Trail curve uses every existing centerline interpolation and retains endpoint widths", () => {
  const points = [p(0, 10, 2), p(10, 20, 4), p(20, 0, 6), p(30, 10, 8)];
  for (const curve of CURVE_INTERPOLATIONS) {
    const samples = sampleTrailCurve(points, { curve });
    assert.deepEqual(samples[0], points[0], curve);
    assert.deepEqual(samples.at(-1), points.at(-1), curve);
    assert.ok(samples.every(sample => sample.width >= 2 && sample.width <= 8), curve);
    assert.ok(Object.isFrozen(samples) && Object.isFrozen(samples[0]));
  }
  assert.deepEqual(sampleTrailCurve([]), []);
  assert.deepEqual(sampleTrailCurve([p(1, 2, 3)]), [p(1, 2, 3)]);
});

test("Trail width curves reject actual negative extrema rather than clamping or trusting positive endpoints", () => {
  const bad = [{ op: "M", x: 0, y: 1 }, { op: "C", x1: 3, y1: -10, x2: 7, y2: -10, x: 10, y: 1 }];
  assert.throws(() => flattenVariableWidthPath(cubic, bad), /nonnegative/);
  const safe = [{ op: "M", x: 0, y: 10 }, { op: "C", x1: 3, y1: -1, x2: 7, y2: 10, x: 10, y: 10 }];
  assert.doesNotThrow(() => flattenVariableWidthPath(cubic, safe));
  assert.throws(() => sampleTrailCurve([p(0, 0, 0), p(1, 0, 0), p(2, 0, 10), p(3, 0, 0)], { curve: "cardinal" }), /nonnegative/);
});

test("variable-width sampling retains bounded diagnostics and rejects mismatched topology", () => {
  const widths = [{ op: "M", x: 0, y: 2 }, { op: "C", x1: 3, y1: 10, x2: 7, y2: 10, x: 10, y: 2 }];
  assert.equal(flattenVariableWidthPath(cubic, widths, { maxDepth: 0 }).diagnostics[0].code, "path-subdivision-limit");
  assert.deepEqual(flattenVariableWidthPath(cubic, widths, { maxPoints: 2 }).subpaths, []);
  assert.throws(() => flattenVariableWidthPath(line, widths), /matching command topology/);
  assert.throws(() => flattenVariableWidthPath(line, widths.slice(0, 1)), /matching command topology/);
  assert.throws(() => sampleTrailCurve([p(0, 0, 1), p(1, 1, 1)], { curve: "unknown" }), /interpolation/);
  assert.throws(() => sampleTrailCurve([p(0, 0, -1)]), /width/);
  assert.throws(() => sampleTrailCurve([p(0, NaN, 1)]), /finite/);
  assert.throws(() => sampleTrailCurve([{ ...p(0, 0, 1), extra: true }]), /Unknown/);
  assert.throws(() => sampleTrailCurve([p(0, 0, 1), p(1, 1, 1)], { curve: "linear", tension: .5 }), /tension/);
});

test("Trail curve closes option descriptors and cumulative sample budget", () => {
  let accessed = false;
  assert.throws(() => sampleTrailCurve([], { get curve() { accessed = true; return "linear"; } }), /own data/);
  assert.equal(accessed, false);
  for (const options of [{ extra: true }, { curve: undefined }, { curve: null }]) assert.throws(() => sampleTrailCurve([], options));
  assert.throws(() => sampleTrailCurve(new Array(10001)), /sample count/);
  assert.throws(() => sampleTrailCurve({}, {}), /array/);
  assert.throws(() => sampleTrailCurve([p(0, 0, 1e8), p(1, 1, 2e8), p(2, 0, 2e8), p(3, 1, 1e8)], { curve: "cardinal" }), /bounded sampling/);
});


test("Trail curves retain paired widths across vertical and coincident authored knots", () => {
  const vertical = [p(0, 0, 2), p(0, 5, 2), p(10, 10, 3)];
  const result = sampleTrailCurve(vertical, { curve: "monotone-steffen" });
  assert.deepEqual(result[0], vertical[0]);
  assert.deepEqual(result.at(-1), vertical.at(-1));
  assert.ok(result.some(point => point.x === 0 && point.y === 5 && point.width === 2));
  for (const curve of CURVE_INTERPOLATIONS) {
    const repeated = [p(0, 0, 1), p(0, 0, 2), p(10, 10, 3)];
    assert.deepEqual(sampleTrailCurve(repeated, { curve })[0], p(0, 0, 2));
    assert.deepEqual(sampleTrailCurve([p(0, 0, 1), p(0, 0, 3)], { curve }), [p(0, 0, 3)]);
  }
  const paired = buildPairedCurvePathCommands([{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 10, y: 10 }], [1, 2, 3], "monotone-steffen");
  assert.equal(buildPairedCurvePathCommands([{ x: 0, y: 0 }, { x: 0, y: 0 }], [2, 2], "monotone-steffen").valueCommands.length, 1);
  assert.deepEqual(paired.commands.map(command => command.op), paired.valueCommands.map(command => command.op));
  assert.throws(() => buildPairedCurvePathCommands([{ x: 0, y: 0 }, { x: 1, y: 1 }], [1, Infinity]), /finite value/);
  assert.throws(() => buildPairedCurvePathCommands([{ x: 0, y: 0 }, { x: 1, y: 1 }], []), /finite value/);
});
