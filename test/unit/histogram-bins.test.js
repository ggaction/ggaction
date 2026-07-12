import assert from "node:assert/strict";
import test from "node:test";

import { resolveHistogramBins } from "../../src/core/histogram.js";

test("resolves deterministic nice histogram bins", () => {
  const bins = resolveHistogramBins({
    values: [68, 455],
    maxBins: 10,
    nice: true,
    zero: false
  });

  assert.deepEqual(bins, {
    domain: [50, 500],
    step: 50,
    boundaries: [50, 100, 150, 200, 250, 300, 350, 400, 450, 500]
  });
  assert.equal(bins.boundaries.length - 1 <= 10, true);
  assert.equal(Object.isFrozen(bins), true);
  assert.equal(Object.isFrozen(bins.boundaries), true);
});

test("keeps explicit domains and supports non-nice automatic bins", () => {
  assert.deepEqual(
    resolveHistogramBins({
      values: [20, 80],
      maxBins: 3,
      domain: [0, 90],
      nice: true,
      zero: true
    }),
    {
      domain: [0, 90],
      step: 30,
      boundaries: [0, 30, 60, 90]
    }
  );
  assert.deepEqual(
    resolveHistogramBins({
      values: [20, 80],
      maxBins: 3,
      nice: false,
      zero: false
    }),
    {
      domain: [20, 80],
      step: 20,
      boundaries: [20, 40, 60, 80]
    }
  );
});

test("applies zero before nice and expands constant extents", () => {
  assert.deepEqual(
    resolveHistogramBins({
      values: [12, 18],
      maxBins: 4,
      nice: true,
      zero: true
    }),
    {
      domain: [0, 20],
      step: 5,
      boundaries: [0, 5, 10, 15, 20]
    }
  );
  assert.deepEqual(
    resolveHistogramBins({
      values: [5, 5],
      maxBins: 10
    }),
    {
      domain: [4.5, 5.5],
      step: 1,
      boundaries: [4.5, 5.5]
    }
  );
});

test("validates histogram bin inputs", () => {
  assert.throws(
    () => resolveHistogramBins({ values: [], maxBins: 10 }),
    /no values/
  );
  assert.throws(
    () => resolveHistogramBins({ values: [1], maxBins: 0 }),
    /positive integer/
  );
  assert.throws(
    () =>
      resolveHistogramBins({
        values: [],
        maxBins: 2,
        domain: [10, 0]
      }),
    /ascending/
  );
  assert.throws(
    () => resolveHistogramBins({ values: [1, Number.NaN], maxBins: 2 }),
    /finite/
  );
});
