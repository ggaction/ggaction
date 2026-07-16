import assert from "node:assert/strict";
import test from "node:test";

import { loadCars } from "../../support/data.js";
import { selectGroupedMaximumHorsepower } from "./reference-values.js";

test("locks grouped maximum-Horsepower rows independently", () => {
  const values = selectGroupedMaximumHorsepower(loadCars());
  assert.equal(values.rows.length, 392);
  assert.deepEqual(
    values.selected.map(({ index, row }) => ({
      index,
      origin: row.Origin,
      name: row.Name,
      horsepower: row.Horsepower
    })),
    [
      {
        index: 115,
        origin: "USA",
        name: "pontiac grand prix",
        horsepower: 230
      },
      {
        index: 330,
        origin: "Japan",
        name: "datsun 280-zx",
        horsepower: 132
      },
      {
        index: 275,
        origin: "Europe",
        name: "peugeot 604sl",
        horsepower: 133
      }
    ]
  );
});
