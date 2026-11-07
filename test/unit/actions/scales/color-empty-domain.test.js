import test from "node:test";
import assert from "node:assert/strict";
import { chart } from "../../../../src/index.js";
import { serializeProgram } from "../../../../src/persistence.js";

test("quantitative color retains an explicit empty-domain policy through its internal scale action", () => {
  const p = chart().createCanvas().createData({ id: "data", values: [{ x: 1, y: 2, value: 3 }, { x: 2, y: 3, value: 8 }] })
    .createPointMark({ id: "points" }).encodeX({ field: "x", fieldType: "quantitative", scale: { domain: [0, 5] } }).encodeY({ field: "y", fieldType: "quantitative", scale: { domain: [0, 5] } })
    .encodeColor({ field: "value", fieldType: "quantitative", scale: { id: "color", emptyDomain: "preserve" } });
  assert.equal(p.semanticSpec.scales.find(scale => scale.id === "color").emptyDomain, "preserve");
  const q = p.reviseData({ source: "data", id: "empty", values: [], schema: { fields: ["x", "y", "value"].map(name => ({ name, storageType: "number" })) } });
  assert.deepEqual(q.resolvedScales.color.domain, [3, 8]);
  const before = serializeProgram(p);
  assert.throws(() => p.encodeColor({ field: "value", fieldType: "quantitative", scale: { emptyDomain: "invalid" } }), /emptyDomain|policy/);
  assert.equal(serializeProgram(p), before);
});
