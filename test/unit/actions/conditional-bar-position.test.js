import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../src/index.js";
import { getMarkItems } from "../../../src/inspection.js";
import { serializeProgram, deserializeProgram } from "../../../src/persistence.js";

const expression = root => ({ version: 2, registry: "standard@1", root });
const selected = expression({ type: "field", name: "selected" });
const start = (values, options = {}) => chart().createCanvas({ width: 300, height: 200, margin: 20 })
  .createData({ id: "data", values }).createBarMark({ id: "bars", data: "data", ...options });
const rectangles = program => program.graphicSpec.objects.bars.items.map(item => item.properties);
const conditional = { conditions: [{ when: selected, value: { field: "a", aggregate: "sum", scale: { id: "measure", nice: false } } }],
  otherwise: { field: "b", aggregate: "sum", scale: { id: "measure", nice: false } } };

test("conditional aggregate bars select complete cell values before stacking and domain resolution", () => {
  const rows = [{ category: "one", group: "A", a: 10, b: 0, selected: true }, { category: "one", group: "B", a: 0, b: 10, selected: false }];
  const base = start(rows).encodeGroup({ field: "group" }).encodeX({ field: "category", fieldType: "nominal" })
    .encodeY({ field: "b", aggregate: "sum", scale: { id: "measure", nice: false } }).layoutSeries({ mode: "stack" });
  const saved = serializeProgram(base);
  const program = base.encodeY(conditional);
  assert.deepEqual(program.resolvedScales.measure.domain, [0, 20]);
  assert.deepEqual(rectangles(program).map(rect => [rect.y, rect.height]), [[100, 80], [20, 80]]);
  assert.equal(getMarkItems(program, { target: "bars" }).length, 2);
  assert.equal(serializeProgram(base), saved);
  assert.equal(serializeProgram(deserializeProgram(serializeProgram(program))), serializeProgram(program));
});

test("conditional bar aggregate functions are evaluated at each final cell", () => {
  const rows = [{ category: "one", a: 2, b: 3, selected: true }, { category: "one", a: 4, b: 5, selected: true }, { category: "two", a: 1, b: 10, selected: false }];
  const base = start(rows).encodeX({ field: "category", fieldType: "nominal" }).encodeY({ field: "b", aggregate: "sum", scale: { id: "measure", domain: [0, 10] } });
  const program = base.encodeY({ conditions: [{ when: selected, value: { field: "a", aggregate: "mean", scale: { id: "measure", domain: [0, 10] } } }],
    otherwise: { field: "b", aggregate: "sum", scale: { id: "measure", domain: [0, 10] } } });
  assert.deepEqual(rectangles(program).map(rect => rect.height), [48, 160]);
});

test("conditional ranged and numeric-center bars preserve native endpoint and width meanings", () => {
  const rows = [{ category: "one", center: 1, a: 2, b: 6, selected: true }, { category: "two", center: 3, a: 4, b: 8, selected: false }];
  const range = start(rows).encodeX({ field: "category", fieldType: "nominal" })
    .encodeY({ field: "a", scale: { id: "measure", domain: [0, 10] } }).encodeY2({ field: "b" })
    .encodeY2({ conditions: [{ when: selected, value: { field: "a" } }], otherwise: { field: "b" } });
  assert.deepEqual(rectangles(range).map(rect => rect.height), [0, 64]);
  const centered = start(rows, { orientation: "vertical" })
    .encodeX({ field: "center", scale: { id: "center", domain: [0, 10] } })
    .encodeY({ field: "a", scale: { id: "measure", domain: [0, 10] } })
    .encodeY({ conditions: [{ when: selected, value: { field: "a", scale: { id: "measure", domain: [0, 10] } } }], otherwise: { field: "b", scale: { id: "measure", domain: [0, 10] } } });
  assert.deepEqual(rectangles(centered).map(rect => [rect.width, rect.height]), [[5, 32], [5, 128]]);
});

test("conditional histogram measures aggregate each occupied bin before mixed stacking", () => {
  const rows = [{ x: 1, group: "A", a: 10, b: 0, selected: true }, { x: 1, group: "B", a: 0, b: 10, selected: false },
    { x: 3, group: "A", a: 2, b: 0, selected: true }, { x: 3, group: "B", a: 0, b: 4, selected: false }];
  const base = start(rows).encodeGroup({ field: "group" }).encodeX({ field: "x", bin: { boundaries: [0, 2, 4] } })
    .encodeY({ field: "b", aggregate: "sum", scale: { id: "measure", nice: false } }).layoutSeries({ mode: "stack" });
  const program = base.encodeY(conditional);
  assert.deepEqual(program.resolvedScales.measure.domain, [0, 20]);
  assert.deepEqual(rectangles(program).map(rect => [rect.y, rect.height]), [[100, 80], [20, 80], [164, 16], [132, 32]]);
  assert.deepEqual(getMarkItems(program, { target: "bars" }).map(item => [item.channels.x, item.channels.x2, item.channels.y, item.channels.y2]), [[0, 2, 0, 10], [0, 2, 10, 20], [2, 4, 0, 2], [2, 4, 2, 6]]);
});

test("conditional histogram bins retain membership, empty bins and branch scale mapping", () => {
  const rows = [{ x: 1, selected: true }, { x: 5, selected: false }];
  const base = start(rows).encodeX({ field: "x", bin: { boundaries: [0, 2, 4, 6] }, scale: { id: "position", domain: [0, 6] } })
    .encodeY({ field: "x", aggregate: "count", scale: { id: "measure", nice: false } });
  const binding = { field: "x", bin: { boundaries: [0, 2, 4, 6] }, scale: { id: "position", domain: [0, 6] } };
  const program = base.encodeX({ conditions: [{ when: selected, value: binding }], otherwise: binding });
  assert.deepEqual(rectangles(program), rectangles(base));
  assert.equal(rectangles(program).length, 2);
  const saved = serializeProgram(program);
  assert.throws(() => program.encodeX({ conditions: [{ when: expression({ type: "literal", value: false }), value: { field: "x", bin: { boundaries: [0, 3, 6] } } }], otherwise: binding }), /cell membership|topology/);
  assert.equal(serializeProgram(program), saved);
});

test("bar selection predicates use source cells even when an ordinary zero measure hid a cell", () => {
  const rows = [{ category: "one", group: "A", a: 10, b: 0 }, { category: "one", group: "B", a: 0, b: 10 }];
  const base = start(rows).encodeGroup({ field: "group" }).encodeX({ field: "category", fieldType: "nominal" })
    .encodeY({ field: "b", aggregate: "sum", scale: { id: "measure", nice: false } }).layoutSeries({ mode: "stack" })
    .selectMarks({ id: "chosen", target: "bars", field: "group", op: "eq", value: "A" });
  const program = base.encodeY({ ...conditional, conditions: [{ ...conditional.conditions[0], when: { selection: "chosen" } }] });
  assert.deepEqual(rectangles(program).map(rect => rect.height), [80, 80]);
  const changed = program.editMarkSelection({ selection: "chosen", field: "group", op: "eq", value: "B" });
  assert.equal(rectangles(changed).length, 0);
});

test("conditional raw bar inspection reports chosen semantic endpoints", () => {
  const rows = [{ category: "one", center: 1, a: 2, b: 6, selected: true }, { category: "two", center: 3, a: 4, b: 8, selected: false }];
  const ranged = start(rows).encodeX({ field: "category", fieldType: "nominal" })
    .encodeY({ field: "a" }).encodeY2({ field: "b" })
    .encodeY2({ conditions: [{ when: selected, value: { field: "a" } }], otherwise: { field: "b" } });
  assert.deepEqual(getMarkItems(ranged, { target: "bars" }).map(item => [item.channels.y, item.channels.y2]), [[2, 2], [4, 8]]);
  const centered = start(rows, { orientation: "vertical" }).encodeX({ field: "center" }).encodeY({ field: "b" })
    .encodeY({ conditions: [{ when: selected, value: { field: "a" } }], otherwise: { field: "b" } });
  assert.deepEqual(getMarkItems(centered, { target: "bars" }).map(item => [item.channels.y, item.channels.y2]), [[0, 2], [0, 8]]);
});

test("layout changes after conditional measures preserve the sole binding and native stack values", () => {
  const rows = [{ category: "one", group: "A", a: 10, b: 0, selected: true }, { category: "one", group: "B", a: 0, b: 10, selected: false }];
  const base = start(rows).encodeGroup({ field: "group" }).encodeX({ field: "category", fieldType: "nominal" })
    .encodeY({ field: "b", aggregate: "sum", scale: { id: "measure", nice: false } });
  const before = base.encodeY(conditional);
  const stacked = before.layoutSeries({ mode: "stack" });
  assert.deepEqual(rectangles(stacked), rectangles(base.layoutSeries({ mode: "stack" }).encodeY(conditional)));
  assert.equal(stacked.semanticSpec.layers[0].encoding.y, undefined);
  assert.deepEqual(stacked.resolvedScales.measure.domain, [0, 20]);
  const grouped = stacked.layoutSeries({ mode: "group" });
  assert.notEqual(rectangles(grouped)[0].x, rectangles(grouped)[1].x);
  assert.deepEqual(rectangles(grouped).map(rect => rect.height), [160, 160]);
  const filled = grouped.layoutSeries({ mode: "fill" });
  assert.deepEqual(filled.resolvedScales.measure.domain, [0, 1]);
  assert.deepEqual(rectangles(filled).map(rect => rect.height), [80, 80]);
});

test("conditional histogram measures retain native raw extent before step bin expansion", () => {
  const base = start([1, 2, 3, 4].map(x => ({ x }))).encodeX({ field: "x", bin: { step: 0.7 }, scale: { domain: "auto", zero: false, reverse: true, nice: false } })
    .encodeY({ field: "x", aggregate: "count", stack: "normalize" });
  const value = { field: "x", aggregate: "count", stack: "normalize" };
  const program = base.encodeY({ conditions: [{ when: expression({ type: "literal", value: false }), value }], otherwise: value });
  assert.deepEqual(program.resolvedScales.x, base.resolvedScales.x);
  assert.deepEqual(rectangles(program), rectangles(base));
});

test("conditional group offsets preserve normalized native padding on reassignment", () => {
  const base = start([{ category: "one", group: "A", value: 1 }, { category: "one", group: "B", value: 2 }])
    .encodeX({ field: "category", fieldType: "nominal" }).encodeY({ field: "value", aggregate: "sum" });
  const value = { field: "group", fieldType: "nominal", scale: { id: "offset", type: "ordinal", padding: 0.08 } };
  const original = base.encodeXOffset(value);
  assert.deepEqual(rectangles(original.encodeXOffset(value)), rectangles(original));
  const program = original.encodeXOffset({ conditions: [{ when: expression({ type: "literal", value: false }), value }], otherwise: value });
  assert.deepEqual(rectangles(program), rectangles(original));
  assert.deepEqual(program.resolvedScales.offset, original.resolvedScales.offset);
});

test("conditional aggregate bars retain native categorical encounter order for numeric strings", () => {
  const program = start([{ category: "6", x: 5 }, { category: "1", x: 8 }, { category: "6", x: 7 }, { category: "1", x: 12 }])
    .encodeY({ field: "category", fieldType: "nominal", scale: { id: "category", type: "band" } });
  const value = { field: "x", fieldType: "quantitative", aggregate: { op: "ciLower", method: "normal", level: 0.9 }, stack: null,
    scale: { id: "x", type: "linear", nice: false, zero: false } };
  const original = program.encodeX(value);
  const conditional = original.encodeX({ conditions: [{ when: expression({ type: "literal", value: false }), value }], otherwise: value });
  assert.deepEqual(conditional.graphicSpec.objects.bars.items, original.graphicSpec.objects.bars.items);
  assert.deepEqual(getMarkItems(conditional, { target: "bars" }).map(item => item.channels.y), ["6", "1"]);
});
