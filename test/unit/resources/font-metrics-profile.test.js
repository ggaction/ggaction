import assert from "node:assert/strict";
import test from "node:test";
import { normalizeFontMetricProfile, normalizeTextMetricProfile } from "../../../src/core/textMetricProfile.js";
import { measureTextWidth, missingFontMetricQuery } from "../../../src/core/textMetrics.js";

const identity = { contentHash: "a".repeat(64), family: "Exact Font", style: "normal", weight: 400, metricsProviderVersion: "fixture@1" };
const binding = (id = "font", changes = {}) => ({ resource: { kind: "font", id, revision: 2 }, identity: { ...identity, ...changes } });
const measurement = (text, width, changes = {}) => ({ text, width, fontFamily: "Exact Font", fontSize: 20, fontWeight: 400, fontStyle: "normal", ...changes });
const profile = (changes = {}) => ({ schemaVersion: 2, id: "metrics", fonts: [binding()], measurements: [measurement("AB", 28), measurement("", 0)], ...changes });
const style = { fontFamily: "Exact Font", fontSize: 20 };

test("exact font measurements preserve literal widths and leave legacy estimates available", () => {
  const input = profile(), prepared = normalizeFontMetricProfile(input);
  assert.equal(measureTextWidth("AB", style, prepared), 28);
  assert.equal(measureTextWidth("", style, prepared), 0);
  input.measurements[0].width = 100; input.fonts[0].identity.family = "Other";
  assert.equal(measureTextWidth("AB", style, prepared), 28);
  assert.ok(Object.isFrozen(prepared.fonts[0].identity));
  const legacy = normalizeTextMetricProfile({ schemaVersion: 1, id: "estimate", measurements: [] });
  assert.equal(measureTextWidth("unmeasured", style, legacy), measureTextWidth("unmeasured", style));
  assert.throws(() => normalizeTextMetricProfile(profile()), /Unknown Text metrics profile option/);
});

test("missing exact measurements yield a private query instead of an estimated width", () => {
  const prepared = normalizeFontMetricProfile(profile());
  let error;
  try { measureTextWidth("unmeasured private label", style, prepared); } catch (caught) { error = caught; }
  assert.equal(error.assetCode, "metrics-required");
  assert.doesNotMatch(error.message, /unmeasured private label/);
  assert.deepEqual(missingFontMetricQuery(error), { resource: binding().resource,
    query: { text: "unmeasured private label", fontFamily: "Exact Font", fontSize: 20, fontWeight: 400, fontStyle: "normal" } });
  assert.ok(Object.isFrozen(missingFontMetricQuery(error).query));
  assert.equal(missingFontMetricQuery(new Error("external")), undefined);
});

test("family, style and weight must select one exact font with no fallback identity", () => {
  const prepared = normalizeFontMetricProfile(profile());
  for (const changed of [{ fontFamily: "Fallback" }, { fontStyle: "italic" }, { fontWeight: 700 }, { fontWeight: "bolder" }]) {
    assert.throws(() => measureTextWidth("AB", { ...style, ...changed }, prepared), error => error.assetCode === "unresolved-font");
  }
  const both = normalizeFontMetricProfile(profile({ fonts: [binding(), binding("italic", { style: "italic" })],
    measurements: [measurement("AB", 28), measurement("AB", 35, { fontStyle: "italic" })] }));
  assert.equal(measureTextWidth("AB", { ...style, fontStyle: "italic" }, both), 35);
  assert.equal(measureTextWidth("AB", style, both), 28);
});

test("rejects ambiguous bindings and measurements from an unbound font", () => {
  const invalid = [profile({ schemaVersion: 3 }), profile({ fonts: [] }), profile({ fonts: [binding(), binding("same-family")] }),
    profile({ fonts: [binding(), binding("font", { style: "italic" })] }),
    profile({ fonts: [{ ...binding(), resource: { kind: "image", id: "image", revision: 0 } }] }),
    profile({ fonts: [binding("font", { contentHash: "wrong" })] }),
    profile({ measurements: [measurement("AB", 28, { fontFamily: "Fallback" })] }),
    profile({ measurements: [measurement("AB", 28, { fontStyle: undefined })] })];
  const missing = measurement("AB", 28); delete missing.fontStyle; invalid.push(profile({ measurements: [missing] }));
  for (const input of invalid) assert.throws(() => normalizeFontMetricProfile(input));
});

test("bounds font, query and text budgets before retaining measured profiles", () => {
  assert.throws(() => normalizeFontMetricProfile(profile({ fonts: Array.from({ length: 65 }, (_, i) => binding(String(i), { family: `Font ${i}` })) })), /budget/);
  assert.throws(() => normalizeFontMetricProfile(profile({ measurements: Array.from({ length: 10001 }, (_, i) => measurement(String(i), 1)) })), /budget/);
  assert.throws(() => normalizeFontMetricProfile(profile({ measurements: [measurement("A".repeat(1048577), 1)] })), /budget/);
  let reads = 0;
  assert.throws(() => normalizeFontMetricProfile({ ...profile(), get fonts() { reads++; return []; } }), /accessor/);
  assert.equal(reads, 0);
});
