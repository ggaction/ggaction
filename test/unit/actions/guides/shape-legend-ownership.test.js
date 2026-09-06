import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";

const rows = Object.freeze([
  Object.freeze({ x: 1, y: 2, group: "A" }),
  Object.freeze({ x: 2, y: 4, group: "B" }),
  Object.freeze({ x: 3, y: 3, group: "C" }),
  Object.freeze({ x: 4, y: 5, group: "A" }),
  Object.freeze({ x: 5, y: 6, group: "B" }),
  Object.freeze({ x: 6, y: 4, group: "C" })
]);

function points() {
  return chart()
    .createCanvas({ width: 680, height: 480,
      margin: { top: 40, right: 240, bottom: 60, left: 60 } })
    .createData({ id: "rows", values: rows })
    .createPointMark({ id: "points" })
    .encodeX({ field: "x" })
    .encodeY({ field: "y" })
    .encodeShape({ field: "group" });
}

function addLine(program, complete = true) {
  const next = program.createLineMark({ id: "trend" });
  return complete ? next.encodeX({ field: "x" }).encodeY({ field: "y" }) : next;
}

function legendGraphics(program) {
  return Object.fromEntries(Object.entries(program.graphicSpec.objects)
    .filter(([id]) => id.startsWith("seriesLegend")));
}

test("shape-only legends ignore unrelated complete and incomplete lines", () => {
  const expected = points().createLegend({ target: "points", channels: ["shape"] });
  for (const complete of [false, true]) {
    const before = addLine(points(), complete);
    const options = Object.freeze({ target: "points", channels: Object.freeze(["shape"]) });
    const actual = before.createLegend(options);
    assert.deepEqual(actual.semanticSpec.guides.legend.series.channels, ["shape"]);
    assert.deepEqual(legendGraphics(actual), legendGraphics(expected));
    assert.deepEqual(actual.guideConfigs.legend.series.symbol.layers.map(layer => layer.type), ["point"]);
    assert.equal(before.semanticSpec.guides.legend, undefined);
    assert.deepEqual(actual.semanticSpec.layers, before.semanticSpec.layers);
  }
});

test("removing color retains shape legend ownership with an unrelated line", () => {
  const before = addLine(points().encodeColor({ field: "group" })
    .createLegend({ target: "points", channels: ["color", "shape"] }));
  const snapshot = JSON.stringify(before);
  const removed = before.removeEncoding({ target: "points", channel: "color" });
  const expected = addLine(points()).createLegend({ target: "points", channels: ["shape"] });
  assert.deepEqual(removed.semanticSpec.guides.legend.series.channels, ["shape"]);
  assert.deepEqual(legendGraphics(removed), legendGraphics(expected));
  assert.deepEqual(removed.semanticSpec.layers[1], before.semanticSpec.layers[1]);
  assert.deepEqual(removed.graphicSpec.objects.trend, before.graphicSpec.objects.trend);
  assert.equal(JSON.stringify(before), snapshot);

  const resized = removed.editCanvas({ width: 740 });
  const expectedResized = expected.editCanvas({ width: 740 });
  assert.deepEqual(legendGraphics(resized), legendGraphics(expectedResized));
  const scale = removed.semanticSpec.layers[0].encoding.shape.scale;
  const reordered = resized.editScale({ id: scale, domain: ["C", "B", "A"] });
  assert.deepEqual(legendGraphics(reordered), legendGraphics(
    expectedResized.editScale({ id: scale, domain: ["C", "B", "A"] })
  ));
});

test("matching field and color scale still infer a line and point recipe", () => {
  const before = points().encodeColor({ field: "group" });
  const colorScale = before.semanticSpec.layers[0].encoding.color.scale;
  const matching = addLine(before).encodeColor({ field: "group", scale: { id: colorScale } });
  const legend = matching.createLegend({ target: "points", channels: ["color", "shape"] });
  assert.deepEqual(legend.guideConfigs.legend.series.symbol.layers.map(layer => layer.type), ["line", "point"]);
  const independent = addLine(before).encodeColor({ field: "group", scale: { id: "lineColor" } })
    .createLegend({ target: "points", channels: ["color", "shape"] });
  assert.deepEqual(independent.guideConfigs.legend.series.symbol.layers.map(layer => layer.type), ["point"]);
});
