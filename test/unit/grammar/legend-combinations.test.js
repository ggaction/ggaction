import assert from "node:assert/strict";
import test from "node:test";
import { resolveSizeShapeMapping } from "../../../src/grammar/legendCombinations.js";

function mapping() {
  return {
    layer: { mark: { type: "point" }, encoding: {
      shape: { field: "group", scale: "shape" },
      size: { field: "group", fieldType: "ordinal", scale: "size" },
      x: { field: "group", fieldType: "nominal", scale: "x" }
    } },
    scales: {
      shape: { type: "ordinal", domain: ["A", "B"], range: ["circle", "square"] },
      size: { type: "ordinal", domain: ["A", "B"], range: [25, 100] },
      x: { type: "band", domain: ["B", "A"] }
    },
    rows: [{ group: "A" }, { group: "B" }]
  };
}

test("linked combined samples retain category-to-area identity without changing scale domains", () => {
  const input = mapping(), before = structuredClone(input);
  assert.deepEqual(resolveSizeShapeMapping({ ...input, order: { channel: "x" } }), {
    domain: ["B", "A"], sizeAreas: [100, 25]
  });
  assert.deepEqual(input, before);
  const wrongField = mapping();
  wrongField.layer.encoding.x.field = "other";
  assert.throws(() => resolveSizeShapeMapping({ ...wrongField, order: { channel: "x" } }), /same categorical field/);
  const wrongDomain = mapping();
  wrongDomain.scales.x.domain = ["A", "C"];
  assert.throws(() => resolveSizeShapeMapping({ ...wrongDomain, order: { channel: "x" } }), /same categorical domain/);
});

test("malformed combined scale samples reject empty domains and invalid physical areas", () => {
  const empty = mapping();
  empty.scales.shape.domain = [];
  empty.scales.size.domain = [];
  assert.throws(() => resolveSizeShapeMapping(empty), /nonempty domain/);
  for (const area of [-1, NaN, Infinity]) {
    const input = mapping();
    input.scales.size.range = [25, area];
    assert.throws(() => resolveSizeShapeMapping(input), /finite nonnegative areas/);
  }
});
