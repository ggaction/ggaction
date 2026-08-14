import assert from "node:assert/strict";
import test from "node:test";

import {
  measureTextWidth,
  resolveTextBounds,
  wrapText
} from "../../../src/layout/text.js";

const style = Object.freeze({ fontSize: 14 });

test("measures text with deterministic code-point metrics", () => {
  assert.ok(Math.abs(measureTextWidth("abc", style) - 19.74) < 1e-12);
  assert.equal(measureTextWidth("한글", style), 28);
  assert.equal(measureTextWidth("", style), 0);
  assert.ok(measureTextWidth("10000000", style) > 68);
  assert.ok(
    measureTextWidth("axis", { ...style, fontWeight: 700 }) >
      measureTextWidth("axis", style)
  );
  assert.ok(
    measureTextWidth("axis", { ...style, fontWeight: "900" }) >
      measureTextWidth("axis", { ...style, fontWeight: "400" })
  );
  assert.ok(
    measureTextWidth("axis", { ...style, fontWeight: "black" }) >
      measureTextWidth("axis", { ...style, fontWeight: "lighter" })
  );
  assert.equal(
    measureTextWidth("e\u0301", style),
    measureTextWidth("e", style)
  );
  assert.equal(
    measureTextWidth("\u2615\ufe0f", style),
    measureTextWidth("\u2615", style)
  );
  assert.equal(
    measureTextWidth("\ud83d\udc69\u200d\ud83d\udcbb", style),
    measureTextWidth("\ud83d\udc69", style)
  );
  assert.equal(
    measureTextWidth("\ud83d\udc4d\ud83c\udffd", style),
    measureTextWidth("\ud83d\udc4d", style)
  );
});

test("resolves aligned and rotated bounds from the shared text metrics", () => {
  assert.deepEqual(resolveTextBounds({
    x: 20,
    y: 10,
    text: "한글",
    fontSize: 14,
    textAlign: "center",
    textBaseline: "middle"
  }), {
    left: 6,
    right: 34,
    top: 3,
    bottom: 17
  });
  const rotated = resolveTextBounds({
    x: 20,
    y: 10,
    text: "한글",
    fontSize: 14,
    textAlign: "center",
    textBaseline: "middle",
    rotation: Math.PI / 2
  });
  assert.ok(Math.abs(rotated.left - 13) < 1e-12);
  assert.ok(Math.abs(rotated.right - 27) < 1e-12);
  assert.ok(Math.abs(rotated.top + 4) < 1e-12);
  assert.ok(Math.abs(rotated.bottom - 24) < 1e-12);
});

test("wraps words greedily and falls back for an oversized token", () => {
  assert.deepEqual(wrapText(
    "Kernel density estimates for acceleration, grouped by origin in the cars dataset",
    { maxWidth: 270, mode: "word", style }
  ), [
    "Kernel density estimates for acceleration,",
    "grouped by origin in the cars dataset"
  ]);
  assert.deepEqual(wrapText("acceleration-density-estimate", {
    maxWidth: 70,
    mode: "word",
    style
  }), ["acceleratio", "n-density-e", "stimate"]);
});

test("wraps character mode on Unicode code-point boundaries", () => {
  const lines = wrapText("차트제목ABC", {
    maxWidth: 30,
    mode: "character",
    style
  });
  assert.deepEqual(lines, ["차트", "제목", "ABC"]);
  assert.equal(lines.join(""), "차트제목ABC");
  assert.equal(lines.every(line => line.length > 0), true);
});

test("validates text measurement and wrapping inputs", () => {
  assert.throws(() => measureTextWidth(3, style), /requires a string/);
  assert.throws(() => measureTextWidth("text", { fontSize: 0 }), /positive fontSize/);
  assert.throws(() => wrapText("text", { maxWidth: 0, style }), /maxWidth/);
  assert.throws(() => wrapText("text", {
    maxWidth: 20,
    mode: "words",
    style
  }), /Unsupported text wrap mode/);
  assert.throws(
    () => measureTextWidth("XX", { fontSize: Number.MAX_VALUE }),
    /finite numeric range/
  );
  assert.throws(() => resolveTextBounds({
    x: Number.MAX_VALUE,
    y: 0,
    text: "i",
    fontSize: 1e308
  }), /finite numeric range/);
});
