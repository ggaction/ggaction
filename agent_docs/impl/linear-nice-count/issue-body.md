## Need

Independent linear scales currently offer only boolean `nice`. The existing upward-rounding policy is useful and should remain unchanged, but it cannot express an automatic range based on a chosen tick density.

For example, this is valid today:

```js
chart()
  .createCanvas({ plot: { width: 200, height: 120 } })
  .createData({ values: [{ x: 0, y: 0 }, { x: 1, y: 108 }] })
  .createLinePlot({
    x: "x",
    y: { field: "y", scale: { zero: true, nice: true } },
    guides: false
  });
```

Its automatic Y domain is `[0,120]`. A count-based policy with density 10 should support `[0,110]`. When several facets need different automatic domains, one shared explicit domain cannot express the intended design. Changing only the tick labels would leave the data geometry wrong.

## Concrete proposed API

Extend the existing option with `nice: { count: 10 }`, without a new action:

```js
.createLinePlot({
  x: "x",
  y: { field: "y", scale: { zero: true, nice: { count: 10 } } },
  guides: false
})
.facet({ field: "group", scales: { y: "independent" } })
```

The count controls domain rounding density; it does not force the number of guide ticks. Keep omitted/false/true output unchanged. Require a positive safe-integer count and an exact one-key object. Restrict the object to supported linear position scales; reject it for other scale roles/types. Explicit domains retain precedence. Reuse the same immutable stored scale decision through focused/generic edits, data revisions, shared consumers, facets and persistence.

For representative input maxima `133,108,171,107,139,116` and zero-based domains, preserve legacy boolean maxima `150,120,200,120,150,120`, and support count-10 maxima `140,110,180,110,140,120`.

## Review and verification

The implementation review package is `agent_docs/impl/linear-nice-count/PROPOSAL.md`. Its executable concrete target and an existing explicit-domain control have identical graphics, SVG and same-run decoded PNG pixels; the new public option is not implemented yet.

Required evidence includes independent numeric expectations and finite-range containment, atomic validation, unchanged boolean behavior, explicit/constant domains, type changes, scale edits, shared/rematerialized consumers, independent facets, persistence, package/type consumers, and synchronized contracts/docs/generated references/examples. Keep public publication at the next authorized batch checkpoint.
