---
layout: default
title: Remove resources in dependency order
---

# Remove resources in dependency order

Use the ownership error to identify a live consumer, then delete the consumer and its temporary dataset in order.

{% include chart-example.html id="remove-dependent-resources" lead=true %}

## Prerequisites

Use the [Getting Started browser module setup](../getting-started.md), install the full
`ggaction` entry, and provide `<canvas id="chart"></canvas>`. This complete example
includes its data and imports. These APIs require ggaction 0.0.14 or later;
check the [documentation version](../version.md) for release compatibility.

Decision sequence: Complete chart → independent mark removal → explicit data lifecycle.

## Complete program

<!-- workflow-program:start -->

```javascript
import { chart, hconcat } from "ggaction";
import { render } from "ggaction";

export function createResourceRemovalWorkflow() {
  const before = chart()
    .createCanvas({ width: 360, height: 280, margin: 60 })
    .createData({ id: "rows", values: [{ x: 1, y: 2 }, { x: 3, y: 4 }] })
    .createScatterPlot({ id: "main", data: "rows", x: "x", y: "y" })
    .createData({ id: "temporary", values: [{ x: 2, y: 3 }] })
    .createPointMark({ id: "preview", data: "temporary", fill: "#dc2626" })
    .encodeX({ target: "preview", field: "x", scale: { id: "previewX" } })
    .encodeY({ target: "preview", field: "y", scale: { id: "previewY" } });
  try {
    before.removeData({ id: "temporary" });
  } catch (error) {
    if (!/preview/.test(error.message)) throw error;
  }
  const after = before.removeMark({ target: "preview" }).removeData({ id: "temporary" });
  return hconcat({ programs: [
    before.createTitle({ text: "Temporary red preview" }),
    after.createTitle({ text: "Preview and data removed" })
  ], gap: 20 });
}

const program = createResourceRemovalWorkflow();
render(program, document.querySelector("#chart").getContext("2d"));
```

<!-- workflow-program:end -->

## Expected result

The first panel has a red preview point backed by `temporary`. Its attempted data removal reports the live `preview` reference. The second panel removes that mark and then its dataset, leaving the main chart intact.

## Boundaries and failure behavior

`removeData` requires an explicit ID and does not cascade. A current-dataset pointer and historical trace alone do not keep a resource alive. Derived data and retained facet recipes do keep their sources alive. Use the named ownership paths in the error to remove or rebind consumers first; there is no force-delete option.

## Related

[Authoring conventions](../concepts/authoring-conventions.md) · [Data policies](../api/data/policies.md) ·
[Complete action reference](../reference/actions.md)
