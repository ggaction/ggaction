---
layout: default
title: Program Composition
---

# Program Composition

{% include chart-example.html id="composition" %}

Combine already-authored chart programs without merging their datasets, marks,
scales, or guides. The result is another immutable `ChartProgram` whose parent
Canvas contains concrete snapshots of its named children.

## Arrange complete programs

```javascript
import { hconcat, vconcat } from "ggaction";

const row = hconcat({
  id: "overview",
  programs: [
    { id: "main", program: scatterplot },
    { id: "detail", program: barChart }
  ],
  gap: 20,
  align: "center",
  padding: 16
});

const dashboard = vconcat({
  programs: [row, trendChart],
  gap: 18
});
```

This is a composition fragment: `scatterplot`, `barChart`, and `trendChart`
must each be a complete program with one materialized Canvas. See the
[runnable repository example](https://github.com/ggaction/ggaction/tree/main/examples/program-composition)
for complete child construction and Browser Canvas rendering.

The representative output deliberately keeps two different final grammars:
the `main` slot contains a titled point chart on a blue panel, while the
`detail` slot contains the titled orange bar chart installed by
`replaceCompositionChild`. Distinct child backgrounds and the visible parent
gap make the retained slot, replacement slot, and parent layout observable in
the full image and its gallery thumbnail.

Both functions initially require at least two programs. A direct `ChartProgram` receives
the deterministic slot name `view-1`, `view-2`, and so on. Use
`{ id, program }` when later code must replace a stable slot.

| Option | Default | Effect |
| --- | --- | --- |
| `id` | `"composition"` | Names the composition for deterministic graphic namespaces |
| `programs` | required | Ordered complete child programs or `{ id?, program }` entries |
| `gap` | `16` | Non-negative distance between adjacent children |
| `align` | `"center"` | `"start"`, `"center"`, or `"end"` cross-axis placement |
| `padding` | `0` on every side | Non-negative scalar or partial four-side object |

## Automatic and explicit child sizes

The parent Canvas size is inferred from child dimensions, gap, and padding.
For `hconcat`, children whose height was omitted in `createCanvas` expand to the
largest child height. For `vconcat`, children whose width was omitted expand to
the largest child width. A unit child rematerializes against that resolved size.
A nested composition keeps its intrinsic child layout and `align` places its
complete snapshot inside the larger cross-axis slot; the outer composition does
not stretch inner facet cells, gaps, or guide geometry. An explicitly authored
child width or height is never overwritten.

The parent background is white. Child Canvas backgrounds are preserved, and
nested compositions keep independent clipping and coordinate scopes.

## Compose Cartesian, Polar, and Parallel charts

A complete Cartesian, Polar, or Parallel chart can be a direct or nested concat child.
The composition does not reinterpret theta, radius, x, y, scales, guides, or
selections. It snapshots each finished child into one namespaced concrete
graphic tree, so Canvas, SVG, PNG, and PDF renderers use the same result.

When a nested child changes, replace it in each ancestor explicitly:

```javascript
const revisedPolarRow = polarRow.replaceCompositionChild({
  target: "detail",
  program: revisedPolarChart
});

const revisedDashboard = dashboard.replaceCompositionChild({
  target: "polarRow",
  program: revisedPolarRow
});
```

This preserves immutable earlier programs and makes the affected ancestor
layout visible in the action trace. See the
[cross-feature dashboard source](https://github.com/ggaction/ggaction/tree/main/examples/cross-feature-dashboard)
for a nested Polar replacement next to a Cartesian facet.

## Repeat the current chart by a field

{% include chart-example.html id="facet" %}

Call `facet` on one complete unit chart to repeat it for each observed field
value:

```javascript
import { chart } from "ggaction";

const faceted = chart()
  .createCanvas({ width: 250, height: 230 })
  .createData({ values: cars })
  .createPointMark()
  .encodeX({ field: "Horsepower" })
  .encodeY({ field: "Miles_per_Gallon" })
  .encodePointRadius({ value: 2.5 })
  .encodeColor({ field: "Cylinders", fieldType: "ordinal" })
  .facet({
    field: "Origin",
    columns: 3,
    guides: { legend: "shared" }
  })
  .createTitle({ text: "Horsepower and Fuel Economy" });
```

The input rows in this runnable fragment must contain complete values for the
encoded fields. See the
[repository example](https://github.com/ggaction/ggaction/tree/main/examples/cars-origin-scatterplot-facet)
for the complete data preparation and guide options.

`facet` uses field values in source first-appearance order. It infers one
common row-preserving dataset ancestor, then filters and replays supported
derived data independently inside each cell. Omitted `columns` creates one row;
a positive value wraps cells row-major. A facet contains at most 100 children,
and source-row count multiplied by child count must not exceed the shared
10,000,000-unit work budget.

| Option | Default | Effect |
| --- | --- | --- |
| `id` | `"facet"` | Names the parent and deterministic child namespaces |
| `field` | required | Direct-source field whose values define cells |
| `data` | unique common ancestor | Selects the row-preserving partition dataset explicitly |
| `values` | source first-appearance order | Selects and orders a non-empty set of observed scalar values |
| `columns` | number of values | Sets the grid column count |
| `gap` | `16` | Sets horizontal and vertical cell spacing |
| `align` | `"center"` | Aligns unequal cells inside grid tracks |
| `padding` | `0` on every side | Adds scalar or four-side parent padding |
| `scales` | every channel `"shared"` | Sets `"shared"` or `"independent"` per `x`, `y`, `xOffset`, `yOffset`, `color`, `size`, `shape`, `opacity`, or `strokeDash` |
| `guides.axes` | `"each"` | `"outer"` keeps x axes on the bottommost occupied cell in each column and y axes on the leftmost occupied cell in each row |
| `guides.legend` | `false` | `"shared"` promotes one compatible parent-owned categorical, gradient, discretized-color, size, or opacity legend |

Author the legend position on the unit chart before calling `facet`. Promotion
preserves an explicit `left`, `right`, `top`, or `bottom` edge and the
horizontal `align` used by top and bottom legends; there is no separate facet
legend-position option:

```javascript
const source = chart()
  .createCanvas({
    width: 420,
    height: 300,
    margin: { top: 40, right: 40, bottom: 90, left: 60 }
  })
  .createData({ values: cars })
  .createPointMark()
  .encodeX({ field: "Horsepower" })
  .encodeY({ field: "Miles_per_Gallon" })
  .encodeColor({ field: "Cylinders", fieldType: "ordinal" })
  .createLegend({
    channels: ["color"],
    position: "bottom",
    direction: "horizontal",
    align: "center"
  });

const facetedWithBottomLegend = source.facet({
  field: "Origin",
  columns: 1,
  guides: { legend: "shared" }
});
```

For a promoted top or bottom legend, the parent reserves a horizontal lane and
keeps the child-grid width unchanged. Left and right legends reserve a vertical
lane instead. If the source has no concrete legend and `facet` infers the
legacy categorical shared legend, the default remains `right`. Subsequent
`editCompositionLayout` calls preserve the promoted edge and alignment.

Shared auto domains use the full faceted result; independent auto domains are
resolved from each cell. An explicit semantic domain always wins. Regression,
density, interval/error-band, and box-summary/outlier datasets are replayed
after the cell filter, so each panel receives a fresh statistical result rather
than a clipped copy of the full-chart result.

The current Cartesian slice supports point, line, area, histogram, aggregate
bar, ranged bar, rule, regression, density, interval/error-band, and box-plot
layers when they share one valid row-preserving partition ancestor. A shared
legend is accepted only when every represented child scale and legend recipe is
concretely compatible; scale resolution alone does not make a guide shareable.
Polar and Parallel sources cannot currently be faceted. Calling `facet` on a
Polar source throws before creating partial children because theta/radius
facet scale and guide resolution are not implemented. A Parallel source is
rejected because a dimension-axis list needs a different facet resolver. Both
families remain supported as concat children.

Create a chart title after `facet` so the title is owned directly by the
parent. A title that already fits the unit Canvas is promoted for authoring
order compatibility rather than repeated in every cell.

The parent title aligns to the union of the child plot bounds, excluding cell
margins and the shared legend. Each repeated header is likewise centered on
its own child plot—not on the complete child Canvas—so asymmetric axis space
does not visually offset panel titles.

Edit the repeated header style without addressing generated graphic IDs:

```javascript
const emphasized = faceted.editFacetHeaders({
  fontSize: 13,
  fontWeight: 700,
  color: "#0f172a",
  offset: 10
});
```

Facet-header weights follow the shared
[Canvas font-weight policy](./marks/text.md#font-weights).

## Build a row and column facet grid

{% include chart-example.html id="facet-grid" %}

Use `facetGrid` when two source fields define the comparison:

```javascript
const matrix = unit.facetGrid({
  id: "matrix",
  rows: { field: "region", values: ["North", "South"] },
  columns: { field: "period", values: ["Q1", "Q2", "Q3"] },
  combinations: "full",
  gap: 12
});
```

Omitted row or column `values` use source first-appearance order. `"observed"`
creates children only for pairs present in the source while retaining each
pair's actual grid coordinates. `"full"` creates the Cartesian
product. A missing pair remains a named, mark-free Canvas with a header, so
neighboring cells never shift into its position. Shared domains are inferred
from populated cells; an empty cell has no inferred local scale or guide.

The child limit is 100 after applying the combination policy. The same
10,000,000-unit partition-work limit used by `facet` applies. `facetGrid`
supports the same Cartesian chart families, scale policies, axis policies, and
compatible shared legends as `facet`. Polar and Parallel sources fail before
state changes with coordinate-specific resolver errors.

See the [runnable grid example](https://github.com/ggaction/ggaction/tree/main/examples/facet-grid)
for a 2 × 3 full grid with one missing source pair.

## Repeat a positional encoding across fields

{% include chart-example.html id="repeat-charts" %}

`repeatCharts` compares several fields without copying the complete unit recipe:

```javascript
const metrics = unit.repeatCharts({
  id: "metrics",
  target: "product",
  channel: "x",
  fields: ["speed", "quality", "cost"],
  columns: 3,
  guides: { legend: "shared" }
});
```

The action currently accepts `x` or `y` on one direct Cartesian mark. `target`
may be omitted only when exactly one mark is eligible. Child IDs and headers
follow the ordered field list. The repeated channel defaults to independent
domains; requesting it as shared produces the union domain. Other used
channels default to shared, and one compatible non-repeated legend may be
promoted to the parent.

Every repeated field can describe a different quantity, so outer-axis
promotion is rejected. Composite roles, derived dependencies, Polar roles,
and Parallel dimension lists also fail atomically with a reason specific to
the missing model. See the [runnable repeat example](https://github.com/ggaction/ggaction/tree/main/examples/repeat-charts).

## Edit the layout

```javascript
const revised = row.editCompositionLayout({
  columns: 2,
  gap: 28,
  align: "start",
  padding: { left: 12, right: 12 }
});
```

At least one option is required. Omitted values retain their current settings;
a partial padding object updates only the named sides. The action preserves all
child IDs and references and rebuilds the parent snapshot.

Facet parents use this same action for `gap`, `align`, and `padding`; derived
cell programs and facet value order remain unchanged. One-field facets and
field repeats also accept `columns`. A row-column grid keeps its declared
column-domain width, and concat compositions reject `columns`. Parent-title and
header anchors are recomputed from the newly translated child plot bounds.

## Edit facet scale and guide policies

```javascript
const independent = faceted.editFacetScales({
  x: "independent"
});

const outer = independent.editFacetGuides({
  axes: "outer",
  legend: "shared"
});
```

Both actions preserve the facet field, source data, first-appearance value
order, child IDs, layout, headers, and title. Omitted policies retain their
current values. Scale edits require an effective change on a channel used by
the repeated chart.

Policy edits immutably rederive every cell from the retained pre-facet program.
This reruns supported statistical descendants, histogram binning, scale
resolution, marks, guides, selections, and highlights instead of modifying a
filtered child in place. A shared legend is promoted only when every child has
a concretely compatible scale and guide recipe; otherwise the entire edit is
rejected and the earlier facet remains unchanged.

`facetGrid` and `repeatCharts` use these same editing actions. Empty full-grid
cells stay blank during scale and guide edits. A repeated positional channel
still rejects `axes: "outer"`.

## Replace the repeated source recipe

```javascript
const revised = matrix.editFacetSource({ program: revisedUnit });
```

`editFacetSource` reapplies the stored facet, grid, or repeat recipe to a new
complete unit program. It preserves layout, scale and guide policies, header
style, parent title, and stable child IDs. The revised unit must still contain
the stored partition dataset and fields or repeated target role, and every
stored ordered value must remain observed. To change a partition dataset ID,
facet domain, or repeat field list, create a new composition from the revised
unit with the desired recipe.

The call is atomic: an invalid new unit changes neither the existing parent nor
the caller-owned program.

## Replace one stable slot

```javascript
const replaced = revised.replaceCompositionChild({
  target: "detail",
  program: donutChart
});
```

The replacement must be a complete unit or nested composition program. Its new
size participates in layout inference, while the target ID and position in the
ordered child list remain stable. Earlier parent and child programs are not
mutated.

Facet cells are derived from one canonical source and cannot be replaced with
`replaceCompositionChild`.

## Insert, remove, and reorder named concat children

```javascript
const expanded = row.insertCompositionChild({
  id: "forecast",
  program: forecastChart,
  after: "detail"
});

const reordered = expanded.reorderCompositionChildren({
  order: ["forecast", "main", "detail"]
});

const compact = reordered.removeCompositionChild({ target: "detail" });
```

Insertion accepts either `before` or `after`; with neither it appends. IDs and
anchors must be known and unique. Reordering requires every current child ID
exactly once. Removal may leave a valid one-child concat, but cannot remove the
last child. Each successful edit preserves retained child references and
rematerializes geometry from the new order. Failed edits leave the earlier
composition untouched.

These structural actions and `replaceCompositionChild` apply only to concat
parents. Facet-derived children remain governed by their canonical recipe and
the facet-specific edit actions.

## State, trace, and action scope

`children` maps stable slot IDs to retained immutable programs.
`compositionSpec` stores concat direction or facet intent together with order,
gap, alignment, and padding. Grid state additionally records both ordered
domains, cell coordinates, scalar pairs, and blank status; repeat state records
the target, channel, and ordered fields. The
parent `graphicSpec` stores the fully materialized, namespaced child Canvas
tree; renderers read only that concrete state.

`hconcat`, `vconcat`, `facet`, `facetGrid`, and `repeatCharts` trace retained
child use and concrete materialization. Named structural edits rematerialize
from retained concat children. Layout edits and replacement rematerialize from
the retained child programs. Facet source, scale, and guide edits rederive stable-ID children
from the parent-retained unit state before replacing the parent snapshot.
Ordinary data, mark, encoding, scale, and guide
actions apply only to unit programs and reject a composition parent. Facet
titles and facet-header edits are explicit parent-owned exceptions. Edit a
child first, then replace its slot when a concat dashboard needs a changed
chart.
