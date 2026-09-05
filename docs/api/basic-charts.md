---
layout: default
title: Basic Charts
---

# Basic Charts

{% include chart-example.html id="scatterplot" %}

Basic chart actions create a complete mark, its encodings, and applicable
guides in one traceable call. Create a Canvas and dataset first, then provide
only the fields that define the chart.

```javascript
const program = chart()
  .createCanvas()
  .createData({ values })
  .createScatterPlot({ x: "horsepower", y: "mpg", color: "origin" });
```

These actions are conveniences over the regular mark, encoding, and guide
actions. They call those wrapped actions as trace children; they do not add a
second chart specification or compile semantics during rendering.

## Choose a facade

| Facade | Shortest complete decision | Guides when omitted |
| --- | --- | --- |
| `createScatterPlot` | `{ x, y }` | applicable guides |
| `createLinePlot` | `{ x, y }` | applicable guides |
| `createBarPlot` | `{ x, y }` | applicable guides |
| `createHistogram` | `{ field }` | applicable guides |
| `createHeatmap` | `{ x, y, color }`, or `{ x, y, bin: {} }` | applicable guides |

These five facades create a complete common Cartesian chart from fields. After
creation, editing returns to the action that owns the decision; for example,
use `encodeY`, `editScale`, `editBarMark`, or `editLegend` rather than a generic
facade editor.

## Shared behavior

- `data` is optional when there is a current dataset or exactly one dataset.
  Pass it explicitly when more than one dataset could apply.
- `id` is optional for the first chart of each family. A stable default role is
  used; a conflicting role requires an explicit ID.
- A field may be a string or an encoding option object. Use the object form for
  field types, scales, aggregates, and other channel-specific options.
- `guides` is optional. Omission or `{}` reuses compatible guides and creates
  missing components for this facade's layer. Axes and grids must use the same
  coordinate and scale IDs; legends must also match channels, domain order, and
  symbol recipe. Existing titles and styles are retained. Conflicting explicit
  guide styles require the owning editor or a disabled guide branch.
- `guides: false` and nested `false` skip this call's requests; they do not delete
  existing guides. Direct `createGuides` and guide creation actions remain strict.
- A facade validates its complete option object before changing the program.
- To revise the result, use the resource action that owns the decision, such as
  `encodeX`, `editScale`, `editPointMark`, or `editLegend`. Aggregate
  `editScatterPlot`-style actions are intentionally not provided.

Canvas and source data remain separate authoring decisions. Basic chart
actions never create either one or silently choose among ambiguous resources.

## `createScatterPlot`

```typescript
createScatterPlot(options: CreateScatterPlotOptions): ChartProgram
```

Required options are `x` and `y`. Optional `color`, `size`, and `shape` values
create field encodings; `point` controls constant point appearance.

```javascript
const scatter = chart()
  .createCanvas()
  .createData({ values: cars })
  .createScatterPlot({
    x: "Horsepower",
    y: "Miles_per_Gallon",
    color: "Origin",
    point: { opacity: 0.7 },
    guides: {
      axes: {
        x: { title: { text: "Horsepower" } },
        y: { title: { text: "Miles per gallon" } }
      }
    }
  });
```

The stable default mark ID is `scatterPlot`. Omitted size materializes the
default point radius of `3`. Constant fill, shape, opacity, stroke, and stroke
width belong in `point`; field-driven color, size, and shape remain top-level.

## `createLinePlot`

```typescript
createLinePlot(options: CreateLinePlotOptions): ChartProgram
```

Required options are `x` and `y`. `groupBy` accepts a field name or a non-empty
unique tuple such as `["country", "scenario"]`. Explicit groups define identity;
`color` and `strokeDash` can use other fields with one value per series. Without
`groupBy`, color/dash retain their shared-field grouping. Use `line` for constant
appearance. See [independent series identity](./series-encodings.md).

```javascript
const line = chart()
  .createCanvas({ margin: { right: 140 } })
  .createData({ values: rows })
  .createLinePlot({
    x: { field: "date", fieldType: "temporal" },
    y: { field: "value", aggregate: "mean" },
    color: "group",
    strokeDash: { field: "group" },
    line: { curve: "monotone", strokeWidth: 3 }
  });
```

The stable default mark ID is `linePlot`. A plain `strokeDash` string is not
accepted because it could mean either a field or a named dash style; use
`{ field }` or `{ value }`. This facade creates Cartesian lines. Use the
explicit Polar mark and encoding actions for closed Polar paths. A field
materialized by `createWindowData` can be used directly as the quantitative y
position without applying another aggregate.

## `createBarPlot`

```typescript
createBarPlot(options: CreateBarPlotOptions): ChartProgram
```

Required options are `x` and `y`. Position option objects select vertical,
horizontal, aggregate, or ranged geometry. `color.layout` owns grouped,
stacked, normalized-fill, overlay, and diverging arrangements.

Field strings use data-driven shorthand: finite numeric fields infer
quantitative positions and other supported scalar fields infer nominal
positions. Use an option object with `fieldType` when a numeric field is an
ordinal category or when a field is temporal.

Both `{ x: "product", y: "units_sold" }` and the horizontal
`{ x: "units_sold", y: "product" }` infer the measure's mean per category.
Set `aggregate` explicitly for another statistic. Temporal categories work
on either axis and accept temporal scale options.

```javascript
const bars = chart()
  .createCanvas()
  .createData({ values: rows })
  .createBarPlot({ x: "product", y: "units_sold" });
```

```javascript
const bars = chart()
  .createCanvas({ margin: { right: 140 } })
  .createData({ values: rows })
  .createBarPlot({
    x: { field: "year", fieldType: "ordinal" },
    y: { field: "value", aggregate: "mean" },
    color: { field: "group", layout: "group" },
    width: { band: 0.72 }
  });
```

The stable default mark ID is `barPlot`. `width` accepts the same band or
logical-pixel options as `encodeBarWidth`; `bar` controls constant fill,
opacity, stroke, and stroke width.

## `createHistogram`

```typescript
createHistogram(options: CreateHistogramOptions): ChartProgram
```

`field` is required. The action atomically creates binned x and count y
encodings because those meanings depend on each other.

```javascript
const histogram = chart()
  .createCanvas({ margin: { right: 140 } })
  .createData({ values })
  .createHistogram({
    field: "value",
    maxBins: 10,
    color: { field: "group", layout: "stack" }
  });
```

The stable default mark ID is `histogram`. The default is `maxBins: 10`.
Choose exactly one of `maxBins`, `binStep`, or `binBoundaries`. Optional
`xScale`, `yScale`, `stack`, `color`, and `bar` values use the corresponding
histogram, color, and bar contracts.

## `createHeatmap`

```typescript
createHeatmap(options: CreateHeatmapOptions): ChartProgram
```

`createHeatmap` supports two explicit modes. Without `bin`, `x`, `y`, and
`color` describe pre-gridded rows and the action creates one cell for each valid
observed row. With `bin`, raw quantitative `x` and `y` fields are divided into a
rectangular grid and cell color represents the generated count.

```javascript
const heatmap = chart()
  .createCanvas({ margin: { right: 120 } })
  .createData({ values: cells })
  .createHeatmap({
    x: { field: "year", fieldType: "ordinal" },
    y: { field: "country", fieldType: "nominal" },
    color: {
      field: "life_expectancy",
      fieldType: "quantitative",
      scale: { type: "sequential", palette: "viridis" }
    },
    rect: { stroke: "white", strokeWidth: 1 }
  });
```

```javascript
const binnedHeatmap = chart()
  .createCanvas({
    width: 700,
    height: 500,
    margin: { top: 70, right: 140, bottom: 75, left: 85 }
  })
  .createData({ values: cars })
  .createHeatmap({
    x: "Weight_in_lbs",
    y: "Miles_per_Gallon",
    bin: {
      bins: { x: 10, y: 8 },
      extent: { x: [1500, 5200], y: [8, 48] }
    },
    color: { scale: { palette: "blues" } },
    rect: { stroke: "white", strokeWidth: 1 }
  });
```

The binned mode uses `10 × 10` bins by default. Its `includeEmpty` default is
`true`, so the complete rectangular grid is visible; set it to `false` to emit
only occupied cells. An omitted per-axis extent is inferred from finite x/y
values. Explicit extents must contain every eligible value. Position scale
domains default to the resolved bin extents, while an explicit position scale
option takes precedence. `color` is optional in binned mode and may configure
the generated quantitative count scale, but cannot supply another field.

The stable default mark ID is `heatmap`. Binned mode owns a namespaced derived
dataset and records `createBin2DData` as a wrapped child action. Default guide
titles use the original x/y field names and `Count`, never generated field
names. Automatic chart grid lines are disabled because the ranged cells already
form a grid; pass an explicit `guides.grid` option to enable them.

In both modes, the color encoding is the sole cell fill owner, so `rect.fill`
is rejected; `rect` accepts opacity and outline options. Text is not automatic.
Add it afterward with
`createTextMark().encodeText()` when the rows contain display values.

For direct control over the derived rows, use
[`createBin2DData`](./data/bin2d.md) before authoring the ranged rect layer.

## Other complete chart facades

- [Parallel coordinates](./parallel-coordinates.md) creates row-wise paths
  across independently scaled dimensions.
- [Box plots](./box-plots.md), [gradient plots](./gradient-plots.md), and
  [violin plots](./violin-plots.md) summarize category distributions.
- [Regression](./regression.md), [error bars](./error-bars.md), and
  [error bands](./error-bands.md) add statistical or interval layers.

## Advanced authoring

Use individual [mark](./marks.md), [encoding](./encodings.md),
[coordinate](./coordinates.md), and [guide](./guides.md) actions when the chart
needs custom layering, Polar geometry, a partially constructed state, or
control between the wrapped steps. Both authoring styles produce the same
immutable semantic and graphical resources.
