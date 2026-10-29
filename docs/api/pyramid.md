---
layout: default
title: Pyramid Plots
---

# Pyramid plots

Show ordered stages as adjacent trapezoids. Use width to compare their spans, or
area to make each trapezoid's area proportional to its value. These actions use
the Full `ggaction` entry point and render through Canvas, SVG, PNG and PDF.

{% include chart-example.html id="pyramid" %}

## `createPyramidPlot`

**Chart authoring.**

```typescript
createPyramidPlot(options: TargetedOptions<CreatePyramidPlotOptions>): ChartProgram;
```

Create a Canvas and dataset first. Pass `stage` and `value` as column names.
Stage labels may repeat; dataset row keys identify the individual stages.
Values must be finite and nonnegative. Rows remain in input order, including
when a later stage is larger than an earlier one.

Options are `{ id?, data?, coordinate?, stage, value, orientation?, encoding?,
gap?, lastStage?, taperRatio?, percentBase?, stages?, labels?, color?, clip? }`.
The default ID is `pyramid`; use an explicit ID for another plot. Omitted data
and Cartesian coordinate references use the current or unique eligible resource.
The `main` coordinate is created if none exists. Ambiguous references are errors.

`orientation` is `down` by default, or `up`, `right`, `left`. Directions change
where stages progress without reversing their input order. Stages have equal
lengths along that direction. `gap` is nonnegative logical pixels between stages
and defaults to zero; gaps exceeding the available extent are errors.

With `encoding: "width"` (default), the widest top spans the viewport. Each
bottom matches the next top; `lastStage: "flat"` keeps the final width and
`"point"` ends at zero. With `encoding: "area"`, each bottom is its own top
multiplied by `taperRatio` (default `0.8`, from zero to one). This makes areas
proportional to values. Width mode rejects `taperRatio`; area mode rejects
`lastStage`. An empty dataset produces no stages. All-zero values preserve
stage identities with zero width.

`stages` accepts `fill`, `stroke`, `strokeWidth`, `opacity`, `outline` and
`shadow`. Defaults are `"#2563eb"`, `"none"`, `0` and `1`. Fills accept
[solid, gradient and pattern paints](appearance/mark-style.md). Effects share
the existing preparation and `false` reset rules. `clip` defaults to true.

`labels` accepts `false` or `{ content?, format?, fill?, fontFamily?, fontSize?,
fontWeight?, outline?, shadow? }`. Content is `"stage"` by default, `"value"`,
or `"percent"`. Defaults are `format: "auto"`, fill `"#0f172a"`, family
`"sans-serif"`, size `12`, and weight `"normal"`. Number formatting uses the
shared Text formatter, for example `".1%"` for percentages. Empty auto-formatted
strings produce no label.

Labels wrap within a rectangle inset by 4 pixels inside each stage, using words
and then grapheme clusters for long words. Lines are spaced at 1.2 times the font
size. If that rectangle is too small, vertical stages use the empty lane to their
right; horizontal stages use the lane below. Labels remain inside the plot and
within their own stage interval. If neither location fits, the action fails before
changing the chart. Increase the Canvas size, reduce `labels.fontSize`, or use
`labels: false`. Stage values and geometry are never changed to fit text.
A prepared font profile must include the wrapping measurements; prepare metrics
again before edits that introduce new text or font sizes.

Percent labels require an explicit `percentBase`: `"first"`, `"total"` or
`"previous"`. A zero denominator produces no percent label; the first stage
also has none for `"previous"`. Ratios are never silently assigned a denominator.

`color` is a field string or `{ field, fieldType?, scale?, palette? }`. The
default field type is nominal; ordinal, quantitative and temporal are supported.
Scale options follow [color encodings](series/color.md). The default scale ID
is `<mark>-color`. Mapping takes precedence over the fixed stage fill.
Add a legend explicitly with `createLegend({ target: "pyramid" })`.

## `editPyramidPlot`

**Chart authoring.**

```typescript
editPyramidPlot(options: TargetedOptions<EditPyramidPlotOptions>): ChartProgram;
```

Use the creation options with `target` instead of `id`. Omitted options retain
their values. An empty patch, unknown option, explicit `null` or `undefined` is an error.
Changing encoding mode removes the previous mode's specific width policy.
After `labels: false`, `labels: {}` restores stage labels with their defaults.
`color: false` removes the mapping and its legend, exposing the fixed stage fill.

Each stage is one selectable item containing its body and optional label.
Selection, highlighting and hit inspection use the same row identity. Canvas
resize, source revision, color-scale changes, fonts and themes rematerialize the
stages. Reordering keyed source rows changes their order while preserving identity.
Edits validate the complete candidate before writing semantic or graphic children.

Use named concat children and scoped targets for nested editing, or `facet` to
partition the source dataset. Saved editable programs retain these operations;
graphic snapshots render offline. This stage layout has no Cartesian x/y axes.
See the [ordered-stage tutorial](../tutorials/pyramid.md) for the executable example.
