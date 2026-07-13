import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";

const values = [
  { year: 1850, perc: 1, sex: "men" },
  { year: 1850, perc: 9, sex: "women" },
  { year: 1860, perc: 2, sex: "men" },
  { year: 1860, perc: 8, sex: "women" }
];

function groupedBars() {
  return chart()
    .createCanvas({
      width: 720,
      height: 460,
      margin: { top: 40, right: 140, bottom: 70, left: 80 }
    })
    .createData({ id: "jobs", values })
    .createBarMark({ id: "bars" })
    .encodeX({ field: "year", fieldType: "ordinal" })
    .encodeY({ field: "perc" })
    .encodeColor({ field: "sex", layout: "group" })
    .encodeBarWidth();
}

test("creates an inferred right-side grouped bar legend", () => {
  const before = groupedBars();
  const program = before.createLegend();
  const symbols = program.graphicSpec.objects.colorLegendSymbols.children;
  const labels = program.graphicSpec.objects.colorLegendLabels.children;

  assert.deepEqual(program.semanticSpec.guides.legend.color, {
    scale: "color",
    title: "sex"
  });
  assert.deepEqual(symbols.map(child => child.properties), [
    {
      x: 610,
      y: 86,
      width: 14,
      height: 12,
      fill: "#4c78a8",
      stroke: "white",
      strokeWidth: 0.5
    },
    {
      x: 610,
      y: 114,
      width: 14,
      height: 12,
      fill: "#f58518",
      stroke: "white",
      strokeWidth: 0.5
    }
  ]);
  assert.deepEqual(labels.map(child => child.properties.text), ["men", "women"]);
  assert.deepEqual(labels.map(child => child.properties.x), [632, 632]);
  assert.deepEqual(labels.map(child => child.properties.y), [92, 120]);
  assert.equal(program.graphicSpec.objects.colorLegendTitle.properties.x, 610);
  assert.equal(program.graphicSpec.objects.colorLegendTitle.properties.y, 60);
  assert.equal(before.semanticSpec.guides.legend, undefined);
});

test("rematerializes grouped legend layout after Canvas edits", () => {
  const before = groupedBars().createLegend();
  const after = before.editCanvas({ width: 820 });

  assert.equal(
    after.graphicSpec.objects.colorLegendSymbols.children[0].properties.x,
    710
  );
  assert.equal(
    before.graphicSpec.objects.colorLegendSymbols.children[0].properties.x,
    610
  );
});

test("supports grouped legend appearance and explicit bottom placement", () => {
  const bordered = groupedBars().createLegend({
    symbol: { width: 16, height: 10 },
    border: { background: "white", padding: 8 }
  });

  assert.equal(
    bordered.graphicSpec.objects.colorLegendSymbols.children[0].properties.width,
    16
  );
  assert.equal(
    bordered.graphicSpec.order.indexOf("colorLegendBackground") <
      bordered.graphicSpec.order.indexOf("colorLegendSymbols"),
    true
  );
  const bottom = groupedBars().createLegend({ position: "bottom" });
  assert.equal(
    bottom.graphicSpec.objects.colorLegendTitle.properties.y,
    408
  );
});
