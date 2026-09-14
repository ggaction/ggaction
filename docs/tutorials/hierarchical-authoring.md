---
layout: default
title: Choose the Right Authoring Level
---

# Choose the Right Authoring Level

A chart can begin as one high-level action and remain editable through its lower-level
parts. You choose the size of the decision at each step: the whole chart, a statistical
layer, one encoding, a guide, or concrete graphics in an extension.

{% include chart-example.html id="hierarchical-authoring" lead=true %}

## Prerequisites

Use the [Getting Started browser module](../getting-started.md), the full package, and
`<canvas id="chart"></canvas>`. The complete program includes all three input rows.

## Complete program

<!-- workflow-program:start -->

```javascript
import { chart, hconcat } from "ggaction";
import { render } from "ggaction";

export function authoringStages() {
  const base = chart()
    .createCanvas({ width: 400, height: 300, margin: 65 })
    .createData({ id: "observations", values: [
      { x: 1, y: 3 }, { x: 2, y: 5 }, { x: 3, y: 4 }
    ] });
  const highLevel = base.createScatterPlot({ id: "points", x: "x", y: "y", guides: false });
  const composed = base.createPointMark({ id: "points" })
    .encodeX({ field: "x" }).encodeY({ field: "y" });
  const styled = composed.encodePointRadius({ value: 8 })
    .editPointMark({ fill: "#7c3aed" }).createGuides({ legend: false });
  return { highLevel, composed, styled };
}

export function createHierarchicalAuthoring() {
  const { highLevel, composed, styled } = authoringStages();
  return hconcat({ programs: [
    highLevel.createTitle({ text: "H0: complete chart" }),
    composed.createTitle({ text: "H2: mark and encodings" }),
    styled.createTitle({ text: "Focused style and guides" })
  ], gap: 20 });
}

const program = createHierarchicalAuthoring();
render(program, document.querySelector("#chart").getContext("2d"));
```

<!-- workflow-program:end -->

## Choose a decision, then its action

The first two panels encode exactly the same observations. `createScatterPlot` (H0)
creates a point mark and delegates positional decisions to H2 actions. The second
panel spells out those decisions as `createPointMark`, `encodeX`, and `encodeY`.
Neither approach changes the immutable source rows.

The third panel keeps that chart and changes only the intended parts. A larger glyph
radius and purple fill are focused appearance decisions. `createGuides` adds the axes
and grid implied by its existing encodings. There is no need to reconstruct data or
choose the scatterplot again just to restyle its points.

| Role | Decision | Example |
| --- | --- | --- |
| H0 | Complete chart or repeated/composed chart structure | `createScatterPlot`, `createHistogram`, `facet` |
| H1 | Statistical or composite authoring task | `createSummaryData`, `createECDFData`, `createMarkLabels` |
| H2 | Mark, semantic encoding, scale, coordinate, or binding decision | `createPointMark`, `encodeX`, `editScale`, `bindMarkData` |
| H3 | Presentation, guide, or focused component decision | `editPointMark`, `createAxes`, `applyTheme` |
| H4 | Extension primitives for semantic and concrete graphic state | `editSemantic`, `createGraphics`, `editGraphics` |

An action may carry several roles. The [exact action reference](../reference/actions.md)
owns its current role metadata. For example, a statistical chart facade may perform
both an H0 chart task and an H1 composite task.

For a concrete H1 workflow, follow [missing-observation repair](../recipes/repair-missing-observations.md):
completion, imputation, and a window calculation create reusable derived datasets;
a lower-level rebind then changes the displayed line. Those operations have a different
grain from styling an already constructed mark.

## Read the delegation in the trace

The returned programs expose `trace`. For this scatterplot, the relevant hierarchy is:

```text
createScatterPlot                 H0
├─ createPointMark                H2
│  ├─ editSemantic                H4
│  └─ createGraphics              H4
├─ encodeX                        H2
└─ encodeY                        H2
```

This is a partial tree; nested scale and materialization operations are omitted for
readability. Inspect `authoringStages().highLevel.trace` for the complete retained tree.
The trace records how actions delegated work. Renderers consume the resulting concrete
`graphicSpec`; they do not execute the trace or compile `semanticSpec` automatically.

H4 primitives are the [extension-authoring path](../extension/action-authoring.md).
Changing a primitive graphic directly does not revise its semantic data or encoding,
so a later domain rematerialization may rebuild it. Ordinary chart changes should use
the domain action that owns their meaning and update policy.

## Role, API layer, and package are separate

H0–H4 describe the decision's level. The API layer classifies an action as user-facing,
advanced, or primitive. Package membership says whether it is exposed by `ggaction`,
`ggaction/basic`, or the extension entry. None can be inferred from the other two.
`createScale` and `editScale`, for example, are user-facing H2 domain actions;
`encodeChannels` is an advanced action available only from the full package.

## Related

[Choose a chart](../api/chart-picker.md) · [Authoring conventions](../concepts/authoring-conventions.md) ·
[Action traces](../concepts/actions-and-trace.md)
