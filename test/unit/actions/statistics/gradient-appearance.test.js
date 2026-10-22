import test from "node:test";
import assert from "node:assert/strict";
import { chart } from "../../../../src/index.js";
import { renderToSVG } from "../../../../src/renderers/svg.js";

const rows = [
  { group: "A", value: 1, panel: "P" }, { group: "A", value: 3, panel: "P" },
  { group: "B", value: 4, panel: "P" }, { group: "B", value: 8, panel: "P" },
  { group: "A", value: 5, panel: "Q" }, { group: "A", value: 7, panel: "Q" },
  { group: "B", value: 6, panel: "Q" }, { group: "B", value: 10, panel: "Q" }
];
const build = horizontal => chart().createCanvas().createData({ id: "data", values: rows })
  .createGradientPlot({ id: "plot", data: "data", guides: false,
    x: horizontal ? { field: "value" } : { field: "group", fieldType: "nominal" },
    y: horizontal ? { field: "group", fieldType: "nominal" } : { field: "value" } });
const properties = p => p.graphicSpec.objects.plot.items.map(item => item.properties);

test("density and hue legends coexist through color replacement and profile edits", () => {
  const p = chart().createCanvas({ plot: { width: 300, height: 300 },
    margin: { left: 80, right: 250, top: 40, bottom: 60 } })
    .createData({ id: "data", values: rows })
    .createGradientPlot({ id: "plot", x: { field: "group", fieldType: "nominal" }, y: { field: "value" } });
  assert.equal(p.semanticSpec.guides.legend?.color, undefined);
  const mapped = p.encodeColor({ target: "plot", field: "group" })
    .createGuides({ legend: { target: "plot", channels: ["color"] } });
  assert.equal(mapped.semanticSpec.guides.legend.color.scale, "color");
  assert.ok(mapped.graphicSpec.objects.plotDensityLegend);
  assert.ok(mapped.graphicSpec.objects.colorLegendLabels);
  const densityX = mapped.graphicSpec.objects.plotDensityLegend.properties.x;
  assert.ok(densityX > p.graphicSpec.objects.plotDensityLegend.properties.x);
  const edited = mapped.editGradientPlot({ density: { bandwidth: 2 } });
  assert.equal(edited.semanticSpec.guides.legend.color.scale, "color");
  assert.equal(edited.graphicSpec.objects.plotDensityLegend.properties.x, densityX);
  const replaced = mapped.encodeColor({ target: "plot", value: "#e45756" });
  assert.equal(replaced.semanticSpec.guides.legend?.color, undefined);
  assert.equal(properties(replaced)[0].fill.type, "linear-gradient");
  const faceted = p.editXAxisTicksAndLabels({ values: ["A", "B"] })
    .facet({ field: "group", data: "data", columns: 2, guides: { axes: "outer", legend: false } });
  for (const child of Object.values(faceted.children)) {
    assert.deepEqual(child.resolvedScales.x.domain, ["A", "B"]);
    assert.equal(child.graphicSpec.objects.plot.items.length, 1);
  }
  assert.ok(!Object.keys(faceted.graphicSpec.objects).some(id => id.endsWith("-plotDensityLegend")));
});

for (const horizontal of [false, true]) {
  test(`gradient appearance reaches concrete strips and survives replay (${horizontal})`, () => {
    const original = build(horizontal);
    const next = original.encodeColor({ target: "plot", value: "#e45756" })
      .encodeOpacity({ target: "plot", value: .4 })
      .encodeStroke({ target: "plot", value: "#000000" })
      .encodeStrokeWidth({ target: "plot", value: 3 });
    const assertAppearance = p => properties(p).forEach(item => {
      assert.equal(item.fill.type, "linear-gradient");
      assert.ok(item.fill.stops.every(stop => {
        const [r, g, b] = stop.color.match(/[\d.]+/g).map(Number);
        return r > g && r > b;
      }), "fixed hue preserves the density gradient");
      assert.equal(item.opacity, .4);
      assert.equal(item.stroke, "#000000");
      assert.equal(item.strokeWidth, 3);
    });
    assertAppearance(next);
    assertAppearance(next.editCanvas({ width: 800 }));
    assertAppearance(next.editGradientPlot({ density: { bandwidth: 2 } }));
    assertAppearance(next.editScale({ id: horizontal ? "x" : "y", reverse: true }));
    const facets = next.facet({ field: "panel", data: "data", guides: { legend: false } });
    Object.values(facets.children).forEach(assertAppearance);
    assert.equal(properties(original)[0].fill.type, "linear-gradient");
    assert.equal(properties(original)[0].opacity, 1);
    const colored = next.encodeColor({ target: "plot", field: "group", scale: { range: ["red", "#00f"] } });
    assert.equal(properties(colored)[0].fill.type, "linear-gradient");
    assert.notDeepEqual(properties(colored)[0].fill, properties(colored)[1].fill);
    assert.equal(properties(colored)[0].opacity, .4);
    assert.match(renderToSVG(colored), /linearGradient/);
  });

  test(`gradient field appearance maps actual profile values (${horizontal})`, () => {
    const base = build(horizontal), field = "__gradientPlot_center";
    const next = base.encodeColor({ target: "plot", field, fieldType: "quantitative",
      scale: { palette: "viridis" } })
      .encodeOpacity({ target: "plot", field, scale: { range: [.2, .8] } })
      .encodeStroke({ target: "plot", field: "group" })
      .encodeStrokeWidth({ target: "plot", field, scale: { range: [1, 4] } });
    const items = properties(next);
    assert.notDeepEqual(items[0].fill, items[1].fill);
    assert.ok(items[0].opacity < items[1].opacity);
    assert.ok(items[0].strokeWidth < items[1].strokeWidth);
    assert.notEqual(items[0].stroke, items[1].stroke);
    const reversed = next.editColorScale({ target: "plot", reverse: true });
    assert.notDeepEqual(properties(reversed)[0].fill, items[0].fill);
    const rounded = next.editRectMark({ target: "plot", cornerRadius: 5, lineJoin: "round" });
    assert.equal(rounded.graphicSpec.objects.plot.type, "collection");
    assert.equal(rounded.graphicSpec.objects.plot.items[0].type, "path");
    assert.deepEqual(properties(rounded)[0].fill, items[0].fill);
    assert.doesNotThrow(() => rounded.editCanvas({ width: 800 }));
  });

  test(`gradient references use raw observations or visible centers without feedback (${horizontal})`, () => {
    const base = build(horizontal), axis = horizontal ? "x" : "y";
    const withStats = base.createStatisticalReference({ source: "plot", axis,
      groupBy: "panel", population: "boundData", statistic: { op: "mean" } });
    const config = Object.values(withStats.markConfigs).find(c => c.statisticalReference)?.statisticalReference;
    const values = withStats.semanticSpec.datasets.find(d => d.id === config.dataId).values;
    assert.deepEqual(values.map(row => row.value), [4, 7]);
    assert.doesNotThrow(() => withStats.editGradientPlot({ density: { bandwidth: 2 } }));
    assert.doesNotThrow(() => withStats.editCanvas({ width: 800 }));
    const visible = base.createStatisticalReference({ source: "plot", axis,
      population: "visibleItems", statistic: { op: "mean" } });
    const visibleConfig = Object.values(visible.markConfigs).find(c => c.statisticalReference)?.statisticalReference;
    assert.equal(visible.semanticSpec.datasets.find(d => d.id === visibleConfig.dataId).values[0].value, 5.5);
  });
}
