import assert from "node:assert/strict";
import test from "node:test";
import { geoInterpolate } from "geographic-math";
import { cloneAndFreeze } from "../../../src/core/immutable.js";
import { createProjectionCalculation } from "../../../src/grammar/geo/projections.js";
import { sphericalMidpoint } from "../../../src/grammar/geo/projectionMath.js";
import { createGeometryBudget, snapshotGeometryJSON } from "../../../src/grammar/geo/input.js";
import { projectGeometry } from "../../../src/grammar/geo/stream.js";

let seed = 17;
const random = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
const TYPES = ["mercator", "equirectangular", "equal-earth", "natural-earth", "orthographic", "stereographic", "gnomonic", "azimuthal-equal-area",
  "azimuthal-equidistant", "conic-equal-area", "conic-conformal", "conic-equidistant", "transverse-mercator", "albers-usa"];

test("the closure-free spherical midpoint equals geoInterpolate at one half bit for bit", () => {
  for (let i = 0; i < 20000; i++) {
    const a = [random() * 720 - 360, random() * 180 - 90], b = i % 50 === 0 ? [...a] : [random() * 720 - 360, random() * 180 - 90];
    const actual = sphericalMidpoint(a, b), expected = geoInterpolate(a, b)(0.5);
    assert.ok(Object.is(actual[0], expected[0]) && Object.is(actual[1], expected[1]), JSON.stringify([a, b]));
  }
});

test("stream point projection returns forwardPoint coordinates for every projection type", () => {
  for (const type of TYPES) {
    const kernel = createProjectionCalculation({ type, scalePx: 120, translatePx: [200, 180] });
    for (let i = 0; i < 400; i++) {
      const x = random() * 400 - 200, y = random() * 180 - 90, expected = kernel.forwardPoint([x, y]).point, actual = kernel.forwardXY(x, y);
      assert.deepEqual(actual, expected, `${type} ${x} ${y}`);
    }
    assert.throws(() => kernel.forwardXY(0, 91), /latitude/);
    assert.throws(() => kernel.forwardXY(Number.NaN, 0), /Projection point/);
  }
});

test("a repeated owned geometry replays its admission totals or traverses again", () => {
  const coordinates = Array.from({ length: 2000 }, (_, i) => [i * 0.01 - 10, Math.sin(i / 50) * 20]);
  const owned = cloneAndFreeze({ type: "LineString", coordinates }), loose = { type: "LineString", coordinates };
  const options = { type: "equirectangular", scalePx: 150, translatePx: [200, 200], precisionPx: 0.5 };
  const first = projectGeometry(owned, options, { coordinateKind: "geographic" });
  assert.deepEqual(projectGeometry(owned, options, { coordinateKind: "geographic" }), first);
  assert.deepEqual(projectGeometry(loose, options, { coordinateKind: "geographic" }), first);
  // A budget without room for the recorded totals runs the full traversal and
  // reports the ordinary limit error.
  const limited = () => { const budget = createGeometryBudget({ maxValues: 3000 }); return snapshotGeometryJSON(owned, budget); };
  const fresh = () => { const budget = createGeometryBudget({ maxValues: 3000 }); return snapshotGeometryJSON(cloneAndFreeze({ type: "LineString", coordinates }), budget); };
  let expected;
  try { fresh(); } catch (error) { expected = error.message; }
  assert.ok(expected);
  assert.throws(limited, { message: expected });
  const budget = createGeometryBudget(), again = createGeometryBudget();
  snapshotGeometryJSON(cloneAndFreeze({ type: "LineString", coordinates }), budget);
  assert.equal(snapshotGeometryJSON(owned, again), owned);
  assert.deepEqual(again.diagnostics(), budget.diagnostics());
});
