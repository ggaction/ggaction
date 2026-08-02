import assert from "node:assert/strict";
import test from "node:test";

import {
  AIRLINE_DATA_SOURCE,
  AIRLINE_PASSENGER_ROWS,
  CENTERED_MEAN_ROWS,
  TRAILING_MEAN_ROWS,
  TRAILING_SUM_ROWS
} from "./reference-values.js";

function close(actual, expected) {
  assert.equal(Math.abs(actual - expected) < 1e-10, true, `${actual} != ${expected}`);
}

test("anchors the published 2024-2025 U.S. airline passenger values", () => {
  assert.match(AIRLINE_DATA_SOURCE, /^https:\/\/www\.bts\.gov\//);
  assert.equal(AIRLINE_PASSENGER_ROWS.length, 24);
  assert.deepEqual(AIRLINE_PASSENGER_ROWS.slice(0, 3).map(row => row.passengers), [
    70.1, 70.4, 84.9
  ]);
  assert.deepEqual(AIRLINE_PASSENGER_ROWS.slice(-3).map(row => row.passengers), [
    84.2, 74.8, 81.2
  ]);
  assert.equal(Math.max(...AIRLINE_PASSENGER_ROWS.map(row => row.passengers)), 92.2);
  assert.equal(Math.min(...AIRLINE_PASSENGER_ROWS.map(row => row.passengers)), 67.2);
});

test("locks trailing, centered, and sum row-frame boundaries independently", () => {
  close(TRAILING_MEAN_ROWS[0].movingMean, 70.1);
  close(TRAILING_MEAN_ROWS[1].movingMean, 70.25);
  close(TRAILING_MEAN_ROWS[2].movingMean, 225.4 / 3);

  close(CENTERED_MEAN_ROWS[0].movingMean, 225.4 / 3);
  close(CENTERED_MEAN_ROWS[1].movingMean, 306.6 / 4);
  close(CENTERED_MEAN_ROWS[6].movingMean, 432.9 / 5);

  close(TRAILING_SUM_ROWS[0].movingSum, 70.1);
  close(TRAILING_SUM_ROWS[1].movingSum, 140.5);
  close(TRAILING_SUM_ROWS[2].movingSum, 225.4);
  close(TRAILING_SUM_ROWS.at(-1).movingSum, 240.2);
});
