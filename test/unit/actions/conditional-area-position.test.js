import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../src/index.js";
import { serializeProgram, deserializeProgram } from "../../../src/persistence.js";
import { getMarkItems } from "../../../src/inspection.js";

const expression = root => ({ version: 2, registry: "standard@1", root });
const enabled = expression({ type: "field", name: "selected" });
const commands = program => program.graphicSpec.objects.area.items.map(item => item.properties.commands);
const start = values => chart().createCanvas({ width: 300, height: 200, margin: 20 })
  .createData({ id: "data", values }).createAreaMark({ id: "area", data: "data" });
const conditional = { target: "area", conditions: [{ when: enabled, value: { field: "a", scale: { id: "measure", nice: false } } }],
  otherwise: { field: "b", scale: { id: "measure", nice: false } } };

test("conditional area endpoints evaluate each vertex and retain native path identity", () => {
  const rows = [{ x: 0, a: 2, b: 7, selected: true }, { x: 1, a: 3, b: 8, selected: false }];
  const base = start(rows).encodeX({ field: "x", scale: { domain: [0, 1] } })
    .encodeY({ field: "b", scale: { id: "measure", domain: [0, 10] } }).encodeY2({ datum: 0 });
  const saved = serializeProgram(base);
  const program = base.encodeY({ ...conditional, conditions: [{ when: enabled, value: { field: "a", scale: { id: "measure", domain: [0, 10] } } }], otherwise: { field: "b", scale: { id: "measure", domain: [0, 10] } } });
  assert.deepEqual(commands(program), [[{ op: "M", x: 20, y: 148 }, { op: "L", x: 280, y: 52 }, { op: "L", x: 280, y: 180 }, { op: "L", x: 20, y: 180 }, { op: "Z" }]]);
  assert.equal(getMarkItems(program, { target: "area" }).length, 1);
  assert.equal(serializeProgram(base), saved);
  assert.equal(serializeProgram(deserializeProgram(serializeProgram(program))), serializeProgram(program));
});

test("conditional stacked area uses mixed values before sums and automatic domains", () => {
  const rows = [
    { x: 0, group: "A", a: 10, b: 0, selected: true }, { x: 1, group: "A", a: 10, b: 0, selected: true },
    { x: 0, group: "B", a: 0, b: 10, selected: false }, { x: 1, group: "B", a: 0, b: 10, selected: false }
  ];
  const program = start(rows).encodeGroup({ field: "group" }).encodeX({ field: "x", scale: { nice: false } })
    .encodeY({ field: "b", scale: { id: "measure", nice: false } }).encodeY2({ datum: 0 }).layoutSeries({ mode: "stack" })
    .encodeY(conditional);
  assert.deepEqual(program.resolvedScales.measure.domain, [0, 20]);
  assert.deepEqual(commands(program).map(path => [...new Set(path.slice(0, -1).map(point => point.y))]), [[180, 100], [100, 20]]);
  const selectedRows = rows.map(row => ({ ...row, selectedValue: row.selected ? row.a : row.b }));
  const native = start(selectedRows).encodeGroup({ field: "group" }).encodeX({ field: "x", scale: { nice: false } })
    .encodeY({ field: "selectedValue", scale: { id: "measure", nice: false } }).encodeY2({ datum: 0 }).layoutSeries({ mode: "stack" });
  assert.deepEqual(commands(program), commands(native));
});

test("conditional area rejects inactive topology changes and permits alternate secondary fields", () => {
  const rows = [{ x: 0, reverse: 1, a: 2, b: 4, selected: true }, { x: 1, reverse: 0, a: 3, b: 6, selected: false }];
  const base = start(rows).encodeX({ field: "x" }).encodeY({ field: "a", scale: { id: "measure", domain: [0, 10] } }).encodeY2({ field: "b" });
  const saved = serializeProgram(base);
  assert.throws(() => base.encodeX({ conditions: [{ when: expression({ type: "literal", value: false }), value: { field: "reverse" } }], otherwise: { field: "x" } }), /membership or order/);
  assert.equal(serializeProgram(base), saved);
  const updated = base.encodeY2({ conditions: [{ when: enabled, value: { field: "b" } }], otherwise: { datum: 0 } });
  assert.deepEqual(commands(updated)[0].slice(2, 4).map(point => point.y), [180, 116]);
});

test("conditional centered area recomputes the common baseline after selecting each group's values", () => {
  const rows = [{ x: 0, group: "A", a: 2, b: 6, selected: true }, { x: 1, group: "A", a: 4, b: 6, selected: true },
    { x: 0, group: "B", a: 1, b: 8, selected: false }, { x: 1, group: "B", a: 2, b: 8, selected: false }];
  const base = start(rows).encodeGroup({ field: "group" }).encodeX({ field: "x" })
    .encodeY({ field: "b", stack: "center", scale: { id: "measure", nice: false } });
  const program = base.encodeY({ conditions: [{ when: enabled, value: { field: "a", stack: "center", scale: { id: "measure", nice: false } } }],
    otherwise: { field: "b", stack: "center", scale: { id: "measure", nice: false } } });
  const native = start(rows.map(row => ({ ...row, chosen: row.selected ? row.a : row.b }))).encodeGroup({ field: "group" })
    .encodeX({ field: "x" }).encodeY({ field: "chosen", stack: "center", scale: { id: "measure", domain: [-7, 7], nice: false } });
  assert.deepEqual(commands(program), commands(native));
  assert.deepEqual(program.resolvedScales.measure.domain, [-7, 7]);
});

test("conditional area preserves explicit missing gaps across every branch", () => {
  const rows = [0, 1, 2, 3, 4].map(x => ({ x, a: x === 2 ? null : 2, b: x === 2 ? null : 4, selected: x < 2 }));
  const base = start(rows).editAreaMark({ target: "area", missing: "break" }).encodeX({ field: "x" })
    .encodeY({ field: "b", scale: { id: "measure", nice: false } }).encodeY2({ datum: 0 });
  const program = base.encodeY(conditional);
  assert.equal(commands(program).length, 2);
  assert.deepEqual(commands(program).map(path => [...new Set(path.slice(0, -1).map(point => point.x))]), [[20, 85], [215, 280]]);
  assert.equal(getMarkItems(program, { target: "area" }).length, 1);
});

test("horizontal conditional ranges retain exact endpoints and row membership", () => {
  const rows = [{ y: 0, a: 2, b: 4, high: 8, selected: true }, { y: 1, a: 3, b: 6, high: 9, selected: false }];
  const base = start(rows).encodeY({ field: "y", scale: { domain: [0, 1] } })
    .encodeXRange({ lower: "b", upper: "high", scale: { id: "measure", domain: [0, 10] } });
  const program = base.encodeX({ conditions: [{ when: enabled, value: { field: "a", scale: { id: "measure", domain: [0, 10] } } }],
    otherwise: { field: "b", scale: { id: "measure", domain: [0, 10] } } });
  const native = start(rows.map(row => ({ ...row, chosen: row.selected ? row.a : row.b })))
    .encodeY({ field: "y", scale: { domain: [0, 1] } })
    .encodeXRange({ lower: "chosen", upper: "high", scale: { id: "measure", domain: [0, 10] } });
  assert.deepEqual(commands(program), commands(native));
  assert.deepEqual(commands(program)[0].slice(0, 2), [{ op: "M", x: 72, y: 180 }, { op: "L", x: 176, y: 20 }]);
  assert.deepEqual(getMarkItems(program, { target: "area" }).map(item => item.rows), getMarkItems(base, { target: "area" }).map(item => item.rows));
});

test("horizontal density conditional positions preserve both straight and curved baselines", () => {
  for (const curve of ["linear", "monotone"]) {
    const base = start([{ value: 1 }, { value: 2 }, { value: 3 }]).editAreaMark({ curve })
      .encodeDensity({ field: "value", densityChannel: "x", bandwidth: 1, steps: 8 });
    const layer = base.semanticSpec.layers[0];
    const value = { field: layer.encoding.x.field, scale: { id: layer.encoding.x.scale } };
    const program = base.encodeX({ conditions: [{ when: expression({ type: "literal", value: true }), value }], otherwise: value });
    assert.deepEqual(commands(program), commands(base));
    assert.equal(commands(program)[0].at(-1).op, "Z");
    assert.deepEqual(getMarkItems(program, { target: "area" }).map(item => item.rows), getMarkItems(base, { target: "area" }).map(item => item.rows));
  }
});

test("density area conditional scale choices use the native sample grid", () => {
  const base = start([{ value: 1 }, { value: 2 }, { value: 3 }]).encodeDensity({ field: "value", bandwidth: 1, steps: 8 });
  const layer = base.semanticSpec.layers[0];
  const x = { field: layer.encoding.x.field, scale: { id: layer.encoding.x.scale } };
  const program = base.encodeX({ conditions: [{ when: expression({ type: "literal", value: true }), value: x }], otherwise: x });
  assert.deepEqual(commands(program), commands(base));
  assert.equal(getMarkItems(program, { target: "area" }).length, 1);
});

test("categorical density positions preserve native width and sample geometry", () => {
  const base = chart().createCanvas({ width: 300, height: 200, margin: 20 })
    .createData({ values: [{ category: "A", value: 1 }, { category: "A", value: 2 }, { category: "B", value: 3 }, { category: "B", value: 4 }] })
    .createViolinPlot({ id: "area", x: "category", y: "value", density: { bandwidth: 1, steps: 8 }, guides: false });
  const layer = base.semanticSpec.layers[0];
  const x = { field: layer.encoding.x.field, fieldType: "nominal", scale: { id: layer.encoding.x.scale } };
  const y = { field: layer.encoding.y.field, scale: { id: layer.encoding.y.scale } };
  const program = base.encodeX({ conditions: [{ when: expression({ type: "literal", value: true }), value: x }], otherwise: x })
    .encodeY({ conditions: [{ when: expression({ type: "literal", value: true }), value: y }], otherwise: y });
  assert.deepEqual(commands(program), commands(base));
  assert.equal(getMarkItems(program, { target: "area" }).length, 2);
  assert.equal(serializeProgram(deserializeProgram(serializeProgram(program))), serializeProgram(program));
});
