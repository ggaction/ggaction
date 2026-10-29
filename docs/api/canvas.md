---
layout: default
title: Canvas
---

# Canvas

{% include chart-example.html id="scatterplot" lead=true %}

## At a glance

| Action | Shortest call | Inference/defaults | Result |
| --- | --- | --- | --- |
| `createCanvas` | `createCanvas()` | Default size, background, and margin | Concrete Canvas and plot bounds |
| `editCanvas` | `editCanvas({ width: 800 })` | Unspecified properties remain unchanged | Updated Canvas and affected consumers |
| `fitCanvas` | `fitCanvas()` | Current Full-unit layout | Fit margins or reclaim outer reservations |

## `createCanvas(options?)`

Creates the program's single canvas and establishes bounds for later position
encodings.

| Option | Type | Default |
| --- | --- | --- |
| `width` | positive finite number | `640` |
| `height` | positive finite number | `400` |
| `plot` | `{ width, height }` or `false` | Fixed outer dimensions |
| `plotBorder` | `false` or `{ color?, lineWidth?, underlay? }` | `false` |
| `background` | non-empty string | `"white"` |
| `margin` | non-negative number or side object | `{ top: 30, right: 30, bottom: 60, left: 70 }` |

<!-- snippet-context:start -->

> **Contextual fragment.** Use an ES module with the imports, data, and prepared resource state described in this section. Resolve these names from setup in this fragment or section; alternatives branch from the same base.

<!-- snippet-context:end -->

```javascript
const program = chart().createCanvas({
  width: 640,
  height: 400,
  background: "white",
  margin: { top: 30, right: 30, bottom: 60, left: 70 }
});
```

### Exact inner dimensions

Use `createCanvas({ plot: { width: 30, height: 30 } })` to fix the data region
while guide authoring measures and expands the outer Canvas. Both Full and Basic
support this mode. Numeric margins provide initial space; insufficient sides grow
on a quarter-pixel grid. Rotated axis labels use their measured outer edge and
remain outside the plot. Chart titles are placed beyond the existing guides.

Do not combine `plot` with outer `width` or `height`. On Full, use
`editCanvas({ plot: { width: 60, height: 45 } })` to resize the data region, or
`editCanvas({ plot: false })` to return to fixed outer dimensions. Font-metric
updates rerun the same measured layout. Explicit scale ranges retain their usual
fixed-coordinate behavior. Automatic margins do not resolve overlapping labels
or other incompatible guide geometry; those errors still reject the action.

**Plot outline.**

Set `plotBorder: {}` to draw an outline around the data region in Full or Basic.
The default style is `color: "#ddd"` and `lineWidth: 1`. The stroke sits entirely
inside the plot: its outer painted edge matches the plot bounds. It draws above
ordinary marks and below axes by default. Set `underlay: true` to paint it before
ordinary marks, without changing mark positions, scale ranges,
plot size, margins, or clipping.

<!-- snippet-context:start -->

> **Contextual fragment.** Use an ES module with the imports, data, and prepared resource state described in this section. Resolve these names from setup in this fragment or section; alternatives branch from the same base.

<!-- snippet-context:end -->

```javascript
const bordered = chart().createCanvas({ plotBorder: {} });
const recolored = bordered.editCanvas({ plotBorder: { color: "#888" } });
const unbordered = recolored.editCanvas({ plotBorder: false });
```

On Full, omitting `plotBorder` from `editCanvas` preserves its setting. An object
replaces the complete border style: omitted `color` or `lineWidth` returns to its
default, rather than keeping an earlier value. Omitting `underlay` from a new
border object also restores the default overlay; include `underlay: true` to retain
that choice. See [compositing marks over guides](./axes/complete.md#composite-marks-over-guides).
`false` removes the outline.
Colors must be non-empty strings. Line width must be positive and finite, and
strictly smaller than both resolved plot dimensions. Resizing, scale or data
edits, and facet replay preserve the border setting and update its bounds.

## `editCanvas(options)`

Resizing preserves the single-Y rule for each Cartesian plot region. A change
that makes independent frames overlap is rejected. Separate facet or concat
panels, plot-space annotations and normalized Rug/Strip anchors retain their
existing resize behavior.

Updates one or more existing canvas options. Omitted values are preserved. A
numeric margin applies to every side; a partial object updates only named sides.
The `plotBorder` object replaces its complete style as described above.

<!-- snippet-context:start -->

> **Contextual fragment.** Use an ES module with the imports, data, and prepared resource state described in this section. Caller-provided receivers: `program`. Resolve these names from setup in this fragment or section; alternatives branch from the same base.

<!-- snippet-context:end -->

```javascript
const resized = program.editCanvas({
  width: 800,
  margin: { left: 80 }
});
```

Width, height, or margin changes explicitly rematerialize connected automatic
position scales, line marks, axes, legends, and chart titles. Background-only
edits do not.

Margin is immutable materialization configuration used with the concrete Canvas
dimensions to derive plot bounds. It is neither a drawable node in
`graphicSpec` nor transient authoring context.

## `fitCanvas(options?)`

After marks, guides, and titles exist, a Full chart can shrink its margins while
keeping a fixed Canvas size unchanged. With exact-inner `plot` sizing, it instead
keeps the plot dimensions unchanged and reclaims unused automatic guide margins.
With the default `align: "preserve"`, authored margins remain per-edge minimums.
Use `align: "center"` in this mode to redistribute that outer-space budget around
the visible chart and guides. Required ink clearance is preserved, while the
spare space is divided equally between opposite edges:

<!-- snippet-context:start -->

> **Contextual fragment.** Use an ES module with the imports, data, and prepared resource state described in this section. Caller-provided receivers: `program`. Resolve these names from setup in this fragment or section; alternatives branch from the same base.

<!-- snippet-context:end -->

```javascript
const fitted = program.fitCanvas({
  padding: 4,
  minPlotWidth: 160,
  minPlotHeight: 120
});
```

The action searches top, right, bottom, then left on a deterministic 0.25-pixel
grid. Every probe uses the same rematerialization and collision checks as
`editCanvas`. It preserves semantic state, scale domains, explicit scale ranges,
Canvas width, and Canvas height. Automatic ranges follow the fitted plot bounds.

| Option | Type | Default |
| --- | --- | --- |
| `padding` | non-negative finite number | `0` |
| `minPlotWidth` | positive finite number | `160` |
| `minPlotHeight` | positive finite number | `120` |
| `iterationLimit` | integer from 1 through 64 | `32` |
| `overflow` | `"error"` or `"report"` | `"error"` |
| `align` | `"preserve"` or `"center"` (exact-inner only) | `"preserve"` |

The default policy rejects an unsatisfied fit without changing the source
program. `overflow: "report"` applies the last valid margins and stores the
normalized policy, status, issues, fitted plot size, probe count, and layout
signature under `materializationConfigs.fitting`. Calling `fitCanvas` again with
the same layout and policy converges exactly. It runs only when explicitly
called; later edits are fitted by another explicit call.

## Errors and limitations

Only one Canvas can exist in a program. Dimensions must remain positive and
margins must leave positive plot bounds. `fitCanvas` is a Full unit action;
Basic does not expose it and compositions reject it.
An enabled plot border must fit strictly inside both plot dimensions, including
after Canvas edits. `plotBorder: true` and unknown border style keys are rejected.

## Keep the outer Canvas fixed

Set `responsive: {}` on `createCanvas` to reserve space for guides inside the
chosen width and height. Authored margins remain unchanged; the available plot
can become smaller. `minPlotSize` defaults to `{ width: 160, height: 120 }` and
accepts a complete pair of positive finite dimensions. This mode is available
in Full and Basic and cannot be combined with exact inner `plot` dimensions.

Full `editCanvas` preserves the policy when omitted. `responsive: false` removes
it and returns to native margin layout. Background-only edits preserve the
settled layout. Resizing, scale or source changes, and text measurement updates
recompute the affected geometry. Exact font profiles must contain the required
queries; missing measurements are preparation errors, never estimated widths.

A solve uses at most four measured passes and requires every plot, occupied and
guide boundary to change by at most 0.1 logical pixel. Insufficient space,
oscillation or failure to converge rejects the action without changing the
original program. It never enlarges the Canvas or reduces the font size.
`inspectProgram(program).layouts` reports the settled plot and chosen label
fallbacks. Enable [responsive Cartesian labels](axes/complete.md#responsive-labels)
separately to allow wrapping, skipping and rotation.

See the [fixed Canvas tutorial](../tutorials/responsive-guides.md) for a complete
program and an immutable resize.

## Related

[Rendering](./rendering.md) · [Coordinates](./coordinates.md) ·
[Scale options](./scales.md)
