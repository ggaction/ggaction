import assert from "node:assert/strict";
import test from "node:test";

import { createCarsDensityAreaValues } from
  "../fixtures/carsDensityAreaValues.js";
import { loadCars } from "../fixtures/data.js";

function assertApproximately(actual, expected, tolerance = 1e-12) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `Expected ${actual} to be within ${tolerance} of ${expected}.`
  );
}

test("derives deterministic grouped Gaussian KDE rows", () => {
  const values = createCarsDensityAreaValues(loadCars());

  assert.equal(values.validRows.length, 406);
  assert.deepEqual(values.fields, {
    source: "Acceleration",
    group: "Origin",
    value: "Acceleration_value",
    density: "Acceleration_density"
  });
  assert.equal(values.bandwidth, 0.6);
  assert.deepEqual(values.extent, [8, 24.8]);
  assert.equal(values.steps, 100);
  assert.deepEqual(values.groupDomain, ["USA", "Europe", "Japan"]);
  assert.equal(values.sampleValues.length, 100);
  assert.equal(values.sampleValues[0], 8);
  assert.equal(values.sampleValues.at(-1), 24.8);
  assert.equal(values.densityRows.length, 300);
  assert.deepEqual(
    values.groups.map(group => [group.group, group.values.length, group.rows.length]),
    [["USA", 254, 100], ["Europe", 73, 100], ["Japan", 79, 100]]
  );
});

test("uses one inclusive shared sample grid in deterministic group order", () => {
  const values = createCarsDensityAreaValues(loadCars());

  for (const group of values.groups) {
    assert.deepEqual(
      group.rows.map(row => row.Acceleration_value),
      values.sampleValues
    );
    assert.ok(group.rows.every((row, index, rows) =>
      Number.isFinite(row.Acceleration_density) &&
      row.Acceleration_density >= 0 &&
      (index === 0 || row.Acceleration_value > rows[index - 1].Acceleration_value)
    ));
  }
  assert.deepEqual(
    values.densityRows.map(row => row.Origin).filter(
      (group, index, rows) => index === 0 || group !== rows[index - 1]
    ),
    ["USA", "Europe", "Japan"]
  );
});

test("matches representative densities and group peaks", () => {
  const values = createCarsDensityAreaValues(loadCars());
  const [usa, europe, japan] = values.groups;

  assertApproximately(usa.rows[0].Acceleration_density, 0.009859325880617898);
  assertApproximately(usa.rows[50].Acceleration_density, 0.12609036165781357);
  assertApproximately(usa.rows.at(-1).Acceleration_density, 5.428335563759097e-7);
  assertApproximately(europe.rows[0].Acceleration_density, 2.1422842483688592e-13);
  assertApproximately(europe.rows[50].Acceleration_density, 0.10705195598533908);
  assertApproximately(europe.rows.at(-1).Acceleration_density, 0.020292121034104424);
  assertApproximately(japan.rows[0].Acceleration_density, 8.959746767977118e-10);
  assertApproximately(japan.rows[50].Acceleration_density, 0.1749811555080884);
  assertApproximately(japan.rows.at(-1).Acceleration_density, 1.6410228037299274e-11);
  assert.deepEqual(
    values.groups.map(group => group.peak.Acceleration_value),
    [15.636363636363637, 15.127272727272729, 16.654545454545456]
  );
  assertApproximately(usa.peak.Acceleration_density, 0.14031074287263104);
  assertApproximately(europe.peak.Acceleration_density, 0.20441491577254337);
  assertApproximately(japan.peak.Acceleration_density, 0.17664749130605972);
});

test("maps density areas, two-direction grids, axes, and top legend", () => {
  const values = createCarsDensityAreaValues(loadCars());

  assert.deepEqual(values.bounds, { x: 80, y: 130, width: 600, height: 300 });
  assert.deepEqual(values.scales, {
    x: { domain: [8, 24.8], range: [80, 680] },
    y: { domain: [0, 0.25], range: [430, 130] },
    color: {
      domain: ["USA", "Europe", "Japan"],
      range: ["#4c78a8", "#f58518", "#e45756"]
    }
  });
  assert.deepEqual(
    values.axes.x.ticks.map(tick => tick.value),
    [10, 15, 20]
  );
  assert.deepEqual(
    values.axes.y.ticks.map(tick => tick.value),
    [0, 0.05, 0.1, 0.15, 0.2, 0.25]
  );
  assert.deepEqual(values.areas.map(area => area.points.length), [102, 102, 102]);
  assert.deepEqual(values.areas.map(area => area.opacity), [0.5, 0.5, 0.5]);
  assert.ok(values.areas.every(area =>
    area.points[0].y === 430 && area.points.at(-1).y === 430
  ));
  assert.deepEqual(
    values.grid.horizontal.map(line => line.y1),
    values.axes.y.ticks.map(tick => tick.position)
  );
  assert.deepEqual(
    values.grid.vertical.map(line => line.x1),
    values.axes.x.ticks.map(tick => tick.position)
  );
  assert.deepEqual(
    values.legend.items.map(item => [item.group, item.color]),
    [
      ["USA", "#4c78a8"],
      ["Europe", "#f58518"],
      ["Japan", "#e45756"]
    ]
  );
  assert.deepEqual(
    [values.legend.position, values.legend.direction, values.legend.columns],
    ["top", "vertical", 3]
  );
});

test("resolves deterministic positive auto bandwidth", () => {
  const rows = [
    { value: 1, group: "a" },
    { value: 2, group: "a" },
    { value: 4, group: "b" },
    { value: 8, group: "b" }
  ];
  const options = {
    field: "value",
    groupBy: "group",
    bandwidth: "auto",
    steps: 5,
    as: ["sample", "density"]
  };
  const first = createCarsDensityAreaValues(rows, options);
  const second = createCarsDensityAreaValues(rows, options);

  assert.ok(Number.isFinite(first.bandwidth));
  assert.ok(first.bandwidth > 0);
  assert.equal(first.bandwidth, second.bandwidth);
  assert.deepEqual(first.densityRows, second.densityRows);
});

test("rejects invalid density inputs and degenerate automatic resolution", () => {
  assert.throws(() => createCarsDensityAreaValues({}), /array/);
  assert.throws(() => createCarsDensityAreaValues([], {}), /at least one valid/);
  assert.throws(
    () => createCarsDensityAreaValues(loadCars(), { bandwidth: 0 }),
    /positive finite/
  );
  assert.throws(
    () => createCarsDensityAreaValues(loadCars(), { extent: [2, 1] }),
    /ascending pair/
  );
  assert.throws(
    () => createCarsDensityAreaValues(loadCars(), { steps: 1 }),
    /at least 2/
  );
  assert.throws(
    () => createCarsDensityAreaValues(loadCars(), { as: ["value", "value"] }),
    /two distinct/
  );
  assert.throws(
    () => createCarsDensityAreaValues(loadCars(), { width: 0 }),
    /positive finite dimensions/
  );
  assert.throws(
    () => createCarsDensityAreaValues(loadCars(), {
      margin: { top: 130, right: 400, bottom: 70, left: 400 }
    }),
    /must leave positive plot bounds/
  );
  assert.throws(
    () => createCarsDensityAreaValues([
      { value: 1, group: "a" },
      { value: 1, group: "b" }
    ], {
      field: "value",
      groupBy: "group",
      bandwidth: "auto",
      as: ["sample", "density"]
    }),
    /auto bandwidth requires varying/
  );
  assert.throws(
    () => createCarsDensityAreaValues([
      { value: 1, group: "a" },
      { value: 1, group: "b" }
    ], {
      field: "value",
      groupBy: "group",
      as: ["sample", "density"]
    }),
    /observed extent requires varying/
  );
});

test("does not mutate or retain caller-owned rows", () => {
  const cars = loadCars();
  const before = structuredClone(cars);
  const values = createCarsDensityAreaValues(cars);

  assert.deepEqual(cars, before);
  values.validRows[0].Origin = "changed";
  values.groups[0].values[0] = -1;
  values.densityRows[0].Origin = "changed";
  assert.deepEqual(cars, before);
});
