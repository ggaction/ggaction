import assert from "node:assert/strict";
import test from "node:test";

import { assertPolarTextLayout } from
  "../../../src/layout/labels.js";

const canvas = Object.freeze({
  properties: Object.freeze({ width: 100, height: 80 })
});
const item = (x, y, text = "A") => ({
  x,
  y,
  text,
  fontSize: 10,
  textAlign: "center",
  textBaseline: "middle"
});

test("accepts separated Polar text and coincident seam endpoints", () => {
  assert.doesNotThrow(() => assertPolarTextLayout({
    canvas,
    label: "Theta axis labels",
    items: [item(20, 20), item(80, 60)]
  }));
  assert.doesNotThrow(() => assertPolarTextLayout({
    canvas,
    label: "Theta axis labels",
    items: [item(50, 40, "0"), item(50, 40, "360")]
  }));
});

test("rejects invalid Canvas space, clipping, and distinct-anchor overlap", () => {
  assert.throws(
    () => assertPolarTextLayout({
      canvas: { properties: { width: 0, height: 80 } },
      label: "Theta axis labels",
      items: [item(20, 20)]
    }),
    /finite Canvas dimensions/
  );
  assert.throws(
    () => assertPolarTextLayout({
      canvas,
      label: "Theta axis title",
      items: [item(1, 20, "clipped")]
    }),
    /title requires sufficient non-overlapping Canvas space/
  );
  assert.throws(
    () => assertPolarTextLayout({
      canvas,
      label: "Theta axis labels",
      items: [item(40, 40, "wide"), item(42, 40, "wide")]
    }),
    /labels require sufficient non-overlapping Canvas space/
  );
});
