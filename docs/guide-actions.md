---
layout: default
title: Axis Line Actions
---

[Documentation home](./index.md) · [Visual encodings](./encoding-actions.md)

# Axis Line Actions

Create bottom and left axis lines after position encodings have resolved their
scales:

```javascript
const program = chart()
  .createCanvas({ width: 640, height: 400 })
  .createData({ id: "cars", values: cars })
  .createPointMark({ id: "points" })
  .encodeX({ field: "Horsepower" })
  .encodeY({ field: "Miles_per_Gallon" })
  .createXAxisLine()
  .createYAxisLine();
```

Both actions infer endpoints from the resolved scale range and Canvas bounds.
They do not accept concrete endpoint coordinates.

```javascript
program.createXAxisLine({
  scale: "x",
  position: "bottom",
  color: "#334155",
  lineWidth: 1
});
```

`createYAxisLine` uses scale `y` and position `left` by default. The current
release accepts the position options for forward-compatible authoring, but only
`bottom` for x and `left` for y are supported.

Edit an existing line with domain-specific style options:

```javascript
program.editXAxisLine({ color: "black", lineWidth: 2 });
```

Editing Canvas bounds or rematerializing a connected scale explicitly updates
axis geometry while preserving its color and line width. Calling a leaf axis
line action without a matching resolved scale or Canvas bounds throws an error
instead of silently producing no graphic.

## Axis ticks

```javascript
program.createXAxisTicks({ count: 5, length: 6 });
program.createYAxisTicks({ values: [10, 20, 30, 40] });
```

`count` requests readable nice ticks and may produce a different actual count.
Use `values` for exact data-space ticks; the options are mutually exclusive.
