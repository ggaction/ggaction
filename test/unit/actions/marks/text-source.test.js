import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";

const values = [
  { x: 1, y: 3, x2: 2, y2: 4, category: "A", row: "R", label: "Alpha" },
  { x: 2, y: 5, x2: 3, y2: 6, category: "B", row: "S", label: "Beta" }
];
function data() {
  return chart().createCanvas({ width: 400, height: 320, margin: 40 })
    .createData({ values });
}
const recipes = [
  { type: "point", create: p => p.createPointMark(), complete: p => p
    .encodeX({ target: "point", field: "x" }).encodeY({ target: "point", field: "y" }) },
  { type: "bar", create: p => p.createBarMark(), complete: p => p
    .encodeX({ target: "bar", field: "category", fieldType: "nominal" })
    .encodeY({ target: "bar", field: "y", aggregate: "sum", stack: null }) },
  { type: "rule", create: p => p.createRuleMark(), complete: p => p
    .encodeX({ target: "rule", field: "x", fieldType: "quantitative" }).encodeY({ target: "rule", field: "y", fieldType: "quantitative" })
    .encodeX2({ target: "rule", field: "x2", fieldType: "quantitative" }).encodeY2({ target: "rule", field: "y2", fieldType: "quantitative" }) },
  { type: "rect", create: p => p.createRectMark(), complete: p => p
    .encodeX({ target: "rect", field: "category", fieldType: "nominal" }).encodeY({ target: "rect", field: "row", fieldType: "nominal" }) },
  { type: "arc", create: p => p.createArcMark(), complete: p => p
    .encodeTheta({ target: "arc", field: "category", aggregate: "sum", weight: "y" }) }
];

for (const { type, create, complete } of recipes) {
  test(`explicit ${type} text source waits for geometry and matches late-bound labels`, () => {
    const source = create(data());
    const pending = source.createTextMark({ source: type, text: "label", dx: 3 });
    assert.equal(pending.semanticSpec.layers.at(-1).source, type);
    assert.deepEqual(pending.graphicSpec.objects.text.items, []);
    const field = pending.encodeText({ target: "text", field: "label" });
    assert.deepEqual(field.graphicSpec.objects.text.items, []);
    const early = complete(field);
    const late = complete(source).createTextMark({ source: type, dx: 3 })
      .encodeText({ field: "label" });
    const inferred = complete(source).createTextMark({ dx: 3 }).encodeText({ field: "label" });
    assert.deepEqual(early.graphicSpec, late.graphicSpec);
    assert.deepEqual(late.graphicSpec, inferred.graphicSpec);
    assert.deepEqual(early.graphicSpec.objects.text.items.map(i => i.properties.text), ["Alpha", "Beta"]);
    assert.deepEqual(early.editCanvas({ width: 460 }).graphicSpec,
      late.editCanvas({ width: 460 }).graphicSpec);
    assert.deepEqual(pending.graphicSpec.objects.text.items, []);
    assert.equal(source.graphicSpec.objects.text, undefined);
  });
}

test("explicit source overrides a different current mark and dataset", () => {
  const points = recipes[0].complete(recipes[0].create(data()));
  const other = points.createData({ id: "other", values: [{ x: 8, y: 10, label: "Other" }] })
    .createPointMark({ id: "other-points" })
    .encodeX({ field: "x", scale: { id: "other-x" } })
    .encodeY({ field: "y", scale: { id: "other-y" } });
  const p = other.createTextMark({ source: "point" }).encodeText({ field: "label" });
  assert.equal(p.semanticSpec.layers.at(-1).data, "data");
  assert.equal(p.semanticSpec.layers.at(-1).source, "point");
  assert.deepEqual(p.graphicSpec.objects.text.items.map(i => i.properties.text), ["Alpha", "Beta"]);
  const labels = points.createTextMark().encodeText({ field: "label" }).graphicSpec.objects.text;
  assert.deepEqual(p.graphicSpec.objects.text, labels);
  const resized = p.editCanvas({ width: 540 });
  for (const [index, label] of resized.graphicSpec.objects.text.items.entries()) {
    assert.equal(label.properties.x, resized.graphicSpec.objects.point.items[index].properties.x);
    assert.equal(label.properties.y, resized.graphicSpec.objects.point.items[index].properties.y);
  }
  const filtered = p.filterMarks({ target: "point", field: "label", op: "eq", value: "Beta" });
  assert.deepEqual(filtered.graphicSpec.objects.text.items.map(i => i.properties.text), ["Beta"]);
  assert.equal(filtered.graphicSpec.objects["other-points"].items.length, 1);
  assert.deepEqual(p.graphicSpec.objects.text, labels);
});

test("explicit source resolves ambiguity without changing independent data mode", () => {
  const p = recipes[0].complete(recipes[0].create(data()))
    .createPointMark({ id: "second" })
    .createTextMark({ id: "independent", data: "data" });
  assert.throws(() => p.createTextMark({ id: "ambiguous" }), /ambiguous; provide source/);
  const explicit = p.createTextMark({ source: "point", id: "attached", text: "attached" });
  assert.equal(explicit.semanticSpec.layers.at(-1).source, "point");
  assert.equal(explicit.graphicSpec.objects.attached.items.length, 2);
  assert.equal(p.semanticSpec.layers.at(-1).source, undefined);
});

test("explicit polar point source uses final anchors without Cartesian inference", () => {
  const p = data().createPointMark()
    .encodeTheta({ field: "x" }).encodeR({ field: "y" })
    .createTextMark({ source: "point", text: "polar" });
  assert.equal(p.graphicSpec.objects.text.items.length, 2);
  for (const [index, item] of p.graphicSpec.objects.text.items.entries()) {
    assert.equal(item.properties.x, p.graphicSpec.objects.point.items[index].properties.x);
    assert.equal(item.properties.y, p.graphicSpec.objects.point.items[index].properties.y);
  }
});

test("invalid explicit sources and source/data conflicts reject immutably", () => {
  const p = recipes[0].complete(recipes[0].create(data())).createLineMark({ id: "line" });
  const before = JSON.stringify(p);
  for (const source of ["", null, undefined, 5, "bad.id"]) {
    assert.throws(() => p.createTextMark({ source }), /Text source id/);
  }
  for (const source of ["missing"]) {
    assert.throws(() => p.createTextMark({ source }), /Unknown text source target/);
  }
  assert.equal(
    p.createTextMark({ id: "lineText", source: "line", text: "pending" })
      .semanticSpec.layers.at(-1).source,
    "line"
  );
  for (const data of ["data", undefined]) {
    assert.throws(() => p.createTextMark({ source: "point", data }), /mutually exclusive/);
  }
  const text = p.createTextMark({ source: "point", text: "ok" });
  assert.throws(() => text.createTextMark({ id: "nested", source: "text" }), /Unknown text source target/);
  assert.throws(() => text.editTextMark({ source: "point", dx: 2 }), /source/);
  assert.equal(JSON.stringify(p), before);
});

test("source labels replay new scale bindings and clear until removed positions return", () => {
  const p = recipes[0].complete(recipes[0].create(data()))
    .createTextMark({ source: "point", dx: 2 }).encodeText({ field: "label" });
  const moved = p.encodeX({ target: "point", field: "x2", scale: { id: "revised-x", domain: [0, 5] } });
  assert.equal(moved.graphicSpec.objects.text.items[0].properties.x,
    moved.graphicSpec.objects.point.items[0].properties.x + 2);
  assert.notEqual(moved.graphicSpec.objects.text.items[0].properties.x,
    p.graphicSpec.objects.text.items[0].properties.x);
  const edited = moved.editScale({ id: "revised-x", domain: [0, 10] });
  assert.equal(edited.graphicSpec.objects.text.items[1].properties.x,
    edited.graphicSpec.objects.point.items[1].properties.x + 2);
  const incomplete = moved.removeEncoding({ target: "point", channel: "y" });
  assert.deepEqual(incomplete.graphicSpec.objects.text.items, []);
  const restored = incomplete.encodeY({ target: "point", field: "y" });
  assert.deepEqual(restored.graphicSpec.objects.text, moved.graphicSpec.objects.text);
  assert.equal(p.graphicSpec.objects.text.items.length, 2);
});

test("explicit gradient-strip source preserves derived data and label replay", () => {
  const p = chart().createCanvas({ width: 400, height: 320 })
    .createData({ values: [{ category: "A", value: 1 }, { category: "A", value: 2 },
      { category: "B", value: 2 }, { category: "B", value: 4 }] })
    .createGradientPlot({ x: { field: "category", fieldType: "nominal" }, y: { field: "value" }, density: { bandwidth: 0.5, steps: 8 }, guides: false });
  const explicit = p.createTextMark({ source: "gradientPlot", text: "profile" });
  const inferred = p.createTextMark({ text: "profile" });
  assert.deepEqual(explicit.graphicSpec, inferred.graphicSpec);
  assert.equal(explicit.graphicSpec.objects.text.items.length, 2);
  assert.deepEqual(explicit.editGradientPlot({ width: { band: 0.5 } }).graphicSpec,
    inferred.editGradientPlot({ width: { band: 0.5 } }).graphicSpec);
});
