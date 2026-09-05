---
layout: default
title: Regression
---

# Regression

{% include chart-example.html id="regression" %}

`createRegression()` layers grouped linear, polynomial, or LOESS fits over an
existing quantitative point mark. Linear and polynomial fits can include mean
or prediction interval bands; LOESS is line-only.

## At a glance

| Action | Required decision | Inferred or default behavior |
| --- | --- | --- |
| `createRegression(options?)` | Nothing when one eligible point layer exists | Target, x, y, grouping, linear method, 95% mean interval, band and line appearance |
| `editRegression(options)` | At least one model or component option | Current or unique owner; unchanged values and fitted data retained |

## `createRegression(options?)`

```javascript
const program = points.createRegression();
```

The shortest call infers the target from the current or only eligible point
mark, x/y from its quantitative positions, and group from the unique nominal
field used by color and/or shape. Dataset, Cartesian coordinate, and x/y scales
come from that point layer. Inference fails rather than choosing among multiple
targets or group fields. Explicit `groupBy: false` requests one model and survives JSON serialization.
Legacy explicit `groupBy: undefined` keeps the same JavaScript behavior.

```javascript
program.createRegression({
  confidence: 0.95,
  band: {
    color: "#111111",
    opacity: 0.18,
    stroke: "#334155",
    strokeWidth: 1
  },
  line: { strokeWidth: 3, curve: "linear" }
});
```

| Option | Type | Default |
| --- | --- | --- |
| `target` | eligible point mark ID | inferred |
| `x`, `y` | quantitative field names | target x/y fields |
| `groupBy` | nominal field name or `false` (legacy explicit `undefined` also supported) | unique color/shape field |
| `method` | `"linear"`, `"polynomial"`, or `"loess"` | `"linear"` |
| `degree` | integer from `1` through `32` for polynomial | `2` |
| `span` | number greater than `0` and at most `1` for LOESS | `0.75` |
| `confidence` | number strictly between `0` and `1` | `0.95` |
| `interval` | `"mean"` or `"prediction"` | `"mean"` |
| `band` | appearance object or `false` | default band; no band for LOESS |
| `band.color` | color string | `"#111111"` |
| `band.opacity` | number from `0` to `1` | `0.18` |
| `band.stroke` | non-empty color string | no outline |
| `band.strokeWidth` | non-negative finite number | `1` with stroke |
| `line.strokeWidth` | non-negative finite number | `3` |
| `line.curve` | supported curve interpolation | `"linear"` |

Choose another model or interval without coordinating its child layers:

```javascript
points.createRegression({ method: "polynomial", degree: 2 });
points.createRegression({ method: "loess", span: 0.55 });
points.createRegression({ interval: "prediction" });
```

Polynomial degree `1` retains polynomial provenance while producing the same
fit as linear regression. Prediction intervals include residual uncertainty
and are therefore at least as wide as matching mean intervals. LOESS does not
accept `confidence`, `interval`, or a band object; its omitted or `false` band
produces only the fitted line. Linear and polynomial bands can also be disabled
with `band: false`.

Each regression produces at most 10,000 group/x rows. Polynomial and LOESS
inputs whose estimated fitting work exceeds 10,000,000 units throw a
`RangeError` before the expensive fit begins.

The action keeps each fitted dataset, band, and line associated with its target
point mark, so multiple point layers can add independent regressions in one
program. The exact generated IDs are internal and are not required in ordinary
chart-authoring code.

Its trace records `createRegressionData`, optional `createRegressionBand`, and
`createRegressionLine` as meaningful children. The band child validates
regression provenance and delegates its interval geometry to a nested
`createErrorBand` call. See
[Actions and trace trees](../concepts/actions-and-trace.md) when that
decomposition matters.

## Editing a regression

Use the original point owner, not generated band or line IDs:

```javascript
const revised = program.editRegression({
  target: "points",
  method: "polynomial",
  degree: 2,
  band: { color: "#a78bfa", opacity: 0.16 },
  line: { strokeWidth: 4 }
});
```

Create-time data roles can be revised through the same stable owner:

```javascript
const rebound = program.editRegression({
  data: "observations",
  x: "time",
  y: "value",
  groupBy: false
});
```

`method`, `degree`, `span`, `confidence`, and `interval` follow the same
method-specific rules as creation. A data-role or statistical change creates
one new immutable fitted-data revision, rebinds every owned regression
component, and releases the old revision when nothing references it.
`groupBy: false` removes line color/group and band grouping. Component IDs,
coordinate, and position scale IDs remain stable. A request containing only
`band` or `line` appearance retains the existing fitted rows.

Set `band: false` or switch to LOESS to remove the owned band. Switching back
to linear or polynomial regression recreates the band by default; a band
object can also restore it explicitly. Target omission uses the current or
only regression owner and fails on ambiguity.

## Editing generated components

```javascript
const emphasized = program
  .editRegressionBand({
    color: "#475569",
    opacity: 0.12,
    stroke: "#111827",
    strokeWidth: 1.5,
    curve: "cardinal"
  })
  .editRegressionLine({ strokeWidth: 5 });
```

Each action infers the only compatible generated component or accepts an
explicit target. Band edits delegate to `editAreaMark`; line edits delegate to
`editLineMark`. They preserve fitted data, result fields, grouping, coordinates,
and scales. `stroke: false` removes a band outline. Band curves use the same
eight-value interpolation vocabulary as area and line marks.

## Errors and limitations

The action rejects ambiguous point targets, missing quantitative x/y
encodings, incompatible coordinates or scales, ambiguous nominal grouping,
invalid method-specific parameters, and groups that cannot support the chosen
fit. Robust LOESS reweighting and LOESS confidence bands are not supported.
Failed calls leave the earlier immutable program unchanged.

## Related

[Regression scatterplot tutorial](../tutorials/regression-scatterplot.md) ·
[Data](./data.md) · [Marks](./marks.md) · [Encodings](./encodings.md) ·
[Guides](./guides.md)
