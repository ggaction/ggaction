import assert from "node:assert/strict";
import test from "node:test";

import { loadGapminder } from "../../support/data.js";
import {
  enumerateLabelOffsets,
  oracleTextBounds,
  oracleTextWidth,
  resolveLabelLayoutOracle,
  resolveLeaderSegment
} from "../../oracles/label-layout.js";
import { LABEL_LAYOUT } from "./fixture.js";
import { createGapminderCountryLabelPrimitiveResult } from "./primitive.program.js";

test("locks independent text metrics and displacement candidate order", () => {
  assert.equal(Math.abs(oracleTextWidth("Wi", 10) - 10.9) < 1e-12, true);
  const bounds = oracleTextBounds({
      x: 50,
      y: 20,
      text: "Wi",
      fontSize: 10,
      textAlign: "center",
      textBaseline: "middle"
  });
  assert.equal(Math.abs(bounds.left - 44.55) < 1e-12, true);
  assert.equal(Math.abs(bounds.right - 55.45) < 1e-12, true);
  assert.equal(bounds.top, 15);
  assert.equal(bounds.bottom, 25);
  assert.deepEqual(
    enumerateLabelOffsets({ axis: "both", padding: 3, maxDisplacement: 6 })
      .slice(0, 5)
      .map(({ x, y }) => ({ x, y })),
    [
      { x: 0, y: 0 },
      { x: 0, y: -3 },
      { x: 0, y: 3 },
      { x: 3, y: 0 },
      { x: -3, y: 0 }
    ]
  );
});

test("keeps separated labels fixed and warns deterministically when impossible", () => {
  const separated = resolveLabelLayoutOracle({
    items: [
      { id: "a", x: 10, y: 10, sourceX: 10, sourceY: 10, text: "A", fontSize: 10 },
      { id: "b", x: 70, y: 40, sourceX: 70, sourceY: 40, text: "B", fontSize: 10 }
    ],
    bounds: { left: 0, right: 100, top: 0, bottom: 50 }
  });
  assert.deepEqual(separated.items.map(item => [item.dx, item.dy]), [[0, 0], [0, 0]]);
  assert.deepEqual(separated.warnings, []);

  const impossible = resolveLabelLayoutOracle({
    items: [
      { id: "a", x: 5, y: 5, sourceX: 5, sourceY: 5, text: "Wide", fontSize: 20 },
      { id: "b", x: 5, y: 5, sourceX: 5, sourceY: 5, text: "Wide", fontSize: 20 }
    ],
    padding: 3,
    maxDisplacement: 0,
    bounds: { left: 0, right: 20, top: 0, bottom: 10 }
  });
  assert.deepEqual(impossible.warnings.map(warning => warning.code), ["overlap", "bounds"]);
});

test("authors the Gapminder primitive with bounded labels and exact leaders", () => {
  const result = createGapminderCountryLabelPrimitiveResult(loadGapminder());
  assert.equal(result.rows.length, 18);
  assert.equal(result.resolution.overlapBefore > 0, true);
  assert.equal(result.resolution.overlapAfter, 0);
  assert.deepEqual(result.resolution.warnings, []);
  assert.equal(result.leaders.length > 0, true);
  assert.equal(result.resolution.items.every(item =>
    item.distance <= LABEL_LAYOUT.maxDisplacement + 1e-9 &&
    item.collisionBounds.left >= LABEL_LAYOUT.plot.left &&
    item.collisionBounds.right <= LABEL_LAYOUT.plot.right &&
    item.collisionBounds.top >= LABEL_LAYOUT.plot.top &&
    item.collisionBounds.bottom <= LABEL_LAYOUT.plot.bottom
  ), true);
  assert.deepEqual(
    result.leaders,
    result.resolution.items.map(resolveLeaderSegment).filter(Boolean)
  );
  assert.deepEqual(
    result.program.graphicSpec.objects.countryLabels.items.map(
      item => [item.properties.x, item.properties.y]
    ),
    result.resolution.items.map(item => [item.x, item.y])
  );
  const children = result.program.graphicSpec.objects["plot-main"].children;
  assert.equal(children.indexOf("countryLabelLeaders") < children.indexOf("countries"), true);
  assert.equal(children.indexOf("countries") < children.indexOf("countryLabels"), true);
  assert.equal(result.program.trace.children.some(node => node.op === "layoutLabels"), false);
});
