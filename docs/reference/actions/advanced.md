---
layout: default
title: Advanced Chart Actions
description: Author explicit semantic resources and control individual Cartesian axis and grid components.
---

# Advanced Chart Actions

Use these actions when the complete chart and guide facades do not expose the required control.

Use these actions for explicit semantic resources or focused axis control.

## Reusable mark selections

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

```javascript
editMarkSelection({ selection?, grain?, field | channel | property, op, ...operatorOptions })
```

Replace the complete selector while preserving the stored selection ID and
mark target. Dependent highlights and exact categorical legend reflection are
replayed from a clean baseline.
[Selection lifecycle](../../api/appearance/selection-and-highlighting.md#editing-and-removing-stored-intent)

## `removeMarkSelection`

```javascript
removeMarkSelection({ selection? } = {})
```

Release one stored selection after removing its dependent highlight. Other
selection and highlight assignments remain active.
[Selection lifecycle](../../api/appearance/selection-and-highlighting.md#editing-and-removing-stored-intent)

## Semantic resources and regression layers

```javascript
createCoordinate({ id?, type?, layers? })
createDerivedData({
  id,
  source,
  transform: [DatasetTransform]
})
createRegressionBand({
  id, data, x, lower, upper, groupBy?, coordinate, xScale, yScale,
  color?, opacity?, stroke?, strokeWidth?, curve?
})
editRegressionBand({ target?, color?, opacity?, stroke?, strokeWidth?, curve? })
createRegressionLine({
  id, data, x, y, groupBy?, coordinate, xScale, yScale,
  colorScale?, strokeWidth?, curve?
})
editRegressionLine({ target?, strokeWidth?, curve? })
```

These actions explicitly author named semantic resources or the component
layers normally owned by `createRegression`.

`createCoordinate.type` accepts `"cartesian"`, `"polar"`, or `"parallel"`.
Parallel coordinates normally create their resource through
`encodeParallelCoordinates` or `createParallelCoordinates`.

`createDerivedData` stores immutable source and transform provenance only; it
does not materialize values. Chart facades and mark creation reject definition-only
datasets with an error explaining that materialized values are required.
Its public `DatasetTransform` union supports `filter`, `regression`, `density`,
`interval`, `timeUnit`, `window`, and `bin2d` objects. A bare object, empty
array, or multi-transform pipeline is invalid. See the runnable filter example and exact transform
requirements in [Source and derived data](../../api/data/source-and-derived.md#create-derived-data).

## Complete single-channel axes

```javascript
createXAxis({ scale?, coordinate?, position?, line?, ticksAndLabels?, title? })
createYAxis({ scale?, coordinate?, position?, line?, ticksAndLabels?, title? })
editXAxis({ position?, line?: false | {...}, ticks?: false | {...},
  labels?: false | {...}, ticksAndLabels?: false | {...}, title?: false | {...} })
editYAxis({ position?, line?: false | {...}, ticks?: false | {...},
  labels?: false | {...}, ticksAndLabels?: false | {...}, title?: false | {...} })
```

Complete-axis edits update only the selected components of an existing axis.
Each component accepts its edit object or `false` for removal. Use
`ticksAndLabels` for a coordinated tick/label edit or removal, or `ticks` and
`labels` for independent edits/removals; do not combine both forms. Removal
preserves scale, coordinate, encoding, and data, while the last component also
cleans the empty axis state.

## Complete axis removal

```javascript
removeXAxis({ coordinate?, scale? })
removeYAxis({ coordinate?, scale? })
```

Remove one complete Cartesian axis. Optional selectors must match the existing
resource. [Axes](../../api/axes.md)

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
Label `format` accepts `"auto"`, `{ decimals }`, numeric `.0f/.1f/.2f/.0%/.1%/.2e`,
or a UTC sequence of `%Y/%m/%d/%b` directives and literals when compatible with
the resolved scale. Use `%%` for a literal percent; unknown or dangling
directives reject.

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

## Related

[Action Reference](../actions.md) · [Chart API](../../api/index.md) · [Supported Features](../../supported-features.md)
