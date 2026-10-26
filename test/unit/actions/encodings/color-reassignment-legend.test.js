import test from "node:test";
import assert from "node:assert/strict";
import { chart } from "../../../../src/index.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";

const rows = Array.from({ length: 18 }, (_, i) => ({ category: `Category ${i}`, row: "row", value: i + 1 }));
function heatmap() {
  return chart().createCanvas({ plot: { width: 180, height: 180 }, margin: 60 })
    .createData({ id: "data", values: rows })
    .createHeatmap({ id: "plot", x: "category", y: "row", color: { field: "value", fieldType: "quantitative" },
      guides: { axes: false, grid: false, legend: {} } })
    .editColorScale({ target: "plot", palette: "cividis" });
}
const fills = (p, id = "plot") => p.graphicSpec.objects[id].items.map(item => item.properties.fill);

for (const scale of [{ palette: "tableau10" }, { type: "ordinal", palette: "tableau10" },
  { id: "new-color", type: "ordinal", palette: "tableau10" }]) {
  test(`heatmap categorical color and overflowing legend change atomically ${JSON.stringify(scale)}`, () => {
    const before = heatmap();
    const saved = serializeProgram(before);
    const p = before.encodeColor({ target: "plot", field: "category", scale });
    const color = p.semanticSpec.layers.find(layer => layer.id === "plot").encoding.color;
    const resolved = p.resolvedScales[color.scale];
    assert.equal(resolved.type, "ordinal");
    assert.deepEqual(resolved.domain, rows.map(row => row.category));
    assert.deepEqual(fills(p), rows.map((_, i) => resolved.range[i % resolved.range.length]));
    assert.equal(p.guideConfigs.legend.gradient, undefined);
    assert.equal(p.guideConfigs.legend.color.target, "plot");
    assert.equal(p.guideConfigs.legend.color.scales[0], color.scale);
    assert.equal(p.graphicSpec.objects.colorLegendSymbols.items.length, rows.length);
    assert.ok(p.graphicSpec.objects.canvas.properties.height > before.graphicSpec.objects.canvas.properties.height);
    assert.equal(serializeProgram(before), saved);
    assert.deepEqual(deserializeProgram(serializeProgram(p)).graphicSpec, p.graphicSpec);
    for (const id of [color.scale, "new-continuous-color"]) {
      const back = p.encodeColor({ target: "plot", field: "value", fieldType: "quantitative", scale: { id, palette: "cividis" } });
      assert.equal(back.guideConfigs.legend.color, undefined);
      assert.equal(back.guideConfigs.legend.gradient.scale, id);
      assert.deepEqual(fills(back), fills(before));
    }
  });
}

test("changing one shared color consumer preserves the sibling scale and colors", () => {
  const before = heatmap().createHeatmap({ id: "peer", x: "category", y: "row",
    color: { field: "value", fieldType: "quantitative", scale: { id: "color" } }, guides: false });
  const oldScale = before.semanticSpec.scales.find(scale => scale.id === "color");
  const p = before.encodeColor({ target: "plot", field: "category", scale: { palette: "set1" } });
  assert.equal(p.semanticSpec.layers.find(layer => layer.id === "plot").encoding.color.scale, "plot-color-nominal");
  assert.deepEqual(p.semanticSpec.scales.find(scale => scale.id === "color"), oldScale);
  assert.deepEqual(fills(p, "peer"), fills(before, "peer"));
  assert.equal(p.guideConfigs.legend.color.scales[0], "plot-color-nominal");
});

test("new scale IDs retain compatible legend styles and reject incompatible family settings", () => {
  const before = heatmap().editLegend({ target: "plot", labels: { color: "navy", fontSize: 11 }, title: "My legend" });
  const p = before.encodeColor({ target: "plot", field: "category", scale: { id: "new-color" } });
  assert.equal(p.guideConfigs.legend.color.title, "My legend");
  assert.equal(p.guideConfigs.legend.color.labels.color, "navy");
  assert.equal(p.guideConfigs.legend.color.labels.fontSize, 11);
  const custom = before.editLegend({ target: "plot", gradient: { length: 130 } });
  const saved = serializeProgram(custom);
  assert.throws(() => custom.encodeColor({ target: "plot", field: "category", scale: { id: "new-color" } }), /custom family settings/);
  assert.equal(serializeProgram(custom), saved);
});

test("color reassignment leaves a customized stroke legend on its shared prior scale", () => {
  const before = heatmap().encodeStroke({ target: "plot", field: "value", fieldType: "quantitative", scale: { id: "color" } })
    .createLegend({ target: "plot", channels: ["stroke"] })
    .editLegend({ target: "plot", channel: "stroke", gradient: { length: 130 } });
  const p = before.encodeColor({ target: "plot", field: "category", scale: { palette: "set1" } });
  assert.equal(p.guideConfigs.legend.strokeGradient.gradient.length, 130);
  assert.equal(p.guideConfigs.legend.strokeGradient.scale, "color");
  assert.equal(p.guideConfigs.legend.color.scales[0], "plot-color-nominal");
  assert.deepEqual(p.graphicSpec.objects.plot.items.map(item => item.properties.stroke),
    before.graphicSpec.objects.plot.items.map(item => item.properties.stroke));
});
