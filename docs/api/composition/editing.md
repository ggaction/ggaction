---
layout: default
title: Editing Compositions
---

# Editing Compositions

{% include chart-example.html id="composition" lead=true %}

[Family overview](./../composition.md) · [Exact action lookup](./../../reference/actions.md)

## Edit the layout

<!-- snippet-context:start -->

> **Contextual fragment.** Use an ES module with the imports, data, and prepared resource state described in this section. Caller-provided receivers: `row`. Resolve these names from setup in this fragment or section; alternatives branch from the same base.

<!-- snippet-context:end -->

```javascript
const revised = row.editCompositionLayout({
  gap: 28,
  align: "start",
  padding: { left: 12, right: 12 }
});
```

This continuation edits the `row` concat created above. For a one-field facet,
use its own retained parent to change the number of columns:

<!-- snippet-context:start -->

> **Contextual fragment.** Use an ES module with the imports, data, and prepared resource state described in this section. Caller-provided receivers: `faceted`. Resolve these names from setup in this fragment or section; alternatives branch from the same base.

<!-- snippet-context:end -->

```javascript
const twoColumns = faceted.editCompositionLayout({ columns: 2, gap: 28 });
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

<!-- snippet-context:start -->

> **Contextual fragment.** Use an ES module with the imports, data, and prepared resource state described in this section. Caller-provided receivers: `faceted`. Resolve these names from setup in this fragment or section; alternatives branch from the same base.

<!-- snippet-context:end -->

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

For Polar and Parallel facets, use `theta`, public `r`, or
`parallelDimensions`. Their axes remain per panel, so `axes: "outer"` is
rejected at creation and during guide editing.

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

<!-- snippet-context:start -->

> **Contextual fragment.** Use an ES module with the imports, data, and prepared resource state described in this section. Caller-provided receivers: `matrix`. Resolve these names from setup in this fragment or section; alternatives branch from the same base.

<!-- snippet-context:end -->

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

Composition Canvas dimensions are inferred from the child Canvases. To resize
every facet or repeat cell, call `editCanvas` on the revised complete unit and
pass that unit to `editFacetSource`; `editCanvas` itself accepts unit programs.

The call is atomic: an invalid new unit changes neither the existing parent nor
the caller-owned program.

## Replace one stable slot

<!-- snippet-context:start -->

> **Contextual fragment.** Use an ES module with the imports, data, and prepared resource state described in this section. Caller-provided receivers: `revised`. Resource selectors used here: `target: "detail"`. Resolve these names from setup in this fragment or section; alternatives branch from the same base.

<!-- snippet-context:end -->

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

<!-- snippet-context:start -->

> **Contextual fragment.** Use an ES module with the imports, data, and prepared resource state described in this section. Caller-provided receivers: `row`. Resource selectors used here: `target: "detail"`. Resolve these names from setup in this fragment or section; alternatives branch from the same base.

<!-- snippet-context:end -->

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
