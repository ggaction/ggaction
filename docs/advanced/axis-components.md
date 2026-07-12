---
layout: default
title: Advanced Axis Components
---

[Documentation home](../index.md) · [Recommended axes API](../api/axes.md)

# Advanced Axis Components

Use these actions when a complete `createAxes` call is not sufficient. All
component actions require a resolved linear scale and Canvas bounds. x supports
`bottom`; y supports `left`.

## Complete single-channel axes

```javascript
program.createXAxis({
  scale: "x",
  line: { lineWidth: 1 },
  ticksAndLabels: {
    count: 5,
    ticks: { length: 6 },
    labels: { fontSize: 12 }
  },
  title: { text: "Horsepower" }
});
```

`createXAxis` and `createYAxis` call the line, tick-and-label, and title actions
as trace children. Complete-axis aggregate edit actions are not implemented;
use the focused edit actions below.

## Lines

```javascript
program.createXAxisLine({
  scale: "x",
  position: "bottom",
  color: "#334155",
  lineWidth: 1
});

program.editXAxisLine({ color: "black", lineWidth: 2 });
```

Create options are `scale`, `position`, `color`, and `lineWidth`. Edit options
omit `scale`. Endpoints are inferred from the resolved scale range and Canvas
bounds; concrete endpoints are not accepted.

## Ticks

```javascript
program.createXAxisTicks({ count: 5, length: 6 });
program.createYAxisTicks({ values: [10, 20, 30, 40] });
program.editXAxisTicks({ length: 8, color: "black" });
```

| Option | Meaning |
| --- | --- |
| `scale` | Create-only scale ID; defaults to channel |
| `position` | `bottom` for x, `left` for y |
| `count` | Positive requested nice-tick count; default `5` |
| `values` | Exact finite data-space values; mutually exclusive with `count` |
| `length` | Non-negative tick length; default `6` |
| `color` | Stroke color; default `#64748b` |
| `lineWidth` | Non-negative width; default `1` |

## Labels

```javascript
program.createXAxisLabels({ format: { decimals: 1 } });
program.editYAxisLabels({ offset: 16, fontSize: 13 });
```

Labels accept `scale` on creation plus `position`, `count`, `values`, `offset`,
`format`, `color`, `fontSize`, `fontFamily`, and `fontWeight`. Format is
`"auto"` or `{ decimals: nonNegativeInteger }`. Default offsets are 18 for x
and 12 for y; default font size is 12.

Labels reuse existing tick values when count/values are omitted. Conflicting
tick and label configurations produce an error.

## Ticks and labels together

```javascript
program.createXAxisTicksAndLabels({
  count: 5,
  ticks: { length: 6 },
  labels: { offset: 18, fontSize: 12 }
});

program.editYAxisTicksAndLabels({
  values: [10, 20, 30, 40],
  labels: { color: "black" }
});
```

Shared options are `scale` (create only), `position`, and either `count` or
`values`. Nested `ticks` accepts `length`, `color`, and `lineWidth`; nested
`labels` accepts `offset`, `format`, `color`, `fontSize`, `fontFamily`, and
`fontWeight`.

## Titles

```javascript
program.createXAxisTitle({ text: "Horsepower" });
program.editXAxisTitle({ text: "Engine horsepower", at: "start" });
```

| Option | Meaning |
| --- | --- |
| `text` | Non-empty title; inferred from one connected field when omitted |
| `scale` | Create-only scale ID; defaults to channel |
| `position` | `bottom` for x, `left` for y |
| `at` | `start`, `center`, `end`, or an in-domain data value |
| `offset` | Non-negative distance from the plot |
| `rotation` | Finite radians |
| `color` | Text fill |
| `fontSize` | Positive size |
| `fontFamily` | Non-empty family |
| `fontWeight` | String or finite number |

Default title placement is centered. x uses offset 42 and rotation 0; y uses
offset 52 and rotation `-Math.PI / 2`.

Scale or Canvas rematerialization recomputes existing component geometry while
preserving configured appearance.
