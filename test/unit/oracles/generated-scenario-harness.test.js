import assert from "node:assert/strict";
import test from "node:test";

import {
  summarizeActionCoverage,
  summarizeDataCoverage
} from "../../support/scenarios/coverage.js";
import {
  failureSignature,
  sameScenarioFailure,
  shrinkScenarioFailure
} from "../../support/scenarios/failures.js";
import { parseScenarioArguments } from "../../support/scenarios/options.js";

function failure(descriptor, message = `${descriptor.id}: target bug`) {
  return {
    ok: false,
    kind: "error",
    descriptor,
    error: { name: "AssertionError", message }
  };
}

test("reports direct public actions separately from transitive implementation calls", () => {
  const coverage = summarizeActionCoverage([{
    directOperations: ["direct"],
    operations: ["direct", "nested"]
  }], ["direct", "nested", "missing"]);

  assert.deepEqual(coverage, {
    publicActionCount: 3,
    directCoveredActionCount: 1,
    directCoveredActions: ["direct"],
    directMissingActions: ["nested", "missing"],
    transitiveCoveredActionCount: 2,
    transitiveCoveredActions: ["direct", "nested"],
    transitiveMissingActions: ["missing"]
  });
});

test("separates successful execution coverage from manifest potential", () => {
  const descriptors = [
    { id: "scatter-pass", recipe: "scatter", factors: { dataset: "first" } },
    { id: "scatter-fail", recipe: "scatter", factors: { dataset: "first" } },
    { id: "bars-fail", recipe: "bars", factors: { dataset: "second" } }
  ];
  const results = [{ id: "scatter-pass", recipe: "scatter", dataset: "first" }];
  const corpus = {
    datasets: [
      { id: "first", profiles: ["tiny"], chartFamilies: ["scatter", "bar"] },
      { id: "second", profiles: ["unicode"], chartFamilies: ["text"] }
    ]
  };

  const failures = [{
    descriptor: { id: "bars-fail", recipe: "bars", factors: { dataset: "second" } }
  }, {
    descriptor: { id: "scatter-fail", recipe: "scatter", factors: { dataset: "first" } }
  }];

  assert.deepEqual(summarizeDataCoverage(descriptors, results, failures, corpus), {
    executed: {
      datasets: {
        attemptedIds: ["first", "second"],
        atLeastOneSuccessfulIds: ["first"],
        fullySuccessfulIds: [],
        partiallyFailedIds: ["first"],
        fullyFailedIds: ["second"]
      },
      recipes: {
        attemptedIds: ["bars", "scatter"],
        atLeastOneSuccessfulIds: ["scatter"],
        fullySuccessfulIds: [],
        partiallyFailedIds: ["scatter"],
        fullyFailedIds: ["bars"]
      }
    },
    manifestPotential: {
      datasetIds: ["first", "second"],
      profiles: ["tiny", "unicode"],
      chartFamilies: ["bar", "scatter", "text"]
    }
  });
});

test("rejects incomplete or overlapping scenario outcome reports", () => {
  const descriptors = [
    { id: "one", recipe: "scatter", factors: { dataset: "first" } },
    { id: "two", recipe: "scatter", factors: { dataset: "first" } }
  ];
  const corpus = {
    datasets: [{ id: "first", profiles: ["tiny"], chartFamilies: ["scatter"] }]
  };
  assert.throws(
    () => summarizeDataCoverage(
      descriptors,
      [{ id: "one", recipe: "scatter", dataset: "first" }],
      [],
      corpus
    ),
    /must partition/
  );
  assert.throws(
    () => summarizeDataCoverage(
      descriptors,
      [{ id: "one", recipe: "scatter", dataset: "first" }],
      [{ descriptor: descriptors[0] }],
      corpus
    ),
    /must partition/
  );
});

test("normalizes descriptor ids when comparing the same scenario failure", () => {
  const left = failure({ id: "original", recipe: "r", factors: {} });
  const right = failure({ id: "candidate", recipe: "r", factors: {} });

  assert.equal(sameScenarioFailure(left, right), true);
  assert.equal(failureSignature(left), failureSignature(right));
  assert.equal(sameScenarioFailure(
    left,
    failure(right.descriptor, "candidate: different bug")
  ), false);
});

test("shrinks interacting factors to a fixpoint and records the reproduction", async () => {
  const descriptor = {
    id: "original",
    recipe: "interaction",
    factors: { dataset: "zoo", first: 1, second: 1 }
  };
  const original = failure(descriptor);
  const minimized = await shrinkScenarioFailure(original, {
    dataset: ["zoo"],
    first: [0, 1],
    second: [0, 1]
  }, async candidate => {
    const { first, second } = candidate.factors;
    return second === 0 || (first === 1 && second === 1)
      ? failure(candidate)
      : { ok: true, descriptor: candidate };
  });

  assert.deepEqual(minimized.descriptor.factors, {
    dataset: "zoo", first: 0, second: 0
  });
  assert.deepEqual(minimized.originalDescriptor, descriptor);
  assert.deepEqual(minimized.shrink, {
    attempts: 3,
    acceptedFactors: ["second", "first"],
    originalFactors: descriptor.factors,
    minimizedFactors: { dataset: "zoo", first: 0, second: 0 }
  });
});

test("rejects ambiguous scenario CLI options instead of silently weakening a run", () => {
  assert.deepEqual(parseScenarioArguments([
    "--mode=smoke", "--no-tidytuesday", "--recipe=scatter,bars"
  ], { defaultConcurrency: 3 }), {
    mode: "smoke",
    includeTidyTuesday: false,
    deterministic: true,
    limit: undefined,
    timeout: 8_000,
    concurrency: 3,
    recipeIds: ["scatter", "bars"]
  });
  assert.throws(
    () => parseScenarioArguments(["--mdoe=smoke"], { defaultConcurrency: 1 }),
    /Unknown scenario option/
  );
  assert.throws(
    () => parseScenarioArguments(["--recipe="], { defaultConcurrency: 1 }),
    /must not be empty/
  );
  assert.throws(
    () => parseScenarioArguments(["--recipe=a,,b"], { defaultConcurrency: 1 }),
    /must not be empty/
  );
  assert.throws(
    () => parseScenarioArguments(["--recipe=a,a"], { defaultConcurrency: 1 }),
    /must not repeat/
  );
});
