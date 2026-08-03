import assert from "node:assert/strict";
import test from "node:test";

import {
  CARS_LEGEND_TARGET,
  MULTI_LEGEND_CURRENT,
  MULTI_LEGEND_ROWS,
  MULTI_LEGEND_TARGET
} from "./reference-values.js";

test("locks the independent multi-legend review coordinates", () => {
  assert.equal(CARS_LEGEND_TARGET.categoricalShiftX, 22);
  assert.equal(
    MULTI_LEGEND_CURRENT.sizeTitle.x -
      MULTI_LEGEND_CURRENT.categoricalTitle.x,
    22
  );
  assert.deepEqual(
    MULTI_LEGEND_CURRENT.categoricalTitle,
    { x: 448, y: 60 }
  );
  assert.deepEqual(
    MULTI_LEGEND_CURRENT.opacityTitle,
    { x: 470, y: 60 }
  );
  assert.equal(MULTI_LEGEND_ROWS.length, 3);
});

test("keeps target blocks aligned and at least 24 pixels apart", () => {
  assert.equal(MULTI_LEGEND_TARGET.titleX, 470);
  assert.deepEqual(MULTI_LEGEND_TARGET.category.itemY, [92, 120, 148]);
  assert.deepEqual(MULTI_LEGEND_TARGET.size.itemY, [219, 259, 299]);
  assert.deepEqual(MULTI_LEGEND_TARGET.opacity.itemY, [364, 392, 420]);
  const sizeTitleTop = MULTI_LEGEND_TARGET.size.titleY - 13 / 2;
  const opacityTitleTop = MULTI_LEGEND_TARGET.opacity.titleY - 13 / 2;
  assert.equal(
    sizeTitleTop - MULTI_LEGEND_TARGET.category.bottom >=
      MULTI_LEGEND_TARGET.blockGap,
    true
  );
  assert.equal(
    opacityTitleTop - MULTI_LEGEND_TARGET.size.bottom >=
      MULTI_LEGEND_TARGET.blockGap,
    true
  );
  assert.equal(MULTI_LEGEND_TARGET.opacity.bottom < 460, true);
});
