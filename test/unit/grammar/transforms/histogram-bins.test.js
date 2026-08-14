import assert from "node:assert/strict";
import test from "node:test";

import {
  countHistogramBins,
  normalizeHistogramBin,
  resolveHistogramBins,
  validateHistogramBinBoundaries,
  validateHistogramBinStep
} from "../../../../src/grammar/histogram.js";

test("normalizes the current histogram bin policy in one owner", () => {
  assert.deepEqual(normalizeHistogramBin(), { maxBins: 10 });
  assert.deepEqual(normalizeHistogramBin({ maxBins: 4 }), { maxBins: 4 });
  assert.deepEqual(normalizeHistogramBin({ step: 60 }), { step: 60 });
  assert.deepEqual(
    normalizeHistogramBin({ boundaries: [50, 100, 225] }),
    { boundaries: [50, 100, 225] }
  );
  assert.deepEqual(
    resolveHistogramBins({ values: [0, 8], bin: { maxBins: 4 }, nice: false }),
    { domain: [0, 8], step: 2, boundaries: [0, 2, 4, 6, 8] }
  );
  assert.throws(
    () => normalizeHistogramBin({ maxBins: 4, step: 2 }),
    /only one/
  );
  assert.throws(
    () => resolveHistogramBins({ values: [0, 8], bin: {}, maxBins: 4 }),
    /either bin or maxBins/
  );
});

test("owns exact-bin validation", () => {
  assert.equal(validateHistogramBinStep(60), 60);
  assert.deepEqual(
    validateHistogramBinBoundaries([50, 100, 225]),
    [50, 100, 225]
  );
  assert.throws(() => validateHistogramBinStep(0), /positive finite/);
  assert.throws(
    () => validateHistogramBinBoundaries([0, 0]),
    /strictly increasing finite/
  );
  assert.throws(
    () => validateHistogramBinBoundaries(
      Array.from({ length: 10_002 }, (_, index) => index)
    ),
    /at most 10000 bins/
  );
});

test("resolves zero-anchored exact-step bins", () => {
  assert.deepEqual(
    resolveHistogramBins({
      values: [68, 455],
      bin: { step: 60 },
      nice: true,
      zero: false
    }),
    {
      domain: [60, 480],
      step: 60,
      boundaries: [60, 120, 180, 240, 300, 360, 420, 480]
    }
  );
  assert.deepEqual(
    resolveHistogramBins({
      values: [-7, -7],
      bin: { step: 5 },
      zero: false
    }),
    { domain: [-10, -5], step: 5, boundaries: [-10, -5] }
  );
  assert.deepEqual(
    resolveHistogramBins({
      values: [10, 10],
      bin: { step: 5 },
      zero: false
    }),
    { domain: [10, 15], step: 5, boundaries: [10, 15] }
  );
  assert.deepEqual(
    resolveHistogramBins({
      values: [7, 7],
      bin: { step: 5 },
      zero: true
    }),
    { domain: [0, 10], step: 5, boundaries: [0, 5, 10] }
  );
});

test("resolves explicit irregular bins and validates domain ownership", () => {
  const boundaries = [50, 100, 150, 225, 500];
  assert.deepEqual(
    resolveHistogramBins({
      values: [68, 455],
      bin: { boundaries }
    }),
    { domain: [50, 500], boundaries }
  );
  assert.deepEqual(
    resolveHistogramBins({
      values: [],
      bin: { boundaries },
      domain: [50, 500]
    }),
    { domain: [50, 500], boundaries }
  );
  assert.throws(
    () => resolveHistogramBins({
      values: [49],
      bin: { boundaries }
    }),
    /contain.*data extent/
  );
  assert.throws(
    () => resolveHistogramBins({
      values: [68],
      bin: { boundaries },
      domain: [0, 500]
    }),
    /match.*boundary endpoints/
  );
});

test("validates exact-step explicit domains", () => {
  assert.deepEqual(
    resolveHistogramBins({
      values: [68, 455],
      bin: { step: 50 },
      domain: [50, 500]
    }),
    {
      domain: [50, 500],
      step: 50,
      boundaries: [50, 100, 150, 200, 250, 300, 350, 400, 450, 500]
    }
  );
  assert.throws(
    () => resolveHistogramBins({
      values: [68, 455],
      bin: { step: 60 },
      domain: [50, 500]
    }),
    /align.*bin step/
  );
  assert.throws(
    () => resolveHistogramBins({
      values: [68, 455],
      bin: { step: 60 },
      domain: [60, 420]
    }),
    /contain.*data extent/
  );
  assert.throws(
    () => resolveHistogramBins({ values: [], bin: { step: 60 } }),
    /no values/
  );
});

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

test("keeps extreme automatic histogram boundaries finite and increasing", () => {
  const cases = [
    [1e15, 1e15 + 1],
    [0, Number.MIN_VALUE],
    [-Number.MAX_VALUE, Number.MAX_VALUE],
    [Number.MAX_VALUE, Number.MAX_VALUE],
    [-Number.MAX_VALUE, -Number.MAX_VALUE]
  ];

  for (const values of cases) {
    const bins = resolveHistogramBins({ values, maxBins: 10, nice: true });
    assert.equal(Number.isFinite(bins.step) && bins.step > 0, true);
    assert.equal(bins.boundaries.length >= 2, true);
    assert.equal(bins.boundaries.length - 1 <= 10, true);
    assert.equal(bins.boundaries.every(Number.isFinite), true);
    assert.equal(bins.boundaries.every(
      (value, index) => index === 0 || value > bins.boundaries[index - 1]
    ), true);
    assert.equal(bins.domain[0] <= values[0], true);
    assert.equal(bins.domain[1] >= values[1], true);
    assert.equal(
      countHistogramBins(values, bins.boundaries)
        .reduce((sum, count) => sum + count, 0),
      values.length
    );
  }

  const bounded = resolveHistogramBins({
    values: [0, 1],
    maxBins: Number.MAX_SAFE_INTEGER,
    nice: false
  });
  assert.equal(bounded.boundaries.length <= 10_001, true);
  assert.equal(bounded.boundaries.every(Number.isFinite), true);

  assert.throws(
    () => resolveHistogramBins({
      values: [0, 1],
      bin: { step: 1e-10 },
      domain: [0, 1]
    }),
    /at most 10000 bins/
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

test("counts half-open histogram intervals and includes the final maximum", () => {
  assert.deepEqual(
    countHistogramBins(
      [-1, 0, 9.9, 10, 19.9, 20, 30, 31],
      [0, 10, 20, 30]
    ),
    [2, 2, 2]
  );
  assert.throws(
    () => countHistogramBins([1], [0, 10, 5]),
    /ascending/
  );
});
