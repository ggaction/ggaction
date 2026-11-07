import test from "node:test";
import assert from "node:assert/strict";
import { cloneAndFreeze, freezeOwned, isOwned } from "../../../src/core/immutable.js";
import { createGeometryBudget, snapshotGeometryJSON } from "../../../src/grammar/geo/input.js";

const snapshot = (value, limits) => snapshotGeometryJSON(value, createGeometryBudget(limits));
const diagnostics = (values, work) => ({ features: 0, positions: 0, arcs: 0, values, work });

test("JSON snapshots reuse exact owned trees after the complete original accounting", () => {
  for (const value of [[], {}, [1, [2]], { a: { b: [-0, 1] }, z: "hello" }, JSON.parse('{"__proto__":{"safe":1}}')]) {
    const owned = cloneAndFreeze(value), a = createGeometryBudget(), b = createGeometryBudget();
    const copied = snapshotGeometryJSON(value, a), reused = snapshotGeometryJSON(owned, b);
    assert.equal(reused, owned); assert.notEqual(copied, value);
    assert.deepEqual(reused, copied); assert.deepEqual(b.diagnostics(), a.diagnostics());
    assert.ok(isOwned(reused));
  }
  const budget = createGeometryBudget();
  const value = cloneAndFreeze({ a: { b: [-0, 1] }, z: "hello" });
  assert.equal(snapshotGeometryJSON(value, budget), value);
  assert.deepEqual(budget.diagnostics(), diagnostics(6, 21));
  assert.ok(Object.is(value.a.b[0], -0));
  for (const value of [null, true, 0, -0, ""]) assert.ok(Object.is(snapshot(value), value));
});

test("JSON snapshots retain caller isolation and distinct alias copies", () => {
  const mutable = { x: [1] }, shallow = freezeOwned({ mutable });
  const result = snapshot(shallow); assert.notEqual(result, shallow);
  mutable.x[0] = 9; assert.equal(result.mutable.x[0], 1);
  const frozen = Object.freeze({ child: Object.freeze([1]) });
  assert.notEqual(snapshot(frozen), frozen);
  for (const child of [{ a: [1] }, cloneAndFreeze({ a: [1] })]) {
    const parent = freezeOwned({ x: child, y: child }), result = snapshot(parent);
    assert.notEqual(result, parent); assert.notEqual(result.x, result.y);
    assert.notEqual(result.x.a, result.y.a);
    assert.ok(isOwned(result.x.a)); assert.deepEqual(result, parent);
  }
  const nullRecord = freezeOwned(Object.assign(Object.create(null), { x: 1 }));
  assert.equal(Object.getPrototypeOf(snapshot(nullRecord)), Object.prototype);
  const nested = freezeOwned({ child: nullRecord }), result2 = snapshot(nested);
  assert.notEqual(result2, nested); assert.equal(Object.getPrototypeOf(result2.child), Object.prototype);
});

test("JSON ownership never bypasses descriptors, cycles, value checks or error accounting", () => {
  let reads = 0;
  const getter = {}; Object.defineProperty(getter, "x", { enumerable: true, get() { reads++; return 1; } });
  const cycle = {}; cycle.x = cycle;
  const cases = [
    [getter, TypeError, "Geometry JSON object requires enumerable own data properties; accessors are not supported.", 1, 1],
    [cycle, TypeError, "Geometry source cannot contain cycles.", 2, 4],
    [new Array(2), TypeError, "Geometry JSON array must be dense.", 1, 1],
    [Object.assign([1], { extra: 2 }), TypeError, "Geometry JSON array cannot contain extra properties.", 1, 1],
    [{ x: NaN }, TypeError, "Geometry source requires finite JSON values.", 2, 4],
    [{ x: undefined }, TypeError, "Geometry source requires finite JSON values.", 2, 4],
    [{ [Symbol("bad")]: 1 }, TypeError, "Geometry JSON object requires enumerable own data properties; accessors are not supported.", 1, 1],
    [Object.defineProperty({}, "x", { value: 1 }), TypeError, "Geometry JSON object requires enumerable own data properties; accessors are not supported.", 1, 1]
  ];
  for (const [value, ctor, message, values, work] of cases) {
    const budget = createGeometryBudget();
    assert.throws(() => snapshotGeometryJSON(freezeOwned(value), budget), { name: ctor.name, message });
    assert.deepEqual(budget.diagnostics(), diagnostics(values, work));
  }
  assert.equal(reads, 0);
});

test("JSON owned trees retain depth, values and exact work failure boundaries", () => {
  const depth = createGeometryBudget({ maxDepth: 1 });
  assert.throws(() => snapshotGeometryJSON(cloneAndFreeze({ a: { b: 1 } }), depth), { name: "RangeError", message: "Geometry JSON nesting exceeds maxDepth." });
  assert.deepEqual(depth.diagnostics(), diagnostics(3, 7));
  const values = createGeometryBudget({ maxValues: 2 });
  assert.throws(() => snapshotGeometryJSON(cloneAndFreeze([1, 2]), values), { name: "RangeError", message: "Geometry values must not exceed 2." });
  assert.deepEqual(values.diagnostics(), diagnostics(3, 6));
  for (const limit of [0, 1, 2, 3, 4, 5, 6, 7]) {
    const results = [];
    for (const input of [{ a: [1] }, cloneAndFreeze({ a: [1] })]) {
      const original = createGeometryBudget(), budget = { ...original, charge(amount = 1) {
        original.charge(amount);
        if (original.diagnostics().work > limit) throw new RangeError("Exact test work boundary.");
      } };
      if (limit < 7) assert.throws(() => snapshotGeometryJSON(input, budget), { name: "RangeError", message: "Exact test work boundary." });
      else assert.deepEqual(snapshotGeometryJSON(input, budget), input);
      results.push(original.diagnostics());
    }
    assert.deepEqual(results[0], results[1]);
  }
});
