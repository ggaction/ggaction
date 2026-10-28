import test from "node:test";
import assert from "node:assert/strict";
import { imagePlacement } from "../../../src/materialization/image.js";

const image = { width: 200, height: 100 };
const viewport = { x: 0, y: 0, width: 100, height: 100 };
const rectangle = ({ x, y, width, height }) => ({ x, y, width, height });

test("contains a 2:1 image with the independent centered letterbox result", () => {
  const result = imagePlacement(image, viewport);
  assert.deepEqual(rectangle(result), { x: 0, y: 25, width: 100, height: 50 });
  assert.deepEqual(result.clip, viewport);
  assert.ok(Object.isFrozen(result)); assert.ok(Object.isFrozen(result.clip));
  assert.notEqual(result.clip, viewport);
});

test("covers a square by clipping 50 units from each horizontal edge", () => {
  const result = imagePlacement(image, viewport, { fit: "cover" });
  assert.deepEqual(rectangle(result), { x: -50, y: 0, width: 200, height: 100 });
  assert.deepEqual(result.clip, viewport);
});

test("fills the explicit viewport independently of intrinsic ratio", () => {
  assert.deepEqual(rectangle(imagePlacement(image, { ...viewport, x: 17, y: -9 }, { fit: "fill" })), { x: 17, y: -9, width: 100, height: 100 });
});

test("aligns contain and cover at both edges and preserves caller values", () => {
  const original = structuredClone({ image, viewport });
  assert.equal(imagePlacement(image, viewport, { align: [0, 0] }).y, 0);
  assert.equal(imagePlacement(image, viewport, { align: [1, 1] }).y, 50);
  assert.equal(imagePlacement(image, viewport, { fit: "cover", align: [0, 0] }).x, 0);
  assert.equal(imagePlacement(image, viewport, { fit: "cover", align: [1, 1] }).x, -100);
  assert.deepEqual({ image, viewport }, original);
});

test("contain and cover preserve aspect and the specified enclosure inequalities", () => {
  for (const [iw, ih, vw, vh] of [[1, 7, 9, 3], [300, 17, 77, 101], [1, 1, 1, 1]]) {
    for (const fit of ["contain", "cover"]) {
      const r = imagePlacement({ width: iw, height: ih }, { x: 0, y: 0, width: vw, height: vh }, { fit });
      assert.ok(Math.abs(r.width / r.height - iw / ih) < 1e-12);
      assert.ok(fit === "contain" ? r.width <= vw + 1e-12 && r.height <= vh + 1e-12 : r.width >= vw - 1e-12 && r.height >= vh - 1e-12);
    }
  }
});

test("rejects invalid, zero, overflowing and accessor geometry", () => {
  for (const width of [0, -1, Infinity, NaN, "100"]) assert.throws(() => imagePlacement({ ...image, width }, viewport));
  for (const align of [null, [-1, 0], [0, 2], [0], [0, NaN], [0, 0, 0]]) assert.throws(() => imagePlacement(image, viewport, { align }));
  assert.throws(() => imagePlacement(image, viewport, { fit: null }));
  assert.throws(() => imagePlacement(image, viewport, { fit: "stretch" }));
  assert.throws(() => imagePlacement(image, viewport, { unknown: 1 }));
  assert.throws(() => imagePlacement(image, { ...viewport, x: Infinity }));
  assert.throws(() => imagePlacement({ width: Number.MIN_VALUE, height: 1 }, viewport, { fit: "cover" }), /finite geometry/);
  let calls = 0;
  assert.throws(() => imagePlacement({ get width() { calls++; return 1; }, height: 1 }, viewport), /accessors/);
  assert.equal(calls, 0);
});
