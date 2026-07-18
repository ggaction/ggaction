import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";

function pointSource() {
  return chart()
    .createCanvas({ width: 320, height: 220, margin: 30 })
    .createData({
      values: [
        { x: 1, y: 3, label: "Alpha" },
        { x: 2, y: 5, label: "Beta" }
      ]
    })
    .createPointMark()
    .encodeX({ field: "x" })
    .encodeY({ field: "y" })
    .encodeRadius({ value: 3 });
}

test("infers a point source and materializes field-driven text", () => {
  const before = pointSource();
  const program = before
    .createTextMark({ dx: 7, dy: -6, fontSize: 10, baseline: "bottom" })
    .encodeText({ field: "label" });
  const layer = program.semanticSpec.layers.at(-1);
  const points = program.graphicSpec.objects.point.items;
  const labels = program.graphicSpec.objects.text.items;

  assert.equal(layer.source, "point");
  assert.equal(layer.data, "data");
  assert.equal(layer.encoding.x.scale, "x");
  assert.equal(layer.encoding.y.scale, "y");
  assert.deepEqual(layer.encoding.text, { field: "label", format: "auto" });
  assert.deepEqual(labels.map(item => item.properties.text), ["Alpha", "Beta"]);
  assert.equal(labels.every((item, index) =>
    item.properties.x === points[index].properties.x + 7 &&
    item.properties.y === points[index].properties.y - 6 &&
    item.properties.textBaseline === "bottom"
  ), true);
  assert.equal(before.graphicSpec.objects.text, undefined);
});

test("supports constant content, formatting, reassignment, and focused edits", () => {
  const constant = pointSource()
    .createTextMark({ text: "selected" })
    .editTextMark({ align: "right", rotation: Math.PI / 8, opacity: 0.5 });
  assert.deepEqual(
    constant.graphicSpec.objects.text.items.map(item => item.properties.text),
    ["selected", "selected"]
  );
  assert.equal(constant.graphicSpec.objects.text.items[0].properties.textAlign, "right");

  const numeric = pointSource()
    .createTextMark()
    .encodeText({ field: "y", format: ".1f" });
  const reassigned = numeric.encodeText({ value: 4.25, format: ".2f" });
  assert.deepEqual(
    reassigned.graphicSpec.objects.text.items.map(item => item.properties.text),
    ["4.25", "4.25"]
  );
  assert.equal(reassigned.semanticSpec.layers.at(-1).encoding.text.field, undefined);
  assert.equal(numeric.semanticSpec.layers.at(-1).encoding.text.datum, undefined);
});

test("keeps text authoring order-independent", () => {
  const data = chart()
    .createCanvas({ width: 300, height: 200, margin: 20 })
    .createData({ values: [{ x: 1, y: 2, label: "A" }] });
  const program = data
    .createTextMark({ data: "data" })
    .encodeText({ field: "label" })
    .encodeY({ field: "y" })
    .encodeX({ field: "x" });

  assert.equal(program.graphicSpec.objects.text.items.length, 1);
  assert.equal(program.graphicSpec.objects.text.items[0].properties.text, "A");
});

test("anchors aggregate bar labels and rule labels to final visual items", () => {
  const bars = chart()
    .createCanvas({ width: 360, height: 240, margin: 30 })
    .createData({ values: [
      { category: "A", value: 2 },
      { category: "A", value: 4 },
      { category: "B", value: 8 }
    ] })
    .createBarMark()
    .encodeX({ field: "category", fieldType: "nominal" })
    .encodeY({ field: "value", aggregate: "mean", stack: null })
    .createTextMark({ dy: -4, align: "center" })
    .encodeText({ field: "value", format: ".1f" });
  assert.deepEqual(
    bars.graphicSpec.objects.text.items.map(item => item.properties.text),
    ["3.0", "8.0"]
  );
  assert.equal(bars.semanticSpec.layers.at(-1).source, "bar");

  const rules = chart()
    .createCanvas({ width: 240, height: 160, margin: 20 })
    .createData({ values: [{ x1: 0, y1: 0, x2: 10, y2: 10, label: "end" }] })
    .createRuleMark()
    .encodeX({ field: "x1", fieldType: "quantitative" })
    .encodeY({ field: "y1", fieldType: "quantitative" })
    .encodeX2({ field: "x2", fieldType: "quantitative" })
    .encodeY2({ field: "y2", fieldType: "quantitative" })
    .createTextMark({ dx: 3 })
    .encodeText({ field: "label" });
  const rule = rules.graphicSpec.objects.rule.items[0].properties;
  const text = rules.graphicSpec.objects.text.items[0].properties;
  assert.deepEqual([text.x, text.y], [rule.x2 + 3, rule.y2]);
});

test("rematerializes text after Canvas, scale, and style edits", () => {
  const original = pointSource()
    .createTextMark({ dx: 4 })
    .encodeText({ field: "label" });
  const resized = original.editCanvas({ width: 500, height: 300 });
  assert.notEqual(
    resized.graphicSpec.objects.text.items[1].properties.x,
    original.graphicSpec.objects.text.items[1].properties.x
  );
  assert.equal(
    resized.graphicSpec.objects.text.items[1].properties.x,
    resized.graphicSpec.objects.point.items[1].properties.x + 4
  );
  const recolored = resized.editTextMark({ fill: "#dc2626", dx: 9 });
  assert.equal(recolored.graphicSpec.objects.text.items[0].properties.fill, "#dc2626");
  assert.equal(
    recolored.graphicSpec.objects.text.items[0].properties.x,
    recolored.graphicSpec.objects.point.items[0].properties.x + 9
  );
});

test("rematerializes source-owned text when its source data is filtered", () => {
  const annotated = pointSource()
    .createTextMark()
    .encodeText({ field: "label" });
  const filtered = annotated.filterMarks({
    target: "point",
    field: "label",
    op: "eq",
    value: "Beta"
  });

  assert.equal(filtered.graphicSpec.objects.point.items.length, 1);
  assert.deepEqual(
    filtered.graphicSpec.objects.text.items.map(item => item.properties.text),
    ["Beta"]
  );
  assert.equal(filtered.semanticSpec.layers.at(-1).source, "point");
});

test("validates text source, content, formatting, and edit contracts", () => {
  assert.throws(() => chart().createTextMark(), /requires data/);
  const source = pointSource();
  assert.throws(
    () => source.createTextMark({ fontSize: 0 }),
    /fontSize must be positive/
  );
  const text = source.createTextMark();
  assert.throws(() => text.encodeText({}), /exactly one/);
  assert.throws(
    () => text.encodeText({ field: "missing" }),
    /Unknown text field/
  );
  assert.throws(
    () => text.encodeText({ field: "label", format: "fixed" }),
    /Text format/
  );
  assert.throws(() => text.editTextMark({}), /at least one/);
  assert.throws(
    () => text.editTextMark({ align: "diagonal" }),
    /Unsupported text.textAlign/
  );
});
