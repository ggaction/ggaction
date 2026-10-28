import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../src/index.js";
import { serializeProgram, deserializeProgram } from "../../../src/persistence.js";
import { getMarkItems } from "../../../src/inspection.js";

const expression = root => ({ version: 2, registry: "standard@1", root });
const literal = value => ({ type: "literal", value });
const field = name => ({ type: "field", name });
const positive = expression({ type: "binary", op: "gt", left: field("x"), right: literal(1) });
const values = [{ x: 1, y: 2 }, { x: 3, y: 4 }];
const base = () => chart().createCanvas({ width: 300, height: 200, margin: 20 })
  .createData({ id: "data", values }).createPointMark({ id: "points", data: "data" });
const coordinates = program => program.graphicSpec.objects.points.items.map(item => [item.properties.x, item.properties.y]);

test("conditional row positions map every selected branch through its own scale and retain zero datum", () => {
  const original = base().encodeY({ target: "points", field: "y", scale: { domain: [0, 10] } });
  const saved = serializeProgram(original);
  const program = original.encodeX({ target: "points", conditions: [
    { when: positive, value: { field: "x", scale: { domain: [0, 10] } } }
  ], otherwise: { datum: 0, scale: { domain: [0, 10] } } });
  assert.deepEqual(coordinates(program), [[20, 148], [98, 116]]);
  assert.equal(program.semanticSpec.layers[0].encoding.x, undefined);
  assert.deepEqual(getMarkItems(program, { target: "points" }).map(item => item.channels.x), [0, 3]);
  assert.equal(serializeProgram(original), saved);
  assert.equal(serializeProgram(deserializeProgram(serializeProgram(program))), serializeProgram(program));
});

test("conditional Cartesian positions complete in either authoring order and parameter edits rematerialize them", () => {
  const conditional = { target: "points", conditions: [{ when: expression({ type: "parameter", id: "enabled" }),
    value: { field: "x", scale: { id: "positionX", domain: [0, 10] } } }],
  otherwise: { datum: 0, scale: { id: "positionX", domain: [0, 10] } } };
  const start = base().createParameter({ id: "enabled", value: true });
  const first = start.encodeX(conditional).encodeY({ target: "points", field: "y", scale: { domain: [0, 10] } });
  const second = start.encodeY({ target: "points", field: "y", scale: { domain: [0, 10] } }).encodeX(conditional);
  assert.deepEqual(coordinates(first), coordinates(second));
  const changed = first.editParameter({ target: "enabled", value: false });
  assert.deepEqual(coordinates(changed), [[20, 148], [20, 116]]);
  assert.deepEqual(coordinates(first), [[46, 148], [98, 116]]);
});

test("inactive positional branches validate fields and coordinate families before committing", () => {
  const original = base().encodeY({ target: "points", field: "y" });
  const saved = serializeProgram(original);
  assert.throws(() => original.encodeX({ target: "points", conditions: [{ when: expression(literal(false)), value: { field: "missing" } }], otherwise: { field: "x" } }), /missing/);
  assert.throws(() => original.encodeTheta({ target: "points", conditions: [{ when: positive, value: { field: "x" } }], otherwise: { field: "x" } }), /cannot mix/);
  assert.equal(serializeProgram(original), saved);
});

test("conditional polar positions preserve angular mapping and radial units", () => {
  const program = chart().createCanvas({ width: 300, height: 200, margin: 20 })
    .createData({ id: "data", values: [{ theta: 0, r: 1 }, { theta: 90, r: 2 }] })
    .createPointMark({ id: "points", data: "data" })
    .encodeTheta({ target: "points", conditions: [{ when: expression(literal(true)), value: { field: "theta", scale: { domain: [0, 360], range: [0, 360] } } }],
      otherwise: { datum: 0, scale: { domain: [0, 360], range: [0, 360] } } })
    .encodeR({ target: "points", field: "r", scale: { domain: [0, 2], range: [0, 50] } });
  assert.deepEqual(coordinates(program), [[150, 75], [200, 100]]);
  assert.throws(() => program.encodeX({ target: "points", field: "r" }), /cannot mix/);
});

test("conditional row rules and ticks retain source item identities", () => {
  const start = chart().createCanvas({ width: 300, height: 200, margin: 20 }).createData({ id: "data", values });
  const position = { conditions: [{ when: positive, value: { field: "x", fieldType: "quantitative", scale: { domain: [0, 10] } } }],
    otherwise: { datum: 0, fieldType: "quantitative", scale: { domain: [0, 10] } } };
  const rules = start.createRuleMark({ id: "rules", data: "data" }).encodeX({ target: "rules", ...position });
  assert.deepEqual(rules.graphicSpec.objects.rules.items.map(item => [item.properties.x1, item.properties.x2]), [[20, 20], [98, 98]]);
  assert.equal(getMarkItems(rules, { target: "rules" }).length, 2);
  const ticks = start.createTickMark({ id: "ticks", data: "data" }).encodeX({ target: "ticks", ...position })
    .encodeY({ target: "ticks", field: "y", scale: { domain: [0, 10] } });
  assert.equal(getMarkItems(ticks, { target: "ticks" }).length, 2);
  assert.deepEqual(ticks.graphicSpec.objects.ticks.items.map(item => (item.properties.x1 + item.properties.x2) / 2), [20, 98]);
});

test("existing position guides reject ambiguous branches atomically and retain one exact binding", () => {
  const original = chart().createCanvas({ width: 400, height: 300, margin: 60 })
    .createData({ id: "data", values }).createScatterPlot({ id: "points", data: "data", x: "x", y: "y" });
  const saved = serializeProgram(original);
  assert.throws(() => original.encodeX({ target: "points", conditions: [{ when: positive, value: { field: "x" } }], otherwise: { field: "y" } }), /unique binding/);
  assert.equal(serializeProgram(original), saved);
  const value = { field: "x", scale: { id: "x" } };
  const program = original.encodeX({ target: "points", conditions: [{ when: positive, value }], otherwise: value });
  assert.equal(program.semanticSpec.guides.axis.x.title, "x");
  assert.deepEqual(program.graphicSpec.objects.xAxisLine, original.graphicSpec.objects.xAxisLine);
  assert.equal(serializeProgram(deserializeProgram(serializeProgram(program))), serializeProgram(program));
});

test("position guides can be authored after a unique conditional binding", () => {
  const value = { field: "x", scale: { id: "conditionalX" } };
  const program = base().editCanvas({ margin: 60 }).encodeX({ target: "points", conditions: [{ when: positive, value }], otherwise: value })
    .encodeY({ target: "points", field: "y" })
    .createAxes({ x: { title: false }, y: false });
  assert.equal(program.semanticSpec.guides.axis.x.scale, "conditionalX");
  assert.ok(program.graphicSpec.objects.xAxisTicks.items.length > 0);
});

test("conditional secondary endpoints share the primary scale and rematerialize rectangular spans", () => {
  const program = chart().createCanvas({ width: 300, height: 200, margin: 20 })
    .createData({ id: "data", values }).createRectMark({ id: "rects", data: "data" })
    .encodeX({ target: "rects", field: "x", scale: { id: "rectX", domain: [0, 10] } })
    .encodeX2({ target: "rects", conditions: [{ when: positive, value: { datum: 5 } }], otherwise: { datum: 6 } });
  assert.deepEqual(program.graphicSpec.objects.rects.items.map(item => [item.properties.x, item.properties.width]), [[46, 130], [98, 52]]);
  assert.equal(program.semanticSpec.layers[0].conditionals.x2.otherwise.scale, "rectX");
  assert.equal(getMarkItems(program, { target: "rects" }).length, 2);
  assert.equal(serializeProgram(deserializeProgram(serializeProgram(program))), serializeProgram(program));
});

test("conditional category offsets retain branch field and common parent slot semantics", () => {
  const program = chart().createCanvas({ width: 300, height: 200, margin: 20 })
    .createData({ id: "data", values: [{ x: "a", sub: "i", other: "ii", y: 2 }, { x: "b", sub: "ii", other: "i", y: 4 }] })
    .createPointMark({ id: "points", data: "data" })
    .encodeX({ target: "points", field: "x", fieldType: "nominal" }).encodeY({ target: "points", field: "y" })
    .encodeXOffset({ target: "points", conditions: [{ when: expression(literal(true)), value: { field: "sub", scale: { id: "offset" } } }],
      otherwise: { field: "other", scale: { id: "offset" } } });
  assert.deepEqual(coordinates(program), [[52.5, 180], [247.5, 20]]);
  assert.deepEqual(program.resolvedScales.offset.domain, ["i", "ii"]);
});

test("independent text positions use row conditions without changing text formatting", () => {
  const program = chart().createCanvas({ width: 300, height: 200, margin: 20 })
    .createData({ id: "data", values: values.map((row, index) => ({ ...row, label: index ? "second" : "first" })) })
    .createTextMark({ id: "text", data: "data" }).encodeText({ target: "text", field: "label" })
    .encodeX({ target: "text", conditions: [{ when: positive, value: { field: "x", scale: { domain: [0, 10] } } }], otherwise: { datum: 0, scale: { domain: [0, 10] } } })
    .encodeY({ target: "text", field: "y", scale: { domain: [0, 10] } });
  assert.deepEqual(program.graphicSpec.objects.text.items.map(item => [item.properties.x, item.properties.y, item.properties.text]), [[20, 148, "first"], [98, 116, "second"]]);
  assert.equal(getMarkItems(program, { target: "text" }).length, 2);
});

test("conditional line positions select values at each vertex and preserve path membership", () => {
  const program = chart().createCanvas({ width: 300, height: 200, margin: 20 })
    .createData({ id: "data", values: [{ x: 1, y: 2, z: 8 }, { x: 3, y: 4, z: 6 }] })
    .createLineMark({ id: "line", data: "data" })
    .encodeX({ target: "line", field: "x", scale: { domain: [0, 10] } })
    .encodeY({ target: "line", conditions: [{ when: positive, value: { field: "y", scale: { domain: [0, 10] } } }], otherwise: { field: "z", scale: { domain: [0, 10] } } });
  assert.deepEqual(program.graphicSpec.objects.line.items[0].properties.commands, [{ op: "M", x: 46, y: 52 }, { op: "L", x: 98, y: 116 }]);
  assert.equal(getMarkItems(program, { target: "line" }).length, 1);
  assert.equal(serializeProgram(deserializeProgram(serializeProgram(program))), serializeProgram(program));
});

test("conditional aggregate line positions use each complete vertex group and branch aggregate", () => {
  const start = chart().createCanvas({ width: 300, height: 200, margin: 20 })
    .createData({ id: "data", values: [{ x: 1, y: 2 }, { x: 1, y: 4 }, { x: 3, y: 3 }, { x: 3, y: 5 }] })
    .createLineMark({ id: "line", data: "data" });
  const conditional = { target: "line", conditions: [{ when: positive, value: { field: "y", aggregate: "sum", scale: { domain: [0, 10] } } }],
    otherwise: { field: "y", aggregate: "mean", scale: { domain: [0, 10] } } };
  const program = start.encodeY(conditional).encodeX({ target: "line", field: "x", scale: { domain: [0, 10] } });
  assert.deepEqual(program.graphicSpec.objects.line.items[0].properties.commands, [{ op: "M", x: 46, y: 132 }, { op: "L", x: 98, y: 52 }]);
  assert.deepEqual(getMarkItems(program, { target: "line" })[0].fields, {});
});

test("conditional line branches cannot silently reorder path topology", () => {
  const original = chart().createCanvas({ width: 300, height: 200, margin: 20 })
    .createData({ id: "data", values: [{ x: 1, reverse: 3, y: 2 }, { x: 3, reverse: 1, y: 4 }] })
    .createLineMark({ id: "line", data: "data" }).encodeX({ target: "line", field: "x" }).encodeY({ target: "line", field: "y" });
  const saved = serializeProgram(original);
  assert.throws(() => original.encodeX({ target: "line", conditions: [{ when: expression(literal(false)), value: { field: "reverse" } }], otherwise: { field: "x" } }), /vertex membership or order/);
  assert.equal(serializeProgram(original), saved);
});

test("conditional position missing skip uses all branch value fields once", () => {
  const program = chart().createCanvas({ width: 300, height: 200 })
    .createData({ values: [{ a: null, b: 2, y: 1 }, { a: 4, b: 8, y: 2 }, { a: 7, b: null, y: 3 }] })
    .createPointMark({ id: "points", missing: "skip" }).encodeY({ field: "y" })
    .encodeX({ conditions: [{ when: expression({ type: "literal", value: false }), value: { field: "a", scale: { id: "x" } } }],
      otherwise: { field: "b", scale: { id: "x" } } });
  assert.equal(program.graphicSpec.objects.points.items.length, 1);
  assert.deepEqual(getMarkItems(program, { target: "points" }).map(item => item.channels.x), [8]);
  assert.deepEqual(program.resolvedScales.x.domain, [4, 8]);
});
