import assert from "node:assert/strict";
import test from "node:test";

import { loadGapminder, loadJobs } from "../../support/data.js";
import {
  GAPMINDER_POLAR_TARGET,
  JOBS_RADAR_ROLES,
  buildPolarSeriesCommands,
  createGapminderPolarLineReference,
  createJobsRadarReference
} from "./reference-values.js";

test("locks the open Gapminder Polar series and intentional seam", () => {
  const values = createGapminderPolarLineReference(loadGapminder());

  assert.deepEqual(values.frame, { cx: 320, cy: 310, radius: 240 });
  assert.equal(values.validRows.length, 33);
  assert.deepEqual(values.series.map(series => series.key), [
    "India",
    "Japan",
    "South Africa"
  ]);
  for (const series of values.series) {
    assert.equal(series.commands.length, 11);
    assert.equal(series.commands[0].op, "M");
    assert.equal(series.commands.slice(1).every(command => command.op === "L"), true);
    assert.notEqual(series.commands.at(-1).op, "Z");
    assert.notDeepEqual(series.points[0], series.points.at(-1));
  }
  assert.deepEqual(values.series[0].rows.map(row => row.year), [
    1955, 1960, 1965, 1970, 1975, 1980,
    1985, 1990, 1995, 2000, 2005
  ]);
  assert.equal(values.series[0].commands[0].x, 320);
  assert.ok(Math.abs(values.series[0].commands.at(-1).x - 239.22) < 1e-9);
});

test("locks Jobs shares, categorical theta order, and one closing command", () => {
  const values = createJobsRadarReference(loadJobs());

  assert.deepEqual(values.frame, { cx: 360, cy: 325, radius: 235 });
  assert.equal(values.radarRows.length, 16);
  assert.deepEqual(values.series.map(series => series.key), ["men", "women"]);
  for (const role of JOBS_RADAR_ROLES) {
    const rows = values.radarRows.filter(row => row.role === role);
    assert.equal(rows.length, 2);
    assert.ok(Math.abs(rows[0].share + rows[1].share - 1) < 1e-12);
  }
  for (const series of values.series) {
    assert.equal(series.commands.length, 9);
    assert.equal(series.commands[0].op, "M");
    assert.equal(series.commands.slice(1, -1).every(command => command.op === "L"), true);
    assert.deepEqual(series.commands.at(-1), { op: "Z" });
    assert.equal(series.commands.filter(command => command.op === "Z").length, 1);
    assert.deepEqual(series.rows.map(row => row.role), JOBS_RADAR_ROLES);
  }
});

test("keeps equal theta values stable and supports reversed continuous domains", () => {
  const frame = { cx: 0, cy: 0, radius: 10 };
  const rows = [
    { group: "a", theta: 1, radius: 2, name: "first" },
    { group: "a", theta: 0, radius: 1, name: "zero" },
    { group: "a", theta: 1, radius: 3, name: "second" }
  ];
  const [series] = buildPolarSeriesCommands({
    rows,
    groupField: "group",
    thetaField: "theta",
    radiusField: "radius",
    theta: { type: "continuous", domain: [2, 0], range: [0, 180] },
    radiusDomain: [0, 4],
    frame
  });

  assert.deepEqual(series.rows.map(row => row.name), ["first", "second", "zero"]);
  assert.equal(series.commands[0].op, "M");
  assert.equal(series.commands.at(-1).op, "L");
});

test("keeps one-point series open and rejects invalid reference rows", () => {
  const [series] = buildPolarSeriesCommands({
    rows: [{ group: "a", theta: "north", radius: 1 }],
    groupField: "group",
    thetaField: "theta",
    radiusField: "radius",
    theta: { type: "categorical", domain: ["north"] },
    radiusDomain: [0, 1],
    frame: { cx: 0, cy: 0, radius: 10 },
    closed: true
  });

  assert.equal(series.commands.length, 1);
  assert.equal(series.commands[0].op, "M");
  assert.throws(
    () => buildPolarSeriesCommands({
      rows: [{ group: "a", theta: "missing", radius: 1 }],
      groupField: "group",
      thetaField: "theta",
      radiusField: "radius",
      theta: { type: "categorical", domain: ["north"] },
      radiusDomain: [0, 1],
      frame: { cx: 0, cy: 0, radius: 10 }
    }),
    /Unknown theta value/
  );
  assert.throws(
    () => createGapminderPolarLineReference([]),
    /requires 33 selected rows/
  );
  assert.throws(
    () => createJobsRadarReference([]),
    /requires two rows/
  );
  assert.deepEqual(GAPMINDER_POLAR_TARGET.thetaRange, [0, 330]);
});
