import assert from "node:assert/strict";
import test from "node:test";

import { loadCars } from "../../support/data.js";
import { assertChartProgramsEquivalent } from "../../support/chart-equivalence.js";
import { createCarsGradientPlot } from
  "../../../examples/cars-gradient-plot/program.js";
import { createCarsGradientPlotReference } from "./fixture.js";
import { createCarsGradientPlotExpanded } from "./expanded.program.js";

test("builds the approved Cars gradient plot through the public facade", () => {
  const program = createCarsGradientPlot(loadCars());
  const owner = program.markConfigs.gradientPlot.gradientPlot;
  const profile = program.semanticSpec.datasets.find(
    dataset => dataset.id === owner.profileId
  );

  assert.deepEqual(program.trace.children.map(node => node.op), [
    "createCanvas",
    "createData",
    "createGradientPlot",
    "encodeColor",
    "createTitle"
  ]);
  assert.equal(profile.values.length, 3);
  assert.equal(profile.transform[0].bandwidth, "auto");
  assert.equal(profile.transform[0].extent, "auto");
  assert.deepEqual(profile.transform[0].resolved.extent, [8, 24.8]);
  assert.deepEqual(profile.transform[0].resolved.intensityDomain, [
    0,
    0.1894893456244104
  ]);
  assert.equal(program.graphicSpec.objects.gradientPlot.items.length, 3);
  assert.equal(program.graphicSpec.objects.gradientPlotCenter.items.length, 3);
  assert.equal(program.graphicSpec.objects.gradientPlotDensityLegend.type, "rect");
});

test("records meaningful wrapped ownership under createGradientPlot", () => {
  const program = createCarsGradientPlot(loadCars());
  const create = program.trace.children.find(node => node.op === "createGradientPlot");
  const operations = JSON.stringify(create);

  for (const operation of [
    "createRectMark",
    "createGradientProfileData",
    "materializeGradientProfileData",
    "materializeGradientPlotFill",
    "createGradientPlotCenter",
    "createGuides",
    "createGradientPlotLegend"
  ]) {
    assert.match(operations, new RegExp(`\\"op\\":\\"${operation}\\"`));
  }
});

test("matches the independently calculated grouped-density profile", () => {
  const cars = loadCars();
  const reference = createCarsGradientPlotReference(cars);
  const program = createCarsGradientPlot(cars);
  const profileId = program.markConfigs.gradientPlot.gradientPlot.profileId;
  const profile = program.semanticSpec.datasets.find(item => item.id === profileId);

  assert.deepEqual(
    profile.values.map(row => ({
      category: row.Origin,
      values: row.__gradientPlot_values,
      intensities: row.__gradientPlot_intensities,
      lower: row.__gradientPlot_lower,
      upper: row.__gradientPlot_upper,
      center: row.__gradientPlot_center,
      count: row.__gradientPlot_count
    })),
    reference.profiles.map(row => ({
      category: row.origin,
      values: row.__gradientPlot_values,
      intensities: row.__gradientPlot_intensities,
      lower: row.__gradientPlot_lower,
      upper: row.__gradientPlot_upper,
      center: row.__gradientPlot_center,
      count: row.count
    }))
  );
});

test("matches the fully expanded component program exactly", () => {
  const cars = loadCars();
  assertChartProgramsEquivalent({
    publicProgram: createCarsGradientPlot(cars),
    primitiveProgram: createCarsGradientPlotExpanded(cars)
  });
});
