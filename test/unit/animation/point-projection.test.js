import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../src/index.js";
import { ChartProgram } from "../../../src/core/ChartProgram.js";
import { planTransition } from "../../../src/animation/planner.js";
import { sampleTransition } from "../../../src/animation/sample.js";

const base = values => chart().createCanvas({ width: 300, height: 200, margin: 20 })
  .createData({ id: "rows", keyField: "id", values: values ?? [{ id: "a", x: 2, y: 20 }, { id: "b", x: 8, y: 60 }] });
const points = () => base().createPointMark({ id: "points" }).encodeX({ field: "x", scale: { domain: [0, 10] } }).encodeY({ field: "y", scale: { domain: [0, 100] } });
const prepare = (from, to = from) => planTransition({ from, to, options: { durationMs: 100 } });
const reasons = program => prepare(program).tracks.map(t => t.reason);

test("native point restrictions coexist with typed Cartesian and polar support", () => {
  const polar = base().createPointMark({ id: "points" }).encodeTheta({ field: "x", scale: { domain: [0, 10] } }).encodeR({ field: "y", scale: { domain: [0, 100] } });
  assert.deepEqual(prepare(polar).tracks.map(track=>track.kind), ["exact", "exact"]);
  const offset = base([{ id: "a", x: "A", group: "u", y: 20 }, { id: "b", x: "B", group: "v", y: 60 }])
    .createPointMark({ id: "points" }).encodeX({ field: "x", fieldType: "nominal" }).encodeY({ field: "y" }).encodeXOffset({ field: "group" });
  assert.deepEqual(prepare(offset).tracks.map(track=>track.kind), ["exact", "exact"]);
  assert.ok(prepare(offset,offset.editCanvas({width:500})).tracks.every(track=>track.kind==="semantic-cartesian"));
  const line = base().createLineMark({ id: "line" }).encodeX({ field: "x" }).encodeY({ field: "y" });
  assert.deepEqual(prepare(line).tracks.map(track=>track.kind), ["exact"]);
  const overlay = line.createOverlay({ id: "overlay", source: "line", type: "point" });
  assert.ok(prepare(overlay,overlay.editCanvas({width:500})).tracks.every(track=>track.kind==="semantic-cartesian"));
  const diamond = points().editPointMark({ shape: "diamond" });
  assert.deepEqual(reasons(diamond), ["unsupported-point-primitive", "unsupported-point-primitive"]);
});

test("unknown scale values and categorical Y stay distinct from continuous numeric input", () => {
  const unknown = base([{ id: "a", x: null, y: 20 }, { id: "b", x: 8, y: 60 }])
    .createPointMark({ id: "points" }).encodeX({ field: "x", fieldType: "quantitative", scale: { unknown: 50 } }).encodeY({ field: "y" });
  assert.equal(reasons(unknown)[0], "nonfinite-semantic-value");
  const nominalY = base([{ id: "a", x: 2, y: "A" }, { id: "b", x: 8, y: "B" }])
    .createPointMark({ id: "points" }).encodeX({ field: "x" }).encodeY({ field: "y", fieldType: "nominal" });
  assert.deepEqual(reasons(nominalY), ["scale-type", "scale-type"]);
});

test("transformed scales retain the exact resolved parameters in semantic tracks", () => {
  for (const [type, parameters] of [["pow", { exponent: 3 }], ["sqrt", {}], ["symlog", { constant: 2 }]]) {
    const from = points().editScale({ id: "x", type, ...parameters });
    const to = from.reviseData({ source: "rows", id: "next", values: [{ id: "a", x: 4, y: 40 }, { id: "b", x: 6, y: 60 }] });
    const plan = prepare(from, to), track = plan.tracks[0];
    assert.equal(track.kind, "semantic-point"); assert.equal(track.x.from.scale.type, type);
    for (const [key, value] of Object.entries(parameters)) assert.equal(track.x.from.scale[key], value);
    assert.equal(sampleTransition(plan, 25).progress, .0625);
  }
});

test("primitive-only meaning, missing bindings and foreign roles cannot masquerade as point values", () => {
  const original = points();
  assert.deepEqual(reasons(new ChartProgram({ graphicSpec: original.graphicSpec })), ["semantic-unavailable", "semantic-unavailable"]);
  const incomplete = original.editSemantic({ property: "layer[points].encoding.x", remove: true });
  assert.deepEqual(reasons(incomplete), ["incomplete-position", "incomplete-position"]);
  const graphicSpec = structuredClone(original.graphicSpec);
  graphicSpec.objects.points.items[0].identity.role = "extra-body";
  assert.equal(reasons(original._clone({ graphicSpec }))[0], "primitive-role");
  const stale = structuredClone(original.graphicSpec);
  stale.objects.points.items[0].identity.lineage.revision = 99;
  assert.throws(() => prepare(original._clone({ graphicSpec: stale })), /stale/);
  for (const keys of [[], [original.semanticSpec.datasets[0].rowKeys[1]]]) {
    const wrongRow = structuredClone(original.graphicSpec);
    wrongRow.objects.points.items[0].identity.lineage.rowKeys = keys;
    assert.throws(() => prepare(original._clone({ graphicSpec: wrongRow })), /exact final row/);
  }
  const other = original.createData({ id: "other", values: [{ x: 2, y: 20 }] });
  const wrongData = structuredClone(other.graphicSpec), dataset = other.semanticSpec.datasets.find(d => d.id === "other");
  wrongData.objects.points.items[0].identity.lineage = { data: dataset.id, logicalDataId: dataset.logicalId, revision: dataset.revision, rowKeys: [dataset.rowKeys[0]] };
  assert.throws(() => prepare(other._clone({ graphicSpec: wrongData })), /semantic dataset/);
  const absent = structuredClone(original.graphicSpec), key = JSON.parse(absent.objects.points.items[0].identity.key);
  key[3][1] = JSON.stringify(["scalar", [["string", "absent"]]]);
  absent.objects.points.items[0].identity.key = JSON.stringify(key);
  assert.throws(() => prepare(original._clone({ graphicSpec: absent })), /final grain/);
});
