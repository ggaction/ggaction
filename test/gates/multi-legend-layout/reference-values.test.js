import assert from "node:assert/strict";
import test from "node:test";

import {
  CARS_LEGEND_TARGET,
  MULTI_LEGEND_CURRENT,
  MULTI_LEGEND_TARGET
} from "./reference-values.js";

test("locks the independent multi-legend review coordinates", () => {
  assert.equal(CARS_LEGEND_TARGET.categoricalTitleShiftX, 22);
  assert.equal(CARS_LEGEND_TARGET.symbolCenterX, 616);
  assert.equal(CARS_LEGEND_TARGET.labelX, 644);
  assert.equal(
    MULTI_LEGEND_CURRENT.sizeTitle.x -
      MULTI_LEGEND_CURRENT.categoricalTitle.x,
    22
  );
  assert.deepEqual(
    MULTI_LEGEND_CURRENT.categoricalTitle,
    { x: 528, y: 60 }
  );
  assert.deepEqual(
    MULTI_LEGEND_CURRENT.opacityTitle,
    { x: 550, y: 60 }
  );
});

test("keeps target blocks aligned and at least 24 pixels apart", () => {
  assert.equal(MULTI_LEGEND_TARGET.titleX, 550);
  assert.equal(MULTI_LEGEND_TARGET.symbolCenterX, 566);
  assert.equal(MULTI_LEGEND_TARGET.labelX, 594);
  assert.equal(
    MULTI_LEGEND_TARGET.labelX - MULTI_LEGEND_TARGET.symbolCenterX,
    28
  );
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
  assert.equal(MULTI_LEGEND_TARGET.opacity.bottom < 480, true);
});
