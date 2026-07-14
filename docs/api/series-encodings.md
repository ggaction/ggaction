---
layout: default
title: Series Encodings
---

# Series Encodings

## At a glance

| Action | Shortest call | Inference/defaults | Result |
| --- | --- | --- | --- |
| `encodeColor` | `encodeColor({ field: "group" })` | Current mark, nominal field type, color scale | Semantic grouping and concrete color |
| `encodeStrokeDash` | `encodeStrokeDash({ field: "group" })` | Current line mark and dash scale | Semantic series grouping and concrete dash |

## `encodeColor(options)`

Map a nominal field to point fills, line-series strokes, area fills, or bar
fills. Line and bar materializers may use the field for their own grouping
policy. Area color must match an existing `encodeGroup` field.

| Option | Type | Default |
| --- | --- | --- |
| `field` | non-empty string | required |
| `target` | point, line, area, or bar mark ID | current mark |
| `fieldType` | `"nominal"` | `"nominal"` |
| `layout` | `"group"` or `"stack"`; bar only | mark policy |
| `scale.id` | scale ID | `"color"` |
| `scale.type` | `"ordinal"` | `"ordinal"` |
| `scale.domain` | `"auto"` or category array | `"auto"` |
| `scale.range` | `"auto"`, color array, or palette descriptor | `"auto"` |
| `scale.palette` | palette name or `{ name, count?, extent? }` | omitted |

```javascript
program.encodeColor({
  field: "Origin",
  scale: { palette: "tableau10" }
});
```

`scale.palette` is the concise form of
`scale.range: { palette: "tableau10" }`. Do not provide both. Automatic domains
preserve first-appearance order.

Calling `encodeColor` again for the same target replaces the nominal field.
Without `scale.id`, the current color scale is reused and its domain, marks,
and existing legend are recomputed. An explicit new ID retains the previous
named scale. Inferred legend titles follow the new field; explicit titles and
legend appearance remain unchanged.

Named palettes use a frozen 68-name vocabulary. Categorical palettes keep their
native order; `count` selects or deterministically cycles colors. Continuous,
diverging, and cyclical palettes are sampled to the domain size unless `count`
is supplied, and accept an optional two-value `extent` within `[0, 1]`.

```javascript
program.encodeColor({
  field: "Origin",
  scale: { palette: { name: "set2", count: 3 } }
});
```

See [Scale options](./scales.md#named-palettes) for the complete vocabulary.

For an ordinal-x mean bar, `layout: "group"` is required. It keeps
`y.stack = null`, invokes `encodeXOffset` with the same field, and recomputes
the y domain from one mean per x/color cell. Color and xOffset scales are fully
resolved, while concrete rects wait for bar width.

```javascript
groupedBars.encodeColor({
  field: "sex",
  layout: "group",
  scale: { palette: "tableau10" }
});
```

On a complete histogram, `encodeColor` rematerializes each non-empty bin as
zero-stacked category rects. Stack and fill order follow the resolved color
domain. The y scale continues to use each bin's total count, and an explicit
domain must contain every observed category.

```javascript
histogram.encodeColor({
  field: "Origin",
  layout: "stack",
  scale: {
    domain: ["USA", "Europe", "Japan"],
    palette: "tableau10"
  }
});
```

Histogram color keeps its existing stack behavior when `layout` is omitted;
`layout: "stack"` makes that policy explicit. Grouped histograms and stacked
ordinal-mean bars are not supported in the current scope.

On an area mark, color never creates grouping implicitly. Author grouping
directly or through `encodeDensity({ groupBy })`, then encode that same field:

```javascript
densityArea.encodeColor({
  field: "Origin",
  scale: { palette: "tableau10" }
});
```

Each existing path receives the resolved color for its group. Path order,
color domain order, and later legend order share the same ordered categories;
Canvas and shared-scale changes rematerialize every affected area fill.

## `encodeStrokeDash(options)`

Map a nominal field to line-series dash patterns.

```javascript
program.encodeStrokeDash({ field: "Origin" });
```

| Option | Type | Default |
| --- | --- | --- |
| `field` | non-empty string | required |
| `target` | line mark ID | current mark |
| `fieldType` | `"nominal"` | `"nominal"` |
| `scale.id` | scale ID | `"strokeDash"` |
| `scale.type` | `"ordinal"` | `"ordinal"` |
| `scale.domain` | `"auto"` or category array | `"auto"` |
| `scale.range` | `"auto"` or dash-pattern array | `"auto"` |

The automatic range contains ten reusable patterns. An explicit pattern is an
empty array for a solid stroke or an even-length array of non-negative finite
numbers.

If color and stroke dash encode the same field, that field appears only once in
the series key and can be represented by one combined legend. Canvas changes
explicitly rematerialize both styles.

See [Scale options](./scales.md) and [Legends](./legends.md).

## Errors and limitations

Series fields must be nominal. Area color must match its group encoding.
Combined line legends require color and strokeDash to use the same field and
ordered domain.

## Related

[Scale options](./scales.md) · [Legends](./legends.md) ·
[Position encodings](./position-encodings.md)
