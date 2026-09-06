import assert from "node:assert/strict";
import test from "node:test";

import { chart, hconcat, vconcat } from "../../../../src/index.js";

function child(width, color) {
  return chart()
    .createCanvas({ width, height: 100, margin: 10 })
    .createGraphics({ id: "dot", type: "circle", parent: "plot-main" })
    .editGraphics({ target: "dot", property: "x", value: 30 })
    .editGraphics({ target: "dot", property: "y", value: 30 })
    .editGraphics({ target: "dot", property: "radius", value: 4 })
    .editGraphics({ target: "dot", property: "fill", value: color });
}

test("inserts, reorders, and removes stable named concat children", () => {
  const red = child(100, "red");
  const blue = child(120, "blue");
  const green = child(80, "green");
  const original = hconcat({
    id: "row",
    programs: [{ id: "red", program: red }, { id: "blue", program: blue }]
  });
  const inserted = original.insertCompositionChild({
    id: "green", program: green, before: "blue"
  });
  const reordered = inserted.reorderCompositionChildren({
    order: ["blue", "red", "green"]
  });
  const removed = reordered.removeCompositionChild({ target: "green" });
  const fresh = hconcat({
    id: "row",
    programs: [{ id: "blue", program: blue }, { id: "red", program: red }]
  });

  assert.deepEqual(inserted.compositionSpec.children, ["red", "green", "blue"]);
  assert.deepEqual(reordered.compositionSpec.children, ["blue", "red", "green"]);
  assert.deepEqual(removed.compositionSpec.children, ["blue", "red"]);
  assert.equal(removed.children.blue, blue);
  assert.equal(removed.children.red, red);
  assert.deepEqual(removed.graphicSpec, fresh.graphicSpec);
  assert.deepEqual(original.compositionSpec.children, ["red", "blue"]);

  const single = removed.removeCompositionChild({ target: "red" });
  assert.deepEqual(single.compositionSpec.children, ["blue"]);
  assert.equal(single.graphicSpec.objects.canvas.properties.width, 120);
  assert.throws(
    () => single.removeCompositionChild({ target: "blue" }),
    /leave at least one child/
  );
});

test("supports before, after, and tail insertion in vertical concat", () => {
  const a = child(100, "red");
  const b = child(100, "blue");
  const c = child(100, "green");
  const d = child(100, "orange");
  const e = child(100, "purple");
  const result = vconcat({
    programs: [{ id: "a", program: a }, { id: "b", program: b }]
  })
    .insertCompositionChild({ id: "c", program: c, after: "a" })
    .insertCompositionChild({ id: "d", program: d, before: "a" })
    .insertCompositionChild({ id: "e", program: e });

  assert.deepEqual(result.compositionSpec.children, ["d", "a", "c", "b", "e"]);
});

test("rejects malformed named edits and every facet structural mutation atomically", () => {
  const a = child(100, "red");
  const b = child(120, "blue");
  const pair = hconcat({
    programs: [{ id: "a", program: a }, { id: "b", program: b }]
  });
  const graphics = pair.graphicSpec;
  const trace = pair.trace;

  assert.throws(
    () => pair.insertCompositionChild({ id: "a", program: a }),
    /already exists/
  );
  assert.throws(
    () => pair.insertCompositionChild({ id: "c", program: a, before: "a", after: "b" }),
    /mutually exclusive/
  );
  assert.throws(
    () => pair.insertCompositionChild({ id: "c", program: a, before: "missing" }),
    /Unknown composition child/
  );
  assert.throws(
    () => pair.reorderCompositionChildren({ order: ["a"] }),
    /every current child/
  );
  assert.throws(
    () => pair.reorderCompositionChildren({ order: ["a", "a"] }),
    /must not contain duplicates/
  );
  assert.throws(
    () => pair.reorderCompositionChildren({ order: ["a", "b"] }),
    /actual order change/
  );
  assert.equal(pair.graphicSpec, graphics);
  assert.equal(pair.trace, trace);

  const unit = chart()
    .createCanvas({ width: 200, height: 150, margin: 30 })
    .createData({ values: [{ x: 1, y: 2, group: "A" }] })
    .createScatterPlot({ x: "x", y: "y", guides: false });
  for (const mutate of [
    () => unit.insertCompositionChild({ id: "x", program: unit }),
    () => unit.removeCompositionChild({ target: "x" }),
    () => unit.reorderCompositionChildren({ order: ["x"] })
  ]) {
    assert.throws(mutate, /requires a composition ChartProgram/);
  }
  const facet = unit.facet({ field: "group" });
  for (const mutate of [
    () => facet.insertCompositionChild({ id: "x", program: unit }),
    () => facet.removeCompositionChild({ target: facet.compositionSpec.children[0] }),
    () => facet.reorderCompositionChildren({ order: facet.compositionSpec.children })
  ]) {
    assert.throws(mutate, /not available on a facet/);
  }
});
