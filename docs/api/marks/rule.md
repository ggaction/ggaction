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
const threshold = chart()
  .createData({ values: [{ limit: 25 }] })
  .createRuleMark()
  .encodeY({ field: "limit" })
  .encodeStroke({ value: "#dc2626" })
  .encodeStrokeWidth({ value: 2 });
```

The first ID is `"rule"`, data defaults to current data, and creation assigns no
position or style. A single x or y encoding creates a full plot-span rule. Add
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

## Related

[Appearance encodings](../appearance.md) · [Error bars](../error-bars.md) ·
[Advanced axis components](../../advanced/axis-components.md)
