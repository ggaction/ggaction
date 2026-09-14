---
layout: default
title: Mark Actions
description: Create, edit, jitter, and remove semantic chart marks.
---

# Mark Actions

Each declared action has an exact signature and its own stable link. Option tables are generated from types; behavior prose names the owning workflow and its constraints. API layers and [H0–H4 catalog role tags](../../tutorials/hierarchical-authoring.md#catalog-role-tags) are independent classifications. Relative action hierarchy is determined by composition, not by a tag or fixed trace depth.

## `createPointMark`

**API layer:** user-facing. **Authoring roles:** H2.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
createPointMark(options?: StrokeStyleDetails & { id?: string; data?: string; shape?: PointShape; fill?: string; opacity?: number; stroke?: FilledMarkStroke; strokeWidth?: number; }): ChartProgram;
```

Named option contracts: [`StrokeStyleDetails`](./../types.md#type-strokestyledetails) · [`PointShape`](./../types.md#type-pointshape) · [`FilledMarkStroke`](./../types.md#type-filledmarkstroke).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `lineCap` | Optional / branch-dependent | `"butt" \| "round" \| "square" \| undefined` |
| `lineJoin` | Optional / branch-dependent | `"bevel" \| "miter" \| "round" \| undefined` |
| `miterLimit` | Optional / branch-dependent | `number \| undefined` |
| `id` | Optional / branch-dependent | `string \| undefined` |
| `data` | Optional / branch-dependent | `string \| undefined` |
| `shape` | Optional / branch-dependent | `PointShape \| undefined` |
| `fill` | Optional / branch-dependent | `string \| undefined` |
| `opacity` | Optional / branch-dependent | `number \| undefined` |
| `stroke` | Optional / branch-dependent | `FilledMarkStroke \| undefined` |
| `strokeWidth` | Optional / branch-dependent | `number \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
createPointMark({ id?, data?, shape?, fill?, opacity?, stroke?, strokeWidth? } = {})
```

Create a semantic point mark with one of 12 equal-area shape realizations.
`stroke: false` disables the outline and its width at creation. [Marks](../../api/marks.md)


## `createTickMark`

**API layer:** user-facing. **Authoring roles:** H2.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
createTickMark(options?: StrokeStyleDetails & { id?: string; data?: string; length?: number; stroke?: string; strokeWidth?: number; opacity?: number; }): ChartProgram;
```

Named option contracts: [`StrokeStyleDetails`](./../types.md#type-strokestyledetails).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `lineCap` | Optional / branch-dependent | `"butt" \| "round" \| "square" \| undefined` |
| `lineJoin` | Optional / branch-dependent | `"bevel" \| "miter" \| "round" \| undefined` |
| `miterLimit` | Optional / branch-dependent | `number \| undefined` |
| `id` | Optional / branch-dependent | `string \| undefined` |
| `data` | Optional / branch-dependent | `string \| undefined` |
| `length` | Optional / branch-dependent | `number \| undefined` |
| `stroke` | Optional / branch-dependent | `string \| undefined` |
| `strokeWidth` | Optional / branch-dependent | `number \| undefined` |
| `opacity` | Optional / branch-dependent | `number \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
createTickMark({ id?, data?, length?, stroke?, strokeWidth?, opacity? } = {})
```

Create a centered line glyph that materializes after both x and y are complete.
Length defaults to `14`; stroke width defaults to `2`. [Marks](../../api/marks.md)


## `createReferenceLine`

**API layer:** user-facing. **Authoring roles:** H1, H2.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
createReferenceLine(options: CreateReferenceLineOptions): ChartProgram;
```

Named option contracts: [`CreateReferenceLineOptions`](./../types.md#type-createreferencelineoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `id` | Optional / branch-dependent | `string \| undefined` |
| `source` | Optional / branch-dependent | `string \| undefined` |
| `x` | Optional / branch-dependent | `unknown` |
| `y` | Optional / branch-dependent | `unknown` |
| `space` | Optional / branch-dependent | `"data" \| "plot" \| undefined` |
| `data` | Optional / branch-dependent | `string \| undefined` |
| `coordinate` | Optional / branch-dependent | `string \| undefined` |
| `temporalUnit` | Optional / branch-dependent | `TemporalInputUnit \| undefined` |
| `stroke` | Optional / branch-dependent | `string \| undefined` |
| `strokeWidth` | Optional / branch-dependent | `number \| undefined` |
| `strokeDash` | Optional / branch-dependent | `DashPattern \| DashStyle \| undefined` |
| `opacity` | Optional / branch-dependent | `number \| undefined` |
| `lineCap` | Optional / branch-dependent | `"butt" \| "round" \| "square" \| undefined` |
| `lineJoin` | Optional / branch-dependent | `"bevel" \| "miter" \| "round" \| undefined` |
| `miterLimit` | Optional / branch-dependent | `number \| undefined` |
| `axis` | Optional / branch-dependent | `"x" \| "y"` |
| `population` | Optional / branch-dependent | `"boundData" \| "visibleItems" \| undefined` |
| `field` | Optional / branch-dependent | `string \| undefined` |
| `statistic` | Optional / branch-dependent | `ReferenceStatistic` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

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

**API layer:** user-facing. **Authoring roles:** H1, H2.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
createReferenceBand(options: CreateReferenceBandOptions): ChartProgram;
```

Named option contracts: [`CreateReferenceBandOptions`](./../types.md#type-createreferencebandoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `id` | Optional / branch-dependent | `string \| undefined` |
| `source` | Optional / branch-dependent | `string \| undefined` |
| `x` | Optional / branch-dependent | `readonly [unknown, unknown] \| readonly [number, number] \| undefined` |
| `y` | Optional / branch-dependent | `readonly [unknown, unknown] \| readonly [number, number] \| undefined` |
| `space` | Optional / branch-dependent | `"data" \| "plot" \| undefined` |
| `data` | Optional / branch-dependent | `string \| undefined` |
| `coordinate` | Optional / branch-dependent | `string \| undefined` |
| `temporalUnit` | Optional / branch-dependent | `TemporalInputUnit \| undefined` |
| `lineCap` | Optional / branch-dependent | `"butt" \| "round" \| "square" \| undefined` |
| `lineJoin` | Optional / branch-dependent | `"bevel" \| "miter" \| "round" \| undefined` |
| `miterLimit` | Optional / branch-dependent | `number \| undefined` |
| `cornerRadius` | Optional / branch-dependent | `number \| undefined` |
| `fill` | Optional / branch-dependent | `string \| undefined` |
| `opacity` | Optional / branch-dependent | `number \| undefined` |
| `stroke` | Optional / branch-dependent | `string \| false \| undefined` |
| `strokeWidth` | Optional / branch-dependent | `number \| undefined` |
| `axis` | Optional / branch-dependent | `"x" \| "y"` |
| `population` | Optional / branch-dependent | `"boundData" \| "visibleItems" \| undefined` |
| `field` | Optional / branch-dependent | `string \| undefined` |
| `statistics` | Optional / branch-dependent | `readonly [ReferenceStatistic, ReferenceStatistic]` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

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

**API layer:** user-facing. **Authoring roles:** H1, H2.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
createMarkLabels(options?: CreateMarkLabelsOptions): ChartProgram;
```

Named option contracts: [`CreateMarkLabelsOptions`](./../types.md#type-createmarklabelsoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `id` | Optional / branch-dependent | `string \| undefined` |
| `source` | Optional / branch-dependent | `string \| undefined` |
| `fill` | Optional / branch-dependent | `string \| undefined` |
| `opacity` | Optional / branch-dependent | `number \| undefined` |
| `fontSize` | Optional / branch-dependent | `number \| undefined` |
| `fontFamily` | Optional / branch-dependent | `string \| undefined` |
| `fontWeight` | Optional / branch-dependent | `string \| number \| undefined` |
| `align` | Optional / branch-dependent | `"center" \| "end" \| "left" \| "right" \| "start" \| undefined` |
| `baseline` | Optional / branch-dependent | `"alphabetic" \| "bottom" \| "hanging" \| "ideographic" \| "middle" \| "top" \| undefined` |
| `rotation` | Optional / branch-dependent | `RotationInput \| undefined` |
| `dx` | Optional / branch-dependent | `number \| undefined` |
| `dy` | Optional / branch-dependent | `number \| undefined` |
| `layout` | Optional / branch-dependent | `false \| Omit<LabelLayoutOptions, "target"> \| undefined` |
| `placement` | Optional / branch-dependent | `MarkLabelPlacement \| undefined` |
| `format` | Optional / branch-dependent | `ValueFormat \| undefined` |
| `field` | Optional / branch-dependent | `string \| undefined` |
| `value` | Optional / branch-dependent | `unknown` |
| `content` | Optional / branch-dependent | `"category" \| "share" \| "value" \| undefined` |
| `normalizeBy` | Optional / branch-dependent | `"category" \| "source" \| undefined` |
| `select` | Optional / branch-dependent | `MarkSelector \| undefined` |
| `selection` | Optional / branch-dependent | `string \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
createMarkLabels({ id?, source?, field?, value?, content?, normalizeBy?, format?, fill?, opacity?, fontSize?, fontFamily?, fontWeight?, align?, baseline?, rotation?, dx?, dy?, layout?, placement?, select?, selection? } = {})
```

Create final-item labels on an existing mark through text creation, encoding, and
optional collision layout. The default content is the source's semantic value;
Point/Line/Rule/Rect require a field or constant. A Line creates one label per
series at its final path coordinate. The default ID is `<source>-labels`.
Omit `select` and `selection` to label every final item. Pass `select: MarkSelector`
for an inline predicate or `selection: id` for a live stored selection on the same
source. Empty matches are valid, and selected labels keep source item order.
Semantic content is computed before membership filtering, so a selected share label
keeps its percentage of the complete source.
`placement` applies the semantic boundary policy described below during creation.
[Text marks](../../api/marks/text.md)


## `editMarkLabelSelection`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Development; added after v0.0.13. See [release compatibility](../../version.md).

```typescript
editMarkLabelSelection(options: EditMarkLabelSelectionOptions): ChartProgram;
```

Named option contracts: [`EditMarkLabelSelectionOptions`](./../types.md#type-editmarklabelselectionoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `target` | Required | `string` |
| `select` | Optional / branch-dependent | `MarkSelector \| undefined` |
| `selection` | Optional / branch-dependent | `string \| undefined` |
| `all` | Optional / branch-dependent | `true \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
editMarkLabelSelection({ target, select })
editMarkLabelSelection({ target, selection })
editMarkLabelSelection({ target, all: true })
```

Replace one attached label layer's final-item membership. Exactly one replacement
branch is required and `target` is never inferred. Inline selectors reuse
`MarkSelector`; named selections must target the same source mark. Selection edits
replay named labels, while selection removal is rejected until dependent labels are
rebound with this action or removed.
[Text marks](../../api/marks/text.md#editmarklabelselectionoptions)


## `editMarkLabelPlacement`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Development; added after v0.0.13. See [release compatibility](../../version.md).

```typescript
editMarkLabelPlacement(options: EditMarkLabelPlacementOptions): ChartProgram;
```

Named option contracts: [`EditMarkLabelPlacementOptions`](./../types.md#type-editmarklabelplacementoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `target` | Required | `string` |
| `placement` | Required | `"auto" \| MarkLabelPlacement` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
editMarkLabelPlacement({ target, placement: { anchor, gap?, overflow?, leader? } })
editMarkLabelPlacement({ target, placement: "auto" })
```

Replace semantic placement for one attached label layer. `anchor` is `center`,
`insideStart`, `insideEnd`, `outsideStart`, or `outsideEnd`; `gap` defaults to 4 pixels.
For inside anchors, `overflow` defaults to `hide`, can retry once outside with `outside`,
or can retain an overlong label with `allow`. Optional owned leaders connect the source
boundary to the final text box and replay after collision layout. Bar, directed Rect,
Arc, Cartesian Point, and Polar Point sources are supported. Line keeps endpoint layout,
Rule is rejected, and conflicting placement/collision leaders fail atomically.
Arc outside-start labels hide instead of crossing the Polar center unless `overflow: "allow"`
is explicit.
Pass `"auto"` to restore the legacy source anchor and remove the owned placement leader.
[Text marks](../../api/marks/text.md#editmarklabelplacementoptions)


## `removeMarkLabels`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Development; added after v0.0.13. See [release compatibility](../../version.md).

```typescript
removeMarkLabels(options: RemoveMarkLabelsOptions): ChartProgram;
```

Named option contracts: [`RemoveMarkLabelsOptions`](./../types.md#type-removemarklabelsoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `target` | Optional / branch-dependent | `string \| undefined` |
| `source` | Optional / branch-dependent | `string \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
removeMarkLabels({ target })
removeMarkLabels({ source })
```

Remove one attached label layer by ID, or every attached label owned by a source
mark. Exactly one selector is required. The source mark, its selections, and
unrelated labels remain. Label layout policies, generated leaders, and interaction
state attached to removed labels are cleaned up, so later source, scale, Canvas,
and theme edits do not recreate them. Independent Text and annotations continue
to use `removeMark`.
[Text marks](../../api/marks/text.md#removemarklabelsoptions)


## `createAnnotation`

**API layer:** user-facing. **Authoring roles:** H1, H2.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
createAnnotation(options: CreateAnnotationOptions): ChartProgram;
```

Named option contracts: [`CreateAnnotationOptions`](./../types.md#type-createannotationoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `fill` | Optional / branch-dependent | `string \| undefined` |
| `opacity` | Optional / branch-dependent | `number \| undefined` |
| `fontSize` | Optional / branch-dependent | `number \| undefined` |
| `fontFamily` | Optional / branch-dependent | `string \| undefined` |
| `fontWeight` | Optional / branch-dependent | `string \| number \| undefined` |
| `align` | Optional / branch-dependent | `"center" \| "end" \| "left" \| "right" \| "start" \| undefined` |
| `baseline` | Optional / branch-dependent | `"alphabetic" \| "bottom" \| "hanging" \| "ideographic" \| "middle" \| "top" \| undefined` |
| `rotation` | Optional / branch-dependent | `RotationInput \| undefined` |
| `dx` | Optional / branch-dependent | `number \| undefined` |
| `dy` | Optional / branch-dependent | `number \| undefined` |
| `id` | Optional / branch-dependent | `string \| undefined` |
| `text` | Required | `unknown` |
| `format` | Optional / branch-dependent | `ValueFormat \| undefined` |
| `layout` | Optional / branch-dependent | `false \| Omit<LabelLayoutOptions, "target"> \| undefined` |
| `x` | Optional / branch-dependent | `unknown` |
| `y` | Optional / branch-dependent | `unknown` |
| `space` | Optional / branch-dependent | `"data" \| "plot" \| undefined` |
| `source` | Optional / branch-dependent | `string \| undefined` |
| `data` | Optional / branch-dependent | `string \| undefined` |
| `coordinate` | Optional / branch-dependent | `string \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

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

**API layer:** user-facing. **Authoring roles:** H2.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
createTextMark(options?: TextMarkOptions): ChartProgram;
```

Named option contracts: [`TextMarkOptions`](./../types.md#type-textmarkoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `id` | Optional / branch-dependent | `string \| undefined` |
| `data` | Optional / branch-dependent | `string \| undefined` |
| `source` | Optional / branch-dependent | `string \| undefined` |
| `text` | Optional / branch-dependent | `unknown` |
| `fill` | Optional / branch-dependent | `string \| undefined` |
| `opacity` | Optional / branch-dependent | `number \| undefined` |
| `fontSize` | Optional / branch-dependent | `number \| undefined` |
| `fontFamily` | Optional / branch-dependent | `string \| undefined` |
| `fontWeight` | Optional / branch-dependent | `string \| number \| undefined` |
| `align` | Optional / branch-dependent | `"center" \| "end" \| "left" \| "right" \| "start" \| undefined` |
| `baseline` | Optional / branch-dependent | `"alphabetic" \| "bottom" \| "hanging" \| "ideographic" \| "middle" \| "top" \| undefined` |
| `rotation` | Optional / branch-dependent | `RotationInput \| undefined` |
| `dx` | Optional / branch-dependent | `number \| undefined` |
| `dy` | Optional / branch-dependent | `number \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
createTextMark({ id?, data?, source?, text?, fill?, opacity?, fontSize?, fontFamily?, fontWeight?, align?, baseline?, rotation?, dx?, dy? } = {})
```

Create a semantic text layer. Omitted data and position attach to the current
or unique compatible point, bar, line, rect, rule, or arc layer. Line text anchors
at each series' final path coordinate; Arc text anchors at
sector centers. `text` is constant-content shorthand. Source-owned text follows final source positions and never
contributes independent scale-domain values. Source field or scale changes also drive its labels and guides.
Direct `encodeX/Y` on attached Text is rejected: edit the source, use `editTextMark({ dx, dy })`, or create
independent Text with explicit `data` to author its positions. Independent Text accepts field or datum positions;
all-constant x/y/text produces one item, while any field-bound encoding uses row grain.
`rotation` accepts a finite legacy number in radians or an explicit
`{ value, unit: "degrees" | "radians" }` object; both normalize to concrete
radians. `createMarkLabels`, `createAnnotation`, and `editTextMark` share this
input contract.
[Text marks](../../api/marks/text.md)


## `editTextMark`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
editTextMark(options: EditTextMarkOptions): ChartProgram;
```

Named option contracts: [`EditTextMarkOptions`](./../types.md#type-edittextmarkoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `target` | Optional / branch-dependent | `string \| undefined` |
| `fill` | Optional / branch-dependent | `string \| undefined` |
| `opacity` | Optional / branch-dependent | `number \| undefined` |
| `fontSize` | Optional / branch-dependent | `number \| undefined` |
| `fontFamily` | Optional / branch-dependent | `string \| undefined` |
| `fontWeight` | Optional / branch-dependent | `string \| number \| undefined` |
| `align` | Optional / branch-dependent | `"center" \| "end" \| "left" \| "right" \| "start" \| undefined` |
| `baseline` | Optional / branch-dependent | `"alphabetic" \| "bottom" \| "hanging" \| "ideographic" \| "middle" \| "top" \| undefined` |
| `rotation` | Optional / branch-dependent | `RotationInput \| undefined` |
| `dx` | Optional / branch-dependent | `number \| undefined` |
| `dy` | Optional / branch-dependent | `number \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
editTextMark({ target?, fill?, opacity?, fontSize?, fontFamily?, fontWeight?, align?, baseline?, rotation?, dx?, dy? })
```

Edit text typography and graphical offsets without changing its semantic
source or position. [Text marks](../../api/marks/text.md)


## `layoutLabels`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
layoutLabels(options?: LabelLayoutOptions): ChartProgram;
```

Named option contracts: [`LabelLayoutOptions`](./../types.md#type-labellayoutoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `target` | Optional / branch-dependent | `string \| undefined` |
| `axis` | Optional / branch-dependent | `LabelLayoutAxis \| undefined` |
| `padding` | Optional / branch-dependent | `number \| undefined` |
| `maxDisplacement` | Optional / branch-dependent | `number \| undefined` |
| `bounds` | Optional / branch-dependent | `LabelLayoutBounds \| undefined` |
| `leader` | Optional / branch-dependent | `false \| LabelLeaderOptions \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
layoutLabels({ target?, axis?, padding?, maxDisplacement?, bounds?, leader? } = {})
```

Assign deterministic collision-aware placement to one complete text mark.
Displacement may use x, y, or both axes and remains inside plot or Canvas
bounds when possible. Optional leaders connect displaced labels to their
stored source anchors. Impossible layouts retain a stable best effort and a
warning summary. [Text marks](../../api/marks/text.md)


## `removeLabelLayout`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
removeLabelLayout(options?: RemoveLabelLayoutOptions): ChartProgram;
```

Named option contracts: [`RemoveLabelLayoutOptions`](./../types.md#type-removelabellayoutoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `target` | Optional / branch-dependent | `string \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

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


## `editPointMark`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
editPointMark(options: StrokeStyleDetails & { target?: string; shape?: PointShape; fill?: string; opacity?: number; stroke?: FilledMarkStroke; strokeWidth?: number; }): ChartProgram;
```

Named option contracts: [`StrokeStyleDetails`](./../types.md#type-strokestyledetails) · [`PointShape`](./../types.md#type-pointshape) · [`FilledMarkStroke`](./../types.md#type-filledmarkstroke).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `lineCap` | Optional / branch-dependent | `"butt" \| "round" \| "square" \| undefined` |
| `lineJoin` | Optional / branch-dependent | `"bevel" \| "miter" \| "round" \| undefined` |
| `miterLimit` | Optional / branch-dependent | `number \| undefined` |
| `target` | Optional / branch-dependent | `string \| undefined` |
| `shape` | Optional / branch-dependent | `PointShape \| undefined` |
| `fill` | Optional / branch-dependent | `string \| undefined` |
| `opacity` | Optional / branch-dependent | `number \| undefined` |
| `stroke` | Optional / branch-dependent | `FilledMarkStroke \| undefined` |
| `strokeWidth` | Optional / branch-dependent | `number \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
editPointMark({ target?, shape?, fill?, opacity?, stroke?, strokeWidth? })
```

Change constant point shape, fill, opacity, or outline appearance and rematerialize its concrete items.
`stroke: false` disables the outline and its width. [Marks](../../api/marks.md)


## `editTickMark`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
editTickMark(options: StrokeStyleDetails & { target?: string; length?: number; stroke?: string; strokeWidth?: number; opacity?: number; }): ChartProgram;
```

Named option contracts: [`StrokeStyleDetails`](./../types.md#type-strokestyledetails).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `lineCap` | Optional / branch-dependent | `"butt" \| "round" \| "square" \| undefined` |
| `lineJoin` | Optional / branch-dependent | `"bevel" \| "miter" \| "round" \| undefined` |
| `miterLimit` | Optional / branch-dependent | `number \| undefined` |
| `target` | Optional / branch-dependent | `string \| undefined` |
| `length` | Optional / branch-dependent | `number \| undefined` |
| `stroke` | Optional / branch-dependent | `string \| undefined` |
| `strokeWidth` | Optional / branch-dependent | `number \| undefined` |
| `opacity` | Optional / branch-dependent | `number \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
editTickMark({ target?, length?, stroke?, strokeWidth?, opacity? })
```

Partially edit Tick length or constant line appearance while preserving data,
position, and other assignments. [Marks](../../api/marks.md)


## `jitterPoints`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
jitterPoints(options: JitterPointsOptions): ChartProgram;
```

Named option contracts: [`JitterPointsOptions`](./../types.md#type-jitterpointsoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `target` | Optional / branch-dependent | `string \| undefined` |
| `channel` | Required | `"x" \| "y"` |
| `maxOffset` | Required | `JitterMaxOffset` |
| `seed` | Optional / branch-dependent | `string \| number \| undefined` |
| `key` | Optional / branch-dependent | `string \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
jitterPoints({ target?, channel, maxOffset, seed?, key? })
```

Assign deterministic bounded graphical jitter to one Cartesian point mark. Use
exactly one of `maxOffset.pixels` or `maxOffset.band`; calling the action again
replaces the previous policy from the semantic base positions. [Point marks](../../api/marks/point.md)


## `removeJitter`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
removeJitter(options?: RemoveJitterOptions): ChartProgram;
```

Named option contracts: [`RemoveJitterOptions`](./../types.md#type-removejitteroptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `target` | Optional / branch-dependent | `string \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
removeJitter({ target? } = {})
```

Remove the target point mark's jitter assignment and restore positions derived
directly from its semantic encodings. [Point marks](../../api/marks/point.md)


## `packPoints`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
packPoints(options: PackPointsOptions): ChartProgram;
```

Named option contracts: [`PackPointsOptions`](./../types.md#type-packpointsoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `target` | Optional / branch-dependent | `string \| undefined` |
| `channel` | Required | `"x" \| "y"` |
| `maxOffset` | Optional / branch-dependent | `PointPackingMaxOffset \| undefined` |
| `padding` | Optional / branch-dependent | `number \| undefined` |
| `key` | Optional / branch-dependent | `string \| undefined` |
| `overflow` | Optional / branch-dependent | `"error" \| "overlap" \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
packPoints({ target?, channel, maxOffset?, padding?, key?, overflow? })
```

Deterministically displace Point glyphs only on a categorical x or y axis to
avoid overlap while preserving measure coordinates. The default overflow policy
fails atomically; `"overlap"` records unresolved best-effort placements.
[Point marks](../../api/marks/point.md)


## `removePointPacking`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
removePointPacking(options?: RemovePointPackingOptions): ChartProgram;
```

Named option contracts: [`RemovePointPackingOptions`](./../types.md#type-removepointpackingoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `target` | Optional / branch-dependent | `string \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
removePointPacking({ target? } = {})
```

Remove stored point packing and rematerialize the current semantic scale
positions. [Point marks](../../api/marks/point.md)


## `removeMark`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
removeMark(options?: RemoveMarkOptions): ChartProgram;
```

Named option contracts: [`RemoveMarkOptions`](./../types.md#type-removemarkoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `target` | Optional / branch-dependent | `string \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
removeMark({ target? })
```

Remove one stable mark owner and its owned state while preserving source data
and independently shared resources. [Marks](../../api/marks.md)


## `createLineMark`

**API layer:** user-facing. **Authoring roles:** H2.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
createLineMark(options?: StrokeStyleDetails & { id?: string; data?: string; strokeWidth?: number; curve?: CurveInterpolation; stroke?: string; opacity?: number; closed?: boolean; }): ChartProgram;
```

Named option contracts: [`StrokeStyleDetails`](./../types.md#type-strokestyledetails) · [`CurveInterpolation`](./../types.md#type-curveinterpolation).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `lineCap` | Optional / branch-dependent | `"butt" \| "round" \| "square" \| undefined` |
| `lineJoin` | Optional / branch-dependent | `"bevel" \| "miter" \| "round" \| undefined` |
| `miterLimit` | Optional / branch-dependent | `number \| undefined` |
| `id` | Optional / branch-dependent | `string \| undefined` |
| `data` | Optional / branch-dependent | `string \| undefined` |
| `strokeWidth` | Optional / branch-dependent | `number \| undefined` |
| `curve` | Optional / branch-dependent | `CurveInterpolation \| undefined` |
| `stroke` | Optional / branch-dependent | `string \| undefined` |
| `opacity` | Optional / branch-dependent | `number \| undefined` |
| `closed` | Optional / branch-dependent | `boolean \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

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

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
editLineMark(options: StrokeStyleDetails & { target?: string; strokeWidth?: number; curve?: CurveInterpolation; stroke?: string; opacity?: number; closed?: boolean; }): ChartProgram;
```

Named option contracts: [`StrokeStyleDetails`](./../types.md#type-strokestyledetails) · [`CurveInterpolation`](./../types.md#type-curveinterpolation).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `lineCap` | Optional / branch-dependent | `"butt" \| "round" \| "square" \| undefined` |
| `lineJoin` | Optional / branch-dependent | `"bevel" \| "miter" \| "round" \| undefined` |
| `miterLimit` | Optional / branch-dependent | `number \| undefined` |
| `target` | Optional / branch-dependent | `string \| undefined` |
| `strokeWidth` | Optional / branch-dependent | `number \| undefined` |
| `curve` | Optional / branch-dependent | `CurveInterpolation \| undefined` |
| `stroke` | Optional / branch-dependent | `string \| undefined` |
| `opacity` | Optional / branch-dependent | `number \| undefined` |
| `closed` | Optional / branch-dependent | `boolean \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
editLineMark({ target?, stroke?, strokeWidth?, opacity?, curve?, closed? })
```

Edit line appearance and rematerialize concrete path commands without changing
semantic encodings. [Marks](../../api/marks.md)


## `createBarMark`

**API layer:** user-facing. **Authoring roles:** H2.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
createBarMark(options?: RectStyleDetails & { id?: string; data?: string; fill?: string; opacity?: number; stroke?: FilledMarkStroke; strokeWidth?: number; }): ChartProgram;
```

Named option contracts: [`RectStyleDetails`](./../types.md#type-rectstyledetails) · [`FilledMarkStroke`](./../types.md#type-filledmarkstroke).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `lineCap` | Optional / branch-dependent | `"butt" \| "round" \| "square" \| undefined` |
| `lineJoin` | Optional / branch-dependent | `"bevel" \| "miter" \| "round" \| undefined` |
| `miterLimit` | Optional / branch-dependent | `number \| undefined` |
| `cornerRadius` | Optional / branch-dependent | `number \| undefined` |
| `id` | Optional / branch-dependent | `string \| undefined` |
| `data` | Optional / branch-dependent | `string \| undefined` |
| `fill` | Optional / branch-dependent | `string \| undefined` |
| `opacity` | Optional / branch-dependent | `number \| undefined` |
| `stroke` | Optional / branch-dependent | `FilledMarkStroke \| undefined` |
| `strokeWidth` | Optional / branch-dependent | `number \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
createBarMark({ id?, data?, fill?, opacity?, stroke?, strokeWidth? } = {})
```

Create a semantic bar mark and empty rect collection.
`stroke: false` disables the outline and its width at creation. [Marks](../../api/marks.md)


## `editBarMark`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
editBarMark(options: RectStyleDetails & { target?: string; fill?: string; opacity?: number; stroke?: FilledMarkStroke; strokeWidth?: number; }): ChartProgram;
```

Named option contracts: [`RectStyleDetails`](./../types.md#type-rectstyledetails) · [`FilledMarkStroke`](./../types.md#type-filledmarkstroke).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `lineCap` | Optional / branch-dependent | `"butt" \| "round" \| "square" \| undefined` |
| `lineJoin` | Optional / branch-dependent | `"bevel" \| "miter" \| "round" \| undefined` |
| `miterLimit` | Optional / branch-dependent | `number \| undefined` |
| `cornerRadius` | Optional / branch-dependent | `number \| undefined` |
| `target` | Optional / branch-dependent | `string \| undefined` |
| `fill` | Optional / branch-dependent | `string \| undefined` |
| `opacity` | Optional / branch-dependent | `number \| undefined` |
| `stroke` | Optional / branch-dependent | `FilledMarkStroke \| undefined` |
| `strokeWidth` | Optional / branch-dependent | `number \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
editBarMark({ target?, fill?, opacity?, stroke?, strokeWidth? })
```

Edit whole-bar appearance and rematerialize every concrete rectangle.
`stroke: false` removes the visible outline; constant fill conflicts with a
field-driven color encoding. [Marks](../../api/marks.md)


## `createAreaMark`

**API layer:** user-facing. **Authoring roles:** H2.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
createAreaMark(options?: StrokeStyleDetails & { id?: string; data?: string; fill?: string; opacity?: number; stroke?: string; strokeWidth?: number; curve?: CurveInterpolation; missing?: "error" | "break"; }): ChartProgram;
```

Named option contracts: [`StrokeStyleDetails`](./../types.md#type-strokestyledetails) · [`CurveInterpolation`](./../types.md#type-curveinterpolation).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `lineCap` | Optional / branch-dependent | `"butt" \| "round" \| "square" \| undefined` |
| `lineJoin` | Optional / branch-dependent | `"bevel" \| "miter" \| "round" \| undefined` |
| `miterLimit` | Optional / branch-dependent | `number \| undefined` |
| `id` | Optional / branch-dependent | `string \| undefined` |
| `data` | Optional / branch-dependent | `string \| undefined` |
| `fill` | Optional / branch-dependent | `string \| undefined` |
| `opacity` | Optional / branch-dependent | `number \| undefined` |
| `stroke` | Optional / branch-dependent | `string \| undefined` |
| `strokeWidth` | Optional / branch-dependent | `number \| undefined` |
| `curve` | Optional / branch-dependent | `CurveInterpolation \| undefined` |
| `missing` | Optional / branch-dependent | `"break" \| "error" \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
createAreaMark({ id?, data?, fill?, opacity?, stroke?, strokeWidth?, curve?, missing? } = {})
```

Create a semantic area mark and empty path collection. Fixed fill defaults to
`"#4c78a8"`; opacity defaults to `0.2`. Optional outlines default to width `1`.
Curve defaults to `"linear"` and accepts the shared eight-value vocabulary.
[Marks](../../api/marks.md)

Area `missing` defaults to `"error"`. `"break"` splits null/undefined measured endpoints into closed segments with at least two samples; independent positions and nonfinite values remain strict. Density/Horizon missing policies are not reinterpreted.


## `createRuleMark`

**API layer:** user-facing. **Authoring roles:** H2.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
createRuleMark(options?: { id?: string; data?: string } & RuleStyleOptions): ChartProgram;
```

Named option contracts: [`RuleStyleOptions`](./../types.md#type-rulestyleoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `id` | Optional / branch-dependent | `string \| undefined` |
| `data` | Optional / branch-dependent | `string \| undefined` |
| `stroke` | Optional / branch-dependent | `string \| undefined` |
| `strokeWidth` | Optional / branch-dependent | `number \| undefined` |
| `strokeDash` | Optional / branch-dependent | `DashPattern \| DashStyle \| undefined` |
| `opacity` | Optional / branch-dependent | `number \| undefined` |
| `lineCap` | Optional / branch-dependent | `"butt" \| "round" \| "square" \| undefined` |
| `lineJoin` | Optional / branch-dependent | `"bevel" \| "miter" \| "round" \| undefined` |
| `miterLimit` | Optional / branch-dependent | `number \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
createRuleMark({ id?, data?, stroke?, strokeWidth?, strokeDash?, opacity? } = {})
```

Create a semantic rule mark and empty line collection. The first omitted ID is
`"rule"`; data defaults to current data. [Marks](../../api/marks.md)


## `editRuleMark`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
editRuleMark(options: { target?: string } & RuleStyleOptions): ChartProgram;
```

Named option contracts: [`RuleStyleOptions`](./../types.md#type-rulestyleoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `target` | Optional / branch-dependent | `string \| undefined` |
| `stroke` | Optional / branch-dependent | `string \| undefined` |
| `strokeWidth` | Optional / branch-dependent | `number \| undefined` |
| `strokeDash` | Optional / branch-dependent | `DashPattern \| DashStyle \| undefined` |
| `opacity` | Optional / branch-dependent | `number \| undefined` |
| `lineCap` | Optional / branch-dependent | `"butt" \| "round" \| "square" \| undefined` |
| `lineJoin` | Optional / branch-dependent | `"bevel" \| "miter" \| "round" \| undefined` |
| `miterLimit` | Optional / branch-dependent | `number \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
editRuleMark({ target?, stroke?, strokeWidth?, strokeDash?, opacity? })
```

Edit constant Rule appearance through the four existing encoding owners. At least
one style is required; field appearance conflicts with scalar editing. Creation
accepts the same styles. [Rule marks](../../api/marks/rule.md)


## `editAreaMark`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
editAreaMark(options: StrokeStyleDetails & { target?: string; fill?: string; opacity?: number; stroke?: string | false; strokeWidth?: number; curve?: CurveInterpolation; missing?: "error" | "break"; }): ChartProgram;
```

Named option contracts: [`StrokeStyleDetails`](./../types.md#type-strokestyledetails) · [`CurveInterpolation`](./../types.md#type-curveinterpolation).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `lineCap` | Optional / branch-dependent | `"butt" \| "round" \| "square" \| undefined` |
| `lineJoin` | Optional / branch-dependent | `"bevel" \| "miter" \| "round" \| undefined` |
| `miterLimit` | Optional / branch-dependent | `number \| undefined` |
| `target` | Optional / branch-dependent | `string \| undefined` |
| `fill` | Optional / branch-dependent | `string \| undefined` |
| `opacity` | Optional / branch-dependent | `number \| undefined` |
| `stroke` | Optional / branch-dependent | `string \| false \| undefined` |
| `strokeWidth` | Optional / branch-dependent | `number \| undefined` |
| `curve` | Optional / branch-dependent | `CurveInterpolation \| undefined` |
| `missing` | Optional / branch-dependent | `"break" \| "error" \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
editAreaMark({ target?, fill?, opacity?, stroke?, strokeWidth?, curve?, missing? })
```

Edit constant area appearance. `stroke: false` removes an existing outline.
[Marks](../../api/marks.md)


## `createArcMark`

**API layer:** user-facing. **Authoring roles:** H2.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
createArcMark(options?: StrokeStyleDetails & { id?: string; data?: string; innerRadius?: number; padAngle?: number; fill?: string; opacity?: number; stroke?: string; strokeWidth?: number; }): ChartProgram;
```

Named option contracts: [`StrokeStyleDetails`](./../types.md#type-strokestyledetails).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `lineCap` | Optional / branch-dependent | `"butt" \| "round" \| "square" \| undefined` |
| `lineJoin` | Optional / branch-dependent | `"bevel" \| "miter" \| "round" \| undefined` |
| `miterLimit` | Optional / branch-dependent | `number \| undefined` |
| `id` | Optional / branch-dependent | `string \| undefined` |
| `data` | Optional / branch-dependent | `string \| undefined` |
| `innerRadius` | Optional / branch-dependent | `number \| undefined` |
| `padAngle` | Optional / branch-dependent | `number \| undefined` |
| `fill` | Optional / branch-dependent | `string \| undefined` |
| `opacity` | Optional / branch-dependent | `number \| undefined` |
| `stroke` | Optional / branch-dependent | `string \| undefined` |
| `strokeWidth` | Optional / branch-dependent | `number \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
createArcMark({ id?, data?, innerRadius?, padAngle?, fill?, opacity?, stroke?, strokeWidth? } = {})
```

Create a semantic arc mark and empty closed-path collection. Direct
quantitative theta, category counts, or category-weighted sums materialize
proportional pie or donut sectors; categorical theta plus radius materializes
radial sectors. [Marks](../../api/marks/line-area.md#arc-marks)


## `editArcMark`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
editArcMark(options: StrokeStyleDetails & { target?: string; innerRadius?: number; padAngle?: number; fill?: string; opacity?: number; stroke?: string | false; strokeWidth?: number; }): ChartProgram;
```

Named option contracts: [`StrokeStyleDetails`](./../types.md#type-strokestyledetails).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `lineCap` | Optional / branch-dependent | `"butt" \| "round" \| "square" \| undefined` |
| `lineJoin` | Optional / branch-dependent | `"bevel" \| "miter" \| "round" \| undefined` |
| `miterLimit` | Optional / branch-dependent | `number \| undefined` |
| `target` | Optional / branch-dependent | `string \| undefined` |
| `innerRadius` | Optional / branch-dependent | `number \| undefined` |
| `padAngle` | Optional / branch-dependent | `number \| undefined` |
| `fill` | Optional / branch-dependent | `string \| undefined` |
| `opacity` | Optional / branch-dependent | `number \| undefined` |
| `stroke` | Optional / branch-dependent | `string \| false \| undefined` |
| `strokeWidth` | Optional / branch-dependent | `number \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
editArcMark({ target?, innerRadius?, padAngle?, fill?, opacity?, stroke?, strokeWidth? })
```

Edit arc geometry or appearance and rematerialize complete sector paths.
`stroke: false` disables the outline and its width.
[Marks](../../api/marks/line-area.md#arc-marks)


## `createRectMark`

**API layer:** user-facing. **Authoring roles:** H2.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
createRectMark(options?: RectMarkOptions): ChartProgram;
```

Named option contracts: [`RectMarkOptions`](./../types.md#type-rectmarkoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `id` | Optional / branch-dependent | `string \| undefined` |
| `data` | Optional / branch-dependent | `string \| undefined` |
| `fill` | Optional / branch-dependent | `string \| undefined` |
| `opacity` | Optional / branch-dependent | `number \| undefined` |
| `stroke` | Optional / branch-dependent | `string \| false \| undefined` |
| `strokeWidth` | Optional / branch-dependent | `number \| undefined` |
| `lineCap` | Optional / branch-dependent | `"butt" \| "round" \| "square" \| undefined` |
| `lineJoin` | Optional / branch-dependent | `"bevel" \| "miter" \| "round" \| undefined` |
| `miterLimit` | Optional / branch-dependent | `number \| undefined` |
| `cornerRadius` | Optional / branch-dependent | `number \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
createRectMark({ id?, data?, fill?, opacity?, stroke?, strokeWidth? } = {})
```

Create a semantic rect mark and empty rect collection. Two discrete x/y bands
or complete x/x2 and y/y2 endpoint pairs materialize observed cells. Rects do
not infer bar aggregation, baseline, stack, or width semantics.
[Rect marks](../../api/marks/rect.md)


## `editRectMark`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
editRectMark(options: EditRectMarkOptions): ChartProgram;
```

Named option contracts: [`EditRectMarkOptions`](./../types.md#type-editrectmarkoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `target` | Optional / branch-dependent | `string \| undefined` |
| `lineCap` | Optional / branch-dependent | `"butt" \| "round" \| "square" \| undefined` |
| `lineJoin` | Optional / branch-dependent | `"bevel" \| "miter" \| "round" \| undefined` |
| `miterLimit` | Optional / branch-dependent | `number \| undefined` |
| `cornerRadius` | Optional / branch-dependent | `number \| undefined` |
| `fill` | Optional / branch-dependent | `string \| undefined` |
| `opacity` | Optional / branch-dependent | `number \| undefined` |
| `stroke` | Optional / branch-dependent | `string \| false \| undefined` |
| `strokeWidth` | Optional / branch-dependent | `number \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
editRectMark({ target?, fill?, opacity?, stroke?, strokeWidth? })
```

Edit rect appearance and rematerialize complete cells. Constant fill conflicts
with field-driven color. `stroke: false` disables the outline.
[Rect marks](../../api/marks/rect.md)


## Related

[Action Reference](../actions.md) · [Chart API](../../api/index.md) · [Supported Features](../../supported-features.md)
