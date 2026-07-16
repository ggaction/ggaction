import assert from "node:assert/strict";
import test from "node:test";

import { resolveGridLineGeometry } from "../../../src/layout/grid.js";

const bounds = Object.freeze({ x: 10, y: 20, width: 100, height: 60 });

test("resolves horizontal and vertical grid geometry from the same bounds", () => {
  assert.deepEqual(resolveGridLineGeometry({
    direction: "horizontal",
    values: [0, 1],
    positions: [30, 50],
    bounds
  }), {
    values: [0, 1],
    x1: 10,
    y1: [30, 50],
    x2: 110,
    y2: [30, 50]
  });
  assert.deepEqual(resolveGridLineGeometry({
    direction: "vertical",
    values: [0, 1],
    positions: [40, 80],
    bounds
  }), {
    values: [0, 1],
    x1: [40, 80],
    y1: 20,
    x2: [40, 80],
    y2: 80
  });
});
