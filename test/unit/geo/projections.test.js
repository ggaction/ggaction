import test from "node:test";
import assert from "node:assert/strict";
import { createProjectionKernel, projectRaw } from "../../../src/grammar/geo/projections.js";
import { PROJECTION_DESCRIPTORS, normalizeProjectionOptions } from "../../../src/grammar/geo/projectionOptions.js";
import { fitProjectedBounds } from "../../../src/grammar/geo/projectionFit.js";

const radians = Math.PI / 180;
function close(actual, expected, tolerance = 1e-9) {
  assert.equal(actual.length, expected.length);
  actual.forEach((value, index) => assert.ok(Math.abs(value - expected[index]) <= tolerance, `${value} != ${expected[index]}`));
}

test("projection registry declares fifteen distinct mathematical families and closed option schemas", () => {
  assert.deepEqual(PROJECTION_DESCRIPTORS.map(value => value.type), ["mercator", "equirectangular", "equal-earth", "natural-earth", "orthographic", "stereographic", "gnomonic", "azimuthal-equal-area", "azimuthal-equidistant", "conic-equal-area", "conic-conformal", "conic-equidistant", "transverse-mercator", "albers-usa", "identity"]);
  assert.ok(Object.isFrozen(PROJECTION_DESCRIPTORS[0].parameterSchema));
  assert.ok(PROJECTION_DESCRIPTORS.every(value => value.supportsInverse));
  assert.equal(PROJECTION_DESCRIPTORS.filter(value => value.composite).length, 1);
  assert.equal(PROJECTION_DESCRIPTORS.filter(value => !value.spherical).length, 1);
  for (const descriptor of PROJECTION_DESCRIPTORS) {
    const normalized = normalizeProjectionOptions({ type: descriptor.type });
    assert.deepEqual(normalizeProjectionOptions(normalized), normalized);
    assert.deepEqual(Object.keys(normalized).sort(), ["type", ...Object.keys(descriptor.parameterSchema)].sort());
  }
});

test("raw references use radians and y-up while screen coordinates use degrees and y-down", () => {
  close(projectRaw({ type: "mercator" }, [0, 45 * radians]).point, [0, 0.881373587019543]);
  close(projectRaw({ type: "mercator" }, [0, 0]).point, [0, 0]);
  close(projectRaw({ type: "equirectangular" }, [30 * radians, 45 * radians]).point, [Math.PI / 6, Math.PI / 4]);
  close(projectRaw({ type: "orthographic" }, [Math.PI / 2, 0]).point, [1, 0]);
  assert.equal(projectRaw({ type: "orthographic" }, [Math.PI, 0]).point, null);
  close(createProjectionKernel({ type: "mercator", scalePx: 1 }).forward([0, 45]).point, [0, -0.881373587019543]);
  close(projectRaw({ type: "transverse-mercator" }, [0, Math.PI / 4]).point, [0, Math.PI / 4]);
  close(projectRaw({ type: "transverse-mercator" }, [Math.PI / 4, 0]).point, [0.881373587019543, 0]);
  close(projectRaw({ type: "identity" }, [900, -200]).point, [900, -200]);
});

test("every non-composite raw kernel has a nontrivial finite result in its central domain", () => {
  const points = new Map();
  for (const { type, composite } of PROJECTION_DESCRIPTORS) {
    if (composite) continue;
    const result = projectRaw({ type }, [20 * radians, 30 * radians]);
    assert.equal(result.reason, null, type);
    assert.ok(result.point.every(Number.isFinite), type);
    points.set(type, result.point);
  }
  for (const [type, point] of points) {
    if (["identity", "equirectangular"].includes(type)) continue;
    assert.notDeepEqual(point, points.get("identity"), type);
  }
});

test("all spherical projections roundtrip their visible geographic grid and reject clipped queries", () => {
  for (const { type, spherical, composite } of PROJECTION_DESCRIPTORS) {
    if (!spherical || composite) continue;
    const kernel = createProjectionKernel({ type, scalePx: 170, translatePx: [320, 180], rotateDeg: [10, -5, 3] });
    let visible = 0;
    for (const longitude of [-140, -70, -20, 0, 30, 80, 140]) for (const latitude of [-65, -30, 0, 25, 60]) {
      const projected = kernel.forward([longitude, latitude]);
      if (!projected.point) continue;
      visible++;
      const inverse = kernel.inverse(projected.point);
      assert.equal(inverse.reason, null, `${type} ${longitude},${latitude}`);
      close(inverse.point, [longitude, latitude], 1e-6);
      close(kernel.forward(inverse.point).point, projected.point, 0.25);
    }
    assert.ok(visible > 10, type);
    assert.equal(kernel.inverse([1e12, -1e12]).point, null, type);
  }
});

test("orthographic limb is visible, backside is excluded, and rotated visibility is consistent", () => {
  const projection = createProjectionKernel({ type: "orthographic", scalePx: 100 });
  close(projection.forward([90, 0]).point, [100, 0]);
  assert.equal(projection.forward([90.00001, 0]).point, null);
  assert.equal(projection.forward([180, 0]).point, null);
  assert.equal(projection.inverse([100.1, 0]).point, null);
  const rotated = createProjectionKernel({ type: "orthographic", rotateDeg: [180, 0] });
  close(rotated.forward([180, 0]).point, [0, 0]);
  assert.equal(rotated.forward([0, 0]).point, null);
  const smallCap = createProjectionKernel({ type: "orthographic", clipAngleDeg: 30 });
  assert.equal(smallCap.forward([45, 0]).point, null);
});

test("screen reflection, centers and explicit clip extents share forward and inverse validation", () => {
  const source = { type: "equirectangular", centerDeg: [360, 10], rotateDeg: [360, 0], scalePx: 100, translatePx: [30, 40], reflectX: true, reflectY: true, precisionPx: 0.1, clipExtentPx: [[0, 0], [100, 100]] };
  const frozen = structuredClone(source), kernel = createProjectionKernel(source);
  close(kernel.forward([-10, 10]).point, [30 + 100 * Math.PI / 18, 40]);
  assert.equal(kernel.forward([120, 10]).point, null);
  assert.equal(kernel.inverse([-1, 40]).point, null);
  close(kernel.inverse(kernel.forward([-10, 10]).point).point, [-10, 10]);
  source.clipExtentPx[0][0] = -1000;
  assert.deepEqual(kernel.options.clipExtentPx, frozen.clipExtentPx);
  assert.ok(Object.isFrozen(kernel.options.clipExtentPx[0]));
  assert.equal(kernel.options.rotateDeg.length, 3);
  assert.deepEqual(kernel.forward([710, 10]), kernel.forward([-10, 10]));
});

test("Albers USA keeps component identities and uses each inset's inverse", () => {
  const kernel = createProjectionKernel({ type: "albers-usa", scalePx: 1000, translatePx: [480, 250], precisionPx: 0.25 });
  for (const [point, component] of [[[-100, 40], "lower48"], [[-150, 64], "alaska"], [[-157, 20], "hawaii"]]) {
    const forward = kernel.forward(point);
    assert.equal(forward.component, component);
    close(kernel.inverse(forward.point, { component }).point, point, 1e-6);
    assert.equal(kernel.inverse(forward.point).component, component);
    assert.equal(kernel.inverse(forward.point, { component: component === "lower48" ? "alaska" : "lower48" }).point, null);
  }
  assert.equal(kernel.forward([0, 0]).point, null);
  assert.equal(kernel.inverse([0, 0]).point, null);
  assert.throws(() => kernel.inverse([100, 100], { component: "other" }), /component/);
  assert.throws(() => projectRaw({ type: "albers-usa" }, [0, 0]), /single raw/);
});

test("planar identity preserves units and applies only its explicit affine and clip settings", () => {
  const kernel = createProjectionKernel({ type: "identity", scalePx: 5, translatePx: [25, 0], reflectY: true, clipExtentPx: [[0, -100], [100, 100]] });
  close(kernel.forward([10, 20]).point, [75, -100]);
  close(kernel.inverse([75, -100]).point, [10, 20]);
  assert.equal(kernel.forward([30, 0]).point, null);
  assert.equal(kernel.inverse([101, 0]).point, null);
});

test("closed options reject inappropriate settings, descriptor accessors and malformed values", () => {
  let reads = 0;
  assert.throws(() => createProjectionKernel({ get type() { reads++; return "mercator"; } }), /accessors/);
  assert.equal(reads, 0);
  assert.throws(() => createProjectionKernel({ type: "missing" }), /type/);
  const cases = [
    { type: "identity", rotateDeg: [0, 0] }, { type: "albers-usa", centerDeg: [0, 0] },
    { type: "mercator", parallelsDeg: [30, 60] }, { type: "mercator", scalePx: 0 },
    { type: "mercator", precisionPx: -1 }, { type: "identity", scalePx: Infinity },
    { type: "identity", reflectX: 1 }, { type: "mercator", clipAngleDeg: 0 },
    { type: "mercator", clipAngleDeg: 181 }, { type: "mercator", clipAngleDeg: undefined },
    { type: "identity", clipExtentPx: [[0, 0]] }, { type: "identity", clipExtentPx: [[0, 1], [0, 2]] },
    { type: "identity", translatePx: [0] }, { type: "identity", translatePx: [0, NaN] },
    { type: "mercator", centerDeg: [0, 91] }, { type: "conic-conformal", parallelsDeg: [30, 90] },
    { type: "orthographic", clipAngleDeg: null }, { type: "orthographic", clipAngleDeg: 91 },
    { type: "gnomonic", clipAngleDeg: 90 }, { type: "stereographic", clipAngleDeg: 180 },
    { type: "mercator", translatePx: new Array(2) }, { type: "mercator", fit: {} }
  ];
  for (const options of cases) assert.throws(() => createProjectionKernel(options), undefined, JSON.stringify(options));
  const nested = [0, 0]; Object.defineProperty(nested, "0", { get() { reads++; return 0; }, enumerable: true });
  assert.throws(() => createProjectionKernel({ type: "mercator", rotateDeg: nested }), /accessors/);
  assert.equal(reads, 0);
});

test("singular raw inputs and invalid inverse requests return no fabricated geographic position", () => {
  for (const type of ["stereographic", "azimuthal-equal-area", "azimuthal-equidistant"]) {
    assert.equal(projectRaw({ type }, [Math.PI, 0]).reason, "singular-point");
  }
  assert.equal(projectRaw({ type: "mercator" }, [0, Math.PI / 2]).point, null);
  assert.equal(projectRaw({ type: "transverse-mercator" }, [Math.PI / 2, 0]).point, null);
  assert.equal(projectRaw({ type: "gnomonic" }, [Math.PI / 2, 0]).point, null);
  assert.throws(() => projectRaw({ type: "mercator" }, [0, 2]), /latitude/);
  const kernel = createProjectionKernel({ type: "mercator" });
  assert.throws(() => kernel.forward([0, 91]), /latitude/);
  assert.throws(() => kernel.forward([0, Infinity]), /finite/);
  assert.throws(() => kernel.inverse([0, NaN]), /finite/);
  assert.throws(() => kernel.inverse([0, 0], { component: "lower48" }), /component/);
  assert.throws(() => kernel.inverse([0, 0], { unknown: true }), /Unknown|unknown/);
});

test("conic standard parallels support tangent, equatorial and southern projections", () => {
  for (const type of ["conic-equal-area", "conic-conformal", "conic-equidistant"]) for (const parallelsDeg of [[30, 30], [-30, 30], [-60, -30], [0, 0]]) {
    const kernel = createProjectionKernel({ type, parallelsDeg, clipAngleDeg: 120 });
    const p = kernel.forward([20, -20]);
    assert.ok(p.point);
    close(kernel.inverse(p.point).point, [20, -20], 1e-6);
  }
});

test("fit centers finite planar bounds, collapsed dimensions and point-only inputs", () => {
  assert.deepEqual(fitProjectedBounds([0, 0, 10, 20], { width: 100, height: 100 }), { scalePx: 5, translatePx: [25, 0] });
  assert.deepEqual(fitProjectedBounds([2, 0, 2, 20], { width: 100, height: 100, padding: 10 }), { scalePx: 4, translatePx: [42, 10] });
  assert.deepEqual(fitProjectedBounds([0, 2, 20, 2], { width: 100, height: 100 }), { scalePx: 5, translatePx: [0, 40] });
  assert.deepEqual(fitProjectedBounds([2, 3, 2, 3], { width: 100, height: 100, pointScale: 4, scalePx: 2 }), { scalePx: 4, translatePx: [42, 38] });
  assert.deepEqual(fitProjectedBounds([2, 3, 2, 3], { width: 100, height: 100, scalePx: 2 }), { scalePx: 2, translatePx: [46, 44] });
  const fit = fitProjectedBounds([-100, -20, 30, 10], { width: 320, height: 180, padding: 15 });
  const kernel = createProjectionKernel({ type: "identity", ...fit });
  for (const p of [[-100, -20], [30, 10]]) {
    const [x, y] = kernel.forward(p).point;
    assert.ok(x >= 15 - 1e-9 && x <= 305 + 1e-9 && y >= 15 && y <= 165);
  }
});

test("fit rejects empty, malformed, overflowing and unsupported states without mutating inputs", () => {
  const valid = { width: 100, height: 100 };
  for (const bounds of [[], [Infinity, 0, -Infinity, 0], [2, 0, 1, 1], [0, 2, 1, 1], [-1e308, 0, 1e308, 1]]) assert.throws(() => fitProjectedBounds(bounds, valid));
  for (const options of [{ width: 0, height: 10 }, { width: 10, height: 10, padding: 5 }, { width: 10, height: 10, padding: -1 }, { width: 10, height: 10, padding: undefined }, { width: 10, height: 10, padding: null }, { width: 10, height: 10, pointScale: 0 }, { width: 10, height: 10, unknown: 1 }]) assert.throws(() => fitProjectedBounds([0, 0, 1, 1], options));
  assert.throws(() => fitProjectedBounds([0, 0, 0, 0], valid), /Point-only/);
  assert.throws(() => fitProjectedBounds([1e308, 1, 1e308, 1], { ...valid, pointScale: 10 }), /overflow/);
  assert.deepEqual(valid, { width: 100, height: 100 });
});
