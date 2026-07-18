import assert from "node:assert/strict";
import test from "node:test";

import { loadGapminder } from "../../support/data.js";
import {
  HEATMAP_COUNTRIES,
  HEATMAP_YEARS,
  createHeatmapReference,
  createRangedCellReference
} from "./reference-values.js";

test("locks independent discrete heatmap cells and continuous colors", () => {
  const reference = createHeatmapReference(loadGapminder());

  assert.equal(reference.cells.length, HEATMAP_COUNTRIES.length * HEATMAP_YEARS.length);
  assert.deepEqual(reference.domains.color, [27.79, 82.5]);
  assert.deepEqual(reference.cells[0], {
    key: "Afghanistan\u00001955",
    country: "Afghanistan",
    year: 1955,
    value: 43.88,
    x: 110,
    y: 70,
    width: 48.18181818181818,
    height: 49.166666666666664,
    fill: "#365e8d",
    label: "44",
    labelFill: "#f8fafc"
  });
  assert.equal(reference.cells.at(-1).key, "United States\u00002005");
  assert.equal(reference.legend.strips.length, 60);
  assert.deepEqual(reference.legend.labels.map(label => label.text), [
    "27.8", "41.5", "55.1", "68.8", "82.5"
  ]);
});

test("omits missing combinations instead of inventing placeholder cells", () => {
  const rows = loadGapminder().filter(row =>
    !(row.country === "India" && row.year === 1980)
  );
  const reference = createHeatmapReference(rows);

  assert.equal(reference.cells.length, 65);
  assert.equal(
    reference.cells.some(cell => cell.country === "India" && cell.year === 1980),
    false
  );
});

test("locks explicit ranged rect endpoints independently from discrete mapping", () => {
  const ranged = createRangedCellReference(loadGapminder());

  assert.equal(ranged.length, 4);
  assert.deepEqual(ranged[0], {
    x: 110,
    x2: 158.1818181818182,
    y: 70,
    y2: 119.16666666666666,
    fill: "#365e8d"
  });
  assert.ok(ranged.every(cell => cell.x2 > cell.x && cell.y2 > cell.y));
});
