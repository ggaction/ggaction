---
layout: default
title: Guide, Axis, Grid, and Title Actions
description: Create, edit, and remove axes, grids, legends, and chart titles.
---

# Guide, Axis, Grid, and Title Actions

Each declared action has an exact signature and its own stable link. Option tables are generated from types; behavior prose names the owning workflow and its constraints. API layers and [H0–H4 catalog role tags](../../tutorials/hierarchical-authoring.md#catalog-role-tags) are independent classifications. Relative action hierarchy is determined by composition, not by a tag or fixed trace depth.

## `createParallelAxes`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
createParallelAxes(options?: ParallelAxesOptions): ChartProgram;
```

Named option contracts: [`ParallelAxesOptions`](./../types.md#type-parallelaxesoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `target` | Optional / branch-dependent | `string \| undefined` |
| `coordinate` | Optional / branch-dependent | `string \| undefined` |

</details>

Behavior, inference, resets, and errors: [createParallelAxes, createParallelAxis, editParallelAxis, removeParallelAxis, removeParallelAxes](./guides.md#createparallelaxes-createparallelaxis-editparallelaxis-removeparallelaxis-removeparallelaxes).



## `createParallelAxis`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
createParallelAxis(options: CreateParallelAxisOptions): ChartProgram;
```

Named option contracts: [`CreateParallelAxisOptions`](./../types.md#type-createparallelaxisoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `field` | Required | `string` |
| `target` | Optional / branch-dependent | `string \| undefined` |
| `line` | Optional / branch-dependent | `false \| AxisLineStyleOptions \| undefined` |
| `title` | Optional / branch-dependent | `false \| ParallelAxisTitleOptions \| undefined` |
| `ticksAndLabels` | Optional / branch-dependent | `false \| (ParallelAxisTickSelection & { ticks?: AxisTickStyleOptions \| undefined; labels?: AxisLabelStyleOptions \| undefined; }) \| undefined` |
| `ticks` | Optional / branch-dependent | `false \| ParallelAxisTicksOptions \| undefined` |
| `labels` | Optional / branch-dependent | `false \| ParallelAxisLabelsOptions \| undefined` |

</details>

Behavior, inference, resets, and errors: [createParallelAxes, createParallelAxis, editParallelAxis, removeParallelAxis, removeParallelAxes](./guides.md#createparallelaxes-createparallelaxis-editparallelaxis-removeparallelaxis-removeparallelaxes).



## `editParallelAxis`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
editParallelAxis(options: EditParallelAxisOptions): ChartProgram;
```

Named option contracts: [`EditParallelAxisOptions`](./../types.md#type-editparallelaxisoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `field` | Required | `string` |
| `target` | Optional / branch-dependent | `string \| undefined` |
| `line` | Optional / branch-dependent | `false \| AxisLineStyleOptions \| undefined` |
| `title` | Optional / branch-dependent | `false \| ParallelAxisTitleOptions \| undefined` |
| `ticksAndLabels` | Optional / branch-dependent | `false \| (ParallelAxisTickSelection & { ticks?: AxisTickStyleOptions \| undefined; labels?: AxisLabelStyleOptions \| undefined; }) \| undefined` |
| `ticks` | Optional / branch-dependent | `false \| ParallelAxisTicksOptions \| undefined` |
| `labels` | Optional / branch-dependent | `false \| ParallelAxisLabelsOptions \| undefined` |

</details>

Behavior, inference, resets, and errors: [createParallelAxes, createParallelAxis, editParallelAxis, removeParallelAxis, removeParallelAxes](./guides.md#createparallelaxes-createparallelaxis-editparallelaxis-removeparallelaxis-removeparallelaxes).



## `removeParallelAxis`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
removeParallelAxis(options: RemoveParallelAxisOptions): ChartProgram;
```

Named option contracts: [`RemoveParallelAxisOptions`](./../types.md#type-removeparallelaxisoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `field` | Required | `string` |
| `target` | Optional / branch-dependent | `string \| undefined` |

</details>

Behavior, inference, resets, and errors: [createParallelAxes, createParallelAxis, editParallelAxis, removeParallelAxis, removeParallelAxes](./guides.md#createparallelaxes-createparallelaxis-editparallelaxis-removeparallelaxis-removeparallelaxes).



## `removeParallelAxes`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
removeParallelAxes(options?: ParallelAxesOptions): ChartProgram;
```

Named option contracts: [`ParallelAxesOptions`](./../types.md#type-parallelaxesoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `target` | Optional / branch-dependent | `string \| undefined` |
| `coordinate` | Optional / branch-dependent | `string \| undefined` |

</details>

Behavior, inference, resets, and errors: [createParallelAxes, createParallelAxis, editParallelAxis, removeParallelAxis, removeParallelAxes](./guides.md#createparallelaxes-createparallelaxis-editparallelaxis-removeparallelaxis-removeparallelaxes).



## `createAxes`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
createAxes(options?: CreateAxesOptions): ChartProgram;
```

Named option contracts: [`CreateAxesOptions`](./../types.md#type-createaxesoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `coordinate` | Optional / branch-dependent | `{ id?: string \| undefined; type?: "auto" \| "cartesian" \| "parallel" \| "polar" \| undefined; } \| undefined` |
| `x` | Optional / branch-dependent | `false \| CompleteAxisOptions<XAxisPosition> \| undefined` |
| `y` | Optional / branch-dependent | `false \| CompleteAxisOptions<YAxisPosition> \| undefined` |
| `theta` | Optional / branch-dependent | `false \| CompletePolarAxisOptions \| undefined` |
| `radius` | Optional / branch-dependent | `false \| CompleteRadialAxisOptions \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
createAxes({ coordinate?, x?, y?, theta?, radius? })
```

Create Cartesian or Polar axes directly, including inferred titles and ticks.
[Axes](../../api/axes.md)


## `createXAxis`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
createXAxis(options?: CompleteAxisOptions<XAxisPosition>): ChartProgram;
```

Named option contracts: [`CompleteAxisOptions`](./../types.md#type-completeaxisoptions) · [`XAxisPosition`](./../types.md#type-xaxisposition).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `scale` | Optional / branch-dependent | `string \| undefined` |
| `coordinate` | Optional / branch-dependent | `string \| undefined` |
| `position` | Optional / branch-dependent | `XAxisPosition \| undefined` |
| `line` | Optional / branch-dependent | `false \| AxisLineStyleOptions \| undefined` |
| `ticksAndLabels` | Optional / branch-dependent | `false \| Omit<AxisTicksAndLabelsOptions<XAxisPosition>, "position" \| "scale"> \| undefined` |
| `title` | Optional / branch-dependent | `false \| Omit<AxisTitleOptions<XAxisPosition>, "position" \| "scale"> \| undefined` |

</details>

Behavior, inference, resets, and errors: [Complete single-channel axes](./guides.md#complete-single-channel-axes).



## `createYAxis`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
createYAxis(options?: CompleteAxisOptions<YAxisPosition>): ChartProgram;
```

Named option contracts: [`CompleteAxisOptions`](./../types.md#type-completeaxisoptions) · [`YAxisPosition`](./../types.md#type-yaxisposition).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `scale` | Optional / branch-dependent | `string \| undefined` |
| `coordinate` | Optional / branch-dependent | `string \| undefined` |
| `position` | Optional / branch-dependent | `YAxisPosition \| undefined` |
| `line` | Optional / branch-dependent | `false \| AxisLineStyleOptions \| undefined` |
| `ticksAndLabels` | Optional / branch-dependent | `false \| Omit<AxisTicksAndLabelsOptions<YAxisPosition>, "position" \| "scale"> \| undefined` |
| `title` | Optional / branch-dependent | `false \| Omit<AxisTitleOptions<YAxisPosition>, "position" \| "scale"> \| undefined` |

</details>

Behavior, inference, resets, and errors: [Complete single-channel axes](./guides.md#complete-single-channel-axes).



## `createXAxisLine`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
createXAxisLine(options?: AxisLineStyleOptions & { scale?: string; position?: XAxisPosition }): ChartProgram;
```

Named option contracts: [`AxisLineStyleOptions`](./../types.md#type-axislinestyleoptions) · [`XAxisPosition`](./../types.md#type-xaxisposition).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `color` | Optional / branch-dependent | `string \| undefined` |
| `lineWidth` | Optional / branch-dependent | `number \| undefined` |
| `scale` | Optional / branch-dependent | `string \| undefined` |
| `position` | Optional / branch-dependent | `XAxisPosition \| undefined` |

</details>

Behavior, inference, resets, and errors: [Axis lines, ticks, and labels](./guides.md#axis-lines-ticks-and-labels).



## `createYAxisLine`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
createYAxisLine(options?: AxisLineStyleOptions & { scale?: string; position?: YAxisPosition }): ChartProgram;
```

Named option contracts: [`AxisLineStyleOptions`](./../types.md#type-axislinestyleoptions) · [`YAxisPosition`](./../types.md#type-yaxisposition).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `color` | Optional / branch-dependent | `string \| undefined` |
| `lineWidth` | Optional / branch-dependent | `number \| undefined` |
| `scale` | Optional / branch-dependent | `string \| undefined` |
| `position` | Optional / branch-dependent | `YAxisPosition \| undefined` |

</details>

Behavior, inference, resets, and errors: [Axis lines, ticks, and labels](./guides.md#axis-lines-ticks-and-labels).



## `editXAxisLine`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
editXAxisLine(options?: AxisLineStyleOptions & { position?: XAxisPosition }): ChartProgram;
```

Named option contracts: [`AxisLineStyleOptions`](./../types.md#type-axislinestyleoptions) · [`XAxisPosition`](./../types.md#type-xaxisposition).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `color` | Optional / branch-dependent | `string \| undefined` |
| `lineWidth` | Optional / branch-dependent | `number \| undefined` |
| `position` | Optional / branch-dependent | `XAxisPosition \| undefined` |

</details>

Behavior, inference, resets, and errors: [Axis lines, ticks, and labels](./guides.md#axis-lines-ticks-and-labels).



## `editYAxisLine`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
editYAxisLine(options?: AxisLineStyleOptions & { position?: YAxisPosition }): ChartProgram;
```

Named option contracts: [`AxisLineStyleOptions`](./../types.md#type-axislinestyleoptions) · [`YAxisPosition`](./../types.md#type-yaxisposition).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `color` | Optional / branch-dependent | `string \| undefined` |
| `lineWidth` | Optional / branch-dependent | `number \| undefined` |
| `position` | Optional / branch-dependent | `YAxisPosition \| undefined` |

</details>

Behavior, inference, resets, and errors: [Axis lines, ticks, and labels](./guides.md#axis-lines-ticks-and-labels).



## `createXAxisTicks`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
createXAxisTicks(options?: AxisTickOptions<XAxisPosition>): ChartProgram;
```

Named option contracts: [`AxisTickOptions`](./../types.md#type-axistickoptions) · [`XAxisPosition`](./../types.md#type-xaxisposition).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `scale` | Optional / branch-dependent | `string \| undefined` |
| `position` | Optional / branch-dependent | `XAxisPosition \| undefined` |
| `count` | Optional / branch-dependent | `number \| undefined` |
| `values` | Optional / branch-dependent | `readonly AxisValue[] \| undefined` |
| `color` | Optional / branch-dependent | `string \| undefined` |
| `lineWidth` | Optional / branch-dependent | `number \| undefined` |
| `length` | Optional / branch-dependent | `number \| undefined` |

</details>

Behavior, inference, resets, and errors: [Axis lines, ticks, and labels](./guides.md#axis-lines-ticks-and-labels).



## `createYAxisTicks`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
createYAxisTicks(options?: AxisTickOptions<YAxisPosition>): ChartProgram;
```

Named option contracts: [`AxisTickOptions`](./../types.md#type-axistickoptions) · [`YAxisPosition`](./../types.md#type-yaxisposition).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `scale` | Optional / branch-dependent | `string \| undefined` |
| `position` | Optional / branch-dependent | `YAxisPosition \| undefined` |
| `count` | Optional / branch-dependent | `number \| undefined` |
| `values` | Optional / branch-dependent | `readonly AxisValue[] \| undefined` |
| `color` | Optional / branch-dependent | `string \| undefined` |
| `lineWidth` | Optional / branch-dependent | `number \| undefined` |
| `length` | Optional / branch-dependent | `number \| undefined` |

</details>

Behavior, inference, resets, and errors: [Axis lines, ticks, and labels](./guides.md#axis-lines-ticks-and-labels).



## `editXAxisTicks`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
editXAxisTicks(options?: Omit<AxisTickOptions<XAxisPosition>, "scale">): ChartProgram;
```

Named option contracts: [`AxisTickOptions`](./../types.md#type-axistickoptions) · [`XAxisPosition`](./../types.md#type-xaxisposition).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `color` | Optional / branch-dependent | `string \| undefined` |
| `lineWidth` | Optional / branch-dependent | `number \| undefined` |
| `length` | Optional / branch-dependent | `number \| undefined` |
| `position` | Optional / branch-dependent | `XAxisPosition \| undefined` |
| `count` | Optional / branch-dependent | `number \| undefined` |
| `values` | Optional / branch-dependent | `readonly AxisValue[] \| undefined` |

</details>

Behavior, inference, resets, and errors: [Axis lines, ticks, and labels](./guides.md#axis-lines-ticks-and-labels).



## `editYAxisTicks`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
editYAxisTicks(options?: Omit<AxisTickOptions<YAxisPosition>, "scale">): ChartProgram;
```

Named option contracts: [`AxisTickOptions`](./../types.md#type-axistickoptions) · [`YAxisPosition`](./../types.md#type-yaxisposition).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `color` | Optional / branch-dependent | `string \| undefined` |
| `lineWidth` | Optional / branch-dependent | `number \| undefined` |
| `length` | Optional / branch-dependent | `number \| undefined` |
| `position` | Optional / branch-dependent | `YAxisPosition \| undefined` |
| `count` | Optional / branch-dependent | `number \| undefined` |
| `values` | Optional / branch-dependent | `readonly AxisValue[] \| undefined` |

</details>

Behavior, inference, resets, and errors: [Axis lines, ticks, and labels](./guides.md#axis-lines-ticks-and-labels).



## `createXAxisLabels`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
createXAxisLabels(options?: AxisLabelOptions<XAxisPosition>): ChartProgram;
```

Named option contracts: [`AxisLabelOptions`](./../types.md#type-axislabeloptions) · [`XAxisPosition`](./../types.md#type-xaxisposition).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `scale` | Optional / branch-dependent | `string \| undefined` |
| `position` | Optional / branch-dependent | `XAxisPosition \| undefined` |
| `count` | Optional / branch-dependent | `number \| undefined` |
| `values` | Optional / branch-dependent | `readonly AxisValue[] \| undefined` |
| `labelMap` | Optional / branch-dependent | `"auto" \| DisplayLabelMap \| undefined` |
| `offset` | Optional / branch-dependent | `number \| undefined` |
| `format` | Optional / branch-dependent | `AxisFormat \| undefined` |
| `color` | Optional / branch-dependent | `string \| undefined` |
| `fontSize` | Optional / branch-dependent | `number \| undefined` |
| `fontFamily` | Optional / branch-dependent | `string \| undefined` |
| `fontWeight` | Optional / branch-dependent | `string \| number \| undefined` |
| `rotation` | Optional / branch-dependent | `RotationInput \| undefined` |
| `maxWidth` | Optional / branch-dependent | `number \| false \| undefined` |
| `wrap` | Optional / branch-dependent | `"character" \| "word" \| undefined` |
| `lineHeight` | Optional / branch-dependent | `number \| undefined` |
| `overlap` | Optional / branch-dependent | `"allow" \| "error" \| undefined` |

</details>

Behavior, inference, resets, and errors: [Axis lines, ticks, and labels](./guides.md#axis-lines-ticks-and-labels).



## `createYAxisLabels`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
createYAxisLabels(options?: AxisLabelOptions<YAxisPosition>): ChartProgram;
```

Named option contracts: [`AxisLabelOptions`](./../types.md#type-axislabeloptions) · [`YAxisPosition`](./../types.md#type-yaxisposition).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `scale` | Optional / branch-dependent | `string \| undefined` |
| `position` | Optional / branch-dependent | `YAxisPosition \| undefined` |
| `count` | Optional / branch-dependent | `number \| undefined` |
| `values` | Optional / branch-dependent | `readonly AxisValue[] \| undefined` |
| `labelMap` | Optional / branch-dependent | `"auto" \| DisplayLabelMap \| undefined` |
| `offset` | Optional / branch-dependent | `number \| undefined` |
| `format` | Optional / branch-dependent | `AxisFormat \| undefined` |
| `color` | Optional / branch-dependent | `string \| undefined` |
| `fontSize` | Optional / branch-dependent | `number \| undefined` |
| `fontFamily` | Optional / branch-dependent | `string \| undefined` |
| `fontWeight` | Optional / branch-dependent | `string \| number \| undefined` |
| `rotation` | Optional / branch-dependent | `RotationInput \| undefined` |
| `maxWidth` | Optional / branch-dependent | `number \| false \| undefined` |
| `wrap` | Optional / branch-dependent | `"character" \| "word" \| undefined` |
| `lineHeight` | Optional / branch-dependent | `number \| undefined` |
| `overlap` | Optional / branch-dependent | `"allow" \| "error" \| undefined` |

</details>

Behavior, inference, resets, and errors: [Axis lines, ticks, and labels](./guides.md#axis-lines-ticks-and-labels).



## `editXAxisLabels`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
editXAxisLabels(options?: Omit<AxisLabelOptions<XAxisPosition>, "scale">): ChartProgram;
```

Named option contracts: [`AxisLabelOptions`](./../types.md#type-axislabeloptions) · [`XAxisPosition`](./../types.md#type-xaxisposition).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `labelMap` | Optional / branch-dependent | `"auto" \| DisplayLabelMap \| undefined` |
| `offset` | Optional / branch-dependent | `number \| undefined` |
| `format` | Optional / branch-dependent | `AxisFormat \| undefined` |
| `color` | Optional / branch-dependent | `string \| undefined` |
| `fontSize` | Optional / branch-dependent | `number \| undefined` |
| `fontFamily` | Optional / branch-dependent | `string \| undefined` |
| `fontWeight` | Optional / branch-dependent | `string \| number \| undefined` |
| `rotation` | Optional / branch-dependent | `RotationInput \| undefined` |
| `maxWidth` | Optional / branch-dependent | `number \| false \| undefined` |
| `wrap` | Optional / branch-dependent | `"character" \| "word" \| undefined` |
| `lineHeight` | Optional / branch-dependent | `number \| undefined` |
| `overlap` | Optional / branch-dependent | `"allow" \| "error" \| undefined` |
| `position` | Optional / branch-dependent | `XAxisPosition \| undefined` |
| `count` | Optional / branch-dependent | `number \| undefined` |
| `values` | Optional / branch-dependent | `readonly AxisValue[] \| undefined` |

</details>

Behavior, inference, resets, and errors: [Axis lines, ticks, and labels](./guides.md#axis-lines-ticks-and-labels).



## `editYAxisLabels`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
editYAxisLabels(options?: Omit<AxisLabelOptions<YAxisPosition>, "scale">): ChartProgram;
```

Named option contracts: [`AxisLabelOptions`](./../types.md#type-axislabeloptions) · [`YAxisPosition`](./../types.md#type-yaxisposition).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `labelMap` | Optional / branch-dependent | `"auto" \| DisplayLabelMap \| undefined` |
| `offset` | Optional / branch-dependent | `number \| undefined` |
| `format` | Optional / branch-dependent | `AxisFormat \| undefined` |
| `color` | Optional / branch-dependent | `string \| undefined` |
| `fontSize` | Optional / branch-dependent | `number \| undefined` |
| `fontFamily` | Optional / branch-dependent | `string \| undefined` |
| `fontWeight` | Optional / branch-dependent | `string \| number \| undefined` |
| `rotation` | Optional / branch-dependent | `RotationInput \| undefined` |
| `maxWidth` | Optional / branch-dependent | `number \| false \| undefined` |
| `wrap` | Optional / branch-dependent | `"character" \| "word" \| undefined` |
| `lineHeight` | Optional / branch-dependent | `number \| undefined` |
| `overlap` | Optional / branch-dependent | `"allow" \| "error" \| undefined` |
| `position` | Optional / branch-dependent | `YAxisPosition \| undefined` |
| `count` | Optional / branch-dependent | `number \| undefined` |
| `values` | Optional / branch-dependent | `readonly AxisValue[] \| undefined` |

</details>

Behavior, inference, resets, and errors: [Axis lines, ticks, and labels](./guides.md#axis-lines-ticks-and-labels).



## `createXAxisTicksAndLabels`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
createXAxisTicksAndLabels(options?: AxisTicksAndLabelsOptions<XAxisPosition>): ChartProgram;
```

Named option contracts: [`AxisTicksAndLabelsOptions`](./../types.md#type-axisticksandlabelsoptions) · [`XAxisPosition`](./../types.md#type-xaxisposition).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `scale` | Optional / branch-dependent | `string \| undefined` |
| `position` | Optional / branch-dependent | `XAxisPosition \| undefined` |
| `count` | Optional / branch-dependent | `number \| undefined` |
| `values` | Optional / branch-dependent | `readonly AxisValue[] \| undefined` |
| `ticks` | Optional / branch-dependent | `AxisTickStyleOptions \| undefined` |
| `labels` | Optional / branch-dependent | `(AxisLabelStyleOptions & AxisLabelLayoutOptions & DisplayLabelOptions) \| undefined` |

</details>

Behavior, inference, resets, and errors: [Tick/label groups and axis titles](./guides.md#ticklabel-groups-and-axis-titles).



## `createYAxisTicksAndLabels`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
createYAxisTicksAndLabels(options?: AxisTicksAndLabelsOptions<YAxisPosition>): ChartProgram;
```

Named option contracts: [`AxisTicksAndLabelsOptions`](./../types.md#type-axisticksandlabelsoptions) · [`YAxisPosition`](./../types.md#type-yaxisposition).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `scale` | Optional / branch-dependent | `string \| undefined` |
| `position` | Optional / branch-dependent | `YAxisPosition \| undefined` |
| `count` | Optional / branch-dependent | `number \| undefined` |
| `values` | Optional / branch-dependent | `readonly AxisValue[] \| undefined` |
| `ticks` | Optional / branch-dependent | `AxisTickStyleOptions \| undefined` |
| `labels` | Optional / branch-dependent | `(AxisLabelStyleOptions & AxisLabelLayoutOptions & DisplayLabelOptions) \| undefined` |

</details>

Behavior, inference, resets, and errors: [Tick/label groups and axis titles](./guides.md#ticklabel-groups-and-axis-titles).



## `editXAxisTicksAndLabels`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
editXAxisTicksAndLabels(options: Omit<AxisTicksAndLabelsOptions<XAxisPosition>, "scale">): ChartProgram;
```

Named option contracts: [`AxisTicksAndLabelsOptions`](./../types.md#type-axisticksandlabelsoptions) · [`XAxisPosition`](./../types.md#type-xaxisposition).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `position` | Optional / branch-dependent | `XAxisPosition \| undefined` |
| `count` | Optional / branch-dependent | `number \| undefined` |
| `values` | Optional / branch-dependent | `readonly AxisValue[] \| undefined` |
| `ticks` | Optional / branch-dependent | `AxisTickStyleOptions \| undefined` |
| `labels` | Optional / branch-dependent | `(AxisLabelStyleOptions & AxisLabelLayoutOptions & DisplayLabelOptions) \| undefined` |

</details>

Behavior, inference, resets, and errors: [Tick/label groups and axis titles](./guides.md#ticklabel-groups-and-axis-titles).



## `editYAxisTicksAndLabels`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
editYAxisTicksAndLabels(options: Omit<AxisTicksAndLabelsOptions<YAxisPosition>, "scale">): ChartProgram;
```

Named option contracts: [`AxisTicksAndLabelsOptions`](./../types.md#type-axisticksandlabelsoptions) · [`YAxisPosition`](./../types.md#type-yaxisposition).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `position` | Optional / branch-dependent | `YAxisPosition \| undefined` |
| `count` | Optional / branch-dependent | `number \| undefined` |
| `values` | Optional / branch-dependent | `readonly AxisValue[] \| undefined` |
| `ticks` | Optional / branch-dependent | `AxisTickStyleOptions \| undefined` |
| `labels` | Optional / branch-dependent | `(AxisLabelStyleOptions & AxisLabelLayoutOptions & DisplayLabelOptions) \| undefined` |

</details>

Behavior, inference, resets, and errors: [Tick/label groups and axis titles](./guides.md#ticklabel-groups-and-axis-titles).



## `createXAxisTitle`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
createXAxisTitle(options?: AxisTitleOptions<XAxisPosition>): ChartProgram;
```

Named option contracts: [`AxisTitleOptions`](./../types.md#type-axistitleoptions) · [`XAxisPosition`](./../types.md#type-xaxisposition).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `text` | Optional / branch-dependent | `string \| undefined` |
| `scale` | Optional / branch-dependent | `string \| undefined` |
| `position` | Optional / branch-dependent | `XAxisPosition \| undefined` |
| `at` | Optional / branch-dependent | `number \| "center" \| "end" \| "start" \| undefined` |
| `offset` | Optional / branch-dependent | `number \| undefined` |
| `rotation` | Optional / branch-dependent | `RotationInput \| undefined` |
| `color` | Optional / branch-dependent | `string \| undefined` |
| `fontSize` | Optional / branch-dependent | `number \| undefined` |
| `fontFamily` | Optional / branch-dependent | `string \| undefined` |
| `fontWeight` | Optional / branch-dependent | `string \| number \| undefined` |

</details>

Behavior, inference, resets, and errors: [Tick/label groups and axis titles](./guides.md#ticklabel-groups-and-axis-titles).



## `createYAxisTitle`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
createYAxisTitle(options?: AxisTitleOptions<YAxisPosition>): ChartProgram;
```

Named option contracts: [`AxisTitleOptions`](./../types.md#type-axistitleoptions) · [`YAxisPosition`](./../types.md#type-yaxisposition).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `text` | Optional / branch-dependent | `string \| undefined` |
| `scale` | Optional / branch-dependent | `string \| undefined` |
| `position` | Optional / branch-dependent | `YAxisPosition \| undefined` |
| `at` | Optional / branch-dependent | `number \| "center" \| "end" \| "start" \| undefined` |
| `offset` | Optional / branch-dependent | `number \| undefined` |
| `rotation` | Optional / branch-dependent | `RotationInput \| undefined` |
| `color` | Optional / branch-dependent | `string \| undefined` |
| `fontSize` | Optional / branch-dependent | `number \| undefined` |
| `fontFamily` | Optional / branch-dependent | `string \| undefined` |
| `fontWeight` | Optional / branch-dependent | `string \| number \| undefined` |

</details>

Behavior, inference, resets, and errors: [Tick/label groups and axis titles](./guides.md#ticklabel-groups-and-axis-titles).



## `editXAxisTitle`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
editXAxisTitle(options?: Omit<AxisTitleOptions<XAxisPosition>, "scale">): ChartProgram;
```

Named option contracts: [`AxisTitleOptions`](./../types.md#type-axistitleoptions) · [`XAxisPosition`](./../types.md#type-xaxisposition).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `text` | Optional / branch-dependent | `string \| undefined` |
| `position` | Optional / branch-dependent | `XAxisPosition \| undefined` |
| `at` | Optional / branch-dependent | `number \| "center" \| "end" \| "start" \| undefined` |
| `offset` | Optional / branch-dependent | `number \| undefined` |
| `rotation` | Optional / branch-dependent | `RotationInput \| undefined` |
| `color` | Optional / branch-dependent | `string \| undefined` |
| `fontSize` | Optional / branch-dependent | `number \| undefined` |
| `fontFamily` | Optional / branch-dependent | `string \| undefined` |
| `fontWeight` | Optional / branch-dependent | `string \| number \| undefined` |

</details>

Behavior, inference, resets, and errors: [Tick/label groups and axis titles](./guides.md#ticklabel-groups-and-axis-titles).



## `editYAxisTitle`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
editYAxisTitle(options?: Omit<AxisTitleOptions<YAxisPosition>, "scale">): ChartProgram;
```

Named option contracts: [`AxisTitleOptions`](./../types.md#type-axistitleoptions) · [`YAxisPosition`](./../types.md#type-yaxisposition).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `text` | Optional / branch-dependent | `string \| undefined` |
| `position` | Optional / branch-dependent | `YAxisPosition \| undefined` |
| `at` | Optional / branch-dependent | `number \| "center" \| "end" \| "start" \| undefined` |
| `offset` | Optional / branch-dependent | `number \| undefined` |
| `rotation` | Optional / branch-dependent | `RotationInput \| undefined` |
| `color` | Optional / branch-dependent | `string \| undefined` |
| `fontSize` | Optional / branch-dependent | `number \| undefined` |
| `fontFamily` | Optional / branch-dependent | `string \| undefined` |
| `fontWeight` | Optional / branch-dependent | `string \| number \| undefined` |

</details>

Behavior, inference, resets, and errors: [Tick/label groups and axis titles](./guides.md#ticklabel-groups-and-axis-titles).



## `editXAxis`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
editXAxis(options: EditAxisOptions<XAxisPosition>): ChartProgram;
```

Named option contracts: [`EditAxisOptions`](./../types.md#type-editaxisoptions) · [`XAxisPosition`](./../types.md#type-xaxisposition).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `position` | Optional / branch-dependent | `XAxisPosition \| undefined` |
| `line` | Optional / branch-dependent | `false \| AxisLineStyleOptions \| undefined` |
| `ticks` | Optional / branch-dependent | `false \| Omit<AxisTickOptions<XAxisPosition>, "position" \| "scale"> \| undefined` |
| `labels` | Optional / branch-dependent | `false \| Omit<AxisLabelOptions<XAxisPosition>, "position" \| "scale"> \| undefined` |
| `ticksAndLabels` | Optional / branch-dependent | `false \| Omit<AxisTicksAndLabelsOptions<XAxisPosition>, "position" \| "scale"> \| undefined` |
| `title` | Optional / branch-dependent | `false \| Omit<AxisTitleOptions<XAxisPosition>, "position" \| "scale"> \| undefined` |

</details>

Behavior, inference, resets, and errors: [Complete single-channel axes](./guides.md#complete-single-channel-axes).



## `editYAxis`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
editYAxis(options: EditAxisOptions<YAxisPosition>): ChartProgram;
```

Named option contracts: [`EditAxisOptions`](./../types.md#type-editaxisoptions) · [`YAxisPosition`](./../types.md#type-yaxisposition).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `position` | Optional / branch-dependent | `YAxisPosition \| undefined` |
| `line` | Optional / branch-dependent | `false \| AxisLineStyleOptions \| undefined` |
| `ticks` | Optional / branch-dependent | `false \| Omit<AxisTickOptions<YAxisPosition>, "position" \| "scale"> \| undefined` |
| `labels` | Optional / branch-dependent | `false \| Omit<AxisLabelOptions<YAxisPosition>, "position" \| "scale"> \| undefined` |
| `ticksAndLabels` | Optional / branch-dependent | `false \| Omit<AxisTicksAndLabelsOptions<YAxisPosition>, "position" \| "scale"> \| undefined` |
| `title` | Optional / branch-dependent | `false \| Omit<AxisTitleOptions<YAxisPosition>, "position" \| "scale"> \| undefined` |

</details>

Behavior, inference, resets, and errors: [Complete single-channel axes](./guides.md#complete-single-channel-axes).



## `removeXAxis`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
removeXAxis(options?: RemoveAxisOptions): ChartProgram;
```

Named option contracts: [`RemoveAxisOptions`](./../types.md#type-removeaxisoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `coordinate` | Optional / branch-dependent | `string \| undefined` |
| `scale` | Optional / branch-dependent | `string \| undefined` |

</details>

Behavior, inference, resets, and errors: [Complete axis removal](./guides.md#complete-axis-removal).



## `removeYAxis`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
removeYAxis(options?: RemoveAxisOptions): ChartProgram;
```

Named option contracts: [`RemoveAxisOptions`](./../types.md#type-removeaxisoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `coordinate` | Optional / branch-dependent | `string \| undefined` |
| `scale` | Optional / branch-dependent | `string \| undefined` |

</details>

Behavior, inference, resets, and errors: [Complete axis removal](./guides.md#complete-axis-removal).



## `createGrid`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
createGrid(options?: CreateGridOptions): ChartProgram;
```

Named option contracts: [`CreateGridOptions`](./../types.md#type-creategridoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `horizontal` | Optional / branch-dependent | `boolean \| GridDirectionOptions \| undefined` |
| `vertical` | Optional / branch-dependent | `boolean \| GridDirectionOptions \| undefined` |
| `theta` | Optional / branch-dependent | `boolean \| PolarGridOptions \| undefined` |
| `radial` | Optional / branch-dependent | `boolean \| PolarGridOptions \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
createGrid({ horizontal?, vertical?, theta?, radial? })
```

Create inferred horizontal and/or vertical Cartesian grid lines behind related
marks, or infer the Polar grid families backed by stored theta/radius encodings.
[Grids](../../api/grids.md)


## `createHorizontalGrid`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
createHorizontalGrid(options?: GridDirectionOptions): ChartProgram;
```

Named option contracts: [`GridDirectionOptions`](./../types.md#type-griddirectionoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `scale` | Optional / branch-dependent | `string \| undefined` |
| `coordinate` | Optional / branch-dependent | `string \| undefined` |
| `count` | Optional / branch-dependent | `number \| undefined` |
| `values` | Optional / branch-dependent | `readonly number[] \| undefined` |
| `color` | Optional / branch-dependent | `string \| undefined` |
| `lineWidth` | Optional / branch-dependent | `number \| undefined` |
| `strokeDash` | Optional / branch-dependent | `readonly number[] \| undefined` |

</details>

Behavior, inference, resets, and errors: [Directional grids](./guides.md#directional-grids).



## `createVerticalGrid`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
createVerticalGrid(options?: GridDirectionOptions): ChartProgram;
```

Named option contracts: [`GridDirectionOptions`](./../types.md#type-griddirectionoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `scale` | Optional / branch-dependent | `string \| undefined` |
| `coordinate` | Optional / branch-dependent | `string \| undefined` |
| `count` | Optional / branch-dependent | `number \| undefined` |
| `values` | Optional / branch-dependent | `readonly number[] \| undefined` |
| `color` | Optional / branch-dependent | `string \| undefined` |
| `lineWidth` | Optional / branch-dependent | `number \| undefined` |
| `strokeDash` | Optional / branch-dependent | `readonly number[] \| undefined` |

</details>

Behavior, inference, resets, and errors: [Directional grids](./guides.md#directional-grids).



## `editHorizontalGrid`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
editHorizontalGrid(options: EditGridOptions): ChartProgram;
```

Named option contracts: [`EditGridOptions`](./../types.md#type-editgridoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `count` | Optional / branch-dependent | `number \| undefined` |
| `values` | Optional / branch-dependent | `"auto" \| readonly number[] \| undefined` |
| `color` | Optional / branch-dependent | `string \| undefined` |
| `lineWidth` | Optional / branch-dependent | `number \| undefined` |
| `strokeDash` | Optional / branch-dependent | `readonly number[] \| undefined` |

</details>

Behavior, inference, resets, and errors: [Directional grids](./guides.md#directional-grids).



## `editVerticalGrid`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
editVerticalGrid(options: EditGridOptions): ChartProgram;
```

Named option contracts: [`EditGridOptions`](./../types.md#type-editgridoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `count` | Optional / branch-dependent | `number \| undefined` |
| `values` | Optional / branch-dependent | `"auto" \| readonly number[] \| undefined` |
| `color` | Optional / branch-dependent | `string \| undefined` |
| `lineWidth` | Optional / branch-dependent | `number \| undefined` |
| `strokeDash` | Optional / branch-dependent | `readonly number[] \| undefined` |

</details>

Behavior, inference, resets, and errors: [Directional grids](./guides.md#directional-grids).



## `editGrid`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
editGrid(options: EditGridDirectionsOptions): ChartProgram;
```

Named option contracts: [`EditGridDirectionsOptions`](./../types.md#type-editgriddirectionsoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `horizontal` | Optional / branch-dependent | `EditGridOptions \| undefined` |
| `vertical` | Optional / branch-dependent | `EditGridOptions \| undefined` |
| `theta` | Optional / branch-dependent | `EditPolarGridOptions \| undefined` |
| `radial` | Optional / branch-dependent | `EditPolarGridOptions \| undefined` |

</details>

Behavior, inference, resets, and errors: [Directional grids](./guides.md#directional-grids).



## `removeGrid`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
removeGrid(options?: RemoveGridOptions): ChartProgram;
```

Named option contracts: [`RemoveGridOptions`](./../types.md#type-removegridoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `horizontal` | Optional / branch-dependent | `boolean \| undefined` |
| `vertical` | Optional / branch-dependent | `boolean \| undefined` |
| `theta` | Optional / branch-dependent | `boolean \| undefined` |
| `radial` | Optional / branch-dependent | `boolean \| undefined` |

</details>

Behavior, inference, resets, and errors: [Directional grids](./guides.md#directional-grids).



## `createLegend`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
createLegend(options?: LegendOptions): ChartProgram;
```

Named option contracts: [`LegendOptions`](./../types.md#type-legendoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `layout` | Optional / branch-dependent | `"edge" \| "legacy-bottom" \| undefined` |
| `order` | Optional / branch-dependent | `LegendOrder \| undefined` |
| `target` | Optional / branch-dependent | `string \| undefined` |
| `channels` | Optional / branch-dependent | `readonly ("color" \| "opacity" \| "shape" \| "size" \| "stroke" \| "strokeDash" \| "strokeWidth")[] \| undefined` |
| `position` | Optional / branch-dependent | `"bottom" \| "left" \| "right" \| "top" \| undefined` |
| `align` | Optional / branch-dependent | `"center" \| "left" \| "right" \| undefined` |
| `direction` | Optional / branch-dependent | `"horizontal" \| "vertical" \| undefined` |
| `columns` | Optional / branch-dependent | `number \| undefined` |
| `offset` | Optional / branch-dependent | `number \| undefined` |
| `titlePosition` | Optional / branch-dependent | `"left" \| "top" \| undefined` |
| `title` | Optional / branch-dependent | `string \| undefined` |
| `values` | Optional / branch-dependent | `readonly number[] \| undefined` |
| `count` | Optional / branch-dependent | `number \| undefined` |
| `gradient` | Optional / branch-dependent | `{ length?: number \| undefined; thickness?: number \| undefined; } \| undefined` |
| `symbol` | Optional / branch-dependent | `LegendSymbolRecipe \| undefined` |
| `labels` | Optional / branch-dependent | `LegendTextOptions \| undefined` |
| `titleStyle` | Optional / branch-dependent | `LegendTitleStyleOptions \| undefined` |
| `itemGap` | Optional / branch-dependent | `number \| undefined` |
| `border` | Optional / branch-dependent | `boolean \| LegendBorderOptions \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
createLegend({
  target?, channels?, position?, layout?, align?, direction?, columns?, offset?,
  titlePosition?, title?, symbol?, labels?, titleStyle?, itemGap?, border?, count?,
  values?, gradient?, order?
})
```

Create categorical, point-size, continuous-color gradient, discretized-color
interval, or field-opacity sample legends. Interval legends support all four
edges with layout `"edge"`, side single columns and horizontal item grids. Explicit `channels` creates exactly
the selected content; include `"size"` in a point categorical-and-size request.
Automatic symbol recipes refresh when matching companion lines or their color
bindings change; explicit recipes retain their layers and order.
Omitted point channels infer the available categorical color, shape, and
quantitative size with the same result as explicit selection. Color-only uses
swatches; shape uses typed symbols; a size encoding adds its own sample block.
Continuous legends support right, left, top, and bottom
placement. Categorical legends also support left side placement; composite
point and size blocks remain in deterministic vertical order. Horizontal
sampled-opacity legends accept `titlePosition: "left"` for one inline
title-symbol-label reading line. Same-edge top/bottom blocks are left-packed
with a 40-pixel occupied-bound gap. Categorical `layout` defaults to `"edge"`;
`"legacy-bottom"` explicitly selects the former Canvas-bottom compact row and
requires bottom position. Categorical `order` accepts `"scale"`, `{ values: [...] }`,
or `{ channel: "x" | "y" | "theta" }` while preserving each category's color/shape/dash.
Continuous size, opacity, and stroke-width legends accept 1–100 exact,
finite, strictly increasing `values`. They use the actual channel scale without
changing its domain or the encoded marks. `values` cannot be combined with
`count` and is unsupported for discrete size and gradient legends.
[Legends](../../api/legends.md)


## `editLegend`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
editLegend(options: EditLegendOptions): ChartProgram;
```

Named option contracts: [`EditLegendOptions`](./../types.md#type-editlegendoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `channels` | Optional / branch-dependent | `readonly ("color" \| "opacity" \| "shape" \| "size" \| "stroke" \| "strokeDash" \| "strokeWidth")[] \| undefined` |
| `title` | Optional / branch-dependent | `string \| false \| undefined` |
| `values` | Optional / branch-dependent | `"auto" \| readonly number[] \| undefined` |
| `layout` | Optional / branch-dependent | `"edge" \| "legacy-bottom" \| undefined` |
| `order` | Optional / branch-dependent | `LegendOrder \| undefined` |
| `target` | Optional / branch-dependent | `string \| undefined` |
| `position` | Optional / branch-dependent | `"bottom" \| "left" \| "right" \| "top" \| undefined` |
| `align` | Optional / branch-dependent | `"center" \| "left" \| "right" \| undefined` |
| `direction` | Optional / branch-dependent | `"horizontal" \| "vertical" \| undefined` |
| `columns` | Optional / branch-dependent | `number \| undefined` |
| `offset` | Optional / branch-dependent | `number \| undefined` |
| `titlePosition` | Optional / branch-dependent | `"left" \| "top" \| undefined` |
| `count` | Optional / branch-dependent | `number \| undefined` |
| `gradient` | Optional / branch-dependent | `{ length?: number \| undefined; thickness?: number \| undefined; } \| undefined` |
| `symbol` | Optional / branch-dependent | `LegendSymbolRecipe \| undefined` |
| `labels` | Optional / branch-dependent | `LegendTextOptions \| undefined` |
| `titleStyle` | Optional / branch-dependent | `LegendTitleStyleOptions \| undefined` |
| `itemGap` | Optional / branch-dependent | `number \| undefined` |
| `border` | Optional / branch-dependent | `boolean \| LegendBorderOptions \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
editLegend({
  target?, channels?, position?, layout?, align?, direction?, columns?, offset?, titlePosition?,
  title?, symbol?, labels?, titleStyle?, itemGap?, border?, count?, values?, gradient?, order?
})
```

Partially edit one existing legend. Interval legends accept four-edge placement
and horizontal grid/inline-title controls. Hidden continuous titles are excluded
from occupied bounds and backgrounds. Omitted categorical `layout` preserves the
stored mode; style edits never switch modes. Categorical `order` can be reassigned or reset
with `"scale"`; linked position changes also refresh its item order. `title` accepts a non-empty string,
`"auto"`, or `false`. Explicit `channels` replaces the entire target's content
with the exact supported non-empty set; mark encodings and scales remain.
Retained blocks preserve configuration; new blocks use creation defaults and
removed blocks lose their settings. Categorical revisions preserve compatible
recipes and order. Shared text patches merge only requested style leaves into
each block. A
horizontal sampled-opacity legend accepts `titlePosition: "left"` and inline
spacing edits. A
standalone size or stroke-width legend accepts the bounded `title`, `count`,
`labels`, and `titleStyle` subset and remains right-positioned. Count and text
styles persist through Canvas/scale/data replay; `false` hides a title and
`"auto"` restores it from the encoded field.
Sampled size, opacity, and stroke-width legends also accept exact numeric
`values`; `values: "auto"` restores the remembered automatic count. A scale or
dependent replay that would invalidate a stored exact sample fails atomically.
[Legends](../../api/legends.md)


## `editLegendBlock`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Available by v0.0.14. See [release compatibility](../../version.md).

```typescript
editLegendBlock(options: EditLegendBlockOptions): ChartProgram;
```

Named option contracts: [`EditLegendBlockOptions`](./../types.md#type-editlegendblockoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `target` | Required | `string` |
| `channel` | Required | `"color" \| "opacity" \| "shape" \| "size" \| "stroke" \| "strokeDash" \| "strokeWidth"` |
| `title` | Optional / branch-dependent | `string \| undefined` |
| `values` | Optional / branch-dependent | `"auto" \| readonly [number, ...number[]] \| undefined` |
| `count` | Optional / branch-dependent | `number \| undefined` |
| `order` | Optional / branch-dependent | `readonly CategoryValue[] \| undefined` |
| `gap` | Optional / branch-dependent | `number \| undefined` |
| `text` | Optional / branch-dependent | `LegendBlockTextPatch \| undefined` |
| `symbol` | Optional / branch-dependent | `LegendBlockSymbolPatch \| undefined` |
| `labelMap` | Optional / branch-dependent | `"auto" \| DisplayLabelMap \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
editLegendBlock({
  target, channel, title?, values?, count?, order?, gap?, text?, symbol?
})
```

Edit one logical legend block without changing sibling blocks on the same mark.
Both the mark `target` and a channel currently represented by the legend are
required. Merged categorical channels share one block identity, so selecting
color or shape in a color-and-shape block edits the same state.

Continuous size, opacity, and stroke-width blocks accept exact `values` or an
automatic `count`; categorical blocks accept an exact full-domain `order`.
`text` changes item-label typography and color, `symbol` changes supported
sample appearance, and `gap` changes internal spacing. Empty `text` or `symbol`
objects restore the base style. A symbol property that would replace the data
mapping is rejected. Empty `title` hides the selected block. Full programs only.
[Editing legends](../../api/legends/editing.md#editing-one-legend-block)


## `editLegendLayout`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
editLegendLayout(options: EditLegendLayoutOptions): ChartProgram;
```

Named option contracts: [`EditLegendLayoutOptions`](./../types.md#type-editlegendlayoutoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `target` | Optional / branch-dependent | `string \| undefined` |
| `layout` | Optional / branch-dependent | `"edge" \| "legacy-bottom" \| undefined` |
| `position` | Optional / branch-dependent | `"bottom" \| "left" \| "right" \| "top" \| undefined` |
| `align` | Optional / branch-dependent | `"center" \| "left" \| "right" \| undefined` |
| `direction` | Optional / branch-dependent | `"horizontal" \| "vertical" \| undefined` |
| `columns` | Optional / branch-dependent | `number \| undefined` |
| `offset` | Optional / branch-dependent | `number \| undefined` |
| `titlePosition` | Optional / branch-dependent | `"left" \| "top" \| undefined` |
| `itemGap` | Optional / branch-dependent | `number \| undefined` |

</details>

Behavior, inference, resets, and errors: [Focused legend edits](./guides.md#focused-legend-edits).



## `editLegendLabels`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
editLegendLabels(options: EditLegendLabelsOptions): ChartProgram;
```

Named option contracts: [`EditLegendLabelsOptions`](./../types.md#type-editlegendlabelsoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `target` | Optional / branch-dependent | `string \| undefined` |
| `offset` | Optional / branch-dependent | `number \| undefined` |
| `color` | Optional / branch-dependent | `string \| undefined` |
| `fontSize` | Optional / branch-dependent | `number \| undefined` |
| `fontFamily` | Optional / branch-dependent | `string \| undefined` |
| `fontWeight` | Optional / branch-dependent | `string \| number \| undefined` |
| `format` | Optional / branch-dependent | `ValueFormat \| undefined` |

</details>

Behavior, inference, resets, and errors: [Focused legend edits](./guides.md#focused-legend-edits).



## `editLegendTitle`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
editLegendTitle(options: EditLegendTitleOptions): ChartProgram;
```

Named option contracts: [`EditLegendTitleOptions`](./../types.md#type-editlegendtitleoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `target` | Optional / branch-dependent | `string \| undefined` |
| `title` | Optional / branch-dependent | `string \| false \| undefined` |
| `color` | Optional / branch-dependent | `string \| undefined` |
| `fontSize` | Optional / branch-dependent | `number \| undefined` |
| `fontFamily` | Optional / branch-dependent | `string \| undefined` |
| `fontWeight` | Optional / branch-dependent | `string \| number \| undefined` |

</details>

Behavior, inference, resets, and errors: [Focused legend edits](./guides.md#focused-legend-edits).



## `editLegendSymbols`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
editLegendSymbols(options: EditLegendSymbolsOptions): ChartProgram;
```

Named option contracts: [`EditLegendSymbolsOptions`](./../types.md#type-editlegendsymbolsoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `target` | Optional / branch-dependent | `string \| undefined` |
| `symbol` | Optional / branch-dependent | `LegendSymbolRecipe \| undefined` |
| `count` | Optional / branch-dependent | `number \| undefined` |
| `gradient` | Optional / branch-dependent | `{ length?: number \| undefined; thickness?: number \| undefined; } \| undefined` |

</details>

Behavior, inference, resets, and errors: [Focused legend edits](./guides.md#focused-legend-edits).



## `editLegendBorder`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
editLegendBorder(options: EditLegendBorderOptions): ChartProgram;
```

Named option contracts: [`EditLegendBorderOptions`](./../types.md#type-editlegendborderoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `target` | Optional / branch-dependent | `string \| undefined` |
| `border` | Required | `boolean \| LegendBorderOptions` |

</details>

Behavior, inference, resets, and errors: [Focused legend edits](./guides.md#focused-legend-edits).



## `createGuides`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
createGuides(options?: CreateGuidesOptions): ChartProgram;
```

Named option contracts: [`CreateGuidesOptions`](./../types.md#type-createguidesoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `axes` | Optional / branch-dependent | `false \| CreateAxesOptions \| undefined` |
| `grid` | Optional / branch-dependent | `false \| CreateGridOptions \| undefined` |
| `legend` | Optional / branch-dependent | `false \| LegendOptions \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
createGuides({ axes?, grid?, legend? })
```

Create applicable Cartesian or Polar axes and grids plus supported legends.
Automatic calls preserve existing guide collections and add missing applicable
collections; explicit collection objects retain strict create semantics.
[Guides](../../api/guides.md)


## `removeLegend`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
removeLegend(options?: RemoveLegendOptions): ChartProgram;
```

Named option contracts: [`RemoveLegendOptions`](./../types.md#type-removelegendoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `target` | Optional / branch-dependent | `string \| undefined` |
| `channels` | Optional / branch-dependent | `readonly ("color" \| "opacity" \| "shape" \| "size" \| "stroke" \| "strokeDash" \| "strokeWidth")[] \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
removeLegend({ target?, channels? })
```

Remove every legend block owned by one mark when `channels` is omitted, or
remove selected channels while preserving mark encodings, scales, and unrelated
blocks. Partial categorical removal retains remaining channels, styles, title
visibility, layout and item order; automatic symbols are inferred again. [Legends](../../api/legends.md)


## `createTitle`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
createTitle(options: TitleOptions): ChartProgram;
```

Named option contracts: [`TitleOptions`](./../types.md#type-titleoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `text` | Required | `string` |
| `subtitle` | Optional / branch-dependent | `string \| undefined` |
| `position` | Optional / branch-dependent | `"bottom" \| "left" \| "right" \| "top" \| undefined` |
| `align` | Optional / branch-dependent | `"center" \| "left" \| "right" \| undefined` |
| `offset` | Optional / branch-dependent | `number \| undefined` |
| `gap` | Optional / branch-dependent | `number \| undefined` |
| `maxWidth` | Optional / branch-dependent | `number \| undefined` |
| `wrap` | Optional / branch-dependent | `"character" \| "word" \| undefined` |
| `lineHeight` | Optional / branch-dependent | `number \| undefined` |
| `titleStyle` | Optional / branch-dependent | `TitleTextStyleOptions \| undefined` |
| `subtitleStyle` | Optional / branch-dependent | `TitleTextStyleOptions \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
createTitle({
  text, subtitle?, position?, align?, offset?, gap?,
  maxWidth?, wrap?, lineHeight?,
  titleStyle?, subtitleStyle?
})
```

Create a chart title and optional subtitle. [Titles](../../api/titles.md)


## `editTitle`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
editTitle(options: EditTitleOptions): ChartProgram;
```

Named option contracts: [`EditTitleOptions`](./../types.md#type-edittitleoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `text` | Optional / branch-dependent | `string \| undefined` |
| `subtitle` | Optional / branch-dependent | `string \| false \| undefined` |
| `position` | Optional / branch-dependent | `"bottom" \| "left" \| "right" \| "top" \| undefined` |
| `align` | Optional / branch-dependent | `"center" \| "left" \| "right" \| undefined` |
| `offset` | Optional / branch-dependent | `number \| undefined` |
| `gap` | Optional / branch-dependent | `number \| undefined` |
| `maxWidth` | Optional / branch-dependent | `number \| undefined` |
| `wrap` | Optional / branch-dependent | `"character" \| "word" \| undefined` |
| `lineHeight` | Optional / branch-dependent | `number \| undefined` |
| `titleStyle` | Optional / branch-dependent | `TitleTextStyleOptions \| undefined` |
| `subtitleStyle` | Optional / branch-dependent | `TitleTextStyleOptions \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
editTitle({
  text?, subtitle?, position?, align?, offset?, gap?,
  maxWidth?, wrap?, lineHeight?,
  titleStyle?, subtitleStyle?
})
```

Partially edit the existing title. `subtitle: false` removes the subtitle;
omitted properties remain unchanged. [Titles](../../api/titles.md)


## `removeTitle`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
removeTitle(): ChartProgram;
```

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

This action takes no named options.

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
removeTitle()
```

Remove the complete chart title and subtitle resource. [Titles](../../api/titles.md)


## `createThetaAxis`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
createThetaAxis(options?: CompleteThetaAxisOptions): ChartProgram;
```

Named option contracts: [`CompleteThetaAxisOptions`](./../types.md#type-completethetaaxisoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `ticksAndLabels` | Optional / branch-dependent | `false \| ThetaTicksAndLabelsOptions \| undefined` |
| `scale` | Optional / branch-dependent | `string \| undefined` |
| `coordinate` | Optional / branch-dependent | `string \| undefined` |
| `line` | Optional / branch-dependent | `false \| AxisLineStyleOptions \| undefined` |
| `title` | Optional / branch-dependent | `false \| PolarTitleOptions \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
createThetaAxis({ scale?, coordinate?, line?, ticksAndLabels?, title? } = {})
```

Create the complete outer circular theta axis. [Axes](../../api/axes.md)


## `createRadialAxis`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
createRadialAxis(options?: CompleteRadialAxisOptions): ChartProgram;
```

Named option contracts: [`CompleteRadialAxisOptions`](./../types.md#type-completeradialaxisoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `angle` | Optional / branch-dependent | `number \| undefined` |
| `title` | Optional / branch-dependent | `false \| RadialTitleOptions \| undefined` |
| `scale` | Optional / branch-dependent | `string \| undefined` |
| `coordinate` | Optional / branch-dependent | `string \| undefined` |
| `line` | Optional / branch-dependent | `false \| AxisLineStyleOptions \| undefined` |
| `ticksAndLabels` | Optional / branch-dependent | `false \| PolarTicksAndLabelsOptions \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
createRadialAxis({ scale?, coordinate?, angle?, line?, ticksAndLabels?, title? } = {})
```

Create the complete center-to-edge radial axis; `angle` defaults to `90`.
[Axes](../../api/axes.md)


## `editThetaAxis`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
editThetaAxis(options: EditThetaAxisOptions): ChartProgram;
```

Named option contracts: [`EditThetaAxisOptions`](./../types.md#type-editthetaaxisoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `labels` | Optional / branch-dependent | `false \| ThetaAxisLabelOptions \| undefined` |
| `ticksAndLabels` | Optional / branch-dependent | `false \| ThetaTicksAndLabelsOptions \| undefined` |
| `line` | Optional / branch-dependent | `false \| AxisLineStyleOptions \| undefined` |
| `ticks` | Optional / branch-dependent | `false \| PolarTickOptions \| undefined` |
| `title` | Optional / branch-dependent | `false \| PolarTitleOptions \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
editThetaAxis({ line?, ticks?, labels?, ticksAndLabels?, title? })
```

Edit selected theta-axis components. [Axes](../../api/axes.md#editing-a-complete-axis)


## `editRadialAxis`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
editRadialAxis(options: EditRadialAxisOptions): ChartProgram;
```

Named option contracts: [`EditRadialAxisOptions`](./../types.md#type-editradialaxisoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `title` | Optional / branch-dependent | `false \| RadialTitleOptions \| undefined` |
| `angle` | Optional / branch-dependent | `number \| undefined` |
| `line` | Optional / branch-dependent | `false \| AxisLineStyleOptions \| undefined` |
| `ticks` | Optional / branch-dependent | `false \| PolarTickOptions \| undefined` |
| `labels` | Optional / branch-dependent | `false \| PolarLabelOptions \| undefined` |
| `ticksAndLabels` | Optional / branch-dependent | `false \| PolarTicksAndLabelsOptions \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
editRadialAxis({ angle?, line?, ticks?, labels?, ticksAndLabels?, title? })
```

Edit selected radial components; `angle` moves the whole axis.
[Axes](../../api/axes.md#editing-a-complete-axis)


## `removeThetaAxis`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
removeThetaAxis(options?: RemoveAxisOptions): ChartProgram;
```

Named option contracts: [`RemoveAxisOptions`](./../types.md#type-removeaxisoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `coordinate` | Optional / branch-dependent | `string \| undefined` |
| `scale` | Optional / branch-dependent | `string \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
removeThetaAxis({ scale?, coordinate? } = {})
```

Remove the complete theta-axis resource. [Axes](../../api/axes.md#removing-an-axis)


## `removeRadialAxis`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
removeRadialAxis(options?: RemoveAxisOptions): ChartProgram;
```

Named option contracts: [`RemoveAxisOptions`](./../types.md#type-removeaxisoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `coordinate` | Optional / branch-dependent | `string \| undefined` |
| `scale` | Optional / branch-dependent | `string \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
removeRadialAxis({ scale?, coordinate? } = {})
```

Remove the complete radial-axis resource. [Axes](../../api/axes.md#removing-an-axis)


## `createThetaAxisLine`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
createThetaAxisLine(options?: CreateThetaAxisLineOptions): ChartProgram;
```

Named option contracts: [`CreateThetaAxisLineOptions`](./../types.md#type-createthetaaxislineoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `color` | Optional / branch-dependent | `string \| undefined` |
| `lineWidth` | Optional / branch-dependent | `number \| undefined` |
| `scale` | Optional / branch-dependent | `string \| undefined` |
| `coordinate` | Optional / branch-dependent | `string \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
createThetaAxisLine({ scale?, coordinate?, color?, lineWidth? } = {})
```

Create missing theta-axis line independently of the other components. Reuse stored axis bindings or infer one compatible Polar encoding. Existing components are edited with the matching `edit` action. [Axes](../../api/axes.md#polar-component-creation)


## `editThetaAxisLine`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
editThetaAxisLine(options?: AxisLineStyleOptions): ChartProgram;
```

Named option contracts: [`AxisLineStyleOptions`](./../types.md#type-axislinestyleoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `color` | Optional / branch-dependent | `string \| undefined` |
| `lineWidth` | Optional / branch-dependent | `number \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
editThetaAxisLine({ color?, lineWidth? } = {})
```

Edit the outer baseline style. [Axes](../../api/axes.md)


## `createRadialAxisLine`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
createRadialAxisLine(options?: CreateRadialAxisLineOptions): ChartProgram;
```

Named option contracts: [`CreateRadialAxisLineOptions`](./../types.md#type-createradialaxislineoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `color` | Optional / branch-dependent | `string \| undefined` |
| `lineWidth` | Optional / branch-dependent | `number \| undefined` |
| `scale` | Optional / branch-dependent | `string \| undefined` |
| `coordinate` | Optional / branch-dependent | `string \| undefined` |
| `angle` | Optional / branch-dependent | `number \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
createRadialAxisLine({ scale?, coordinate?, angle?, color?, lineWidth? } = {})
```

Create missing radial-axis line independently of the other components. Reuse stored axis bindings or infer one compatible Polar encoding. Existing components are edited with the matching `edit` action. [Axes](../../api/axes.md#polar-component-creation)


## `editRadialAxisLine`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
editRadialAxisLine(options?: AxisLineStyleOptions): ChartProgram;
```

Named option contracts: [`AxisLineStyleOptions`](./../types.md#type-axislinestyleoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `color` | Optional / branch-dependent | `string \| undefined` |
| `lineWidth` | Optional / branch-dependent | `number \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
editRadialAxisLine({ color?, lineWidth? } = {})
```

Edit the radial baseline style. [Axes](../../api/axes.md)


## `createThetaAxisTicks`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
createThetaAxisTicks(options?: CreateThetaAxisTicksOptions): ChartProgram;
```

Named option contracts: [`CreateThetaAxisTicksOptions`](./../types.md#type-createthetaaxisticksoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `color` | Optional / branch-dependent | `string \| undefined` |
| `lineWidth` | Optional / branch-dependent | `number \| undefined` |
| `length` | Optional / branch-dependent | `number \| undefined` |
| `count` | Optional / branch-dependent | `number \| undefined` |
| `values` | Optional / branch-dependent | `readonly AxisValue[] \| undefined` |
| `scale` | Optional / branch-dependent | `string \| undefined` |
| `coordinate` | Optional / branch-dependent | `string \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
createThetaAxisTicks({ scale?, coordinate?, count?, values?, length?, color?, lineWidth? } = {})
```

Create missing theta-axis ticks independently of the other components. Use count or exact values, never both. Reuse stored axis bindings or infer one compatible Polar encoding. Existing components are edited with the matching `edit` action. [Axes](../../api/axes.md#polar-component-creation)


## `editThetaAxisTicks`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
editThetaAxisTicks(options?: PolarTickOptions): ChartProgram;
```

Named option contracts: [`PolarTickOptions`](./../types.md#type-polartickoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `count` | Optional / branch-dependent | `number \| undefined` |
| `values` | Optional / branch-dependent | `readonly AxisValue[] \| undefined` |
| `color` | Optional / branch-dependent | `string \| undefined` |
| `lineWidth` | Optional / branch-dependent | `number \| undefined` |
| `length` | Optional / branch-dependent | `number \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
editThetaAxisTicks({ count?, values?, length?, color?, lineWidth? } = {})
```

Edit theta tick geometry and style. [Axes](../../api/axes.md)


## `createRadialAxisTicks`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
createRadialAxisTicks(options?: CreateRadialAxisTicksOptions): ChartProgram;
```

Named option contracts: [`CreateRadialAxisTicksOptions`](./../types.md#type-createradialaxisticksoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `color` | Optional / branch-dependent | `string \| undefined` |
| `lineWidth` | Optional / branch-dependent | `number \| undefined` |
| `length` | Optional / branch-dependent | `number \| undefined` |
| `count` | Optional / branch-dependent | `number \| undefined` |
| `values` | Optional / branch-dependent | `readonly AxisValue[] \| undefined` |
| `scale` | Optional / branch-dependent | `string \| undefined` |
| `coordinate` | Optional / branch-dependent | `string \| undefined` |
| `angle` | Optional / branch-dependent | `number \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
createRadialAxisTicks({ scale?, coordinate?, angle?, count?, values?, length?, color?, lineWidth? } = {})
```

Create missing radial-axis ticks independently of the other components. Use count or exact values, never both. Reuse stored axis bindings or infer one compatible Polar encoding. Existing components are edited with the matching `edit` action. [Axes](../../api/axes.md#polar-component-creation)


## `editRadialAxisTicks`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
editRadialAxisTicks(options?: PolarTickOptions): ChartProgram;
```

Named option contracts: [`PolarTickOptions`](./../types.md#type-polartickoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `count` | Optional / branch-dependent | `number \| undefined` |
| `values` | Optional / branch-dependent | `readonly AxisValue[] \| undefined` |
| `color` | Optional / branch-dependent | `string \| undefined` |
| `lineWidth` | Optional / branch-dependent | `number \| undefined` |
| `length` | Optional / branch-dependent | `number \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
editRadialAxisTicks({ count?, values?, length?, color?, lineWidth? } = {})
```

Edit radial tick geometry and style. [Axes](../../api/axes.md)


## `createThetaAxisLabels`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
createThetaAxisLabels(options?: CreateThetaAxisLabelsOptions): ChartProgram;
```

Named option contracts: [`CreateThetaAxisLabelsOptions`](./../types.md#type-createthetaaxislabelsoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `offset` | Optional / branch-dependent | `number \| undefined` |
| `format` | Optional / branch-dependent | `AxisFormat \| undefined` |
| `color` | Optional / branch-dependent | `string \| undefined` |
| `fontSize` | Optional / branch-dependent | `number \| undefined` |
| `fontFamily` | Optional / branch-dependent | `string \| undefined` |
| `fontWeight` | Optional / branch-dependent | `string \| number \| undefined` |
| `count` | Optional / branch-dependent | `number \| undefined` |
| `values` | Optional / branch-dependent | `readonly AxisValue[] \| undefined` |
| `scale` | Optional / branch-dependent | `string \| undefined` |
| `coordinate` | Optional / branch-dependent | `string \| undefined` |
| `labelMap` | Optional / branch-dependent | `"auto" \| DisplayLabelMap \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
createThetaAxisLabels({ scale?, coordinate?, count?, values?, offset?, format?, color?, fontSize?, fontFamily?, fontWeight? } = {})
```

Create missing theta-axis labels independently of the other components. Use count or exact values, never both. Reuse stored axis bindings or infer one compatible Polar encoding. Existing components are edited with the matching `edit` action. [Axes](../../api/axes.md#polar-component-creation)


## `editThetaAxisLabels`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
editThetaAxisLabels(options?: ThetaAxisLabelOptions): ChartProgram;
```

Named option contracts: [`ThetaAxisLabelOptions`](./../types.md#type-thetaaxislabeloptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `count` | Optional / branch-dependent | `number \| undefined` |
| `values` | Optional / branch-dependent | `readonly AxisValue[] \| undefined` |
| `offset` | Optional / branch-dependent | `number \| undefined` |
| `format` | Optional / branch-dependent | `AxisFormat \| undefined` |
| `color` | Optional / branch-dependent | `string \| undefined` |
| `fontSize` | Optional / branch-dependent | `number \| undefined` |
| `fontFamily` | Optional / branch-dependent | `string \| undefined` |
| `fontWeight` | Optional / branch-dependent | `string \| number \| undefined` |
| `labelMap` | Optional / branch-dependent | `"auto" \| DisplayLabelMap \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
editThetaAxisLabels({ count?, values?, offset?, format?, color?, fontSize?, fontFamily?, fontWeight? } = {})
```

Edit perimeter theta labels. [Axes](../../api/axes.md)


## `createRadialAxisLabels`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
createRadialAxisLabels(options?: CreateRadialAxisLabelsOptions): ChartProgram;
```

Named option contracts: [`CreateRadialAxisLabelsOptions`](./../types.md#type-createradialaxislabelsoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `offset` | Optional / branch-dependent | `number \| undefined` |
| `format` | Optional / branch-dependent | `AxisFormat \| undefined` |
| `color` | Optional / branch-dependent | `string \| undefined` |
| `fontSize` | Optional / branch-dependent | `number \| undefined` |
| `fontFamily` | Optional / branch-dependent | `string \| undefined` |
| `fontWeight` | Optional / branch-dependent | `string \| number \| undefined` |
| `count` | Optional / branch-dependent | `number \| undefined` |
| `values` | Optional / branch-dependent | `readonly AxisValue[] \| undefined` |
| `scale` | Optional / branch-dependent | `string \| undefined` |
| `coordinate` | Optional / branch-dependent | `string \| undefined` |
| `angle` | Optional / branch-dependent | `number \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
createRadialAxisLabels({ scale?, coordinate?, angle?, count?, values?, offset?, format?, color?, fontSize?, fontFamily?, fontWeight? } = {})
```

Create missing radial-axis labels independently of the other components. Use count or exact values, never both. Reuse stored axis bindings or infer one compatible Polar encoding. Existing components are edited with the matching `edit` action. [Axes](../../api/axes.md#polar-component-creation)


## `editRadialAxisLabels`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
editRadialAxisLabels(options?: PolarLabelOptions): ChartProgram;
```

Named option contracts: [`PolarLabelOptions`](./../types.md#type-polarlabeloptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `count` | Optional / branch-dependent | `number \| undefined` |
| `values` | Optional / branch-dependent | `readonly AxisValue[] \| undefined` |
| `offset` | Optional / branch-dependent | `number \| undefined` |
| `format` | Optional / branch-dependent | `AxisFormat \| undefined` |
| `color` | Optional / branch-dependent | `string \| undefined` |
| `fontSize` | Optional / branch-dependent | `number \| undefined` |
| `fontFamily` | Optional / branch-dependent | `string \| undefined` |
| `fontWeight` | Optional / branch-dependent | `string \| number \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
editRadialAxisLabels({ count?, values?, offset?, format?, color?, fontSize?, fontFamily?, fontWeight? } = {})
```

Edit radial value labels. [Axes](../../api/axes.md)


## `createThetaAxisTitle`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
createThetaAxisTitle(options?: CreateThetaAxisTitleOptions): ChartProgram;
```

Named option contracts: [`CreateThetaAxisTitleOptions`](./../types.md#type-createthetaaxistitleoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `text` | Optional / branch-dependent | `string \| undefined` |
| `offset` | Optional / branch-dependent | `number \| undefined` |
| `color` | Optional / branch-dependent | `string \| undefined` |
| `fontSize` | Optional / branch-dependent | `number \| undefined` |
| `fontFamily` | Optional / branch-dependent | `string \| undefined` |
| `fontWeight` | Optional / branch-dependent | `string \| number \| undefined` |
| `scale` | Optional / branch-dependent | `string \| undefined` |
| `coordinate` | Optional / branch-dependent | `string \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
createThetaAxisTitle({ scale?, coordinate?, text?, offset?, color?, fontSize?, fontFamily?, fontWeight? } = {})
```

Create missing theta-axis title independently of the other components. Reuse stored axis bindings or infer one compatible Polar encoding. Existing components are edited with the matching `edit` action. [Axes](../../api/axes.md#polar-component-creation)


## `editThetaAxisTitle`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
editThetaAxisTitle(options?: PolarTitleOptions): ChartProgram;
```

Named option contracts: [`PolarTitleOptions`](./../types.md#type-polartitleoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `text` | Optional / branch-dependent | `string \| undefined` |
| `offset` | Optional / branch-dependent | `number \| undefined` |
| `color` | Optional / branch-dependent | `string \| undefined` |
| `fontSize` | Optional / branch-dependent | `number \| undefined` |
| `fontFamily` | Optional / branch-dependent | `string \| undefined` |
| `fontWeight` | Optional / branch-dependent | `string \| number \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
editThetaAxisTitle({ text?, offset?, color?, fontSize?, fontFamily?, fontWeight? } = {})
```

Edit the theta title. [Axes](../../api/axes.md)


## `createRadialAxisTitle`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
createRadialAxisTitle(options?: CreateRadialAxisTitleOptions): ChartProgram;
```

Named option contracts: [`CreateRadialAxisTitleOptions`](./../types.md#type-createradialaxistitleoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `position` | Optional / branch-dependent | `"inside" \| "outside" \| undefined` |
| `text` | Optional / branch-dependent | `string \| undefined` |
| `offset` | Optional / branch-dependent | `number \| undefined` |
| `color` | Optional / branch-dependent | `string \| undefined` |
| `fontSize` | Optional / branch-dependent | `number \| undefined` |
| `fontFamily` | Optional / branch-dependent | `string \| undefined` |
| `fontWeight` | Optional / branch-dependent | `string \| number \| undefined` |
| `scale` | Optional / branch-dependent | `string \| undefined` |
| `coordinate` | Optional / branch-dependent | `string \| undefined` |
| `angle` | Optional / branch-dependent | `number \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
createRadialAxisTitle({ scale?, coordinate?, angle?, text?, offset?, color?, fontSize?, fontFamily?, fontWeight?, position? } = {})
```

Create missing radial-axis title independently of the other components. Reuse stored axis bindings or infer one compatible Polar encoding. Existing components are edited with the matching `edit` action. [Axes](../../api/axes.md#polar-component-creation)


## `editRadialAxisTitle`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
editRadialAxisTitle(options?: RadialTitleOptions): ChartProgram;
```

Named option contracts: [`RadialTitleOptions`](./../types.md#type-radialtitleoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `position` | Optional / branch-dependent | `"inside" \| "outside" \| undefined` |
| `text` | Optional / branch-dependent | `string \| undefined` |
| `offset` | Optional / branch-dependent | `number \| undefined` |
| `color` | Optional / branch-dependent | `string \| undefined` |
| `fontSize` | Optional / branch-dependent | `number \| undefined` |
| `fontFamily` | Optional / branch-dependent | `string \| undefined` |
| `fontWeight` | Optional / branch-dependent | `string \| number \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
editRadialAxisTitle({ text?, position?, offset?, color?, fontSize?, fontFamily?, fontWeight? } = {})
```

Edit the radial title. `position` accepts `"inside"` or `"outside"` and defaults
to the baseline midpoint inside the plot. [Axes](../../api/axes.md)


## `createThetaGrid`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
createThetaGrid(options?: PolarGridOptions): ChartProgram;
```

Named option contracts: [`PolarGridOptions`](./../types.md#type-polargridoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `scale` | Optional / branch-dependent | `string \| undefined` |
| `coordinate` | Optional / branch-dependent | `string \| undefined` |
| `count` | Optional / branch-dependent | `number \| undefined` |
| `values` | Optional / branch-dependent | `readonly AxisValue[] \| undefined` |
| `color` | Optional / branch-dependent | `string \| undefined` |
| `lineWidth` | Optional / branch-dependent | `number \| undefined` |
| `strokeDash` | Optional / branch-dependent | `readonly number[] \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
createThetaGrid({ scale?, coordinate?, count?, values?, color?, lineWidth?, strokeDash? } = {})
```

Create theta spokes behind related marks. [Grids](../../api/grids.md)


## `createRadialGrid`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
createRadialGrid(options?: PolarGridOptions): ChartProgram;
```

Named option contracts: [`PolarGridOptions`](./../types.md#type-polargridoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `scale` | Optional / branch-dependent | `string \| undefined` |
| `coordinate` | Optional / branch-dependent | `string \| undefined` |
| `count` | Optional / branch-dependent | `number \| undefined` |
| `values` | Optional / branch-dependent | `readonly AxisValue[] \| undefined` |
| `color` | Optional / branch-dependent | `string \| undefined` |
| `lineWidth` | Optional / branch-dependent | `number \| undefined` |
| `strokeDash` | Optional / branch-dependent | `readonly number[] \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
createRadialGrid({ scale?, coordinate?, count?, values?, color?, lineWidth?, strokeDash? } = {})
```

Create concentric radial paths behind related marks. [Grids](../../api/grids.md)


## `editThetaGrid`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
editThetaGrid(options: EditPolarGridOptions): ChartProgram;
```

Named option contracts: [`EditPolarGridOptions`](./../types.md#type-editpolargridoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `count` | Optional / branch-dependent | `number \| undefined` |
| `values` | Optional / branch-dependent | `readonly AxisValue[] \| undefined` |
| `color` | Optional / branch-dependent | `string \| undefined` |
| `lineWidth` | Optional / branch-dependent | `number \| undefined` |
| `strokeDash` | Optional / branch-dependent | `readonly number[] \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
editThetaGrid({ count?, values?, color?, lineWidth?, strokeDash? })
```

Edit the existing theta grid. [Grids](../../api/grids.md#editing-grids)


## `editRadialGrid`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
editRadialGrid(options: EditPolarGridOptions): ChartProgram;
```

Named option contracts: [`EditPolarGridOptions`](./../types.md#type-editpolargridoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `count` | Optional / branch-dependent | `number \| undefined` |
| `values` | Optional / branch-dependent | `readonly AxisValue[] \| undefined` |
| `color` | Optional / branch-dependent | `string \| undefined` |
| `lineWidth` | Optional / branch-dependent | `number \| undefined` |
| `strokeDash` | Optional / branch-dependent | `readonly number[] \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
editRadialGrid({ count?, values?, color?, lineWidth?, strokeDash? })
```

Edit the existing radial grid. [Grids](../../api/grids.md#editing-grids)


## `createParallelAxes`, `createParallelAxis`, `editParallelAxis`, `removeParallelAxis`, `removeParallelAxes`

```javascript
createParallelAxes({ target?, coordinate? })
createParallelAxis({ field, target?, line?, ticks?, labels?, ticksAndLabels?, title? })
editParallelAxis({ field, target?, line?, ticks?, labels?, ticksAndLabels?, title? })
removeParallelAxis({ field, target? })
removeParallelAxes({ target?, coordinate? })
```

Full-only field-selected Parallel guides. Create requires missing resources;
edit/removal requires existing resources. Component `false` skips creation or
removes an existing component. Group and individual tick/label options are
exclusive. Field recipes and explicit titles survive dimension reordering.
The last component removal clears the guide owner. [Axes](../../api/axes.md) owns
exact styles, defaults, inference, validation and replay behavior.

## Complete single-channel axes

```javascript
createXAxis({ scale?, coordinate?, position?, line?, ticksAndLabels?, title? })
createYAxis({ scale?, coordinate?, position?, line?, ticksAndLabels?, title? })
editXAxis({ position?, line?: false | {...}, ticks?: false | {...},
  labels?: false | {...}, ticksAndLabels?: false | {...}, title?: false | {...} })
editYAxis({ position?, line?: false | {...}, ticks?: false | {...},
  labels?: false | {...}, ticksAndLabels?: false | {...}, title?: false | {...} })
```

Cartesian and Polar complete-axis creators accept `false` for `line`,
`ticksAndLabels`, or `title` to omit those components; at least one must remain
enabled. Complete-axis edits update only the selected components of an existing axis.
Each component accepts its edit object or `false` for removal. Use
`ticksAndLabels` for a coordinated tick/label edit or removal, or `ticks` and
`labels` for independent edits/removals; do not combine both forms. Removal
preserves scale, coordinate, encoding, and data, while the last component also
cleans the empty axis state.

## Axis lines, ticks, and labels

```javascript
createXAxisLine({ scale?, position?, color?, lineWidth? })
createYAxisLine({ scale?, position?, color?, lineWidth? })
editXAxisLine({ position?, color?, lineWidth? })
editYAxisLine({ position?, color?, lineWidth? })

createXAxisTicks({ scale?, position?, count?, values?, length?, color?, lineWidth? })
createYAxisTicks({ scale?, position?, count?, values?, length?, color?, lineWidth? })
editXAxisTicks({ position?, count?, values?, length?, color?, lineWidth? })
editYAxisTicks({ position?, count?, values?, length?, color?, lineWidth? })

createXAxisLabels({
  scale?, position?, count?, values?, offset?, format?, color?,
  fontSize?, fontFamily?, fontWeight?
})
createYAxisLabels({
  scale?, position?, count?, values?, offset?, format?, color?,
  fontSize?, fontFamily?, fontWeight?
})
editXAxisLabels({
  position?, count?, values?, offset?, format?, color?,
  fontSize?, fontFamily?, fontWeight?
})
editYAxisLabels({
  position?, count?, values?, offset?, format?, color?,
  fontSize?, fontFamily?, fontWeight?
})
```

Axis `position` is `"bottom" | "top"` for x and `"left" | "right"` for y.
Label `format` accepts `"auto"`, `{ decimals }`, `.0`–`.12` precision with
`f`, `%`, or `e`, or a UTC sequence of `%Y/%m/%d/%b` directives and literals
when compatible with the resolved scale. Use `%%` for a literal percent;
unknown or dangling directives reject.

## Tick/label groups and axis titles

```javascript
createXAxisTicksAndLabels({ scale?, position?, count?, values?, ticks?, labels? })
createYAxisTicksAndLabels({ scale?, position?, count?, values?, ticks?, labels? })
editXAxisTicksAndLabels({ position?, count?, values?, ticks?, labels? })
editYAxisTicksAndLabels({ position?, count?, values?, ticks?, labels? })

createXAxisTitle({
  text?, scale?, position?, at?, offset?, rotation?, color?,
  fontSize?, fontFamily?, fontWeight?
})
createYAxisTitle({
  text?, scale?, position?, at?, offset?, rotation?, color?,
  fontSize?, fontFamily?, fontWeight?
})
editXAxisTitle({
  text?, position?, at?, offset?, rotation?, color?,
  fontSize?, fontFamily?, fontWeight?
})
editYAxisTitle({
  text?, position?, at?, offset?, rotation?, color?,
  fontSize?, fontFamily?, fontWeight?
})
```

Cartesian title `rotation` accepts a finite legacy number in radians or
`{ value, unit: "degrees" | "radians" }`. Both forms normalize to concrete
radians. Polar component `angle` remains degree-valued placement.

## Complete axis removal

```javascript
removeXAxis({ coordinate?, scale? })
removeYAxis({ coordinate?, scale? })
```

Remove one complete Cartesian axis. Optional selectors must match the existing
resource. [Axes](../../api/axes.md)

## Directional grids

```javascript
createHorizontalGrid({ scale?, coordinate?, count?, values?, color?, lineWidth?, strokeDash? })
createVerticalGrid({ scale?, coordinate?, count?, values?, color?, lineWidth?, strokeDash? })
editHorizontalGrid({ count?, values?, color?, lineWidth?, strokeDash? })
editVerticalGrid({ count?, values?, color?, lineWidth?, strokeDash? })
editGrid({
  horizontal?: { count?, values?, color?, lineWidth?, strokeDash? },
  vertical?: { count?, values?, color?, lineWidth?, strokeDash? }
})
```

Directional grid edits require an existing grid. Their `values` option accepts
an exact finite array or `"auto"` to restore current axis/scale inference.
`editGrid` applies one or both directional edits through the same actions.

```javascript
removeGrid({ horizontal?, vertical? })
```

Remove all existing directions when omitted, or only directions selected with
`true`.

See [Coordinates](../../api/coordinates.md) and
[Advanced axis components](../../advanced/axis-components.md).

## Focused legend edits

```javascript
editLegendLayout({
  target?, position?, layout?, align?, direction?, columns?, offset?,
  titlePosition?, itemGap?
})
editLegendLabels({ target?, offset?, color?, fontSize?, fontFamily?, fontWeight?, format? })
editLegendTitle({
  target?, title?, color?, fontSize?, fontFamily?, fontWeight?
})
editLegendSymbols({ target?, symbol?, count?, gradient? })
editLegendBorder({ target?, border })
```

Edit one legend component without constructing the nested options accepted by
`editLegend`. Each action uses the same target inference, validation, and
rematerialization as `editLegend`. At least one component change is required.
[Editing legends](../../api/legends/editing.md#focused-edits)

## Related

[Action Reference](../actions.md) · [Chart API](../../api/index.md) · [Supported Features](../../supported-features.md)
