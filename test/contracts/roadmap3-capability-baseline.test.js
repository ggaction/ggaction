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

test("records the current missing Roadmap 3 public surface", () => {
  const program = chart();
  for (const name of [
    "encodeTheta",
    "encodeR",
    "encodePointRadius",
    "encodeYOffset",
    "createTextMark",
    "createRectMark",
    "createArcMark",
    "facet",
    "editBoxPlot",
    "removeLegend"
  ]) {
    assert.equal(program[name], undefined, name);
  }
  assert.equal(ggaction.hconcat, undefined);
  assert.equal(ggaction.vconcat, undefined);
});

test("stores a Polar resource without claiming Polar chart materialization", () => {
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

test("captures the current incompatible layer-inference order", () => {
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

  assert.throws(
    () => ruleFirst.createPointMark({ id: "points" }),
    /Encoding field must be a non-empty string/
  );
});

test("captures the current layered bar and line scale-policy conflict", () => {
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

  assert.throws(
    () => layered.encodeX({
      target: "trend",
      field: "Year",
      fieldType: "temporal",
      scale: { id: "x" }
    }),
    /temporal bar position scale cannot share a non-bar layout policy/
  );
});

test("captures the horizontal grouped-bar gap and the implemented palette shorthand", () => {
  const horizontal = canvas()
    .createData({ values: rows })
    .createBarMark({ id: "bars" })
    .encodeX({ field: "Acceleration", aggregate: "mean" })
    .encodeY({ field: "Year", fieldType: "ordinal" });
  assert.throws(
    () => horizontal.encodeColor({ field: "Origin", layout: "group" }),
    /Horizontal bars do not support color layout "group" until yOffset is available/
  );

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
