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

Create a semantic point mark with one of 12 equal-area shape realizations.
`stroke: false` disables the outline and its width at creation. [Marks](../../api/marks.md)

## `editPointMark`

```javascript
editPointMark({ target?, shape?, fill?, opacity?, stroke?, strokeWidth? })
```

Change constant point shape, fill, opacity, or outline appearance and rematerialize its concrete items.
`stroke: false` disables the outline and its width. [Marks](../../api/marks.md)

## `createTickMark`

```javascript
createTickMark({ id?, data?, length?, stroke?, strokeWidth?, opacity? } = {})
```

Create a centered line glyph that materializes after both x and y are complete.
Length defaults to `14`; stroke width defaults to `2`. [Marks](../../api/marks.md)

## `editTickMark`

```javascript
editTickMark({ target?, length?, stroke?, strokeWidth?, opacity? })
```

Partially edit Tick length or constant line appearance while preserving data,
position, and other assignments. [Marks](../../api/marks.md)

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

Create a semantic bar mark and empty rect collection.
`stroke: false` disables the outline and its width at creation. [Marks](../../api/marks.md)

## `editBarMark`

```javascript
editBarMark({ target?, fill?, opacity?, stroke?, strokeWidth? })
```

Edit whole-bar appearance and rematerialize every concrete rectangle.
`stroke: false` removes the visible outline; constant fill conflicts with a
field-driven color encoding. [Marks](../../api/marks.md)

## `createAreaMark`

```javascript
createAreaMark({ id?, data?, fill?, opacity?, stroke?, strokeWidth?, curve?, missing? } = {})
```

Create a semantic area mark and empty path collection. Fixed fill defaults to
`"#4c78a8"`; opacity defaults to `0.2`. Optional outlines default to width `1`.
Curve defaults to `"linear"` and accepts the shared eight-value vocabulary.
[Marks](../../api/marks.md)

Area `missing` defaults to `"error"`. `"break"` splits null/undefined measured endpoints into closed segments with at least two samples; independent positions and nonfinite values remain strict. Density/Horizon missing policies are not reinterpreted.

## `editAreaMark`

```javascript
editAreaMark({ target?, fill?, opacity?, stroke?, strokeWidth?, curve?, missing? })
```

Edit constant area appearance. `stroke: false` removes an existing outline.
[Marks](../../api/marks.md)

## `createArcMark`

```javascript
createArcMark({ id?, data?, innerRadius?, padAngle?, fill?, opacity?, stroke?, strokeWidth? } = {})
```

Create a semantic arc mark and empty closed-path collection. Direct
quantitative theta, category counts, or category-weighted sums materialize
proportional pie or donut sectors; categorical theta plus radius materializes
radial sectors. [Marks](../../api/marks/line-area.md#arc-marks)

## `editArcMark`

```javascript
editArcMark({ target?, innerRadius?, padAngle?, fill?, opacity?, stroke?, strokeWidth? })
```

Edit arc geometry or appearance and rematerialize complete sector paths.
`stroke: false` disables the outline and its width.
[Marks](../../api/marks/line-area.md#arc-marks)

## `createRuleMark`

```javascript
createRuleMark({ id?, data?, stroke?, strokeWidth?, strokeDash?, opacity? } = {})
```

Create a semantic rule mark and empty line collection. The first omitted ID is
`"rule"`; data defaults to current data. [Marks](../../api/marks.md)

## `editRuleMark`

```javascript
editRuleMark({ target?, stroke?, strokeWidth?, strokeDash?, opacity? })
```

Edit constant Rule appearance through the four existing encoding owners. At least
one style is required; field appearance conflicts with scalar editing. Creation
accepts the same styles. [Rule marks](../../api/marks/rule.md)

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

## `createReferenceLine`

```javascript
createReferenceLine({ id?, x?, y?, space?, source?, data?, coordinate?, temporalUnit?, stroke?, strokeWidth?, strokeDash?, opacity? })
```

Create one constant Rule spanning the other plot axis. Exactly one `x` or `y` is required.
Data space is the default: `source` resolves explicit, current eligible, then unique eligible Cartesian layer.
It supplies data, coordinate, scale, field type, and temporal input unit. Source-owned Text aliases are excluded from source inference. Strings are literal values.
Reference constants participate in automatic domains; explicit domains preserve the requested extent.
`temporalUnit` may override the source unit. `data` and `coordinate` are plot-space options only.

With `space: "plot"`, the value must be a finite fraction in `[0,1]`: x runs left to right and y bottom to top.
Existing `data` is explicit or inferred; empty data is supported. `coordinate` follows Cartesian encoding inference.
Plot space rejects `source` and `temporalUnit`. A named `<id>-<axis>` linear scale has domain `[0,1]` and automatic range.
An equivalent scale is reused; a conflicting definition fails. Named scales remain after mark removal.

The default ID is `referenceLine`; a second line needs an explicit ID. Defaults: stroke `#64748b`, width `1`,
dash `"dashed"`, opacity `1`. Lower `encodeX/Y`, `editRuleMark`, `editScale`, and `removeMark` own later changes.
Source binding is selected at creation, so rebinding or removing the source does not rebind or remove the reference.
The shared scale still drives both marks. Add text with `createMarkLabels({ source: id, value: "Target" })`.
[Reference marks](../../api/marks/rule.md#reference-lines-and-bands)

## `createReferenceBand`

```javascript
createReferenceBand({ id?, x?, y?, space?, source?, data?, coordinate?, temporalUnit?, fill?, opacity?, stroke?, strokeWidth? })
```

Create one constant Rect spanning the other plot axis. Exactly one `x: [lower, upper]` or `y: [lower, upper]`
is required. Reversed endpoints produce positive bounds; equal endpoints produce no rectangle.
It uses the same data/plot binding rules as `createReferenceLine`, but data-space bands require quantitative
or temporal source positions. Plot endpoints must both be finite fractions in `[0,1]`.
The default ID is `referenceBand`, fill `#94a3b8`, opacity `0.15`, and stroke `false`.
To set `strokeWidth`, also provide a stroke color. Positions, appearance, scale, and removal remain editable through
`encodeX/Y/X2/Y2`, `editRectMark`, `editScale`, and `removeMark`. No extra dataset is created, and no `editReferenceBand`
is needed. Both reference facades are available in the full entry point.
[Reference marks](../../api/marks/rule.md#reference-lines-and-bands)

## `createMarkLabels`

```javascript
createMarkLabels({ id?, source?, field?, value?, content?, normalizeBy?, format?, fill?, opacity?, fontSize?, fontFamily?, fontWeight?, align?, baseline?, rotation?, dx?, dy?, layout? } = {})
```

Create final-item labels on an existing mark through text creation, encoding, and
optional collision layout. The default content is the source's semantic value;
Point/Rule/Rect require a field or constant. The default ID is `<source>-labels`.
[Text marks](../../api/marks/text.md)

## `createAnnotation`

```javascript
createAnnotation({ id?, text, format?, source?, x?, y?, space?, data?, coordinate?, fill?, opacity?, fontSize?, fontFamily?, fontWeight?, align?, baseline?, rotation?, dx?, dy?, layout? })
```

Create constant text through one explicit anchor branch. Omit x/y/space for a
final-item mark anchor; `source` selects the mark, otherwise current/unique mark
inference applies. Provide both x and y for a data anchor; `source` selects one
complete Cartesian layer whose data, coordinate, scales, field types, and temporal
units are reused. The annotation participates in automatic domains without becoming
a source-owned label.

With `space: "plot"`, x and y are finite fractions in `[0,1]`, where x=0 is left
and y=0 is bottom. Existing `data` is explicit or inferred, and `coordinate` is
optional. Plot anchors reject `source` and use ordinary `<id>-x`/`<id>-y` linear
scales with domain `[0,1]`. The default ID is `annotation`.

Omit `layout` or pass `false` to retain the exact anchor. A layout object accepts
`layoutLabels` options except `target`. Later changes use `encodeText`, `encodeX/Y`,
`editTextMark`, `layoutLabels`, `removeLabelLayout`, `editScale`, and `removeMark`.
[Text marks](../../api/marks/text.md#createannotationoptions)

## `createTextMark`

```javascript
createTextMark({ id?, data?, source?, text?, fill?, opacity?, fontSize?, fontFamily?, fontWeight?, align?, baseline?, rotation?, dx?, dy? } = {})
```

Create a semantic text layer. Omitted data and position attach to the current
or unique compatible point, bar, rect, rule, or arc layer. Arc text anchors at
sector centers. `text` is constant-content shorthand. Source-owned text follows final source positions and never
contributes independent scale-domain values. Source field or scale changes also drive its labels and guides.
Direct `encodeX/Y` on attached Text is rejected: edit the source, use `editTextMark({ dx, dy })`, or create
independent Text with explicit `data` to author its positions. Independent Text accepts field or datum positions;
all-constant x/y/text produces one item, while any field-bound encoding uses row grain.
[Text marks](../../api/marks/text.md)

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
| `encodeX` | point, line, area, bar, rect, rule, tick, text | point/bar/rect/rule/tick/text: quantitative, temporal, ordinal, nominal; line/area: quantitative, temporal | field; rule, area, rect, and independent text also accept datum; bar accepts aggregate or bin |
| `encodeY` | point, line, area, bar, rect, rule, tick, text | point/line/bar/rect/rule/tick/text: quantitative, temporal, ordinal, nominal; area: quantitative, temporal | field; rule, area, rect, and independent text also accept datum; bar accepts aggregate or count |
| `encodeX2` / `encodeY2` | area, ranged bar, rect, rule | area/ranged bar/rect/rule: matching primary | secondary field; rule, area, and rect also accept datum |
| `encodeTheta` | point, line, arc | point/line: quantitative, temporal, ordinal, nominal; arc: quantitative, ordinal, nominal | arc maps direct quantitative values, category counts, or category-weighted sums to proportional sectors |
| `encodeR` | point, line, arc | point/line/arc: quantitative | radial position; arc combines it with a categorical theta band |
| `encodeParallelCoordinates` | line | line: quantitative, ordinal | atomic ordered dimensions; one namespaced scale and axis per dimension |
<!-- action-capabilities:position:end -->

Temporal input branches accept `temporalUnit: "auto" | "year" | "timestamp"`.
Timestamp means Unix milliseconds; year means UTC January 1. Omission preserves
the existing parser. Same-binding reassignment retains an explicit unit; a new
binding clears it. Domains and tick values are already normalized timestamps.
[Temporal input](../../api/position/temporal.md)

## Related

[Action Reference](../actions.md) · [Chart API](../../api/index.md) · [Supported Features](../../supported-features.md)
