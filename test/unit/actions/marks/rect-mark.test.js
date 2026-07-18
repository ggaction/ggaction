import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";

const cells = Object.freeze([
  { column: "A", row: "north", value: 10, label: "10" },
  { column: "B", row: "north", value: 20, label: "20" },
  { column: "A", row: "south", value: 30, label: "30" },
  { column: "B", row: "south", value: 40, label: "40" }
]);

function discreteRect(rows = cells) {
  return chart()
    .createCanvas({ width: 260, height: 180, margin: 20 })
    .createData({ values: rows })
    .createRectMark()
    .encodeX({ field: "column", fieldType: "ordinal" })
    .encodeY({ field: "row", fieldType: "nominal" });
}

test("materializes one full-band rect for every observed discrete cell", () => {
  const program = discreteRect();
  const x = program.resolvedScales.x;
  const y = program.resolvedScales.y;
  const items = program.graphicSpec.objects.rect.items;

  assert.equal(items.length, cells.length);
  assert.equal(items.every(item =>
    item.properties.width === x.bandwidth &&
    item.properties.height === y.bandwidth &&
    item.properties.fill === "#4c78a8" &&
    item.properties.stroke === "white"
  ), true);
  assert.deepEqual(program.semanticSpec.layers[0].encoding.x, {
    field: "column",
    fieldType: "ordinal",
    scale: "x"
  });
  assert.equal(program.trace.children.at(-1).op, "encodeY");
});

test("maps continuous color, omits incomplete rows, and edits appearance", () => {
  const rows = [...cells, { column: "C", row: "north", value: null }];
  const encoded = discreteRect(rows).encodeColor({
    field: "value",
    fieldType: "quantitative",
    scale: { type: "sequential", palette: "viridis" }
  });
  assert.equal(encoded.graphicSpec.objects.rect.items.length, 4);
  assert.deepEqual(encoded.resolvedScales.color.domain, [10, 40]);
  assert.equal(new Set(
    encoded.graphicSpec.objects.rect.items.map(item => item.properties.fill)
  ).size > 1, true);

  const edited = discreteRect().editRectMark({
    opacity: 0.6,
    stroke: "#0f172a",
    strokeWidth: 2
  });
  assert.equal(edited.graphicSpec.objects.rect.items.every(item =>
    item.properties.opacity === 0.6 &&
    item.properties.stroke === "#0f172a" &&
    item.properties.strokeWidth === 2
  ), true);
});

test("supports ranged x/x2 and y/y2 cells without bar semantics", () => {
  const values = [
    { x: 0, x2: 2, y: 1, y2: 4 },
    { x: 2, x2: 5, y: 0, y2: 2 }
  ];
  const program = chart()
    .createCanvas({ width: 300, height: 220, margin: 20 })
    .createData({ values })
    .createRectMark()
    .encodeX({ field: "x" })
    .encodeY({ field: "y" })
    .encodeX2({ field: "x2" })
    .encodeY2({ field: "y2" });

  assert.equal(program.graphicSpec.objects.rect.items.length, 2);
  assert.equal(program.graphicSpec.objects.rect.items.every(item =>
    item.properties.width > 0 && item.properties.height > 0
  ), true);
  assert.equal(program.semanticSpec.layers[0].encoding.y.aggregate, undefined);
  assert.equal(program.semanticSpec.layers[0].encoding.y.stack, undefined);
});

test("keeps rect authoring order-independent and incomplete intent empty", () => {
  const base = chart()
    .createCanvas({ width: 260, height: 180, margin: 20 })
    .createData({ values: cells });
  const incomplete = base
    .createRectMark()
    .encodeY({ field: "row", fieldType: "nominal" });
  assert.deepEqual(incomplete.graphicSpec.objects.rect.items, []);

  const reversed = incomplete.encodeX({
    field: "column",
    fieldType: "ordinal"
  });
  assert.deepEqual(
    reversed.graphicSpec.objects.rect.items,
    discreteRect().graphicSpec.objects.rect.items
  );
});

test("anchors inferred text at cell centers with adaptive or explicit fill", () => {
  const inferred = discreteRect()
    .encodeColor({
      field: "value",
      fieldType: "quantitative",
      scale: { type: "sequential", palette: "viridis" }
    })
    .createTextMark({ fontSize: 10 })
    .encodeText({ field: "label" });
  const rects = inferred.graphicSpec.objects.rect.items;
  const text = inferred.graphicSpec.objects.text.items;

  assert.equal(inferred.semanticSpec.layers.at(-1).source, "rect");
  assert.equal(text.every((item, index) =>
    item.properties.x === rects[index].properties.x + rects[index].properties.width / 2 &&
    item.properties.y === rects[index].properties.y + rects[index].properties.height / 2 &&
    ["#f8fafc", "#0f172a"].includes(item.properties.fill)
  ), true);

  const explicit = discreteRect()
    .createTextMark({ fill: "#dc2626" })
    .encodeText({ field: "label" });
  assert.equal(explicit.graphicSpec.objects.text.items.every(item =>
    item.properties.fill === "#dc2626"
  ), true);
});

test("selects and highlights final rect cells at item grain", () => {
  const highlighted = discreteRect()
    .selectMarks({ field: "value", op: "gte", value: 30 })
    .highlightMarks({ fill: "#dc2626", dimOthers: { opacity: 0.2 } });
  const items = highlighted.graphicSpec.objects.rect.items;

  assert.equal(items.filter(item => item.properties.fill === "#dc2626").length, 2);
  assert.equal(items.filter(item => item.properties.opacity === 0.2).length, 2);
  assert.equal(
    highlighted.trace.children.at(-1).children.some(
      child => child.op === "applyRectHighlight"
    ),
    true
  );
});

test("rematerializes cells, text, axes, and legends after Canvas and scale edits", () => {
  const original = discreteRect()
    .editCanvas({ margin: { right: 90 } })
    .encodeColor({ field: "value", fieldType: "nominal" })
    .createTextMark()
    .encodeText({ field: "label" })
    .createGuides({ grid: false });
  const resized = original.editCanvas({ width: 420, height: 260 });
  assert.notEqual(
    resized.graphicSpec.objects.rect.items[1].properties.x,
    original.graphicSpec.objects.rect.items[1].properties.x
  );
  assert.equal(
    resized.graphicSpec.objects.text.items[1].properties.x,
    resized.graphicSpec.objects.rect.items[1].properties.x +
      resized.graphicSpec.objects.rect.items[1].properties.width / 2
  );
  assert.equal(resized.graphicSpec.objects.colorLegendSymbols.items.length, 4);
  assert.equal(resized.graphicSpec.objects.xAxisLabels.items.length, 2);

  const reversed = resized.editScale({ id: "x", reverse: true });
  assert.ok(
    reversed.graphicSpec.objects.rect.items[0].properties.x >
      reversed.graphicSpec.objects.rect.items[1].properties.x
  );
});

test("filters observed rect cells without synthesizing missing combinations", () => {
  const filtered = discreteRect().filterMarks({
    field: "value",
    op: "gte",
    value: 30
  });
  assert.equal(filtered.graphicSpec.objects.rect.items.length, 2);
  assert.deepEqual(
    filtered.semanticSpec.datasets.at(-1).values.map(row => row.value),
    [30, 40]
  );
});

test("validates rect topology and style conflicts without mutating earlier programs", () => {
  const before = discreteRect();
  assert.throws(
    () => before.encodeColor({
      field: "value",
      fieldType: "quantitative",
      scale: { type: "sequential", palette: "viridis" }
    }).editRectMark({ fill: "red" }),
    /cannot be combined/
  );
  assert.throws(
    () => before.editRectMark({ stroke: false, strokeWidth: 2 }),
    /requires an active stroke/
  );
  assert.throws(() => before.editRectMark({}), /at least one/);
  assert.equal(before.graphicSpec.objects.rect.items[0].properties.fill, "#4c78a8");
});
