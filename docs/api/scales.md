---
layout: default
title: Scale Options
---

# Scale Options

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
counts and rect geometry are deferred until the remaining histogram encodings
are present.

A histogram count y scale defaults to `nice: true` and `zero: true`. Its
automatic domain uses total counts per x bin rather than raw source values.
The x and y scale actions both leave concrete rect geometry unchanged until
bar materialization is available.

## Ordinal scales

Color and stroke-dash encodings use ordinal scales. Automatic domains preserve
first-appearance order. Color ranges accept explicit colors or
`{ palette: "tableau10" }`; stroke-dash ranges accept arrays of dash patterns.

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
