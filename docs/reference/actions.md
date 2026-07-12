---
layout: default
title: Action Reference
---

[Documentation home](../index.md) · [Supported features](../supported-features.md)

# Action Reference

All actions accept one plain option object and return a new immutable
`ChartProgram`. Unknown options are rejected.

## Chart Authoring API

These are the recommended actions for building a scatterplot.

| Action | Signature | Documentation |
| --- | --- | --- |
| Canvas | `createCanvas({ width?, height?, background?, margin? })` | [Canvas](../api/canvas.md) |
| Canvas | `editCanvas({ width?, height?, background?, margin? })` | [Canvas](../api/canvas.md) |
| Data | `createData({ id, values })` | [Data](../api/data.md) |
| Mark | `createPointMark({ id, data?, shape? })` | [Point mark](../api/point-mark.md) |
| Encoding | `encodeX({ field, target?, fieldType?, coordinate?, scale? })` | [Encodings](../api/encodings.md) |
| Encoding | `encodeY({ field, target?, fieldType?, coordinate?, scale? })` | [Encodings](../api/encodings.md) |
| Encoding | `encodeColor({ field, target?, fieldType?, scale? })` | [Encodings](../api/encodings.md) |
| Appearance | `encodeRadius({ value, target? })` | [Encodings](../api/encodings.md) |
| Axes | `createAxes({ coordinate?, x?, y? })` | [Axes](../api/axes.md) |

## Advanced Chart API

These actions provide explicit semantic resources or focused axis control.

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
[Advanced axis components](../advanced/axis-components.md) for option schemas.

## Extension API

Import `action` and `ChartProgram` from `ggaction/extension`. Primitive methods
are available on `ChartProgram` instances used by extension actions.

| API | Signature |
| --- | --- |
| Wrapper | `action({ op, description }, implementation)` |
| Semantic primitive | `editSemantic({ property, value })` |
| Graphic primitive | `createGraphics({ id, type, length? })` |
| Graphic primitive | `editGraphics({ target, property, value })` |
| Scale action | `createScale({ id, type?, domain?, range? })` |
| Scale action | `rematerializeScale({ id })` |

See [Action authoring](../extension/action-authoring.md) and
[Primitive API](../extension/primitives.md).

## Rendering functions

Rendering functions are not actions and do not modify or extend the trace.

| Import | Signature |
| --- | --- |
| `ggaction` | `render(program, canvasContext, { pixelRatio? }?)` |
| `ggaction/png` | `renderToPNG(program, { output, pixelRatio? })` |
