---
layout: default
title: Encoding API
---

[Documentation home](../index.md) · [Marks](./marks.md) · [Coordinates](./coordinates.md)

# Encoding API

## Point `encodeX(options)` and `encodeY(options)`

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
| `nice` | boolean | omitted |
| `zero` | boolean | omitted |

```javascript
program.encodeX({
  field: "Horsepower",
  scale: { domain: [0, 250] }
});
```

An automatic domain combines every field consuming the same scale. An automatic
range uses current Canvas bounds; y runs bottom-to-top. Every encoded value must
currently be finite. For an automatic linear domain, `zero: true` expands the
domain to include zero and `nice: true` then expands it to rounded boundaries.
An explicit domain overrides both policies.

x/y encodings ensure a Cartesian coordinate exists and attach it to the layer.
An explicitly selected coordinate is created if missing. A conflicting layer
coordinate or non-Cartesian coordinate produces an error.

## Temporal line `encodeX(options)`

`encodeX` also maps a temporal field to the horizontal position scale of a
line mark.

```javascript
program.encodeX({
  field: "Year",
  fieldType: "temporal",
  scale: { nice: true }
});
```

| Option | Type | Default |
| --- | --- | --- |
| `field` | non-empty string | required |
| `target` | line mark ID | current mark |
| `fieldType` | `"temporal"` | required for the current line API |
| `coordinate` | coordinate ID | layer coordinate, then `"main"` |
| `scale.id` | scale ID | `"x"` |
| `scale.type` | `"time"` | `"time"` |
| `scale.domain` | `"auto"` or two finite timestamps | `"auto"` |
| `scale.range` | `"auto"` or two finite numbers | `"auto"` |
| `scale.nice` | boolean | omitted |

Temporal fields contain parseable date strings or finite timestamps. Values
are normalized to timestamps for scale resolution without changing the source
dataset. An automatic `nice` domain expands outward to UTC calendar boundaries;
an explicit domain remains unchanged. Time scales reject `zero`.

At this stage x encoding resolves and stores the time scale but leaves the line
path empty. Later line actions materialize paths after y and series grouping are
known.

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
