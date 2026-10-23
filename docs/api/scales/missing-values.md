---
layout: default
title: Scale Missing Values
---

# Scale Missing Values

{% include chart-example.html id="scatterplot" lead=true %}

## Missing and invalid values

Point encodings can provide an `unknown` fallback inside their scale options:

<!-- snippet-context:start -->

> **Contextual fragment.** Use an ES module with the imports, data, and prepared resource state described in this section. Caller-provided receivers: `program`. Resolve these names from setup in this fragment or section; alternatives branch from the same base.

<!-- snippet-context:end -->

```javascript
program.encodeX({
  field: "value",
  scale: { domain: [0, 100], unknown: 20 }
});
```

The fallback is used for a missing or field-type-invalid input. For ordinal
point position or appearance, it also handles a value outside an explicit
domain. It never becomes a domain member. Output validation follows the
channel: position uses a finite coordinate, color a non-empty string, size a
non-negative area, opacity a value from `0` to `1`, and shape one supported
point shape.

Missing or invalid row fallback is limited to row-owned point items, with one
separate line-color policy: a Cartesian line with nominal/ordinal color and an
explicit nonempty ordinal domain can use an unknown paint while preserving raw
series identities. Missing and null colors use that paint; malformed category
objects, arrays and non-finite numbers still fail.

Cartesian line and rule stroke-dash scales support `unknown` for valid raw
categories outside a domain. The fallback is a named dash style or direct
pattern, including `[]` for a solid stroke. It does not permit missing or invalid
categories, add domain or legend entries, or merge different raw series.
Parallel, polar, aggregate and binned path topologies reject this fallback.
See [Ordinal and stroke dash scales](./ordinal-and-dash.md).

Other grouped and aggregate consumers retain their existing strict policy.
A direct unattached scale stores its fallback and defers channel validation
until attachment. Set `unknown: undefined` with `editScale` to remove an existing
fallback. The edit fails atomically if any dependent consumer would become
invalid. The focused `editStrokeDashScale` supports the same removal.

## Related

[Scale overview](../scales.md) · [Encodings](../encodings.md) · [Troubleshooting](../../troubleshooting.md)
