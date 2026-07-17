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

Selectors match a chart directory, a capability substring, or a path relative to
`test/`. Browser and PNG regressions remain explicit because they start external
rendering resources:

```sh
npm run test:browser
npm run test:render
```

`npm run test:gates` reports `No active gate tests.` and succeeds when every
approved visual slice has graduated into `test/charts/`.

`test/support/program-state.js` owns assertions for named program resources and
atomic rejection. Prefer those helpers when a test needs an existing dataset,
layer, scale, coordinate, or graphic, or when several invalid calls must prove
that the input program remains unchanged.

Visual manifests treat the `userFacing` factory as the canonical executable
program. Their displayed `callChain` is presentation metadata: the render harness
parses it without evaluation and requires its top-level actions to match the
factory trace exactly.

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
