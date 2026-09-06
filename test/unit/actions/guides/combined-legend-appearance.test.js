import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";

const edges = ["left", "right", "top", "bottom"];
function base() {
  return chart().createCanvas({ width: 2000, height: 1600, margin: 500 })
    .createData({ values: [{ x: 0, y: 0, g: "A", m: 0 }, { x: 1, y: 1, g: "B", m: 10 }] })
    .createPointMark().encodeX({ field: "x" }).encodeY({ field: "y" }).encodeColor({ field: "g" })
    .encodeSize({ field: "m", scale: { range: [4 * Math.PI, 36 * Math.PI] } });
}

test("new combined legends share appearance independently of edge and partial edits", () => {
  for (const position of edges) for (const style of [{}, { labels: { fontSize: 18 } }, { titleStyle: { color: "purple" } }]) {
    const options = { channels: ["color", "size"], position, itemGap: 28, ...style };
    const p = base().createLegend(options);
    assert.equal(p.guideConfigs.legend.size.inheritAppearance, true);
    const title = p.graphicSpec.objects.sizeLegendTitle.properties;
    assert.equal(title.fill, style.titleStyle?.color ?? "#334155");
    assert.equal(p.guideConfigs.legend.size.labels.offset, 12);
    for (const target of edges) {
      assert.deepEqual(p.editLegendLayout({ position: target }).graphicSpec,
        base().createLegend({ ...options, position: target }).graphicSpec);
    }
    for (const patch of [{ labels: { fontWeight: 700 } }, { titleStyle: { fontSize: 20 } }]) {
      const expected = { ...options, ...patch, labels: { ...style.labels, ...patch.labels },
        titleStyle: { ...style.titleStyle, ...patch.titleStyle } };
      assert.deepEqual(p.editLegend(patch).graphicSpec, base().createLegend(expected).graphicSpec);
    }
    assert.deepEqual(p.editLegendTitle({ title: false }).editLegendTitle({ title: "auto" }).graphicSpec, p.graphicSpec);
  }
});

test("retained standalone size styles remain independent when joining a categorical legend", () => {
  for (const position of edges) {
    const standalone = base().createLegend({ channels: ["size"], position, title: "Mass",
      labels: { fontSize: 17, color: "red" }, titleStyle: { color: "purple", fontWeight: 700 } });
    const p = standalone.createLegend({ channels: ["color", "size"], position });
    assert.equal(p.guideConfigs.legend.size.inheritAppearance, false);
    assert.equal(p.graphicSpec.objects.sizeLegendTitle.properties.fill, "purple");
    assert.equal(p.graphicSpec.objects.sizeLegendTitle.properties.text, "Mass");
    assert.equal(p.graphicSpec.objects.sizeLegendLabels.items[0].properties.fill, "red");
    const removed = p.removeLegend({ channels: ["color"] });
    assert.deepEqual(removed.graphicSpec, standalone.graphicSpec);
  }
  assert.equal(base().createLegend({ channels: ["size"] }).graphicSpec.objects.sizeLegendTitle.properties.fill, "#0f172a");
});

test("formats only the quantitative block of a combined categorical and size legend", () => {
  const created = base().createLegend({
    channels: ["color", "size"],
    count: 3,
    labels: { format: ".1e" }
  });
  assert.deepEqual(created.graphicSpec.objects.colorLegendLabels.items.map(item => item.properties.text), ["A", "B"]);
  assert.deepEqual(created.graphicSpec.objects.sizeLegendLabels.items.map(item => item.properties.text),
    ["0.0e+0", "5.0e+0", "1.0e+1"]);
  const edited = created.editLegendLabels({ format: ".1f" });
  assert.deepEqual(edited.graphicSpec.objects.colorLegendLabels.items.map(item => item.properties.text), ["A", "B"]);
  assert.deepEqual(edited.graphicSpec.objects.sizeLegendLabels.items.map(item => item.properties.text),
    ["0.0", "5.0", "10.0"]);
  assert.throws(() => base().removeEncoding({ channel: "size" }).createLegend({
    channels: ["color"], labels: { format: ".1f" }
  }), /Unknown createLegend\.labels option/);
});
