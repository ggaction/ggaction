import assert from "node:assert/strict";
import test from "node:test";

import { render } from "../../../src/index.js";
import { createMockCanvasContext } from "../../support/canvas.js";
import {
  loadCars,
  loadFashionTsne,
  loadNightingaleRose
} from "../../support/data.js";

import { createCrossFeatureDashboardPrimitiveState } from
  "./primitive.program.js";

test("replaces one nested Polar child and explicitly refreshes its ancestor", () => {
  const state = createCrossFeatureDashboardPrimitiveState({
    cars: loadCars(),
    fashionRows: loadFashionTsne(),
    nightingale: loadNightingaleRose()
  });
  const context = createMockCanvasContext();
  render(state.revisedDashboard, context);

  assert.deepEqual(state.polarPair.graphicSpec.objects.canvas.properties, {
    width: 1440,
    height: 640,
    background: "white"
  });
  assert.deepEqual(state.revisedPolarPair.graphicSpec.objects.canvas.properties, {
    width: 1220,
    height: 560,
    background: "white"
  });
  assert.deepEqual(state.dashboard.graphicSpec.objects.canvas.properties, {
    width: 1440,
    height: 946,
    background: "white"
  });
  assert.deepEqual(state.revisedDashboard.graphicSpec.objects.canvas.properties, {
    width: 1220,
    height: 866,
    background: "white"
  });
  assert.equal(state.revisedPolarPair.children.detail, state.fashionPolar);
  assert.equal(state.revisedDashboard.children.polarPair, state.revisedPolarPair);
  assert.equal(state.polarPair.children.detail, state.rose);
  assert.equal(state.dashboard.children.polarPair, state.polarPair);
  assert.equal(context.calls.some(call => call.op === "bezierCurveTo"), true);
  assert.equal(context.calls.some(call => call.op === "arc"), true);
  assert.equal(context.calls.some(call => call.op === "fillText"), true);
});
