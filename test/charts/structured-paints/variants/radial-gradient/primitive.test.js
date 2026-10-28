import assert from "node:assert/strict";
import test from "node:test";
import { variants } from "./manifest.js";
import { samplePixels, expectedColor } from "./reference.js";

test("keeps native radial review inputs and explicit executable source", () => {
  assert.equal(variants.length, 6);
  for (const variant of variants) {
    assert.ok(variant.callChain.includes(JSON.stringify(variant.variant)));
    assert.match(variant.primitive.toString(), /createRadialGradient/);
    assert.match(variant.svg(variant.fixture), /gradientUnits="userSpaceOnUse"/);
    assert.equal(samplePixels(variant.fixture).length, 7);
    assert.equal(variant.fixture.gradient.stops[0].offset, 0);
  }
});
test("anchors center, hard-stop and alpha reference colors", () => {
  assert.deepEqual(expectedColor(variants[0].fixture, 130, 110), [254,243,199,255]);
  assert.deepEqual(expectedColor(variants[0].fixture, 195, 110), [15,118,110,255]);
  assert.deepEqual(expectedColor(variants[2].fixture, 162.5, 110), [15,118,110,255]);
  assert.deepEqual(expectedColor(variants[3].fixture, 130, 110), [235,236,227,255]);
  assert.deepEqual(expectedColor(variants[4].fixture, 30, 110), [226,232,240,255]);
});
