import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { getErrorDetails } from "../../../../src/core/diagnostics.js";
import {
  canvasOverflowError,
  resolveCanvasOverflow,
  resolveGraphicBounds
} from "../../../../src/layout/canvas.js";

import { resolveSingleHorizontalLegendPlacement } from "../../../../src/layout/legendLane.js";

const canvas = { width: 100, height: 80 };

test("Canvas overflow measures the outermost occupied edge on each side", () => {
  const bounds = [
    { left: -12, right: 30, top: -3, bottom: 45 },
    { left: 0, right: 107, top: 12, bottom: 91 },
    { left: -2, right: 104, top: -1, bottom: 85 }
  ];
  const original = structuredClone(bounds);
  const overflow = resolveCanvasOverflow(bounds, canvas);
  assert.deepEqual(overflow, { top: 3, right: 7, bottom: 11, left: 12 });
  assert.equal(Object.isFrozen(overflow), true);
  assert.deepEqual(bounds, original);
  assert.deepEqual(canvas, { width: 100, height: 80 });
});

test("Canvas overflow excludes contained geometry and invalid measurements", () => {
  const inside = { left: 0, right: 100, top: 0, bottom: 80 };
  for (const bounds of [[], [inside], [{ ...inside, right: 100 + 1e-10 }]]) {
    assert.equal(resolveCanvasOverflow(bounds, canvas), undefined);
  }
  for (const bounds of [undefined, [null], [{ ...inside, right: Infinity }],
    [{ ...inside, left: 101 }], [{ ...inside, top: 81 }]]) {
    assert.equal(resolveCanvasOverflow(bounds, canvas), undefined);
  }
  for (const invalid of [undefined, {}, { width: 0, height: 80 }, { width: 100, height: NaN }]) {
    assert.equal(resolveCanvasOverflow([inside], invalid), undefined);
  }
});

test("Canvas errors retain their message and expose only recoverable overflow", () => {
  const error = canvasOverflowError("Guide does not fit.", [
    { left: -4, right: 100, top: 0, bottom: 80 }
  ], canvas);
  assert.equal(error.constructor, Error);
  assert.equal(error.message, "Guide does not fit.");
  assert.deepEqual(getErrorDetails(error), {
    reason: "canvas-overflow",
    canvasOverflow: { top: 0, right: 0, bottom: 0, left: 4 }
  });
  assert.equal(getErrorDetails(canvasOverflowError("Invalid geometry.", [], canvas)), undefined);
});

test("Measured guide failures permit immutable retries preserving a small inner plot", () => {
  const labels = ["Long category label alpha", "Long category label beta"];
  const source = chart().createCanvas({ width: 130, height: 130, margin: 50 })
    .createData({ values: labels.flatMap((x, i) => labels.map((y, j) => ({ x, y, z: i + j }))) });
  const before = JSON.stringify(source);
  const create = program => program.createHeatmap({
    x: "x", y: "y", color: { field: "z", fieldType: "quantitative" },
    guides: {
      axes: {
        x: { title: false, ticksAndLabels: { labels: { rotation: { value: -90, unit: "degrees" }, fontSize: 10 } } },
        y: { title: false, ticksAndLabels: { labels: { fontSize: 10 } } }
      }, legend: false
    }
  });
  let candidate = source;
  let result;
  let failures = 0;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try { result = create(candidate); break; }
    catch (error) {
      const detail = getErrorDetails(error);
      assert.equal(detail?.reason, "canvas-overflow", error.message);
      assert.equal(detail.code, "action-failed");
      const overflow = detail.canvasOverflow;
      const margin = candidate.materializationConfigs.canvas.margin;
      const outer = candidate.graphicSpec.objects.canvas.properties;
      candidate = candidate.editCanvas({
        width: outer.width + overflow.left + overflow.right,
        height: outer.height + overflow.top + overflow.bottom,
        margin: Object.fromEntries(Object.keys(margin).map(side => [side, margin[side] + overflow[side]]))
      });
      failures += 1;
    }
  }
  assert.ok(result);
  assert.ok(failures > 0);
  const bounds = resolveGraphicBounds(result);
  assert.ok(Math.abs(bounds.width - 30) < 1e-9);
  assert.ok(Math.abs(bounds.height - 30) < 1e-9);
  assert.equal(JSON.stringify(source), before);
  assert.deepEqual(create(candidate).graphicSpec, result.graphicSpec);
});


test("Horizontal legend overflow includes the final placement rather than its local bounds", () => {
  assert.throws(() => resolveSingleHorizontalLegendPlacement({
    plot: { x: 20, y: 20, width: 60, height: 40 }, canvas,
    config: { position: "bottom", align: "left", offset: 5 },
    bounds: { left: 0, right: 30, top: 0, bottom: 40 }
  }), error => {
    assert.deepEqual(getErrorDetails(error)?.canvasOverflow,
      { top: 0, right: 0, bottom: 25, left: 0 });
    return true;
  });
});

test("Title overflow is recoverable but an explicitly misplaced title is not", () => {
  const source = chart().createCanvas({ width: 150, height: 150, margin: 40 });
  assert.throws(() => source.createTitle({ text: "A very long title extending beyond the canvas" }), error => {
    assert.ok(getErrorDetails(error)?.canvasOverflow.right > 0);
    return true;
  });
  assert.throws(() => source.createTitle({ text: "Title", offset: 35 }), error => {
    assert.match(error.message, /more top-margin space/);
    assert.equal(getErrorDetails(error)?.canvasOverflow, undefined);
    return true;
  });
});
