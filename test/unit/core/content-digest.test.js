import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { canonicalJSON, contentDigest } from "../../../src/core/contentDigest.js";

test("browser-safe SHA-256 matches fixed vectors and independent host crypto", () => {
  assert.equal(contentDigest(""), "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  assert.equal(contentDigest("abc"), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  for (const value of ["abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq", "a".repeat(1000000),
    "🌍", "\uD800", ...[55,56,63,64,65,127,128,129].map(length => "x".repeat(length))]) {
    assert.equal(contentDigest(value), createHash("sha256").update(value).digest("hex"));
  }
});

test("canonical JSON sorts object keys while preserving encoded payload and array order", () => {
  assert.equal(canonicalJSON({ b: [2, { z: 0, a: 1 }], a: null }), '{"a":null,"b":[2,{"a":1,"z":0}]}');
  assert.equal(contentDigest(canonicalJSON({ b: 1, a: 2 })), contentDigest(canonicalJSON({ a: 2, b: 1 })));
  assert.notEqual(contentDigest(canonicalJSON([1, 2])), contentDigest(canonicalJSON([2, 1])));
});
