---
layout: default
title: Discretized Color Scales
---

# Discretized Color Scales

{% include chart-example.html id="scatterplot" %}

{% include chart-example.html id="scatterplot" %}

## Discretized point color

Quantitative point color can create concrete color classes instead of a
continuous gradient:

- `quantize` divides a numeric extent into equal-width intervals.
- `quantile` derives boundaries that keep observed class counts as even as
  possible.
- `threshold` uses an explicit, strictly increasing boundary array. A domain
  with `n` boundaries requires `n + 1` colors.

```javascript
program.encodeColor({
  field: "life_expect",
  fieldType: "quantitative",
  scale: {
    type: "threshold",
    domain: [60, 70, 75, 80],
    range: ["#440154", "#3b528b", "#21918c", "#5ec962", "#fde725"]
  }
});
```

An exact boundary belongs to the upper interval. `reverse: true` reverses the
resolved colors without changing boundaries. `createLegend()` infers an
interval legend with labels such as `< 60`, `60–70`, and `≥ 80`. These
mappings are available through quantitative point `encodeColor` and the direct
scale vocabulary. A type-changing `editScale` call validates the complete
replacement definition before rematerializing its consumers.

## Related

[Scale overview](../scales.md) · [Encodings](../encodings.md) · [Troubleshooting](../../troubleshooting.md)
