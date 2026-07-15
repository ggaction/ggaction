---
layout: default
title: Error Bars
---

# Error Bars

`createErrorBar()` materializes vertical or horizontal intervals from either
grouped statistics or existing center/lower/upper fields. It can infer its
inputs from an already encoded layer or accept both channel roles directly.

## At a glance

| Action | Shortest call | Result |
| --- | --- | --- |
| `createErrorBar` | `createErrorBar()` after one eligible encoded layer | Mean 95% confidence intervals sharing that layer's data, coordinate, and scales |

## `createErrorBar(options?)`

```javascript
const intervals = chart()
  .createCanvas()
  .createData({ values })
  .createErrorBar({
    x: { field: "group", fieldType: "nominal" },
    y: { field: "value" }
  });
```

```typescript
createErrorBar({
  id?: string;
  target?: string;
  data?: string;
  x?: PositionChannel | StatisticalIntervalChannel | ExplicitIntervalChannel;
  y?: PositionChannel | StatisticalIntervalChannel | ExplicitIntervalChannel;
  groupBy?: string;
  coordinate?: string;
  caps?: boolean;
  capSize?: number;
  stroke?: string;
  strokeWidth?: number;
  strokeDash?: "solid" | "dashed" | "dotted" | "dashdot" | readonly number[];
  opacity?: number;
} = {})
```

The channel types are:

```typescript
type PositionChannel = {
  field?: string;
  fieldType?: "nominal" | "ordinal" | "temporal";
  scale?: ScaleOptions;
};

type StatisticalIntervalChannel = {
  field?: string;
  center?: "mean" | "median";
  extent?: "stderr" | "stdev" | "ci" | "iqr";
  level?: number;
  scale?: ScaleOptions;
};

type ExplicitIntervalChannel = {
  center: string;
  lower: string;
  upper: string;
  scale?: ScaleOptions;
};
```

Exactly one channel is positional and the other is quantitative. Putting the
interval on y creates vertical rules; putting it on x creates horizontal rules.
No orientation flag is required. Statistical mean defaults to a two-sided
`0.95` Student-t confidence interval. Median is supported only with
`extent: "iqr"`; `level` is valid only for `extent: "ci"`.

The independent position field is always part of statistical grouping.
`groupBy` can add one more grouping field. Group order follows first appearance
in the source data. Groups without enough valid quantitative values are omitted.

## Horizontal intervals

```javascript
const horizontal = chart()
  .createCanvas()
  .createData({ values })
  .createErrorBar({
    x: { field: "measurement" },
    y: { field: "group", fieldType: "nominal" }
  });
```

This stores y/x/x2 encodings and creates vertical fixed-pixel caps.

## Existing interval fields

```javascript
const explicit = chart()
  .createCanvas()
  .createData({ values: intervalRows })
  .createErrorBar({
    x: { field: "group", fieldType: "nominal" },
    y: {
      center: "meanValue",
      lower: "lowerValue",
      upper: "upperValue"
    },
    caps: false
  })
  .createGuides();
```

Explicit mode does not derive another dataset and does not accept `groupBy`,
`field`, `extent`, or `level` on the interval channel. The center field becomes
the interval-axis title unless a later guide action supplies another title.

## Inference from an encoded layer

```javascript
const overlay = chart()
  .createCanvas()
  .createData({ values })
  .createPointMark()
  .encodeX({ field: "group", fieldType: "ordinal" })
  .encodeY({ field: "value" })
  .createErrorBar();
```

With omitted x and y, `target` selects an existing layer. Without `target`, the
action uses the current eligible layer, then one unique eligible layer. The
layer may use any compatible mark type; eligibility comes from its complete
field-based x/y encodings. Data, coordinate, and x/y scale IDs are reused.

A semantic `group` encoding is inferred as statistical grouping. Color remains
appearance and does not silently change the statistic. Ambiguous eligible
layers fail instead of selecting one arbitrarily.

## Defaults and graphical result

| Behavior | Default |
| --- | --- |
| ID | `"errorBar"` when available |
| Center and extent | mean, confidence interval |
| Confidence level | `0.95` |
| Coordinate | inferred, otherwise `"main"` Cartesian |
| Main rule and caps | `#4c78a8`, width `2`, solid, opacity `1` |
| Cap width | `8` logical Canvas pixels |

Caps preserve their logical-pixel width when the Canvas or positional scales
change. `createGuides()` infers the independent field title and a statistical
interval-axis title such as `mean(value)`.

Set `caps: false` to omit cap layers. `capSize` must be positive and affects
enabled caps only. `strokeWidth` is non-negative, `opacity` is between `0` and
`1`, and `strokeDash` accepts a named style or an explicit non-negative dash
array. The same appearance is assigned to the main rule and both caps.

```javascript
const styled = intervals.createErrorBar({
  id: "styledErrorBar",
  data: "data",
  x: { field: "group", fieldType: "nominal", scale: { id: "styledX" } },
  y: { field: "value", scale: { id: "styledY" } },
  capSize: 16,
  stroke: "#d9485f",
  strokeWidth: 3,
  strokeDash: [8, 4],
  opacity: 0.8
});
```

## Errors and current limitations

The action rejects missing data, incompatible or ambiguous source layers,
ambiguous channel roles, incomplete or non-quantitative explicit fields,
invalid statistics or appearance values, and occupied generated IDs. Failed
calls leave the earlier immutable program unchanged.

Center symbols, per-row cap sizes, and field-driven rule widths are not part of
the current action.

## Related

[Error-bar tutorial](../tutorials/error-bar.md) ·
[Interval data](./data.md#createintervaldata-id-source-field-groupby-center-extent-level-as) ·
[Rule marks](./marks.md) · [Guides](./guides.md)
