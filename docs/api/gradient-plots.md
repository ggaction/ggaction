---
layout: default
title: Gradient Plots
---

# Gradient Plots

{% include chart-example.html id="gradient" %}

`createGradientPlot` compares a quantitative distribution across categories.
Each category becomes one density-filled strip plus an optional center rule.
The action uses the same categorical/quantitative `x` and `y` roles as
`createBoxPlot`, so orientation follows the fields rather than a separate flag.

## Create a gradient plot

```javascript
import { chart } from "ggaction";

const program = chart()
  .createCanvas({
    width: 620,
    height: 460,
    margin: { top: 85, right: 170, bottom: 95, left: 80 }
  })
  .createData({ values: cars })
  .createGradientPlot({
    x: { field: "Origin", fieldType: "nominal" },
    y: { field: "Acceleration" }
  });
```

The shortest complete call infers Cartesian scales and creates applicable
axes, grid lines, a median center rule, and a right-side relative-density
legend. Axis titles retain the original source fields even though the action
materializes an internal sampled profile dataset.

Use a categorical color encoding when each category should keep its own hue:

```javascript
const colored = program.encodeColor({
  target: "gradientPlot",
  field: "Origin",
  fieldType: "nominal",
  scale: { palette: "tableau10" }
});
```

Density still controls lightness and opacity inside each strip. `gradient`
controls the neutral palette and opacity range when no category color encoding
is present.

## Options and defaults

```javascript
createGradientPlot({
  id?, target?, data?, x?, y?, coordinate?,
  density?: { bandwidth?, extent?, steps?, kernel?, normalization? },
  width?: { band? },
  gradient?: { palette?, opacity? },
  center?: false | { type?, stroke?, strokeWidth? },
  guides?: false | { axes?, grid?, legend? }
} = {})
```

- `density` defaults to Gaussian, automatic bandwidth and extent, `64` steps,
  and unit normalization. `steps` is limited to 10,000; all category profiles
  together are limited to 10,000 generated rows and the shared density work
  budget.
- `width.band` defaults to `0.7` of the category band.
- `gradient` defaults to `blues` with opacity `[0, 1]`.
- `center` defaults to a median rule with a `1.5` logical-pixel dark stroke;
  `false` removes the complete optional component.
- `guides: false` omits all guide resources. Nested `false` values omit only
  that component.

Positions can be supplied in the create call, inferred from one compatible
encoded layer, or completed afterward with `encodeX` and `encodeY`. An omitted
choice is accepted only when one source or target is unambiguous.

## Edit and compose

```javascript
const edited = colored.editGradientPlot({
  density: { bandwidth: 0.8 },
  width: { band: 0.55 },
  center: { type: "mean", stroke: "#111827" }
});
```

The same owner can revise its raw source or complete positional roles:

```javascript
const horizontal = edited.editGradientPlot({
  data: "observations",
  x: { field: "value", fieldType: "quantitative" },
  y: { field: "group", fieldType: "nominal" }
});
```

Omitted `data`, `x`, and `y` retain current provenance. Exactly one resulting
role must be categorical and the other quantitative. A role swap preserves the
strip and center IDs, creates an immutable profile revision, moves axes and the
continuous grid, rebuilds structured paints and the density legend, and
replays compatible highlights. An incompatible stored selector or shared-scale
handoff rejects the complete edit.

Density or center-statistic changes create a new immutable profile revision.
Width, palette, opacity, and center appearance retain the current profile.
Canvas and scale edits rematerialize strips, paint direction, center rules,
attached text, and guides.

`selectMarks` and `highlightMarks` operate at one category-strip grain. An
opacity or offset highlight preserves the structured density paint; an
explicit `fill` replaces it. `filterMarks` intentionally rejects this
composite resource—filter the source with `filterData` before
`createGradientPlot` instead.

Cartesian `facet` replays the profile independently inside each cell. Shared
density legends are not currently supported; omit the facet legend or keep
legends outside the repeated chart.

## Current limitations

Subgroup offsets, multiple overlaid profiles, independent per-category
intensity domains, and shared facet density legends are not implemented.

## Related

[Box plots](./box-plots.md) · [Data filtering](./data/filtering.md) ·
[Selection and highlighting](./appearance/selection-and-highlighting.md) ·
[Statistical action reference](../reference/actions/statistics.md#creategradientplot)
