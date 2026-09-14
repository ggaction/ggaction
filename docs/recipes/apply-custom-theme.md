---
layout: default
title: Apply, override, and remove a theme
---

# Apply, override, and remove a theme

Apply reusable defaults, preserve an intentional local override, and remove the active theme.

{% include chart-example.html id="apply-custom-theme" lead=true %}

## Prerequisites

Use the [Getting Started browser module setup](../getting-started.md), install the full
`ggaction` entry, and provide `<canvas id="chart"></canvas>`. This complete example
includes its data and imports. The development contract includes APIs that may be
newer than the latest npm release; check the [documentation version](../version.md).

Authoring levels: H0 scatterplot → H3 theme and mark-style editing.

## Complete program

<!-- workflow-program:start -->

```javascript
import { chart, hconcat } from "ggaction";
import { render } from "ggaction";

export function createCustomThemeWorkflow() {
  const base = chart()
    .createCanvas({ width: 360, height: 280, margin: 60 })
    .createData({ values: [{ x: 1, y: 2 }, { x: 3, y: 4 }] })
    .createScatterPlot({ id: "points", x: "x", y: "y" });
  const themed = base.applyTheme({ theme: { base: "light", tokens: {
    background: "#f5f3ff", mark: "#7c3aed", axis: "#5b21b6"
  } } });
  const overridden = themed.editPointMark({ target: "points", fill: "#ea580c" });
  const restored = overridden.removeTheme();
  return hconcat({ programs: [
    themed.createTitle({ text: "Custom theme" }),
    overridden.createTitle({ text: "Orange override" }),
    restored.createTitle({ text: "Theme removed" })
  ], gap: 16 });
}

const program = createCustomThemeWorkflow();
render(program, document.querySelector("#chart").getContext("2d"));
```

<!-- workflow-program:end -->

## Expected result

The first panel uses a lavender background and purple default marks. The second changes those marks to orange. The third restores baseline theme defaults while retaining the explicit orange fill.

## Boundaries and failure behavior

Theme defaults and explicit mark properties have separate precedence. Removing a theme does not undo the user's local override. On a composition, choose the documented `scope` deliberately; this example themes independent child programs before composition. Unknown token names fail without changing the input.

## Related

[Authoring conventions](../concepts/authoring-conventions.md) · [Data policies](../api/data/policies.md) ·
[Complete action reference](../reference/actions.md)
