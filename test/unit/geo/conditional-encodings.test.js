import test from "node:test";
import assert from "node:assert/strict";
import { validateGeoMarkBinding } from "../../../src/grammar/geo/mark.js";
import { chart, hconcat, prepareDataUpdate } from "../../../src/index.js";
import { getMarkItems } from "../../../src/inspection.js";
import { serializeProgram, deserializeProgram } from "../../../src/persistence.js";
import { decodeValue, encodeValue } from "../../../src/persistence/codec.js";
import { collectResourceReferences } from "../../../src/core/resourceReferences.js";

const literal = value => ({ type: "literal", value });
const field = name => ({ type: "field", name });
const expression = root => ({ version: 2, registry: "standard@1", root });
const when = expression({ type: "binary", op: "gte", left: field("n"), right: literal(2) });
const condition = (value, otherwise, predicate = when) => ({ conditions: [{ when: predicate, value }], otherwise });
const feature = (id, n, group, geometry = { type: "Point", coordinates: [20 + n, 40] }) => ({ type: "Feature", id, properties: { n, group }, geometry });
const values = (...features) => ({ type: "FeatureCollection", features });
function base(input = values(feature("a", 1, "A"), feature("b", 2, "B"), feature("c", 3, "C")), mode = "Point") {
  return chart().createCanvas({ width: 500, height: 300, margin: { left: 0, right: 180, top: 0, bottom: 0 } })
    .createGeometryData({ id: "places", format: "geojson", coordinateKind: "planar", featureKey: "id", values: input })
    .createProjection({ id: "map", type: "identity" }).createCoordinate({ type: "geo" })[`createGeo${mode}Mark`]({ id: "regions" });
}
const properties = p => p.graphicSpec.objects.regions.items.map(item => item.properties);
const layer = p => p.semanticSpec.layers.find(layer => layer.id === "regions");
const ops = (node, op) => [...(node.op === op ? [node] : []), ...(node.children ?? []).flatMap(child => ops(child, op))];

test("geographic first-match values use feature grain, preserve zero size and never synthesize data", () => {
  const p = base(), saved = serializeProgram(p);
  const q = p.encodeColor({ conditions: [{ when, value: { value: "red" } },
    { when: expression(literal(true)), value: { value: "green" } }], otherwise: { value: "blue" } })
    .encodeSize(condition({ value: 0 }, { value: 4 * Math.PI }));
  assert.deepEqual(properties(q).map(p => p.fill), ["green", "red", "red"]);
  assert.deepEqual(properties(q).map(p => p.radius), [2, 0, 0]);
  assert.equal(layer(q).data, undefined); assert.deepEqual(q.semanticSpec.data, p.semanticSpec.data);
  assert.equal(layer(q).encoding?.color, undefined);
  assert.deepEqual(getMarkItems(q).map(item => item.key), getMarkItems(p).map(item => item.key));
  assert.equal(serializeProgram(p), saved);
  const multi = base(values(feature("a", 4, "A", { type: "MultiPoint", coordinates: [[0, 0], [20, 20]] })))
    .encodeColor(condition({ value: "red" }, { value: "blue" }));
  assert.deepEqual(properties(multi).map(p => p.fill), ["red", "red"]); assert.equal(getMarkItems(multi).length, 1);
});

test("every geographic branch contributes its full drawable source domain and native legend references", () => {
  const p = base(values(feature("a", 1, "A"), feature("b", 2, "B"), feature("hidden", 99, "Z", null)))
    .encodeColor(condition({ field: "group", scale: { id: "groups", range: ["red", "blue"] } }, { value: "pink" }))
    .createLegend({ target: "regions", channels: ["color"] });
  assert.deepEqual(p.resolvedScales.groups.domain, ["A", "B"]);
  assert.deepEqual(properties(p).map(p => p.fill), ["pink", "blue"]);
  assert.deepEqual(p.guideConfigs.legend.color.domain, ["A", "B"]);
  assert.ok(collectResourceReferences(p, { kind: "scale", id: "groups" }).some(ref => ref.ownerId === "regions"));
  const clipped = p.editProjection({ clipExtentPx: [[0, 0], [1, 1]] });
  assert.deepEqual(clipped.resolvedScales.groups.domain, ["A", "B"]); assert.equal(getMarkItems(clipped).length, 0);
  assert.throws(() => p.removeScale({ id: "groups" }), /reference|consumer|used/i);
  assert.doesNotThrow(() => p.removeEncoding({ channel: "color" }).removeScale({ id: "groups" }));
  assert.deepEqual(deserializeProgram(serializeProgram(p)).graphicSpec, p.graphicSpec);
});

test("conditional-only parameters and explicit selections rebind their exact geographic consumers", () => {
  const p = base().createParameter({ id: "on", value: true })
    .encodeColor(condition({ value: "red" }, { value: "blue" }, expression({ type: "parameter", id: "on" })))
    .selectMarks({ id: "chosen", target: "regions", field: "n", op: "gte", value: 2 })
    .encodeSize(condition({ value: 9 * Math.PI }, { value: Math.PI }, { selection: "chosen" }));
  const q = deserializeProgram(serializeProgram(p)).editParameter({ target: "on", value: false })
    .editMarkSelection({ selection: "chosen", field: "n", op: "gte", value: 3 });
  assert.deepEqual(properties(q).map(p => p.fill), ["blue", "blue", "blue"]);
  assert.deepEqual(properties(q).map(p => p.radius), [1, 1, 3]);
  assert.equal(layer(q).conditionals.color.parameterInputs[0].revision, 1);
  assert.equal(layer(q).conditionals.size.selectionInputs[0].revision, 1);
  assert.throws(() => q.removeParameter({ id: "on" }), /referenced/);
  assert.throws(() => q.removeMarkSelection({ selection: "chosen" }), /referenced/);
});

test("invalid inactive payloads and graphical feedback fail without changing the earlier program or trace", () => {
  const p = base(), saved = serializeProgram(p), trace = p.trace;
  for (const call of [
    () => p.encodeColor(condition({ value: "red" }, { field: "absent" }, expression(literal(true)))),
    () => p.encodeSize(condition({ value: 1 }, { value: -1 }, expression(literal(true)))),
    () => p.encodeColor(condition({ value: "red" }, { field: "n", fieldType: "quantitative", aggregate: "sum" })),
    () => p.encodeColor({ conditions: [{ when, value: { value: "red" } }] })
  ]) { assert.throws(call); assert.equal(serializeProgram(p), saved); assert.equal(p.trace, trace); }
  const selected = p.selectMarks({ id: "radius", property: "radius", op: "gte", value: 0 });
  assert.throws(() => selected.encodeSize(condition({ value: 0 }, { value: 1 }, { selection: "radius" })), /Cyclic/);
  const filled = p.selectMarks({ id: "filled", property: "fill", op: "eq", value: "red" });
  assert.throws(() => filled.encodeColor(condition({ value: "red" }, { value: "blue" }, { selection: "filled" })), /Cyclic/);
});

test("native geometry edits refresh conditional scale and mark closure atomically", () => {
  const p = base().encodeSize(condition({ field: "n", scale: { id: "areas", range: [Math.PI, 9 * Math.PI] } }, { value: 0 }));
  const saved = serializeProgram(p), trace = p.trace;
  const q = p.editGeometryData({ values: values(feature("a", 4, "A"), feature("b", 8, "B")) });
  assert.deepEqual(q.resolvedScales.areas.domain, [4, 8]); assert.deepEqual(properties(q).map(p => p.radius), [1, 3]);
  assert.throws(() => p.editGeometryData({ values: values(feature("a", "bad", "A")) }));
  assert.equal(serializeProgram(p), saved); assert.equal(p.trace, trace);
  const fixed = q.encodeSize({ value: 4 * Math.PI });
  assert.equal(layer(fixed).conditionals?.size, undefined); assert.deepEqual(properties(fixed).map(p => p.radius), [2, 2]);
  assert.throws(() => q.editGeoPointMark({ radiusPx: 4 }), /field-bound/);
  assert.deepEqual(properties(q.removeEncoding({ channel: "size" })).map(p => p.radius), [3, 3]);
});

test("native shape and line colors share conditions and reject incompatible radius and annotation modes", () => {
  const line = { type: "LineString", coordinates: [[10, 10], [50, 40]] };
  const p = base(values(feature("a", 2, "A", line)), "Line").encodeColor(condition({ value: "red" }, { value: "blue" }));
  assert.equal(properties(p)[0].stroke, "red"); assert.equal(properties(p)[0].fill, "none");
  assert.throws(() => p.editGeoLineMark({ stroke: "green" }), /field-bound/);
  assert.throws(() => p.encodeSize(condition({ value: 1 }, { value: 2 })), /size|point|radius/i);
  const polygon = { type: "Polygon", coordinates: [[[0, 0], [10, 0], [10, 10], [0, 0]]] };
  const q = base(values(feature("a", 2, "A", polygon)), "Shape").encodeColor(condition({ value: "red" }, { value: "blue" }));
  assert.equal(properties(q)[0].fill, "red");
  assert.throws(() => q.encodeOpacity(condition({ value: 0 }, { value: 1 })), /incompatible|eligible|support|mark/i);
  const annotation = q.createGeoAnnotation({ id: "label", anchor: { type: "position", position: [0, 0] }, text: "A" });
  assert.throws(() => annotation.encodeColor({ target: "label", ...condition({ value: "red" }, { value: "blue" }) }), /feature color/);
});

test("ambiguous conditional legends and malformed restored fields reject before any replacement", () => {
  const p = base().encodeColor(condition({ field: "group", scale: { id: "groups" } }, { value: "pink" })).createLegend();
  const saved = serializeProgram(p);
  assert.throws(() => p.encodeColor(condition({ field: "group", scale: { id: "one" } }, { field: "n", fieldType: "quantitative", scale: { id: "two" } })), /ambiguous|legend/i);
  assert.equal(serializeProgram(p), saved);
  const envelope = JSON.parse(saved), state = decodeValue(envelope.payload);
  state.semanticSpec.layers[0].conditionals.color.conditions[0].value.aggregate = "sum";
  envelope.payload = encodeValue(state);
  assert.throws(() => deserializeProgram(JSON.stringify(envelope)), /aggregate|Unknown/i);
  const numeric = base().encodeSize(condition({ field: "n", scale: { id: "areas" } }, { value: 0 }));
  for (const mutate of [state => { state.semanticSpec.layers[0].conditionals.size.conditions[0].value.field = "group"; },
    state => { delete state.resolvedScales.areas; }, state => { state.semanticSpec.layers[0].conditionals.size.conditions[0].value.scale = "absent"; }]) {
    const envelope = JSON.parse(serializeProgram(numeric)), state = decodeValue(envelope.payload);
    mutate(state); envelope.payload = encodeValue(state);
    assert.throws(() => deserializeProgram(JSON.stringify(envelope)));
  }
});

test("empty feature inputs follow explicit domain policy and scoped edits preserve sibling identity", () => {
  const p = base().encodeColor(condition({ field: "n", fieldType: "quantitative", scale: { id: "colors", emptyDomain: "preserve" } }, { value: "pink" }, expression(literal(false))));
  const empty = p.editGeometryData({ values: values() });
  assert.deepEqual(empty.resolvedScales.colors.domain, [1, 3]); assert.deepEqual(properties(empty), []);
  const pair = hconcat({ programs: [{ id: "left", program: p }, { id: "right", program: base() }] });
  const q = pair.encodeColor({ target: { childPath: ["right"], id: "regions" }, ...condition({ value: "red" }, { value: "blue" }) });
  assert.deepEqual(q.children.left.graphicSpec, pair.children.left.graphicSpec);
  assert.deepEqual(properties(q.children.right).map(p => p.fill), ["blue", "red", "red"]);
  assert.throws(() => base().encodeColor(condition({ value: "red" }, { value: "blue" })).editGeometryData({ values: values() }), /field|Unknown/);
});

test("joined conditional consumers share actual row membership and atomic prepared source revision", async () => {
  const seed = base().removeMark({ target: "regions" });
  const csv = text => ({ text, mimeType: "text/csv", encoding: "utf-8" });
  const create = await prepareDataUpdate(seed, { kind: "create", id: "table", source: { kind: "named", name: "measures", format: "csv", parse: { n: { type: "number" } } } },
    { requestToken: "create", resolveNamed: async () => csv("code,n\na,1\nb,2\nc,3") });
  const p = seed.applyDataUpdate({ prepared: create, requestToken: "create" })
    .createGeoJoinData({ id: "joined", geometry: "places", data: "table", geometryKey: "id", dataKey: "code" })
    .createGeoPointMark({ id: "source", geometry: "joined" })
    .selectMarks({ id: "chosen", target: "source", field: "n", op: "gte", value: 2 })
    .createGeoPointMark({ id: "regions", geometry: "joined" })
    .encodeColor(condition({ field: "n", fieldType: "quantitative", scale: { id: "colors", range: ["white", "black"] } }, { value: "pink" }, { selection: "chosen" }));
  assert.deepEqual(properties(p).map(p => p.fill), ["pink", "#808080", "#000000"]);
  const saved = serializeProgram(p), trace = p.trace;
  const invalid = await prepareDataUpdate(p, { kind: "revise", target: "table", id: "updated" },
    { requestToken: "invalid", resolveNamed: async () => csv("code,n\na,10") });
  assert.throws(() => p.applyDataUpdate({ prepared: invalid, requestToken: "invalid" }));
  assert.equal(serializeProgram(p), saved); assert.equal(p.trace, trace);
  const valid = await prepareDataUpdate(p, { kind: "revise", target: "table", id: "updated" },
    { requestToken: "valid", resolveNamed: async () => csv("code,n\na,10\nb,20\nc,30") });
  const q = p.applyDataUpdate({ prepared: valid, requestToken: "valid" });
  assert.deepEqual(q.resolvedScales.colors.domain, [10, 30]);
  assert.deepEqual(properties(q).map(p => p.fill), ["#ffffff", "#808080", "#000000"]);
  assert.equal(ops(q.trace.children.at(-1), "materializeGeoMark").filter(node => node.args.id === "regions").length, 1);
  assert.deepEqual(deserializeProgram(serializeProgram(q)).graphicSpec, q.graphicSpec);
});

test("LOD branch values and selection use current representations without replacing authored keys", () => {
  const source = base().removeMark({ target: "regions" })
    .createGeometryData({ id: "coarse", format: "geojson", coordinateKind: "planar", featureKey: "id", values: values(feature("state", 8, "S")) })
    .createGeoLODData({ id: "lod", levels: [{ id: "state", geometry: "coarse" }, { id: "county", geometry: "places", enterZoom: 4, exitZoom: 3,
      parents: ["a", "b", "c"].map(key => ({ key, parent: "state" })) }], zoom: 5 })
    .createGeoPointMark({ id: "regions", geometry: "lod" });
  const [a] = getMarkItems(source);
  const p = source.selectMarks({ id: "chosen", items: [a.key] })
    .encodeColor(condition({ value: "red" }, { value: "blue" }, { selection: "chosen" }))
    .encodeSize(condition({ field: "n", scale: { id: "areas", range: [Math.PI, 9 * Math.PI] } }, { value: 0 }, expression(literal(true))));
  const q = p.editGeoLODData({ zoom: 2 });
  assert.deepEqual(q.resolvedScales.areas.domain, [8, 8]); assert.deepEqual(properties(q).map(p => p.fill), ["red"]);
  const [state] = getMarkItems(q); assert.notEqual(state.key, a.key); assert.ok(state.representationKeys.includes(a.key));
  assert.deepEqual(q.semanticSpec.resources.find(resource => resource.id === "chosen").options, p.semanticSpec.resources.find(resource => resource.id === "chosen").options);
  const r = q.editGeoLODData({ zoom: 5 }); assert.deepEqual(properties(r).map(p => p.fill), ["red", "blue", "blue"]);
  assert.deepEqual(deserializeProgram(serializeProgram(r)).graphicSpec, r.graphicSpec);
});

test("atomic multi-channel geographic assignment retains selection refs and materializes once", () => {
  const p = base().selectMarks({ id: "chosen", field: "n", op: "gte", value: 2 }), saved = serializeProgram(p);
  const q = p.encodeChannels({ target: "regions", channels: {
    color: condition({ field: "group", scale: { id: "groups", range: ["red", "blue", "green"] } }, { value: "gray" }, { selection: "chosen" }),
    size: condition({ field: "n", scale: { id: "areas", range: [Math.PI, 9 * Math.PI] } }, { value: 0 }, { selection: "chosen" })
  } });
  assert.deepEqual(properties(q).map(item => item.fill), ["gray", "blue", "green"]);
  assert.deepEqual(properties(q).map(item => item.radius), [0, Math.sqrt(5), 3]);
  assert.equal(ops(q.trace.children.at(-1), "materializeGeoMark").length, 1);
  assert.throws(() => p.encodeChannels({ target: "regions", channels: {
    color: condition({ value: "red" }, { value: "blue" }), size: condition({ value: 1 }, { field: "absent" })
  } }));
  assert.equal(serializeProgram(p), saved);
});


test("stored geographic conditionals reject foreign source ownership and invalid native binding kinds", () => {
  const p = base().encodeColor(condition({ value: "red" }, { value: "blue" }));
  const stored = layer(p), config = p.materializationConfigs.marks.regions.geo;
  assert.throws(() => validateGeoMarkBinding({ ...stored, data: { id: "foreign" } }, config), /geometry resource/);
  assert.throws(() => validateGeoMarkBinding({ ...stored, geoBinding: { ...stored.geoBinding, geometry: { kind: "layout", id: "foreign", revision: 0 } } }, config), /geometry references/);
  assert.throws(() => validateGeoMarkBinding({ ...stored, geoBinding: { ...stored.geoBinding, interpolation: "invalid" } }, config), /interpolation/);
  assert.throws(() => validateGeoMarkBinding({ ...stored, geoBinding: { ...stored.geoBinding, mode: "invalid" } }, config), /mark mode/);
});

test("native point selections drive joined geographic conditions through shared rows", () => {
  const p = base().removeMark({ target: "regions" })
    .createData({ id: "table", values: [{ code: "a", n: 1 }, { code: "b", n: 2 }, { code: "c", n: 3 }] })
    .createCoordinate({ id: "xy", type: "cartesian" })
    .createPointMark({ id: "dots", data: "table" })
    .encodeX({ field: "n", fieldType: "quantitative", coordinate: "xy" }).encodeY({ field: "n", fieldType: "quantitative", coordinate: "xy" })
    .selectMarks({ id: "chosen", target: "dots", field: "n", op: "gte", value: 2 })
    .createGeoJoinData({ id: "joined", geometry: "places", data: "table", geometryKey: "id", dataKey: "code" })
    .createGeoPointMark({ id: "regions", geometry: "joined", coordinate: "main" })
    .encodeColor(condition({ value: "red" }, { value: "blue" }, { selection: "chosen" }))
    .encodeSize(condition({ value: 4 * Math.PI }, { value: Math.PI }, { selection: "chosen" }));
  assert.deepEqual(properties(p).map(item => [item.fill, item.radius]), [["blue", 1], ["red", 2], ["red", 2]]);
  const q = p.editMarkSelection({ selection: "chosen", field: "n", op: "eq", value: 1 });
  assert.deepEqual(properties(q).map(item => [item.fill, item.radius]), [["red", 2], ["blue", 1], ["blue", 1]]);
  assert.deepEqual(getMarkItems(q, { target: "dots" }).map(item => item.key), getMarkItems(p, { target: "dots" }).map(item => item.key));
});
