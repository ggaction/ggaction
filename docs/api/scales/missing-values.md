---
layout: default
title: Scale Missing Values
---

# Scale Missing Values

{% include chart-example.html id="scatterplot" %}

{% include chart-example.html id="scatterplot" %}

## Missing and invalid values

Point encodings can provide an `unknown` fallback inside their scale options:

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

This policy is intentionally limited to row-owned point items. A missing value
inside a line/area path, bar aggregate, rule, xOffset group, or stroke-dash
series could change item topology; those consumers reject `unknown` until they
have a separate topology-safe policy. A direct unattached scale stores its
fallback and defers channel validation until attachment. Set
`unknown: undefined` with `editScale` to remove an existing fallback.

## Related

[Scale overview](../scales.md) · [Encodings](../encodings.md) · [Troubleshooting](../../troubleshooting.md)
