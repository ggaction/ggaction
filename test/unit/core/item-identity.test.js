import assert from "node:assert/strict";
import test from "node:test";
import {
  allocateRowKeys, compareRowKeys, createSourceIdentity, encodeRowKey,
  reviseSourceIdentity, validateSourceIdentity
} from "../../../src/core/itemIdentity.js";
import { getErrorDetails } from "../../../src/diagnostics.js";
import { compareReferenceKeys, referenceAllocation, referenceKey } from "../../oracles/identity.js";

const namespaces = { logicalId: "logical-a", allocationId: "snapshot-a" };
const rows = [{ id: "a", value: 1 }, { id: "b", value: 2 }];
const source = (options = {}, values = rows) => ({ values, ...createSourceIdentity(values, options, namespaces) });

test("production key equivalence and ordering agree with the independent typed reference", () => {
  const keys = [false, true, -3, -0, 0, 1, 10, -4n, 0n, 1n, 100n, "", "1", "10", "2", "Z", "a",
    "__proto__", "a|b", "\uD800", "\uD83D\uDE00", "\uE000", new Date(-1), new Date(0),
    new Date("1970-01-01T01:00:00+01:00"), [false], [0], [1], [1, "a"], ["a"], ["a", ""],
    ["a|b", "c"], ["a", "b|c"], ["a", "b", "c"], ["1", 1n]];
  for (const a of keys) for (const b of keys) {
    assert.equal(encodeRowKey(a) === encodeRowKey(b), referenceKey(a) === referenceKey(b));
    assert.equal(Math.sign(compareRowKeys(a, b)), Math.sign(compareReferenceKeys(a, b)));
  }
  assert.deepEqual([...keys].sort(compareRowKeys), [...keys].sort(compareReferenceKeys));
});

test("invalid key shapes fail without evaluating getters or disclosing contents", () => {
  let reads = 0;
  const accessor = Object.defineProperty([0], "0", { get() { reads++; return 1; } });
  const named = [1]; named.extra = "private-value";
  const symbolic = [1]; symbolic[Symbol()] = 2;
  for (const key of [undefined, null, NaN, Infinity, -Infinity, {}, /x/, new Number(1), new Date(NaN),
    [], Array(1), [[1]], [undefined], Array(65).fill(0), accessor, named, symbolic]) {
    assert.throws(() => encodeRowKey(key));
    assert.throws(() => compareRowKeys(key, "valid"));
  }
  assert.equal(reads, 0);
  assert.doesNotThrow(() => encodeRowKey(Array(64).fill(0)));
  assert.throws(() => source({ keys: ["private-value", "private-value"] }), error => {
    assert.equal(getErrorDetails(error).code, "ambiguous-identity");
    assert.equal(error.message.includes("private-value"), false);
    return true;
  });
});

test("field, tuple and explicit keys survive reordering and copy all caller-owned input", () => {
  for (const options of [{ keyField: "id" }, { keyFields: ["id"] }, { keys: ["a", "b"] }]) {
    const before = source(options);
    const values = [{ id: "b", value: 9 }, { id: "a", value: 1 }];
    const next = reviseSourceIdentity(before, values, options.keys ? { keys: ["b", "a"] } : {}, "snapshot-b");
    assert.deepEqual(next.rowKeys, [...before.rowKeys].reverse());
    assert.equal(next.logicalId, before.logicalId);
    assert.equal(next.revision, 1);
    assert.equal(next.allocationId, "snapshot-b");
    assert.equal(Object.isFrozen(next.rowKeys), true);
    validateSourceIdentity({ values, ...next });
  }
  const keyFields = ["id"], keyed = source({ keyFields }); keyFields.push("value");
  assert.deepEqual(keyed.keySpec.fields, ["id"]);
  const date = new Date(1), tuple = [date, 1n];
  const dated = source({ keys: [tuple] }, [{}]);
  date.setTime(3); tuple.push("changed");
  assert.equal(dated.rowKeys[0], encodeRowKey([new Date(1), 1n]));
  assert.doesNotThrow(() => JSON.stringify(dated));
});

test("key sources reject ambiguity, duplicate typed keys, missing fields and invalid revisions", () => {
  for (const options of [{ keyField: "id", keys: [] }, { keyField: "" }, { keyFields: [] },
    { keyFields: ["id", "id"] }, { keyFields: Array(1) }, { keyField: "missing" },
    { keyField: "id", keyFields: ["id"] }, { keys: [] }, { keys: [0, -0] },
    { keys: [new Date(0), new Date(0)] }, { keys: Array(2) }]) assert.throws(() => source(options));
  assert.throws(() => source({ keyField: "id" }, [{ id: [1] }]));
  assert.doesNotThrow(() => source({ keyField: "id" }, [{ id: "" }]));
  const inherited = source({ keyField: "id" });
  for (const options of [{ keyField: "id" }, { keyFields: ["id"] }, { keys: ["a", "b"] }, { rowMap: [0, 1] }]) {
    assert.throws(() => reviseSourceIdentity(inherited, rows, options, "snapshot-b"));
  }
  const explicit = source({ keys: [1, "1"] });
  assert.throws(() => reviseSourceIdentity(explicit, rows, {}, "snapshot-b"));
  assert.throws(() => reviseSourceIdentity(source(), rows, { keys: [1, 2] }, "snapshot-b"));
  assert.throws(() => reviseSourceIdentity({ ...inherited, revision: Number.MAX_SAFE_INTEGER }, rows, {}, "snapshot-b"));
});

test("generated correspondence agrees with the independent allocator and survives empty revisions", () => {
  let actual = source({}, [{}, {}, {}]);
  let reference = referenceAllocation([], 0, [null, null, null]);
  const correspondence = new Map(actual.rowKeys.map((key, index) => [key, reference.keys[index]]));
  for (const [step, rowMap] of [[2, 0, null], [1, null, 0], [], [null, null], [1]].entries()) {
    const next = reviseSourceIdentity(actual, rowMap.map(() => ({})), { rowMap }, `snapshot-${step}`);
    const expected = referenceAllocation(reference.keys, reference.next, rowMap);
    next.rowKeys.forEach((key, index) => {
      if (rowMap[index] === null) {
        assert.equal(correspondence.has(key), false);
        correspondence.set(key, expected.keys[index]);
      }
    });
    assert.deepEqual(next.rowKeys.map(key => correspondence.get(key)), expected.keys);
    assert.equal(next.nextGeneratedKey, expected.next);
    actual = { values: rowMap.map(() => ({})), ...next }; reference = expected;
    validateSourceIdentity(actual);
  }
});

test("unkeyed replacement and independent branches never infer identity from values", () => {
  const before = source();
  const a = reviseSourceIdentity(before, rows, {}, "branch-a");
  const b = reviseSourceIdentity(before, rows, {}, "branch-b");
  assert.equal(new Set([...before.rowKeys, ...a.rowKeys, ...b.rowKeys]).size, 6);
  for (const branch of ["branch-a", "branch-b"]) {
    const next = reviseSourceIdentity(before, rows, { rowMap: [1, null] }, branch);
    assert.equal(next.rowKeys[0], before.rowKeys[1]);
    assert.equal(next.revision, 1);
  }
  const same = reviseSourceIdentity(before, rows, { rowMap: [0, 1] }, "branch-a");
  assert.deepEqual(same.rowKeys, before.rowKeys);
  const keyed = source({ keyField: "id" });
  const empty = { values: [], ...reviseSourceIdentity(keyed, [], {}, "empty") };
  assert.deepEqual(reviseSourceIdentity(empty, rows, {}, "returned").rowKeys, keyed.rowKeys);
});

test("invalid row maps and counter overflow leave input identity untouched", () => {
  const before = source(), saved = JSON.stringify(before);
  for (const rowMap of [[0, 0], [-1, null], [2, null], [0.5, null], [undefined, null], [null], Array(2)]) {
    assert.throws(() => reviseSourceIdentity(before, rows, { rowMap }, "next"));
    assert.equal(JSON.stringify(before), saved);
  }
  assert.throws(() => allocateRowKeys([], Number.MAX_SAFE_INTEGER, [null], "next"));
  assert.equal(allocateRowKeys([], Number.MAX_SAFE_INTEGER - 1, [null], "next").nextGeneratedKey, Number.MAX_SAFE_INTEGER);
});

test("stored source validation rejects corrupt keys, modes, counters and field disagreements", () => {
  for (const original of [source(), source({ keyField: "id" }), source({ keyFields: ["id"] }), source({ keys: [false, [1n, new Date(1)]] })]) {
    assert.equal(validateSourceIdentity(original), original);
    for (const change of [
      value => { value.logicalId = ""; }, value => { value.revision = -1; },
      value => { value.allocationId = null; }, value => { value.keySpec.mode = "unknown"; },
      value => { value.keySpec.extra = true; }, value => { value.rowKeys.pop(); },
      value => { value.rowKeys[1] = value.rowKeys[0]; }, value => { value.rowKeys[0] = "malformed"; },
      value => { value.nextGeneratedKey = -1; }
    ]) {
      const corrupt = structuredClone(original); change(corrupt);
      assert.throws(() => validateSourceIdentity(corrupt));
    }
  }
  const mismatch = structuredClone(source({ keyField: "id" })); mismatch.values[0].id = "changed";
  assert.throws(() => validateSourceIdentity(mismatch));
});
