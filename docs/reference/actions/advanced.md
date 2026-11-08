---
layout: default
title: Advanced Chart Actions
description: Assign atomic channels and manage reusable final-item selections.
---

# Advanced Chart Actions

Each declared action has an exact signature and its own stable link. Option tables are generated from types; behavior prose names the owning workflow and its constraints. API layers and [H0–H4 catalog role tags](../../tutorials/hierarchical-authoring.md#catalog-role-tags) are independent classifications. Relative action hierarchy is determined by composition, not by a tag or fixed trace depth.

## `encodeChannels`

**API layer:** advanced. **Authoring roles:** H2.

**Availability:** Development; added after v0.0.13. See [release compatibility](../../version.md).

```typescript
encodeChannels(options: TargetedOptions<EncodeChannelsOptions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`EncodeChannelsOptions`](./../types.md#type-encodechannelsoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `target` | Required | `string \| ActionTargetList \| ScopedActionTarget` |
| `channels` | Required | `AtLeastOne<EncodingChannelAssignments>` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
encodeChannels({
  target,
  channels: {
    x?, y?, x2?, y2?, theta?, r?, xOffset?, yOffset?,
    group?, pathOrder?, color?, stroke?, size?, shape?, opacity?,
    strokeWidth?, strokeDash?, angle?, text?
  }
})
```

Atomically replace one or more encodings on one explicit mark. Each channel
uses the same options and validation as its focused `encode*` action, without a
nested `target`, `coordinate`, or `id`; a nested `scale.id` remains valid. The
request must contain at least one of the 19 listed keys. Omitted channels are
preserved, and `null` does not remove an encoding.

The action validates one final channel and scale state, then resolves affected
scales and rematerializes each target, shared-scale consumer, dependent mark,
and legend once. Channel object insertion order cannot change the result or
trace order. Conflicting explicit properties for a shared scale ID fail before
the original program changes. Rebound Cartesian axes keep their style and title;
coupled default ticks and labels switch between categorical domain values and
continuous count mode when the final scale family changes. Incompatible explicit
guide values or a continuous-only grid make the whole request fail atomically.
This advanced authoring action is available only
from `ggaction`; use the focused encoding actions from `ggaction/basic`.


## `setMarkVisibility`

**API layer:** advanced. **Authoring roles:** H3.

**Availability:** Development; added after v0.0.13. See [release compatibility](../../version.md).

```typescript
setMarkVisibility(options: TargetedOptions<MarkVisibilityOptions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`MarkVisibilityOptions`](./../types.md#type-markvisibilityoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `target` | Optional / branch-dependent | `string \| ActionTargetList \| ScopedActionTarget \| undefined` |
| `channel` | Required | `"color" \| "opacity" \| "shape" \| "size" \| "stroke" \| "strokeDash" \| "strokeWidth"` |
| `values` | Required | `readonly (string \| number \| boolean)[]` |
| `visible` | Required | `boolean` |
| `scaleDomain` | Required | `"all-data" \| "visible-data"` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```ts
setMarkVisibility({ target?, channel, values, visible, scaleDomain })
```

Advanced chart authoring. Hide or restore unique typed category values from an existing categorical legend block. `channel` selects that block; `visible` is boolean and `scaleDomain` must be `"visible-data"` or `"all-data"`. The target can be omitted only when the existing legend identifies one owner. Numeric and string categories remain distinct. Unknown values and unsupported blocks reject.

Visibility removes actual final items and preserves original row lineage. It composes after an existing user filter, and changing or removing that filter preserves the visibility intent. `all-data` uses the user-filtered input before visibility; `visible-data` uses the remaining items. Explicit scale domains keep precedence. The controlling categorical legend always retains its pre-visibility categories and mapping so hidden categories can be restored. Empty results retain valid domains. Full only.


## `removeMarkVisibility`

**API layer:** advanced. **Authoring roles:** H3.

**Availability:** Development; added after v0.0.13. See [release compatibility](../../version.md).

```typescript
removeMarkVisibility(options?: TargetedOptions<RemoveMarkVisibilityOptions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`RemoveMarkVisibilityOptions`](./../types.md#type-removemarkvisibilityoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `target` | Optional / branch-dependent | `string \| ActionTargetList \| ScopedActionTarget \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```ts
removeMarkVisibility({ target? })
```

Advanced chart authoring. Remove only the category visibility view, restore its user-filtered input and rematerialize dependent marks and guides. Omitted target follows the current eligible mark or unique active owner. A missing or ambiguous owner rejects. Source data, stored selections and the separate user filter remain intact. Full only.


## `selectMarks`

**API layer:** advanced. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
selectMarks(options: TargetedOptions<SelectMarksOptions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`SelectMarksOptions`](./../types.md#type-selectmarksoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `id` | Optional / branch-dependent | `string \| undefined` |
| `target` | Optional / branch-dependent | `string \| ActionTargetList \| ScopedActionTarget \| undefined` |
| `grain` | Optional / branch-dependent | `"item" \| "stack" \| undefined` |
| `where` | Optional / branch-dependent | `ComputedExpressionV2 \| undefined` |
| `items` | Optional / branch-dependent | `readonly string[] \| undefined` |
| `empty` | Optional / branch-dependent | `"all" \| "none" \| undefined` |
| `region` | Optional / branch-dependent | `SelectionRegion \| undefined` |
| `screenPolygon` | Optional / branch-dependent | `readonly { readonly x: number; readonly y: number; }[] \| undefined` |
| `screenAngles` | Optional / branch-dependent | `readonly [number, number] \| undefined` |
| `rows` | Optional / branch-dependent | `{ data: string; indices: readonly number[]; }` |
| `field` | Optional / branch-dependent | `string` |
| `channel` | Optional / branch-dependent | `"color" \| "group" \| "opacity" \| "radius" \| "shape" \| "size" \| "stroke" \| "strokeDash" \| "strokeWidth" \| "theta" \| "x" \| "x2" \| "xOffset" \| "y" \| "y2" \| "yOffset"` |
| `property` | Optional / branch-dependent | `MarkGraphicProperty` |
| `op` | Optional / branch-dependent | `"eq" \| "gt" \| "gte" \| "lt" \| "lte" \| "neq"` |
| `value` | Optional / branch-dependent | `unknown` |
| `values` | Optional / branch-dependent | `readonly unknown[]` |
| `count` | Optional / branch-dependent | `number \| undefined` |
| `groupBy` | Optional / branch-dependent | `string \| readonly string[] \| undefined` |
| `ties` | Optional / branch-dependent | `"all" \| "first" \| undefined` |
| `min` | Optional / branch-dependent | `FilterBound` |
| `max` | Optional / branch-dependent | `FilterBound \| undefined` |
| `inclusive` | Optional / branch-dependent | `boolean \| undefined` |
| `minInclusive` | Optional / branch-dependent | `boolean \| undefined` |
| `maxInclusive` | Optional / branch-dependent | `boolean \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
selectMarks({ id?, target?, ...selector })
```

Store a reusable semantic final-item selection without changing graphics.
Use `{ items: logicalKeys, empty?: "none" | "all" }` for opaque keys returned by
`getMarkItems` or interaction inspection; `empty` defaults to `"none"`.
Supported operators are `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `oneOf`,
`range`, `min`, and `max`. `grain` defaults to `"item"`; stacked bars also
support `"stack"`. Fields are data values, channels are pre-scale semantic
values, and properties are concrete graphical values. A range requires `min` or
`max` and accepts independent `minInclusive`/`maxInclusive` flags (default true),
or the existing `inclusive` shorthand. Do not mix the two forms.
[Mark selection and highlighting](../../api/appearance/selection-and-highlighting.md#mark-selection-and-highlighting)

Native `region` selectors use final position channels. A theta region or item-key selection
may retain normalized clockwise `screenAngles: [startRadians, endRadians]` metadata;
domain ranges or keys continue to determine membership.

Named selections also accept exclusive `where: ComputedExpressionV2` boolean
predicates over fields uniquely defined at final item grain. Parameter edits
refresh their named labels, highlights and conditional consumers together.
The inline highlight facade stores the same live selection. Inline label
selectors and mark filters keep their existing comparison grammar.
[Expression selections](../../api/appearance/selection-and-highlighting.md#selections-from-expressions)


## `editMarkSelection`

**API layer:** advanced. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
editMarkSelection(options: TargetedOptions<EditMarkSelectionOptions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`EditMarkSelectionOptions`](./../types.md#type-editmarkselectionoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `selection` | Optional / branch-dependent | `string \| undefined` |
| `mode` | Optional / branch-dependent | `"add" \| "intersect" \| "replace" \| "subtract" \| "toggle" \| undefined` |
| `grain` | Optional / branch-dependent | `"item" \| "stack" \| undefined` |
| `where` | Optional / branch-dependent | `ComputedExpressionV2 \| undefined` |
| `items` | Optional / branch-dependent | `readonly string[] \| undefined` |
| `empty` | Optional / branch-dependent | `"all" \| "none" \| undefined` |
| `region` | Optional / branch-dependent | `SelectionRegion \| undefined` |
| `screenPolygon` | Optional / branch-dependent | `readonly { readonly x: number; readonly y: number; }[] \| undefined` |
| `screenAngles` | Optional / branch-dependent | `readonly [number, number] \| undefined` |
| `rows` | Optional / branch-dependent | `{ data: string; indices: readonly number[]; }` |
| `field` | Optional / branch-dependent | `string` |
| `channel` | Optional / branch-dependent | `"color" \| "group" \| "opacity" \| "radius" \| "shape" \| "size" \| "stroke" \| "strokeDash" \| "strokeWidth" \| "theta" \| "x" \| "x2" \| "xOffset" \| "y" \| "y2" \| "yOffset"` |
| `property` | Optional / branch-dependent | `MarkGraphicProperty` |
| `op` | Optional / branch-dependent | `"eq" \| "gt" \| "gte" \| "lt" \| "lte" \| "neq"` |
| `value` | Optional / branch-dependent | `unknown` |
| `values` | Optional / branch-dependent | `readonly unknown[]` |
| `count` | Optional / branch-dependent | `number \| undefined` |
| `groupBy` | Optional / branch-dependent | `string \| readonly string[] \| undefined` |
| `ties` | Optional / branch-dependent | `"all" \| "first" \| undefined` |
| `min` | Optional / branch-dependent | `FilterBound` |
| `max` | Optional / branch-dependent | `FilterBound \| undefined` |
| `inclusive` | Optional / branch-dependent | `boolean \| undefined` |
| `minInclusive` | Optional / branch-dependent | `boolean \| undefined` |
| `maxInclusive` | Optional / branch-dependent | `boolean \| undefined` |
| `target` | Optional / branch-dependent | `ActionTargetList \| ScopedActionTarget` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
editMarkSelection({ selection?, mode?: "replace" | "add" | "toggle" | "subtract" | "intersect", ...selector })
```

Replace the complete selector by default, or combine its logical item keys with
`add`, `toggle`, `subtract`, or `intersect`. The selection ID and mark target remain. Dependent highlights and exact categorical legend reflection are
replayed from a clean baseline.
[Selection lifecycle](../../api/appearance/selection-and-highlighting.md#editing-and-removing-stored-intent)


## `removeMarkSelection`

**API layer:** advanced. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
removeMarkSelection(options?: TargetedOptions<RemoveMarkSelectionOptions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`RemoveMarkSelectionOptions`](./../types.md#type-removemarkselectionoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `selection` | Optional / branch-dependent | `string \| undefined` |
| `target` | Optional / branch-dependent | `ActionTargetList \| ScopedActionTarget` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
removeMarkSelection({ selection? } = {})
```

Release one stored selection after removing its dependent highlight. Other
selection and highlight assignments remain active.
[Selection lifecycle](../../api/appearance/selection-and-highlighting.md#editing-and-removing-stored-intent)


## Previous reference location {#reusable-mark-selections}

This contract moved: [open the current action or shared contract](./advanced.md#selectmarks).

## Previous reference location {#focused-channel-scale-editors}

This contract moved: [open the current action or shared contract](./charts-data.md#focused-channel-scale-editors).

## Previous reference location {#semantic-resources-and-regression-layers}

This contract moved: [open the current action or shared contract](./statistics.md#semantic-resources-and-regression-layers).

## Previous reference location {#createparallelaxes-createparallelaxis-editparallelaxis-removeparallelaxis-removeparallelaxes}

This contract moved: [open the current action or shared contract](./guides.md#createparallelaxes-createparallelaxis-editparallelaxis-removeparallelaxis-removeparallelaxes).

## Previous reference location {#complete-single-channel-axes}

This contract moved: [open the current action or shared contract](./guides.md#complete-single-channel-axes).

## Previous reference location {#complete-axis-removal}

This contract moved: [open the current action or shared contract](./guides.md#complete-axis-removal).

## Previous reference location {#axis-lines-ticks-and-labels}

This contract moved: [open the current action or shared contract](./guides.md#axis-lines-ticks-and-labels).

## Previous reference location {#ticklabel-groups-and-axis-titles}

This contract moved: [open the current action or shared contract](./guides.md#ticklabel-groups-and-axis-titles).

## Previous reference location {#directional-grids}

This contract moved: [open the current action or shared contract](./guides.md#directional-grids).

## Related

[Action Reference](../actions.md) · [Chart API](../../api/index.md) · [Supported Features](../../supported-features.md)
