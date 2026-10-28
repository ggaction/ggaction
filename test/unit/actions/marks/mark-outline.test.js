import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { chart as basicChart } from "../../../../src/basic.js";
import { serializeProgram, deserializeProgram, serializeGraphic, deserializeGraphic } from "../../../../src/persistence.js";
import { renderToSVG } from "../../../../src/renderers/svg.js";
import { assertEquivalentMeaning } from "../../../support/identity-equivalence.js";
const outline = { color: "white", width: 8 };
const rows = [{ x: 0, y: 2, c: "A", r: "north", text: "First" }, { x: 1, y: 4, c: "B", r: "south", text: "Second" }];
const base = (factory = chart) => factory().createCanvas({ width: 340, height: 260, margin: { left: 30, top: 30, bottom: 30, right: 100 } }).createData({ id: "rows", values: rows });
const recipes = [
  ["bar", "createBarMark", "editBarMark", p => p.encodeX({ field: "c", fieldType: "nominal" }).encodeY({ field: "y" })],
  ["point", "createPointMark", "editPointMark", p => p.encodeX({ field: "x" }).encodeY({ field: "y" })],
  ["rect", "createRectMark", "editRectMark", p => p.encodeX({ field: "c", fieldType: "nominal" }).encodeY({ field: "r", fieldType: "nominal" })],
  ["arc", "createArcMark", "editArcMark", p => p.encodeTheta({ field: "c", aggregate: "count" })],
  ["area", "createAreaMark", "editAreaMark", p => p.encodeX({ field: "x" }).encodeYRange({ lower: "y", upper: { datum: 0 } }).layoutSeries({ mode: "overlay" })],
  ["text", "createTextMark", "editTextMark", p => p.encodeX({ field: "x" }).encodeY({ field: "y" }).encodeText({ field: "text" })]
];

test("filled owners create and edit outlines without changing identity or ordinary stroke intent", () => {
  for (const [id, create, edit, encode] of recipes) {
    const plain = encode(base()[create]()), before = serializeProgram(plain);
    const edited = plain[edit]({ outline }), created = encode(base()[create]({ outline }));
    assertEquivalentMeaning(created.graphicSpec, edited.graphicSpec);
    assert.deepEqual(edited.graphicSpec.objects[id].items.map(item => item.identity), plain.graphicSpec.objects[id].items.map(item => item.identity));
    assert.ok(edited.graphicSpec.objects[id].items.every(item => item.properties.outline.width === 8), id);
    assert.equal(serializeProgram(plain), before);
    assertEquivalentMeaning(edited[edit]({ outline: false }).graphicSpec, plain.graphicSpec);
    assert.match(renderToSVG(edited), /paint-order="stroke fill"/);
    assert.equal(renderToSVG(deserializeGraphic(serializeGraphic(edited))), renderToSVG(edited));
    assert.deepEqual(deserializeProgram(serializeProgram(edited)).graphicSpec, edited.graphicSpec);
    const revised = edited.reviseData({ source: "rows", id: "revised", values: rows.map(row => ({ ...row, y: row.y + 1 })) });
    assert.ok(revised.graphicSpec.objects[id].items.every(item => item.properties.outline.width === 8), id);
  }
});

test("outline patches preserve omission, explicit zero and atomic stroke conflicts", () => {
  for (const [id, create, edit, encode] of recipes) {
    const p = encode(base()[create]({ outline }));
    const changed = p[edit]({ opacity: .7 });
    assert.ok(changed.graphicSpec.objects[id].items.every(item => item.properties.outline.width === 8));
    const zero = p[edit]({ outline: { color: "red", width: 0 } });
    assert.ok(zero.graphicSpec.objects[id].items.every(item => item.properties.outline.width === 0));
    const snapshot = serializeProgram(p);
    assert.throws(() => p[edit]({ outline, stroke: "black" }));
    assert.equal(serializeProgram(p), snapshot);
    if (id !== "text") {
      const stroked = encode(base()[create]({ stroke: "purple", strokeWidth: 3 }));
      const outlined = stroked[edit]({ outline });
      assertEquivalentMeaning(outlined[edit]({ outline: false }).graphicSpec, stroked.graphicSpec);
    }
  }
});

test("Basic creation and attached text labels accept the same immutable outline contract", () => {
  for (const [id, create, , encode] of recipes.filter(([id]) => ["bar", "point", "rect"].includes(id))) {
    const p = encode(base(basicChart)[create]({ outline }));
    assert.ok(p.graphicSpec.objects[id].items.every(item => item.properties.outline.width === 8), id);
  }
  const p = base().createPointMark().encodeX({ field: "x" }).encodeY({ field: "y" }).createMarkLabels({ field: "text", outline });
  assert.ok(p.graphicSpec.objects[p.context.currentMark].items.every(item => item.properties.outline.width === 8));
});

test("outlined legend samples and selection highlights preserve edge precedence and exact restoration", () => {
  for (const [id, create, edit, encode] of recipes.filter(([id]) => ["bar", "point", "rect", "area", "arc"].includes(id))) {
    let p = encode(base()[create]({ outline }));
    if (id === "point") p = p.encodeShape({ field: "c" }).createLegend({ channels: ["shape"], title: false });
    if (id === "point") {
      assert.ok(p.graphicSpec.objects.seriesLegendSymbolPoints.items.every(item => item.properties.outline.width === 8));
      const removed = p[edit]({ outline: false });
      assert.ok(removed.graphicSpec.objects.seriesLegendSymbolPoints.items.every(item => item.properties.outline === undefined));
    }
    const selected = p.selectMarks({ id: "chosen", target: id, rows: { data: "rows", indices: [0] } });
    const highlighted = selected.highlightMarks({ selection: "chosen", stroke: "red", strokeWidth: 2, dimOthers: false });
    assert.ok(highlighted.graphicSpec.objects[id].items.some(item => item.properties.stroke === "red" && item.properties.outline === undefined), id);
    assert.deepEqual(highlighted.removeMarkHighlight({ selection: "chosen" }).graphicSpec, p.graphicSpec);
    if (id === "point") {
      const shaped = selected.highlightMarks({ selection: "chosen", shape: "square", dimOthers: false });
      assert.ok(shaped.graphicSpec.objects[id].items.every(item => item.properties.outline.width === 8));
    }
  }
});

test("point packing and jitter reserve the visible outline width before geometry materialization", () => {
  const seed = chart().createCanvas({ width: 200, height: 160, margin: 20 })
    .createData({ values: [{ id: "a", c: "A", y: 2 }, { id: "b", c: "A", y: 2 }, { id: "c", c: "A", y: 2 }] })
    .createPointMark({ outline, stroke: false }).encodePointRadius({ value: 6 })
    .encodeX({ field: "c", fieldType: "nominal" }).encodeY({ field: "y", scale: { domain: [0, 4] } });
  const packed = seed.packPoints({ channel: "x", key: "id", padding: 0, maxOffset: { pixels: 60 } });
  const xs = packed.graphicSpec.objects.point.items.map(item => item.properties.x).sort((a, b) => a - b);
  assert.ok(xs[1] - xs[0] >= 20 && xs[2] - xs[1] >= 20);
  const removed = packed.editPointMark({ outline: false });
  assert.ok(Math.max(...removed.graphicSpec.objects.point.items.map(item => item.properties.x)) - Math.min(...removed.graphicSpec.objects.point.items.map(item => item.properties.x)) < xs[2] - xs[0]);
  const jittered = seed.jitterPoints({ channel: "x", seed: 17, key: "id", maxOffset: { pixels: 200 } });
  for (const item of jittered.graphicSpec.objects.point.items) {
    assert.ok(item.properties.x >= 30 && item.properties.x <= 170);
  }
});

test("outlines follow conditional opacity, position, text and parameter replay without changing lineage", () => {
  const when = { version: 2, registry: "standard@1", root: { type: "parameter", id: "enabled" } };
  const condition = (value, otherwise) => ({ conditions: [{ when, value }], otherwise });
  for (const [id, create, , encode] of recipes.filter(([id]) => !["arc", "text"].includes(id))) {
    const p = encode(base().createParameter({ id: "enabled", value: true })[create]({ outline }));
    const conditional = p.encodeOpacity(condition({ value: .25 }, { value: 1 }));
    const changed = conditional.editParameter({ target: "enabled", value: false });
    assert.ok(changed.graphicSpec.objects[id].items.every(item => item.properties.opacity === 1 && item.properties.outline.width === 8));
    assert.deepEqual(changed.graphicSpec.objects[id].items.map(item => item.identity), conditional.graphicSpec.objects[id].items.map(item => item.identity));
  }
  const text = base().createParameter({ id: "enabled", value: true }).createTextMark({ outline, lineJoin: "round", miterLimit: 2 })
    .encodeX({ field: "x" }).encodeY({ field: "y" }).encodeText(condition({ value: "A\nB" }, { field: "text" }))
    .encodeDx(condition({ value: 10 }, { value: 0 }));
  const changed = text.editParameter({ target: "enabled", value: false });
  assert.equal(changed.graphicSpec.objects.text.items[0].properties.text, "First");
  assert.equal(changed.graphicSpec.objects.text.items[0].properties.x, text.graphicSpec.objects.text.items[0].properties.x - 10);
  assert.ok(changed.graphicSpec.objects.text.items.every(item => item.properties.outline.width === 8 && item.properties.lineJoin === "round" && item.properties.miterLimit === 2));
  assert.deepEqual(deserializeProgram(serializeProgram(changed)).graphicSpec, changed.graphicSpec);
});

test("facet, repeat, composition and label collision replay retain outline ownership", async () => {
  const { hconcat } = await import("../../../../src/index.js");
  const p = base().createPointMark({ id: "points", outline }).encodeX({ field: "x" }).encodeY({ field: "y" })
    .createMarkLabels({ id: "labels", source: "points", field: "text", outline, align: "center" });
  for (const composite of [p.facet({ field: "c" }), p.repeatCharts({ target: "points", channel: "y", fields: ["x", "y"] }), hconcat({ programs: [p, p] })]) {
    const resized = composite.editCompositionLayout({ gap: 45 });
    assert.match(renderToSVG(resized), /paint-order="stroke fill"/);
    assert.deepEqual(deserializeProgram(serializeProgram(resized)).graphicSpec, resized.graphicSpec);
    assert.equal(renderToSVG(deserializeGraphic(serializeGraphic(resized))), renderToSVG(resized));
    for (const child of Object.values(resized.children)) for (const id of ["points", "labels"]) {
      assert.ok(child.graphicSpec.objects[id].items.every(item => item.properties.outline.width === 8));
    }
  }
  const text = base().createTextMark({ outline, align: "center" }).encodeX({ datum: 1 }).encodeY({ datum: 1 }).encodeText({ field: "text" });
  const moved = text.layoutLabels({ maxDisplacement: 70 });
  assert.ok(moved.graphicSpec.objects.text.items.every(item => item.properties.outline.width === 8));
  assert.ok(moved.materializationConfigs.labelLayouts.text.resolution.displaced > 0);
});

test("stored outline validation rejects corrupt closed intent and preserves valid text details", async () => {
  const { decodeValue, encodeValue } = await import("../../../../src/persistence/codec.js");
  const p = base().createPointMark({ outline }).encodeX({ field: "x" }).encodeY({ field: "y" });
  const snapshot = serializeProgram(p);
  for (const corrupted of [{ color: "red", width: -1 }, { width: 8 }, false]) {
    const envelope = JSON.parse(snapshot), state = decodeValue(envelope.payload);
    state.materializationConfigs.marks.point.outline = corrupted;
    envelope.payload = encodeValue(state);
    if (corrupted === false) assert.ok(deserializeProgram(JSON.stringify(envelope)));
    else assert.throws(() => deserializeProgram(JSON.stringify(envelope)), /outline/i);
  }
  const misplaced = JSON.parse(snapshot), misplacedState = decodeValue(misplaced.payload);
  misplacedState.materializationConfigs.marks.point.barAppearance = { outline };
  misplaced.payload = encodeValue(misplacedState);
  assert.throws(() => deserializeProgram(JSON.stringify(misplaced)), /unsupported outline owner/);
  const line = base().createLineMark().encodeX({ field: "x" }).encodeY({ field: "y" });
  const envelope = JSON.parse(serializeProgram(line)), state = decodeValue(envelope.payload);
  state.materializationConfigs.marks.line = { ...state.materializationConfigs.marks.line, outline };
  envelope.payload = encodeValue(state);
  assert.throws(() => deserializeProgram(JSON.stringify(envelope)), /unsupported outline owner/);
  assert.equal(serializeProgram(p), snapshot);
});

test("reference bands and Text facades forward their inherited outline contract", () => {
  const p = base().createPointMark().encodeX({ field: "x" }).encodeY({ field: "y" });
  const literal = p.createReferenceBand({ y: [2, 3], outline });
  assert.ok(literal.graphicSpec.objects.referenceBand.items.every(item => item.properties.outline.width === 8));
  const statistical = p.createStatisticalReference({ source: "point", axis: "y", statistics: [{ op: "min" }, { op: "max" }], outline });
  assert.ok(statistical.graphicSpec.objects.statisticalReference.items.every(item => item.properties.outline.width === 8));
  const annotation = p.createAnnotation({ text: "Note", anchor: "plot-center", outline, lineJoin: "round" });
  assert.ok(annotation.graphicSpec.objects.annotation.items.every(item => item.properties.outline.width === 8 && item.properties.lineJoin === "round"));
});
