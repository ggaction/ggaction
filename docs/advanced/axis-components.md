---
layout: default
title: Advanced Axis Components
---

# Advanced Axis Components

{% include chart-example.html id="scatterplot" %}

Use these actions when a complete `createAxes` call is not sufficient. All
component actions require a resolved linear, time, or ordinal scale and Canvas
bounds. x supports `bottom` and `top`; y supports `left` and `right`.

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
as trace children. `editXAxis` and `editYAxis` update several existing
components atomically; use the focused edit actions below for one component.

<!-- action-capabilities:axes:start -->
| Axis family | Create | Edit | Editable components |
| --- | --- | --- | --- |
| Cartesian complete axis | `createXAxis` / `createYAxis` / `createAxes` | `editXAxis` / `editYAxis` | line, ticks, labels, ticksAndLabels, title, position |
| Polar complete axis | `createThetaAxis` / `createRadialAxis` / `createAxes` | `editThetaAxis` / `editRadialAxis` | line, ticks, labels, ticksAndLabels, title, angle or position |
| Parallel dimension axes | `createAxes` |  | line, ticks, labels, title from each stored dimension |
<!-- action-capabilities:axes:end -->

Create also accepts `coordinate`, an existing coordinate ID consumed by the
selected channel and scale. `createAxes` supplies this automatically and stores
it on the semantic guide.

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
| `position` | x: `bottom/top`; y: `left/right` |
| `count` | Positive requested tick density; default `5` except inferred binned x boundaries |
| `values` | Exact finite data-space values or timestamps; mutually exclusive with `count` |
| `length` | Non-negative tick length; default `6` |
| `color` | Stroke color; default `#64748b` |
| `lineWidth` | Non-negative width; default `1` |

When both `count` and `values` are omitted for a binned histogram x scale,
ticks default to the inferred bin boundaries. Passing either option disables
that inference.

## Labels

```javascript
program.createXAxisLabels({ format: { decimals: 1 } });
program.editYAxisLabels({ offset: 16, fontSize: 13 });
```

Labels accept `scale` on creation plus `position`, `count`, `values`, `offset`,
`format`, `color`, `fontSize`, `fontFamily`, and `fontWeight`. Format is
`"auto"`, `{ decimals: nonNegativeInteger }`, or one of the closed strings
below. Default offsets are 18 for x and 12 for y; default font size is 12.

| Scale | Explicit format strings |
| --- | --- |
| Linear | `.0f`, `.1f`, `.2f`, `.0%`, `.1%`, `.2e` |
| Time | `%Y`, `%Y-%m`, `%Y-%m-%d` (UTC) |
| Ordinal | none; use `"auto"` |

Automatic time labels select year, month, day, hour, minute, or second
precision from the resolved domain span, then minimally refine that precision
when distinct tick values would collide. This handles UTC month lengths, leap
days, and sub-day intervals without changing explicit format strings.
Incompatible format/scale pairs are rejected before graphics are changed.

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
| `text` | Non-empty title; inferred from one connected field/aggregate when omitted |
| `scale` | Create-only scale ID; defaults to channel |
| `position` | x: `bottom/top`; y: `left/right` |
| `at` | `start`, `center`, `end`, or an in-domain finite number |
| `offset` | Non-negative distance from the plot |
| `rotation` | Finite radians |
| `color` | Text fill |
| `fontSize` | Positive size |
| `fontFamily` | Non-empty family |
| `fontWeight` | String or finite number |

Default title placement is centered. x uses offset 42 and rotation 0. y uses
offset 52 with rotation `-Math.PI / 2` on the left or `Math.PI / 2` on the
right. An explicit rotation remains unchanged when the position is edited.

Cartesian and Polar axis typography follows the shared
[Canvas font-weight policy](../api/marks/text.md#font-weights).

Top/right components extend outward and require sufficient top/right Canvas
margin. Component edits and Canvas/scale rematerialization preserve the chosen
edge, values, formats, and appearance.

Scale or Canvas rematerialization recomputes existing component geometry while
preserving configured appearance.
