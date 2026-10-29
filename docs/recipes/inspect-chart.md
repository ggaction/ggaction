---
layout: default
title: Inspect overlapping chart items
---

# Inspect overlapping chart items

{% include chart-example.html id="inspect-chart" lead=true %}

Create a chart with two observations at the same location, then inspect both
through Canvas or SVG. Open the live example to compare the two surfaces.

## Prerequisites

Use the [browser module setup](../getting-started.md) and a
`<canvas id="chart"></canvas>`. This complete program includes its source rows.

## Complete program

<!-- workflow-program:start -->

```javascript
import { chart } from "ggaction";
import { render } from "ggaction";

export function createInspectionChart() {
  return chart().createCanvas({ width: 420, height: 300, margin: 70 })
    .createData({ id: "observations", keyField: "id", values: [
      { id: "a", x: 2, y: 3 }, { id: "b", x: 8, y: 7 }, { id: "c", x: 2, y: 3 }
    ] })
    .createPointMark({ id: "observations" })
    .encodeX({ field: "x", scale: { domain: [0, 10], nice: false } })
    .encodeY({ field: "y", scale: { domain: [0, 10], nice: false } })
    .createXAxis({ ticksAndLabels: { values: [0, 5, 10] }, title: false })
    .createYAxis({ ticksAndLabels: { values: [0, 5, 10] }, title: false })
    .createTitle({ text: "Inspect overlapping observations" });
}

const program = createInspectionChart();
render(program, document.querySelector("#chart").getContext("2d"));
```

<!-- workflow-program:end -->

## Add inspection

Continue in the same module after rendering the `program` above:

```javascript
import { createInteractionSession } from "ggaction/interaction";
const session = createInteractionSession({ program });
session.subscribe(({ state }) => {
  console.log(state.hit?.candidates ?? []);
});
const unmount = session.mount(document.querySelector("#chart"));
window.addEventListener("pagehide", () => session.destroy(), { once: true });
```

At CSS-local point `(126, 182)`, two logical point candidates are reported. At
`(294, 118)`, one is reported. Axis ticks and the title also expose guide roles.
Inspecting does not change data, selection resources, or action trace.

For SVG, render the same program with `renderToSVG` from `ggaction/svg`, insert
that markup, and mount a separate session on the SVG root. See the
[interaction API](../api/interaction.md) for coordinate transforms, sampled
frames, supported commands, and cleanup.
