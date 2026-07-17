# Test Guide

The default suite runs unit, contract, chart, gate, and documentation tests:

```sh
npm test
```

Use a selector after `--` while developing one capability:

```sh
npm test -- chart:cars-histogram
npm test -- capability:selection
npm test -- unit/actions/scales
```

Selectors match a chart directory, a named capability in
`test/capabilities.json`, or a path relative to `test/`. Capability selectors
have explicit owners and fail on unknown names; they never depend on accidental
filename substrings. Browser and PNG regressions remain explicit because they
start external rendering resources:

```sh
npm run test:browser
npm run test:render
```

Browser tests share `test/support/browser.js` for navigation, readiness, and
console/page error capture. Public example-specific state probes belong in the
example registry so the shared browser suite can verify them without adding a
new Chromium lifecycle per chart.

`npm run test:gates` reports `No active gate tests.` and succeeds when every
approved visual slice has graduated into `test/charts/`.

Every JavaScript module under `test/` must be reachable from a discovered test,
render entry, browser entry, or an HTML module script. An active `test/gates/`
directory must include an executable contract test, a PNG render entry, and a
manifest or primitive program; approval graduates the complete slice together.

`test/support/program-state.js` owns assertions for named program resources and
atomic rejection. Prefer those helpers when a test needs an existing dataset,
layer, scale, coordinate, or graphic, or when several invalid calls must prove
that the input program remains unchanged.

Visual manifests treat the `userFacing` factory as the canonical executable
program. Their displayed `callChain` is presentation metadata: the render harness
parses it without evaluation and requires its top-level actions to match the
factory trace exactly.

Approved representative charts may also declare a compact visual signature:
an ink-density range and logical ink bounds with a small tolerance. Signatures
catch major layout regressions without committing platform-sensitive full PNG
snapshots; primitive and user-facing renders must still match pixel-for-pixel.

Artifact track shape is owned by `test/support/artifact-schema.js`. Paths,
metadata validation, render manifests, and gallery generation consume that
registry so a later roadmap does not add independent conditionals across the
test infrastructure.

Reference datasets are registered lazily in `test/support/data.js`. Use
`fixtureRows(id)` for a shared frozen oracle and `loadDataset(id)` or the named
loaders when a test specifically needs caller-owned mutable rows.

Independent expected-value algorithms live in `test/oracles/`. Oracle modules
must not import from `src/`: they are a separate mathematical implementation
used to catch shared implementation mistakes rather than repeat production
helpers. Keep a few representative literal expectations in chart tests as
anchors for the oracle itself and for important public examples.

Critical coverage is owned by `scripts/coverage-policy.js`. Family rules apply
minimum floors to every current and future file under high-risk boundaries;
explicit per-file overrides are reserved for modules that warrant stricter
thresholds. This prevents a newly split policy or renderer from escaping the
coverage contract.
