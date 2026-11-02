import test from "node:test";
import assert from "node:assert/strict";
import { chart, hconcat } from "../../../src/index.js";
import { serializeProgram, deserializeProgram, serializeGraphic, deserializeGraphic } from "../../../src/persistence.js";
import { validateGraphic } from "../../../src/persistence/validation.js";
import { decodeValue, encodeValue } from "../../../src/persistence/codec.js";
import { cloneAndFreeze } from "../../../src/core/immutable.js";
import { normalizeGeoCapacity, geoBindingCapacity, validateGeoGraphicCapacity } from "../../../src/grammar/geo/capacity.js";
import { validatePathCommands } from "../../../src/grammar/pathCommands.js";
import { resolvePathSubpaths, pathCommandCapacity, validatePathCommandCount } from "../../../src/grammar/pathTopology.js";
import { flattenPathCommands } from "../../../src/grammar/pathGeometry.js";
import { validateConcreteGraphicProperties } from "../../../src/grammar/schemas/concreteGraphic.js";
import { resolvePrimitiveGraphicBounds } from "../../../src/grammar/schemas/graphicBounds.js";
import { createTransitionScene } from "../../../src/scene.js";
import { validateGraphicClip } from "../../../src/grammar/schemas/graphicClip.js";
import { renderToSVG } from "../../../src/renderers/svg.js";

const values = (n = 4) => ({ type: "Feature", id: "coast", properties: {}, geometry: { type: "LineString", coordinates: Array.from({ length: n }, (_, i) => [i, i % 2]) } });
const base = (n = 4) => chart().createCanvas({ width: 100, height: 100, margin: 0 })
  .createGeometryData({ id: "world", format: "geojson", coordinateKind: "planar", values: values(n) })
  .createProjection({ id: "map", type: "identity" }).createCoordinate({ type: "geo" });
const line = (capacity, n) => base(n).createGeoLineMark({ id: "coast", ...(capacity === undefined ? {} : { capacity }) });
const properties = p => p.graphicSpec.objects.coast.items[0].properties;
const capacity = { maxProjectedPoints: 4, maxPathCommands: 4 };

test("geographic capacity normalizes only own closed integer fields without reading accessors", () => {
  assert.deepEqual(normalizeGeoCapacity({}), { maxProjectedPoints: 10000, maxPathCommands: 30000 });
  assert.deepEqual(normalizeGeoCapacity({ maxProjectedPoints: 1 }), { maxProjectedPoints: 1, maxPathCommands: 30000 });
  assert.deepEqual(normalizeGeoCapacity({ maxPathCommands: 200000 }), { maxProjectedPoints: 10000, maxPathCommands: 200000 });
  for (const field of Object.keys(capacity)) for (const value of [undefined, null, false, 0, -0, -1, 1.5, NaN, Infinity, 200001, "4"]) {
    assert.throws(() => normalizeGeoCapacity({ [field]: value }), /integer/);
  }
  for (const input of [null, undefined, [], { extra: 2 }, Object.create({ maxPathCommands: 4 })]) assert.throws(() => normalizeGeoCapacity(input));
  let reads = 0;
  assert.throws(() => normalizeGeoCapacity({ get maxPathCommands() { reads++; return 4; } }), /own data/);
  assert.equal(reads, 0);
});

test("native default output stays unchanged and explicit capacity is copied exactly to each path", () => {
  const original = line(), p = line(capacity);
  assert.equal(Object.hasOwn(properties(original), "maxCommands"), false);
  assert.deepEqual({ ...properties(p), maxCommands: undefined }, { ...properties(original), maxCommands: undefined });
  assert.equal(properties(p).maxCommands, 4);
  assert.deepEqual(p.semanticSpec.layers[0].geoBinding.capacity, capacity);
  assert.deepEqual(properties(p).commands, Array.from({ length: 4 }, (_, i) => ({ op: i ? "L" : "M", x: i, y: i % 2 })));
  const mutable = { ...capacity }, isolated = line(mutable); mutable.maxPathCommands = 1;
  assert.equal(properties(isolated).maxCommands, 4);
  assert.deepEqual(line({}).semanticSpec.layers[0].geoBinding.capacity, { maxProjectedPoints: 10000, maxPathCommands: 30000 });
});

test("native capacity preflights creation, editing and source revision atomically", () => {
  for (const policy of [{ ...capacity, maxProjectedPoints: 3 }, { ...capacity, maxPathCommands: 3 }]) assert.throws(() => line(policy), /must not exceed 3/);
  const p = line(capacity), before = serializeProgram(p), trace = p.trace;
  assert.throws(() => p.editGeoLineMark({ capacity: { maxProjectedPoints: 3 } }), /must not exceed 3/);
  assert.throws(() => p.editGeometryData({ target: "world", values: values(5) }), /must not exceed 4/);
  assert.throws(() => p.editGeoLineMark({ capacity: undefined }), /undefined/);
  assert.equal(serializeProgram(p), before); assert.equal(p.trace, trace);
  const changed = p.editGeoLineMark({ capacity: { maxProjectedPoints: 5, maxPathCommands: 5 } }).editGeometryData({ target: "world", values: values(5) });
  assert.equal(properties(changed).commands.length, 5); assert.equal(properties(changed).maxCommands, 5);
  assert.deepEqual(changed.editGeoLineMark({ stroke: "red" }).semanticSpec.layers[0].geoBinding.capacity, { maxProjectedPoints: 5, maxPathCommands: 5 });
});

test("projection and Canvas closure preserve all commands and exact native declarations", () => {
  const p = line(capacity), q = p.editProjection({ scalePx: 2, translatePx: [10, 20] }).editCanvas({ width: 120 });
  assert.deepEqual(properties(q).commands, Array.from({ length: 4 }, (_, i) => ({ op: i ? "L" : "M", x: 10 + 2 * i, y: 20 + 2 * (i % 2) })));
  assert.equal(properties(q).maxCommands, 4);
  assert.deepEqual(deserializeProgram(serializeProgram(q)).graphicSpec, q.graphicSpec);
  assert.equal((renderToSVG(q).match(/[ML]/g) ?? []).length > 3, true);
});

test("native path declarations cannot borrow a different policy through direct edits or snapshots", () => {
  for (const p of [line(), line(capacity)]) {
    const before = serializeProgram(p), item = p.graphicSpec.objects.coast.items[0];
    assert.throws(() => p.editGraphics({ target: item.id, property: "maxCommands", value: 10 }), /exact native binding/);
    assert.throws(() => p.editGraphics({ target: "coast", property: "items", value: [{ ...item, id: undefined, properties: { ...item.properties, maxCommands: 10 } }] }));
    const envelope = JSON.parse(before), payload = decodeValue(envelope.payload);
    payload.graphicSpec.objects.coast.items[0].properties.maxCommands = 10;
    envelope.payload = encodeValue(payload);
    assert.throws(() => deserializeProgram(JSON.stringify(envelope)), /capacity.*binding/);
    assert.equal(serializeProgram(p), before);
  }
  const composed = hconcat({ programs: [{ id: "a", program: line(capacity) }, { id: "b", program: line({ maxPathCommands: 8 }) }] });
  assert.deepEqual(deserializeProgram(serializeProgram(composed)).graphicSpec, composed.graphicSpec);
});

test("current path policy is checked before owned topology and command caches", () => {
  assert.equal(validatePathCommandCount(200000, "declared", 200000), 200000);
  assert.throws(() => validatePathCommandCount(200001, "declared", 200000), /must not exceed 200000/);
  const commands = cloneAndFreeze([{ op: "M", x: 0, y: 0 }, { op: "L", x: 1, y: 1 }]);
  assert.equal(validatePathCommands(commands, 2), commands); resolvePathSubpaths(commands, 2);
  assert.throws(() => validatePathCommands(commands, 1), /must not exceed 1/);
  assert.throws(() => resolvePathSubpaths(commands, 1), /must not exceed 1/);
  assert.throws(() => validatePathCommands(commands, 200001), /integer/);
  assert.throws(() => flattenPathCommands(commands, { maxCommands: 1 }), /must not exceed 1/);
  assert.deepEqual(flattenPathCommands(commands, { maxCommands: 2 }).subpaths[0].points, [{ x: 0, y: 0 }, { x: 1, y: 1 }]);
  const mutable = structuredClone(commands); validatePathCommands(mutable, 2); mutable[1].x = Infinity;
  assert.throws(() => validatePathCommands(mutable, 2), /finite/);
  assert.throws(() => validatePathCommands(Object.freeze(mutable), 2), /finite/);
});

test("inherited capacity and declaration accessors are rejected without execution", () => {
  let reads = 0;
  for (const field of ["maxProjectedPoints", "maxPathCommands"]) {
    Object.defineProperty(Object.prototype, field, { configurable: true, get() { reads++; return 2; } });
    try { assert.throws(() => normalizeGeoCapacity({}), /own/); } finally { delete Object.prototype[field]; }
  }
  Object.defineProperty(Object.prototype, "maxCommands", { configurable: true, get() { reads++; return 2; } });
  try { assert.throws(() => pathCommandCapacity({}), /own/); } finally { delete Object.prototype.maxCommands; }
  assert.equal(reads, 0);
});

test("aggregate command and point budgets account for separate features and preserve graticule edits", () => {
  const source = { type: "FeatureCollection", features: [values(3), { ...values(3), id: "other" }] };
  const p = base().editGeometryData({ target: "world", values: source });
  assert.throws(() => p.createGeoLineMark({ capacity: { maxProjectedPoints: 5, maxPathCommands: 6 } }), /point count.*5/);
  assert.throws(() => p.createGeoLineMark({ capacity: { maxProjectedPoints: 6, maxPathCommands: 5 } }), /command count.*5/);
  assert.equal(p.createGeoLineMark({ capacity: { maxProjectedPoints: 6, maxPathCommands: 6 } }).graphicSpec.objects["geo-line"].items.length, 2);
  const g = chart().createCanvas().createProjection({ id: "map", type: "equirectangular" }).createCoordinate({ type: "geo" })
    .createGraticule({ stepDeg: [90, 45], precisionDeg: 10, capacity: {} }).editGraticule({ opacity: .5 });
  assert.deepEqual(g.semanticSpec.layers[0].geoBinding.capacity, { maxProjectedPoints: 10000, maxPathCommands: 30000 });
  assert.ok(g.graphicSpec.objects.graticule.items.every(item => item.properties.maxCommands === 30000));
  assert.throws(() => g.createGeoAnnotation({ text: "Here", anchor: { type: "position", position: [0, 0] }, capacity: {} }), /Unknown/);
});

test("source-free concrete capacity survives scene and graphic codec and validates bounds", () => {
  const commands = [{ op: "M", x: 10, y: 10 }, { op: "L", x: 40, y: 40 }];
  const p = chart().createCanvas({ width: 100, height: 100, margin: 0 }).createGraphics({ id: "path", type: "path" })
    .editGraphics({ target: "path", property: "maxCommands", value: 2 })
    .editGraphics({ target: "path", property: "commands", value: commands })
    .editGraphics({ target: "path", property: "stroke", value: "red" }).editGraphics({ target: "path", property: "strokeWidth", value: 2 });
  const graphic = p.graphicSpec.objects.path, scene = createTransitionScene(p, { format: "canvas" });
  assert.equal(scene.nodes.find(node => node.type === "path").properties.maxCommands, 2);
  assert.deepEqual(deserializeGraphic(serializeGraphic(p)).graphicSpec, p.graphicSpec);
  assert.ok(resolvePrimitiveGraphicBounds("path", graphic.properties).right >= 40);
  const before = serializeGraphic(p);
  assert.throws(() => p.editGraphics({ target: "path", property: "maxCommands", value: 1 }), /must not exceed 1/);
  assert.equal(serializeGraphic(p), before);
  for (const value of [undefined, null, 0, 1.5, 200001]) assert.throws(() => validateConcreteGraphicProperties("path", { ...graphic.properties, maxCommands: value }));
  let reads = 0;
  assert.throws(() => pathCommandCapacity({ get maxCommands() { reads++; return 2; } }), /own data/); assert.equal(reads, 0);
  assert.throws(() => validateConcreteGraphicProperties("circle", { maxCommands: 2 }), /Unknown/);
});


test("projection refinement overflow is atomic under the retained native capacity", () => {
  const p = chart().createCanvas({ width: 100, height: 100, margin: 0 })
    .createGeometryData({ id: "coast", format: "geojson", coordinateKind: "geographic", values: { type: "LineString", coordinates: [[-80, 30], [80, 30]] } })
    .createProjection({ id: "map", type: "orthographic", scalePx: 100, precisionPx: .5 }).createCoordinate({ type: "geo" })
    .createGeoLineMark({ capacity: { maxProjectedPoints: 33, maxPathCommands: 33 } });
  const before = serializeProgram(p), trace = p.trace;
  assert.equal(p.graphicSpec.objects["geo-line"].items[0].properties.commands.length, 33);
  assert.throws(() => p.editProjection({ scalePx: 1000 }), /must not exceed 33/);
  assert.equal(serializeProgram(p), before); assert.equal(p.trace, trace);
  const q = p.editGeoLineMark({ capacity: { maxProjectedPoints: 65, maxPathCommands: 65 } }).editProjection({ scalePx: 1000 });
  assert.equal(q.graphicSpec.objects["geo-line"].items[0].properties.commands.length, 65);
});


test("stored capacity and weighted native declarations reject incomplete or borrowed authority", () => {
  let reads = 0;
  assert.throws(() => geoBindingCapacity({ capacity: { maxProjectedPoints: 4 } }), /resolved/);
  assert.throws(() => geoBindingCapacity({ get capacity() { reads++; return capacity; } }), /own data/);
  Object.defineProperty(Object.prototype, "capacity", { configurable: true, get() { reads++; return capacity; } });
  try { assert.throws(() => geoBindingCapacity({}), /own/); } finally { delete Object.prototype.capacity; }
  assert.equal(reads, 0);
  const binding = { capacity }, path = { type: "path", properties: properties(line(capacity)) };
  const mixed = { type: "weighted-blend", properties: { sources: [{ ...path, weight: .5 }, { type: "circle", weight: .5, properties: { cx: 0, cy: 0, r: 1 } }] } };
  assert.equal(validateGeoGraphicCapacity(binding, mixed), mixed);
  assert.throws(() => validateGeoGraphicCapacity(binding, { ...mixed, properties: { sources: [{ ...path, weight: .5 }, { ...path, weight: .5 }] } }), /command count.*4/);
  assert.throws(() => validateGeoGraphicCapacity(binding, { type: "path", properties: { ...path.properties, maxCommands: 5 } }), /exact native binding/);
  assert.throws(() => validateGraphic(line(capacity).graphicSpec, "graphic", { legacy: true }), /version 4/);
});

test("declared concrete paths do not raise clip or ordinary command defaults", () => {
  const commands = Array.from({ length: 30001 }, (_, i) => ({ op: i ? "L" : "M", x: i, y: i % 2 }));
  assert.throws(() => validatePathCommands(commands), /30000/);
  validateConcreteGraphicProperties("path", { commands, maxCommands: 30001 });
  const sources = [0.25, 0.75].map(weight => ({ type: "path", weight, offset: [0, 0], clip: { x: 0, y: 0, width: 30001, height: 2 }, clips: [], properties: { commands, maxCommands: 30001, fill: "blue", strokeWidth: 0 } }));
  validateConcreteGraphicProperties("weighted-blend", { sources });
  assert.deepEqual(resolvePrimitiveGraphicBounds("weighted-blend", { sources }), { left: 0, right: 30000, top: 0, bottom: 1 });
  assert.throws(() => validateConcreteGraphicProperties("weighted-blend", { sources: sources.map(source => ({ ...source, properties: { ...source.properties, maxCommands: 30000 } })) }), /30000/);
  assert.throws(() => validateGraphicClip({ type: "path", commands }, "collection"), /30000/);
  assert.throws(() => validateGraphicClip({ type: "path", commands, maxCommands: 30001 }, "collection"), /only/);
  assert.deepEqual(flattenPathCommands(commands, { maxCommands: 30001, maxPoints: 30000 }), { subpaths: [], diagnostics: [{ code: "path-point-limit", limit: 30000, commandIndex: 30000 }] });
});
