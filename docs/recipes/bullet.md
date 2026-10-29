---
layout: default
title: Bullet Comparison Recipe
---

# Compare an actual measure with a target

{% include chart-example.html id="bullet" lead=true %}

A Bullet comparison places reference ranges, an actual measure and a target on
one quantitative scale. Build those roles with ordinary Rect, Bar, Rule and Text
marks; the recipe adds no dedicated constructor.

## Prerequisites

Use the [Getting Started browser module setup](../getting-started.md) with a
`<canvas id="chart"></canvas>` element.

## Complete program

Run this entry in the [example directory](https://github.com/ggaction/ggaction/tree/{{ site.data.provenance.exampleSourceRef }}/examples/bullet/)
after installing ggaction. The linked [program.js](https://github.com/ggaction/ggaction/blob/{{ site.data.provenance.exampleSourceRef }}/examples/bullet/program.js)
contains the public action chain and `fixture.js` supplies the observations and
reference ranges. Replace that module's source import with
`import { chart } from "ggaction"` in an installed application.

```javascript
import { render } from "ggaction";
import { createBullet } from "./program.js";

const program = createBullet();
render(program, document.querySelector("#chart").getContext("2d"));
```

`createRectMark` and `encodeXRange` draw the reference ranges first.
`createBarMark`, `encodeY`, `encodeX` and `encodeBarWidth` draw the actual measure.
`createRuleMark` and `encodeX` place the target; `createMarkLabels` prints the
actual value. The order keeps the actual and target visible above their context.
All three quantitative roles reuse the explicitly named `amount` scale.

## Declare the reference meaning

Supply observations with `id`, `metric`, `actual` and `target`, plus explicit
`referenceRanges`, `domain` and `metric` options to the example function. The
shown reference thresholds are 50, 75 and 100, the actual is 65 and the target is
80. Those thresholds are authored context, not inferred performance categories.
The actual uses a sum; choose an appropriate upstream summary if your source
represents a mean or another statistic. A target is an explicit source value.

The actual's categorical Y position does not introduce a second quantitative
axis. Full-height reference ranges and the target rule deliberately omit Y
encodings. A zero actual remains semantic zero and produces no visible Bar item;
an empty set cannot supply the required aggregate. Duplicate explicit row keys
are rejected.

## Update the comparison

Call `reviseData` on `observed` to change the actual and target together. The
measure label follows the actual; reference ranges remain on their explicit
source. `editCanvas` rematerializes all roles through the same scale. Selection
and highlighting can target `measure` without recoloring the reference ranges.

The result supports Canvas, SVG, PNG and PDF, including graphic-only offline
snapshots. [Linked overlays](combo.md) show a related composition using one
shared quantitative Y scale.
