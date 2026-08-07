---
layout: default
title: Category Ordering
---

# Category Ordering

{% include chart-example.html id="ordered-category-bar" %}

Use `orderCategories` when a nominal or ordinal x/y position should follow an
explicit list or a data-derived order. The assignment changes the resolved
position domain, mark geometry, axis labels, and final selection-item order
together. It never reorders source rows.

## `orderCategories(options)`

```javascript
import { chart, render } from "ggaction";

const program = chart()
  .createCanvas()
  .createData({ values: [
    { category: "A", value: 2 },
    { category: "B", value: 5 }
  ] })
  .createBarPlot({ id: "bars", x: "category", y: "value" })
  .orderCategories({
    target: "bars",
    channel: "x",
    by: { field: "value", aggregate: "sum" },
    direction: "descending"
  });

const context = document.querySelector("#chart")?.getContext("2d");
if (!context) throw new Error("Missing #chart Canvas context.");
render(program, context);
```

`target` defaults to the current compatible mark, then the unique compatible
mark. `channel` is required and accepts categorical Cartesian `"x"` or `"y"`.

Choose exactly one ordering mode:

| Mode | Value | Result |
| --- | --- | --- |
| Explicit | `values: readonly (string | number | boolean)[]` | Listed categories first; omitted observed categories appended in first-appearance order |
| Category | `by: "category"` | Numeric, boolean, or code-point lexical category order |
| Frequency | `by: "count"` | Row count per category |
| Summary | `by: { field, aggregate }` | `sum`, `mean`, `min`, or `max` of a finite quantitative field per category |

Computed modes accept `direction: "ascending" | "descending"`; the default is
`"ascending"`. Ties preserve the categories' source first-appearance order.
Category sorting requires one consistent primitive type. An explicit list must
be non-empty and unique, and every listed value must occur in the target data.

The normalized ordering intent is stored on the target encoding. This means a
later facet replay can apply one shared order or recompute an independent order
from each cell's data. Marks that share the ordered scale must read the same
field from the same dataset. The semantic scale domain must remain `"auto"`;
an explicit scale domain and a category-order assignment are two competing
authorities and cannot be combined.

## `removeCategoryOrder({ target?, channel })`

```javascript
const automatic = ordered.removeCategoryOrder({
  target: "bars",
  channel: "x"
});
```

Removal deletes the stored order assignment and restores the automatic
first-appearance domain. The mark and existing connected axis are updated in
place; the dataset, semantic scale definition, mark ID, and guide identity are
preserved. Removing a missing assignment is an error.

## Related

[Bar positions](./ordinal-bars.md) · [Position scales](../scales/position.md) ·
[Facets](../../recipes/facet.md) · [Selection and highlighting](../appearance/selection-and-highlighting.md)
