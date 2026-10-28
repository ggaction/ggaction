import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../src/index.js";
import { serializeProgram, deserializeProgram } from "../../../src/persistence.js";
import { getMarkItems } from "../../../src/inspection.js";
const expression = root => ({ version: 2, registry: "standard@1", root });
const when = expression({ type: "binary", op: "gt", left: { type: "field", name: "x" }, right: { type: "literal", value: 1 } });
const condition = { conditions: [{ when, value: { value: 10 } }], otherwise: { value: 0 } };
const base = () => chart().createCanvas({ width: 300, height: 200, margin: 20 })
  .createData({ id: "data", values: [{ x: 1, y: 2 }, { x: 3, y: 4 }] }).createPointMark({ id: "points" })
  .encodeX({ field: "x" }).encodeY({ field: "y" });
const radii = p => p.graphicSpec.objects.points.items.map(item => item.properties.radius);
test("conditional point radius aliases share one owner and preserve exact zero", () => {
  for (const method of ["encodePointRadius", "encodeRadius"]) {
    const original = base(), saved = serializeProgram(original), result = original[method](condition);
    assert.deepEqual(radii(result), [0, 10]);
    assert.equal(result.markConfigs.points.radius, undefined);
    assert.equal(result.semanticSpec.layers[0].conditionals.radius, undefined);
    assert.deepEqual(getMarkItems(result, { target: "points" }).map(item => item.channels.pointRadius), [0, 10]);
    assert.equal(serializeProgram(original), saved);
    assert.equal(serializeProgram(deserializeProgram(serializeProgram(result))), serializeProgram(result));
  }
});
test("radius selection precedes non-circular shape geometry and ordinary size replacement", () => {
  const result = base().encodeShape({ value: "square" }).encodePointRadius(condition);
  assert.deepEqual(result.graphicSpec.objects.points.items.map(item => item.properties.width), [0, Math.sqrt(Math.PI * 100)]);
  assert.equal(result.encodeSize({ value: Math.PI * 4 }).semanticSpec.layers[0].conditionals?.pointRadius, undefined);
  assert.throws(() => base().encodeSize({ field: "x" }).encodePointRadius(condition), /size encoding/);
});
test("point radius can be replaced, removed and revised without stale geometry", () => {
  const original = base(), result = original.encodePointRadius(condition);
  assert.deepEqual(radii(result.encodeRadius({ value: 3 })), [3, 3]);
  assert.deepEqual(result.removePointRadius().graphicSpec, original.graphicSpec);
  assert.deepEqual(radii(result.reviseData({ source: "data", id: "next", values: [{ x: 4, y: 2 }, { x: 0, y: 4 }] })), [10, 0]);
  assert.throws(() => result.editPointMark({ radius: 4 }), /conflicts/);
});
