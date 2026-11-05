import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../src/index.js";
import { ChartProgram } from "../../../src/ChartProgram.js";
import { BasicChartProgram } from "../../../src/BasicChartProgram.js";
import { cloneAndFreeze } from "../../../src/core/immutable.js";
import { validateStoredResource } from "../../../src/materialization/resourceState.js";

const world = () => chart().createCanvas({ width: 300, height: 200 })
  .createGeometryData({ id: "world", format: "geojson", coordinateKind: "geographic", featureKey: "id", values: {
    type: "FeatureCollection", features: [{ type: "Feature", id: "a", properties: {}, geometry: { type: "LineString", coordinates: [[0, 0], [10, 5], [20, -5]] } }] } });

test("a passed resource check is reused only for the same exact owned resource and constructor", () => {
  const program = world(), resource = program.semanticSpec.resources.find(value => value.kind === "geometry");
  assert.equal(validateStoredResource(resource, ChartProgram), resource);
  assert.equal(validateStoredResource(resource, ChartProgram), resource);
  // Another constructor still runs its own registration check.
  assert.throws(() => validateStoredResource(resource, BasicChartProgram), /not registered/);
  // A structurally equal copy, and a tampered copy, are proved again.
  const copy = cloneAndFreeze(structuredClone(resource));
  assert.equal(validateStoredResource(copy, ChartProgram), copy);
  const tampered = structuredClone(resource);
  tampered.result.features[0].geometry.coordinates[0] = [1, 1];
  assert.throws(() => validateStoredResource(cloneAndFreeze(tampered), ChartProgram), /disagrees with its retained source/);
  // An unowned record is never remembered: a later change is still detected.
  const loose = structuredClone(resource);
  validateStoredResource(loose, ChartProgram);
  loose.result.features[0].geometry.coordinates[0] = [1, 1];
  assert.throws(() => validateStoredResource(loose, ChartProgram), /disagrees with its retained source/);
});

test("repeated projection edits keep the exact geometry resource and its result", () => {
  const base = world().createProjection({ id: "projection", type: "equirectangular", scalePx: 100, translatePx: [150, 100] })
    .createCoordinate({ type: "geo" }).createGeoLineMark({ id: "coast" });
  const geometry = base.semanticSpec.resources.find(value => value.kind === "geometry");
  let program = base;
  for (const scalePx of [110, 120, 110]) program = program.editProjection({ scalePx });
  assert.equal(program.semanticSpec.resources.find(value => value.kind === "geometry"), geometry);
  assert.deepEqual(program.graphicSpec, base.editProjection({ scalePx: 110 }).graphicSpec);
});
