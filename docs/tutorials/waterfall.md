---
layout: default
title: Show contributions and totals
---

# Show contributions and totals

Declare each row's role so its effect on the running balance is explicit.
Positive and negative contributions share the same ordered scale; totals start
at zero without changing the balance.

{% include chart-example.html id="waterfall" %}

```js
import { chart } from "ggaction";

const contributions = chart()
  .createCanvas({ width: 500, height: 320, margin: 40, background: "#ffffff" })
  .createData({ id: "contributions", keyField: "id", values: [
    { id: "a", stage: "Revenue", role: "delta", value: 5 },
    { id: "b", stage: "Cost", role: "delta", value: -2 },
    { id: "c", stage: "Subtotal", role: "subtotal" },
    { id: "d", stage: "Other", role: "delta", value: 4 },
    { id: "e", stage: "Total", role: "total" }
  ] })
  .createWaterfallPlot({ id: "waterfall", x: "stage", role: "role", value: "value",
    width: { pixels: 48 }, yScale: { domain: [0, 10] }, guides: false });

const labeled = contributions.editWaterfallPlot({ target: "waterfall", labels: {} });
const selected = labeled.selectMarks({ id: "cost", target: "waterfall",
  field: "id", op: "eq", value: "b" })
  .highlightMarks({ selection: "cost", stroke: "#1d4ed8", strokeWidth: 2 });
```

The balance moves from 5 to 3, stays at 3 for the subtotal, then rises to 7.
The final total is 7. Its value is derived from the explicit contribution rows;
the total row intentionally has no `value` property.

A source revision recalculates the full sequence while preserving keyed stage
identity. Bar, connector and label stay together during selection and hit
testing. See [Waterfall options](../api/waterfall.md) for reset fields, color
scales, effects, clipping and scoped edits.
