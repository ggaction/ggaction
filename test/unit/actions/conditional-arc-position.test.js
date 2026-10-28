import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../src/index.js";
import { getMarkItems } from "../../../src/inspection.js";
import { serializeProgram, deserializeProgram } from "../../../src/persistence.js";
import { resolveMarkItems } from "../../../src/materialization/selection/policies/index.js";

const expression = root => ({ version: 2, registry: "standard@1", root });
const selected = expression({ type: "field", name: "selected" });
const start = values => chart().createCanvas({ width: 300, height: 240, margin: 20 })
  .createData({ id: "data", values }).createArcMark({ id: "arcs", data: "data" });
const sectors = program => resolveMarkItems(program, "arcs");
const commands = program => program.graphicSpec.objects.arcs.items.map(item => item.properties.commands);

test("conditional proportional theta selects weights before cumulative angular projection", () => {
  const rows = [{ a: 10, b: 0, selected: true }, { a: 0, b: 30, selected: false }];
  const base = start(rows).encodeTheta({ field: "b" });
  const saved = serializeProgram(base);
  const program = base.encodeTheta({ conditions: [{ when: selected, value: { field: "a" } }], otherwise: { field: "b" } });
  assert.deepEqual(sectors(program).map(item => [item.geometry.startTheta, item.geometry.endTheta]), [[0, 90], [90, 360]]);
  const native = start(rows.map(row => ({ ...row, chosen: row.selected ? row.a : row.b }))).encodeTheta({ field: "chosen" });
  assert.deepEqual(commands(program), commands(native));
  assert.equal(serializeProgram(base), saved);
  assert.equal(serializeProgram(deserializeProgram(serializeProgram(program))), serializeProgram(program));
});

test("conditional grouped theta evaluates count and sum at the final category grain", () => {
  const rows = [{ category: "A", value: 6, selected: true }, { category: "A", value: 2, selected: true }, { category: "B", value: 6, selected: false }];
  const base = start(rows).encodeTheta({ field: "category", aggregate: "count" });
  const program = base.encodeTheta({ conditions: [{ when: selected, value: { field: "category", aggregate: "sum", weight: "value" } }], otherwise: { field: "category", aggregate: "count" } });
  assert.deepEqual(sectors(program).map(item => [item.geometry.startTheta, item.geometry.endTheta]), [[0, 320], [320, 360]]);
  assert.deepEqual(getMarkItems(program, { target: "arcs" }).map(item => item.rows.length), [2, 1]);
});

test("conditional radial values preserve equal-angle and measured area mappings", () => {
  const rows = [{ category: "A", a: 1, b: 4, selected: true }, { category: "B", a: 2, b: 9, selected: false }];
  const base = start(rows).encodeTheta({ field: "category", fieldType: "nominal" }).encodeR({ field: "b", scale: { id: "radius", domain: [0, 9], range: [0, 90] } });
  const program = base.encodeR({ conditions: [{ when: selected, value: { field: "a" } }], otherwise: { field: "b" } });
  assert.deepEqual(sectors(program).map(item => item.geometry.outerRadius), [10, 90]);
  const measured = start(rows).encodeTheta({ field: "category", fieldType: "nominal" }).encodeR({ field: "b", aggregate: "sum", mapping: "area", scale: { id: "radius", domain: [0, 9], range: [0, 90] } });
  const counted = measured.encodeR({ conditions: [{ when: selected, value: { aggregate: "count", mapping: "area" } }], otherwise: { field: "b", aggregate: "sum", mapping: "area" } });
  assert.deepEqual(sectors(counted).map(item => item.geometry.outerRadius), [30, 90]);
});

test("first conditional theta infers its native shared angular scale without an ordinary binding", () => {
  const rows = [{ a: 1, b: 2, selected: true }, { a: 3, b: 4, selected: false }];
  const program = start(rows).encodeTheta({ conditions: [{ when: selected, value: { field: "a" } }], otherwise: { field: "b" } });
  assert.equal(program.semanticSpec.layers[0].conditionals.theta.conditions[0].value.scale, program.semanticSpec.layers[0].conditionals.theta.otherwise.scale);
  assert.deepEqual(sectors(program).map(item => [item.geometry.startTheta, item.geometry.endTheta]), [[0, 72], [72, 360]]);
});

test("inactive arc topology and conflicting angular scales reject atomically", () => {
  const base = start([{ a: 1, b: 2, category: "A", selected: false }, { a: 3, b: 4, category: "B", selected: false }]).encodeTheta({ field: "b" });
  const saved = serializeProgram(base), trace = base.trace;
  assert.throws(() => base.encodeTheta({ conditions: [{ when: selected, value: { field: "a", scale: { id: "alternate" } } }], otherwise: { field: "b" } }), /shared angular scale/);
  assert.throws(() => base.encodeTheta({ conditions: [{ when: selected, value: { field: "category", fieldType: "nominal", scale: { id: "categories" } } }], otherwise: { field: "b" } }), /membership|layout|requires quantitative radius/);
  assert.equal(serializeProgram(base), saved);
  assert.equal(base.trace, trace);
});

test("conditional measured count radius retains its scale mapping and fieldless encoding", () => {
  const base = start([{ category: "A" }, { category: "A" }, { category: "B" }]).encodeTheta({ field: "category", fieldType: "nominal" });
  const value = { aggregate: "count", mapping: "area", scale: { id: "r" } };
  const original = base.encodeR(value);
  const program = original.encodeR({ conditions: [{ when: expression({ type: "literal", value: false }), value }], otherwise: value });
  assert.deepEqual(commands(program), commands(original));
  assert.equal(program.semanticSpec.layers[0].conditionals.radius.otherwise.field, undefined);
  assert.equal(program.resolvedScales.r.radialMapping, "area");
});

test("conditional proportional arcs preserve independent grouped radii and angular weights", () => {
  const rows = [{ category: "A", weight: 1, a: 4, b: 1, selected: true },
    { category: "A", weight: 2, a: 5, b: 1, selected: true },
    { category: "B", weight: 9, a: 4, b: 16, selected: false }];
  const base = start(rows).encodeTheta({ field: "category", aggregate: "sum", weight: "weight" })
    .encodeR({ field: "b", aggregate: "sum", scale: { type: "sqrt", domain: [0, 16], range: [0, 80], nice: false } });
  const program = base.encodeR({ conditions: [{ when: selected, value: { field: "a", aggregate: "sum" } }],
    otherwise: { field: "b", aggregate: "sum" } });
  assert.deepEqual(sectors(program).map(item => [item.geometry.startTheta, item.geometry.endTheta, item.geometry.outerRadius]), [[0, 90, 60], [90, 360, 80]]);
  const native = start(rows.map(row => ({ ...row, chosen: row.selected ? row.a : row.b })))
    .encodeTheta({ field: "category", aggregate: "sum", weight: "weight" })
    .encodeR({ field: "chosen", aggregate: "sum", scale: { type: "sqrt", domain: [0, 16], range: [0, 80], nice: false } });
  assert.deepEqual(commands(program), commands(native));
  assert.deepEqual(commands(deserializeProgram(serializeProgram(program))), commands(program));
});
