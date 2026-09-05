import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";

test("records series policy state without compiling or changing graphics", () => {
  const base = chart().createCanvas().createData({ values: [{ x: 0, y: 2 }] })
    .createAreaMark({ id: "area" });
  const before = JSON.stringify(base);
  for (const mode of ["group", "stack", "fill", "overlay", "diverging", "center"]) {
    const next = base.editSemantic({ property: "layer[area].layout.mode", value: mode });
    assert.deepEqual(next.semanticSpec.layers[0].layout, { mode });
    assert.equal(next.graphicSpec, base.graphicSpec);
    assert.ok(Object.isFrozen(next.semanticSpec.layers[0].layout));
    const removed = next.editSemantic({ property: "layer[area].layout", remove: true });
    assert.equal(removed.semanticSpec.layers[0].layout, undefined);
    assert.deepEqual(next.semanticSpec.layers[0].layout, { mode });
  }
  for (const missing of ["error", "break"]) {
    const next = base.editSemantic({ property: "layer[area].mark.missing", value: missing });
    assert.equal(next.semanticSpec.layers[0].mark.missing, missing);
    assert.equal(next.graphicSpec, base.graphicSpec);
    assert.deepEqual(next.editSemantic({ property: "layer[area].mark.missing", remove: true })
      .semanticSpec.layers[0].mark, { type: "area" });
  }
  assert.equal(JSON.stringify(base), before);
});

test("keeps inferred grouping provenance separate from identity and appearance", () => {
  const base = chart().editSemantic({ property: "layer[m].encoding.group.field", value: "series" });
  for (const origin of ["color", "offset"]) {
    const next = base.editSemantic({ property: "layer[m].encoding.group.inferredFrom", value: origin });
    assert.deepEqual(next.semanticSpec.layers[0].encoding.group, { field: "series", inferredFrom: origin });
    const explicit = next.editSemantic({ property: "layer[m].encoding.group.inferredFrom", remove: true });
    assert.deepEqual(explicit.semanticSpec.layers[0].encoding.group, { field: "series" });
    assert.deepEqual(base.semanticSpec.layers[0].encoding.group, { field: "series" });
  }
});

test("rejects invalid series policy values and aliases without mutation", () => {
  const base = chart().editSemantic({ property: "layer[m].mark.type", value: "area" });
  const before = JSON.stringify(base);
  for (const property of ["layout.mode", "mark.missing", "encoding.group.inferredFrom"]) {
    for (const value of [null, {}, [], 0, false, "unknown"]) {
      assert.throws(() => base.editSemantic({ property: `layer[m].${property}`, value }));
      assert.equal(JSON.stringify(base), before);
    }
  }
  assert.throws(() => base.editSemantic({ property: "layer[m].layout", value: { mode: "stack" } }), /Unknown semantic/);
  assert.throws(() => base.editSemantic({ property: "layer[m].mark.missing", value: "skip" }), /missing policy/);
  assert.equal(typeof base.layoutSeries, "undefined");
  assert.equal(typeof base.encodeLayout, "undefined");
});
