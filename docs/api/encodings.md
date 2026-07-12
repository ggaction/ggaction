---
layout: default
title: Encoding API
---

[Documentation home](../index.md) · [Point marks](./point-mark.md) · [Coordinates](./coordinates.md)

# Encoding API

## `encodeX(options)` and `encodeY(options)`

Map a quantitative field to concrete point positions.

| Option | Type | Default |
| --- | --- | --- |
| `field` | non-empty string | required |
| `target` | point mark ID | current mark |
| `fieldType` | `"quantitative"` | `"quantitative"` |
| `coordinate` | coordinate ID | layer coordinate, then `"main"` |
| `scale` | scale options | channel defaults |

Scale options are:

| Option | Type | Default |
| --- | --- | --- |
| `id` | scale ID | channel name (`x` or `y`) |
| `type` | `"linear"` | `"linear"` |
| `domain` | `"auto"` or two finite numbers | `"auto"` |
| `range` | `"auto"` or two finite numbers | `"auto"` |

```javascript
program.encodeX({
  field: "Horsepower",
  scale: { domain: [0, 250] }
});
```

An automatic domain combines every field consuming the same scale. An automatic
range uses current Canvas bounds; y runs bottom-to-top. Every encoded value must
currently be finite.

x/y encodings ensure a Cartesian coordinate exists and attach it to the layer.
An explicitly selected coordinate is created if missing. A conflicting layer
coordinate or non-Cartesian coordinate produces an error.

## `encodeColor(options)`

Maps a nominal field to concrete point fills.

| Option | Type | Default |
| --- | --- | --- |
| `field` | non-empty string | required |
| `target` | point mark ID | current mark |
| `fieldType` | `"nominal"` | `"nominal"` |
| `scale.id` | scale ID | `"color"` |
| `scale.type` | `"ordinal"` | `"ordinal"` |
| `scale.domain` | `"auto"` or category array | `"auto"` |
| `scale.range` | `"auto"`, color array, or palette descriptor | `"auto"` |

```javascript
program.encodeColor({
  field: "Origin",
  scale: {
    domain: ["USA", "Europe", "Japan"],
    range: ["#4c78a8", "#f58518", "#54a24b"]
  }
});
```

`{ palette: "tableau10" }` selects the supported named palette. Automatic
domains preserve first-appearance order.

## `encodeRadius({ value, target? })`

Broadcasts a non-negative finite graphical radius to a point mark.

```javascript
program.encodeRadius({ value: 3 });
```

This is fixed appearance, not a semantic field encoding or Polar radial
position.
