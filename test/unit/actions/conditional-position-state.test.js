import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../src/index.js";
import { serializeProgram, deserializeProgram } from "../../../src/persistence.js";
import { decodeValue, encodeValue } from "../../../src/persistence/codec.js";

const never = { version: 2, registry: "standard@1", root: { type: "literal", value: false } };
const conditional = { conditions: [{ when: never, value: { field: "x" } }], otherwise: { field: "x" } };
function corrupt(program, mutate) {
  const envelope = JSON.parse(serializeProgram(program)), state = decodeValue(envelope.payload);
  mutate(state.semanticSpec.layers[0]);
  envelope.payload = encodeValue(state);
  return JSON.stringify(envelope);
}
function start() { return chart().createCanvas({ width: 300, height: 200 }).createData({ values: [{ x: 1, y: 2 }, { x: 3, y: 4 }] }); }

test("restore enforces the native position policy on inactive point branches", () => {
  const program = start().createPointMark({ id: "points" }).encodeX(conditional).encodeY({ field: "y" });
  for (const patch of [{ aggregate: "sum" }, { bin: { boundaries: [0, 2, 4] } }, { stack: "zero" }, { weight: { field: "x" } }]) {
    assert.throws(() => deserializeProgram(corrupt(program, layer => Object.assign(layer.conditionals.x.conditions[0].value, patch))), /aggregate|bin|stack|weight/);
  }
  assert.doesNotThrow(() => deserializeProgram(serializeProgram(program)));
});

test("restore rejects unsupported line datum and secondary endpoint operations", () => {
  const line = start().createLineMark({ id: "line" }).encodeX({ field: "x" }).encodeY(conditional);
  assert.throws(() => deserializeProgram(corrupt(line, layer => { const value = layer.conditionals.y.conditions[0].value; delete value.field; value.datum = 0; })), /does not support datum/);
  const rect = start().createRectMark({ id: "rect" }).encodeX({ field: "x" }).encodeX2(conditional).encodeY({ field: "y" }).encodeY2({ datum: 0 });
  assert.throws(() => deserializeProgram(corrupt(rect, layer => { layer.conditionals.x2.conditions[0].value.aggregate = "sum"; })), /does not support aggregate/);
});

test("conditional branch scale definition collisions leave the original state and trace unchanged", () => {
  const original = start().createPointMark({ id: "points" }).encodeX({ field: "x", scale: { id: "x", domain: [0, 5] } }).encodeY({ field: "y" });
  const saved = serializeProgram(original), trace = original.trace;
  assert.throws(() => original.encodeX({ conditions: [{ when: never, value: { field: "x", scale: { id: "x", domain: [0, 10] } } }], otherwise: { field: "x", scale: { id: "x", domain: [0, 5] } } }), /conflicting definitions/);
  assert.equal(serializeProgram(original), saved);
  assert.equal(original.trace, trace);
});

test("replacing conditional range primaries preserves their native inferred scale", () => {
  const base = chart().createCanvas().createData({ values: [{ start: "2024-01-01", end: "2024-01-02", y: 2 }, { start: "2024-01-03", end: "2024-01-04", y: 4 }] })
    .createRuleMark({ id: "rule" }).encodeXRange({ lower: "start", upper: "end", fieldType: "temporal", scale: { id: "time", type: "time" } }).encodeY({ field: "y", fieldType: "quantitative" });
  const value = { field: "start", fieldType: "temporal", scale: { id: "time" } };
  const conditional = base.encodeX({ conditions: [{ when: never, value }], otherwise: value });
  const replaced = conditional.encodeX({ field: "start", fieldType: "temporal" });
  assert.equal(replaced.semanticSpec.layers[0].encoding.x.scale, "time");
  assert.equal(replaced.semanticSpec.layers[0].encoding.x2.scale, "time");
  assert.equal(replaced.semanticSpec.layers[0].conditionals?.x, undefined);
  assert.deepEqual(replaced.graphicSpec, base.encodeX({ field: "start", fieldType: "temporal" }).graphicSpec);
});

test("conditional categorical bar and arc positions remain valid before their measure exists", () => {
  const base = chart().createCanvas().createData({ values: [{ category: "A", value: 2 }, { category: "B", value: 4 }] });
  const category = { field: "category", fieldType: "nominal" }, conditional = { conditions: [{ when: never, value: category }], otherwise: category };
  const bars = base.createBarMark({ id: "bars" }).encodeY(category).encodeY(conditional);
  assert.equal(bars.graphicSpec.objects.bars.items?.length ?? 0, 0);
  assert.equal(bars.encodeX({ field: "value", aggregate: "sum" }).graphicSpec.objects.bars.items.length, 2);
  const arcs = base.createArcMark({ id: "arcs", innerRadius: 0.3 }).encodeTheta(category).encodeTheta(conditional);
  assert.equal(arcs.graphicSpec.objects.arcs.items?.length ?? 0, 0);
  assert.deepEqual(arcs.encodeR({ field: "value" }).graphicSpec.objects.arcs, base.createArcMark({ id: "arcs", innerRadius: 0.3 }).encodeTheta(category).encodeR({ field: "value" }).graphicSpec.objects.arcs);
});

test("repeat retains a unique conditional field role and rejects ambiguous branch roles", () => {
  const base = start().createPointMark({ id: "points" }).encodeX({ field: "x" }).encodeY({ field: "x" }).encodeY(conditional);
  const repeated = base.repeatCharts({ target: "points", channel: "y", fields: ["x", "y"], guides: { axes: "each" } });
  assert.deepEqual(Object.values(repeated.children).map(child => child.semanticSpec.layers[0].conditionals.y.otherwise.field), ["x", "y"]);
  const ambiguous = base.encodeY({ conditions: [{ when: never, value: { field: "x" } }], otherwise: { field: "y" } });
  const saved = serializeProgram(ambiguous);
  assert.throws(() => ambiguous.repeatCharts({ target: "points", channel: "y", fields: ["x", "y"] }), /eligible|unique binding/);
  assert.equal(serializeProgram(ambiguous), saved);
});
