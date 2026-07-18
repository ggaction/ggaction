import assert from "node:assert/strict";
import test from "node:test";

import * as ggaction from "../../src/index.js";
import { chart } from "../../src/index.js";

const rows = Object.freeze([
  Object.freeze({
    Year: "1970-01-01",
    Horsepower: 130,
    Miles_per_Gallon: 18,
    Acceleration: 12,
    Origin: "USA"
  }),
  Object.freeze({
    Year: "1971-01-01",
    Horsepower: 95,
    Miles_per_Gallon: 24,
    Acceleration: 15,
    Origin: "Japan"
  })
]);

function canvas() {
  return chart().createCanvas({
    width: 420,
    height: 300,
    margin: { top: 30, right: 40, bottom: 50, left: 60 }
  });
}

test("records the current and missing Roadmap 3 public surface", () => {
  const program = chart();
  for (const name of [
    "encodeTheta",
    "encodeR",
    "encodePointRadius",
    "encodeYOffset",
    "createTextMark",
    "editTextMark",
    "encodeText",
    "createRectMark",
    "editRectMark",
    "facet",
    "editFacetHeaders"
  ]) {
    assert.equal(typeof program[name], "function", name);
  }
  assert.equal(typeof program.createArcMark, "function");
  assert.equal(typeof ggaction.hconcat, "function");
  assert.equal(typeof ggaction.vconcat, "function");
});

test("stores a Polar resource without inventing positional encodings", () => {
  const program = chart()
    .createData({ values: rows })
    .createPointMark({ id: "points" })
    .createCoordinate({ id: "polar", type: "polar", layers: ["points"] });

  assert.deepEqual(program.semanticSpec.coordinates, [
    { id: "polar", type: "polar" }
  ]);
  assert.equal(program.semanticSpec.layers[0].coordinate, "polar");
  assert.equal(program.graphicSpec.objects.points.items.length, rows.length);
  assert.equal(
    program.graphicSpec.objects.points.items.every(
      item => item.properties.x === undefined && item.properties.y === undefined
    ),
    true
  );
});

test("inherits only compatible positions from a layered rule", () => {
  const ruleFirst = canvas()
    .createData({ values: rows })
    .createRuleMark({ id: "stems" })
    .encodeX({
      target: "stems",
      field: "Horsepower",
      fieldType: "quantitative"
    })
    .encodeY({
      target: "stems",
      datum: 0,
      fieldType: "quantitative",
      scale: { domain: [0, 50] }
    })
    .encodeY2({
      target: "stems",
      field: "Miles_per_Gallon",
      fieldType: "quantitative"
    });

  const point = ruleFirst
    .createPointMark({ id: "points" })
    .semanticSpec.layers.find(layer => layer.id === "points");
  assert.deepEqual(point.encoding.x, {
    field: "Horsepower",
    fieldType: "quantitative",
    scale: "x"
  });
  assert.equal(point.encoding.y, undefined);
});

test("shares a temporal position scale between compatible bars and lines", () => {
  const layered = canvas()
    .createData({ values: rows })
    .createBarMark({ id: "bars" })
    .encodeX({
      target: "bars",
      field: "Year",
      fieldType: "temporal"
    })
    .encodeY({
      target: "bars",
      field: "Acceleration",
      aggregate: "mean"
    })
    .createLineMark({ id: "trend" });
  const trend = layered.semanticSpec.layers.find(layer => layer.id === "trend");

  assert.equal(trend.encoding.x.scale, "x");
  assert.equal(trend.encoding.y.scale, "y");
  assert.equal(trend.encoding.y.aggregate, "mean");
  assert.equal(trend.encoding.y.stack, undefined);
  assert.ok(layered.graphicSpec.objects.trend.items.length > 0);
});

test("captures horizontal grouped bars and the implemented palette shorthand", () => {
  const horizontal = canvas()
    .createData({ values: rows })
    .createBarMark({ id: "bars" })
    .encodeX({ field: "Acceleration", aggregate: "mean" })
    .encodeY({ field: "Year", fieldType: "ordinal" });
  const grouped = horizontal.encodeColor({ field: "Origin", layout: "group" });
  const groupedLayer = grouped.semanticSpec.layers.find(layer => layer.id === "bars");
  assert.equal(groupedLayer.encoding.yOffset.field, "Origin");
  assert.equal(groupedLayer.encoding.yOffset.scale, "yOffset");
  assert.ok(grouped.graphicSpec.objects.bars.items.length > 0);

  const colored = canvas()
    .createData({ values: rows })
    .createPointMark({ id: "points" })
    .encodeX({ field: "Horsepower" })
    .encodeY({ field: "Miles_per_Gallon" })
    .encodeColor({ field: "Origin" });
  assert.deepEqual(
    colored.editScale({ id: "color", palette: "set2" })
      .semanticSpec.scales.find(scale => scale.id === "color").range,
    { palette: "set2" }
  );
  assert.deepEqual(
    colored.editScale({ id: "color", range: { palette: "set2" } })
      .semanticSpec.scales.find(scale => scale.id === "color").range,
    { palette: "set2" }
  );
});

test("captures stale state after raw graphic removal", () => {
  const titled = chart()
    .createCanvas({
      width: 420,
      height: 300,
      margin: { top: 70, right: 40, bottom: 50, left: 60 }
    })
    .createData({ values: rows })
    .createPointMark()
    .encodeX({ field: "Horsepower" })
    .encodeY({ field: "Miles_per_Gallon" })
    .createTitle({ text: "Cars" });
  const removed = titled.editGraphics({ target: "chartTitle", remove: true });

  assert.equal(removed.semanticSpec.title.text, "Cars");
  assert.throws(
    () => removed.editCanvas({ width: 440 }),
    /requires an existing chart title graphic/
  );
});
