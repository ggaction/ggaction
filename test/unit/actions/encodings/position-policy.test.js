import assert from "node:assert/strict";
import test from "node:test";

import { resolveMarkPositionPolicy } from
  "../../../../src/actions/encodings/position/policies/index.js";

function context(mark, channel, fieldType, args = {}, options = {}) {
  return {
    program: { markConfigs: {} },
    layer: { id: mark, mark: { type: mark }, encoding: options.encoding ?? {} },
    dataset: options.dataset ?? { values: [] },
    channel,
    fieldType,
    field: options.field ?? "value",
    args
  };
}

test("dispatches point, rule, line, area, and bar position policies", () => {
  assert.deepEqual(
    resolveMarkPositionPolicy(context("point", "x", "quantitative")),
    { bin: undefined, aggregate: undefined, stack: undefined }
  );
  assert.deepEqual(
    resolveMarkPositionPolicy(context("rule", "y", "temporal")),
    { bin: undefined, aggregate: undefined, stack: undefined }
  );
  assert.deepEqual(
    resolveMarkPositionPolicy(context("line", "x", "temporal")),
    { bin: undefined, aggregate: undefined, stack: undefined }
  );
  assert.deepEqual(resolveMarkPositionPolicy(context(
    "area",
    "y",
    "quantitative",
    { stack: "zero" },
    { dataset: { transform: [{ type: "density" }] } }
  )), { bin: undefined, aggregate: undefined, stack: "zero" });
  assert.deepEqual(resolveMarkPositionPolicy(context(
    "bar",
    "y",
    "quantitative",
    {},
    { encoding: { x: { fieldType: "nominal" } } }
  )), { bin: undefined, aggregate: "mean", stack: null });
});

test("rejects unsupported mark and mark-specific position options", () => {
  assert.throws(
    () => resolveMarkPositionPolicy(context("point", "x", "quantitative", {
      aggregate: "mean"
    })),
    /does not support aggregate/
  );
  assert.throws(
    () => resolveMarkPositionPolicy(context("text", "x", "quantitative")),
    /text x position does not support/
  );
});
