---
layout: default
title: Arrange Nested Panels with Shared Guides
---

# Arrange nested panels with shared guides

Compare five regional panels with an overview. Each child keeps a fixed Canvas;
content spacing accounts for rotated headers, long labels, strokes and shared
guides. The last row has one panel, while the two retained bottom axes share one
footer. Every regional bar uses the common 0–20 value range.

{% include chart-example.html id="nested-responsive" %}

```javascript
import { chart, hconcat } from "ggaction";

const nestedRows = Array.from({ length: 5 }, (_, group) =>
  Array.from({ length: 4 }, (_, index) => ({
    panel: `Region ${group + 1}`, category: `Category ${index + 1} long caption`,
    value: (index + 1) * (group + 1), series: index % 2 ? "B" : "A"
  }))).flat();

function createNestedResponsiveSource() {
  return chart()
    .createCanvas({ width: 340, height: 300, margin: 20,
      responsive: { minPlotSize: { width: 100, height: 100 } },
      plotBorder: { color: "#334155", lineWidth: 2 } })
    .createData({ id: "rows", values: nestedRows })
    .createBarPlot({ id: "bars", x: "category", y: "value", color: "series", guides: {
      axes: { x: { ticksAndLabels: { labels: { responsive: { maxLines: 2 } } } }, y: {} },
      legend: false
    } });
}

function createNestedResponsive() {
  const source = createNestedResponsiveSource();
  const panels = source.facet({ field: "panel", columns: 2, spacing: "content",
    gap: { x: 24, y: 32 }, headers: { anchor: "view", rotation: 0.2 },
    guides: { axes: "outer", legend: { position: "right", border: { color: "#334155", lineWidth: 1 } } }
  }).createTitle({ text: "Regional detail" });
  return hconcat({ id: "report", programs: [
    { id: "panels", program: panels },
    { id: "overview", program: source.createTitle({ text: "All regions" }) }
  ], gap: 32, align: "start" });
}

const program = createNestedResponsive();
```

The report is 1047 × 942 logical pixels. The regional children remain 340 × 300,
and the shared legend appears once beside them. `spacing: "content"` measures
the visible child content rather than only the mark bounds.

To widen only the regional panels, use the existing scoped source target:

`program.editCanvas({ target: { childPath: ["panels"], facetSource: true },
width: 420 })`.

The parent snapshots and placement update, and the overview is retained.
Changing data, a descendant theme or prepared text metrics also refreshes the
relevant ancestors. Shared scale domains remain shared during that layout work.
An insufficient width fails without changing the original report or its trace.
Font-bound labels require exact prepared measurements; a new unmeasured label
requires another preparation before it can be authored.

See [composition](../api/composition.md) for scoped editing and guide policies,
and [font assets](font-assets.md) for explicit host preparation. Renderers consume
the same resolved output; they do not measure or relayout the panels.
