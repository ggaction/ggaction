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
[runnable repository example](https://github.com/hj-n/ggaction/tree/main/examples/program-composition)
for complete child construction and Browser Canvas rendering.

Both functions require at least two programs. A direct `ChartProgram` receives
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
the largest child width. An explicitly authored child width or height is never
overwritten; `align` places any remaining cross-axis difference.

The parent background is white. Child Canvas backgrounds are preserved, and
nested compositions keep independent clipping and coordinate scopes.

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
[repository example](https://github.com/hj-n/ggaction/tree/main/examples/cars-origin-scatterplot-facet)
for the complete data preparation and guide options.

`facet` uses field values in source first-appearance order. It infers the one
direct source used by all repeated layers, shares scale domains, and keeps axes
inside every cell. Omitted `columns` creates one row; a positive value wraps
cells row-major.

| Option | Default | Effect |
| --- | --- | --- |
| `id` | `"facet"` | Names the parent and deterministic child namespaces |
| `field` | required | Direct-source field whose values define cells |
| `data` | unique layer source | Selects the direct source explicitly |
| `columns` | number of values | Sets the grid column count |
| `gap` | `16` | Sets horizontal and vertical cell spacing |
| `align` | `"center"` | Aligns unequal cells inside grid tracks |
| `padding` | `0` on every side | Adds scalar or four-side parent padding |
| `guides.legend` | `false` | `"shared"` creates one parent categorical color legend |

The current direct-source slice supports complete point, histogram bar, and
aggregate bar charts. Derived datasets, independent facet scales, outer-only
axes, and non-categorical shared legends are not yet supported and produce a
validation error instead of a partial chart.

Create a chart title after `facet` so the title is owned directly by the
parent. A title that already fits the unit Canvas is promoted for authoring
order compatibility rather than repeated in every cell.

Edit the repeated header style without addressing generated graphic IDs:

```javascript
const emphasized = faceted.editFacetHeaders({
  fontSize: 13,
  fontWeight: 700,
  color: "#0f172a",
  offset: 10
});
```

## Edit the layout

```javascript
const revised = row.editCompositionLayout({
  gap: 28,
  align: "start",
  padding: { left: 12, right: 12 }
});
```

At least one option is required. Omitted values retain their current settings;
a partial padding object updates only the named sides. The action preserves all
child IDs and references and rebuilds the parent snapshot.

Facet parents use this same action for `gap`, `align`, and `padding`; derived
cell programs and facet value order remain unchanged.

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

## State, trace, and action scope

`children` maps stable slot IDs to retained immutable programs.
`compositionSpec` stores concat direction or facet intent together with order,
gap, alignment, and padding. The
parent `graphicSpec` stores the fully materialized, namespaced child Canvas
tree; renderers read only that concrete state.

`hconcat`, `vconcat`, and `facet` trace `useProgram` children followed by
`materializeComposition`. Layout edits and replacement rematerialize from the
retained child programs. Ordinary data, mark, encoding, scale, and guide
actions apply only to unit programs and reject a composition parent. Facet
titles and facet-header edits are explicit parent-owned exceptions. Edit a
child first, then replace its slot when a concat dashboard needs a changed
chart.
