---
layout: default
title: Quantitative Positions
---

# Quantitative Positions

## At a glance

| Action | Shortest call | Required state | Result |
| --- | --- | --- | --- |
| `encodeX` | `encodeX({ field: "x" })` | point mark and finite field | Concrete horizontal positions |
| `encodeY` | `encodeY({ field: "y" })` | point mark and finite field | Concrete vertical positions |

## Point `encodeX(options)` and `encodeY(options)`

```javascript
program
  .encodeX({ field: "Horsepower" })
  .encodeY({ field: "Miles_per_Gallon" });
```

| Option | Type | Default |
| --- | --- | --- |
| `field` | non-empty string | required |
| `target` | point mark ID | current mark |
| `fieldType` | `"quantitative"` | `"quantitative"` |
| `coordinate` | coordinate ID | layer coordinate, then `"main"` |
| `scale.id` | scale ID | channel name |
| `scale.type` | `"linear"` | `"linear"` |
| `scale.domain` | `"auto"` or two finite numbers | `"auto"` |
| `scale.range` | `"auto"` or two finite numbers | `"auto"` |
| `scale.nice` | boolean | omitted |
| `scale.zero` | boolean | omitted |

Automatic domains combine compatible fields that share a scale. Automatic
ranges use plot bounds, and every encoded value must be finite. The actions
ensure a Cartesian coordinate exists and attach it to the point layer.

## Errors and limitations

A conflicting layer coordinate, non-Cartesian coordinate, cross-channel scale,
or non-finite field value is rejected before partial output is retained.

## Related

[Position encoding index](../position-encodings.md) ·
[Scale options](../scales.md) · [Scatterplot tutorial](../../tutorials/scatterplot.md)
