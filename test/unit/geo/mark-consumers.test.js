import test from "node:test";
import assert from "node:assert/strict";
import { chart } from "../../../src/index.js";
import { serializeProgram, deserializeProgram } from "../../../src/persistence.js";
import { getMarkItems } from "../../../src/inspection.js";
import { renderToSVG } from "../../../src/renderers/svg.js";
import { prepareProgramHitFrame } from "../../../src/interaction/hitProgram.js";
import { createHitFrameBridge } from "../../../src/interaction/hitFrame.js";
import { geoMarkSource } from "../../../src/materialization/geo/source.js";
import { createGeographicMarks } from "../../../examples/geographic-marks/program.js";

const items = (program, id) => program.graphicSpec.objects[id].items;
const pattern = { type: "pattern", style: "cross", pitch: 12, strokeWidth: 2, phase: [-1, 2], foreground: "#f00", background: "#00f8", coordinateSpace: "object" };
const radial = { type: "radial-gradient", center: { x: .5, y: .5 }, radius: .5, stops: [{ offset: 0, color: "white" }, { offset: 1, color: "navy" }] };

test("geographic filled paths and points preserve structured paint and effects across projection edits", () => {
  for (const [target, edit] of [["geo-shape", "editGeoShapeMark"], ["geo-point", "editGeoPointMark"]]) for (const fill of [pattern, radial]) {
    const input = structuredClone(fill), p = createGeographicMarks(), before = serializeProgram(p);
    const q = p[edit]({ target, fill: input, outline: { color: "white", width: 2 }, shadow: { color: "#1238", offsetX: 3 }, blend: "multiply" });
    input.type = "invalid";
    const originalItems = items(q, target);
    for (const child of originalItems) {
      assert.equal(child.properties.fill.type, fill.type);
      assert.equal(child.properties.outline.width, 2);
      assert.deepEqual(child.properties.shadow, { color: "#1238", offsetX: 3, offsetY: 0, blurRadius: 0 });
      assert.equal(child.properties.blend, "multiply");
    }
    const moved = deserializeProgram(serializeProgram(q)).editProjection({ translatePx: [30, 20] });
    assert.deepEqual(getMarkItems(moved, { target }).map(item => item.key), getMarkItems(q, { target }).map(item => item.key));
    if (fill.type === "pattern") assert.notDeepEqual(items(moved, target)[0].properties.fill.origin, originalItems[0].properties.fill.origin);
    const reset = moved[edit]({ target, outline: false, shadow: false, blend: "normal" });
    assert.match(renderToSVG(reset), /<(?:pattern|radialGradient)/);
    assert.ok(items(reset, target).every(child => child.properties.outline === undefined && child.properties.shadow === undefined && child.properties.blend === "normal"));
    assert.equal(serializeProgram(p), before);
    assert.deepEqual(deserializeProgram(serializeProgram(reset)).graphicSpec, reset.graphicSpec);
  }
});

test("geographic feature hits exclude polygon holes and use the current projected frame", () => {
  const p = createGeographicMarks(), first = createHitFrameBridge(prepareProgramHitFrame(p, 1));
  const hit = (bridge, x, y) => bridge.hit({ x, y }, { slop: 0 });
  assert.equal(hit(first, 100, 300).target.ownerId, "geo-shape");
  assert.equal(hit(first, 200, 260).target, null);
  const stop = hit(first, 120, 130).target;
  assert.equal(stop.ownerId, "geo-point");
  assert.deepEqual(stop.resourceRefs, [{ kind: "geometry", id: "stops", revision: 0 }]);
  const moved = p.editProjection({ translatePx: [30, 20] }), next = createHitFrameBridge(prepareProgramHitFrame(moved, 2));
  assert.equal(hit(next, 120, 130).candidates.some(item => item.ownerId === "geo-point"), false);
  assert.equal(hit(next, 150, 150).target.itemKey, stop.itemKey);
  assert.equal(hit(first, 120, 130).target.itemKey, stop.itemKey);
});

test("geographic line complement dimming preserves the unselected stroke through rematerialization", () => {
  const p = chart().createCanvas().createGeometryData({ id: "roads", format: "geojson", coordinateKind: "planar", featureKey: "id", values: {
    type: "FeatureCollection", features: [0, 1].map(id => ({ type: "Feature", id, properties: { id }, geometry: { type: "LineString", coordinates: [[10, 20 + id * 20], [100, 20 + id * 20]] } }))
  } }).createProjection({ id: "map", type: "identity" }).createCoordinate({ type: "geo" }).createGeoLineMark({ stroke: "navy" });
  const q = p.highlightMarks({ id: "chosen", select: { field: "id", op: "eq", value: 0 }, color: "red", dimOthers: { opacity: .2 } });
  for (const state of [q, q.editProjection({ scalePx: 2 })]) {
    const byKey = new Map(items(state, "geo-line").map(child => [child.identity.key, child.properties]));
    const [selected, complement] = getMarkItems(p, { target: "geo-line" }).map(item => byKey.get(item.key));
    assert.equal(selected.stroke, "red");
    assert.equal(complement.stroke, "navy");
    assert.equal(complement.opacity, .2);
  }
});

test("each geographic mode owns its deterministic default id and graticule ticks reject unsafe integer ranges", () => {
  assert.deepEqual(createGeographicMarks().semanticSpec.layers.map(layer => layer.id), ["geo-shape", "geo-line", "geo-point"]);
  const p = createGeographicMarks("graticule"), before = serializeProgram(p);
  assert.throws(() => p.editGraticule({ extentDeg: [[100, 0], [100 + 1e-12, 1]], stepDeg: [1e-14, 1] }), /budget|range|bounded|integer/i);
  assert.equal(serializeProgram(p), before);
});


test("geographic consumer validation rejects non-Geo coordinates and unrelated geometry methods", () => {
  const p = createGeographicMarks().createContourData({ id: "surface", grid: { origin: [0, 0], dx: 1, dy: 1, width: 2, height: 2, values: [0, 1, 1, 0] }, thresholds: [.5] });
  const layer = p.semanticSpec.layers[0], config = p.markConfigs[layer.id].geo;
  const native = { ...p, semanticSpec: { ...p.semanticSpec, coordinates: [{ id: "main", type: "cartesian" }] } };
  assert.throws(() => geoMarkSource(native, layer, config), /Geo coordinate/);
  assert.throws(() => geoMarkSource(p, { ...layer, geoBinding: { ...layer.geoBinding, geometry: { kind: "geometry", id: "surface", revision: 0 } } }, config), /source geometry/);
});
