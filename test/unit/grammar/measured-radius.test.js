import assert from "node:assert/strict";
import test from "node:test";
import { mapContinuousScaleValues } from "../../../src/grammar/scales/mapping.js";
import { validateMeasuredRadiusScale } from "../../../src/grammar/scales/radial.js";
import { deriveMeasuredArcValues, deriveArcSectors } from "../../../src/grammar/arcs.js";
import { resolveDiscretePositionScale } from "../../../src/grammar/scales/ordinal.js";

const close = (actual, expected, tolerance = 1e-10) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
const scale = (radialMapping, inner = 70, outer = 140) => ({ type: "linear", radialMapping, domain: [0, 4], range: [inner, outer] });
const layer = (aggregate = "sum") => ({ id: "arc", mark: { type: "arc" }, encoding: {
  theta: { field: "category", fieldType: "nominal" },
  radius: { ...(aggregate === "sum" ? { field: "value" } : {}), fieldType: "quantitative", aggregate },
  color: { field: "category", fieldType: "nominal" }
} });
const rows = [{ category: "A", value: 2 }, { category: "B", value: 3 }, { category: "C", value: 4 }];

test("maps measured annulus areas and radial lengths to the same actual units", () => {
  const rose = mapContinuousScaleValues([0, 2, 3, 4], scale("area"));
  const radial = mapContinuousScaleValues([0, 2, 3, 4], scale("radius-length"));
  [70, Math.sqrt(12250), Math.sqrt(15925), 140].forEach((v, i) => close(rose[i], v));
  assert.deepEqual(radial, [70, 105, 122.5, 140]);
  for (const [i, value] of [0, 2, 3, 4].entries()) {
    close((rose[i] ** 2 - 70 ** 2) / (140 ** 2 - 70 ** 2), value / 4);
    close((radial[i] - 70) / 70, value / 4);
  }
  const disk = mapContinuousScaleValues([2, 3, 4], scale("area", 0));
  close(disk[0], Math.sqrt(0.5) * 140);
  close(disk[1], Math.sqrt(0.75) * 140);
  assert.ok(Object.isFrozen(rose));
});

test("preserves monotonicity and finite mapping over small and extreme ranges", () => {
  for (const mode of ["area", "radius-length"]) {
    for (const [inner, outer] of [[0, 1], [0.999, 1], [1e-160, 2e-160], [1e307, 1e308], [0, Number.MAX_VALUE], [Number.MAX_VALUE / 2, Number.MAX_VALUE]]) {
      const result = mapContinuousScaleValues(Array.from({ length: 101 }, (_, i) => i / 25), scale(mode, inner, outer));
      assert.equal(result[0], inner);
      assert.equal(result.at(-1), outer);
      assert.ok(result.every((v, i) => Number.isFinite(v) && v >= inner && v <= outer && (i === 0 || v >= result[i - 1])));
    }
  }
});

test("rejects invalid measured scale state and supports explicit clamping", () => {
  for (const patch of [
    { type: "sqrt" }, { radialMapping: "disk" }, { nice: true }, { zero: false }, { reverse: true },
    { nice: 1 }, { zero: null }, { reverse: "false" }, { unknown: 0 }, { domain: [1, 4] }, { domain: [0, 0] }, { domain: [0, Infinity] },
    { range: [-1, 2] }, { range: [2, 1] }, { range: [1, 1] }, { range: [0, Infinity] }, { clamp: 1 }
  ]) assert.throws(() => validateMeasuredRadiusScale({ ...scale("area"), ...patch }));
  for (const value of [-1, 5, Infinity, NaN, "2"]) {
    assert.throws(() => mapContinuousScaleValues([value], scale("area")));
  }
  assert.deepEqual(mapContinuousScaleValues([-1, 0, 4, 5], { ...scale("area"), clamp: true }), [70, 70, 140, 140]);
});

test("aggregates radius at category grain without modifying rows or inventing count fields", () => {
  const values = [...rows, { category: "A", value: 2 }, { category: "Z", value: 0 }];
  const before = structuredClone(values);
  const sum = deriveMeasuredArcValues(values, layer());
  assert.deepEqual(sum.map(x => [x.key, x.radius, x.sourceIndices]),
    [["A", 4, [0, 3]], ["B", 3, [1]], ["C", 4, [2]], ["Z", 0, [4]]]);
  assert.deepEqual(deriveMeasuredArcValues(values, layer("count")).map(x => x.radius), [2, 1, 1, 1]);
  assert.deepEqual(values, before);
  assert.ok(Object.isFrozen(sum[0].sourceIndices));
  for (const invalid of [[], [{ category: "A", value: 0 }], [{ category: "A", value: -1 }],
    [{ category: "A", value: null }], [{ category: "A", value: Infinity }],
    [{ category: "A", value: 1e308 }, { category: "A", value: 1e308 }]]) {
    assert.throws(() => deriveMeasuredArcValues(invalid, layer()));
  }
  const weighted = layer(); weighted.encoding.theta.aggregate = "count";
  assert.throws(() => deriveMeasuredArcValues(rows, weighted), /equal-angle/);
  const count = layer("count"); count.encoding.radius.field = "value";
  assert.throws(() => deriveMeasuredArcValues(rows, count), /does not accept a field/);
  const colored = layer(); colored.encoding.color.field = "color";
  assert.throws(() => deriveMeasuredArcValues([{ category: "A", value: 1, color: "x" },
    { category: "A", value: 2, color: "y" }], colored), /one color/);
});

test("creates one equal-angle sector per positive category in theta-domain order", () => {
  const values = [...rows, { category: "A", value: 2 }, { category: "Z", value: 0 }];
  const thetaScale = resolveDiscretePositionScale({ type: "band", domain: ["Z", "C", "A", "B"],
    values: values.map(x => x.category), range: [-45, 315], channel: "theta", paddingInner: 0, paddingOuter: 0, align: 0.5 });
  const result = deriveArcSectors(values, layer(), { thetaScale, radiusScale: scale("area") }).sectors;
  assert.deepEqual(result.map(s => s.key), ["C", "A", "B"]);
  assert.deepEqual(result.map(s => s.sourceIndices), [[2], [0, 3], [1]]);
  assert.ok(result.every(s => s.endTheta - s.startTheta === 90 && s.innerRadius === 70));
  assert.deepEqual(result.map(s => s.radius), [4, 4, 3]);
});

test("rejects unrepresentable positive radial thickness instead of silently dropping it", () => {
  for (const radialMapping of ["area", "radius-length"]) {
    assert.throws(() => mapContinuousScaleValues([Number.MIN_VALUE], {
      ...scale(radialMapping), domain: [0, Number.MAX_VALUE]
    }), /numeric precision/);
    assert.throws(() => mapContinuousScaleValues([0.01], scale(radialMapping, 1 - Number.EPSILON, 1)), /numeric precision/);
  }
});
