---
layout: default
title: Scale Options
---

# Scale Options

## At a glance

| Scale family | Default domain | Default range | Common controls |
| --- | --- | --- | --- |
| Linear/time position | `"auto"` | Plot bounds | `nice`, `zero` |
| Ordinal position/xOffset | First-appearance order | Plot or parent band | explicit domain/range |
| Color/strokeDash | First-appearance order | Built-in palette/patterns | palette or explicit range |

Encoding actions accept a nested `scale` object. Omitted properties use channel
defaults and stored program state.

## Continuous scales

| Option | Type | Default |
| --- | --- | --- |
| `id` | scale ID | channel name |
| `type` | `"linear"` or `"time"` | inferred from channel and field type |
| `domain` | `"auto"` or two values | `"auto"` |
| `range` | `"auto"` or two finite numbers | `"auto"` |
| `nice` | boolean | omitted |
| `zero` | boolean | omitted; linear only |

Automatic ranges use current plot bounds. For automatic linear domains,
`zero: true` includes zero and `nice: true` then expands to rounded boundaries.
Automatic temporal `nice` expands to UTC calendar boundaries. Time scales
reject `zero`.

The precedence is:

```text
explicit domain > nice / zero > inferred domain
explicit range  > inferred range
```

### Binned bar x scales

A binned bar x encoding defaults to `nice: true` and `zero: false`. Automatic
nice bin boundaries use `1, 2, 3, 5 × 10ⁿ` steps and never create more than
`bin.maxBins` intervals. Explicit domains remain unchanged; `nice` and `zero`
do not expand them.

The resolved scale domain contains the outer bin boundaries. Concrete bin
counts and rect geometry are materialized once count/zero-stack y is present.

A histogram count y scale defaults to `nice: true` and `zero: true`. Its
automatic domain uses total counts per x bin rather than raw source values.
The x action leaves the collection empty; the y action resolves both scales and
materializes concrete histogram rectangles.

### Aggregate ordinal bar y scales

An ordinal bar mean y scale defaults to `nice: true` and `zero: false`.
Its automatic domain uses one `mean(field)` value per ordinal x category rather
than raw source values. Explicit domain and range values remain authoritative.
The y action resolves the scale but leaves rectangles empty until grouping
semantics are available.

## Ordinal scales

Ordinal bar x, color, and stroke-dash encodings use ordinal scales. Automatic
domains preserve first-appearance order.

An ordinal bar x scale uses `"auto"` or a numeric pair as its range. Automatic
ranges use the horizontal plot bounds. The resolved scale records one equal
`step` per domain value and an absolute `bandwidth`; category positions lie at
band centers. Reversed explicit ranges are valid. Ordinal scales reject
`nice` and `zero`.

Color ranges accept explicit colors or `{ palette: "tableau10" }`;
stroke-dash ranges accept arrays of dash patterns.

```javascript
program.encodeColor({
  field: "Origin",
  scale: {
    domain: ["USA", "Europe", "Japan"],
    range: ["#4c78a8", "#f58518", "#e45756"]
  }
});
```

User-specified domains and ranges are semantic state. Resolved coordinates,
colors, and dash patterns are stored as concrete graphical values.

## Errors and limitations

One scale cannot be shared across different channels. Explicit domains must
contain every observed value required by the connected consumers.

## Related

[Position encodings](./position-encodings.md) ·
[Series encodings](./series-encodings.md) · [Semantic and graphical state](../concepts/semantic-and-graphics.md) ·
[Troubleshooting](../troubleshooting.md)
