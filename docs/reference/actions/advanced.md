---
layout: default
title: Advanced Chart Actions
description: Assign atomic channels and manage reusable final-item selections.
---

# Advanced Chart Actions

Each declared action has an exact signature and its own stable link. Option tables are generated from types; behavior prose names the owning workflow and its constraints. API layer and H0–H4 authoring role are independent classifications.

## `encodeChannels`

**API layer:** advanced. **Authoring roles:** H2.

**Availability:** Development; added after v0.0.13. See [release compatibility](../../version.md).

```typescript
encodeChannels(options: EncodeChannelsOptions): ChartProgram;
```

Named option contracts: [`EncodeChannelsOptions`](./../types.md#type-encodechannelsoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `target` | Required | `string` |
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


## `selectMarks`

**API layer:** advanced. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
selectMarks(options: SelectMarksOptions): ChartProgram;
```

Named option contracts: [`SelectMarksOptions`](./../types.md#type-selectmarksoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `id` | Optional / branch-dependent | `string \| undefined` |
| `target` | Optional / branch-dependent | `string \| undefined` |
| `grain` | Optional / branch-dependent | `"item" \| "stack" \| undefined` |
| `field` | Optional / branch-dependent | `string \| undefined` |
| `channel` | Optional / branch-dependent | `"color" \| "group" \| "opacity" \| "radius" \| "shape" \| "size" \| "stroke" \| "strokeDash" \| "strokeWidth" \| "theta" \| "x" \| "x2" \| "xOffset" \| "y" \| "y2" \| "yOffset" \| undefined` |
| `property` | Optional / branch-dependent | `MarkGraphicProperty \| undefined` |
| `op` | Required | `"eq" \| "gt" \| "gte" \| "lt" \| "lte" \| "max" \| "min" \| "neq" \| "oneOf" \| "range"` |
| `value` | Optional / branch-dependent | `unknown` |
| `values` | Optional / branch-dependent | `readonly unknown[]` |
| `min` | Optional / branch-dependent | `string \| number` |
| `max` | Optional / branch-dependent | `string \| number` |
| `inclusive` | Optional / branch-dependent | `boolean \| undefined` |
| `count` | Optional / branch-dependent | `number \| undefined` |
| `groupBy` | Optional / branch-dependent | `string \| readonly string[] \| undefined` |
| `ties` | Optional / branch-dependent | `"all" \| "first" \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
selectMarks({ id?, target?, grain?, field | channel | property, op, ...operatorOptions })
```

Store a reusable semantic final-item selection without changing graphics.
Supported operators are `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `oneOf`,
`range`, `min`, and `max`. `grain` defaults to `"item"`; stacked bars also
support `"stack"`. Fields are data values, channels are pre-scale semantic
values, and properties are concrete graphical values.
[Mark selection and highlighting](../../api/appearance/selection-and-highlighting.md#mark-selection-and-highlighting)


## `editMarkSelection`

**API layer:** advanced. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
editMarkSelection(options: EditMarkSelectionOptions): ChartProgram;
```

Named option contracts: [`EditMarkSelectionOptions`](./../types.md#type-editmarkselectionoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `selection` | Optional / branch-dependent | `string \| undefined` |
| `grain` | Optional / branch-dependent | `"item" \| "stack" \| undefined` |
| `field` | Optional / branch-dependent | `string \| undefined` |
| `channel` | Optional / branch-dependent | `"color" \| "group" \| "opacity" \| "radius" \| "shape" \| "size" \| "stroke" \| "strokeDash" \| "strokeWidth" \| "theta" \| "x" \| "x2" \| "xOffset" \| "y" \| "y2" \| "yOffset" \| undefined` |
| `property` | Optional / branch-dependent | `MarkGraphicProperty \| undefined` |
| `op` | Required | `"eq" \| "gt" \| "gte" \| "lt" \| "lte" \| "max" \| "min" \| "neq" \| "oneOf" \| "range"` |
| `value` | Optional / branch-dependent | `unknown` |
| `values` | Optional / branch-dependent | `readonly unknown[]` |
| `min` | Optional / branch-dependent | `string \| number` |
| `max` | Optional / branch-dependent | `string \| number` |
| `inclusive` | Optional / branch-dependent | `boolean \| undefined` |
| `count` | Optional / branch-dependent | `number \| undefined` |
| `groupBy` | Optional / branch-dependent | `string \| readonly string[] \| undefined` |
| `ties` | Optional / branch-dependent | `"all" \| "first" \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
editMarkSelection({ selection?, grain?, field | channel | property, op, ...operatorOptions })
```

Replace the complete selector while preserving the stored selection ID and
mark target. Dependent highlights and exact categorical legend reflection are
replayed from a clean baseline.
[Selection lifecycle](../../api/appearance/selection-and-highlighting.md#editing-and-removing-stored-intent)


## `removeMarkSelection`

**API layer:** advanced. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
removeMarkSelection(options?: RemoveMarkSelectionOptions): ChartProgram;
```

Named option contracts: [`RemoveMarkSelectionOptions`](./../types.md#type-removemarkselectionoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `selection` | Optional / branch-dependent | `string \| undefined` |

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
