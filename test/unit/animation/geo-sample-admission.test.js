import test from "node:test";
import assert from "node:assert/strict";
import { chart, hconcat } from "../../../src/index.js";
import { cloneAndFreeze, freezeOwned, isOwned } from "../../../src/core/immutable.js";
import { validateWorkLimit } from "../../../src/core/validation.js";
import { projectAnimationEndpoint } from "../../../src/animation/endpoints.js";
import { prepareGeoTracks, sampleGeoTracks } from "../../../src/animation/geoTracks.js";
import { prepareAnimationGeoGeometry, resolveAnimationGeoGeometry } from "../../../src/grammar/animation/geoState.js";
import { normalizeGeoAnimationPresentation, projectGeoAnimationPresentations, resolveGeoAnimationPresentation, resolveSampledGeoPresentation } from "../../../src/materialization/animation/geoPresentation.js";

const point = (id, coordinates) => ({ type: "Feature", id, properties: {}, geometry: { type: "Point", coordinates } });
const make = (capacity = false) => chart().createCanvas({ width: 400, height: 300, margin: 0 })
  .createGeometryData({ id: "world", format: "geojson", coordinateKind: "geographic", featureKey: "id", values: { type: "FeatureCollection", features: [point("front", [0, 0]), point("back", [180, 0])] } })
  .createProjection({ id: "projection", type: "orthographic", scalePx: 100, translatePx: [200, 150] }).createCoordinate({ type: "geo" })
  .createGeoPointMark({ id: "map", ...(capacity ? { capacity: { maxProjectedPoints: 200000, maxPathCommands: 200000 } } : {}) });
const state = (program, capacity = false) => projectGeoAnimationPresentations(program, projectAnimationEndpoint(program), capacity);
const generic = (input, capacity) => {
  const presentation = normalizeGeoAnimationPresentation(input);
  return { presentation, resolved: resolveGeoAnimationPresentation(presentation, capacity) };
};
const error = operation => {
  try { operation(); assert.fail("Malformed input must be rejected."); }
  catch (failure) {
    assert.notEqual(failure.name, "AssertionError");
    return Object.fromEntries(["name", ...Object.getOwnPropertyNames(failure).filter(key => key !== "stack")].map(key => [key, failure[key]]));
  }
};
function deepOwned(value) {
  if (value === null || typeof value !== "object") return;
  assert.ok(isOwned(value)); assert.ok(Object.isFrozen(value));
  for (const child of Object.values(value)) deepOwned(child);
}

test("sample admission preserves complete validation and isolates mutable or shallow-owned callers", () => {
  const original = state(make()).groups[0].presentation;
  for (const input of [structuredClone(original), original, freezeOwned(structuredClone(original)), Object.freeze(structuredClone(original)), Object.assign(Object.create(null), structuredClone(original))]) {
    const expected = generic(input), actual = resolveSampledGeoPresentation(input);
    assert.deepEqual(actual, expected); deepOwned(actual.presentation); deepOwned(actual.resolved);
    if (!Object.isFrozen(input.geometry)) input.geometry.features[0].geometry.coordinates[0] = 40;
    assert.equal(actual.presentation.geometry.features[0].geometry.coordinates[0], 0);
    assert.equal(actual.resolved.graphics.length, 1); // Hidden features still undergo admission.
  }
  const aliases = structuredClone(original); aliases.styles[1] = aliases.styles[0];
  const actual = resolveSampledGeoPresentation(aliases);
  assert.deepEqual(actual, generic(aliases)); assert.notEqual(actual.presentation.styles[0], actual.presentation.styles[1]);
});

test("sample admission preserves first-error order and full diagnostics before geometry calculation", () => {
  const original = state(make()).groups[0].presentation;
  const mutations = [
    value => { value.geometry.parameters.scalePx = -1; value.styles = []; },
    value => { value.styles = []; value.geometry.parameters.scalePx = Number.MAX_VALUE; },
    value => value.geometry.features[1].geometry.coordinates[1] = 91,
    value => value.geometry.features[0].geometry.extra = true,
    value => value.geometry.projection.kind = "geometry",
    value => value.geometry.key = '[ [], "map" ]',
    value => value.styles[0].radiusPx = 2,
    value => delete value.styles[0].opacity,
    value => value.frame.offset = [0],
    value => value.plotOrigin = [Infinity, 0]
  ];
  for (const mutate of mutations) {
    const input = structuredClone(original); mutate(input);
    const expected = error(() => generic(input));
    assert.deepEqual(error(() => resolveSampledGeoPresentation(input)), expected);
    assert.deepEqual(error(() => resolveSampledGeoPresentation(cloneAndFreeze(input))), expected);
  }
  let reads = 0; const getter = structuredClone(original);
  Object.defineProperty(getter, "styles", { enumerable: true, get() { reads++; return []; } });
  assert.deepEqual(error(() => resolveSampledGeoPresentation(getter)), error(() => generic(getter))); assert.equal(reads, 0);
  const cyclic = structuredClone(original); cyclic.extra = cyclic;
  assert.deepEqual(error(() => resolveSampledGeoPresentation(cyclic)), error(() => generic(cyclic)));
  for (const mutate of [
    value => value.styles = new Array(2000001),
    value => value.geometry.logicalId = "x".repeat(10000000),
    value => { let nested = value.extra = {}; for (let depth = 0; depth < 129; depth++) nested = nested.child = {}; }
  ]) {
    const input = structuredClone(original); mutate(input);
    const expected = error(() => generic(input));
    assert.equal(expected.name, "RangeError"); assert.deepEqual(error(() => resolveSampledGeoPresentation(input)), expected);
  }
});

test("prepared geometry admits raw input and captures only its immutable normalized value", () => {
  const input = structuredClone(state(make()).groups[0].presentation.geometry), expected = resolveAnimationGeoGeometry(input);
  const resolve = prepareAnimationGeoGeometry(input);
  input.features[0].geometry.coordinates[0] = 40;
  assert.deepEqual(resolve(false), expected); assert.deepEqual(resolve(true), expected); deepOwned(resolve(false));
  input.parameters.scalePx = -1;
  assert.deepEqual(error(() => prepareAnimationGeoGeometry(input)), error(() => resolveAnimationGeoGeometry(input)));
});

test("sampled groups retain exact diagnostics and aggregate callback ordering under both capacity policies", () => {
  for (const capacity of [false, true]) {
    const source = make(capacity), target = source.editProjection({ rotateDeg: [80, 0, 0] });
    const pair = program => hconcat({ id: "pair", programs: [{ id: "left", program }, { id: "right", program }] });
    const prepared = prepareGeoTracks(state(pair(source), capacity), state(pair(target), capacity), capacity).state;
    const account = [], groups = sampleGeoTracks(prepared, .5, amount => account.push(amount));
    const expected = groups.map(group => generic(group.presentation, capacity).resolved.diagnostics.work);
    assert.deepEqual(account, expected); assert.equal(account.length, 2);
    assert.equal(account[0], 69); assert.equal(account[1], 69);
    let work = 10000000 - account[0], calls = 0;
    const failure = error(() => sampleGeoTracks(prepared, .5, amount => { calls++; validateWorkLimit(work += amount, "Combined geographic work"); }));
    assert.equal(calls, 2); assert.equal(failure.name, "RangeError");
    assert.equal(failure.message, "Combined geographic work must not exceed 10000000.");
    assert.equal(work, 10000069);
    const timeline = { progress: () => .37, geoStyle: () => ({ opacity: .25 }) };
    for (const group of sampleGeoTracks(prepared, .5, undefined, timeline)) {
      const resolved = generic(group.presentation, capacity).resolved;
      assert.deepEqual(group.emissions.flatMap(value => value.graphics), resolved.graphics);
    }
    let called = false;
    assert.throws(() => sampleGeoTracks(prepared, .5, () => { called = true; }, { progress: () => .5, geoStyle: () => ({ opacity: -1 }) }));
    assert.equal(called, false);
  }
});

test("an authentic sampled group keeps its identity and exact admission while other fields stay fully checked", async () => {
  const { prepareGeoInterpolation, sampleGeoInterpolation, sampledGeoGroupCharges } = await import("../../../src/grammar/animation/geoState.js");
  const { GEO_LIMITS, createGeometryBudget, snapshotGeometryJSON } = await import("../../../src/grammar/geo/input.js");
  const source = make(), from = state(source).groups[0].presentation, to = state(source.editProjection({ scalePx: 140, rotateDeg: [40, 0, 0] })).groups[0].presentation;
  const plan = prepareGeoInterpolation(from.geometry, to.geometry), group = sampleGeoInterpolation(plan, .5).group;
  const input = { ...to, geometry: group }, actual = resolveSampledGeoPresentation(input);
  assert.deepEqual(actual, generic(input)); deepOwned(actual.presentation); deepOwned(actual.resolved);
  assert.equal(actual.presentation.geometry, group);
  assert.deepEqual(prepareAnimationGeoGeometry(group)(false), resolveAnimationGeoGeometry(group));
  // Exact charges: the fresh snapshot of the group measures the same totals.
  const budget = createGeometryBudget(); snapshotGeometryJSON(group, budget);
  const charges = sampledGeoGroupCharges(group, 0, "snapshot");
  assert.equal(charges.values, budget.diagnostics().values); assert.equal(charges.work, budget.diagnostics().work);
  // Copies, even owned ones, are never authentic and take the full boundary.
  for (const copy of [structuredClone(group), cloneAndFreeze(structuredClone(group))]) {
    assert.equal(sampledGeoGroupCharges(copy, 1, "snapshot"), undefined);
    const other = resolveSampledGeoPresentation({ ...to, geometry: copy });
    assert.deepEqual(other, generic({ ...to, geometry: copy })); assert.notEqual(other.presentation.geometry, copy.features ? group : undefined);
  }
  for (const mutate of [value => { value.styles = []; }, value => { value.plotOrigin = [Infinity, 0]; }, value => { value.frame = { ...value.frame, offset: [0] }; },
    value => { value.styles = value.styles.map(style => ({ ...style, opacity: -1 })); }, value => { value.extra = 1; }]) {
    const changed = { ...to, geometry: group }; mutate(changed);
    assert.deepEqual(error(() => resolveSampledGeoPresentation(changed)), error(() => generic(changed)));
  }
  let reads = 0; const getter = { ...to, geometry: group };
  Object.defineProperty(getter, "styles", { enumerable: true, get() { reads++; return []; } });
  assert.deepEqual(error(() => resolveSampledGeoPresentation(getter)), error(() => generic(getter))); assert.equal(reads, 0);
  // Fields that fit alone but overflow together with the group report like the fresh snapshot.
  const { geometry: _geometry, ...others } = to, rest = createGeometryBudget(); snapshotGeometryJSON({ ...others, styles: [] }, rest);
  const fill = GEO_LIMITS.maxValues - rest.diagnostics().values - sampledGeoGroupCharges(group, 1, "snapshot").values + 1;
  const overflow = { ...to, geometry: group, styles: new Array(fill).fill(null) };
  const expected = error(() => generic(overflow));
  assert.equal(expected.name, "RangeError"); assert.deepEqual(error(() => resolveSampledGeoPresentation(overflow)), expected);
  const fits = { ...to, geometry: group, styles: new Array(fill - 1).fill(null) };
  assert.deepEqual(error(() => resolveSampledGeoPresentation(fits)), error(() => generic(fits)));
});
