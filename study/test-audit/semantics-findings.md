# Semantic, numeric, oracle and corpus audit

Audited commit: `31ce29f31e5ae87c57759a5b3e002db1f29a4808`. Repository read-only. All audit probes/loaders/logs are outside the repository. No production defect is asserted solely because a test oracle accepts an invalid specimen. Prior full-suite results are not used as new audit evidence.

## Verified defects and blind spots

### SEM-01 — P2 — The numeric oracle can hang or return incorrect expected values for valid finite inputs

Evidence: `test/oracles/numeric.js:33–48,51–74`; oracle anchors only ordinary ranges in `test/unit/oracles/numeric.test.js:12–33`.

- `numericTicks([1e16,1e16+4],5)` never advances because `value += 1` rounds back to `1e16`. A disposable child was terminated after 1 second (`ETIMEDOUT`, `SIGTERM`). The loop keeps appending repeated values, so there is both nontermination and memory growth.
- `mapLinear(0,[-Number.MAX_VALUE,Number.MAX_VALUE],[0,100])` returns `0`, while the exact expected answer is `50`.
- `quantile([-Number.MAX_VALUE,Number.MAX_VALUE],0.5)` returns `Infinity`, while the exact expected answer is `0`.
- These are oracle defects, not production findings. Production already has extreme-range tests: `test/unit/grammar/scales/time-ticks.test.js:16–38`, `test/unit/grammar/transforms/derived-numeric-invariants.test.js:40–66`.

Impact: importing the independent oracle into future boundary tests could hang CI, falsely reject correct production output, or establish a wrong baseline. Existing chart fixtures generally use ordinary ranges, so this does not imply current standard tests hang.

Recommendation: give numeric oracles an explicit supported-domain contract, bounded tick construction/progress detection and independent overflow-safe expected arithmetic. Keep literal extreme anchors and test oracle termination in a child with a timeout. Avoid copying the production helper merely to make the comparison pass.

Acceptance: the three probes above return bounded, mathematically valid answers or an explicitly documented unsupported-domain rejection; valid endpoint counts cannot trigger unbounded allocation. Test both overflow and underflow, reversed/constant domains and adjacent representable values.

Reproduction: `node study/test-audit/evidence/semantics-numeric-probes.mjs` from the workspace. Evidence: `evidence/semantics-numeric-probes.json`.

### SEM-02 — P2 — Tiny regression coefficients can be corrupted to zero without failing their dedicated tests

Evidence: `test/unit/actions/data/regression-statistics.test.js:154–166`. The 1e-300 fixture asserts coefficient finiteness, R-squared and persistence, but not the coefficient value. Its ordinary `close` helper at line 19 also has an absolute 1e-13 floor and would accept zero as close to 1e-300.

An external Node loader changed only the returned statistic at `src/grammar/regression/models.js:529` to `Math.abs(model.slope) < 1e-250 ? 0 : model.slope`. No repository file was edited. The exact test module still passed all 12 tests. The witness output changed from `slope:1.0000000000000002e-300` to `slope:0`, while intercept and R-squared stayed valid. This is a targeted surviving mutant; the entire suite was not run against it.

Recommendation: assert scaled coefficients (`slope / 1e-300` near 1, `intercept / 1e-300` near 2) and explicit nonzero/sign invariants where meaningful. Separate absolute, relative and ULP-based comparisons by contract. Add a small, curated mutation suite for zeroing outputs, dropping items, wrong group identity, missing rematerialization and ignored options.

Acceptance: this exact mutant must fail a targeted coefficient assertion; correct baseline still passes. Preserve separate large-range, constant-response and zero-slope fixtures.

Evidence: `evidence/semantics-tiny-slope-loader.mjs`, `semantics-tiny-slope-witness.mjs`, `semantics-tiny-slope-baseline.json`, `semantics-tiny-slope-mutant.json`, `semantics-tiny-slope-mutant.log`.

### SEM-03 — P2 — Graphic integrity accepts wrong geometry types

Evidence: `test/oracles/graphic-integrity.js:24–45,77–109`. Required properties are checked only for `undefined`; the numeric scan validates values only if their JavaScript type is already `number`.

Probe: a circle with `x:null`, `x:"broken"`, `x:false`, `x:{}` or `x:[]` produces `issues:[]`. Existing oracle tests cover absent x, NaN and negative radius, but no wrong-type matrix (`test/unit/oracles/graphic-integrity.test.js:35–111`). The realistic engine uses this validator at `test/support/scenarios/engine.js:2759`; analytic integrity adds a stricter finite check for analytic-layer items, but does not replace complete validation of guides and all graphic properties.

Recommendation: declare primitive geometry schemas and validate required numeric properties with `Number.isFinite`; validate containers and optional numeric style fields independently. Test one corruption at a time, including string, null, booleans, arrays and objects for each primitive family.

Acceptance: each supplied wrong-type specimen is rejected with its exact property path; ordinary nominal text remains valid. Unknown/non-numeric metadata must not be mistaken for geometry.

Evidence: `evidence/semantics-oracle-probes.mjs`, `semantics-oracle-probes.json`.

### SEM-04 — P2 — SVG integrity checks can accept malformed XML and invalid numeric strings

Evidence: `test/oracles/svg-integrity.js:10–29`; invocation `test/support/scenarios/engine.js:2772`.

All of these pass the current oracle: `<svg><g></svg>`, `cx="broken"`, `cx="null"`, and `cx='NaN'`. The implementation checks outer root tokens and scans only double-quoted numeric attributes for three forbidden spellings. It does not parse XML structure or numeric/path/transform grammar. Existing tests reject missing outer closure, NaN in double quotes and dangling IDs, so those strengths should remain.

Recommendation: use a real XML parser in validation, reject parse errors, then validate numeric attributes and SVG path/transform forms by category. Keep legitimate textual `NaN`, `Infinity` and `undefined` content valid. Browser/native rendering and a valid XML parse are complementary.

Acceptance: the malformed and numeric-string probes fail, equivalent single/double quote forms receive the same treatment, escaped text and valid units/transforms still pass.

Evidence: `evidence/semantics-oracle-probes.json`.

### SEM-05 — P2 improvement — Non-degenerate geometry is not evidence of visible analytic content

Evidence: `test/oracles/analytic-layer-integrity.js:47–99,173–181`; `test/support/scenarios/engine.js:901–903,2759–2763`.

The combined graphic and analytic integrity checks accept a sole point with `opacity:0`, with both paint values `none`, or wholly outside a 100x100 canvas at (10000,10000). Those may be legal graphics in other contexts, so the oracle should not universally reject them. However, they are insufficient evidence for a realistic example that claims a visible analytic result. A scene with one valid item plus many degenerate items also meets the current at-least-one requirement. That requirement may be intentional for zero-valued bars.

Recommendation: make visibility expectations explicit per recipe/layer. For recipes that require visible marks, check inherited opacity/paint, transformed and clipped bounds, plus visible contributor count; pair representative cases with an alpha-aware raster check. Preserve legitimate transparent reference layers, zero values and declared empty facet cells.

Acceptance: a visible-data recipe fails when its only analytical content is made fully transparent/off-canvas, while intentionally hidden reference layers and explicit empty cells remain valid. This is a shared-harness blind spot, not proof every recipe or visual suite accepts all such corruptions.

Evidence: `evidence/semantics-oracle-probes.json`.

### SEM-06 — P2/local — The exponential rendering smoke assertion accepts an untouched transparent canvas

Evidence: `test/unit/actions/data/exponential-regression.test.js:86–89` checks `.data.some((byte,i)=>i%4!==3&&byte<200)`.

A fresh transparent canvas has RGB=0 and A=0, so this assertion passes even when nothing is drawn. Probe returned `existingInkPredicate:true`, `visibleAlpha:false`. A later test in the same module compares independent primitive pixels exactly (lines 107 onward), so exponential rendering is not globally untested; this specific smoke check has no ability to rule out a blank transparent output.

Recommendation: compare RGBA pixels with an explicit background and require alpha-positive visible ink, preferably inside the expected plot region. Check that a deliberately unrendered canvas fails the predicate. Reuse a tested helper instead of ad hoc byte predicates.

Acceptance: untouched canvas fails, rendered expected curve passes, background-only image fails, legitimate transparent backgrounds remain supported.

Evidence: `evidence/semantics-oracle-probes.json`.

## Additional improvements, not confirmed product defects

### SEM-07 — P3 — Use the existing corpus mutation infrastructure for semantic relations

`test/support/datasets/mutations.js` defines `injectMissing`, `scaleNumericFields` and `renameFields`. Repository search found their only consumers in `test/contracts/dataset-fixtures.test.js:414–429`, which tests those helpers themselves. The scenario mutation dispatcher at `test/support/scenarios/recipes.js:75–78` consumes only shuffle/duplicate. Individual tests already cover missing data, renaming, scaling and even LOESS scale equivariance; do not describe these behaviors as absent.

Improvement: use a bounded deterministic sample of corpus datasets to compare an original program with renamed, scaled, shuffled, duplicated and missing-value variants using contract-specific expected relations. Add rejection/unchanged-state expectations for incompatible transforms. This creates interaction coverage without increasing the number of arbitrary chart examples. First document collisions and overflow semantics in mutation helpers; generic rename/scaling transformations are not automatically valid.

Acceptance: each enabled relation checks its result, has a failure witness/mutant and a deterministic seed, and records both inputs when it fails.

### SEM-08 — P3 — Keep corpus realism, data pathology and size stress as separate measurable dimensions

`test/support/scenarios/realistic-data.js:10–12,550–565,573–575,613–629` usually limits record views to 160 rows and eight groups, filters nonfinite measures/missing categories, and picks deterministic source rows. Other recipes explicitly use 80/96/120 rows. Full-source aggregations and truthful provenance exist and are valuable; this is not a claim that all corpus tests use 160 rows or that sampled data are fabricated.

Improvement: retain bounded realistic charts, then add small targeted raw-data pathology overlays (typed category collisions, missing values, extreme values, rare/long labels, singleton/constant groups) and explicit size stress tiers. Record observed row-count/category-count distributions and pathological feature counts, not only dataset/chart/option counts. Existing large facet/path capacity tests should be mapped and reused.

Acceptance: each declared pathological/size class has an explicit tested consumer and a semantic postcondition; sample and full-source tests are accurately labelled.

### SEM-09 — P3 — Label primitive/reference independence by concern

Some “primitive” baselines intentionally share high-level construction or production geometry: `test/charts/mark-selection-points/primitive.program.js:1–2,12–59` imports production point-shape geometry and builds its base with public mark/encoding actions; facet primitives use production snapshot composition; `test/charts/program-composition/variants/layouts/reference-values.js:1–2,272–305` calls production `resolveCompositionLayout`. This can be appropriate for testing only the selection overlay or composition wrapper, but the differential comparison alone cannot independently validate shared math.

There are counterbalancing literal/layout/unit tests, e.g. `test/charts/program-composition/variants/layouts/primitive.test.js:17–50` and `test/unit/layout/composition-layout.test.js` with `test/oracles/composition.js`. Thus no blanket claim of self-testing is warranted.

Improvement: a small manifest field or documentation note should name the independent concern and shared prerequisites for each baseline; prefer literal/independent anchors for high-risk shared computations. Do not duplicate whole implementations merely to remove imports.

Acceptance: reviewers can tell whether a failing or passing comparison establishes API equivalence, independent geometry, renderer parity, or only same-run determinism.

## Strengths to preserve

- 37 modules under `test/oracles/`; no imports from production `src/` were found in those modules. Several have explicit literal anchors and constrained independent implementations.
- Numerical boundaries are already unusually thorough: MAX_VALUE overflow, cancellation, underflow/tiny values, constant/duplicate groups, bootstrap binary scaling, quartiles, density nonnegativity and representability, LOESS affine/scale invariance.
- Immutability is covered through frozen caller input, retained-input mutation tests, earlier-program snapshots, revisions, persistence and atomic failure assertions. `test/support/program-state.js` snapshots non-enumerable own fields too, and its own tests deliberately mutate nested state and caller inputs.
- Scenario harness distinguishes direct public calls from nested implementation calls; checks actual factor effects; has deterministic seeds, pairwise generation, a fixpoint failure shrinker and valid outcome partitioning. Do not recommend adding these as though missing.
- Chart tests pair semantic/graphic equality, drawing order and mock renderer calls, with separate representative exact pixel checks and literal values.
- No unconditional `.skip`/`.todo` or `Math.random` uses were found by the focused unit/charts/oracles scan. This is scoped static evidence, not a claim about all repository execution paths.

## Verification performed this audit

- `node scripts/run-tests.js unit unit/oracles/graphic-integrity.test.js unit/oracles/analytic-layer-integrity.test.js unit/actions/data/exponential-regression.test.js`: 18 pass, 0 fail, 0 skip (`evidence/semantics-focused-tests.log`).
- `node scripts/run-tests.js unit unit/oracles/numeric.test.js unit/actions/data/regression-statistics.test.js unit/grammar/transforms/derived-numeric-invariants.test.js`: 21 pass, 0 fail, 0 skip (`evidence/semantics-numeric-baseline-tests.log`).
- External loader mutation of tiny slope reporting: dedicated 12 tests pass despite an observed wrong output. Not run across full suite.
- Oracle adversarial probes: confirmed outputs above. The tick hang is isolated in a child and bounded by a 1-second timeout.
- No corpus/full suite, render gallery or browser suite rerun by this audit worker. Those belong to other audit scopes and are not needed to reproduce these oracle-level failures.
- Repository remained clean after probes.
