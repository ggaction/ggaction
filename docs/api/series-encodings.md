---
layout: default
title: Series Encodings
---

# Series Encodings

## `encodeColor(options)`

Map a nominal field to point fills, line-series strokes, or stacked histogram
fills. On line and bar marks the field also participates in grouping.

| Option | Type | Default |
| --- | --- | --- |
| `field` | non-empty string | required |
| `target` | point, line, or bar mark ID | current mark |
| `fieldType` | `"nominal"` | `"nominal"` |
| `scale.id` | scale ID | `"color"` |
| `scale.type` | `"ordinal"` | `"ordinal"` |
| `scale.domain` | `"auto"` or category array | `"auto"` |
| `scale.range` | `"auto"`, color array, or palette descriptor | `"auto"` |
| `scale.palette` | `"tableau10"` | omitted |

```javascript
program.encodeColor({
  field: "Origin",
  scale: { palette: "tableau10" }
});
```

`scale.palette` is the concise form of
`scale.range: { palette: "tableau10" }`. Do not provide both. Automatic domains
preserve first-appearance order.

On a complete histogram, `encodeColor` rematerializes each non-empty bin as
zero-stacked category rects. Stack and fill order follow the resolved color
domain. The y scale continues to use each bin's total count, and an explicit
domain must contain every observed category.

```javascript
histogram.encodeColor({
  field: "Origin",
  scale: {
    domain: ["USA", "Europe", "Japan"],
    palette: "tableau10"
  }
});
```

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
