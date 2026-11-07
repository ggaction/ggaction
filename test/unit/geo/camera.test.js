import test from "node:test";
import assert from "node:assert/strict";
import { applyGeoCamera } from "../../../src/grammar/geo/camera.js";
import { interpolateGeoCamera } from "../../../src/grammar/geo/cameraInterpolation.js";
import { createProjectionKernel } from "../../../src/grammar/geo/projections.js";
import { normalizeProjectionOptions } from "../../../src/grammar/geo/projectionOptions.js";

const plane = { type: "identity", scalePx: 2, translatePx: [20, 30] };
const extent = [0.1, 10000];
function close(actual, expected, tolerance = 1e-9) {
  assert.equal(actual.length, expected.length);
  actual.forEach((value, index) => assert.ok(Math.abs(value - expected[index]) <= tolerance, `${value} != ${expected[index]}`));
}

test("camera pan and bounded zoom preserve planar anchors and caller-owned input", () => {
  const original = structuredClone(plane), operation = { type: "zoom", anchorPx: [80, 100], factor: 3, scaleExtent: extent };
  const snapshot = structuredClone(operation), pan = applyGeoCamera(plane, { type: "pan", deltaPx: [-10, 5] });
  close(pan.translatePx, [10, 35]);
  const zoom = applyGeoCamera(plane, operation);
  assert.equal(zoom.scalePx, 6); close(zoom.translatePx, [-100, -110]);
  close(createProjectionKernel(zoom).forward([30, 35]).point, [80, 100]);
  const limited = applyGeoCamera(plane, { ...operation, scaleExtent: [1, 4] });
  assert.equal(limited.scalePx, 4); close(createProjectionKernel(limited).forward([30, 35]).point, [80, 100]);
  const minimum = applyGeoCamera(plane, { ...operation, factor: 0.001, scaleExtent: [1, 4] });
  assert.equal(minimum.scalePx, 1); close(createProjectionKernel(minimum).forward([30, 35]).point, [80, 100]);
  assert.deepEqual(plane, original); assert.deepEqual(operation, snapshot); assert.ok(Object.isFrozen(zoom.translatePx));
});

test("zoom anchors survive spherical reflections, rotations, clipping and each composite inset", () => {
  for (const input of [
    { type: "mercator", scalePx: 100, translatePx: [200, 150], rotateDeg: [30, 20, 10], reflectX: true, reflectY: true },
    { type: "orthographic", scalePx: 100, translatePx: [200, 150], rotateDeg: [20, -15, 5], clipExtentPx: [[0, 0], [400, 300]] },
    { type: "albers-usa", scalePx: 1000, translatePx: [480, 250] }
  ]) {
    const points = input.type === "albers-usa" ? [[-100, 40], [-150, 64], [-157, 20]] : [[0, 0], [10, 20]];
    for (const point of points) {
      const before = createProjectionKernel(input).forward(point);
      const after = applyGeoCamera(input, { type: "zoom", anchorPx: before.point, factor: 1.7, scaleExtent: extent });
      const projected = createProjectionKernel(after).forward(point);
      close(projected.point, before.point, 0.25); assert.equal(projected.component, before.component);
      close(createProjectionKernel(after).inverse(projected.point).point, point, 1e-6);
    }
  }
});

test("pinch combines center translation and distance ratio in one camera result", () => {
  const result = applyGeoCamera(plane, { type: "pinch", fromPx: [[60, 100], [100, 100]], toPx: [[40, 130], [120, 130]], scaleExtent: extent });
  assert.equal(result.scalePx, 4); close(result.translatePx, [-40, -10]);
  close(createProjectionKernel(result).forward([30, 35]).point, [80, 130]);
  const bounded = applyGeoCamera(plane, { type: "pinch", fromPx: [[60, 100], [100, 100]], toPx: [[0, 120], [160, 120]], scaleExtent: [1, 3] });
  assert.equal(bounded.scalePx, 3); close(createProjectionKernel(bounded).forward([30, 35]).point, [80, 120]);
});

test("spherical rotation is distinct from planar translation and reset restores the explicit initial state exactly", () => {
  const initial = normalizeProjectionOptions({ type: "orthographic", scalePx: 100, translatePx: [200, 150] });
  const rotated = applyGeoCamera(initial, { type: "rotate", rotateDeg: [180, 0] });
  close(createProjectionKernel(rotated).forward([180, 0]).point, [200, 150]);
  assert.equal(createProjectionKernel(rotated).forward([0, 0]).point, null);
  assert.deepEqual(applyGeoCamera(rotated, { type: "reset", initial }), initial);
  assert.notEqual(applyGeoCamera(rotated, { type: "reset", initial }), initial);
  for (const type of ["identity", "albers-usa"]) assert.throws(() => applyGeoCamera({ type }, { type: "rotate", rotateDeg: [0, 0] }), /spherical/);
});

test("resize preserves the center anchor with explicit fixed-scale or fit scaling", () => {
  const fromViewport = { x: 10, y: 20, width: 200, height: 100 }, toViewport = { x: 30, y: 40, width: 400, height: 300 };
  const originalPoint = createProjectionKernel(plane).inverse([110, 70]).point;
  for (const scaling of ["preserve", "fit"]) {
    const result = applyGeoCamera(plane, { type: "resize", fromViewport, toViewport, scaling });
    assert.equal(result.scalePx, scaling === "fit" ? 4 : 2);
    close(createProjectionKernel(result).forward(originalPoint).point, [230, 190]);
  }
});

test("camera fit reuses bounded geometry fit and rejects empty geometry", () => {
  const geometry = { type: "LineString", coordinates: [[0, 0], [10, 20]] };
  const operation = { type: "fit", geometry, viewport: { width: 100, height: 100, padding: 0 }, coordinateKind: "planar" };
  const before = structuredClone(operation), result = applyGeoCamera(plane, operation);
  assert.equal(result.scalePx, 5); close(result.translatePx, [25, 0]);
  assert.deepEqual(operation, before);
  assert.throws(() => applyGeoCamera(plane, { ...operation, geometry: null }), /empty/);
});

test("hidden zoom queries and clipped pinch destinations fail without fabricating geographic anchors", () => {
  const options = { type: "orthographic", scalePx: 100 };
  assert.equal(createProjectionKernel(options).inverse([101, 0]).point, null);
  assert.throws(() => applyGeoCamera(options, { type: "zoom", anchorPx: [101, 0], factor: 2, scaleExtent: extent }), /visible invertible/);
  const clipped = { ...plane, clipExtentPx: [[0, 0], [100, 100]] };
  assert.throws(() => applyGeoCamera(clipped, { type: "pinch", fromPx: [[30, 40], [50, 40]], toPx: [[130, 40], [150, 40]], scaleExtent: extent }), /preserve its visible anchor/);
});

test("camera commands reject malformed, non-finite, overflow and zero-size inputs before any mutation", () => {
  const bad = [
    {}, { type: "constructor" }, { type: {} }, { type: "pan" }, { type: "pan", deltaPx: undefined },
    { type: "pan", deltaPx: [0, 0], extra: true }, { type: "pan", deltaPx: [NaN, 0] },
    { type: "zoom", anchorPx: [0, 0], factor: 0, scaleExtent: extent },
    { type: "zoom", anchorPx: [0, 0], factor: 2, scaleExtent: [0, 1] },
    { type: "zoom", anchorPx: [0, 0], factor: 2, scaleExtent: [5, 1] },
    { type: "zoom", anchorPx: [0, 0], factor: Number.MAX_VALUE, scaleExtent: extent },
    { type: "pinch", fromPx: [[0, 0]], toPx: [[1, 1], [2, 2]], scaleExtent: extent },
    { type: "pinch", fromPx: [[0, 0], [0, 0]], toPx: [[1, 1], [2, 2]], scaleExtent: extent },
    { type: "reset", initial: { type: "unknown" } }
  ];
  const fromViewport = { x: 0, y: 0, width: 10, height: 10 };
  for (const patch of [{ scaling: "other" }, { toViewport: { ...fromViewport, width: 0 } }, { toViewport: { ...fromViewport, x: Infinity } }, { toViewport: { ...fromViewport, extra: 1 } }, { toViewport: { x: Number.MAX_VALUE, y: 0, width: Number.MAX_VALUE, height: 1 } }]) {
    bad.push({ type: "resize", fromViewport, toViewport: fromViewport, scaling: "preserve", ...patch });
  }
  const before = structuredClone(plane);
  for (const operation of bad) assert.throws(() => applyGeoCamera(plane, operation));
  assert.deepEqual(plane, before);
  assert.throws(() => applyGeoCamera({ ...plane, translatePx: [Number.MAX_VALUE, 0] }, { type: "pan", deltaPx: [Number.MAX_VALUE, 0] }), /finite/);
});

test("camera inputs reject descriptor accessors without evaluating them", () => {
  let reads = 0;
  assert.throws(() => applyGeoCamera(plane, { get type() { reads++; return "pan"; } }), /accessors/);
  assert.throws(() => applyGeoCamera(plane, { type: { toString() { reads++; return "pan"; } } }), /Unsupported/);
  const points = [0, 0]; Object.defineProperty(points, "0", { enumerable: true, get() { reads++; return 0; } });
  assert.throws(() => applyGeoCamera(plane, { type: "zoom", anchorPx: points, factor: 1, scaleExtent: extent }), /accessors/);
  assert.equal(reads, 0);
});

test("camera interpolation uses logarithmic scale and exact endpoints", () => {
  const a = { ...plane, scalePx: 1 }, b = { ...plane, scalePx: 100, translatePx: [100, 200] };
  const mid = interpolateGeoCamera(a, b, 0.5);
  assert.equal(mid.mode, "camera"); close([mid.parameters.scalePx], [10]); close(mid.parameters.translatePx, [60, 115]);
  assert.deepEqual(interpolateGeoCamera(a, b, 0).parameters, normalizeProjectionOptions(a));
  assert.deepEqual(interpolateGeoCamera(a, b, 1).parameters, normalizeProjectionOptions(b));
  assert.ok(Object.isFrozen(mid.parameters.translatePx));
  const extreme = interpolateGeoCamera({ type: "identity", translatePx: [1e308, -1e308] }, { type: "identity", translatePx: [-1e308, 1e308] }, 0.5);
  close(extreme.parameters.translatePx, [0, 0]);
});

test("quaternion rotation follows the short dateline path instead of rotating through zero", () => {
  const a = { type: "orthographic", rotateDeg: [170, 0, 0], scalePx: 100 }, b = { ...a, rotateDeg: [-170, 0, 0] };
  const mid = interpolateGeoCamera(a, b, 0.5).parameters;
  close(createProjectionKernel(mid).forward([180, 0]).point, [0, 0], 1e-9);
  assert.equal(createProjectionKernel(mid).forward([0, 0]).point, null);
  const stationary = interpolateGeoCamera(a, a, 0.4).parameters;
  close(stationary.rotateDeg, a.rotateDeg, 1e-9);
});

test("mixed-axis quaternion midpoint matches an independent literal rotation matrix", () => {
  const a = { type: "equirectangular", scalePx: 1, rotateDeg: [0, 0, 0] }, b = { ...a, rotateDeg: [90, 0, 90] };
  // Half of Rx(90)Rz(90) sends [1,0,0] to [2/3,1/3,2/3].
  const mid = interpolateGeoCamera(a, b, 0.5).parameters;
  close(createProjectionKernel(mid).forward([0, 0]).point, [Math.atan(0.5), -Math.asin(2 / 3)], 1e-9);
  // The Euler gimbal singularity still represents the exact halfway rotation.
  const polar = interpolateGeoCamera({ ...a, rotateDeg: [0, 80, 0] }, { ...a, rotateDeg: [0, 100, 0] }, 0.5).parameters;
  close(createProjectionKernel(polar).forward([0, 0]).point, [0, -Math.PI / 2], 1e-8);
});

test("incompatible projection or static shape parameters produce explicit crossfades", () => {
  const a = { type: "mercator" };
  const changedType = interpolateGeoCamera(a, { type: "orthographic" }, 0.25);
  assert.equal(changedType.mode, "crossfade"); assert.equal(changedType.reason, "projection-type"); close(changedType.weights, [0.75, 0.25]);
  const changedClip = interpolateGeoCamera(a, { ...a, clipExtentPx: [[0, 0], [100, 100]] }, 0.5);
  assert.equal(changedClip.reason, "projection-parameters"); assert.ok(Object.isFrozen(changedClip.from));
  for (const value of [-0.1, 1.1, NaN, Infinity, "0.5"]) assert.throws(() => interpolateGeoCamera(a, a, value));
});
