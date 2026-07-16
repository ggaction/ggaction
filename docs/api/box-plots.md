---
layout: default
title: Box Plots
---

# Box Plots

`createBoxPlot` creates a vertical Tukey box plot from one categorical x field
and one quantitative y field. It derives immutable summary/outlier datasets and
composes ordinary ranged-bar, error-bar, rule, and point actions.

```javascript
import { chart } from "ggaction";

const program = chart()
  .createCanvas({
    width: 360,
    height: 460,
    margin: { top: 140, right: 40, bottom: 70, left: 80 }
  })
  .createData({ values: cars })
  .createBoxPlot({
    x: { field: "Origin", fieldType: "nominal" },
    y: { field: "Miles_per_Gallon" }
  });
```

## Signature

```javascript
createBoxPlot({ id?, target?, data?, x?, y?, coordinate? } = {})
```

| Option | Meaning | Default or inference |
| --- | --- | --- |
| `id` | box-body owner ID | first instance uses `"boxPlot"` |
| `target` | compatible encoded source layer | current, then unique eligible layer |
| `data` | source dataset | source layer, then current dataset |
| `x` | categorical field, type, and optional scale | inferred from `target` when omitted |
| `y` | quantitative field and optional scale | inferred from `target` when omitted |
| `coordinate` | Cartesian coordinate ID | source coordinate, then `"main"` |

`createBoxPlot()` may also establish an incomplete owner first. Compatible
`encodeX` and `encodeY` calls can follow later; the completed semantic and
graphical state is the same as supplying both channels at creation time.

## Current statistical and visual defaults

- Quartiles use linear interpolation at `(n - 1) × p`.
- Whiskers use the most extreme observed values inside `1.5 × IQR` fences.
- Missing category or measure rows are omitted; non-missing non-finite measures
  are errors.
- Category order follows first valid source appearance.
- Box width is `0.7` of the category band and box opacity is `1`.
- Box borders, medians, whiskers, and caps use `1.5` logical pixels.
- Outliers are black diamonds with radius-equivalent size `3` and opacity
  `0.75`. No outlier resource is created when no outlier row exists.

The summary and optional outlier datasets, child layers, and graphics use
deterministic IDs derived from the owner. Canvas or shared-scale changes
explicitly rematerialize boxes, medians, whiskers, caps, and outliers.

## Current limitations

The current action supports vertical Tukey box plots. Horizontal orientation,
min/max whiskers, and public factor, width, style, or outlier toggles are not
implemented yet. `createBoxPlot` is a create-only aggregate; there is no
`editBoxPlot` action.

## Related

[Marks](./marks.md) · [Encodings](./encodings.md) ·
[Error bars](./error-bars.md) · [Guides](./guides.md)
