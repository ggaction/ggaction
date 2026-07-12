---
layout: default
title: Mark Actions
---

[Documentation home](./index.md) · [Core concepts](./core-concepts.md)

# Mark Actions

## `createPointMark`

`createPointMark` creates a semantic point mark and its concrete graphical
collection:

```javascript
const program = chart()
  .createData({ id: "cars", values: cars })
  .createPointMark({ id: "points" });
```

The action uses the current dataset by default. Pass `data` to select another
named dataset explicitly:

```javascript
program.createPointMark({
  id: "points",
  data: "cars",
  shape: "circle"
});
```

The public mark is semantic `point`; its initial graphical realization is a
`circle` collection with one empty child per dataset row. The only supported
shape is currently `circle`.

Point creation does not assign x, y, fill, radius, a coordinate system, or a
scale. The graphic remains incomplete until later encoding or graphical actions
materialize those concrete properties. The renderer never infers them.

A constant shape selects graphical appearance. A future field-driven shape
encoding will record semantic intent and explicitly materialize its graphics.
