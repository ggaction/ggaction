import assert from "node:assert/strict";
import test from "node:test";
import { parsePaintColor, parseContinuousColor, paintColorCSS } from "../../../src/grammar/color.js";
import { validateFillPaint } from "../../../src/grammar/paint.js";

function close(actual, expected) {
  for (const key of ["r", "g", "b", "a"]) assert.ok(Math.abs(actual[key] - expected[key]) < 1e-14, `${key}: ${actual[key]} != ${expected[key]}`);
  assert.ok(Object.isFrozen(actual));
}

test("structured paint colors resolve exact hex bytes, standard names and alpha", () => {
  for (const [input, bytes] of [
    ["#369", [51, 102, 153, 255]], ["#3698", [51, 102, 153, 136]],
    ["#336699", [51, 102, 153, 255]], ["#33669980", [51, 102, 153, 128]],
    [" RebeccaPurple ", [102, 51, 153, 255]], ["aliceblue", [240, 248, 255, 255]],
    ["papayawhip", [255, 239, 213, 255]], ["yellowgreen", [154, 205, 50, 255]],
    ["transparent", [0, 0, 0, 0]], ["GRAY", [128, 128, 128, 255]]
  ]) close(parsePaintColor(input), Object.fromEntries(["r", "g", "b", "a"].map((key, index) => [key, bytes[index] / 255])));
  assert.deepEqual(parsePaintColor("grey"), parsePaintColor("gray"));
  assert.deepEqual(parsePaintColor("fuchsia"), parsePaintColor("magenta"));
  assert.deepEqual(parsePaintColor("aqua"), parsePaintColor("cyan"));
});

test("comma RGB and HSL functions share bounded channels and hue conversion", () => {
  for (const input of ["rgb(0, 255, 0)", "rgb(0%,100%,0%)", "hsl(120,100%,50%)",
    "hsl(-240deg,100%,50%)", "hsl(1.3333333333333333turn,100%,50%)",
    "hsl(133.33333333333333grad,100%,50%)", `hsl(${2 * Math.PI / 3}rad,100%,50%)`]) {
    close(parsePaintColor(input), { r: 0, g: 1, b: 0, a: 1 });
  }
  close(parsePaintColor("RGBA(1e2, 0, 25.5, 25%)"), { r: 100 / 255, g: 0, b: .1, a: .25 });
  close(parsePaintColor("hsla(240,100%,50%,.4)"), { r: 0, g: 0, b: 1, a: .4 });
  close(parsePaintColor("hsl(360,0%,50%)"), { r: .5, g: .5, b: .5, a: 1 });
  for (const hue of [0, 60, 120, 180, 240, 300]) {
    const rgb = parseContinuousColor(`hsl(${hue},100%,50%)`);
    close(parsePaintColor(`hsl(${hue},100%,50%)`), { ...rgb, a: 1 });
  }
  assert.equal(parsePaintColor(`hsl(${Number.MAX_VALUE}turn,100%,50%)`).r, 1);
  assert.equal(Object.is(parsePaintColor("rgba(-0,0,0,-0)").a, -0), false);
});

test("strict paint parser rejects host-dependent syntax and malformed or nonfinite channels", () => {
  for (const input of [null, undefined, 2, {}, [], ""]) assert.throws(() => parsePaintColor(input), /non-empty string/);
  for (const input of [" ", "none", "currentColor", "var(--ink)", "color(display-p3 1 0 0)",
    "rgb(1 2 3)", "rgb(1,2%,3)", "rgb(256,0,0)", "rgb(-1,0,0)", "rgb(1e999,0,0)",
    "rgba(0,0,0,1.1)", "rgba(0,0,0,NaN)", "rgba(0,0,0)", "rgb(0,0,0,.5)",
    "hsl(0,101%,50%)", "hsl(0,1,50%)", "hsl(0,10%,101%)", "hsl(NaN,10%,50%)",
    "hsl(1e999,10%,50%)", "hsl(1foo,10%,50%)", "#12", "#12345", "#ggg",
    "constructor", "toString", "__proto__", "rgb(0,,0)", "rgb(0,0,0)\ninvalid"]) {
    assert.throws(() => parsePaintColor(input), /Unsupported paint color/, input);
  }
  assert.throws(() => parsePaintColor(" ".repeat(10_000_001)), /Paint color length/);
});

test("alpha lowering is explicit, finite and preserves fractional RGB channels", () => {
  assert.equal(paintColorCSS("rgba(25.5, 0, 255, .5)", .4), "rgba(25.5,0,255,0.2)");
  assert.equal(paintColorCSS("#369"), "rgba(51,102,153,1)");
  for (const opacity of [NaN, Infinity, -1, 1.1, "1"]) assert.throws(() => paintColorCSS("red", opacity), /opacity/);
});

test("legacy scale and solid paint validation do not inherit the new color vocabulary", () => {
  for (const input of ["rebeccapurple", "transparent", "#3698", "rgba(1,2,3,.5)", " red "]) {
    assert.throws(() => parseContinuousColor(input), /Unsupported continuous color/);
    assert.equal(validateFillPaint(input), input);
  }
  assert.deepEqual(parseContinuousColor("rgb(10%,20,30)"), { r: .1, g: .2, b: .3 });
  assert.deepEqual(parseContinuousColor("#369"), { r: .2, g: .4, b: .6 });
  assert.deepEqual(parseContinuousColor("#336699"), { r: .2, g: .4, b: .6 });
  assert.deepEqual(parseContinuousColor("red"), { r: 1, g: 0, b: 0 });
  for (const input of ["", null, "rgb(256,0,0)", "hsl(0,101%,50%)"]) assert.throws(() => parseContinuousColor(input));
});


test("named colors never evaluate inherited properties", () => {
  let reads = 0;
  Object.defineProperty(Object.prototype, "inventedpaintcolor", {
    configurable: true, get() { reads += 1; return "#ff0000"; }
  });
  try {
    assert.throws(() => parsePaintColor("inventedpaintcolor"), /Unsupported paint color/);
    assert.throws(() => parseContinuousColor("inventedpaintcolor"), /Unsupported continuous color/);
    assert.equal(reads, 0);
  } finally { delete Object.prototype.inventedpaintcolor; }
  assert.deepEqual(parsePaintColor("rgb(0,\n255,0)"), { r: 0, g: 1, b: 0, a: 1 });
});
