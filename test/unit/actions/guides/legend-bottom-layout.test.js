import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { chart as basicChart } from "../../../../src/basic.js";

function base(create = chart) {
  return create().createCanvas({ width: 640, height: 600,
    margin: { left: 60, right: 100, top: 40, bottom: 150 } })
    .createData({ values: [{ x: 1, y: 2, g: "A" }, { x: 2, y: 3, g: "B" }] })
    .createPointMark({ id: "points" }).encodeX({ field: "x" }).encodeY({ field: "y" })
    .encodeColor({ field: "g" });
}

const ys = program => program.graphicSpec.objects.colorLegendLabels.items.map(item => item.properties.y);

test("bottom categorical legends default to the edge grid", () => {
  const implicit = base().createLegend({ channels: ["color"], position: "bottom" });
  const explicit = base().createLegend({ channels: ["color"], position: "bottom", layout: "edge" });
  assert.deepEqual(implicit.graphicSpec, explicit.graphicSpec);
  assert.equal(implicit.guideConfigs.legend.color.layout, "edge");
  assert.deepEqual(ys(implicit), [489, 489]);
});

test("focused styles preserve both explicit bottom modes", () => {
  for (const layout of ["edge", "legacy-bottom"]) {
    const original = base().createLegend({ channels: ["color"], position: "bottom", layout });
    const options = Object.freeze({ color: "#b91c1c" });
    const edited = original.editLegendLabels(options);
    const primitive = original.editGraphics({ target: "colorLegendLabels", property: "fill", value: options.color });
    assert.deepEqual(edited.graphicSpec, primitive.graphicSpec);
    assert.equal(edited.guideConfigs.legend.color.layout, layout);
    assert.deepEqual(ys(edited), layout === "edge" ? [489, 489] : [572, 572]);
    assert.notEqual(original.graphicSpec.objects.colorLegendLabels.items[0].properties.fill, options.color);
    const title = edited.editLegendTitle({ color: "#123456" });
    assert.deepEqual(ys(title), ys(original));
    assert.equal(title.guideConfigs.legend.color.layout, layout);
  }
});

test("explicit mode edits converge with creation and survive Canvas and scale replay", () => {
  const legacy = base().createLegend({ channels: ["color"], position: "bottom", layout: "legacy-bottom" });
  const edge = legacy.editLegendLayout({ layout: "edge" });
  assert.deepEqual(edge.graphicSpec, base().createLegend({ channels: ["color"], position: "bottom" }).graphicSpec);
  assert.deepEqual(edge.editLegend({ layout: "legacy-bottom" }).graphicSpec, legacy.graphicSpec);
  const edited = legacy.editLegendLabels({ color: "red" }).editCanvas({ height: 660 })
    .editScale({ id: "color", domain: ["B", "A"] });
  assert.deepEqual(ys(edited), [632, 632]);
  assert.deepEqual(edited.graphicSpec.objects.colorLegendLabels.items.map(item => item.properties.text), ["B", "A"]);
  assert.equal(edited.guideConfigs.legend.color.layout, "legacy-bottom");
});

test("legend recreation after encoding removal preserves the explicit mode", () => {
  const original = base().encodeShape({ field: "g" })
    .createLegend({ channels: ["color", "shape"], position: "bottom", layout: "legacy-bottom" });
  const result = original.removeEncoding({ channel: "color" });
  assert.equal(result.guideConfigs.legend.series.layout, "legacy-bottom");
  assert.deepEqual(result.graphicSpec.objects.seriesLegendLabels.items.map(item => item.properties.y), [572, 572]);
});

test("invalid and incompatible layout requests fail atomically", () => {
  const original = base().createLegend({ channels: ["color"], position: "bottom", layout: "legacy-bottom" });
  const snapshot = JSON.stringify(original);
  for (const patch of [{ layout: "unknown" }, { layout: null }, { position: "right" },
    { columns: 2 }, { direction: "vertical" }, { titlePosition: "left" }, { offset: 12 }]) {
    assert.throws(() => original.editLegend(patch), /layout|requires/);
  }
  assert.throws(() => base().createLegend({ layout: "legacy-bottom" }), /requires position/);
  assert.equal(JSON.stringify(original), snapshot);
  assert.equal(original.editLegend({ layout: "edge", columns: 2 }).guideConfigs.legend.color.columns, 2);
});

test("Full and Basic nested guide creation use the same explicit modes", () => {
  for (const create of [chart, basicChart]) {
    for (const layout of ["edge", "legacy-bottom"]) {
      const nested = base(create).createGuides({ axes: false, grid: false,
        legend: { channels: ["color"], position: "bottom", layout } });
      assert.equal(nested.guideConfigs.legend.color.layout, layout);
      assert.deepEqual(ys(nested), layout === "edge" ? [489, 489] : [572, 572]);
    }
  }
  const size = base().encodeSize({ field: "x" });
  assert.throws(() => size.createLegend({ channels: ["size"], layout: "legacy-bottom" }), /requires layout "edge"/);
});
