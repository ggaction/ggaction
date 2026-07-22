---
layout: default
title: Mark Actions
description: Create, edit, jitter, and remove semantic chart marks.
---

# Mark Actions

These are direct immutable `ChartProgram` actions. Each accepts one option object and returns a new program.

## `createPointMark`

```javascript
createPointMark({ id?, data?, shape?, fill?, opacity?, stroke?, strokeWidth? } = {})
```

Create a semantic point mark with one of 12 equal-area shape realizations. [Marks](../../api/marks.md)

## `editPointMark`

```javascript
editPointMark({ target?, shape?, fill?, opacity?, stroke?, strokeWidth? })
```

Change constant point shape, fill, opacity, or outline appearance and rematerialize its concrete items.
`stroke: false` disables the outline and its width. [Marks](../../api/marks.md)

## `jitterPoints`

```javascript
jitterPoints({ target?, channel, maxOffset, seed?, key? })
```

Assign deterministic bounded graphical jitter to one Cartesian point mark. Use
exactly one of `maxOffset.pixels` or `maxOffset.band`; calling the action again
replaces the previous policy from the semantic base positions. [Point marks](../../api/marks/point.md)

## `removeJitter`

```javascript
removeJitter({ target? } = {})
```

Remove the target point mark's jitter assignment and restore positions derived
directly from its semantic encodings. [Point marks](../../api/marks/point.md)

## `removeMark`

```javascript
removeMark({ target? })
```

Remove one stable mark owner and its owned state while preserving source data
and independently shared resources. [Marks](../../api/marks.md)

## `createLineMark`

```javascript
createLineMark({ id?, data?, stroke?, strokeWidth?, opacity?, curve?, closed? } = {})
```

Create a semantic line mark and empty path collection. Curve defaults to
`"linear"`; explicit curve and `strokeWidth` values are retained during
rematerialization. A compatible layered source can provide data, positions,
shared scales, and a grain-preserving aggregate such as `mean`; bar-only bin,
stack, and offset policies are not inherited. `closed: true` closes each Polar
series as a radar path.
[Marks](../../api/marks.md)

## `editLineMark`

```javascript
editLineMark({ target?, stroke?, strokeWidth?, opacity?, curve?, closed? })
```

Edit line appearance and rematerialize concrete path commands without changing
semantic encodings. [Marks](../../api/marks.md)

## `createBarMark`

```javascript
createBarMark({ id?, data?, fill?, opacity?, stroke?, strokeWidth? } = {})
```

Create a semantic bar mark and empty rect collection. [Marks](../../api/marks.md)

## `editBarMark`

```javascript
editBarMark({ target?, fill?, opacity?, stroke?, strokeWidth? })
```

Edit whole-bar appearance and rematerialize every concrete rectangle.
`stroke: false` removes the visible outline; constant fill conflicts with a
field-driven color encoding. [Marks](../../api/marks.md)

## `createAreaMark`

```javascript
createAreaMark({ id?, data?, fill?, opacity?, stroke?, strokeWidth?, curve? } = {})
```

Create a semantic area mark and empty path collection. Fixed fill defaults to
`"#4c78a8"`; opacity defaults to `0.2`. Optional outlines default to width `1`.
Curve defaults to `"linear"` and accepts the shared eight-value vocabulary.
[Marks](../../api/marks.md)

## `editAreaMark`

```javascript
editAreaMark({ target?, fill?, opacity?, stroke?, strokeWidth?, curve? })
```

Edit constant area appearance. `stroke: false` removes an existing outline.
[Marks](../../api/marks.md)

## `createArcMark`

```javascript
createArcMark({ id?, data?, innerRadius?, padAngle?, fill?, opacity?, stroke?, strokeWidth? } = {})
```

Create a semantic arc mark and empty closed-path collection. Count theta
materializes proportional pie or donut sectors; categorical theta plus radius
materializes radial sectors. [Marks](../../api/marks/line-area.md#arc-marks)

## `editArcMark`

```javascript
editArcMark({ target?, innerRadius?, padAngle?, fill?, opacity?, stroke?, strokeWidth? })
```

Edit arc geometry or appearance and rematerialize complete sector paths.
`stroke: false` disables the outline and its width.
[Marks](../../api/marks/line-area.md#arc-marks)

## `createRuleMark`

```javascript
createRuleMark({ id?, data? } = {})
```

Create a semantic rule mark and empty line collection. The first omitted ID is
`"rule"`; data defaults to current data. [Marks](../../api/marks.md)

## `createRectMark`

```javascript
createRectMark({ id?, data?, fill?, opacity?, stroke?, strokeWidth? } = {})
```

Create a semantic rect mark and empty rect collection. Two discrete x/y bands
or complete x/x2 and y/y2 endpoint pairs materialize observed cells. Rects do
not infer bar aggregation, baseline, stack, or width semantics.
[Rect marks](../../api/marks/rect.md)

## `editRectMark`

```javascript
editRectMark({ target?, fill?, opacity?, stroke?, strokeWidth? })
```

Edit rect appearance and rematerialize complete cells. Constant fill conflicts
with field-driven color. `stroke: false` disables the outline.
[Rect marks](../../api/marks/rect.md)

## `createTextMark`

```javascript
createTextMark({ id?, data?, text?, fill?, opacity?, fontSize?, fontFamily?, fontWeight?, align?, baseline?, rotation?, dx?, dy? } = {})
```

Create a semantic text layer. Omitted data and position attach to the current
or unique compatible point, bar, rect, or rule layer. `text` is constant-content
shorthand. [Text marks](../../api/marks/text.md)

## `editTextMark`

```javascript
editTextMark({ target?, fill?, opacity?, fontSize?, fontFamily?, fontWeight?, align?, baseline?, rotation?, dx?, dy? })
```

Edit text typography and graphical offsets without changing its semantic
source or position. [Text marks](../../api/marks/text.md)

## `layoutLabels`

```javascript
layoutLabels({ target?, axis?, padding?, maxDisplacement?, bounds?, leader? } = {})
```

Assign deterministic collision-aware placement to one complete text mark.
Displacement may use x, y, or both axes and remains inside plot or Canvas
bounds when possible. Optional leaders connect displaced labels to their
stored source anchors. Impossible layouts retain a stable best effort and a
warning summary. [Text marks](../../api/marks/text.md)

## `removeLabelLayout`

```javascript
removeLabelLayout({ target? } = {})
```

Remove one text mark's layout policy and leader collection, then restore its
semantic base positions. [Text marks](../../api/marks/text.md)

### Position capability matrix

<!-- action-capabilities:position:start -->
| Action | Supported marks | Field types | Important modes |
| --- | --- | --- | --- |
| `encodeX` | point, line, area, bar, rect, rule, text | point/bar/rect/rule/text: quantitative, temporal, ordinal, nominal; line/area: quantitative, temporal | field; rule also accepts datum; bar accepts aggregate or bin |
| `encodeY` | point, line, area, bar, rect, rule, text | point/line/bar/rect/rule/text: quantitative, temporal, ordinal, nominal; area: quantitative, temporal | field; rule also accepts datum; bar accepts aggregate or count |
| `encodeX2` / `encodeY2` | area, ranged bar, rect, rule | area/ranged bar/rect/rule: matching primary | secondary field; rule also accepts datum |
| `encodeTheta` | point, line, arc | point/line: quantitative, temporal, ordinal, nominal; arc: ordinal, nominal | arc accepts aggregate: count or weighted sum for proportional sectors |
| `encodeR` | point, line, arc | point/line/arc: quantitative | radial position; arc combines it with a categorical theta band |
| `encodeParallelCoordinates` | line | line: quantitative, ordinal | atomic ordered dimensions; one namespaced scale and axis per dimension |
<!-- action-capabilities:position:end -->

## Related

[Action Reference](../actions.md) · [Chart API](../../api/index.md) · [Supported Features](../../supported-features.md)
