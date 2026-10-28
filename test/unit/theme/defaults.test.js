import assert from "node:assert/strict";
import test from "node:test";

import {
  THEME_TOKEN_KEYS,
  THEME_TOKENS,
  normalizeThemeDefinition,
  resolveThemeTokens
} from "../../../src/theme/defaults.js";

test("normalizes built-in and custom theme requests into owned partial definitions", () => {
  assert.deepEqual(normalizeThemeDefinition("dark"), {
    name: "dark",
    tokens: {}
  });

  const tokens = { mark: "#ff0000", fontFamily: "RoadmapTest" };
  const normalized = normalizeThemeDefinition({ base: "light", tokens });
  tokens.mark = "#000000";

  assert.deepEqual(normalized, {
    name: "light",
    tokens: { mark: "#ff0000", fontFamily: "RoadmapTest" }
  });
  assert.equal(Object.isFrozen(normalized), true);
  assert.equal(Object.isFrozen(normalized.tokens), true);
});

test("resolves base tokens and the closed optional typography vocabulary", () => {
  assert.equal(THEME_TOKEN_KEYS.length, 25);
  const baseKeys = THEME_TOKEN_KEYS.filter(key => !["fontSize", "fontWeight", "axisLabel", "axisLabelFontFamily", "axisTitleFontFamily", "axisLabelFontSize", "axisTitleFontSize"].includes(key));
  assert.deepEqual(Object.keys(THEME_TOKENS.light), [...baseKeys]);
  assert.deepEqual(Object.keys(THEME_TOKENS.dark), [...baseKeys]);

  const resolved = resolveThemeTokens({
    base: "light",
    tokens: { mark: "red", grid: "green", fontFamily: "RoadmapTest" }
  });
  assert.deepEqual(Object.keys(resolved), [...baseKeys]);
  assert.equal(resolved.mark, "red");
  assert.equal(resolved.grid, "green");
  assert.equal(resolved.fontFamily, "RoadmapTest");
  assert.equal(resolved.text, THEME_TOKENS.light.text);
  assert.equal(Object.isFrozen(resolved), true);
});

test("replaces custom partial tokens instead of merging consecutive definitions", () => {
  const customA = resolveThemeTokens({
    base: "light",
    tokens: { mark: "red", grid: "green" }
  });
  const customB = resolveThemeTokens({
    base: "light",
    tokens: { mark: "blue" }
  });

  assert.equal(customA.grid, "green");
  assert.equal(customB.mark, "blue");
  assert.equal(customB.grid, THEME_TOKENS.light.grid);
});

test("rejects malformed custom theme definitions and token values", () => {
  assert.throws(
    () => normalizeThemeDefinition(null),
    { name: "TypeError" }
  );
  assert.throws(
    () => normalizeThemeDefinition({ base: "light" }),
    /requires base and tokens/u
  );
  assert.throws(
    () => normalizeThemeDefinition({ base: "light", tokens: {}, extra: true }),
    /Unknown applyTheme theme option "extra"/u
  );
  assert.throws(
    () => normalizeThemeDefinition({ base: "unknown", tokens: {} }),
    /Unsupported theme base/u
  );
  assert.throws(
    () => normalizeThemeDefinition({ base: "light", tokens: { brand: "red" } }),
    /Unknown applyTheme theme.tokens option "brand"/u
  );
  assert.throws(
    () => normalizeThemeDefinition({ base: "light", tokens: { mark: "" } }),
    { name: "TypeError" }
  );
  assert.throws(
    () => normalizeThemeDefinition({ base: "light", tokens: { fontFamily: 42 } }),
    { name: "TypeError" }
  );
});

test("rejects executable and hidden theme descriptors before reading them", () => {
  let reads = 0;
  const getter = () => { reads += 1; return "red"; };
  const malformed = [
    { base: "light", tokens: Object.defineProperty({}, "mark", { enumerable: true, get: getter }) },
    Object.defineProperty({ tokens: {} }, "base", { enumerable: true, get: getter }),
    { base: "light", tokens: Object.defineProperty({}, "mark", { value: "red" }) },
    { base: "light", tokens: { [Symbol("mark")]: "red" } },
    { base: "light", tokens: Object.create({ mark: "red" }) },
    Object.assign(Object.create({ base: "light" }), { tokens: {} })
  ];
  for (const value of malformed) assert.throws(() => normalizeThemeDefinition(value), TypeError);
  assert.equal(reads, 0);
  const tokens = Object.assign(Object.create(null), { mark: "red" });
  assert.equal(normalizeThemeDefinition({ base: "light", tokens }).tokens.mark, "red");
});


test("global typography preserves numeric zero weight and rejects nonfinite values", () => {
  assert.equal(resolveThemeTokens({ base: "light", tokens: { fontSize: 14, fontWeight: 0 } }).fontWeight, 0);
  for (const tokens of [{ fontSize: 0 }, { fontSize: -1 }, { fontSize: NaN }, { fontSize: Infinity },
    { fontWeight: Infinity }, { fontWeight: NaN }, { fontWeight: false }, { fontWeight: "" }]) {
    assert.throws(() => normalizeThemeDefinition({ base: "light", tokens }));
  }
});
