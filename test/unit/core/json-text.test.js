import assert from "node:assert/strict";
import test from "node:test";
import { countJSONStringBytes } from "../../../src/core/jsonText.js";
import { getErrorDetails } from "../../../src/core/diagnostics.js";

const nativeBytes = text => new TextEncoder().encode(JSON.stringify(text)).length;

test("JSON string count matches all UTF-16 units and offset-aware exact quotas", () => {
  for (let unit = 0; unit <= 0xffff; unit++) {
    const text = String.fromCharCode(unit), expected = nativeBytes(text);
    assert.equal(countJSONStringBytes(text, 0, expected, "text"), expected, unit.toString(16));
    assert.equal(countJSONStringBytes(text, 17, 17 + expected, "key"), expected);
    assert.throws(() => countJSONStringBytes(text, 17, 16 + expected, "key"), /key must not exceed/);
  }
});

test("JSON string count preserves mixed surrogate pairing, escapes and empty strings", () => {
  const samples = ["", "\b\t\n\f\r", "\u0000\u000b\u001f", "\"\\",
    "\u007f\u0080\u07ff\u0800\uffff", "\ud800\udc00", "\udbff\udfff",
    "\ud800\ud800\udc00\udfff", "\udc00\ud800x\udfff", "\ud800\uffff",
    "a\ud800\udc00b\udbff\udfffc", "é한🙂", "x".repeat(1024) + "\ud800"];
  let seed = 23;
  for (let sample = 0; sample < 100; sample++) {
    const units = Array.from({ length: 71 }, () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed & 0xffff;
    });
    samples.push(String.fromCharCode(...units));
  }
  for (const text of samples) {
    const expected = nativeBytes(text);
    assert.equal(countJSONStringBytes(text, 31, 31 + expected, "text"), expected);
    assert.throws(() => countJSONStringBytes(text, 31, 30 + expected, "text"), RangeError);
  }
});

test("minimum quota rejects before scalar reads, escaping or UTF-8 allocation", () => {
  const originalUnit = String.prototype.charCodeAt, originalJSON = JSON.stringify;
  const originalEncode = TextEncoder.prototype.encode;
  let units = 0, escapes = 0, encodes = 0, error;
  try {
    String.prototype.charCodeAt = function(index) { units++; return originalUnit.call(this, index); };
    JSON.stringify = function(...args) { escapes++; return originalJSON(...args); };
    TextEncoder.prototype.encode = function(...args) { encodes++; return originalEncode.apply(this, args); };
    try { countJSONStringBytes("abcd", 7, 12, "quota"); } catch (caught) { error = caught; }
  } finally {
    String.prototype.charCodeAt = originalUnit; JSON.stringify = originalJSON; TextEncoder.prototype.encode = originalEncode;
  }
  assert.equal(units, 0); assert.equal(escapes, 0); assert.equal(encodes, 0);
  assert.ok(error instanceof RangeError); assert.equal(error.message, "quota must not exceed 12.");
  assert.deepEqual(getErrorDetails(error), { code: "resource-limit", optionPath: "quota", limit: 12, actual: 13 });
});

test("final quota keeps actual escaped size and successful counting allocates no escaped bytes", () => {
  const originalJSON = JSON.stringify, originalEncode = TextEncoder.prototype.encode;
  let escapes = 0, encodes = 0, error, result;
  try {
    JSON.stringify = function(...args) { escapes++; return originalJSON(...args); };
    TextEncoder.prototype.encode = function(...args) { encodes++; return originalEncode.apply(this, args); };
    try { countJSONStringBytes("\ud800", 7, 10, "quota"); } catch (caught) { error = caught; }
    result = countJSONStringBytes("\ud800", 7, 15, "quota");
  } finally { JSON.stringify = originalJSON; TextEncoder.prototype.encode = originalEncode; }
  assert.equal(result, 8); assert.equal(escapes, 0); assert.equal(encodes, 0);
  assert.ok(error instanceof RangeError);
  assert.deepEqual(getErrorDetails(error), { code: "resource-limit", optionPath: "quota", limit: 10, actual: 15 });
});
