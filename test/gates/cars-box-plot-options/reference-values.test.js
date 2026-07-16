import assert from "node:assert/strict";
import test from "node:test";

import { loadCars } from "../../support/data.js";
import { BOX_PLOT_FIELDS } from "../../charts/cars-box-plot/reference-values.js";
import {
  STYLED_FACTOR_STYLE,
  createCarsStyledFactorReferenceValues
} from "./reference-values.js";

test("locks factor 1.0 whiskers and the expanded outlier set", () => {
  const values = createCarsStyledFactorReferenceValues(loadCars());

  assert.equal(values.outliers.length, 25);
  assert.deepEqual(values.outlierSourceIndices, [
    218, 245, 251, 252, 282, 284, 302, 308, 309, 315, 316, 329, 332,
    333, 336, 337, 351, 357, 358, 377, 386, 387, 395, 399, 402
  ]);
  assert.deepEqual(values.summaries.map(row => ({
    origin: row.Origin,
    lower: row[BOX_PLOT_FIELDS.lowerWhisker],
    upper: row[BOX_PLOT_FIELDS.upperWhisker]
  })), [
    { origin: "USA", lower: 9, upper: 32.1 },
    { origin: "Japan", lower: 18, upper: 40.8 },
    { origin: "Europe", lower: 18, upper: 37.3 }
  ]);
});

test("keeps factor independent from the approved style geometry", () => {
  const values = createCarsStyledFactorReferenceValues(loadCars());

  assert.deepEqual(values.boxes.map(box => box.width), [40, 40, 40]);
  assert.deepEqual(values.medians.map(rule => rule.x2 - rule.x1), [40, 40, 40]);
  assert.equal(STYLED_FACTOR_STYLE.band, 0.5);
  assert.ok(values.outlierGraphics.every(graphic =>
    graphic.type === "path" &&
    graphic.properties.fill === "#111111" &&
    graphic.properties.opacity === 0.9
  ));
});
