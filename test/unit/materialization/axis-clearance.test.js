import assert from "node:assert/strict";
import test from "node:test";
import { resolveAxisLaneClearance } from "../../../src/materialization/guides/axisClearance.js";
import { resolveLegendAxisOffset } from "../../../src/materialization/guides/resources.js";

const plot = Object.freeze({ x: 100, y: 200, width: 300, height: 400 });
const bounds = Object.freeze({ left: 75, right: 430, top: 180, bottom: 650 });
const blocks = Object.freeze(["left", "right", "top", "bottom"].map(position => Object.freeze({ position, bounds })));

test("native axis clearance uses four independent occupied-ink distances", () => {
  assert.deepEqual(["left", "right", "top", "bottom"].map(side => resolveAxisLaneClearance(side, plot, blocks)), [25, 30, 20, 50]);
  assert.deepEqual(blocks.map(block => block.bounds), [bounds, bounds, bounds, bounds]);
});

test("axis clearance is zero without outside ink and uses the farthest same-edge component", () => {
  for (const side of ["left", "right", "top", "bottom"]) {
    assert.equal(resolveAxisLaneClearance(side, plot, []), 0);
    assert.equal(resolveAxisLaneClearance(side, plot, [{ position: side, bounds: { left: 110, right: 390, top: 210, bottom: 590 } }]), 0);
    assert.equal(resolveAxisLaneClearance(side, plot, [{ position: side, bounds: { left: 100, right: 400, top: 200, bottom: 600 } }]), 0);
  }
  assert.equal(resolveAxisLaneClearance("right", plot, [
    { position: "right", bounds },
    { position: "right", bounds: { ...bounds, right: 480 } },
    { position: "left", bounds: { ...bounds, right: 900 } }
  ]), 80);
});

test("native legend intent short-circuits axis reads for explicit and non-edge placement", () => {
  const unread = new Proxy({}, { get() { throw new Error("Unexpected axis read"); } });
  for (const config of [
    { position: "right", offset: 0, inferredOffset: false },
    { position: "right", offset: 8 },
    { position: "top-right", offset: 9, inferredOffset: true },
    { position: "bottom", offset: 10, inferredOffset: true, layout: "legacy-bottom" }
  ]) assert.equal(resolveLegendAxisOffset(unread, config, plot), config.offset);
});
