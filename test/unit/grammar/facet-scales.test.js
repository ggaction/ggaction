import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeFacetScalePolicies,
  resolveFacetHistogramBoundaries,
  resolveFacetScaleDomains
} from "../../../src/grammar/facets/scales.js";
import {
  expectedContinuousFacetUnion,
  expectedStableFacetUnion
} from "../../oracles/facet-scales.js";

const semanticSpec = {
  layers: [{
    id: "points",
    encoding: {
      x: { field: "x", scale: "x" },
      y: { field: "y", scale: "y" },
      color: { field: "group", scale: "color" }
    }
  }],
  scales: [
    { id: "x", type: "linear", domain: "auto", range: "auto" },
    { id: "y", type: "linear", domain: [0, 100], range: "auto" },
    { id: "color", type: "ordinal", domain: "auto", range: "auto" }
  ]
};

const children = {
  a: {
    x: { domain: [1, 4] },
    y: { domain: [10, 30] },
    color: { domain: ["USA", "Japan"] }
  },
  b: {
    x: { domain: [-3, 9] },
    y: { domain: [40, 70] },
    color: { domain: ["Europe", "USA"] }
  }
};

test("normalizes omitted channels to shared and owns closed keys", () => {
  const normalized = normalizeFacetScalePolicies(semanticSpec, {
    x: "independent"
  });
  assert.equal(normalized.channels.x, "independent");
  assert.equal(normalized.channels.y, "shared");
  assert.equal(normalized.channels.theta, undefined);
  assert.deepEqual(normalized.scales.x, {
    policy: "independent",
    channels: ["x"]
  });
  assert.equal(Object.isFrozen(normalized), true);
  assert.throws(
    () => normalizeFacetScalePolicies(semanticSpec, { theta: "shared" }),
    /Unknown facet scale channel/
  );
  assert.throws(
    () => normalizeFacetScalePolicies(semanticSpec, { x: "free" }),
    /must be shared or independent/
  );
});

test("resolves continuous and discrete shared unions with explicit precedence", () => {
  const result = resolveFacetScaleDomains(semanticSpec, children);
  assert.deepEqual(
    result.scales.x.domain,
    expectedContinuousFacetUnion([[1, 4], [-3, 9]])
  );
  assert.deepEqual(result.scales.y.domain, [0, 100]);
  assert.deepEqual(
    result.scales.color.domain,
    expectedStableFacetUnion([
      ["USA", "Japan"],
      ["Europe", "USA"]
    ])
  );
  assert.deepEqual(result.scales.x.childDomains, {
    a: [-3, 9],
    b: [-3, 9]
  });
  assert.deepEqual(result.scales.y.childDomains, {
    a: [0, 100],
    b: [0, 100]
  });
});

test("preserves independent auto domains and still applies explicit domains", () => {
  const result = resolveFacetScaleDomains(semanticSpec, children, {
    x: "independent",
    y: "independent"
  });
  assert.equal(Object.hasOwn(result.scales.x, "domain"), false);
  assert.deepEqual(result.scales.x.childDomains, {
    a: [1, 4],
    b: [-3, 9]
  });
  assert.deepEqual(result.scales.y.childDomains, {
    a: [0, 100],
    b: [0, 100]
  });
});

test("merges quantile samples without dropping duplicates", () => {
  const quantileSpec = {
    layers: [{ id: "points", encoding: { color: { scale: "color" } } }],
    scales: [{ id: "color", type: "quantile", domain: "auto", range: "auto" }]
  };
  const result = resolveFacetScaleDomains(quantileSpec, {
    a: { color: { domain: [1, 2, 2] } },
    b: { color: { domain: [3, 5] } }
  });
  assert.deepEqual(result.scales.color.domain, [1, 2, 2, 3, 5]);
});

test("rejects shared-scale policy conflicts and incomplete child domains", () => {
  const sharedIdSpec = {
    layers: [{
      id: "points",
      encoding: {
        color: { scale: "appearance" },
        opacity: { scale: "appearance" }
      }
    }],
    scales: [{ id: "appearance", type: "ordinal", domain: "auto", range: "auto" }]
  };
  assert.throws(
    () => normalizeFacetScalePolicies(sharedIdSpec, {
      color: "shared",
      opacity: "independent"
    }),
    /conflicting channel policies/
  );
  assert.throws(
    () => resolveFacetScaleDomains(semanticSpec, {
      a: { x: { domain: [1, 4] }, color: { domain: ["USA"] } }
    }),
    /missing resolved domain for scale "y"/
  );
});

test("resolves shared and independent histogram boundaries from cell values", () => {
  const valuesByChild = {
    a: [0, 1, 2],
    b: [100, 101, 102]
  };
  const shared = resolveFacetHistogramBoundaries({
    policy: "shared",
    valuesByChild,
    bin: { maxBins: 4 },
    nice: false
  });
  const independent = resolveFacetHistogramBoundaries({
    policy: "independent",
    valuesByChild,
    bin: { maxBins: 4 },
    nice: false
  });
  assert.deepEqual(shared.childBoundaries.a, shared.childBoundaries.b);
  assert.notDeepEqual(
    independent.childBoundaries.a,
    independent.childBoundaries.b
  );
  assert.equal(Object.isFrozen(independent.childBoundaries.a), true);
});
