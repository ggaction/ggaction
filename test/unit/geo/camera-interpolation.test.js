import test from "node:test";
import assert from "node:assert/strict";
import { chart } from "../../../src/index.js";
import { getMarkItems } from "../../../src/inspection.js";
import { createTransitionScene } from "../../../src/scene.js";
import { serializeProgram } from "../../../src/persistence.js";
import { encodeValue, decodeValue } from "../../../src/persistence/codec.js";
import { pathFillContains } from "../../../src/grammar/pathGeometry.js";
import { createProjectionKernel } from "../../../src/grammar/geo/projections.js";
import { normalizeProjectionOptions } from "../../../src/grammar/geo/projectionOptions.js";
import {
  GEO_CAMERA_INTERPOLATION_VERSION, prepareGeoCameraInterpolation as prepare,
  sampleGeoCameraInterpolation as sample, interpolateGeoCamera
} from "../../../src/grammar/geo/cameraInterpolation.js";

const from = { type: "equirectangular", scalePx: 100, translatePx: [360, 180], rotateDeg: [0, 0, 0] };
const to = { ...from, scalePx: 400, translatePx: [400, 200], rotateDeg: [30, 0, 0] };
const close = (a, b) => a.forEach((x, i) => assert.ok(Math.abs(x - b[i]) < 1e-9, `${a} != ${b}`));

test("prepared camera tracks keep typed normalized immutable endpoints across serialization", () => {
  const a = structuredClone(from), b = structuredClone(to), plan = prepare(a, b);
  assert.equal(plan.kind, "geo-camera"); assert.equal(plan.version, GEO_CAMERA_INTERPOLATION_VERSION);
  assert.equal(plan.version, 1); assert.equal(plan.mode, "camera"); assert.equal(Object.hasOwn(plan, "reason"), false);
  assert.deepEqual(plan.from, normalizeProjectionOptions(a)); assert.ok(Object.isFrozen(plan.to.rotateDeg));
  a.translatePx[0] = 0; b.rotateDeg[0] = 0;
  assert.equal(plan.from.translatePx[0], 360); assert.equal(plan.to.rotateDeg[0], 30);
  const restored = JSON.parse(JSON.stringify(plan));
  for (const t of [0, .25, .5, .75, 1]) {
    assert.deepEqual(sample(restored, t), sample(plan, t));
    assert.deepEqual(sample(plan, t), interpolateGeoCamera(from, to, t));
  }
  const signed = prepare({ type: "identity", translatePx: [-0, Number.MIN_VALUE] }, { type: "identity", translatePx: [0, 1] });
  const decoded = decodeValue(encodeValue(signed));
  assert.ok(Object.is(sample(decoded, 0).parameters.translatePx[0], -0));
});

test("sampling is order independent and matches literal log translation and quaternion anchors", () => {
  const plan = prepare(from, to), before = structuredClone(plan);
  const expected = new Map([0, .25, .5, .75, 1].map(t => [t, sample(plan, t)]));
  for (const t of [1, .5, 0, .75, .5, .25, 0]) assert.deepEqual(sample(plan, t), expected.get(t));
  close([expected.get(.5).parameters.scalePx], [200]);
  close(expected.get(.5).parameters.translatePx, [380, 190]);
  close(expected.get(.5).parameters.rotateDeg, [15, 0, 0]);
  assert.deepEqual(plan, before);
  const mixed = sample(prepare({ ...from, rotateDeg: [0, 0, 0], scalePx: 1, translatePx: [0, 0] },
    { ...from, rotateDeg: [90, 0, 90], scalePx: 1, translatePx: [0, 0] }), .5).parameters;
  close(createProjectionKernel(mixed).forward([0, 0]).point, [Math.atan(.5), -Math.asin(2 / 3)]);
  // Geo uses its existing normalized Euler convention for this tied shortest arc.
  const halfTurn = prepare(from, { ...from, rotateDeg: [180, 0, 0] });
  assert.equal(halfTurn.to.rotateDeg[0], -180);
  close(sample(halfTurn, .5).parameters.rotateDeg, [-90, 0, 0]);
});

test("stationary projections and current-frame rebasing preserve exact camera values", () => {
  for (const parameters of [
    { type: "identity", scalePx: 150, translatePx: [Number.MIN_VALUE, -0] },
    { ...from, scalePx: 150, rotateDeg: [27, -43, 17] }
  ]) {
    const plan = prepare(parameters, parameters);
    for (const t of [.01, .5, .99]) assert.deepEqual(sample(plan, t).parameters, plan.from);
  }
  const current = sample(prepare(from, to), .37).parameters;
  const restarted = prepare(current, { ...from, scalePx: 50, rotateDeg: [-80, 20, 3] });
  assert.deepEqual(sample(restarted, 0).parameters, current);
  close(createProjectionKernel(sample(restarted, 0).parameters).forward([10, 10]).point,
    createProjectionKernel(current).forward([10, 10]).point);
  assert.deepEqual(sample(restarted, 1).parameters, restarted.to);
});

test("every static projection policy change keeps explicit endpoint crossfade payloads", () => {
  const pairs = [
    [from, { ...from, type: "mercator" }, "projection-type"],
    ...[{ clipExtentPx: [[0, 0], [700, 360]] }, { clipAngleDeg: 80 }, { centerDeg: [10, 20] },
      { reflectX: true }, { reflectY: true }, { precisionPx: 1 }].map(patch => [from, { ...from, ...patch }, "projection-parameters"]),
    [{ type: "conic-equal-area" }, { type: "conic-equal-area", parallelsDeg: [10, 50] }, "projection-parameters"]
  ];
  for (const [a, b, reason] of pairs) {
    const plan = prepare(a, b), restored = JSON.parse(JSON.stringify(plan));
    assert.equal(plan.mode, "crossfade"); assert.equal(plan.reason, reason);
    for (const t of [0, .3, 1]) {
      const result = sample(restored, t);
      assert.equal(result.mode, "crossfade"); assert.equal(result.reason, reason);
      assert.deepEqual(result.from, plan.from); assert.deepEqual(result.to, plan.to);
      assert.deepEqual(result.weights, [1 - t, t]); assert.ok(Object.isFrozen(result.weights));
    }
  }
});

test("composite and planar tracks interpolate only their admitted camera parameters", () => {
  for (const type of ["identity", "albers-usa"]) {
    const plan = prepare({ type, scalePx: 1, translatePx: [10, 20] }, { type, scalePx: 100, translatePx: [30, 60] });
    const mid = sample(plan, .5).parameters;
    close([mid.scalePx], [10]); close(mid.translatePx, [20, 40]);
    assert.equal(Object.hasOwn(mid, "rotateDeg"), false);
  }
});

test("restored tracks reject unsupported versions unknown fields and noncanonical decisions", () => {
  const plan = prepare(from, to), before = structuredClone(plan);
  const cross = prepare(from, { ...from, type: "mercator" });
  const invalid = [null, [], {}, { ...plan, kind: "camera" }, { ...plan, version: 0 }, { ...plan, version: undefined },
    { ...plan, extra: true }, { ...plan, mode: "crossfade" }, { ...plan, mode: undefined }, { ...plan, reason: undefined },
    { ...plan, reason: "projection-type" }, { ...cross, reason: "projection-parameters" }, { ...cross, mode: "camera" },
    { ...cross, reason: undefined }, { ...plan, from }, { ...plan, to }, { ...plan, from: undefined },
    { ...plan, to: { ...plan.to, scalePx: 0 } }, { ...plan, to: { ...plan.to, translatePx: [Infinity, 0] } },
    { ...plan, to: { ...plan.to, rotateDeg: [360, 0, 0] } }, { ...plan, from: { ...plan.from, clipExtentPx: undefined } }];
  for (const value of invalid) assert.throws(() => sample(value, .5));
  for (const progress of [-.01, 1.01, NaN, Infinity, undefined, "0.5"]) assert.throws(() => sample(plan, progress));
  assert.deepEqual(plan, before);
});

test("camera track admission rejects getters sparse arrays and executable objects without reads", () => {
  const plan = prepare(from, to); let reads = 0;
  const getter = { enumerable: true, get() { reads++; return 1; } };
  for (const key of ["kind", "version", "mode", "from", "to", "reason"]) {
    const value = { ...plan }; Object.defineProperty(value, key, getter);
    assert.throws(() => sample(value, .5), /accessors/);
  }
  const endpoint = { ...plan.from }; Object.defineProperty(endpoint, "scalePx", getter);
  assert.throws(() => prepare(endpoint, to), /accessors/);
  const points = [0, 0]; Object.defineProperty(points, "0", getter);
  assert.throws(() => sample({ ...plan, to: { ...plan.to, translatePx: points } }, .5), /accessors/);
  for (const points of [Array(2), [0, 0, 0], { 0: 0, 1: 0 }, [0, () => reads++]]) {
    assert.throws(() => prepare({ ...from, translatePx: points }, to));
  }
  assert.throws(() => sample(Object.create(plan), .5));
  assert.equal(reads, 0);
});

const ring = [[-20,-20],[20,-20],[20,20],[-20,20],[-20,-20]];
const hole = [[-5,-5],[-5,5],[5,5],[5,-5],[-5,-5]];
function map(coordinates, polygonWinding = "right-hand") {
  return chart().createCanvas({ width: 720, height: 360, margin: 0 })
    .createGeometryData({ id: "regions", format: "geojson", coordinateKind: "geographic", polygonWinding,
      values: { type: "Feature", id: "region", properties: {}, geometry: { type: "Polygon", coordinates } }, featureKey: "id" })
    .createProjection({ id: "map", ...from }).createCoordinate({ type: "geo" })
    .createGeoShapeMark({ id: "land", fill: "orange", strokeWidth: 0 });
}
const hit = (program, id, point) => program.graphicSpec.objects[id].items.some(item => pathFillContains(item.properties.commands,
  { x: point[0], y: point[1] }, { fillRule: item.properties.fillRule }));

test("sampled native Geo scenes preserve exact endpoints and current-frame stationary output", () => {
  const base = map([ring, hole]), plan = prepare(from, to), before = serializeProgram(base);
  for (const [t, endpoint] of [[0, from], [1, to]]) {
    const actual = base.editProjection({ target: "map", ...sample(plan, t).parameters });
    const expected = base.editProjection({ target: "map", ...endpoint });
    assert.deepEqual(actual.graphicSpec, expected.graphicSpec);
    for (const format of ["canvas", "svg"]) assert.deepEqual(createTransitionScene(actual, { format }), createTransitionScene(expected, { format }));
  }
  const parameters = sample(plan, .37).parameters, current = base.editProjection({ ...parameters });
  const restart = prepare(parameters, from);
  assert.deepEqual(base.editProjection({ ...sample(restart, 0).parameters }).graphicSpec, current.graphicSpec);
  assert.deepEqual(base.editProjection({ ...sample(prepare(parameters, parameters), .5).parameters }).graphicSpec, current.graphicSpec);
  assert.deepEqual(getMarkItems(current).map(item => item.key), getMarkItems(base).map(item => item.key));
  assert.equal(serializeProgram(base), before);
});

test("camera samples reproject source holes and spherical complements without coordinate rewrites", () => {
  for (const [coordinates, winding, expected] of [
    [[ring, hole], "right-hand", [false, true, false]],
    [[ring, hole].map(points => [...points].reverse()), "left-hand", [false, true, false]],
    [[[...ring].reverse()], "right-hand", [false, false, true]]
  ]) {
    const base = map(coordinates, winding), before = serializeProgram(base), plan = prepare(from, to);
    for (const t of [0, .25, .5, .75, 1]) {
      const parameters = sample(plan, t).parameters, current = base.editProjection({ ...parameters }), kernel = createProjectionKernel(parameters);
      [0, 10, 100].forEach((lon, i) => assert.equal(hit(current, "land", kernel.forward([lon, 0]).point), expected[i]));
      assert.deepEqual(current.semanticSpec.resources.find(resource => resource.id === "regions"), base.semanticSpec.resources.find(resource => resource.id === "regions"));
    }
    assert.equal(serializeProgram(base), before);
  }
});

test("larger-than-hemisphere generated disks keep their source meaning during camera rotation", () => {
  const base = chart().createCanvas({ width: 720, height: 360, margin: 0 })
    .createGeometryData({ id: "centers", format: "geojson", coordinateKind: "geographic", polygonWinding: "left-hand",
      values: { type: "Point", coordinates: [0, 0] } })
    .createProjection({ id: "map", ...from }).createCoordinate({ type: "geo" })
    .createGeoPointMark({ id: "disk", radiusDeg: 120, fill: "orange", strokeWidth: 0 });
  for (const t of [0, .5, 1]) {
    const parameters = sample(prepare(from, to), t).parameters, current = base.editProjection({ ...parameters }), kernel = createProjectionKernel(parameters);
    for (const [lon, expected] of [[0, true], [100, true], [-150, false]]) assert.equal(hit(current, "disk", kernel.forward([lon, 0]).point), expected);
  }
});
