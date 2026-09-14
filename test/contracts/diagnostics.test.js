import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../src/index.js";
import { chart as basicChart } from "../../src/basic.js";
import { getErrorDetails } from "../../src/diagnostics.js";
import { annotateError } from "../../src/core/diagnostics.js";
import { action } from "../../src/core/action.js";
import { validateGeneratedItemLimit, validatePositiveFinite } from "../../src/core/validation.js";
import { requireDataset } from "../../src/selectors/datasets.js";
import { resolveEligibleLayer } from "../../src/selectors/layers.js";
import { renderToPNGBuffer } from "../../src/renderers/png.js";

function caught(fn) { try { fn(); } catch (error) { return error; } assert.fail("Expected failure."); }

test("Full and Basic share structured option errors without retaining supplied data", () => {
  for (const factory of [chart, basicChart]) {
    const program = factory();
    const error = caught(() => program.createData({ values: [{ secret: "private" }], unknown: true }));
    assert.deepEqual(getErrorDetails(error), { code: "invalid-option", operation: "createData", optionPath: "unknown" });
    assert.equal(JSON.stringify(getErrorDetails(error)).includes("private"), false);
    assert.equal(Object.isFrozen(getErrorDetails(error)), true);
    assert.equal(program.trace.children.length, 0);
    const sparse = caught(() => program.createData({ values: [, {}] }));
    assert.equal(sparse instanceof TypeError, true);
    assert.equal(getErrorDetails(sparse).optionPath, "values[0]");
  }
});

test("resource diagnostics distinguish missing, ambiguous, and live consumers", () => {
  const empty = chart();
  assert.deepEqual(getErrorDetails(caught(() => requireDataset(empty, "missing"))), {
    code: "missing-resource", resourceId: "missing"
  });
  const program = empty.createData({ values: [{ x: 1 }] })
    .createPointMark({ id: "a" }).createPointMark({ id: "b" });
  const ambiguous = caught(() => resolveEligibleLayer(program, {
    predicate: () => true, label: "Points", current: "absent"
  }));
  assert.deepEqual(getErrorDetails(ambiguous).candidates, ["a", "b"]);
  assert.equal(Object.isFrozen(getErrorDetails(ambiguous).candidates), true);
  const used = caught(() => program.removeData({ id: "data" }));
  assert.equal(getErrorDetails(used).code, "resource-in-use");
  assert.equal(getErrorDetails(used).resourceId, "data");
});

test("numeric diagnostics retain Error classes and include actual resource budgets", async () => {
  const limit = caught(() => validateGeneratedItemLimit(10001, "Generated items"));
  assert.equal(limit instanceof RangeError, true);
  assert.deepEqual(getErrorDetails(limit), {
    code: "resource-limit", optionPath: "Generated items", limit: 10000, actual: 10001
  });
  assert.equal(getErrorDetails(caught(() => validatePositiveFinite(-1, "radius"))).code, "invalid-value");
  await assert.rejects(renderToPNGBuffer(chart().createCanvas({ width: 40000, height: 1, margin: 0 })), error => {
    assert.equal(getErrorDetails(error).limit, 32767);
    assert.equal(getErrorDetails(error).actual, 40000);
    return error instanceof RangeError;
  });
});

test("unknown failures retain identity and use a fallback code without message parsing", () => {
  const original = Object.freeze(new Error("Unknown dataset misleading message"));
  const fail = action({ op: "customFailure", description: "Raise an external error." }, () => { throw original; });
  const received = caught(() => fail.call(chart()));
  assert.equal(received, original);
  assert.deepEqual(getErrorDetails(received), { code: "action-failed", operation: "customFailure" });
  for (const value of [null, undefined, "error", 1, {}, new Error("ordinary")]) {
    assert.equal(getErrorDetails(value), undefined);
  }
  assert.equal(annotateError("non-error", { code: "action-failed" }), "non-error");
});
