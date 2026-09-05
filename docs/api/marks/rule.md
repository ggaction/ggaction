---
layout: default
title: Rule Marks
---

# Rule Marks

{% include chart-example.html id="error-bar" %}

Rule marks represent reference lines and intervals. They use concrete line
primitives without exposing a renderer-specific path format.

## `createRuleMark({ id?, data? } = {})`

```javascript
import { chart } from "ggaction";

const threshold = chart()
  .createCanvas({ width: 480, height: 320, margin: 40 })
  .createData({ values: [{ limit: 25 }] })
  .createRuleMark()
  .encodeY({ field: "limit", fieldType: "quantitative" })
  .encodeStroke({ value: "#dc2626" })
  .encodeStrokeWidth({ value: 2 });
```

The first ID is `"rule"`, data defaults to current data, and creation assigns no
position; the default appearance uses the theme mark color, width 2, a solid stroke, and opacity 1. A single x or y encoding creates a full plot-span rule. Add
`encodeY2` for a bounded vertical interval, `encodeX2` for a bounded horizontal
interval, or both secondary endpoints for a diagonal rule. Every endpoint may
use a field or constant datum.

When a rule is layered without explicit `data`, it may first inherit a
compatible source layer's x/y positions. A constant datum endpoint takes
precedence over the inherited opposite position when no secondary endpoint
exists: datum y removes only inherited x and creates a horizontal full-span
rule, while datum x symmetrically creates a vertical full-span rule. Field
endpoints preserve the orthogonal inherited channel for interval construction.
Rules created with explicit `data` do not apply this provenance-based cleanup.

Rule creation and `editRuleMark({ target?, stroke?, strokeWidth?, strokeDash?, opacity? })`
accept constant styles. They validate all options before delegating requested
styles in the following order:

- `encodeStroke`
- `encodeStrokeWidth`
- `encodeStrokeDash`
- `encodeOpacity`

At least one style is required for editing. Scalar edits reject active field
encodings; use the corresponding encoder with `{ value }` to replace them.
Styles persist while endpoints are incomplete and after Canvas resizing.

`encodeStrokeWidth({ field, scale? })` maps a non-negative quantitative field
to one concrete width per rule item. Use `createLegend({ channels:
["strokeWidth"] })` for a sampled quantitative guide. Constant
`encodeStrokeWidth({ value })` remains available and removes the field binding.

Every complete rule stores concrete `x1`, `y1`, `x2`, and `y2` values. An
incomplete endpoint combination remains empty until another encoding completes
it. Canvas and scale changes recompute all endpoints.

## Reference lines and bands

Use reference facades to add a constant threshold or interval to a chart. This example uses the scatterplot's
x scale for the band and y scale for the line:

```javascript
import { chart } from "ggaction";

const program = chart()
  .createCanvas({ width: 480, height: 320, margin: 40 })
  .createData({ values: [{ x: 0, y: 0 }, { x: 10, y: 10 }] })
  .createPointMark()
  .encodeX({ field: "x" })
  .encodeY({ field: "y" })
  .createReferenceBand({ x: [2, 6] })
  .createReferenceLine({ y: 5 })
  .createMarkLabels({ source: "referenceLine", value: "Target", dy: -8 });
```

Data values share the source scale and contribute to its automatic domain. Set an explicit scale domain if
the chart extent must stay fixed. For a position independent of the data range, use
`createReferenceLine({ space: "plot", y: 0.5 })`; this places a line halfway up the plot.
Plot y fractions increase from bottom to top. A plot band can use `x: [0.2, 0.6]` for 20%–60% of the width.
Both resize with the Canvas. Existing data is required, but may be empty for plot references.

Reference marks remain editable with ordinary mark, encoding, and scale actions. Refer to the
[reference-line contract](../../reference/actions/marks.md#createreferenceline) and
[reference-band contract](../../reference/actions/marks.md#createreferenceband) for binding, defaults, and removal behavior.

## Related

[Appearance encodings](../appearance.md) · [Error bars](../error-bars.md) ·
[Advanced axis components](../../advanced/axis-components.md)
