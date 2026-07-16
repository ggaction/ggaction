---
layout: default
title: Box Plots
---

# Box Plots

`createBoxPlot` creates vertical or horizontal box plots from one categorical
field and one quantitative field. It derives immutable summary data and
composes ordinary ranged-bar, error-bar, rule, and optional point actions.

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
createBoxPlot({ id?, target?, data?, x?, y?, coordinate?, whisker? } = {})
```

| Option | Meaning | Default or inference |
| --- | --- | --- |
| `id` | box-body owner ID | first instance uses `"boxPlot"` |
| `target` | compatible encoded source layer | current, then unique eligible layer |
| `data` | source dataset | source layer, then current dataset |
| `x` | categorical or quantitative field and optional scale | inferred from `target` when omitted |
| `y` | categorical or quantitative field and optional scale | inferred from `target` when omitted |
| `coordinate` | Cartesian coordinate ID | source coordinate, then `"main"` |
| `whisker` | `{ type: "tukey" }` or `{ type: "minmax" }` | Tukey with factor `1.5` |

`createBoxPlot()` may also establish an incomplete owner first. Compatible
`encodeX` and `encodeY` calls can follow later; the completed semantic and
graphical state is the same as supplying both channels at creation time.

The category/measure pairing determines orientation. This horizontal min–max
example creates no outlier resources:

```javascript
program.createBoxPlot({
  x: { field: "Horsepower" },
  y: { field: "Origin", fieldType: "nominal" },
  whisker: { type: "minmax" }
});
```

## Current statistical and visual defaults

- Quartiles use linear interpolation at `(n - 1) × p`.
- Whiskers use the most extreme observed values inside `1.5 × IQR` fences.
- `{ type: "minmax" }` instead uses each category's observed minimum and
  maximum and never creates an outlier dataset, layer, or graphic.
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

Public factor customization, width/style options, and outlier toggles are not
implemented yet. `createBoxPlot` is a create-only aggregate; there is no
`editBoxPlot` action.

## Related

[Marks](./marks.md) · [Encodings](./encodings.md) ·
[Error bars](./error-bars.md) · [Guides](./guides.md)
