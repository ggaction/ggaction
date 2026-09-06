import assert from "node:assert/strict";
import test from "node:test";

import {
  allLegendGraphicIds,
  legendGraphicIds,
  legendResourcePolicies,
  legendResourcePolicy
} from "../../../src/materialization/guides/resources.js";

test("owns every legend family resource contract in one registry", () => {
  const policies = legendResourcePolicies();

  assert.deepEqual(
    policies.map(policy => policy.kind),
    ["series", "color", "size", "gradient", "interval", "opacity", "strokeWidth"]
  );
  assert.equal(legendResourcePolicy("gradient").semanticKind, "color");
  assert.equal(
    legendResourcePolicy("gradient").rematerializeOp,
    "rematerializeGradientLegend"
  );
  assert.deepEqual(
    legendGraphicIds("strokeWidth"),
    ["strokeWidthLegendBackground", "strokeWidthLegendSymbols", "strokeWidthLegendLabels", "strokeWidthLegendTitle"]
  );
  assert.deepEqual(
    allLegendGraphicIds(["color", "interval"]),
    legendGraphicIds("color")
  );
});

test("rejects unknown legend resource kinds", () => {
  assert.throws(
    () => legendResourcePolicy("missing"),
    /Unknown legend graphic kind/
  );
  assert.throws(
    () => legendGraphicIds("missing"),
    /Unknown legend graphic kind/
  );
});
