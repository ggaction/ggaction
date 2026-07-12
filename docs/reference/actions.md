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

Create a quantitative point, temporal line, or binned quantitative bar x
encoding.
[Position encodings](../api/position-encodings.md)

### `encodeY`

```javascript
encodeY({ field?, target?, fieldType?, aggregate?, stack?, coordinate?, scale? })
```

Create a quantitative point, aggregate line, or inferred count/zero-stack bar
y encoding. A complete bar x/y pair materializes concrete histogram rects.
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
encodeColor({ field, target?, fieldType?, scale? })
```

Create nominal point fill, line-series color, or stacked histogram color.
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

### `createGuides`

```javascript
createGuides({ axes?, legend? })
```

Create applicable axes and a line-series legend. [Guides](../api/guides.md)

### `createAxes`

```javascript
createAxes({ coordinate?, x?, y? })
```

Create Cartesian axes directly, including inferred histogram bin-boundary
ticks. [Axes](../api/axes.md)

### `createLegend`

```javascript
createLegend({
  target?, channels?, position?, title?, symbol?, labels?,
  titleStyle?, itemGap?, border?
})
```

Create one combined line-series legend. [Legends](../api/legends.md)

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

See [Coordinates](../api/coordinates.md) and
[Advanced axis components](../advanced/axis-components.md).

## Extension API

Import `action` and `ChartProgram` from `ggaction/extension`. Primitive methods
are available on programs used by extension actions.

| API | Signature |
| --- | --- |
| Wrapper | `action({ op, description }, implementation)` |
| Semantic primitive | `editSemantic({ property, value })` |
| Graphic primitive | `createGraphics({ id, type, length? })` |
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
