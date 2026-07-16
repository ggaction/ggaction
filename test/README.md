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

`test/support/program-state.js` owns assertions for named program resources and
atomic rejection. Prefer those helpers when a test needs an existing dataset,
layer, scale, coordinate, or graphic, or when several invalid calls must prove
that the input program remains unchanged.
