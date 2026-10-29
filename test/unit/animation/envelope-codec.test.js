import assert from "node:assert/strict";
import test from "node:test";
import { getErrorDetails } from "../../../src/core/diagnostics.js";
import { canonicalJSON, contentDigest } from "../../../src/core/contentDigest.js";
import { encodeValue } from "../../../src/persistence/codec.js";
import { encodeAnimationEnvelope, decodeAnimationEnvelope, ANIMATION_ENVELOPE_LIMITS }
  from "../../../src/animation/envelopeCodec.js";

const rewrite = (text, change, digest = false) => {
  const value = JSON.parse(text);
  change(value);
  if (digest) value.digest = contentDigest(canonicalJSON(value.payload));
  return JSON.stringify(value);
};

test("animation envelope reuses the tagged codec for exact numeric values, holes and embedded bytes", () => {
  const input = {kernel: "fixture@1", actualBytes: {encoding: "base64", data: "AQID"},
    number: -0, missing: undefined, large: 9007199254740993n, holes: [, 1],
    text: 'Aé한😀\ud800\udc00\ud800\udc00\udfff\"\\\b\t\n\f\r\u0001'};
  const before = encodeValue(input), text = encodeAnimationEnvelope(input);
  const envelope = JSON.parse(text);
  assert.equal(envelope.kind, "animation");
  assert.equal(envelope.schemaVersion, 1);
  assert.equal(envelope.digest, contentDigest(canonicalJSON(envelope.payload)));
  assert.deepEqual(decodeAnimationEnvelope(text), input);
  assert.equal(encodeAnimationEnvelope(input), text);
  assert.deepEqual(encodeValue(input), before);
  const restored = decodeAnimationEnvelope(text);
  restored.actualBytes.data = "changed";
  assert.equal(input.actualBytes.data, "AQID");
});

test("animation envelope rejects unknown schema, extra fields, broken JSON and payload corruption", () => {
  const text = encodeAnimationEnvelope({time: 25});
  for (const bad of [null, {}, "{", "[]", "null", rewrite(text, x => {x.schemaVersion = 2;}),
    rewrite(text, x => {x.kind = "graphic";}), rewrite(text, x => {x.extra = 1;}),
    rewrite(text, x => {delete x.payload;}), rewrite(text, x => {x.packageVersion = "bad";}),
    rewrite(text, x => {x.packageVersion = 1;}), rewrite(text, x => {x.digest = "x";}),
    rewrite(text, x => {x.payload[1][0][1] = 26;}),
    rewrite(text, x => {x.payload = ["unsupported"];}, true)]) {
    assert.throws(() => decodeAnimationEnvelope(bad));
  }
  assert.deepEqual(decodeAnimationEnvelope(text), {time: 25});
});

test("animation serialization rejects accessors, cyclic and executable input without invoking it", () => {
  let calls = 0;
  const accessor = Object.defineProperty({}, "value", {enumerable: true, get() {calls++; return 1;}});
  const cycle = {}; cycle.self = cycle;
  for (const payload of [accessor, cycle, new Date(), {run() {}}, {symbol: Symbol("x")},
    Object.defineProperty({}, "hidden", {value: 1}), {[Symbol("key")]: 1}]) {
    assert.throws(() => encodeAnimationEnvelope(payload));
  }
  assert.equal(calls, 0);
});

test("animation envelope bounds encoded text, depth and work before recursive decoding", () => {
  const limit = ANIMATION_ENVELOPE_LIMITS;
  assert.throws(() => decodeAnimationEnvelope(" ".repeat(limit.bytes + 1)), error => getErrorDetails(error)?.code === "resource-limit");
  let deep = 1;
  for (let index = 0; index <= limit.depth; index++) deep = [deep];
  assert.throws(() => encodeAnimationEnvelope(deep), error => getErrorDetails(error)?.code === "resource-limit");
  const nestedJSON = "[".repeat(limit.depth * 4 + 10) + "0" + "]".repeat(limit.depth * 4 + 10);
  assert.throws(() => decodeAnimationEnvelope(nestedJSON), error => getErrorDetails(error)?.code === "resource-limit");
  assert.throws(() => encodeAnimationEnvelope(new Array(limit.values + 1)), error => getErrorDetails(error)?.code === "resource-limit");
  // Shared references are counted at every occurrence, before encodeValue can
  // expand the small in-memory DAG into an oversized serialized value.
  let shared = [0];
  for (let index = 0; index < 20; index++) shared = [shared, shared];
  assert.throws(() => encodeAnimationEnvelope(shared), error => getErrorDetails(error)?.code === "resource-limit");
  assert.deepEqual(decodeAnimationEnvelope(encodeAnimationEnvelope({ok: true})), {ok: true});
});

test("UTF-8 and JSON escaping contribute to the byte budget before whole-output allocation", () => {
  const limit = ANIMATION_ENVELOPE_LIMITS.bytes;
  for (const text of ["a".repeat(limit + 1), "한".repeat(Math.floor(limit / 3) + 1),
    "\u0001".repeat(Math.floor(limit / 6) + 1)]) {
    assert.throws(() => encodeAnimationEnvelope({text}), error => getErrorDetails(error)?.code === "resource-limit");
  }
  const half = "a".repeat(limit / 2);
  assert.throws(() => encodeAnimationEnvelope({a: half, b: half, c: "x"}), error => getErrorDetails(error)?.code === "resource-limit");
});
