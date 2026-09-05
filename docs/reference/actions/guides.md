---
layout: default
title: Guide, Axis, Grid, and Title Actions
description: Create, edit, and remove axes, grids, legends, and chart titles.
---

# Guide, Axis, Grid, and Title Actions

These are direct immutable `ChartProgram` actions. Each accepts one option object and returns a new program.

## `createGuides`

```javascript
createGuides({ axes?, grid?, legend? })
```

Create applicable Cartesian or Polar axes and grids plus supported legends.
[Guides](../../api/guides.md)

## `createAxes`

```javascript
createAxes({ coordinate?, x?, y?, theta?, radius? })
```

Create Cartesian or Polar axes directly, including inferred titles and ticks.
[Axes](../../api/axes.md)

## `createThetaAxis`

```javascript
createThetaAxis({ scale?, coordinate?, line?, ticksAndLabels?, title? } = {})
```

Create the complete outer circular theta axis. [Axes](../../api/axes.md)

## `createRadialAxis`

```javascript
createRadialAxis({ scale?, coordinate?, angle?, line?, ticksAndLabels?, title? } = {})
```

Create the complete center-to-edge radial axis; `angle` defaults to `90`.
[Axes](../../api/axes.md)

## `editThetaAxis`

```javascript
editThetaAxis({ line?, ticks?, labels?, ticksAndLabels?, title? })
```

Edit selected theta-axis components. [Axes](../../api/axes.md#editing-a-complete-axis)

## `editRadialAxis`

```javascript
editRadialAxis({ angle?, line?, ticks?, labels?, ticksAndLabels?, title? })
```

Edit selected radial components; `angle` moves the whole axis.
[Axes](../../api/axes.md#editing-a-complete-axis)

## `createThetaAxisLine`

```javascript
createThetaAxisLine({ scale?, coordinate?, color?, lineWidth? } = {})
```

Create missing theta-axis line independently of the other components. Reuse stored axis bindings or infer one compatible Polar encoding. Existing components are edited with the matching `edit` action. [Axes](../../api/axes.md#polar-component-creation)

## `createRadialAxisLine`

```javascript
createRadialAxisLine({ scale?, coordinate?, angle?, color?, lineWidth? } = {})
```

Create missing radial-axis line independently of the other components. Reuse stored axis bindings or infer one compatible Polar encoding. Existing components are edited with the matching `edit` action. [Axes](../../api/axes.md#polar-component-creation)

## `createThetaAxisTicks`

```javascript
createThetaAxisTicks({ scale?, coordinate?, count?, values?, length?, color?, lineWidth? } = {})
```

Create missing theta-axis ticks independently of the other components. Use count or exact values, never both. Reuse stored axis bindings or infer one compatible Polar encoding. Existing components are edited with the matching `edit` action. [Axes](../../api/axes.md#polar-component-creation)

## `createRadialAxisTicks`

```javascript
createRadialAxisTicks({ scale?, coordinate?, angle?, count?, values?, length?, color?, lineWidth? } = {})
```

Create missing radial-axis ticks independently of the other components. Use count or exact values, never both. Reuse stored axis bindings or infer one compatible Polar encoding. Existing components are edited with the matching `edit` action. [Axes](../../api/axes.md#polar-component-creation)

## `createThetaAxisLabels`

```javascript
createThetaAxisLabels({ scale?, coordinate?, count?, values?, offset?, format?, color?, fontSize?, fontFamily?, fontWeight? } = {})
```

Create missing theta-axis labels independently of the other components. Use count or exact values, never both. Reuse stored axis bindings or infer one compatible Polar encoding. Existing components are edited with the matching `edit` action. [Axes](../../api/axes.md#polar-component-creation)

## `createRadialAxisLabels`

```javascript
createRadialAxisLabels({ scale?, coordinate?, angle?, count?, values?, offset?, format?, color?, fontSize?, fontFamily?, fontWeight? } = {})
```

Create missing radial-axis labels independently of the other components. Use count or exact values, never both. Reuse stored axis bindings or infer one compatible Polar encoding. Existing components are edited with the matching `edit` action. [Axes](../../api/axes.md#polar-component-creation)

## `createThetaAxisTitle`

```javascript
createThetaAxisTitle({ scale?, coordinate?, text?, offset?, color?, fontSize?, fontFamily?, fontWeight? } = {})
```

Create missing theta-axis title independently of the other components. Reuse stored axis bindings or infer one compatible Polar encoding. Existing components are edited with the matching `edit` action. [Axes](../../api/axes.md#polar-component-creation)

## `createRadialAxisTitle`

```javascript
createRadialAxisTitle({ scale?, coordinate?, angle?, text?, offset?, color?, fontSize?, fontFamily?, fontWeight?, position? } = {})
```

Create missing radial-axis title independently of the other components. Reuse stored axis bindings or infer one compatible Polar encoding. Existing components are edited with the matching `edit` action. [Axes](../../api/axes.md#polar-component-creation)

## `editThetaAxisLine`

```javascript
editThetaAxisLine({ color?, lineWidth? } = {})
```

Edit the outer baseline style. [Axes](../../api/axes.md)

## `editRadialAxisLine`

```javascript
editRadialAxisLine({ color?, lineWidth? } = {})
```

Edit the radial baseline style. [Axes](../../api/axes.md)

## `editThetaAxisTicks`

```javascript
editThetaAxisTicks({ count?, values?, length?, color?, lineWidth? } = {})
```

Edit theta tick geometry and style. [Axes](../../api/axes.md)

## `editRadialAxisTicks`

```javascript
editRadialAxisTicks({ count?, values?, length?, color?, lineWidth? } = {})
```

Edit radial tick geometry and style. [Axes](../../api/axes.md)

## `editThetaAxisLabels`

```javascript
editThetaAxisLabels({ count?, values?, offset?, format?, color?, fontSize?, fontFamily?, fontWeight? } = {})
```

Edit perimeter theta labels. [Axes](../../api/axes.md)

## `editRadialAxisLabels`

```javascript
editRadialAxisLabels({ count?, values?, offset?, format?, color?, fontSize?, fontFamily?, fontWeight? } = {})
```

Edit radial value labels. [Axes](../../api/axes.md)

## `editThetaAxisTitle`

```javascript
editThetaAxisTitle({ text?, offset?, color?, fontSize?, fontFamily?, fontWeight? } = {})
```

Edit the theta title. [Axes](../../api/axes.md)

## `editRadialAxisTitle`

```javascript
editRadialAxisTitle({ text?, position?, offset?, color?, fontSize?, fontFamily?, fontWeight? } = {})
```

Edit the radial title. `position` accepts `"inside"` or `"outside"` and defaults
to the baseline midpoint inside the plot. [Axes](../../api/axes.md)

## `removeThetaAxis`

```javascript
removeThetaAxis({ scale?, coordinate? } = {})
```

Remove the complete theta-axis resource. [Axes](../../api/axes.md#removing-an-axis)

## `removeRadialAxis`

```javascript
removeRadialAxis({ scale?, coordinate? } = {})
```

Remove the complete radial-axis resource. [Axes](../../api/axes.md#removing-an-axis)

## `createGrid`

```javascript
createGrid({ horizontal?, vertical?, theta?, radial? })
```

Create inferred horizontal and/or vertical Cartesian grid lines behind related
marks, or infer the Polar grid families backed by stored theta/radius encodings.
[Grids](../../api/grids.md)

## `createThetaGrid`

```javascript
createThetaGrid({ scale?, coordinate?, count?, values?, color?, lineWidth?, strokeDash? } = {})
```

Create theta spokes behind related marks. [Grids](../../api/grids.md)

## `createRadialGrid`

```javascript
createRadialGrid({ scale?, coordinate?, count?, values?, color?, lineWidth?, strokeDash? } = {})
```

Create concentric radial paths behind related marks. [Grids](../../api/grids.md)

## `editThetaGrid`

```javascript
editThetaGrid({ count?, values?, color?, lineWidth?, strokeDash? })
```

Edit the existing theta grid. [Grids](../../api/grids.md#editing-grids)

## `editRadialGrid`

```javascript
editRadialGrid({ count?, values?, color?, lineWidth?, strokeDash? })
```

Edit the existing radial grid. [Grids](../../api/grids.md#editing-grids)

## `createLegend`

```javascript
createLegend({
  target?, channels?, position?, layout?, align?, direction?, columns?, offset?,
  titlePosition?, title?, symbol?, labels?, titleStyle?, itemGap?, border?, count?,
  gradient?, order?
})
```

Create categorical, point-size, continuous-color gradient, discretized-color
interval, or field-opacity sample legends. Explicit `channels` creates exactly
the selected content; include `"size"` in a point categorical-and-size request.
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
[Legends](../../api/legends.md)

## `editLegend`

```javascript
editLegend({
  target?, channels?, position?, layout?, align?, direction?, columns?, offset?, titlePosition?,
  title?, symbol?, labels?, titleStyle?, itemGap?, border?, count?, gradient?, order?
})
```

Partially edit one existing legend. Omitted categorical `layout` preserves the
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
[Legends](../../api/legends.md)

## Focused legend edits

```javascript
editLegendLayout({
  target?, position?, layout?, align?, direction?, columns?, offset?,
  titlePosition?, itemGap?
})
editLegendLabels({ target?, color?, fontSize?, fontFamily?, fontWeight? })
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

## `removeLegend`

```javascript
removeLegend({ target?, channels? })
```

Remove every legend block owned by one mark when `channels` is omitted, or
remove selected channels while preserving mark encodings, scales, and unrelated
blocks. Partial categorical removal retains remaining channels, styles, title
visibility, layout and item order; automatic symbols are inferred again. [Legends](../../api/legends.md)

## `createTitle`

```javascript
createTitle({
  text, subtitle?, position?, align?, offset?, gap?,
  maxWidth?, wrap?, lineHeight?,
  titleStyle?, subtitleStyle?
})
```

Create a chart title and optional subtitle. [Titles](../../api/titles.md)

## `editTitle`

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

```javascript
removeTitle()
```

Remove the complete chart title and subtitle resource. [Titles](../../api/titles.md)

## Related

[Action Reference](../actions.md) · [Chart API](../../api/index.md) · [Supported Features](../../supported-features.md)
