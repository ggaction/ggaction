import assert from "node:assert/strict";
import test from "node:test";
import { layoutPyramidStages, normalizePyramidOptions } from "../../../src/grammar/pyramid/layout.js";
import { signedPolygonArea } from "../../oracles/geometry.js";

const rows = values => values.map((value, index) => ({ key: `stage-${index}`, value }));
const layout = (values = [100, 60, 20], patch = {}) => layoutPyramidStages(rows(values), { width: 100, height: 90, ...patch });
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) <= 1e-10 * Math.max(1, Math.abs(expected)), `${actual} != ${expected}`);

test("stage widths and literal polygons preserve input order and a flat final stage", () => {
  const result = layout();
  assert.deepEqual(result.stages.map(stage => [stage.topWidth, stage.bottomWidth, stage.stageLength]), [[100, 60, 30], [60, 20, 30], [20, 20, 30]]);
  assert.deepEqual(result.stages.map(stage => stage.points), [
    [[0, 0], [100, 0], [80, 30], [20, 30]],
    [[20, 30], [80, 30], [60, 60], [40, 60]],
    [[40, 60], [60, 60], [60, 90], [40, 90]]
  ]);
  assert.deepEqual(result.stages.map(stage => stage.area), [2400, 1200, 600]);
  const reordered = layout([60, 100, 20]);
  assert.deepEqual(reordered.stages.map(stage => [stage.value, stage.sourceIndex, stage.topWidth]), [[60, 0, 60], [100, 1, 100], [20, 2, 20]]);
});

test("area encoding follows value proportions without imposing adjacent width continuity", () => {
  const result = layout(undefined, { encoding: "area" });
  assert.deepEqual(result.stages.map(stage => [stage.topWidth, stage.bottomWidth, stage.area]), [[100, 80, 2700], [60, 48, 1620], [20, 16, 540]]);
  for (const stage of result.stages) close(Math.abs(signedPolygonArea(stage.points)), stage.value * 27);
  assert.notEqual(result.stages[0].bottomWidth, result.stages[1].topWidth);
  for (const taperRatio of [0, .25, 1]) {
    const stages = layout(undefined, { encoding: "area", taperRatio }).stages;
    close(stages[0].area / stages[2].area, 5);
    assert.equal(stages[0].bottomWidth, taperRatio * 100);
  }
});

test("four directions rotate or reflect the same ordered physical trapezoids", () => {
  const expected = {
    down: [[0, 0], [100, 0], [80, 30], [20, 30]],
    up: [[0, 90], [100, 90], [80, 60], [20, 60]],
    right: [[0, 0], [0, 100], [30, 80], [30, 20]],
    left: [[90, 0], [90, 100], [60, 80], [60, 20]]
  };
  for (const orientation of Object.keys(expected)) {
    const horizontal = orientation === "left" || orientation === "right";
    const result = layout(undefined, { orientation, width: horizontal ? 90 : 100, height: horizontal ? 100 : 90 });
    assert.deepEqual(result.stages[0].points, expected[orientation]);
    assert.deepEqual(result.stages.map(stage => stage.value), [100, 60, 20]);
    for (const stage of result.stages) close(Math.abs(signedPolygonArea(stage.points)), stage.area);
  }
});

test("gaps occupy only adjacent stage boundaries and point termination is explicit", () => {
  const result = layout(undefined, { gap: 15, lastStage: "point" });
  assert.deepEqual(result.stages.map(stage => [stage.bounds.top, stage.bounds.bottom]), [[0, 20], [35, 55], [70, 90]]);
  assert.deepEqual(result.stages[2].points, [[40, 70], [60, 70], [50, 90], [50, 90]]);
  assert.equal(result.stages[2].area, 200);
  assert.equal(layout([10], { gap: 1000 }).stages[0].stageLength, 90);
  assert.ok(layout(undefined, { gap: 45 }).stages.every(stage => stage.area === 0));
  assert.throws(() => layout(undefined, { gap: 45.1 }), /gaps exceed/);
});

test("percent labels require an explicit base and distinguish missing zero denominators", () => {
  assert.deepEqual(layout().stages.map(stage => stage.percent), [null, null, null]);
  assert.deepEqual(layout(undefined, { percentBase: "first" }).stages.map(stage => stage.percent), [1, .6, .2]);
  const previous = layout(undefined, { percentBase: "previous" }).stages.map(stage => stage.percent);
  assert.equal(previous[0], null); close(previous[1], .6); close(previous[2], 1 / 3);
  const total = layout(undefined, { percentBase: "total" }).stages.map(stage => stage.percent);
  [5 / 9, 1 / 3, 1 / 9].forEach((value, index) => close(total[index], value));
  assert.deepEqual(layout([0, 10, 0], { percentBase: "previous" }).stages.map(stage => stage.percent), [null, null, 0]);
  assert.deepEqual(layout([0, 10], { percentBase: "first" }).stages.map(stage => stage.percent), [null, null]);
});

test("empty zero and very large finite values retain distinct bounded geometry", () => {
  assert.deepEqual(layout([]).stages, []);
  for (const encoding of ["width", "area"]) for (const percentBase of ["first", "total", "previous"]) {
    const result = layout([0, 0], { encoding, percentBase });
    assert.equal(result.stages.length, 2);
    assert.ok(result.stages.every(stage => stage.topWidth === 0 && stage.bottomWidth === 0 && stage.area === 0 && stage.percent === null));
  }
  const result = layout([Number.MAX_VALUE, Number.MAX_VALUE], { percentBase: "total" });
  assert.deepEqual(result.stages.map(stage => stage.percent), [.5, .5]);
  assert.ok(result.stages.every(stage => stage.topWidth === 100));
  assert.throws(() => layout([1e-300, 1e300], { percentBase: "first" }), /remain finite/);
  assert.throws(() => layout([1], { width: Number.MAX_VALUE, height: Number.MAX_VALUE }), /remain finite/);
});

test("typed keys are unique and input records and returned values have separate immutable ownership", () => {
  const input = [{ key: [1, "A"], value: 100 }, { key: ["1", "A"], value: 60 }], options = { width: 100, height: 90 };
  const before = structuredClone(input), result = layoutPyramidStages(input, options);
  assert.deepEqual(input, before); assert.deepEqual(options, { width: 100, height: 90 });
  input[0].key[0] = 2; input[0].value = 0;
  assert.deepEqual(result.stages[0].key, [1, "A"]); assert.equal(result.stages[0].value, 100);
  assert.throws(() => { result.stages[0].points[0][0] = -1; }, TypeError);
  assert.throws(() => layoutPyramidStages([{ key: "A", value: 1 }, { key: "A", value: 2 }], options), /unique/);
});

test("closed own-data boundaries reject invalid inputs without invoking accessors", () => {
  for (const patch of [{ width: 0 }, { height: Infinity }, { gap: -1 }, { orientation: "diagonal" }, { encoding: "volume" },
    { lastStage: "triangle" }, { taperRatio: .8 }, { encoding: "area", lastStage: "flat" }, { encoding: "area", taperRatio: 2 },
    { percentBase: "maximum" }, { gap: null }, { gap: undefined }, { order: "descending" }]) assert.throws(() => layout(undefined, patch));
  for (const value of [-1, NaN, Infinity, "1", null, undefined]) assert.throws(() => layout([value]));
  const options = { width: 100, height: 90 };
  for (const input of [null, {}, new Array(1), Array.from({ length: 10001 }, () => ({ key: "x", value: 0 })), [{ key: "x", value: 1, extra: true }], [{ value: 1 }]]) assert.throws(() => layoutPyramidStages(input, options));
  let called = false;
  const evil = { key: "x", get value() { called = true; throw new Error("accessor"); } };
  assert.throws(() => layoutPyramidStages([evil], options), /own data/); assert.equal(called, false);
  assert.throws(() => normalizePyramidOptions({ width: 100, get height() { called = true; return 90; } }), /own data/); assert.equal(called, false);
});

test("deterministic value sequences keep area proportional and polygons inside every oriented viewport", () => {
  let seed = 1979;
  const values = Array.from({ length: 127 }, () => { seed = (seed * 48271) % 2147483647; return seed % 101; });
  for (const orientation of ["down", "up", "left", "right"]) {
    const options = { orientation, width: 617, height: 433, gap: 1, encoding: "area", taperRatio: .3 };
    const result = layout(values, options);
    assert.deepEqual(result, layout(values, options));
    let ratio;
    for (const stage of result.stages) {
      for (const [x, y] of stage.points) { assert.ok(x >= 0 && x <= 617); assert.ok(y >= 0 && y <= 433); }
      close(Math.abs(signedPolygonArea(stage.points)), stage.area);
      if (stage.value) { ratio ??= stage.area / stage.value; close(stage.area / stage.value, ratio); }
    }
  }
});
