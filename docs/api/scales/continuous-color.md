---
layout: default
title: Continuous Color Scales
---

# Continuous Color Scales

{% include chart-example.html id="density" %}

{% include chart-example.html id="density" %}

## Named palettes

Use a name directly or an object with optional sampling controls:

```javascript
program.encodeColor({
  field: "Origin",
  scale: { palette: { name: "set2", count: 3 } }
});
```

Accepted names are fixed by the ggaction contract:

| Family | Names |
| --- | --- |
| Categorical | `accent`, `category10`, `category20`, `category20b`, `category20c`, `observable10`, `dark2`, `paired`, `pastel1`, `pastel2`, `set1`, `set2`, `set3`, `tableau10`, `tableau20` |
| Sequential | `blues`, `tealblues`, `teals`, `greens`, `browns`, `oranges`, `reds`, `purples`, `warmgreys`, `greys`, `viridis`, `magma`, `inferno`, `plasma`, `cividis`, `turbo`, `bluegreen`, `bluepurple`, `goldgreen`, `goldorange`, `goldred`, `greenblue`, `orangered`, `purplebluegreen`, `purpleblue`, `purplered`, `redpurple`, `yellowgreenblue`, `yellowgreen`, `yelloworangebrown`, `yelloworangered`, `darkblue`, `darkgold`, `darkgreen`, `darkmulti`, `darkred`, `lightgreyred`, `lightgreyteal`, `lightmulti`, `lightorange`, `lighttealblue` |
| Diverging | `blueorange`, `brownbluegreen`, `purplegreen`, `pinkyellowgreen`, `purpleorange`, `redblue`, `redgrey`, `redyellowblue`, `redyellowgreen`, `spectral` |
| Cyclical | `rainbow`, `sinebow` |

`count` must be a positive integer. Categorical palettes use a prefix when the
count is shorter and cycle deterministically when it is longer. Other families
are sampled to `count`, or to the resolved domain size when omitted. `extent`
is accepted only for non-categorical palettes and contains two distinct values
within `[0, 1]`; descending values reverse the sampling direction. Scale
`reverse` is applied afterward.

The semantic scale stores the palette descriptor. Materialized scales, marks,
legends, and renderers receive only concrete CSS colors. Explicit `range` and
`palette` cannot be supplied together.

## Continuous point and aggregate-bar color

Quantitative or temporal point color uses `fieldType: "quantitative"` or
`"temporal"` and an internal sequential scale. Aggregate bars support
quantitative sequential color with one aggregate value per final rectangle.
The default palette is
`viridis`; an explicit palette may use `extent`, while an explicit range needs
at least two colors. `interpolate` accepts `rgb`, `hsl`, `hsl-long`, `lab`,
`hcl`, `hcl-long`, `cubehelix`, or `cubehelix-long`. `clamp` and `reverse`
affect both points and a connected gradient legend.

```javascript
program.encodeColor({
  field: "Acceleration",
  fieldType: "quantitative",
  scale: { palette: "viridis", interpolate: "rgb" }
});
```

The sequential type is inferred inside `encodeColor` and is also available to
direct `createScale` and compatible atomic `editScale` transitions.

For aggregate bars, a color field equal to the measure field inherits its
aggregate. A different quantitative field requires an explicit `aggregate`.
The automatic domain is derived from those final aggregate values, not from
the unaggregated source rows.

## Related

[Scale overview](../scales.md) · [Encodings](../encodings.md) · [Troubleshooting](../../troubleshooting.md)
