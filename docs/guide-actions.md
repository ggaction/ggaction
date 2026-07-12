---
layout: default
title: Axis Component Actions
---

[Documentation home](./index.md) · [Visual encodings](./encoding-actions.md)

# Axis Component Actions

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

## Tick labels

```javascript
program.createXAxisLabels();
program.createYAxisLabels({ format: { decimals: 1 } });
```

Labels reuse the existing tick count or values by default, keeping both
collections aligned. Without ticks they may define their own `count` or
`values`. Style options include `offset`, `color`, `fontSize`, `fontFamily`, and
`fontWeight`. Formatting supports `"auto"` and `{ decimals }`.

```javascript
program.editXAxisLabels({
  offset: 20,
  fontSize: 13,
  color: "black"
});
```

Scale and Canvas rematerialization recomputes label values, strings, positions,
and collection length.

## Ticks and labels together

Use the aggregate actions when both components share one scale and tick-value
configuration:

```javascript
program.createXAxisTicksAndLabels({
  count: 5,
  ticks: { length: 6 },
  labels: { offset: 18, fontSize: 12 }
});
```

The parent action records `createXAxisTicks` and `createXAxisLabels` as child
actions. Y-axis and edit variants follow the same structure:

```javascript
program.editYAxisTicksAndLabels({
  values: [10, 20, 30, 40],
  labels: { color: "black" }
});
```

Shared count or values edits update ticks first and labels second. Component-only
appearance edits invoke only the affected leaf action.

## Axis titles

```javascript
program.createXAxisTitle({ text: "Horsepower" });
program.createYAxisTitle({ text: "Miles per Gallon" });
```

Omitting `text` infers a single field connected to the axis scale. `at` controls
placement along the scale and accepts `"start"`, `"center"`, `"end"`, or a
numeric data-space value.

```javascript
program.editXAxisTitle({
  text: "Engine horsepower",
  at: "start",
  offset: 42
});
```

Rotation uses radians. Placement and font settings are rematerialized after
scale or Canvas changes, while the title text remains semantic guide state.

## Complete axes

Create every component for one channel with a single aggregate action:

```javascript
program.createXAxis({
  line: { lineWidth: 1 },
  ticksAndLabels: {
    count: 5,
    ticks: { length: 6 },
    labels: { fontSize: 12 }
  },
  title: { text: "Horsepower" }
});
```

`createYAxis` has the same structure. Scale and position are supplied once at
the top level and routed to the line, tick group, and title child actions. The
current release intentionally provides create-only complete-axis aggregates;
leaf edit actions remain available for focused changes.
