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
