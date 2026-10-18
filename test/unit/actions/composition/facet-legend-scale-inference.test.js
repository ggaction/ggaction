import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { renderToSVG } from "../../../../src/renderers/svg.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";
import { prepareSharedFacetLegend } from "../../../../src/materialization/facetGuides/preparation.js";
import { resolveConcreteGraphicBounds } from "../../../../src/grammar/schemas/graphicBounds.js";

const rows = Object.freeze([
  Object.freeze({ x: 0, y: 0, value: 0, group: "A" }),
  Object.freeze({ x: 1, y: 1, value: 1, group: "B" }),
  Object.freeze({ x: 2, y: 2, value: 0.25, group: "A" }),
  Object.freeze({ x: 3, y: 3, value: 0.75, group: "B" })
]);
const continuous = { domain: [0, 1], range: ["red", "blue"], interpolate: "rgb" };
const interval = { type: "threshold", domain: [0.5], range: ["red", "blue"] };
const numeric = scale => ({ field: "value", fieldType: "quantitative", scale });
function base() {
  return chart().createCanvas({ width: 800, height: 800, margin: 200 })
    .createData({ values: rows }).createScatterPlot({ x: "x", y: "y", guides: false });
}
const variants = [
  ["continuous pair", p => p.encodeColor(numeric(continuous)).encodeStroke(numeric(continuous)), ["gradient", "strokeGradient"]],
  ["continuous and shape", p => p.encodeColor(numeric(continuous)).encodeShape({ field: "group" }), ["series", "gradient"]],
  ["ordinal and continuous", p => p.encodeColor({ field: "group" }).encodeStroke(numeric(continuous)), ["color", "strokeGradient"]],
  ["numeric pair and shape", p => p.encodeColor(numeric(continuous)).encodeStroke(numeric(continuous)).encodeShape({ field: "group" }), ["series", "gradient", "strokeGradient"]],
  ["interval pair", p => p.encodeColor(numeric(interval)).encodeStroke(numeric(interval)), ["interval", "strokeInterval"]],
  ["ordinal pair", p => p.encodeColor({ field: "group" }).encodeStroke({ field: "group" }), ["series"]]
];

test("inferred facet legends retain independent numeric owners and existing ordinal combinations", () => {
  for (const [name, build, kinds] of variants) {
    const unit = build(base()), before = serializeProgram(unit);
    const p = unit.facet({ field: "group", guides: { legend: "shared" } });
    assert.deepEqual(Object.keys(p.guideConfigs.legend), kinds, name);
    const prepared = prepareSharedFacetLegend(p);
    assert.equal(prepared.inferred, true, name);
    const configs = prepared.source.guideConfigs.legend;
    for (const [kind, config] of Object.entries(configs)) {
      assert.equal(config.target, "scatterPlot", `${name}/${kind}`);
      assert.ok(prepared.roots.length > 0);
    }
    for (const child of Object.values(p.children)) {
      assert.equal(child.graphicSpec.objects.canvas.properties.width, 800);
      assert.equal(child.graphicSpec.objects.canvas.properties.height, 800);
      assert.deepEqual(child.materializationConfigs.canvas.margin, unit.materializationConfigs.canvas.margin);
      assert.deepEqual(child.guideConfigs.legend ?? {}, {});
      assert.deepEqual(child.semanticSpec.layers[0].encoding, unit.semanticSpec.layers[0].encoding);
    }
    assert.equal(serializeProgram(unit), before, name);
    assert.deepEqual(p.semanticSpec.datasets[0].values, rows, name);
    assert.deepEqual(deserializeProgram(serializeProgram(p)).graphicSpec, p.graphicSpec, name);
  }
});

test("both automatic gradients map numeric samples and retain compact labels after lane creation", () => {
  const source = variants[0][1](base());
  const p = source.facet({ field: "group", guides: { legend: "shared" } });
  const owner = prepareSharedFacetLegend(p).source;
  for (const prefix of ["colorGradient", "strokeGradient"]) {
    assert.deepEqual(owner.graphicSpec.objects[`${prefix}Labels`].items.map(i => i.properties.text), ["0", "0.25", "0.5", "0.75", "1"]);
    const strips = owner.graphicSpec.objects[`${prefix}Strips`].items;
    const paints = strips.map(i => i.properties[prefix === "colorGradient" ? "fill" : "stroke"]);
    // Sixty native strips sample the center of each equal interval, not endpoints.
    const expected = Array.from({ length: 60 }, (_, i) => {
      const red = Math.round(255 * (1 - (i + 0.5) / 60));
      const blue = Math.round(255 * (i + 0.5) / 60);
      return `#${red.toString(16).padStart(2, "0")}00${blue.toString(16).padStart(2, "0")}`;
    });
    assert.equal(expected[0], "#fd0002");
    assert.equal(expected.at(-1), "#0200fd");
    assert.deepEqual(paints, expected.toReversed());
  }
  const a = resolveConcreteGraphicBounds(owner.graphicSpec, "colorGradientStrips");
  const b = resolveConcreteGraphicBounds(owner.graphicSpec, "strokeGradientStrips");
  assert.ok(a.bottom < b.top);
  assert.match(renderToSVG(p), /#82007d/);
});

test("inferred numeric facet owners replay layout and guide policies without becoming child guides", () => {
  const unit = variants[0][1](base());
  const p = unit.facet({ field: "group", guides: { legend: "shared" } });
  const before = serializeProgram(p);
  const changed = p.editCompositionLayout({ gap: 32, padding: 8 });
  assert.deepEqual(Object.keys(changed.guideConfigs.legend), ["gradient", "strokeGradient"]);
  const reset = changed.editFacetGuides({ legend: false }).editFacetGuides({ legend: "shared" });
  assert.deepEqual(reset.graphicSpec, changed.graphicSpec);
  assert.equal(serializeProgram(p), before);
});

test("independent numeric scales and ambiguous automatic owners reject without mutating the source", () => {
  const unit = base().encodeColor({ field: "value", fieldType: "quantitative" })
    .encodeStroke({ field: "value", fieldType: "quantitative" });
  const before = serializeProgram(unit);
  assert.throws(() => unit.facet({ field: "group", scales: { color: "independent", stroke: "independent" }, guides: { legend: "shared" } }), /incompatible/);
  assert.equal(serializeProgram(unit), before);
  const ambiguous = unit.createScatterPlot({ id: "second", x: "x", y: "y", guides: false })
    .encodeColor({ field: "value", fieldType: "quantitative" });
  const snapshot = serializeProgram(ambiguous);
  assert.throws(() => ambiguous.facet({ field: "group", guides: { legend: "shared" } }), /unambiguous|compatible color field/);
  assert.equal(serializeProgram(ambiguous), snapshot);
});
