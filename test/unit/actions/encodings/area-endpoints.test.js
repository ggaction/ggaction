import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { assertAtomicFailures } from "../../../support/program-state.js";
import { resolveAreaItems } from "../../../../src/materialization/selection/items/path.js";

const rows = [{ x: 1, value: 2 }, { x: 2, value: 4 }, { x: 3, value: 3 }];
function base(values = rows, missing = "error") {
  return chart().createCanvas({ width: 1000, height: 700, margin: 150 })
    .createData({ id: "data", values }).createAreaMark({ id: "area", missing });
}
const layer = program => program.semanticSpec.layers[0];
const paths = program => program.graphicSpec.objects.area.items.map(item => item.properties.commands);

test("constant endpoints use raw values without adding source fields", () => {
  const before = base().encodeX({ field: "x" });
  const result = before.encodeYRange({ lower: "value", upper: { datum: 0 } });
  assert.deepEqual(result.semanticSpec.datasets[0].values, rows);
  assert.deepEqual(layer(result).encoding.y2, { datum: 0, fieldType: "quantitative", scale: "y" });
  assert.deepEqual(result.resolvedScales.y.domain, [0, 4]);
  assert.deepEqual(paths(result)[0], [
    { op: "M", x: 150, y: 350 }, { op: "L", x: 500, y: 150 }, { op: "L", x: 850, y: 250 },
    { op: "L", x: 850, y: 550 }, { op: "L", x: 500, y: 550 }, { op: "L", x: 150, y: 550 }, { op: "Z" }
  ]);
  assert.equal(before.graphicSpec.objects.area.items.length, 0);
  const changed = result.encodeY2({ datum: 1 });
  assert.deepEqual(changed.resolvedScales.y.domain, [1, 4]);
  assert.equal(layer(result).encoding.y2.datum, 0);
  assert.equal(changed.editCanvas({ width: 1200 }).graphicSpec.objects.area.items[0].properties.commands[2].x, 1050);
});

test("range preflight accepts a final log pair despite the old zero baseline", () => {
  const before = base().encodeX({ field: "x" }).encodeYRange({ lower: "value", upper: { datum: 0 } });
  const result = before.encodeYRange({ lower: { datum: 1 }, upper: "value", scale: { type: "log", nice: false } });
  assert.deepEqual(result.resolvedScales.y.domain, [1, 4]);
  assert.deepEqual(layer(result).encoding.y, { datum: 1, fieldType: "quantitative", scale: "y" });
  assert.equal(layer(result).encoding.y2.field, "value");
  assert.equal(result.resolvedScales.y.type, "log");
  assert.equal(before.resolvedScales.y.type, "linear");
  assert.equal(result.createGuides().semanticSpec.guides.axis.y.title, "value");
  const next = result.encodeYRange({ lower: "value", upper: { datum: -2 }, scale: { type: "linear", nice: false } });
  assert.deepEqual(next.resolvedScales.y.domain, [-2, 4]);
});

test("horizontal log endpoints map each boundary on the value axis", () => {
  const result = base().encodeY({ field: "x" }).encodeXRange({ lower: "value", upper: { datum: 1 }, scale: { type: "log", nice: false } });
  assert.deepEqual(result.resolvedScales.x.domain, [1, 4]);
  const commands = paths(result)[0];
  assert.equal(commands[0].x, 500); assert.equal(commands[1].x, 850);
  assert.ok(Math.abs(commands[2].x - 704.7368752524047) < 1e-10);
  assert.deepEqual(commands.slice(3, 6).map(p => p.x), [150, 150, 150]);
});

test("break segments preserve source identity, nulls and shared strict consumers", () => {
  const input = [{ x: 0, value: 2 }, { x: 1, value: 3 }, { x: 2, value: null }, { x: 3, value: 4 }, { x: 4, value: 2 }];
  const before = base(input, "break").encodeX({ field: "x" });
  const result = before.encodeYRange({ lower: "value", upper: { datum: 0 } });
  assert.equal(paths(result).length, 2);
  assert.deepEqual(paths(result).map(path => [...new Set(path.slice(0, -1).map(p => p.x))]), [[150, 325], [675, 850]]);
  assert.deepEqual(result.semanticSpec.datasets[0].values, input);
  const items = resolveAreaItems(result, layer(result), result.semanticSpec.datasets[0]);
  assert.deepEqual(items.map(item => item.members.map(row => row.x)), [[0, 1], [3, 4]]);
  assertAtomicFailures(result, [
    { operation: () => result.editAreaMark({ missing: "error" }) },
    { operation: () => result.createPointMark({ id: "strict", data: "data" }).encodeX({ field: "x" }).encodeY({ field: "value" }) }
  ]);
  const finite = base().encodeX({ field: "x" }).encodeYRange({ lower: "value", upper: { datum: 0 } });
  assert.deepEqual(paths(finite.editAreaMark({ missing: "break" }).editAreaMark({ missing: "error" })), paths(finite));
});

test("invalid endpoints and missing policies reject without changing any program state", () => {
  const before = base().encodeX({ field: "x" });
  const invalid = [
    { lower: { datum: 1 }, upper: { datum: 2 } },
    { lower: { datum: NaN }, upper: "value" },
    { lower: { datum: 0, field: "value" }, upper: "value" },
    { lower: "value", upper: { datum: 0 }, scale: { type: "log" } },
    { lower: "missing", upper: { datum: 0 } },
    { lower: "value", upper: { datum: 0 }, fieldType: "temporal" }
  ];
  assertAtomicFailures(before, invalid.map(options => ({ operation: () => before.encodeYRange(options), inputs: [options] })));
  assertAtomicFailures(before, [
    { operation: () => before.encodeY({ datum: 0, field: "value" }) },
    { operation: () => before.encodeY({ datum: 0, aggregate: "sum" }) },
    { operation: () => before.editAreaMark({ missing: "skip" }) }
  ]);
  for (const value of [NaN, Infinity, "3"]) {
    assert.throws(() => base([{ x: 0, value }, { x: 1, value: 1 }], "break").encodeX({ field: "x" }).encodeYRange({ lower: "value", upper: { datum: 0 } }));
  }
  assert.throws(() => base([{ x: 0, value: 1 }, { x: 1, value: null }, { x: 2, value: 2 }], "break")
    .encodeX({ field: "x" }).encodeYRange({ lower: "value", upper: { datum: 0 } }), /valid segment/);
  assert.throws(() => base([{ x: null, value: 1 }, { x: 1, value: 2 }], "break")
    .encodeX({ field: "x" }).encodeYRange({ lower: "value", upper: { datum: 0 } }), /finite number/);
});
