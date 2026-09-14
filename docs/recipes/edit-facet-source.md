---
layout: default
title: Revise facet source and shared guides
---

# Revise facet source and shared guides

Replace a facet's retained source program, rename its headers, and arrange outer axes with a shared categorical legend.

{% include chart-example.html id="edit-facet-source" lead=true %}

## Prerequisites

Use the [Getting Started browser module setup](../getting-started.md), install the full
`ggaction` entry, and provide `<canvas id="chart"></canvas>`. This complete example
includes its data and imports. The development contract includes APIs that may be
newer than the latest npm release; check the [documentation version](../version.md).

Decision sequence: faceting → source replay → header and guide policies.

## Complete program

<!-- workflow-program:start -->

```javascript
import { chart } from "ggaction";
import { render } from "ggaction";

export function createFacetSourceWorkflow() {
  function source(values) {
    return chart()
      .createCanvas({ width: 320, height: 300, margin: { top: 55, right: 25, bottom: 95, left: 65 } })
      .createData({ id: "rows", values })
      .createScatterPlot({ id: "points", x: "x", y: "y", color: "kind",
        guides: { legend: false } });
  }
  const values = [
    { panel: "N", kind: "A", x: 1, y: 2 }, { panel: "N", kind: "B", x: 3, y: 4 },
    { panel: "S", kind: "A", x: 2, y: 3 }, { panel: "S", kind: "B", x: 4, y: 1 }
  ];
  const before = source(values).facet({ field: "panel", values: ["N", "S"],
    scales: { x: "shared", y: "shared", color: "shared" },
    guides: { axes: "each", legend: "shared" }, gap: 20 });
  return before
    .editFacetSource({ program: source(values.map(row => ({ ...row, y: row.y + 1 }))) })
    .editFacetHeaders({ role: "column", labelMap: [
      { value: "N", label: "North: revised source" },
      { value: "S", label: "South: revised source" }
    ], align: "center", side: "top" })
    .editFacetGuides({ axes: "outer", legend: "shared" });
}

const program = createFacetSourceWorkflow();
render(program, document.querySelector("#chart").getContext("2d"));
```

<!-- workflow-program:end -->

## Expected result

Both panels rebuild from rows whose y values increased by one. Raw keys N and S remain unchanged while headers display North and South. The parent retains a shared color legend and uses outer positional axes.

## Boundaries and failure behavior

Facet children derive from the source recipe and cannot be replaced with concat child editors. Header display maps do not rename data values or change grouping. `side` and `align` require an explicit header role. Shared guides require compatible shared channel semantics; they are not inferred by matching labels.

## Related

[Authoring conventions](../concepts/authoring-conventions.md) · [Data policies](../api/data/policies.md) ·
[Complete action reference](../reference/actions.md)
