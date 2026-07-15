---
layout: default
title: Histogram Positions
---

# Histogram Positions

## At a glance

| Action | Shortest call | Required state | Result |
| --- | --- | --- | --- |
| `encodeHistogram` | `encodeHistogram({ field: "value" })` | bar mark | Atomic binned x and count/stack y |
| binned `encodeX` | `encodeX({ field: "value", bin: {} })` | bar mark | Bins and x scale |
| count `encodeY` | `encodeY()` | binned bar x | Count y scale and concrete rects |

Prefer the atomic action for ordinary chart authoring:

```javascript
program.encodeHistogram({ field: "Displacement", maxBins: 10 });
```

It calls the wrapped x and y actions below without duplicating their inference
or validation.

## Binned bar `encodeX(options)`

| Option | Type | Default |
| --- | --- | --- |
| `field` | non-empty string | required |
| `target` | bar mark ID | current mark |
| `fieldType` | `"quantitative"` | `"quantitative"` |
| `coordinate` | coordinate ID | layer coordinate, then `"main"` |
| `bin.maxBins` | positive integer | `10` |
| `bin.step` | positive finite number | mutually exclusive |
| `bin.boundaries` | at least two increasing finite numbers | mutually exclusive |
| `scale.id` | scale ID | `"x"` |
| `scale.type` | `"linear"` | `"linear"` |
| `scale.domain` | `"auto"` or two ascending finite numbers | `"auto"` |
| `scale.range` | `"auto"` or two finite numbers | `"auto"` |
| `scale.nice` | boolean | `true` |
| `scale.zero` | boolean | `false` |

Automatic nice bins use `1, 2, 3, 5 × 10ⁿ` steps and never exceed `maxBins`.
Exact-step bins use zero as their grid anchor and expand an automatic domain
to step multiples. Explicit boundaries support irregular interval widths and
own the x-domain endpoints. All intervals are half-open except the final
interval, which includes its upper endpoint.
The rect collection remains empty until y is encoded.

## Count/stack bar `encodeY(options?)`

| Option | Type | Default |
| --- | --- | --- |
| `field` | binned x field | inferred from x |
| `target` | bar mark ID | current mark |
| `aggregate` | `"count"` | `"count"` |
| `stack` | `"zero"` | `"zero"` |
| `scale.id` | scale ID | `"y"` |
| `scale.type` | `"linear"` | `"linear"` |
| `scale.domain` | `"auto"` or two finite numbers | `"auto"` |
| `scale.range` | `"auto"` or two finite numbers | `"auto"` |
| `scale.nice` | boolean | `true` |
| `scale.zero` | boolean | `true` |

The automatic y domain uses total bin counts. The action materializes one
concrete rectangle per non-empty bin; a later color encoding can split each bin
into zero-stacked category segments.

## Errors and limitations

Explicit fields must match the binned x field. `maxBins`, `binStep`, and
`binBoundaries` are mutually exclusive. Step-aligned explicit domains must
contain the data and use zero-anchored step multiples. Explicit boundaries
must contain the complete data extent; a separate domain must match their
first and last values. Empty intervals remain meaningful but do not create
zero-height rectangles. Grouped histograms are unsupported.

## Related

[Series encodings](../series-encodings.md) · [Scale options](../scales.md) ·
[Histogram tutorial](../../tutorials/histogram.md)
