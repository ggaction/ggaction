import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";

const rows = Object.freeze([
  Object.freeze({ x: 1, y: 2, group: "A", amount: 4, alpha: 0.2 }),
  Object.freeze({ x: 2, y: 5, group: "B", amount: 9, alpha: 0.6 }),
  Object.freeze({ x: 3, y: 3, group: "C", amount: 16, alpha: 1 })
]);

function base({ height = 520, left = 70, right = 230 } = {}) {
  return chart()
    .createCanvas({
      width: 760,
      height,
      margin: { top: 40, right, bottom: 60, left }
    })
    .createData({ id: "rows", values: rows })
    .createPointMark({ id: "points" })
    .encodeX({ field: "x" })
    .encodeY({ field: "y" })
    .encodeColor({ field: "group", fieldType: "nominal" })
    .encodeSize({ field: "amount" })
    .encodeOpacity({ field: "alpha" });
}

function createThree(program, position = "right", reverse = false) {
  const calls = [
    next => next.createLegend({ channels: ["color"], position }),
    next => next.createLegend({ channels: ["size"], count: 3 }),
    next => next.createLegend({ channels: ["opacity"], position, count: 3 })
  ];
  return (reverse ? [...calls].reverse() : calls).reduce(
    (next, create) => create(next),
    program
  );
}

function values(program, id, property) {
  return program.graphicSpec.objects[id].items.map(
    item => item.properties[property]
  );
}

function centers(program, id) {
  const graphic = program.graphicSpec.objects[id];
  return graphic.items.map(item => {
    const properties = item.properties;
    return (item.type ?? graphic.type) === "rect"
      ? properties.x + properties.width / 2
      : properties.x;
  });
}

function laneCoordinates(program) {
  const objects = program.graphicSpec.objects;
  return {
    titles: ["colorLegendTitle", "sizeLegendTitle", "opacityLegendTitle"]
      .map(id => ({ x: objects[id].properties.x, y: objects[id].properties.y })),
    symbols: [
      centers(program, "colorLegendSymbols"),
      values(program, "sizeLegendSymbols", "x"),
      values(program, "opacityLegendSymbols", "x")
    ],
    labels: ["colorLegendLabels", "sizeLegendLabels", "opacityLegendLabels"]
      .map(id => values(program, id, "x"))
  };
}

test("aligns real multi-legend graphics and stacks their blocks", () => {
  const program = createThree(base());
  const coordinates = laneCoordinates(program);

  assert.deepEqual(coordinates.titles.map(item => item.x), [560, 560, 560]);
  assert.equal(coordinates.symbols.flat().every(x => x === 576), true);
  assert.equal(coordinates.labels.flat().every(x => x === 604), true);
  assert.ok(coordinates.titles[1].y > coordinates.titles[0].y);
  assert.ok(coordinates.titles[2].y > coordinates.titles[1].y);
});

test("converges to the same lane coordinates regardless of authoring order", () => {
  const forward = createThree(base());
  const reverse = createThree(base(), "right", true);
  assert.deepEqual(laneCoordinates(reverse), laneCoordinates(forward));
});

test("uses the same readable columns for a left-side lane", () => {
  const program = createThree(base({ left: 220, right: 80 }), "left");
  const coordinates = laneCoordinates(program);
  const [titleX] = coordinates.titles.map(item => item.x);
  const [symbolX] = coordinates.symbols.flat();
  const [labelX] = coordinates.labels.flat();

  assert.equal(coordinates.titles.every(item => item.x === titleX), true);
  assert.equal(coordinates.symbols.flat().every(x => x === symbolX), true);
  assert.equal(coordinates.labels.flat().every(x => x === labelX), true);
  assert.ok(titleX < symbolX);
  assert.ok(symbolX < labelX);
});

test("fails atomically when a second block cannot fit", () => {
  const program = base({ height: 180, right: 160 })
    .createLegend({ channels: ["color"] });
  assert.throws(
    () => program.createLegend({ channels: ["size"], count: 3 }),
    /requires more right-margin or vertical Canvas space/
  );
  assert.equal(program.guideConfigs.legend.size, undefined);
  assert.equal(program.graphicSpec.objects.sizeLegendSymbols, undefined);
});

test("aligns gradient and opacity recipes in the same side lane", () => {
  const program = chart()
    .createCanvas({
      width: 760,
      height: 600,
      margin: { top: 40, right: 230, bottom: 60, left: 70 }
    })
    .createData({ id: "rows", values: rows })
    .createPointMark({ id: "points" })
    .encodeX({ field: "x" })
    .encodeY({ field: "y" })
    .encodeColor({ field: "amount", fieldType: "quantitative" })
    .encodeOpacity({ field: "alpha" })
    .createLegend({ channels: ["color"] })
    .createLegend({ channels: ["opacity"], count: 3 });
  const strip = program.graphicSpec.objects.colorGradientStrips.items[0].properties;

  assert.equal(program.graphicSpec.objects.colorGradientTitle.properties.x, 560);
  assert.equal(strip.x + strip.width / 2, 576);
  assert.equal(values(program, "colorGradientLabels", "x").every(x => x === 604), true);
  assert.equal(values(program, "opacityLegendSymbols", "x").every(x => x === 576), true);
  assert.equal(values(program, "opacityLegendLabels", "x").every(x => x === 604), true);
});

test("orders independent interval and stroke-width recipes by layer", () => {
  const lineRows = [
    { x: 1, y: 2, group: "A", amount: 4, weight: 2 },
    { x: 2, y: 5, group: "A", amount: 9, weight: 2 },
    { x: 1, y: 3, group: "B", amount: 12, weight: 10 },
    { x: 2, y: 6, group: "B", amount: 16, weight: 10 }
  ];
  const program = chart()
    .createCanvas({
      width: 760,
      height: 600,
      margin: { top: 40, right: 230, bottom: 60, left: 70 }
    })
    .createData({ id: "rows", values: lineRows })
    .createPointMark({ id: "points" })
    .encodeX({ field: "x" })
    .encodeY({ field: "y" })
    .encodeColor({
      field: "amount",
      fieldType: "quantitative",
      scale: { type: "quantize", range: ["#cbd5e1", "#64748b", "#0f172a"] }
    })
    .createLineMark({ id: "lines", data: "rows" })
    .encodeX({ target: "lines", field: "x", scale: { id: "x" } })
    .encodeY({ target: "lines", field: "y", scale: { id: "y" } })
    .encodeGroup({ target: "lines", field: "group" })
    .encodeStrokeWidth({ target: "lines", field: "weight" })
    .createLegend({ target: "points", channels: ["color"] })
    .createLegend({ target: "lines", channels: ["strokeWidth"], count: 3 });
  const intervalTitle = program.graphicSpec.objects.colorLegendTitle.properties;
  const strokeTitle = program.graphicSpec.objects.strokeWidthLegendTitle.properties;

  assert.equal(intervalTitle.x, 560);
  assert.equal(strokeTitle.x, 560);
  assert.ok(intervalTitle.y < strokeTitle.y);
  assert.equal(centers(program, "colorLegendSymbols").every(x => x === 576), true);
  assert.equal(values(program, "strokeWidthLegendLabels", "x").every(x => x === 604), true);
});
