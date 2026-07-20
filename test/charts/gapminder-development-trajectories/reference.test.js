import assert from "node:assert/strict";
import test from "node:test";

import { orderPathRows } from "../../oracles/path-order.js";
import { loadGapminder } from "../../support/data.js";
import {
  TRAJECTORY_COUNTRIES,
  TRAJECTORY_YEARS,
  createTrajectoryRows
} from "./fixture.js";

test("orders every Gapminder country trajectory by year without losing rows", () => {
  const rows = createTrajectoryRows(loadGapminder());
  const sourceSnapshot = rows.map(row => [row.country, row.year]);
  const series = orderPathRows(rows, {
    field: "year",
    groupBy: ["country"]
  });

  assert.equal(rows.length, 33);
  assert.deepEqual(series.map(item => item.key.country), TRAJECTORY_COUNTRIES);
  assert.deepEqual(
    series.map(item => item.orderValues),
    TRAJECTORY_COUNTRIES.map(() => TRAJECTORY_YEARS)
  );
  assert.equal(series.flatMap(item => item.rows).length, rows.length);
  assert.deepEqual(rows.map(row => [row.country, row.year]), sourceSnapshot);
  assert.deepEqual(
    series[0].rows.slice(0, 3).map(row => [
      row.year,
      row.fertility,
      row.life_expect
    ]),
    [
      [1955, 6.16, 53.92],
      [1960, 4.33, 27.79],
      [1965, 6.53, 58.47]
    ]
  );
});

test("supports descending order and stable ties at repeated positions", () => {
  const rows = [
    { group: "a", step: 2, x: 1, y: 1, id: "first-tie" },
    { group: "a", step: 1, x: 1, y: 0, id: "start" },
    { group: "b", step: 1, x: 2, y: 0, id: "other" },
    { group: "a", step: 2, x: 1, y: 2, id: "second-tie" }
  ];
  const ascending = orderPathRows(rows, {
    field: "step",
    groupBy: ["group"]
  });
  const descending = orderPathRows(rows, {
    field: "step",
    order: "descending",
    groupBy: ["group"]
  });

  assert.deepEqual(
    ascending[0].rows.map(row => row.id),
    ["start", "first-tie", "second-tie"]
  );
  assert.deepEqual(
    descending[0].rows.map(row => row.id),
    ["first-tie", "second-tie", "start"]
  );
  assert.equal(ascending[0].rows.filter(row => row.x === 1).length, 3);
});

test("rejects missing or non-finite topology values", () => {
  assert.throws(
    () => orderPathRows([{ step: undefined }], { field: "step" }),
    /finite numbers/
  );
  assert.throws(
    () => orderPathRows([{ step: Number.NaN }], { field: "step" }),
    /finite numbers/
  );
  assert.throws(
    () => orderPathRows([{ step: 1 }], { field: "step", order: "sideways" }),
    /Unknown path-order direction/
  );
});
