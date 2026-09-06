import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";

function canvas(values = []) {
  return chart()
    .createCanvas({ width: 480, height: 320, margin: 40 })
    .createData({ values });
}

function annotationItem(program) {
  return program.graphicSpec.objects.annotation.items[0].properties;
}

test("mark anchor reuses final source grain and source-owned lifecycle", () => {
  const source = canvas([
    { category: "A", value: 2 },
    { category: "A", value: 3 },
    { category: "B", value: 4 }
  ]).createBarPlot({
    x: "category",
    y: { field: "value", aggregate: "sum" },
    guides: false
  });
  const p = source.createAnnotation({ text: "Total", dy: -4 });
  assert.equal(p.semanticSpec.layers.at(-1).source, "barPlot");
  assert.deepEqual(
    p.graphicSpec.objects.annotation.items.map(item => item.properties.text),
    ["Total", "Total"]
  );
  assert.deepEqual(p.trace.children.at(-1).children.map(child => child.op), ["createMarkLabels"]);
  assert.throws(() => p.removeMark({ target: "annotation" }), /owned by/);
  const removed = p.removeMark({ target: "barPlot" });
  assert.equal(removed.graphicSpec.objects.annotation, undefined);
  assert.equal(source.graphicSpec.objects.annotation, undefined);
});

test("data anchor binds both source scales without becoming a source-owned label", () => {
  const source = canvas([{ x: 1, y: 2 }, { x: 4, y: 5 }, { x: 8, y: 9 }])
    .createPointMark()
    .encodeX({ field: "x", scale: { domain: [0, 10] } })
    .encodeY({ field: "y", scale: { domain: [0, 10] } });
  const args = { text: "Peak · 9.0", x: 8, y: 9, dx: 8, dy: -16, fontWeight: 600 };
  const before = JSON.stringify(args);
  const p = source.createAnnotation(args);
  const layer = p.semanticSpec.layers.at(-1);
  assert.equal(JSON.stringify(args), before);
  assert.equal(layer.id, "annotation");
  assert.equal(layer.source, undefined);
  assert.equal(layer.data, "data");
  assert.deepEqual(layer.encoding.x, { datum: 8, fieldType: "quantitative", scale: "x" });
  assert.deepEqual(layer.encoding.y, { datum: 9, fieldType: "quantitative", scale: "y" });
  assert.deepEqual(
    Object.fromEntries(["x", "y", "text", "fontWeight"].map(key => [key, annotationItem(p)[key]])),
    { x: 368, y: 48, text: "Peak · 9.0", fontWeight: 600 }
  );
  assert.deepEqual(p.trace.children.at(-1).children.map(child => child.op), [
    "createTextMark", "encodeText", "encodeX", "encodeY"
  ]);

  const edited = p
    .encodeX({ target: "annotation", datum: 2, scale: { id: "x" } })
    .encodeText({ target: "annotation", value: "Revised" })
    .editTextMark({ target: "annotation", fill: "red" });
  assert.equal(edited.graphicSpec.objects.annotation.items[0].properties.text, "Revised");
  assert.equal(edited.graphicSpec.objects.annotation.items[0].properties.fill, "red");
  assert.equal(edited.removeMark({ target: "annotation" }).graphicSpec.objects.annotation, undefined);
});

test("plot anchor owns two ordinary fraction scales and follows Canvas edits", () => {
  const p = canvas([]).createAnnotation({
    text: "Forecast",
    space: "plot",
    x: 0.75,
    y: 0.8,
    align: "center",
    baseline: "middle"
  });
  assert.deepEqual(p.semanticSpec.scales.slice(-2).map(scale => ({
    id: scale.id,
    type: scale.type,
    domain: scale.domain
  })), [
    { id: "annotation-x", type: "linear", domain: [0, 1] },
    { id: "annotation-y", type: "linear", domain: [0, 1] }
  ]);
  assert.equal(annotationItem(p).x, 340);
  assert.equal(annotationItem(p).y, 88);
  const resized = p.editCanvas({ width: 580, height: 420 });
  assert.equal(annotationItem(resized).x, 415);
  assert.equal(annotationItem(resized).y, 108);
  assert.deepEqual(p.semanticSpec.datasets[0].values, []);
});

test("data anchor inherits categorical and temporal source semantics", () => {
  const p = canvas([
    { category: "A", date: "2025-01-01" },
    { category: "B", date: "2025-01-03" }
  ])
    .createPointMark()
    .encodeX({ field: "category", fieldType: "nominal", scale: { reverse: true } })
    .encodeY({ field: "date", fieldType: "temporal", scale: { nice: false } })
    .createAnnotation({ text: "B", x: "B", y: "2025-01-02" });
  const layer = p.semanticSpec.layers.at(-1);
  assert.equal(layer.encoding.x.fieldType, "nominal");
  assert.equal(layer.encoding.y.fieldType, "temporal");
  assert.equal(layer.encoding.y.temporalUnit, undefined);
  assert.ok(Number.isFinite(annotationItem(p).x));
  assert.ok(Number.isFinite(annotationItem(p).y));
  assert.deepEqual(p.resolvedScales.x.domain, ["A", "B"]);
  assert.equal(p.semanticSpec.scales.find(scale => scale.id === "x").reverse, true);
});

test("mark-anchor layout replays displacement and removes its leader resource", () => {
  const source = canvas([{ x: 1, y: 1 }, { x: 1, y: 1 }])
    .createPointMark()
    .encodeX({ field: "x", scale: { domain: [0, 2] } })
    .encodeY({ field: "y", scale: { domain: [0, 2] } });
  const p = source.createAnnotation({
    text: "same",
    layout: { maxDisplacement: 30, leader: {} }
  });
  assert.ok(p.materializationConfigs.labelLayouts.annotation);
  assert.equal(p.graphicSpec.objects["annotation-label-leaders"].items.length, 1);
  const resized = p.editCanvas({ width: 600 });
  assert.equal(resized.graphicSpec.objects["annotation-label-leaders"].items.length, 1);
  const plain = resized.removeLabelLayout({ target: "annotation" });
  assert.equal(plain.materializationConfigs.labelLayouts?.annotation, undefined);
  assert.equal(plain.graphicSpec.objects["annotation-label-leaders"], undefined);
});

test("annotation branch and child errors reject without partial effects", () => {
  const source = canvas([{ x: 1, y: 2 }])
    .createPointMark()
    .encodeX({ field: "x" })
    .encodeY({ field: "y" });
  const before = JSON.stringify(source);
  for (const [options, pattern] of [
    [{}, /requires text/],
    [{ text: "note", x: 1 }, /requires both x and y/],
    [{ text: "note", x: 1, y: 2, space: "screen" }, /space must be data or plot/],
    [{ text: "note", x: 1, y: 2, data: "data" }, /uses source data and coordinate/],
    [{ text: "note", space: "plot", x: -0.1, y: 0.5 }, /finite numbers in \[0, 1\]/],
    [{ text: "note", space: "plot", x: 0.5, y: 0.5, source: "point" }, /does not accept source/],
    [{ text: "note", source: "point", coordinate: "main" }, /mark anchor accepts source/],
    [{ text: "note", layout: { target: "other" } }, /layout target is owned/],
    [{ text: "", x: 1, y: 2 }, /non-empty/],
    [{ text: "note", opacity: 2 }, /opacity/]
  ]) {
    assert.throws(() => source.createAnnotation(options), pattern);
    assert.equal(JSON.stringify(source), before);
  }

  const ambiguous = source
    .createPointMark({ id: "second", data: "data" })
    .encodeX({ target: "second", field: "x", scale: { id: "second-x" } })
    .encodeY({ target: "second", field: "y", scale: { id: "second-y" } })
    .createRuleMark({ id: "current", data: "data" });
  assert.throws(
    () => ambiguous.createAnnotation({ text: "note", x: 1, y: 2 }),
    /source is ambiguous/
  );
});
