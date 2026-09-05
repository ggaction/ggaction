import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";

const selections = [["color"], ["shape"], ["size"], ["color", "shape"], ["color", "size"], ["shape", "size"], ["color", "shape", "size"]];
function points() {
  return chart().createCanvas({ width: 1000, height: 900, margin: { right: 350, left: 300, top: 150, bottom: 150 } })
    .createData({ values: [{ x: 1, y: 2, g: "A", m: 4 }, { x: 2, y: 3, g: "B", m: 16 }] })
    .createPointMark({ id: "points" }).encodeX({ field: "x" }).encodeY({ field: "y" })
    .encodeColor({ field: "g" }).encodeShape({ field: "g" }).encodeSize({ field: "m" });
}
function represented(program) {
  return Object.entries(program.guideConfigs.legend ?? {}).flatMap(([kind, config]) => config.channels ?? [kind]).sort();
}

test("replaces every point legend content subset without changing encoded marks", () => {
  const base = points();
  for (const from of selections) {
    const original = base.createLegend({ channels: from, ...(from.includes("size") ? { count: 3 } : {}) });
    const before = JSON.stringify(original);
    for (const channels of selections) {
      const actual = original.editLegend({ channels });
      assert.deepEqual(represented(actual), [...channels].sort());
      assert.deepEqual(actual.semanticSpec.layers, original.semanticSpec.layers);
      assert.deepEqual(actual.semanticSpec.scales, original.semanticSpec.scales);
      assert.deepEqual(actual.graphicSpec.objects.points, original.graphicSpec.objects.points);
      if (channels.includes("size")) assert.equal(actual.guideConfigs.legend.size.count, from.includes("size") ? 3 : 5);
      assert.deepEqual(actual.editCanvas({ width: 1100 }).graphicSpec,
        original.editCanvas({ width: 1100 }).editLegend({ channels }).graphicSpec);
    }
    assert.equal(JSON.stringify(original), before);
  }
});

test("keeps categorical titles, style, order and recipe while adding or replacing channels", () => {
  const original = points().createLegend({ channels: ["color"], title: "Groups", position: "left",
    labels: { color: "#7c3aed", fontWeight: 700 }, order: { values: ["B", "A"] }, border: { padding: 3 } })
    .editLegend({ title: false });
  const combined = original.editLegend({ channels: ["color", "shape", "size"], count: 3 });
  assert.equal(combined.guideConfigs.legend.series.titleVisible, false);
  assert.equal(combined.guideConfigs.legend.series.title, "Groups");
  assert.equal(combined.graphicSpec.objects.seriesLegendTitle, undefined);
  assert.deepEqual(combined.guideConfigs.legend.series.labels, original.guideConfigs.legend.color.labels);
  assert.deepEqual(combined.guideConfigs.legend.series.domain, ["B", "A"]);
  assert.equal(combined.guideConfigs.legend.size.count, 3);
  const shaped = combined.editLegend({ channels: ["shape"], title: "auto", labels: { fontSize: 14 } });
  assert.equal(shaped.guideConfigs.legend.series.title, "g");
  assert.equal(shaped.guideConfigs.legend.series.labels.fontWeight, 700);
  assert.equal(shaped.guideConfigs.legend.series.labels.fontSize, 14);
  assert.equal(shaped.guideConfigs.legend.size, undefined);
  const recipe = { layers: [{ type: "point", size: 7 }, { type: "line", length: 24 }] };
  const custom = original.editLegend({ symbol: recipe }).editLegend({ channels: ["color", "shape"] });
  assert.deepEqual(custom.guideConfigs.legend.series.symbol.layers.map(layer => layer.type), ["point", "line"]);
  assert.equal(custom.guideConfigs.legend.series.inferredSymbol, false);
});

test("validates the final content and style before removing existing resources", () => {
  const original = points().createLegend({ channels: ["color"], position: "top" });
  const before = JSON.stringify(original);
  for (const args of [{ channels: [] }, { channels: ["color", "color"] }, { channels: ["missing"] },
    { channels: ["opacity"] }, { channels: ["color", "size"] }, { channels: ["color"], count: 3 },
    { channels: ["color", "size"], position: "left", count: 1 }, { channels: ["shape"], labels: { fontSize: -1 } }]) {
    assert.throws(() => original.editLegend(args));
    assert.equal(JSON.stringify(original), before);
  }
  const valid = original.editLegend({ channels: ["color", "size"], position: "left", count: 3 });
  assert.deepEqual(represented(valid), ["color", "size"]);
});

test("replaces standalone continuous and sampled content with hidden titles and partial styles", () => {
  for (const scale of [{}, { type: "quantize", range: ["#eff6ff", "#60a5fa", "#1e3a8a"] }]) {
    const base = chart().createCanvas({ width: 800, height: 700, margin: { right: 300 } })
      .createData({ values: [{ x: 1, y: 2, m: 4 }, { x: 2, y: 3, m: 16 }] })
      .createPointMark().encodeX({ field: "x" }).encodeY({ field: "y" })
      .encodeColor({ field: "m", fieldType: "quantitative", scale }).encodeSize({ field: "m" }).encodeOpacity({ field: "m" });
    const kind = scale.type ? "interval" : "gradient";
    const source = base.createLegend({ channels: ["color"] }).editLegend({ title: false, labels: { color: "purple" } });
    const retained = source.editLegend({ channels: ["color"], labels: { fontWeight: 700 } });
    assert.equal(retained.guideConfigs.legend[kind].titleVisible, false);
    assert.equal(retained.guideConfigs.legend[kind].labels.color, "purple");
    const sized = source.editLegend({ channels: ["size"], title: false, count: 3 });
    assert.deepEqual(represented(sized), ["size"]);
    assert.equal(sized.graphicSpec.objects.sizeLegendTitle, undefined);
    const opacity = sized.editLegend({ channels: ["opacity"], title: false, count: 3 });
    assert.deepEqual(represented(opacity), ["opacity"]);
    assert.equal(opacity.graphicSpec.objects.opacityLegendTitle, undefined);
    assert.deepEqual(opacity.semanticSpec.layers, source.semanticSpec.layers);
    assert.deepEqual(opacity.editLegend({ channels: ["color"] }).graphicSpec, base.createLegend({ channels: ["color"] }).graphicSpec);
  }
});

test("content selection names the whole target and preserves unrelated owners", () => {
  const original = points().encodeOpacity({ field: "m" }).createLegend({ channels: ["color", "shape", "size"] })
    .createLegend({ channels: ["opacity"] });
  assert.deepEqual(represented(original.editLegend({ channels: ["color"] })), ["color"]);
  const multiple = original.createData({ id: "lineValues", values: [
    { x: 1, y: 2, g: "A", m: 4 }, { x: 2, y: 3, g: "A", m: 4 },
    { x: 1, y: 3, g: "B", m: 16 }, { x: 2, y: 4, g: "B", m: 16 }
  ] }).createLineMark({ id: "widths" }).encodeX({ field: "x" }).encodeY({ field: "y" })
    .encodeGroup({ field: "g" })
    .encodeStrokeWidth({ field: "m" }).createLegend({ target: "widths", channels: ["strokeWidth"] });
  assert.throws(() => multiple.editLegend({ channels: ["color"] }), /ambiguous/);
  const edited = multiple.editLegend({ target: "points", channels: ["shape"] });
  assert.deepEqual(edited.guideConfigs.legend.strokeWidth, multiple.guideConfigs.legend.strokeWidth);
  const width = multiple.editLegend({ target: "widths", channels: ["strokeWidth"], count: 3, title: false });
  assert.equal(width.graphicSpec.objects.strokeWidthLegendTitle, undefined);
  assert.equal(width.guideConfigs.legend.strokeWidth.count, 3);
});


test("categorical edits merge only requested companion style leaves", () => {
  const original = points().createLegend({ channels: ["size"] })
    .editLegend({ labels: { color: "red" }, titleStyle: { fontWeight: 900 } })
    .createLegend({ channels: ["color", "shape"] });
  for (const content of [false, true]) {
    for (const patch of [{ title: "Groups" }, { count: 3 }, { labels: { fontWeight: 700 } }]) {
      const actual = original.editLegend({ ...(content ? { channels: ["color", "shape", "size"] } : {}), ...patch });
      assert.equal(actual.graphicSpec.objects.sizeLegendLabels.items[0].properties.fill, "red");
      assert.equal(actual.graphicSpec.objects.sizeLegendTitle.properties.fontWeight, 900);
      if (patch.labels) assert.equal(actual.graphicSpec.objects.sizeLegendLabels.items[0].properties.fontWeight, 700);
      const replay = actual.editCanvas({ width: 1100 }).editScale({ id: "size", range: [16, 144] });
      assert.equal(replay.graphicSpec.objects.sizeLegendLabels.items[0].properties.fill, "red");
      assert.equal(replay.graphicSpec.objects.sizeLegendTitle.properties.fontWeight, 900);
    }
  }
  const inherited = points().createLegend({ labels: { color: "purple" } });
  const edited = inherited.editLegend({ titleStyle: { fontWeight: 900 } });
  assert.equal(edited.guideConfigs.legend.size.labels.offset, 28);
  assert.equal(edited.graphicSpec.objects.sizeLegendLabels.items[0].properties.fill, "purple");
  assert.equal(edited.graphicSpec.objects.sizeLegendTitle.properties.fontWeight, 900);
});


test("rejects a replacement that would occupy another target's categorical resource", () => {
  const original = points().createLegend({ channels: ["color"] })
    .createPointMark({ id: "other" }).encodeX({ field: "x" }).encodeY({ field: "y" })
    .encodeColor({ field: "g" }).encodeSize({ field: "m" })
    .createLegend({ target: "other", channels: ["size"] });
  const before = JSON.stringify(original);
  assert.throws(() => original.editLegend({ target: "other", channels: ["color"] }), /another target/);
  assert.equal(JSON.stringify(original), before);
});
