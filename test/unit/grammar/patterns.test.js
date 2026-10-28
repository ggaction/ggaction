import assert from "node:assert/strict";
import test from "node:test";
import { createPatternTile, normalizePatternOptions, PATTERN_STYLES, resolvePatternOrigin } from "../../../src/grammar/patterns.js";
import { MAX_WORK_ITEMS } from "../../../src/core/validation.js";
import { patternInk, polygonArea, polygonContains } from "../../oracles/patterns.js";

const square = [[0, 0], [1, 0], [1, 1], [0, 1]];
const ink = (tile, x, y) => tile.polygons.some(points => polygonContains(points, x, y)) ||
  tile.circles.some(circle => Math.hypot(x - circle.x, y - circle.y) <= circle.radius);

test("normalizes the seven exact pattern styles with immutable explicit defaults", () => {
  assert.deepEqual(PATTERN_STYLES, ["solid", "diagonal", "antidiagonal", "horizontal", "vertical", "cross", "dots"]);
  assert.deepEqual(normalizePatternOptions(), {
    style: "solid", pitch: 8, strokeWidth: 1, phase: [0, 0],
    foreground: "#000000", background: "transparent", coordinateSpace: "plot"
  });
  const options = { style: "diagonal", phase: [-1, 17], foreground: "rgba(12, 34, 56, 0.25)", background: "#1234" };
  const normalized = normalizePatternOptions(options);
  assert.deepEqual(normalized.phase, [7, 1]);
  assert.equal(normalized.foreground, options.foreground);
  assert.equal(normalized.background, options.background);
  options.phase[0] = 5;
  assert.deepEqual(normalized.phase, [7, 1]);
  assert.ok(Object.isFrozen(normalized) && Object.isFrozen(normalized.phase) && Object.isFrozen(PATTERN_STYLES));
  assert.deepEqual(normalizePatternOptions(normalized), normalized);
});

test("wraps signed and extreme finite phases without overflow or negative zero", () => {
  assert.deepEqual(normalizePatternOptions({ phase: [-0, -16] }).phase, [0, 0]);
  assert.deepEqual(normalizePatternOptions({ phase: [-Number.MIN_VALUE, 8] }).phase, [0, 0]);
  const phase = normalizePatternOptions({ pitch: Number.MAX_VALUE, phase: [Number.MAX_VALUE, -Number.MAX_VALUE / 2] }).phase;
  assert.deepEqual(phase, [0, Number.MAX_VALUE / 2]);
  for (const pitch of [Number.MIN_VALUE, 0.25, 8, Number.MAX_VALUE]) {
    for (const phase of [[Number.MAX_VALUE, -Number.MAX_VALUE], [-101.25, 45.75]]) {
      for (const value of normalizePatternOptions({ pitch, phase }).phase) {
        assert.ok(Number.isFinite(value) && value >= 0 && value < pitch);
      }
    }
  }
});

test("rejects unsupported options, invalid scalars and invalid solid color shapes", () => {
  for (const value of [null, [], new Date(), 1, "solid"]) assert.throws(() => normalizePatternOptions(value));
  for (const value of [null, "grid", "Diagonal", 1]) assert.throws(() => normalizePatternOptions({ style: value }));
  for (const value of [0, -1, Infinity, NaN, null, "8"]) assert.throws(() => normalizePatternOptions({ pitch: value }));
  for (const value of [-1, Infinity, NaN, null, "1"]) assert.throws(() => normalizePatternOptions({ strokeWidth: value }));
  for (const value of [null, [], [0], [0, 0, 0], [Infinity, 0], ["0", 0], [, 0]]) {
    assert.throws(() => normalizePatternOptions({ phase: value }));
  }
  for (const value of ["", null, { type: "linear-gradient" }, 7]) {
    assert.throws(() => normalizePatternOptions({ foreground: value }));
    assert.throws(() => normalizePatternOptions({ background: value }));
  }
  for (const options of [{ id: "unused" }, { pitch: undefined }, { coordinateSpace: "canvas" }, { coordinateSpace: null }]) {
    assert.throws(() => normalizePatternOptions(options));
  }
  assert.throws(() => normalizePatternOptions({ foreground: "x".repeat(MAX_WORK_ITEMS + 1) }), /must not exceed/);
  assert.equal(normalizePatternOptions({ strokeWidth: -0 }).strokeWidth, 0);
});

test("checks own descriptors before reading any caller property", () => {
  let calls = 0;
  const getter = { get style() { calls += 1; return "solid"; } };
  assert.throws(() => normalizePatternOptions(getter), /data properties/);
  const phase = [0, 0];
  Object.defineProperty(phase, 0, { enumerable: true, get() { calls += 1; return 0; } });
  assert.throws(() => normalizePatternOptions({ phase }), /data properties/);
  assert.throws(() => normalizePatternOptions({ [Symbol("key")]: 1 }), /data properties/);
  assert.throws(() => normalizePatternOptions(Object.defineProperty({}, "pitch", { value: 8 })), /data properties/);
  assert.throws(() => normalizePatternOptions({ phase: Object.assign([0, 0], { extra: 1 }) }), /extra properties/);
  assert.equal(calls, 0);
});

test("solid ignores repetition and stroke width while empty patterns preserve background", () => {
  const solid = createPatternTile({ strokeWidth: 0, foreground: "#1234", phase: [3, 4] });
  assert.equal(solid.repeat, false);
  assert.deepEqual(solid.polygons, [square]);
  assert.deepEqual(solid.circles, []);
  for (const style of PATTERN_STYLES.slice(1)) {
    const empty = createPatternTile({ style, strokeWidth: 0, background: "#fff" });
    assert.equal(empty.repeat, true);
    assert.deepEqual(empty.polygons, []);
    assert.deepEqual(empty.circles, []);
    assert.equal(empty.options.background, "#fff");
  }
});

test("horizontal, vertical and cross tiles have literal clipped stripe geometry", () => {
  const horizontal = createPatternTile({ style: "horizontal", pitch: 8, strokeWidth: 2 });
  const vertical = createPatternTile({ style: "vertical", pitch: 8, strokeWidth: 2 });
  assert.deepEqual(horizontal.polygons, [
    [[0, 0], [1, 0], [1, 0.125], [0, 0.125]],
    [[0, 0.875], [1, 0.875], [1, 1], [0, 1]]
  ]);
  assert.deepEqual(vertical.polygons, [
    [[0, 0], [0.125, 0], [0.125, 1], [0, 1]],
    [[0.875, 0], [1, 0], [1, 1], [0.875, 1]]
  ]);
  const cross = createPatternTile({ style: "cross", pitch: 8, strokeWidth: 2 });
  assert.deepEqual(cross.polygons, [...horizontal.polygons,
    [[0, 0.125], [0.125, 0.125], [0.125, 0.875], [0, 0.875]],
    [[0.875, 0.125], [1, 0.125], [1, 0.875], [0.875, 0.875]]
  ]);
  assert.equal(horizontal.polygons.reduce((sum, polygon) => sum + polygonArea(polygon), 0), 0.25);
  assert.equal(cross.polygons.reduce((sum, polygon) => sum + polygonArea(polygon), 0), 0.4375);
});

test("diagonal tiles have opposite exact directions and wrap both edge corners", () => {
  const diagonal = createPatternTile({ style: "diagonal", pitch: 8, strokeWidth: 2 * Math.SQRT2 });
  assert.deepEqual(diagonal.polygons, [
    [[0.75, 0], [1, 0], [1, 0.25]],
    [[0, 0], [0.25, 0], [1, 0.75], [1, 1], [0.75, 1], [0, 0.25]],
    [[0, 0.75], [0.25, 1], [0, 1]]
  ]);
  const anti = createPatternTile({ style: "antidiagonal", pitch: 8, strokeWidth: 2 * Math.SQRT2 });
  assert.deepEqual(anti.polygons, [
    [[0, 0], [0.25, 0], [0, 0.25]],
    [[0, 0.75], [0.75, 0], [1, 0], [1, 0.25], [0.25, 1], [0, 1]],
    [[0.75, 1], [1, 0.75], [1, 1]]
  ]);
  assert.equal(diagonal.polygons.reduce((sum, polygon) => sum + polygonArea(polygon), 0), 0.5);
  assert.equal(ink(diagonal, 0.2, 0.2), true);
  assert.equal(ink(diagonal, 0.2, 0.8), false);
  assert.equal(ink(anti, 0.2, 0.8), true);
  assert.equal(ink(anti, 0.2, 0.2), false);
});

test("dots use half the stroke width as radius and retain wrapped corner circles", () => {
  const dots = createPatternTile({ style: "dots", pitch: 8, strokeWidth: 2 });
  assert.deepEqual(dots.polygons, []);
  assert.deepEqual(dots.circles, [
    { x: 0, y: 0, radius: 0.125 }, { x: 1, y: 0, radius: 0.125 },
    { x: 0, y: 1, radius: 0.125 }, { x: 1, y: 1, radius: 0.125 }
  ]);
  assert.equal(patternInk("dots", 0.05, 0.05, 0.25), true);
  assert.equal(patternInk("dots", 0.5, 0.5, 0.25), false);
  assert.equal(patternInk("solid", 0.5, 0.5, 0), true);
  assert.equal(patternInk("horizontal", 0.5, 0, 0), false);
});

test("all styles agree with independent periodic coverage across widths and tiles", () => {
  for (const style of PATTERN_STYLES) for (const width of [0, 0.2, 0.6, 0.9, 1.2, 2]) {
    const tile = createPatternTile({ style, pitch: 1, strokeWidth: width });
    for (let xIndex = 0; xIndex < 25; xIndex += 1) for (let yIndex = 0; yIndex < 25; yIndex += 1) {
      const x = (xIndex + 0.37) / 25, y = (yIndex + 0.61) / 25;
      const expected = patternInk(style, x, y, width);
      assert.equal(ink(tile, x, y), expected, `${style} ${width} at ${x},${y}`);
      assert.equal(patternInk(style, x + 2, y - 3, width), expected);
    }
  }
});

test("geometry is bounded, positive winding and immutable for every style", () => {
  for (const style of PATTERN_STYLES) {
    const tile = createPatternTile({ style });
    assert.equal(tile.fillRule, "nonzero");
    assert.deepEqual(tile.bounds, { x: 0, y: 0, width: 1, height: 1 });
    assert.ok(tile.polygons.length + tile.circles.length <= 4);
    assert.ok(tile.polygons.flat().length <= 16);
    for (const polygon of tile.polygons) {
      assert.ok(polygonArea(polygon) > 0);
      for (const point of polygon) {
        assert.ok(Object.isFrozen(point));
        assert.ok(point.every(value => Number.isFinite(value) && value >= 0 && value <= 1));
      }
    }
    for (const circle of tile.circles) assert.ok(Object.isFrozen(circle) && circle.radius > 0 && circle.radius < Math.SQRT1_2);
    assert.ok(Object.isFrozen(tile) && Object.isFrozen(tile.polygons) && Object.isFrozen(tile.circles));
    assert.throws(() => { tile.options.foreground = "red"; }, TypeError);
  }
});

test("wide strokes saturate before unsafe division without unbounded enumeration", () => {
  for (const style of PATTERN_STYLES) {
    const wide = createPatternTile({ style, pitch: Number.MIN_VALUE, strokeWidth: Number.MAX_VALUE });
    assert.deepEqual(wide.polygons, [square]);
    assert.deepEqual(wide.circles, []);
  }
  for (const style of PATTERN_STYLES.slice(1)) {
    assert.throws(() => createPatternTile({ style, pitch: Number.MAX_VALUE, strokeWidth: Number.MIN_VALUE }), /too small/);
  }
  for (const style of PATTERN_STYLES) {
    const tiny = createPatternTile({ style, pitch: Number.MIN_VALUE, strokeWidth: Number.MIN_VALUE });
    assert.ok([...tiny.polygons.flat(2), ...tiny.circles.flatMap(circle => Object.values(circle))].every(Number.isFinite));
  }
});

test("unit geometry is scale invariant and phases move the origin instead of deforming a tile", () => {
  for (const style of PATTERN_STYLES) {
    const first = createPatternTile({ style, pitch: 8, strokeWidth: 2 });
    const second = createPatternTile({ style, pitch: 1024, strokeWidth: 256, phase: [100, -25] });
    assert.deepEqual(first.polygons, second.polygons);
    assert.deepEqual(first.circles, second.circles);
  }
  const origins = { plot: [10, 20], object: [30, 40] };
  assert.deepEqual(resolvePatternOrigin({ phase: [-1, 9] }, origins), [17, 21]);
  assert.deepEqual(resolvePatternOrigin({ coordinateSpace: "object", phase: [-1, 9] }, origins), [37, 41]);
  assert.deepEqual(resolvePatternOrigin({}, { plot: [-0, 0] }), [0, 0]);
  assert.ok(Object.isFrozen(resolvePatternOrigin({}, origins)));
  assert.deepEqual(origins, { plot: [10, 20], object: [30, 40] });
});

test("rejects rounded-away strip boundaries while retaining representable small geometry", () => {
  for (const style of ["diagonal", "antidiagonal", "horizontal", "vertical", "cross"]) {
    assert.throws(() => createPatternTile({ style, pitch: 1, strokeWidth: 1e-20 }), /too small/);
    const tile = createPatternTile({ style, pitch: 1, strokeWidth: 4 * Number.EPSILON });
    for (const polygon of tile.polygons) assert.ok(polygonArea(polygon) > 0);
  }
  assert.throws(() => createPatternTile({ style: "antidiagonal", pitch: 1, strokeWidth: Number.EPSILON }), /too small/);
  assert.equal(createPatternTile({ style: "dots", pitch: 1, strokeWidth: 1e-20 }).circles[0].radius, 5e-21);
});

test("origin resolution requires exact explicit finite origins and detects overflow", () => {
  assert.throws(() => resolvePatternOrigin({}, {}), /explicit plot/);
  assert.throws(() => resolvePatternOrigin({ coordinateSpace: "object" }, { plot: [0, 0] }), /explicit object/);
  for (const origins of [null, [], { plot: [NaN, 0] }, { plot: [0] }, { plot: [0, 0], extra: 0 }]) {
    assert.throws(() => resolvePatternOrigin({}, origins));
  }
  let calls = 0;
  assert.throws(() => resolvePatternOrigin({}, { get plot() { calls += 1; return [0, 0]; } }), /data properties/);
  assert.equal(calls, 0);
  assert.throws(() => resolvePatternOrigin({ pitch: Number.MAX_VALUE, phase: [Number.MAX_VALUE / 2, 0] },
    { plot: [Number.MAX_VALUE, 0] }), /finite coordinates/);
});
