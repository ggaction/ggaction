---
layout: default
title: Action Reference
---

# Action Reference

Every action accepts one plain option object and returns a new immutable
`ChartProgram`. Unknown options are rejected.

## Quick navigation

- [Chart authoring](#chart-authoring-api)
- [Advanced chart actions](#advanced-chart-api)
- [Extension actions](#extension-api)
- [Rendering functions](#rendering-functions)

## Chart Authoring API

These actions form the recommended chart-building path.

### `createCanvas`

```javascript
createCanvas({ width?, height?, background?, margin? })
```

Create the program's Canvas and plot bounds. [Canvas options](../api/canvas.md)

### `editCanvas`

```javascript
editCanvas({ width?, height?, background?, margin? })
```

Edit Canvas properties and rematerialize connected consumers.
[Canvas options](../api/canvas.md)

### `createData`

```javascript
createData({ id, values })
```

Create one immutable named dataset. [Data](../api/data.md)

### `createPointMark`

```javascript
createPointMark({ id, data?, shape? })
```

Create a semantic point mark with a circle realization. [Marks](../api/marks.md)

### `createLineMark`

```javascript
createLineMark({ id, data? })
```

Create a semantic line mark and empty path collection. [Marks](../api/marks.md)

### `createBarMark`

```javascript
createBarMark({ id, data? })
```

Create a semantic bar mark and empty rect collection. [Marks](../api/marks.md)

### `encodeX`

```javascript
encodeX({ field, target?, fieldType?, coordinate?, bin?, scale? })
```

Create a quantitative point, temporal line, binned quantitative bar, or
ordinal bar x encoding. Ordinal bars require `fieldType: "ordinal"` and do not
materialize rects until their remaining layout semantics exist.
[Position encodings](../api/position-encodings.md)

### `encodeY`

```javascript
encodeY({ field?, target?, fieldType?, aggregate?, stack?, coordinate?, scale? })
```

Create a quantitative point, aggregate line, or inferred count/zero-stack bar
y encoding. With ordinal bar x, it also creates a mean/non-stacked y encoding
and resolves its scale while waiting for grouping semantics before rect
materialization. A complete histogram x/y pair materializes concrete rects.
[Position encodings](../api/position-encodings.md)

### `encodeXOffset`

```javascript
encodeXOffset({ field, target?, fieldType?, scale? })
```

Create an advanced nominal offset scale within an ordinal bar x band. Grouped
color layout normally invokes this action automatically.
[Position encodings](../api/position-encodings.md)

### `encodeHistogram`

```javascript
encodeHistogram({ field, target?, coordinate?, maxBins?, stack?, xScale?, yScale? })
```

Compose binned bar `encodeX` and count/zero-stack `encodeY` as one atomic
histogram action. `maxBins` defaults to `10`; `stack` defaults to `"zero"`.
[Encodings](../api/encodings.md)

### `encodeColor`

```javascript
encodeColor({ field, target?, fieldType?, layout?, scale? })
```

Create nominal point fill, line-series color, stacked histogram color, or
grouped ordinal-bar color. Grouped bars require `layout: "group"` and record
`encodeXOffset` as a child action.
[Series encodings](../api/series-encodings.md)

### `encodeStrokeDash`

```javascript
encodeStrokeDash({ field, target?, fieldType?, scale? })
```

Create nominal line-series dash patterns.
[Series encodings](../api/series-encodings.md)

### `encodeRadius`

```javascript
encodeRadius({ value, target? })
```

Apply a constant point radius. [Constant appearance](../api/appearance.md)

### `encodeBarWidth`

```javascript
encodeBarWidth({ band?, target? })
```

Set grouped-bar slot occupancy and materialize concrete rectangles. `band`
defaults to `0.72` and must be greater than `0` and at most `1`.
[Constant appearance](../api/appearance.md)

### `createGuides`

```javascript
createGuides({ axes?, grid?, legend? })
```

Create applicable axes, Cartesian grid, and categorical legend.
[Guides](../api/guides.md)

### `createAxes`

```javascript
createAxes({ coordinate?, x?, y? })
```

Create Cartesian axes directly, including inferred histogram bin-boundary
ticks. [Axes](../api/axes.md)

### `createGrid`

```javascript
createGrid({ horizontal?, vertical? })
```

Create inferred horizontal and/or vertical Cartesian grid lines behind related
marks. [Grids](../api/grids.md)

### `createLegend`

```javascript
createLegend({
  target?, channels?, position?, align?, title?, symbol?, labels?,
  titleStyle?, itemGap?, border?
})
```

Create one categorical line-series or histogram color legend with layered
symbols. [Legends](../api/legends.md)

### `createTitle`

```javascript
createTitle({
  text, subtitle?, position?, align?, offset?, gap?,
  titleStyle?, subtitleStyle?
})
```

Create a chart title and optional subtitle. [Titles](../api/titles.md)

## Advanced Chart API

Use these actions for explicit semantic resources or focused axis control.

| Group | Actions |
| --- | --- |
| Coordinate | `createCoordinate({ id?, type?, layers? })` |
| Complete channel axis | `createXAxis(options?)`, `createYAxis(options?)` |
| Axis lines | `createXAxisLine`, `createYAxisLine`, `editXAxisLine`, `editYAxisLine` |
| Axis ticks | `createXAxisTicks`, `createYAxisTicks`, `editXAxisTicks`, `editYAxisTicks` |
| Axis labels | `createXAxisLabels`, `createYAxisLabels`, `editXAxisLabels`, `editYAxisLabels` |
| Tick/label groups | `createXAxisTicksAndLabels`, `createYAxisTicksAndLabels`, `editXAxisTicksAndLabels`, `editYAxisTicksAndLabels` |
| Axis titles | `createXAxisTitle`, `createYAxisTitle`, `editXAxisTitle`, `editYAxisTitle` |
| Grid directions | `createHorizontalGrid`, `createVerticalGrid` |

See [Coordinates](../api/coordinates.md) and
[Advanced axis components](../advanced/axis-components.md).

## Extension API

Import `action` and `ChartProgram` from `ggaction/extension`. Primitive methods
are available on programs used by extension actions.

| API | Signature |
| --- | --- |
| Wrapper | `action({ op, description }, implementation)` |
| Semantic primitive | `editSemantic({ property, value })` |
| Graphic primitive | `createGraphics({ id, type, length?, before?, after? })` |
| Graphic primitive | `editGraphics({ target, property, value })` |
| Scale action | `createScale({ id, type?, domain?, range?, nice?, zero? })` |
| Scale action | `rematerializeScale({ id })` |

See [Action authoring](../extension/action-authoring.md) and
[Primitive API](../extension/primitives.md).

## Rendering functions

Rendering functions are not actions and do not modify the trace.

| Import | Signature |
| --- | --- |
| `ggaction` | `render(program, canvasContext, { pixelRatio? }?)` |
| `ggaction/png` | `renderToPNG(program, { output, pixelRatio? })` |
