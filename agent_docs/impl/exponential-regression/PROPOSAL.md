# Positive-response exponential regression

## Status

- [x] Reproduce the existing public method rejection
- [x] Prove that ordinary log-linear fitting changes the required model
- [x] Bind the frozen input, settled curve and retained response evidence
- [x] Specify errors, persistence, consumer scope and verification
- [ ] Explicit user approval
- [ ] Implementation

Gate: **ready-for-review**. This is a proposal only. Root `AGENTS.md` requires explicit approval of the new public method and persisted parameter value. Other translations continue. No package publication, deployment or PR creation is included.

## Problem

The required curve is `y = amplitude * exp(rate * x)`, fitted by response-weighted least squares on `log(y)`. Existing `createRegressionData` and regression facades support linear, polynomial and LOESS fits. They reject `method: "exp"`. The closed computed grammar has no exponential operation, and an ordinary unweighted regression of `log(y)` is a different estimator.

The frozen nine-row study has 60 settled sampled vertices. Substituting ordinary log-linear fitting changes a sampled response by up to **23.66494431030233**, so omitting the curve or substituting another estimator is not an acceptable translation. The original input remains intact. `source-evidence.json` records the exact input/reference bindings and measured result without embedding external project paths in repository terminology.

## Exact proposed public choice

Add **`"exp"`** to the existing regression `method` union. No new action or arbitrary expression callback is introduced.

```js
program
  .createRegressionData({ id: 'fit', x: 'exposure', y: 'response' })
  .editRegressionData({ target: 'fit', method: 'exp', interval: false })
  .editRegressionData({ target: 'fit', predict: { domain: [0, 100], steps: 60 } });
```

Each call has at most three top-level options. Existing explicit `predict.values` remains available for nonuniform sample positions. The example's evenly spaced prediction grid illustrates existing API behavior; it does not claim the frozen study uses evenly spaced samples. No adaptive sampling policy is added.

### Fitting contract

For each existing regression group, use every eligible finite `(x,y)` pair once. Require strictly positive `y` and at least two observations with distinct `x`. Let `z=log(y)` and weights `w=y`:

- `W = sum(w)`; `meanX = sum(w*x)/W`; `meanLogY = sum(w*z)/W`.
- `rate = sum(w*(x-meanX)*(z-meanLogY)) / sum(w*(x-meanX)^2)`.
- `logAmplitude = meanLogY - rate*meanX`.
- Predict using `exp(logAmplitude + rate*x)`; expose finite positive `amplitude=exp(logAmplitude)` and finite `rate` in the existing method-specific fitted-model metadata.

Use stable centered/scaled numerical calculations and finite-result guards. The mathematical estimator, rather than an incidental reduction order, is the contract. Preserve existing missing-value handling before positivity checks; finite zero/negative responses are errors, never silently removed. Degenerate predictors, coefficient underflow/overflow, or a nonfinite/nonpositive requested prediction reject atomically. No host row expansion, precomputed response table, per-row color/value lookup or fabricated observations is involved.

### Interval and option policy

The initial method supports point estimates only. `interval` omitted or `false` resolves to no interval fields. Explicit `"mean"`/`"prediction"`, confidence method/level/alias, polynomial degree, LOESS span and robust iterations are rejected. Existing linear/polynomial/LOESS behavior is unchanged. Method-changing edits clear incompatible previously inferred settings according to existing edit normalization; explicit incompatible options remain errors. Existing regression plotting conveniences must suppress automatic bands for `exp` and reject an explicitly requested band rather than invent uncertainty semantics.

### Stored result and lifecycle

Keep the existing regression transform and prediction objects, with `method: "exp"` and normalized `interval: false`. Extend the existing typed parameter/model union with exactly this method and its `count`, `amplitude`, `rate` and implementation-required stable log representation. Do not introduce a separate diagnostics dataset, R-squared API or change existing model metadata. Output rows retain the requested original x/y field names, grouping and current provenance/report conventions; no CI lower/upper columns are emitted.

Apply the same estimator to data-only creation/editing, the existing regression line/facade owners, grouping, missing-value policies, subsequent source revisions, rematerialization and persisted round trips. Full/Basic entry exposure must remain consistent with their current regression availability; do not add otherwise unavailable actions to Basic. Renderers consume existing concrete curve graphics only, with no fitting code or backend-specific behavior.

## Verification required before closeout

1. Generic exact exponential fixtures, noisy response-weighted fixtures, comparison against independently calculated weighted moments, and a fixture that distinguishes unweighted fitting.
2. Positive/negative/zero/nonfinite responses, missing policies, two-point fit, degenerate x, overflow/underflow and unknown options; failure leaves caller data and parent program unchanged.
3. Existing explicit prediction values/domain/steps, native limits, group ordering, source edits, data/line/facade consumers, no-band behavior, persistence and tamper rejection.
4. Existing methods' regression suite, Full/Basic installed consumer, actual Canvas/SVG command parity and source-neutral terminology checks.
5. Types, schemas, current statistics/data contracts, API docs, action cards, generated reference/provenance/indexes and package budgets synchronized in one checkpoint.
6. Frozen study: all nine raw rows preserved, actual 60 source sample positions, all fitted values and displayed coordinates checked against the settled curve; no source approximation or missing layer hidden.

## Reproduce current rejection

Run `node agent_docs/impl/exponential-regression/reproduce.mjs`. This source-neutral public probe fits a generic noisy positive dataset using ordinary regression, then proves that `method: "exp"` is rejected and ordinary log-linear fitting differs from the required response-weighted estimator. It performs no paid model call and inspects no chart pixels.
