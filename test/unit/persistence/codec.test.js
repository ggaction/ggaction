import assert from "node:assert/strict";
import test from "node:test";
import { encodeValue, decodeValue, encodeSharedValue } from "../../../src/persistence/codec.js";
import { getErrorDetails } from "../../../src/diagnostics.js";

test("tagged JSON preserves unusual cells, sparse arrays, tag-like data, and prototype keys", () => {
  const original = { zero: -0, nan: NaN, plus: Infinity, minus: -Infinity, int: -123n, absent: undefined,
    array: [null, true, "undefined", ["number", "NaN"], , undefined],
    object: JSON.parse('{"__proto__":{"polluted":true},"constructor":"cell"}') };
  const decoded = decodeValue(JSON.parse(JSON.stringify(encodeValue(original))));
  assert.deepEqual(decoded, original);
  assert.equal(Object.getPrototypeOf(decoded.object), Object.prototype);
  assert.equal({}.polluted, undefined);
  assert.equal(Object.hasOwn(decoded.array, 4), false);
  assert.equal(Object.hasOwn(decoded.array, 5), true);
});

test("codec rejects lossy values and reports their location", () => {
  const cyclic = {}; cyclic.self = cyclic;
  const symbolKeys = { [Symbol("key")]: 1 };
  const namedArray = []; namedArray.foo = 1;
  const hidden = {}; Object.defineProperty(hidden, "hidden", { value: 1 });
  for (const value of [Symbol("value"), () => {}, new Date(), cyclic, symbolKeys, namedArray, hidden]) {
    assert.throws(() => encodeValue({ cell: value }), error => {
      assert.match(error.message, /payload.cell/);
      assert.equal(getErrorDetails(error).code, "unsupported-format");
      assert.match(getErrorDetails(error).optionPath, /^payload.cell/);
      return true;
    });
  }
});

test("codec rejects unknown tags, invalid tuples, duplicate keys, and invalid bigint literals", () => {
  for (const value of [{}, NaN, -0, ["hole"], ["undefined", 1], ["bigint", "01"],
    ["bigint", "-0"], ["bigint", "+1"], ["bigint", "1.5"], ["number", "1"],
    ["number", NaN], ["array", {}], ["object", [["x", 1], ["x", 2]]],
    ["object", [[1, "x"]]], ["object", [["x"]]], ["object", [["x", 1, 2]]],
    ["unknown", []], [], ["undefined", 1, 2]]) {
    assert.throws(() => decodeValue(value), /Invalid encoded value/);
  }
});


test("shared array codec bounds repeated payloads and remains canonical after copying", () => {
  const rows = Array.from({ length: 100 }, (_, x) => ({ x, label: `item-${x}`, value: x === 1 ? NaN : x }));
  const source = { first: rows, second: rows, copied: rows.map(row => ({ ...row })) };
  const encoded = encodeSharedValue(source);
  assert.equal(encoded[1].length, 1);
  const restored = decodeValue(JSON.parse(JSON.stringify(encoded)));
  assert.deepEqual(restored, source);
  assert.equal(restored.first, restored.second);
  assert.equal(restored.first, restored.copied);
  assert.deepEqual(encodeSharedValue(restored), encoded);
  assert.ok(JSON.stringify(encoded).length < JSON.stringify(encodeValue(source)).length / 2);
  const cycle = Array.from({ length: 32 }, () => 0); cycle[0] = cycle;
  assert.throws(() => encodeSharedValue(cycle), /cycle/);
});

test("shared arrays reject forward, cyclic, malformed and out-of-range references", () => {
  for (const value of [["reference", 0], ["shared", [], ["reference", 0]],
    ["shared", [["array", [["reference", 0]]]], ["reference", 0]],
    ["shared", [["object", []]], 1],
    ["shared", [["array", []]], ["reference", -1]],
    ["shared", [["array", []]], ["reference", 0.5]],
    ["shared", [["array", []]], ["reference", 1]],
    ["shared", [], ["shared", [], 1]]]) {
    assert.throws(() => decodeValue(value), /Invalid encoded value/);
  }
});


test("decoded cells retain own data descriptors without invoking inherited setters", () => {
  let calls = 0;
  const inherited = "codecInheritedCell", readOnly = "codecReadOnlyCell";
  Object.defineProperty(Object.prototype, inherited, { configurable: true, set() { calls++; } });
  Object.defineProperty(Object.prototype, readOnly, { configurable: true, value: "prototype" });
  try {
    const decoded = decodeValue(["object", [["ordinary", 1], [inherited, 2], [readOnly, 3],
      ["__proto__", ["object", [["value", 4]]]], ["constructor", "cell"]]]);
    assert.equal(calls, 0);
    assert.equal(Object.getPrototypeOf(decoded), Object.prototype);
    assert.deepEqual(Object.keys(decoded), ["ordinary", inherited, readOnly, "__proto__", "constructor"]);
    for (const [key, value] of [["ordinary", 1], [inherited, 2], [readOnly, 3], ["constructor", "cell"]]) {
      assert.deepEqual(Object.getOwnPropertyDescriptor(decoded, key), {
        value, enumerable: true, writable: true, configurable: true
      });
    }
    assert.deepEqual(decoded.__proto__, { value: 4 });
  } finally {
    delete Object.prototype[inherited]; delete Object.prototype[readOnly];
  }
});
