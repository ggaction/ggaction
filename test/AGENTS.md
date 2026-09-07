# Test Instructions

Apply these instructions to tests, fixtures, examples, generated artifacts, and test infrastructure in addition to the repository root instructions.

## Scoped Test Instructions

- Read `test/charts/AGENTS.md` for public chart programs, primitive baselines, PNG regressions, visual manifests, and chart slices.
- Read `test/browser/AGENTS.md` for browser examples, Playwright harnesses, Canvas readiness, and browser accessibility checks.
- Read `test/contracts/AGENTS.md` for architecture, package-boundary, coverage, discovery, and inventory contracts.
- Apply every relevant nested file when one test change crosses several evidence layers. Do not copy one rule into several scopes.

## Suite-Wide Rules

- Write source code, test descriptions, fixtures, and example programs in English. Korean is reserved for implementation collaboration documents.
- Organize tests by reusable capability and contract owner, not roadmap, Phase, Gate, or a mechanically mirrored source tree.
- Keep development history out of durable suite names, selectors, manifests, artifact paths, and descriptions.
- Product behavior tests must not depend on roadmap plans, Gate records, or closeout prose. Move durable runtime assertions to current contracts, source, declarations, examples, or concrete output. Documentation-navigation tests may validate canonical roadmap metadata, referenced paths, and link integrity, but must not use historical plans as runtime expectations or enforce exact Korean headings or prose.
- Use `.test.js` for the normal suite and `.render.js` for expensive renderer regressions. Test discovery must select both intentionally and never discover helpers as tests.
- Keep every JavaScript test module reachable from a discovered suite, render entry, browser entry, or HTML module script. Unreachable helpers and fixtures are dead test code.
- Put reusable expected-value algorithms in `test/oracles/` and keep them independent from `src/`. Anchor each oracle with representative literal expectations.
- Pair representative examples or images with focused semantic, geometric, mathematical, package, and architecture assertions. Visual output alone is not sufficient evidence.
- Pair fixed numeric cases with invariants such as monotonicity, conservation, non-negativity, interval containment, and stable ordering for continuous or statistical behavior.
- Match coverage to the affected layer: pure numeric oracles for computation, state and order assertions for structure, concrete properties plus rematerialization for geometry/style, and pixels only for representative visual differences.
- Keep source-coverage instrumentation and realistic corpus sweeps separate. Run both at the integration or release checkpoint that requires them, but do not reinstrument the realistic suite inside coverage; partition realistic CI into exhaustive, disjoint test-file shards instead.
- Declare required checks at change, integration, and release checkpoints. Run affected checks during iteration and every check required by the applicable completion checkpoint before declaring it complete. Reuse passing evidence only when its relevant inputs and environment remain valid. A failed or unavailable required check blocks that checkpoint, while independent authorized work may continue.
- Split a large test module by contract owner or lifecycle concern, not an arbitrary line target. Keep explicit primitive programs, declarative manifests, and independent oracles intact.

## Active Review Gates

- Use `test/gates/<chart>/` only for an active, unapproved visual slice. It must contain an executable primitive, reference values, manifest, normal tests, and render test.
- Stable charts, contracts, browser tests, and examples must never import from `test/gates/`. When no review is active, the directory has no executable slice and tooling must tolerate its absence in a clean checkout.
- After visual approval and public implementation, move the complete slice to its stable capability location and remove the Gate directory and review artifacts.
- Never leave skipped or placeholder public tests in `test/charts/`, and never encode roadmap or completed Gate identity in approved tests or artifacts.
