import assert from "node:assert/strict";
import test from "node:test";

import {
  createGapminderBandPointChart,
  createGapminderTimeChart
} from "../../../examples/gapminder-temporal-discrete-scales/program.js";
import { assertChartProgramsEquivalent } from
  "../../support/chart-equivalence.js";
import { loadGapminder } from "../../support/data.js";
import {
  createGapminderBandPointPrimitives,
  createGapminderTimePrimitives
} from "./primitive.program.js";

const gapminder = loadGapminder();

test("builds layered band bars and inferred point centers with public actions", () => {
  const program = createGapminderBandPointChart(gapminder);
  const bar = program.semanticSpec.layers.find(layer => layer.id === "bar");
  const point = program.semanticSpec.layers.find(layer => layer.id === "point");
  const scale = program.semanticSpec.scales.find(item => item.id === "x");

  assert.equal(scale.type, "band");
  assert.equal(scale.paddingInner, 0.2);
  assert.equal(scale.paddingOuter, 0.1);
  assert.equal(point.data, bar.data);
  assert.equal(point.coordinate, bar.coordinate);
  assert.deepEqual(point.encoding, {
    x: { field: "country", fieldType: "nominal", scale: "x" },
    y: { field: "pop", fieldType: "quantitative", scale: "y" }
  });
  assert.equal(point.encoding.y.aggregate, undefined);
  assert.deepEqual(program.trace.children.map(node => node.op), [
    "createCanvas",
    "createData",
    "filterData",
    "filterData",
    "createBarMark",
    "encodeX",
    "encodeY",
    "encodeBarWidth",
    "editBarMark",
    "createPointMark",
    "encodeRadius",
    "editPointMark",
    "createGuides",
    "createTitle"
  ]);
});

test("builds UTC time lines with public actions", () => {
  const program = createGapminderTimeChart(gapminder);
  const scale = program.semanticSpec.scales.find(item => item.id === "x");

  assert.equal(scale.type, "time");
  assert.deepEqual(program.resolvedScales.x.domain, [
    Date.UTC(1955, 0, 1),
    Date.UTC(2005, 0, 1)
  ]);
  assert.deepEqual(
    program.graphicSpec.objects.xAxisLabels.children.map(
      child => child.properties.text
    ),
    ["1960", "1970", "1980", "1990", "2000"]
  );
});

test("exactly matches both approved primitive programs", () => {
  assertChartProgramsEquivalent({
    publicProgram: createGapminderBandPointChart(gapminder),
    primitiveProgram: createGapminderBandPointPrimitives(gapminder)
  });
  assertChartProgramsEquivalent({
    publicProgram: createGapminderTimeChart(gapminder),
    primitiveProgram: createGapminderTimePrimitives(gapminder)
  });
});
