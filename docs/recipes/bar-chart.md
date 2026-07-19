---
layout: default
title: Bar Chart Recipe
---

# Bar Chart Recipe

{% include chart-example.html id="bar" %}

The current complete bar-chart example uses grouped bars. Grouping is a layout
choice inside the bar chart, not a separate top-level chart type.

## Minimal grouped flow

```javascript
const program = chart()
  .createCanvas({ margin: { right: 140 } })
  .createData({ values })
  .createBarPlot({
    x: { field: "category", fieldType: "ordinal" },
    y: { field: "value", aggregate: "mean" },
    color: { field: "group", layout: "group" },
    width: { band: 0.72 }
  });
```

## You must decide

- Ordinal x field
- Quantitative y field
- Nominal grouping/color field

## The library infers

- First-appearance x and group order
- Mean y at the final x/group grain
- xOffset slots from grouped color layout
- A `0.72` bar-band fraction
- Ordinal/linear axes, horizontal grid, and right-side legend

Missing x/group combinations are omitted. Change `layout` to `stack`, `fill`,
`overlay`, or `diverging` to use the other supported series arrangements.
Use `encodeBarWidth({ pixels: 14 })` for a resize-stable logical width, or
`encodeXOffset({ field: "group", paddingInner: 0.2, paddingOuter: 0.1 })`
after grouped color to change within-band spacing. Reassign the group field
with one `encodeColor({ field: "nextGroup", layout: "group" })` call.
The current API does not synthesize zero bars. For horizontal bars, put the
quantitative measure on x and the ordinal category on y.

## Continue

[Bar chart tutorial](../tutorials/grouped-bar.md) ·
[Basic Charts](../api/basic-charts.md#createbarplot) ·
[Ordinal bar positions](../api/position/ordinal-bars.md) ·
[Ordinal offsets](../api/position/offsets.md)
