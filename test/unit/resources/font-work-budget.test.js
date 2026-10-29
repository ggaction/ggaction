import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { chart, prepareTextMetrics } from "../../../src/index.js";
import { cloneAndFreeze } from "../../../src/core/immutable.js";
import { concreteFonts } from "../../../src/renderers/fonts.js";

// Valid encoded/signature proofs are sufficient for this pre-decoder boundary;
// the synthetic table contents deliberately make no claim to be usable glyphs.
test("unique retained font bytes stop at 64 MiB before decoding or measurement", async () => {
  const fonts = Array.from({ length: 5 }, (_, index) => {
    const bytes = Buffer.alloc(index === 4 ? 4 : 16 * 1024 * 1024);
    bytes.set([0, 1, 0, 0]); if (index !== 4) bytes[bytes.length - 1] = index;
    return cloneAndFreeze({ contentHash: createHash("sha256").update(bytes).digest("hex"), mimeType: "font/ttf",
      family: `Budget Face ${index}`, style: "normal", weight: 400, metricsProviderVersion: "budget@1",
      byteLength: bytes.length, payload: { encoding: "base64", data: bytes.toString("base64") } });
  });
  assert.equal(fonts.reduce((sum, font) => sum + font.byteLength, 0), 64 * 1024 * 1024 + 4);
  const objects = Object.fromEntries(fonts.map((font, index) => [`text${index}`, {
    type: "text", properties: { text: "A", x: 0, y: 0, fontFamily: font.family, fontSize: 20, font }
  }]));
  assert.throws(() => concreteFonts({ objects, order: Object.keys(objects) }), /unique byte budget/);
  const resources = fonts.map((font, index) => ({ kind: "font", id: `font${index}`, revision: 0, algorithmVersion: "1",
    ownership: { mode: "authored" }, inputs: [], provenance: { origin: "authored" },
    options: { uri: `fixture:font${index}`, expectedHash: font.contentHash, mimeType: font.mimeType, maxBytes: 16 * 1024 * 1024,
      family: font.family, style: font.style, weight: font.weight, metricsProviderVersion: font.metricsProviderVersion },
    result: { byteLength: font.byteLength, payload: font.payload } }));
  const base = chart(), program = base._clone({ semanticSpec: { ...base.semanticSpec, resources: cloneAndFreeze(resources) } });
  let calls = 0;
  await assert.rejects(prepareTextMetrics(program, { id: "m", fonts: resources.map(resource => resource.id) }, {
    requestToken: "budget", decode() { calls++; }, measure() { calls++; }
  }), /unique byte budget/);
  assert.equal(calls, 0);
});
