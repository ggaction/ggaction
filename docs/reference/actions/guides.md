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
  target?, channels?, position?, align?, direction?, columns?, offset?,
  titlePosition?, title?, symbol?, labels?, titleStyle?, itemGap?, border?, count?,
  gradient?
})
```

Create categorical, point-size, continuous-color gradient, discretized-color
interval, or field-opacity sample legends. Continuous legends support right, left, top, and bottom
placement. Categorical legends also support left side placement; composite
point and size blocks remain in deterministic vertical order.
[Legends](../../api/legends.md)

## `editLegend`

```javascript
editLegend({
  target?, position?, align?, direction?, columns?, offset?, titlePosition?,
  title?, symbol?, labels?, titleStyle?, itemGap?, border?, count?, gradient?
})
```

Partially edit one existing legend. `title` accepts a non-empty string,
`"auto"`, or `false`; semantic channel bindings cannot be edited. A
stroke-width legend accepts the bounded `title`, `count`, `labels`, and
`titleStyle` subset and remains right-positioned.
[Legends](../../api/legends.md)

## Focused legend edits

```javascript
editLegendLayout({
  target?, position?, align?, direction?, columns?, offset?,
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
remove selected complete channel blocks while preserving mark encodings,
scales, and unrelated blocks. Combined categorical blocks require their full
represented channel set. [Legends](../../api/legends.md)

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
