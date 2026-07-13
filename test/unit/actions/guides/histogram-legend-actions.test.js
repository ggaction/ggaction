import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";

const rows = [
  { value: 60, origin: "USA" },
  { value: 100, origin: "Europe" },
  { value: 200, origin: "USA" },
  { value: 480, origin: "Japan" }
];

function histogram() {
  return chart()
    .createCanvas({
      width: 432,
      height: 460,
      margin: { top: 80, right: 140, bottom: 60, left: 80 }
    })
    .createData({ id: "cars", values: rows })
    .createBarMark({ id: "bars" })
    .encodeHistogram({ field: "value", maxBins: 10 })
    .encodeColor({ field: "origin", scale: { palette: "tableau10" } });
}

test("creates an inferred right-side histogram color legend", () => {
  const before = histogram();
  const program = before.createLegend();
  const symbols = program.graphicSpec.objects.colorLegendSymbols.children;
  const labels = program.graphicSpec.objects.colorLegendLabels.children;

  assert.deepEqual(program.semanticSpec.guides.legend.color, {
    scale: "color",
    title: "origin"
  });
  assert.deepEqual(
    symbols.map(child => child.properties.fill),
    ["#4c78a8", "#f58518", "#e45756"]
  );
  assert.deepEqual(
    labels.map(child => child.properties.text),
    ["USA", "Europe", "Japan"]
  );
  assert.equal(program.graphicSpec.objects.colorLegendTitle.properties.x, 322);
  assert.equal(program.graphicSpec.objects.colorLegendTitle.properties.y, 100);
  assert.equal(symbols.every((child, index) =>
    child.properties.y === 126 + index * 28
  ), true);
  assert.equal(labels.every((child, index) =>
    child.properties.y === 132 + index * 28
  ), true);
  assert.equal(program.graphicSpec.objects.colorLegendBackground, undefined);
  assert.equal(before.semanticSpec.guides.legend, undefined);

  const node = program.trace.children.at(-1);
  assert.deepEqual(node.children.map(child => child.op), [
    "createCategoricalLegend"
  ]);
  assert.deepEqual(node.children[0].children.map(child => child.op), [
    "editSemantic",
    "editSemantic",
    "createLegendSymbols",
    "createLegendLabels",
    "createLegendTitle"
  ]);
  assert.deepEqual(node.children[0].children[2].children.map(child => child.op), [
    "createLegendSymbolSwatches"
  ]);
});

test("supports explicit bottom layout, swatch style, and border", () => {
  const program = histogram().createLegend({
    position: "bottom",
    align: "left",
    symbol: {
      width: 16,
      height: 10,
      stroke: "#0f172a",
      strokeWidth: 1
    },
    border: { background: "white", padding: 8 }
  });
  const symbols = program.graphicSpec.objects.colorLegendSymbols.children;

  assert.equal(symbols[0].properties.x, 80);
  assert.equal(symbols[0].properties.width, 16);
  assert.equal(symbols[0].properties.height, 10);
  assert.equal(symbols[0].properties.stroke, "#0f172a");
  assert.equal(
    program.graphicSpec.order.indexOf("colorLegendBackground") <
      program.graphicSpec.order.indexOf("colorLegendSymbols"),
    true
  );
});

test("rematerializes a right histogram legend after Canvas and domain changes", () => {
  const before = histogram().createLegend();
  const resized = before.editCanvas({ width: 500, height: 500 });
  const color = resized.resolvedScales.color;
  const reordered = resized
    ._withResolvedScale("color", { ...color, domain: ["Japan", "USA", "Europe"] })
    .rematerializeLegend();

  assert.notEqual(
    resized.graphicSpec.objects.colorLegendSymbols.children[0].properties.x,
    before.graphicSpec.objects.colorLegendSymbols.children[0].properties.x
  );
  assert.equal(resized.graphicSpec.objects.colorLegendTitle.properties.y, 100);
  assert.deepEqual(
    reordered.graphicSpec.objects.colorLegendLabels.children.map(
      child => child.properties.text
    ),
    ["Japan", "USA", "Europe"]
  );
  assert.deepEqual(before.guideConfigs.legend.color.domain, [
    "USA",
    "Europe",
    "Japan"
  ]);
});

test("validates histogram targets, channels, layout, and recipes", () => {
  const program = histogram();
  const incomplete = chart()
    .createData({ id: "cars", values: rows })
    .createBarMark({ id: "bars" });

  assert.throws(() => incomplete.createLegend(), /categorical mark is ambiguous/);
  assert.throws(
    () => program.createLegend({ channels: ["strokeDash"] }),
    /only the color channel/
  );
  assert.throws(
    () => program.createLegend({ position: "left" }),
    /Unsupported legend position/
  );
  assert.throws(
    () => program.createLegend({ align: "middle" }),
    /Unsupported legend alignment/
  );
  assert.throws(
    () => program.createLegend({ symbol: { layers: [] } }),
    /non-empty array/
  );
  assert.throws(
    () =>
      program.createLegend({
        symbol: {
          layers: [{ type: "point", shape: "square" }]
        }
      }),
    /Unsupported legend point shape/
  );

  const ambiguous = program
    .createData({ id: "other", values: rows })
    .createBarMark({ id: "otherBars" })
    .encodeHistogram({
      field: "value",
      xScale: { id: "otherX" },
      yScale: { id: "otherY" }
    })
    .encodeColor({
      field: "origin",
      scale: { id: "otherColor" }
    })
    ._withContext({ currentMark: "missing" });
  assert.throws(
    () => ambiguous.createLegend(),
    /categorical mark is ambiguous/
  );
});
