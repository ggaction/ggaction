---
layout: default
title: Series Encodings
---

# Series Encodings

{% include chart-example.html id="line" %}

## At a glance

| Action | Shortest call | Inference/defaults | Result |
| --- | --- | --- | --- |
| `encodeGroup` | `encodeGroup({ field: "country" })` or `{ fields: ["country", "scenario"] }` | Current Line/Area; nominal fields | Explicit path identity without a scale |
| `encodeOpacity` | `encodeOpacity({ field: "quality" })` | Current Point/Rule/Line; quantitative field | One opacity per item or series |
| `encodeColor` | `encodeColor({ field: "group" })` | Current mark, nominal default or explicit ordinal field type, color scale | Semantic grouping and concrete color |
| `encodeStrokeDash` | `encodeStrokeDash({ field: "group" })` | Current line/rule mark and dash scale | Field-driven or constant concrete dash |
| `encodeStrokeWidth` | `encodeStrokeWidth({ field: "weight" })` | Current line/rule; independent quantitative scale | Rule-item or line-series widths |
| `encodePathOrder` | `encodePathOrder({ field: "year" })` | Current or unique compatible Cartesian path; ascending default | Stable per-series vertex order without a scale |
| `encodeParallelCoordinates` | `encodeParallelCoordinates({ dimensions: ["a", "b"] })` | Current line, Parallel coordinate, local scales, `break` missing policy | One row path across ordered dimension axes |

Series appearance is authored through color, stroke dash, stroke width, and opacity. Each
focused page owns the complete options, replacement behavior, and errors for
that encoding.

## Independent series identity

For a line with positions already assigned, this fragment creates four country
paths even when the countries share just two continent colors:

```javascript
program
  .encodeGroup({ field: "country" })
  .encodeColor({ field: "continent" });
```

Use `encodeGroup({ fields: ["country", "scenario"] })` for one path per tuple.
Then color can represent continent and dash can represent scenario. Group fields
must be unique, non-empty names with nominal scalar values. `{ fields: ["country"] }`
normalizes to `{ field: "country" }`; providing both forms is an error.

Appearance fields must have one raw value per complete series. Different values
that happen to map to the same color still fail. Width and opacity never infer a
group. Removing explicit grouping restores Line's color/dash grouping and fails
if the remaining appearance would be ambiguous. Ordinary ranged Areas support
the same explicit identity; statistical and stacked-layout groups keep their
existing owner restrictions.

The [runnable series tutorial](https://github.com/ggaction/ggaction/tree/main/examples/series-identity)
uses one shared program for country colors, tuple color/dash, and field width/opacity.

## Explicit path topology

```javascript
const ordered = program.encodePathOrder({
  field: "year",
  order: "ascending"
});

const automatic = ordered.removePathOrder();
```

`encodePathOrder` supports direct Cartesian quantitative/temporal lines and
ordinary ranged areas backed by raw or row-preserving data. It sorts each
color/group/stroke-dash series independently, keeps repeated positions, and
uses source-row order to break ties. The field is quantitative, `order` is
`"ascending"` or `"descending"`, and neither action creates a scale or guide.

Aggregate lines, Polar lines, and generated density, error, or regression paths
own their topology elsewhere and are rejected. Missing or non-finite order
values reject the complete action instead of producing a partial path.

## Focused series families

<div class="docs-entry-grid docs-entry-grid--two">
  <a href="{{ '/api/series/color/' | relative_url }}"><strong>Color</strong><span>Categorical and continuous color, grouping layouts, and aggregate bars.</span></a>
  <a href="{{ '/api/series/stroke-dash/' | relative_url }}"><strong>Stroke dash</strong><span>Constant and field-driven dash patterns for lines and rules.</span></a>
</div>

Parallel coordinates use one atomic ordered-dimension assignment rather than
separate x/y calls. See [Parallel Coordinates](./parallel-coordinates.md) for
dimension scales, row identity, missing policies, and lifecycle behavior.

## Errors and limitations

Stroke-dash and explicit group fields must be nominal. Color fields may be
nominal or ordinal. Without an explicit Line group, color and field-driven dash
must use the same field. Explicit identity allows different appearance fields
when each is unique within the series. Center/stack/fill Area retains matching
single-field color/group ownership.
Combined line legends also require matching ordered domains.
Stroke width is quantitative and independent of point size. A line series must
have exactly one width value across all contributing rows; segment-local and
tapered widths are unsupported.

## Related

[Scale options](./scales.md) · [Legends](./legends.md) ·
[Position encodings](./position-encodings.md)
