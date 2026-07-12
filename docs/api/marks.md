---
layout: default
title: Mark API
---

[Documentation home](../index.md) · [Data](./data.md) · [Encodings](./encodings.md)

# Mark API

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

## `createLineMark({ id, data? })`

| Option | Type | Default |
| --- | --- | --- |
| `id` | valid user-defined ID | required |
| `data` | existing dataset ID | current dataset |

```javascript
const program = chart()
  .createData({ id: "cars", values: cars })
  .createLineMark({ id: "trends" });
```

The semantic mark type is `line`. Its graphical realization starts as an empty
`path` collection because series cardinality depends on later grouping
encodings rather than raw dataset length.

```javascript
program.graphicSpec.objects.trends;
// { type: "path", children: [] }
```

Line mark creation does not infer one default series, coordinates, encodings,
or path points. Later line-chart encoding actions explicitly determine series
groups, resize the collection, and materialize concrete point arrays.
