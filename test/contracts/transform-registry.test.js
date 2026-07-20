import assert from "node:assert/strict";
import test from "node:test";

import {
  findTransformPolicy,
  findTransformValidator,
  validateDatasetTransforms
} from "../../src/grammar/transforms.js";

test("keeps every stored dataset transform in the grammar registry", () => {
  const expected = {
    filter: ["materializeFilteredData", "rowPreserving"],
    markFilter: ["materializeMarkFilteredData", undefined],
    regression: ["materializeRegressionData", "statistical"],
    density: ["materializeDensityData", "statistical"],
    interval: ["materializeIntervalData", "statistical"],
    boxSummary: ["materializeBoxSummaryData", "statistical"],
    boxOutlier: ["materializeBoxOutlierData", "statistical"]
  };
  for (const [type, [materializeOp, facetTopology]] of Object.entries(expected)) {
    assert.equal(typeof findTransformValidator(type), "function");
    assert.equal(findTransformPolicy(type).materializeOp, materializeOp);
    assert.equal(findTransformPolicy(type).facetTopology, facetTopology);
  }
  assert.equal(findTransformPolicy("markFilter").provenanceTransparent, true);
  assert.equal(typeof findTransformPolicy("density").replayTransform, "function");
  assert.equal(findTransformPolicy("unknown"), undefined);
  assert.equal(findTransformValidator("unknown"), undefined);
  assert.throws(
    () => validateDatasetTransforms([{ type: "unknown" }]),
    /Unsupported dataset transform/
  );
  assert.throws(
    () => validateDatasetTransforms([
      { type: "filter", field: "group", oneOf: ["A"] },
      { type: "filter", field: "group", oneOf: ["B"] }
    ]),
    /exactly one plain object/
  );
});
