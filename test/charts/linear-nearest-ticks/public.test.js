import test from "node:test";
import assert from "node:assert/strict";
import { render } from "../../../src/index.js";
import { createMockCanvasContext } from "../../support/canvas.js";
import { createLinearNearestTicks } from "../../../examples/linear-nearest-ticks/program.js";
import { createLinearNearestTicksPrimitives } from "./primitive.program.js";

test("minimal three-action facade matches literal graphics and renderer calls", () => {
  const p = createLinearNearestTicks(), primitive = createLinearNearestTicksPrimitives();
  assert.deepEqual(p.graphicSpec, primitive.graphicSpec);
  const a = createMockCanvasContext(), b = createMockCanvasContext();
  render(p, a); render(primitive, b);
  assert.deepEqual(a.calls, b.calls);
  assert.equal(p.guideConfigs.axis.y.ticks.rounding, "nearest");
  assert.equal(p.guideConfigs.axis.y.labels.rounding, "nearest");
});
