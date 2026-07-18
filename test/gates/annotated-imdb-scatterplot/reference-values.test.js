import assert from "node:assert/strict";
import test from "node:test";

import { loadImdbTop1000 } from "../../support/data.js";
import {
  ANNOTATED_FILM_TITLES,
  createAnnotatedImdbValues
} from "./reference-values.js";

test("parses and selects the deterministic IMDb annotation fixture", () => {
  const rows = loadImdbTop1000();
  const values = createAnnotatedImdbValues(rows);

  assert.equal(rows.length, 1000);
  assert.deepEqual(values.rows.map(row => row.Series_Title), ANNOTATED_FILM_TITLES);
  assert.deepEqual(values.scales.y.domain, [8.4, 9.4]);
  assert.deepEqual(values.axes.x.ticks.map(tick => tick.label), [
    "1940", "1950", "1960", "1970", "1980", "1990", "2000", "2010", "2020"
  ]);
  assert.equal(values.labels[4].text, "Star Wars: Episode V - The Empire Strikes Back");
  assert.equal(values.labels.every((label, index) =>
    label.x === values.points[index].x + 7 &&
    label.y === values.points[index].y - 6
  ), true);
});

test("rejects an incomplete annotation fixture without choosing substitutes", () => {
  assert.throws(
    () => createAnnotatedImdbValues(
      loadImdbTop1000().filter(row => row.Series_Title !== "City Lights")
    ),
    /requires complete row "City Lights"/
  );
  assert.throws(() => createAnnotatedImdbValues({}), /must be an array/);
});
