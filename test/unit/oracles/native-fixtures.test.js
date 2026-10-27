import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fixtureHash, validateFixtures, assertFixtureResult, seededInput } from "../../oracles/native-fixtures.js";
import { normalizedIntervals } from "../../oracles/numeric.js";
import { signedPolygonArea } from "../../oracles/geometry.js";
import { captureState, assertUnchanged } from "../../oracles/state.js";
import { manualClock } from "../../oracles/time.js";
import { assetDigest, assertAsset } from "../../oracles/assets.js";
import { chart } from "../../../src/ChartProgram.js";
import { renderToSVG } from "../../../src/renderers/svg.js";

const fixtures = JSON.parse(readFileSync(new URL("../../fixtures/verification.json", import.meta.url), "utf8"));

test("anchors independent numeric, geometry, state, time and asset references in literal fixtures", () => {
  assert.equal(validateFixtures(fixtures), fixtureHash(fixtures));
  const [numeric, geometry, state, time, asset] = fixtures;
  assertFixtureResult(numeric, normalizedIntervals(numeric.input));
  assertFixtureResult(geometry, signedPolygonArea(geometry.input));
  assertFixtureResult(state, captureState(state.input));
  const clock = manualClock();
  assertFixtureResult(time, time.input.map(delta => clock.advance(delta)));
  assertFixtureResult(asset, { sha256: assetDigest(Uint8Array.from(asset.input)), byteLength: asset.input.length });
  assertAsset(Uint8Array.from(asset.input), asset.expected);
  assert.throws(() => assertAsset(Uint8Array.from([97, 98, 100]), asset.expected), /digest/);
  assert.throws(() => assertAsset(Uint8Array.from(asset.input), { ...asset.expected, byteLength: 4 }), /size/);
  assert.throws(() => assertFixtureResult(numeric, [[0, 0.3], [0.3, 1]]));
  assert.throws(() => assertFixtureResult(geometry, 5));
  assert.throws(() => assertFixtureResult(time, [0, 10, 21]));
});

test("compares exact structure and finite values with explicit absolute and relative tolerance", () => {
  const fixture = { ...fixtures[0], expected: { nearZero: 0, large: 1e8 }, tolerance: { absolute: 1e-8, relative: 1e-6 } };
  assertFixtureResult(fixture, { nearZero: 1e-9, large: 1e8 + 50 });
  for (const actual of [{ nearZero: 1e-6, large: 1e8 }, { nearZero: 0, large: 1e8 + 1000 }, { nearZero: 0 }, { nearZero: 0, large: 1e8, extra: true }, { nearZero: "0", large: 1e8 }]) {
    assert.throws(() => assertFixtureResult(fixture, actual));
  }
  assert.throws(() => assertFixtureResult({ ...fixtures[0], expected: Number.MAX_VALUE }, -Number.MAX_VALUE));
});

test("rejects lossy fixtures, duplicate identities, invalid tolerances and resource limits", () => {
  const cycle = {}; cycle.self = cycle;
  for (const value of [undefined, NaN, Infinity, 1n, new Date(), cycle, [, 1], { get value() { return 1; } }]) {
    assert.throws(() => fixtureHash(value));
  }
  for (const list of [[], [fixtures[0], fixtures[0]], [{ ...fixtures[0], domain: "unknown" }], [{ ...fixtures[0], tolerance: { absolute: -1, relative: 0 } }], [{ ...fixtures[0], expected: undefined }]]) {
    assert.throws(() => validateFixtures(list));
  }
  assert.throws(() => fixtureHash(Array(10001).fill(0)), /limit/);
  assert.throws(() => fixtureHash(Array.from({ length: 66 }).reduce(value => [value], 0)), /limit/);
  assert.equal(fixtureHash({ b: 2, a: 1 }), fixtureHash({ a: 1, b: 2 }));
});

test("seeded inputs repeat exactly and partition references conserve finite positive weight", () => {
  const a = seededInput(0), b = seededInput(0);
  assert.equal(a(), 1013904223 / 4294967296);
  b();
  const left = Array.from({ length: 100 }, a), right = Array.from({ length: 100 }, b);
  assert.deepEqual(left, right);
  assert.equal(fixtureHash(left), fixtureHash(right));
  assert.notEqual(seededInput(1)(), seededInput(0)());
  for (const seed of [-1, 0.5, NaN, 4294967296]) assert.throws(() => seededInput(seed));
  const intervals = normalizedIntervals(left);
  assert.equal(intervals[0][0], 0);
  assert.equal(intervals.at(-1)[1], 1);
  assert.ok(intervals.every(([start, end], i) => start <= end && (i === 0 || start === intervals[i - 1][1])));
  assert.deepEqual(normalizedIntervals([1, 0, 3]), [[0, 0.25], [0.25, 0.25], [0.25, 1]]);
  for (const weights of [[], [0, 0], [-1, 2], [NaN], [Number.MAX_VALUE, Number.MAX_VALUE]]) assert.throws(() => normalizedIntervals(weights));
});

test("geometry orientation and state snapshots expose mutations instead of accepting shared references", () => {
  assert.equal(signedPolygonArea([...fixtures[1].input].reverse()), -6);
  assert.equal(signedPolygonArea([[0, 0], [1, 0], [2, 0]]), 0);
  for (const points of [[], [[0, 0], [1, 1]], [[0, 0], [1, 1], [NaN, 2]]]) assert.throws(() => signedPolygonArea(points));
  const value = { values: [1, 2], trace: [] }, before = captureState(value);
  assertUnchanged(value, before);
  value.values[1] = 3;
  assert.throws(() => assertUnchanged(value, before));
  assert.deepEqual(before, { values: [1, 2], trace: [] });
});

test("state oracle checks an invalid public edit preserves semantic, graphic and trace state", () => {
  const program = chart().createCanvas({ width: 200, height: 120, margin: 10 })
    .createData({ values: [{ x: 1, y: 2 }, { x: 2, y: 3 }] })
    .createPointMark({ id: "points" }).encodeX({ field: "x" }).encodeY({ field: "y" });
  const state = () => ({ semantic: program.semanticSpec, graphic: program.graphicSpec, trace: program.trace });
  const before = captureState(state()), svg = renderToSVG(program);
  assert.throws(() => program.editPointMark({ target: "points", opacity: 2 }));
  assertUnchanged(state(), before);
  assert.equal(renderToSVG(program), svg);
  const edited = program.editPointMark({ target: "points", opacity: 0.5 });
  assert.notEqual(renderToSVG(edited), svg);
  assertUnchanged(state(), before);
});

test("manual clock preserves next-frame ordering and cancellation without host timers", () => {
  const clock = manualClock(), times = [];
  clock.requestFrame(now => {
    times.push(now);
    clock.requestFrame(next => times.push(next));
  });
  const cancelled = clock.requestFrame(() => assert.fail("Cancelled callback ran."));
  clock.cancelFrame(cancelled);
  clock.advance(10);
  assert.deepEqual(times, [10]);
  assert.equal(clock.pending(), 1);
  clock.advance(10);
  assert.deepEqual(times, [10, 20]);
  assert.equal(clock.pending(), 0);
  assert.throws(() => clock.advance(-1));
  assert.throws(() => clock.advance(Infinity));
  assert.equal(clock.now(), 20);
  assert.throws(() => manualClock(-1));
  assert.throws(() => clock.requestFrame(null));
  for (let i = 0; i < 10000; i++) clock.requestFrame(() => {});
  assert.throws(() => clock.requestFrame(() => {}), /limit/);
});
