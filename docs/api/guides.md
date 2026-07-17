---
layout: default
title: Guides
---

# Guides

{% include chart-example.html id="histogram" %}

## At a glance

| Action | Shortest call | Inference/defaults | Result |
| --- | --- | --- | --- |
| `createGuides` | `createGuides()` | Applicable axes, horizontal grid, and legends | Wrapped guide child actions in deterministic order |

<div class="docs-concept-flow" role="img" aria-label="createGuides infers applicable axes, grid, and legend actions from the current encodings">
  <span><code>position encodings</code><strong>Axes</strong></span>
  <span><code>position scales</code><strong>Grid</strong></span>
  <span><code>appearance encodings</code><strong>Legend</strong></span>
  <b aria-hidden="true">→</b>
  <span><code>createGuides()</code><strong>Deterministic composition</strong></span>
</div>

## `createGuides(options?)`

Creates the applicable axes, Cartesian or Polar grid, and categorical legend supported
by the current semantic encodings.

```javascript
program.createGuides();
```

Pass child options to customize each guide:

```javascript
program.createGuides({
  axes: {
    y: { ticksAndLabels: { count: 6 } }
  },
  grid: {
    horizontal: { color: "#e2e8f0" }
  },
  legend: {
    title: "Origin"
  }
});
```

| Option | Type | Default |
| --- | --- | --- |
| `axes` | `createAxes` options or `false` | automatic |
| `grid` | `createGrid` options or `false` | automatic horizontal grid |
| `legend` | `createLegend` options or `false` | automatic |

`false` explicitly skips that guide:

```javascript
program.createGuides({ legend: false });
```

Axes are selected from x/y or theta/radius encodings. A horizontal grid is selected
when a y encoding exists; vertical grid remains off unless requested. Polar grids
are selected only for the encoded Polar channels: theta creates spokes and radius
creates concentric circles. A legend is selected for line color/stroke-dash, bar
color, area or arc color, compatible point
color+shape encodings, or a standalone quantitative point-size encoding. Size
adds a second quantitative block when a point-series legend also exists.

Density areas can request both grids and forward the complete top-legend
layout through the aggregate:

```javascript
densityArea.createGuides({
  grid: { horizontal: {}, vertical: {} },
  legend: {
    position: "top",
    direction: "vertical",
    columns: 3,
    titlePosition: "left",
    offset: 8
  }
});
```

Axis titles use density provenance rather than generated output names. A
vertical density therefore infers the original field on x and `Density` on y;
horizontal density reverses those titles.

Layered regression scatterplots still create only one shared x axis, y axis,
and horizontal grid. Their point color/shape and matching regression line share
one composite Origin legend, followed by the five-symbol size legend.

For grouped bars, the shortest call creates an ordinal x axis at band centers,
a quantitative y axis, a horizontal grid, and a right-side color legend:

```javascript
groupedBars.createGuides();
```

The same child options remain available. For example, this changes the ordinal
labels while retaining inference for every other guide:

```javascript
groupedBars.createGuides({
  axes: {
    x: { ticksAndLabels: { labels: { fontSize: 11 } } }
  }
});
```

`createGuides` only selects and calls existing wrapped actions. Coordinate,
scale, target, field, and domain validation remains the responsibility of
`createAxes`, `createGrid`, and `createLegend`, so ambiguous charts still
require their explicit child options. If nothing is selected, the action
reports an error.

For a Polar-only chart, omission selects the axis and grid family for each stored
Polar position encoding. A theta-only donut therefore creates a theta axis and
spokes without inventing a radial guide; its arc color encoding can still infer
the categorical legend. A theta/radius chart selects both families. Grid geometry
is inserted behind marks while axes remain above marks, independent of the call
occurring after mark creation.

The trace preserves the composition:

```text
createGuides
├─ createAxes?
├─ createGrid?
└─ createLegend?
```

Chart titles are not guides. Create them separately with
[`createTitle`](./titles.md). A title and guide reserved on the same edge must
both fit without overlap; neither action silently expands the Canvas margin.

Call [`createGrid`](./grids.md), [`createAxes`](./axes.md), or
[`createLegend`](./legends.md) directly when only one focused guide action is
desired.

## Errors and limitations

An explicit child object selects that guide, `false` disables it, and omission
requests automatic applicability. The action fails when no supported guide can
be selected.

## Related

[Axes](./axes.md) · [Grids](./grids.md) · [Legends](./legends.md) ·
[Titles](./titles.md)
