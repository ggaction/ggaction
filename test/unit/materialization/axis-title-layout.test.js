import test from "node:test";
import assert from "node:assert/strict";
import { axisTitleBounds, assertLabelRelativeTitleSide, resolveInferredAxisTitleOffset,
  resolveLabelRelativeAxisTitleOffset } from "../../../src/materialization/guides/axisTitleLayout.js";

const frame = Object.freeze({ x: 100, y: 100, width: 200, height: 100 });
const profile = Object.freeze({ schemaVersion: 1, id: "exact-title", measurements: [
  { text: "T", fontFamily: "sans-serif", fontSize: 10, fontWeight: 400, width: 20 }
] });
const style = Object.freeze({ fontFamily: "sans-serif", fontSize: 10, fontWeight: 400, rotation: 0, at: "center" });
const scale = Object.freeze({ type: "linear", domain: [0, 1], range: [100, 300] });
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-10, `${actual} != ${expected}`);
const input = (position = "bottom") => ({ channel: position === "top" || position === "bottom" ? "x" : "y",
  config: { ...style, position, offset: { from: "labels", gap: 7 }, rotation: position === "left" ? -Math.PI / 2 : position === "right" ? Math.PI / 2 : 0 },
  text: "T", profile, frame, along: 200, scale, canvas: { width: 400, height: 400 },
  preferred: position === "top" || position === "bottom" ? 42 : 52, labelPosition: position, unclamped: false });

test("title bounds use the exact native font query, alignment and baseline", () => {
  const before = JSON.stringify({ style, profile });
  assert.deepEqual(axisTitleBounds({ x: 10, y: 20 }, style, "T", profile), { left: 0, right: 20, top: 15, bottom: 25 });
  assert.deepEqual(axisTitleBounds({ x: 10, y: 20 }, { ...style, align: "left", baseline: "top" }, "T", profile),
    { left: 10, right: 30, top: 20, bottom: 30 });
  assert.equal(JSON.stringify({ style, profile }), before);
});

test("label-relative title gaps use each physical edge rather than scale direction", () => {
  const boxes = { bottom: { left: 100, right: 300, top: 210, bottom: 230 }, top: { left: 100, right: 300, top: 70, bottom: 90 },
    left: { left: 70, right: 90, top: 100, bottom: 200 }, right: { left: 310, right: 330, top: 100, bottom: 200 } };
  for (const position of Object.keys(boxes)) {
    const prepared = { ...input(position), labelBounds: [boxes[position]] }, before = JSON.stringify(prepared);
    close(resolveLabelRelativeAxisTitleOffset(prepared), 42);
    close(resolveLabelRelativeAxisTitleOffset({ ...prepared, scale: { ...scale, range: [...scale.range].reverse() } }), 42);
    close(resolveLabelRelativeAxisTitleOffset({ ...prepared, config: { ...prepared.config, offset: { from: "labels", gap: 0 } } }), 35);
    assert.equal(JSON.stringify(prepared), before);
  }
});

test("relative title errors preserve side-before-empty validation and reject non-finite distances", () => {
  assert.throws(() => assertLabelRelativeTitleSide("left", "right"), /same axis side/);
  assert.doesNotThrow(() => assertLabelRelativeTitleSide("left", "left"));
  assert.throws(() => resolveLabelRelativeAxisTitleOffset({ ...input(), labelPosition: "top", labelBounds: [] }), /same axis side/);
  assert.throws(() => resolveLabelRelativeAxisTitleOffset({ ...input(), labelBounds: [] }), /nonempty axis labels/);
  assert.throws(() => resolveLabelRelativeAxisTitleOffset({ ...input(), labelBounds: [{ left: 0, right: 1, top: 0, bottom: Infinity }] }), /finite distance/);
});

test("inferred title clearance keeps the preferred gap and the exact legacy Canvas clamp", () => {
  const prepared = { ...input(), labels: { left: 100, right: 300, top: 210, bottom: 250 }, labelBounds: [] };
  // At preferred42 the title occupies [237,247]. Label far250 + native gap4
  // requires another17; a250px Canvas only has3px available.
  assert.equal(resolveInferredAxisTitleOffset(prepared), 59);
  assert.equal(resolveInferredAxisTitleOffset({ ...prepared, canvas: { width: 400, height: 250 } }), 45);
  assert.equal(resolveInferredAxisTitleOffset({ ...prepared, canvas: { width: 400, height: 250 }, unclamped: true }), 59);
  assert.equal(resolveInferredAxisTitleOffset({ ...prepared, labels: { ...prepared.labels, bottom: 220 } }), 42);
  for (const key of ["frame", "canvas", "labels"]) assert.equal(resolveInferredAxisTitleOffset({ ...prepared, [key]: undefined }), 42);
  const top = { ...input("top"), labels: { left: 100, right: 300, top: 50, bottom: 90 }, labelBounds: [] };
  assert.equal(resolveInferredAxisTitleOffset(top), 59);
});

test("rotated Y inference reserves one quarter em unless it would introduce label collision", () => {
  const prepared = { ...input("left"), frame: { ...frame, x: 40 }, labels: { left: 11, right: 25, top: 190, bottom: 210 }, labelBounds: [] };
  close(resolveInferredAxisTitleOffset(prepared), 32.5);
  close(resolveInferredAxisTitleOffset({ ...prepared, labelBounds: [undefined, prepared.labels] }), 35);
  close(resolveInferredAxisTitleOffset({ ...prepared, unclamped: true }), 52);
  const right = { ...input("right"), frame: { ...frame, x: 160 }, labels: { left: 375, right: 389, top: 190, bottom: 210 }, labelBounds: [] };
  close(resolveInferredAxisTitleOffset(right), 32.5);
  close(resolveInferredAxisTitleOffset({ ...right, labelBounds: [right.labels] }), 35);
});
