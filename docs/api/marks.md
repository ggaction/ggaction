---
layout: default
title: Marks
---

# Marks

## At a glance

| Action | Shortest call | Inference/defaults | Initial graphic |
| --- | --- | --- | --- |
| `createPointMark` | `createPointMark({ id: "points" })` | Current dataset; circle shape | Empty/concrete circle collection |
| `createLineMark` | `createLineMark({ id: "lines" })` | Current dataset | Empty path collection |
| `createBarMark` | `createBarMark({ id: "bars" })` | Current dataset | Empty rect collection |

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
or path points. Temporal `encodeX` resolves the horizontal scale while leaving
the collection empty. Aggregate line `encodeY` then derives the currently known
series, resizes the collection, and materializes sorted concrete point arrays.
`encodeColor` and `encodeStrokeDash` can further regroup those paths and apply
semantic series styles.

## `createBarMark({ id, data? })`

| Option | Type | Default |
| --- | --- | --- |
| `id` | valid user-defined ID | required |
| `data` | existing dataset ID | current dataset |

```javascript
const program = chart()
  .createData({ id: "cars", values: cars })
  .createBarMark({ id: "bars" });
```

The semantic mark type is `bar`. Its graphical realization starts as an empty
`rect` collection because binning, aggregation, stacking, and optional grouping
determine the eventual rectangle count.

```javascript
program.graphicSpec.objects.bars;
// { type: "rect", children: [] }
```

Bar mark creation does not assign coordinates, encodings, bins, or concrete
rectangles. A subsequent binned `encodeX` can store the horizontal histogram
meaning and resolve its scale. `encodeY()` then infers count/zero-stack meaning
and resolves its scale, then materializes one concrete rectangle per non-empty
bin.

`encodeColor({ field })` can then split each non-empty bin into category rects.
The color scale domain controls stack and fill order, while the y scale remains
based on total bin counts.

## Errors and limitations

Mark IDs must be unique and the selected dataset must exist. Current semantic
marks are point, line, and bar; additional shapes and mark types are not
implemented.

## Related

[Encodings](./encodings.md) · [Position encodings](./position-encodings.md) ·
[Constant appearance](./appearance.md)
