import assert from "node:assert/strict";
import test from "node:test";
import { chart, hconcat } from "../../../../src/index.js";
import { chart as basicChart } from "../../../../src/basic.js";
import { serializeProgram, deserializeProgram, serializeGraphic, deserializeGraphic } from "../../../../src/persistence.js";
import { renderToSVG } from "../../../../src/renderers/svg.js";
import { decodeValue, encodeValue } from "../../../../src/persistence/codec.js";
import { assertEquivalentMeaning } from "../../../support/identity-equivalence.js";
const rows = [{ x: 0, y: 2, c: "A", r: "north", text: "First" }, { x: 1, y: 4, c: "B", r: "south", text: "Second" }];
const pattern = (extra = {}) => ({ type: "pattern", style: "cross", pitch: 12, strokeWidth: 2, phase: [-1, 2], foreground: "red", background: "#00f8", ...extra });
const radial = () => ({ type: "radial-gradient", center: { x: .5, y: .5 }, radius: .5,
  stops: [{ offset: 0, color: "red" }, { offset: 1, color: "blue" }] });
const base = (factory = chart) => factory().createCanvas({ width: 340, height: 260, margin: { left: 30, top: 20, right: 100, bottom: 30 } }).createData({ id: "rows", values: rows });
const recipes = [
  ["bar", "createBarMark", "editBarMark", p => p.encodeX({ field: "c", fieldType: "nominal" }).encodeY({ field: "y" })],
  ["point", "createPointMark", "editPointMark", p => p.encodeX({ field: "x" }).encodeY({ field: "y" })],
  ["rect", "createRectMark", "editRectMark", p => p.encodeX({ field: "c", fieldType: "nominal" }).encodeY({ field: "r", fieldType: "nominal" })],
  ["arc", "createArcMark", "editArcMark", p => p.encodeTheta({ field: "c", aggregate: "count" })],
  ["area", "createAreaMark", "editAreaMark", p => p.encodeX({ field: "x" }).encodeYRange({ lower: "y", upper: { datum: 0 } }).layoutSeries({ mode: "overlay" })],
  ["text", "createTextMark", "editTextMark", p => p.encodeX({ field: "x" }).encodeY({ field: "y" }).encodeText({ field: "text" })]
];

test("all filled mark owners normalize both paints and preserve creation/edit equivalence", () => {
  for (const fill of [pattern(), radial()]) for (const [id, create, edit, encode] of recipes) {
    const plain = encode(base()[create]());
    const created = encode(base()[create]({ fill }));
    const edited = plain[edit]({ fill });
    assertEquivalentMeaning(created.graphicSpec, edited.graphicSpec);
    const items = edited.graphicSpec.objects[id].items;
    assert.ok(items.length > 0, id);
    assert.ok(items.every(item => item.properties.fill.type === fill.type), id);
    if (fill.type === "pattern") {
      for (const item of items) assert.deepEqual(item.properties.fill.origin, { x: 41, y: 22 });
    } else for (const item of items) assert.deepEqual(item.properties.fill.focal, { x: .5, y: .5 });
    assert.ok(plain.graphicSpec.objects[id].items.every(item => typeof item.properties.fill === "string"));
    assert.match(renderToSVG(created), fill.type === "pattern" ? /<pattern/ : /<radialGradient/);
  }
});

test("pattern origins and text bounds are recomputed after size, scale and data changes", () => {
  for (const [id, create, edit, encode] of recipes.filter(([id]) => id !== "arc")) {
    const p = encode(base()[create]({ fill: pattern({ coordinateSpace: "object" }) }));
    const before = serializeProgram(p);
    const updates = [p.editCanvas({ width: 400 }), p.reviseData({ source: "rows", id: "changed", values: rows.map(row => ({ ...row, y: row.y + 2 })) })];
    for (const next of updates) {
      assert.ok(next.graphicSpec.objects[id].items.every(item => item.properties.fill.type === "pattern"));
      assert.deepEqual(deserializeProgram(serializeProgram(next)).graphicSpec, next.graphicSpec);
      assert.match(renderToSVG(next), /<pattern/);
    }
    assert.equal(serializeProgram(p), before);
    const radialProgram = p[edit]({ fill: radial() });
    assert.ok(radialProgram.graphicSpec.objects[id].items.every(item => item.properties.fill.type === "radial-gradient" && !Object.hasOwn(item.properties.fill, "phase")));
  }
});

test("structured paints survive color precedence, legend samples and selection restoration", () => {
  const area = base().createPointMark({ id: "area", fill: pattern(), opacity: .5 }).encodeX({ field: "x" }).encodeY({ field: "y" });
  const colored = area.encodeColor({ field: "c", fieldType: "nominal" });
  assert.ok(colored.graphicSpec.objects.area.items.every(item => typeof item.properties.fill === "string"));
  assert.ok(colored.removeEncoding({ target: "area", channel: "color" }).graphicSpec.objects.area.items.every(item => item.properties.fill === "#4c78a8"));
  assert.equal(colored.markConfigs.area.fill, undefined, "field reassignment retains the existing replacement contract");
  const point = base().createPointMark({ fill: pattern() }).encodeX({ field: "x" }).encodeY({ field: "y" }).encodeShape({ field: "c" }).createLegend({ channels: ["shape"], title: false });
  assert.ok(point.graphicSpec.objects.seriesLegendSymbolPoints.items.every(item => item.properties.fill.type === "pattern"));
  const selected = point.selectMarks({ id: "a", target: "point", field: "c", op: "eq", value: "A" }).highlightMarks({ selection: "a", color: "green", dimOthers: false });
  assert.deepEqual(selected.removeMarkHighlight({ selection: "a" }).graphicSpec, point.graphicSpec);
});

test("Text preserves multiline glyphs, concrete bounds, label movement and inherited paint", () => {
  const p = base().createTextMark({ fill: radial(), fontSize: 20, rotation: { value: 30, unit: "degrees" } }).encodeX({ field: "x" }).encodeY({ field: "y" }).encodeText({ value: "A\nB" });
  for (const item of p.graphicSpec.objects.text.items) {
    assert.equal(item.properties.lines.length, 2);
    assert.equal(item.properties.fillBounds.bottom - item.properties.fillBounds.top, 44);
  }
  assert.match(renderToSVG(p), /<tspan/);
  const point = base().createPointMark({ fill: pattern() }).encodeX({ field: "x" }).encodeY({ field: "y" });
  const labels = point.createMarkLabels({ source: "point", field: "text", inheritColor: "fill" });
  assert.ok(labels.graphicSpec.objects[labels.context.currentMark].items.every(item => item.properties.fill.type === "pattern" && item.properties.fillBounds));
});

test("Full and Basic paints round trip with graphic-only consumers and reject corrupt intent", () => {
  for (const factory of [chart, basicChart]) {
    const p = base(factory).createPointMark({ fill: pattern() }).encodeX({ field: "x" }).encodeY({ field: "y" });
    assert.equal(renderToSVG(deserializeGraphic(serializeGraphic(p))), renderToSVG(p));
  }
  const p = base().createPointMark({ fill: pattern() }).encodeX({ field: "x" }).encodeY({ field: "y" });
  const snapshot = serializeProgram(p), envelope = JSON.parse(snapshot), state = decodeValue(envelope.payload);
  state.materializationConfigs.marks.point.fill.pitch = 0;
  envelope.payload = encodeValue(state);
  assert.throws(() => deserializeProgram(JSON.stringify(envelope)), /pitch/);
  assert.equal(serializeProgram(p), snapshot);
});


test("label collision movement recomputes object paint origins and preserves plot origins", () => {
  for (const coordinateSpace of ["plot", "object"]) {
    const p = base().createTextMark({ fill: pattern({ coordinateSpace }), align: "center" })
      .encodeX({ datum: 1 }).encodeY({ datum: 1 }).encodeText({ field: "text" });
    const moved = p.layoutLabels({ maxDisplacement: 70 });
    assert.equal(moved.materializationConfigs.labelLayouts.text.resolution.displaced, 1);
    for (let i = 0; i < moved.graphicSpec.objects.text.items.length; i++) {
      const before = p.graphicSpec.objects.text.items[i].properties, after = moved.graphicSpec.objects.text.items[i].properties;
      assert.equal(after.fillBounds.left - before.fillBounds.left, after.x - before.x);
      assert.equal(after.fillBounds.top - before.fillBounds.top, after.y - before.y);
      assert.equal(after.fill.origin.x - before.fill.origin.x, coordinateSpace === "plot" ? 0 : after.x - before.x);
      assert.equal(after.fill.origin.y - before.fill.origin.y, coordinateSpace === "plot" ? 0 : after.y - before.y);
    }
    assert.deepEqual(deserializeProgram(serializeProgram(moved)).graphicSpec, moved.graphicSpec);
  }
});

test("facets, repeated fields and concatenation preserve paint frames and editable source intent", () => {
  for (const fill of [pattern(), radial()]) {
    const p = base().createPointMark({ id: "points", fill }).encodeX({ field: "x" }).encodeY({ field: "y" })
      .createMarkLabels({ id: "labels", source: "points", field: "text", fill });
    const before = serializeProgram(p);
    for (const composite of [p.facet({ field: "c" }), p.repeatCharts({ target: "points", channel: "y", fields: ["x", "y"] }), hconcat({ programs: [p, p] })]) {
      assert.match(renderToSVG(composite), fill.type === "pattern" ? /<pattern/ : /<radialGradient/);
      assert.deepEqual(deserializeProgram(serializeProgram(composite)).graphicSpec, composite.graphicSpec);
      assert.equal(renderToSVG(deserializeGraphic(serializeGraphic(composite))), renderToSVG(composite));
      const resized = composite.editCompositionLayout({ gap: 45 });
      assert.match(renderToSVG(resized), fill.type === "pattern" ? /<pattern/ : /<radialGradient/);
    }
    assert.equal(serializeProgram(p), before);
  }
});

test("conditional opacity and parameter replay preserve structured fills for supported owners", () => {
  const when = { version: 2, registry: "standard@1", root: { type: "parameter", id: "enabled" } };
  for (const fill of [pattern(), radial()]) for (const [id, create, , encode] of recipes.filter(([id]) => !["arc", "text"].includes(id))) {
    const plain = encode(base().createParameter({ id: "enabled", value: true })[create]({ fill }));
    const conditional = plain.encodeOpacity({ conditions: [{ when, value: { value: .25 } }], otherwise: { value: 1 } });
    assert.ok(conditional.graphicSpec.objects[id].items.every(item => item.properties.fill.type === fill.type && item.properties.opacity === .25));
    const changed = conditional.editParameter({ target: "enabled", value: false });
    assert.ok(changed.graphicSpec.objects[id].items.every(item => item.properties.fill.type === fill.type && item.properties.opacity === 1));
    assert.deepEqual(changed.graphicSpec.objects[id].items.map(item => item.identity), conditional.graphicSpec.objects[id].items.map(item => item.identity));
    assert.deepEqual(deserializeProgram(serializeProgram(changed)).graphicSpec, changed.graphicSpec);
    assert.match(renderToSVG(changed), fill.type === "pattern" ? /<pattern/ : /<radialGradient/);
  }
});

test("Rect conditional appearances replace pending properties before final concrete validation", () => {
  const when = { version: 2, registry: "standard@1", root: { type: "parameter", id: "enabled" } };
  for (const [method, property, first, second] of [
    ["encodeColor", "fill", "red", "blue"], ["encodeStroke", "stroke", "red", "blue"],
    ["encodeOpacity", "opacity", .25, .75], ["encodeStrokeWidth", "strokeWidth", 2, 4]
  ]) {
    const p = base().createParameter({ id: "enabled", value: true }).createRectMark({ fill: pattern() })
      .encodeX({ field: "c", fieldType: "nominal" }).encodeY({ field: "r", fieldType: "nominal" });
    const conditional = p[method]({ conditions: [{ when, value: { value: first } }], otherwise: { value: second } });
    assert.equal(conditional.graphicSpec.objects.rect.items.length, 2);
    assert.ok(conditional.graphicSpec.objects.rect.items.every(item => item.properties[property] === first));
    const changed = conditional.editParameter({ target: "enabled", value: false });
    assert.ok(changed.graphicSpec.objects.rect.items.every(item => item.properties[property] === second));
    assert.deepEqual(deserializeProgram(serializeProgram(changed)).graphicSpec, changed.graphicSpec);
    assert.equal(p.graphicSpec.objects.rect.items[0].properties.fill.type, "pattern");
  }
});

test("conditional positions and text content refresh object paint frames and attached labels", () => {
  const when = { version: 2, registry: "standard@1", root: { type: "parameter", id: "enabled" } };
  const condition = (value, otherwise) => ({ conditions: [{ when, value }], otherwise });
  for (const fill of [pattern({ coordinateSpace: "object" }), radial()]) {
    const p = base().createParameter({ id: "enabled", value: true }).createPointMark({ id: "points", fill })
      .encodeX(condition({ field: "x", scale: { domain: [0, 2] } }, { field: "x", scale: { domain: [0, 4] } }))
      .encodeY({ field: "y" }).encodePointRadius(condition({ value: 10 }, { value: 20 }))
      .createMarkLabels({ id: "labels", source: "points", field: "text", inheritColor: "fill" });
    const changed = p.editParameter({ target: "enabled", value: false });
    const geometry = item => ({ x: item.properties.x, y: item.properties.y, radius: item.properties.radius, commands: item.properties.commands });
    assert.notDeepEqual(changed.graphicSpec.objects.points.items.map(geometry), p.graphicSpec.objects.points.items.map(geometry));
    assert.ok(changed.graphicSpec.objects.labels.items.every(item => item.properties.fill.type === fill.type && item.properties.fillBounds));
    assert.deepEqual(deserializeProgram(serializeProgram(changed)).graphicSpec, changed.graphicSpec);
    const text = base().createParameter({ id: "enabled", value: true }).createTextMark({ fill, align: "center" })
      .encodeX({ field: "x" }).encodeY({ field: "y" })
      .encodeText(condition({ value: "Wide text" }, { field: "text" })).encodeDx(condition({ value: 10 }, { value: 0 }));
    const moved = text.editParameter({ target: "enabled", value: false });
    assert.notDeepEqual(moved.graphicSpec.objects.text.items[0].properties.fillBounds, text.graphicSpec.objects.text.items[0].properties.fillBounds);
    assert.deepEqual(deserializeProgram(serializeProgram(moved)).graphicSpec, moved.graphicSpec);
    assert.match(renderToSVG(moved), fill.type === "pattern" ? /<pattern/ : /<radialGradient/);
  }
});
