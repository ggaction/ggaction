import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";
import { renderToSVG } from "../../../../src/renderers/svg.js";
import { renderToPNGBuffer } from "../../../../src/renderers/png.js";

const values = [{ x: 1, y: 2, group: "", amount: 1 },
  { x: 2, y: 3, group: "B", amount: 4 }, { x: 3, y: 4, group: "C", amount: 7 }];
function source(kind) {
  const base = chart().createCanvas({ width: 1200, height: 1000, margin: 300 }).createData({ values });
  if (kind === "strokeWidth") return base.createLinePlot({ x: "x", y: "y", groupBy: "group", guides: false }).encodeStrokeWidth({ field: "amount" });
  const p = base.createScatterPlot({ x: "x", y: "y", guides: false });
  if (kind === "series") return p.encodeShape({ field: "group" });
  if (kind === "size") return p.encodeSize({ field: "amount" });
  if (kind === "opacity") return p.encodeOpacity({ field: "amount" });
  if (kind.startsWith("stroke")) return p.encodeStroke({ field: kind === "stroke" ? "group" : "amount",
    fieldType: kind === "stroke" ? "nominal" : "quantitative",
    ...(kind === "strokeInterval" ? { scale: { type: "quantize", range: ["red", "blue"] } } : {}) });
  const colored = p.encodeColor({ field: ["color", "combined"].includes(kind) ? "group" : "amount",
    fieldType: ["color", "combined"].includes(kind) ? "nominal" : "quantitative",
    ...(kind === "interval" ? { scale: { type: "quantize", range: ["red", "blue"] } } : {}) });
  return kind === "combined" ? colored.encodeSize({ field: "amount" }) : colored;
}
const categorical = ["color", "series", "stroke", "combined"];
const channel = kind => kind === "series" ? "shape" : kind === "stroke" ? "stroke" : "color";
const prefix = kind => kind === "combined" ? "color" : kind;
const labels = (p, kind) => p.graphicSpec.objects[prefix(kind) + "LegendLabels"].items;
const map = [{ value: "", label: "" }, { value: "B", label: "Bee" }];

test("empty mapped categorical labels omit only text and retain indexed sample positions", () => {
  for (const kind of categorical) for (const position of ["right", "left", "top", "bottom"]) {
    const before = source(kind).createLegend({ position, title: false });
    const frozen = serializeProgram(before), input = structuredClone(map);
    const p = before.editLegendBlock({ target: "scatterPlot", channel: channel(kind), labelMap: input });
    assert.deepEqual(labels(p, kind).map(i => i.properties.text), ["Bee", "C"], `${kind}/${position}`);
    if (["right", "left"].includes(position)) {
      assert.equal(labels(p, kind)[1].properties.y - labels(p, kind)[0].properties.y,
        labels(before, kind)[2].properties.y - labels(before, kind)[1].properties.y);
      assert.equal(labels(p, kind)[0].properties.x, labels(p, kind)[1].properties.x);
    }
    for (const [id, graphic] of Object.entries(before.graphicSpec.objects))
      if (!id.endsWith("LegendLabels")) {
        if (!id.toLowerCase().includes("legend")) assert.deepEqual(p.graphicSpec.objects[id], graphic, id);
        else if (id.includes("LegendSymbol")) assert.equal(p.graphicSpec.objects[id].items.length, graphic.items.length);
      }
    assert.deepEqual(p.semanticSpec, before.semanticSpec);
    assert.deepEqual(p.resolvedScales, before.resolvedScales);
    assert.deepEqual(p.graphicSpec.order, before.graphicSpec.order);
    assert.equal(serializeProgram(before), frozen);
    input[0].label = "Changed";
    assert.deepEqual(labels(p, kind).map(i => i.properties.text), ["Bee", "C"]);
    assert.doesNotThrow(() => renderToSVG(p));
    assert.deepEqual(p.editLegendBlock({ target: "scatterPlot", channel: channel(kind), labelMap: "auto" }).graphicSpec,
      before.graphicSpec);
  }
});

test("all-empty labels preserve symbols through persistence, resize, edits and composition replay", () => {
  for (const kind of categorical) {
    const before = source(kind).createLegend({ title: false });
    const p = before.editLegendBlock({ target: "scatterPlot", channel: channel(kind),
      labelMap: values.map(row => ({ value: row.group, label: "" })) });
    assert.deepEqual(labels(p, kind), []);
    assert.deepEqual(deserializeProgram(serializeProgram(p)).graphicSpec, p.graphicSpec);
    assert.deepEqual(p.rematerializeLegend().graphicSpec, p.graphicSpec);
    assert.deepEqual(labels(p.editCanvas({ width: 1300 }), kind), []);
    assert.deepEqual(labels(p.editLegendLabels({ color: "red" }), kind), []);
    for (const composed of [p.facet({ field: "group", guides: { legend: "shared" } }),
      p.repeatCharts({ channel: "x", fields: ["x", "y"], guides: { legend: "shared" } })]) {
      assert.doesNotThrow(() => renderToSVG(composed));
      assert.deepEqual(deserializeProgram(serializeProgram(composed)).graphicSpec, composed.graphicSpec);
      assert.doesNotThrow(() => renderToSVG(composed.editCompositionLayout({ gap: 20 })));
    }
  }
});

test("all eleven legend families render without empty concrete text, including PNG", async () => {
  for (const kind of [...categorical, "size", "gradient", "interval", "strokeGradient", "strokeInterval", "opacity", "strokeWidth"]) {
    let p = source(kind).createLegend({ title: false });
    if (categorical.includes(kind)) p = p.editLegendBlock({ target: "scatterPlot", channel: channel(kind), labelMap: map });
    const svg = renderToSVG(p);
    assert.match(svg, /<svg/);
    const png = await renderToPNGBuffer(p, { pixelRatio: 0.25 });
    assert.equal(png.width, 300);
    assert.equal(png.height, 250);
    assert.ok(png.bytes > 0);
    assert.deepEqual(deserializeProgram(serializeProgram(p)).graphicSpec, p.graphicSpec);
  }
});
