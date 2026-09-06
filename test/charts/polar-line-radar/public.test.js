import assert from "node:assert/strict";
import test from "node:test";

import { createGapminderPolarTrends } from
  "../../../examples/gapminder-polar-trends/program.js";
import { createJobsRadarChart } from
  "../../../examples/jobs-radar-chart/program.js";
import { assertChartProgramsEquivalent } from
  "../../support/chart-equivalence.js";
import { loadGapminder, loadJobs } from "../../support/data.js";
import {
  createGapminderPolarLinePrimitives,
  createJobsRadarPrimitives
} from "./primitive.program.js";

test("matches the approved open Polar trend primitive exactly", () => {
  const rows = loadGapminder();
  const primitiveProgram = createGapminderPolarLinePrimitives(rows);
  const publicProgram = createGapminderPolarTrends(rows);

  assertChartProgramsEquivalent({ primitiveProgram, publicProgram });
  assert.equal(publicProgram.graphicSpec.objects.line.items.length, 3);
  assert.equal(publicProgram.graphicSpec.objects.line.items.every(item =>
    item.properties.commands.at(-1).op !== "Z"
  ), true);
});

test("matches the approved closed radar primitive exactly", () => {
  const rows = loadJobs();
  const primitiveProgram = createJobsRadarPrimitives(rows);
  const publicProgram = createJobsRadarChart(rows);

  assertChartProgramsEquivalent({ primitiveProgram, publicProgram });
  assert.equal(publicProgram.graphicSpec.objects.line.items.length, 2);
  assert.equal(publicProgram.graphicSpec.objects.line.items.every(item =>
    item.properties.commands.at(-1).op === "Z"
  ), true);
});

test("records Polar line materialization under the facade action hierarchy", () => {
  const program = createGapminderPolarTrends(loadGapminder());
  const facade = program.trace.children.find(node => node.op === "createPolarLinePlot");
  const create = facade.children.find(node => node.op === "createLineMark");
  const theta = facade.children.find(node => node.op === "encodeTheta");
  const radius = facade.children.find(node => node.op === "encodeR");

  assert.equal(create.args.closed, undefined);
  assert.equal(theta.children.some(node => node.op === "rematerializeLineMark"), false);
  assert.equal(radius.children.some(node => node.op === "rematerializeLineMark"), true);
});
