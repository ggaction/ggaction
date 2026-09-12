import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";

function base() {
  return chart()
    .createCanvas({
      width: 800,
      height: 600,
      margin: { top: 80, right: 240, bottom: 80, left: 80 }
    })
    .createData({ values: [
      { x: 0, y: 0, group: "A", measure: 0 },
      { x: 1, y: 1, group: "B", measure: 10 }
    ] })
    .createPointMark({ id: "points" })
    .encodeX({ field: "x" })
    .encodeY({ field: "y" });
}

test("reassigns categorical and quantitative color with the matching legend family", () => {
  const categorical = base()
    .encodeColor({ field: "group" })
    .createLegend({ channels: ["color"] });
  const snapshot = JSON.stringify(categorical);

  const quantitative = categorical.encodeColor({
    field: "measure",
    fieldType: "quantitative"
  });
  assert.equal(JSON.stringify(categorical), snapshot);
  assert.equal(
    quantitative.semanticSpec.scales.find(scale => scale.id === "color").type,
    "sequential"
  );
  assert.deepEqual(Object.keys(quantitative.guideConfigs.legend), ["gradient"]);
  assert.equal(quantitative.semanticSpec.guides.legend.color.title, "measure");
  assert.equal(quantitative.graphicSpec.objects.colorLegendSymbols, undefined);
  assert.ok(quantitative.graphicSpec.objects.colorGradientStrips);

  const restored = quantitative.encodeColor({
    field: "group",
    fieldType: "nominal"
  });
  assert.equal(
    restored.semanticSpec.scales.find(scale => scale.id === "color").type,
    "ordinal"
  );
  assert.deepEqual(Object.keys(restored.guideConfigs.legend), ["color"]);
  assert.equal(restored.semanticSpec.guides.legend.color.title, "group");
  assert.equal(restored.graphicSpec.objects.colorGradientStrips, undefined);
  assert.ok(restored.graphicSpec.objects.colorLegendSymbols);
});
