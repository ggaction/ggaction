import assert from "node:assert/strict";
import test from "node:test";

import { walkGraphicDrawOrder } from "../../../src/grammar/schemas/graphicTree.js";
import { loadGapminder, loadJobs } from "../../support/data.js";
import {
  createGapminderPolarLineReference,
  createJobsRadarReference
} from "./reference-values.js";
import {
  createGapminderPolarLinePrimitives,
  createJobsRadarPrimitives
} from "./primitive.program.js";

function operations(node) {
  return node.children.flatMap(child => [child.op, ...operations(child)]);
}

function drawOrder(program) {
  const order = [];
  walkGraphicDrawOrder(program.graphicSpec, ({ id }) => order.push(id));
  return order;
}

const EXPECTED_DRAW_ORDER = Object.freeze([
  "canvas",
  "plot-main",
  "radialGridCircles",
  "thetaGridLines",
  "line",
  "thetaAxisLine",
  "thetaAxisTicks",
  "thetaAxisLabels",
  "thetaAxisTitle",
  "radialAxisLine",
  "radialAxisTicks",
  "radialAxisLabels",
  "radialAxisTitle",
  "seriesLegendSymbols",
  "seriesLegendLabels",
  "seriesLegendTitle"
]);

test("authors one open Polar path per selected Gapminder country", () => {
  const rows = loadGapminder();
  const values = createGapminderPolarLineReference(rows);
  const program = createGapminderPolarLinePrimitives(rows);

  assert.deepEqual(program.semanticSpec.coordinates, [{ id: "polar", type: "polar" }]);
  assert.deepEqual(program.semanticSpec.layers[0].encoding.group, {
    field: "country",
    fieldType: "nominal"
  });
  assert.deepEqual(program.graphicSpec.objects.line.items.map(
    item => item.properties.commands
  ), values.series.map(series => series.commands));
  assert.equal(program.graphicSpec.objects.line.items.length, 3);
  assert.equal(program.graphicSpec.objects.line.items.every(item =>
    item.properties.commands.at(-1).op !== "Z"
  ), true);
  assert.deepEqual(drawOrder(program), EXPECTED_DRAW_ORDER);
});

test("authors two closed Jobs radar paths without duplicating the first point", () => {
  const rows = loadJobs();
  const values = createJobsRadarReference(rows);
  const program = createJobsRadarPrimitives(rows);
  const paths = program.graphicSpec.objects.line.items.map(
    item => item.properties.commands
  );

  assert.deepEqual(program.semanticSpec.scales.find(scale => scale.id === "theta"), {
    id: "theta",
    type: "point",
    domain: values.thetaLabels.map(label => label.text),
    range: "auto",
    padding: 0.5,
    align: 0.5
  });
  assert.equal(paths.length, 2);
  for (const path of paths) {
    assert.equal(path.length, 9);
    assert.deepEqual(path.at(-1), { op: "Z" });
    assert.equal(path.filter(command => command.op === "Z").length, 1);
    assert.notDeepEqual(path[0], path.at(-2));
  }
  assert.deepEqual(program.graphicSpec.objects.seriesLegendLabels.items.map(
    item => item.properties.text
  ), ["men", "women"]);
  assert.deepEqual(drawOrder(program), EXPECTED_DRAW_ORDER);
});

test("keeps new Polar line actions out of both primitive traces", () => {
  const programs = [
    createGapminderPolarLinePrimitives(loadGapminder()),
    createJobsRadarPrimitives(loadJobs())
  ];

  for (const program of programs) {
    const trace = operations(program.trace);
    for (const operation of [
      "encodeTheta",
      "encodeR",
      "encodeGroup",
      "encodeColor",
      "createGuides",
      "createAxes",
      "createLegend",
      "rematerializeLineMark"
    ]) {
      assert.equal(trace.includes(operation), false, operation);
    }
  }
});

test("owns input data and keeps Polar line geometry finite", () => {
  const rows = loadGapminder();
  const program = createGapminderPolarLinePrimitives(rows);
  const before = program.semanticSpec.datasets[0].values[0].life_expect;
  rows.find(row => row.country === "India" && row.year === 1955).life_expect = -1;

  assert.equal(program.semanticSpec.datasets[0].values[0].life_expect, before);
  for (const item of program.graphicSpec.objects.line.items) {
    for (const command of item.properties.commands) {
      for (const value of Object.values(command)) {
        if (typeof value === "number") assert.equal(Number.isFinite(value), true);
      }
    }
  }
});
