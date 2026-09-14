import assert from "node:assert/strict";
import test from "node:test";
import { encodeValue, decodeValue } from "../../../src/persistence/codec.js";
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
