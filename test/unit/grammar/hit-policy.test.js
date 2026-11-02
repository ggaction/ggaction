import assert from "node:assert/strict";
import test from "node:test";
import { normalizeHitPreparation, MAX_HIT_INDEX_ITEMS, MAX_HIT_INDEX_WORK, MAX_HIT_QUERY_WORK } from "../../../src/grammar/hitPolicy.js";

test("preparation defaults and independent query and entry limits retain their literal bounds", () => {
  const expected = { maxSceneNodes: 100000, maxWork: 10000000 };
  for (const input of [undefined, {}, { maxSceneNodes: undefined }, { maxWork: undefined }, Object.create(null)]) {
    assert.deepEqual(normalizeHitPreparation(input), expected);
  }
  assert.equal(MAX_HIT_INDEX_ITEMS, 100000);
  assert.equal(MAX_HIT_INDEX_WORK, 10000000);
  assert.equal(MAX_HIT_QUERY_WORK, 2000000);
  assert.deepEqual(normalizeHitPreparation({ maxSceneNodes: 1, maxWork: 1 }), { maxSceneNodes: 1, maxWork: 1 });
  assert.deepEqual(normalizeHitPreparation({ maxSceneNodes: 200000, maxWork: 128000000 }), { maxSceneNodes: 200000, maxWork: 128000000 });
});

test("normalization isolates caller options and retains each explicit independent bound", () => {
  const input = { maxSceneNodes: 100001, maxWork: 128000000 }, result = normalizeHitPreparation(input);
  input.maxWork = 1;
  assert.deepEqual(result, { maxSceneNodes: 100001, maxWork: 128000000 });
  assert.ok(Object.isFrozen(result)); assert.ok(!Object.isFrozen(input));
  assert.deepEqual(normalizeHitPreparation({ maxWork: 128000000 }), { maxSceneNodes: 100000, maxWork: 128000000 });
  assert.deepEqual(normalizeHitPreparation({ maxSceneNodes: 200000 }), { maxSceneNodes: 200000, maxWork: 10000000 });
});

test("preparation limits reject zero, fractional, nonnumeric, unsafe and over-bound values", () => {
  for (const key of ["maxSceneNodes", "maxWork"]) {
    for (const value of [null, false, "1", 0, -0, -1, 1.5, NaN, Infinity, -Infinity, Number.MAX_SAFE_INTEGER + 1, 1n]) {
      assert.throws(() => normalizeHitPreparation({ [key]: value }), RangeError);
    }
  }
  assert.throws(() => normalizeHitPreparation({ maxSceneNodes: 200001 }), /maxSceneNodes/);
  assert.throws(() => normalizeHitPreparation({ maxWork: 128000001 }), /maxWork/);
});

test("closed options reject executable, inherited-record and hidden own properties without reading accessors", () => {
  let calls = 0;
  for (const input of [null, [], 1, "policy", () => {}, new Date(), Object.create({ maxWork: 1 }), { extra: true }, { [Symbol("work")]: 1 },
    Object.defineProperty({}, "maxWork", { value: 1 }), Object.defineProperty({}, "maxWork", { enumerable: true, get() { calls++; return 1; } })]) {
    assert.throws(() => normalizeHitPreparation(input), TypeError);
  }
  assert.equal(calls, 0);
});

test("omitted optional limits never read inherited getters", () => {
  let calls = 0;
  for (const key of ["maxSceneNodes", "maxWork"]) Object.defineProperty(Object.prototype, key, {
    configurable: true, get() { calls++; throw new Error("Inherited policy access"); }
  });
  try {
    assert.deepEqual(normalizeHitPreparation({}), { maxSceneNodes: 100000, maxWork: 10000000 });
    assert.deepEqual(normalizeHitPreparation({ maxSceneNodes: undefined, maxWork: undefined }), { maxSceneNodes: 100000, maxWork: 10000000 });
  } finally {
    delete Object.prototype.maxSceneNodes; delete Object.prototype.maxWork;
  }
  assert.equal(calls, 0);
});
