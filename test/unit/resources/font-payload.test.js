import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { cloneAndFreeze } from "../../../src/core/immutable.js";
import { fontPayloadBytes, matchesFontMime, validateFontPayload } from "../../../src/grammar/fontPayload.js";

const bytes = readFileSync(new URL("../../fixtures/fonts/metric-fixture.ttf", import.meta.url));
const sha = value => createHash("sha256").update(value).digest("hex");
const font = (changes = {}) => ({ contentHash: sha(bytes), mimeType: "font/ttf", byteLength: bytes.length,
  family: "ggaction Metric Fixture", style: "normal", weight: 400, metricsProviderVersion: "fixture@1",
  payload: { encoding: "base64", data: bytes.toString("base64") }, ...changes });

test("retains the exact bundled font bytes offline and returns independent byte copies", () => {
  const stored = cloneAndFreeze(font());
  assert.equal(stored.contentHash, "cd7546c63196b68eda1205ca5544da143e0626cfb5623aa8a8988bf69b287878");
  assert.equal(validateFontPayload(stored), stored);
  const first = fontPayloadBytes(stored); first.fill(0);
  assert.deepEqual(fontPayloadBytes(stored), new Uint8Array(bytes));
  assert.deepEqual(fontPayloadBytes(JSON.parse(JSON.stringify(stored))), new Uint8Array(bytes));
  const foreign = font(); validateFontPayload(foreign); foreign.payload.data = "AAAA";
  assert.throws(() => validateFontPayload(foreign), /base64|length/);
});

test("validates all font MIME signatures without claiming that signature-only bytes decode", () => {
  for (const [mimeType, signature] of [["font/ttf", [0, 1, 0, 0]], ["font/otf", [79, 84, 84, 79]],
    ["font/woff", [119, 79, 70, 70]], ["font/woff2", [119, 79, 70, 50]]]) {
    const source = Buffer.from(signature), value = font({ mimeType, byteLength: source.length,
      contentHash: sha(source), payload: { encoding: "base64", data: source.toString("base64") } });
    assert.equal(matchesFontMime(source, mimeType), true);
    assert.deepEqual(fontPayloadBytes(value), new Uint8Array(source));
    const wrong = Buffer.from([1, 2, 3, 4]);
    assert.throws(() => validateFontPayload({ ...value, contentHash: sha(wrong),
      payload: { encoding: "base64", data: wrong.toString("base64") } }), /MIME/);
  }
  assert.equal(matchesFontMime(bytes, "font/unknown"), false);
});

test("rejects corrupted, unbounded and noncanonical stored font values", () => {
  const invalid = [undefined, null, [], { ...font(), extra: true },
    font({ contentHash: "0".repeat(64) }), font({ contentHash: sha(bytes).toUpperCase() }),
    font({ mimeType: "application/font-woff" }), font({ byteLength: 0 }), font({ byteLength: 16 * 1024 * 1024 + 1 }),
    font({ byteLength: bytes.length + 1 }), font({ family: " " }), font({ style: "oblique" }),
    font({ weight: 450 }), font({ metricsProviderVersion: "" }),
    font({ payload: { encoding: "url", data: "fixture:font" } }),
    font({ payload: { encoding: "base64", data: font().payload.data, extra: true } }),
    font({ payload: { encoding: "base64", data: "!".repeat(font().payload.data.length) } })];
  const missing = font(); delete missing.weight; invalid.push(missing);
  const short = Buffer.from([0, 1, 0, 0]);
  invalid.push(font({ byteLength: 4, contentHash: sha(short), payload: { encoding: "base64", data: "AAEAAB==" } }));
  for (const value of invalid) assert.throws(() => validateFontPayload(value));
});

test("rejects accessor and inherited payload fields before reading caller code", () => {
  let reads = 0;
  const value = font(); Object.defineProperty(value, "family", { enumerable: true, get() { reads++; return "wrong"; } });
  assert.throws(() => validateFontPayload(value), /accessor/);
  const payload = { encoding: "base64", get data() { reads++; return ""; } };
  assert.throws(() => validateFontPayload(font({ payload })), /accessor/);
  assert.throws(() => validateFontPayload(Object.create(font())));
  assert.equal(reads, 0);
});
