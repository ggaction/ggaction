---
layout: default
title: Point Mark API
---

[Documentation home](../index.md) · [Data](./data.md) · [Encodings](./encodings.md)

# Point Mark API

## `createPointMark({ id, data?, shape? })`

| Option | Type | Default |
| --- | --- | --- |
| `id` | valid user-defined ID | required |
| `data` | existing dataset ID | current dataset |
| `shape` | `"circle"` | `"circle"` |

```javascript
const program = chart()
  .createData({ id: "cars", values: cars })
  .createPointMark({ id: "points" });
```

The semantic mark type is `point`; its current graphical realization is a
circle collection with one empty child per dataset row. The circles are not
renderable until later actions assign x, y, radius, and fill.

Point creation does not assign a coordinate or scale. Position encodings create
and attach the appropriate semantic coordinate when needed.
