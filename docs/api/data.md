---
layout: default
title: Data API
---

[Documentation home](../index.md) · [Marks](./marks.md)

# Data API

## `createData({ id, values })`

| Option | Type | Required |
| --- | --- | --- |
| `id` | string containing letters, numbers, `_`, or `-` | yes |
| `values` | array of plain row objects | yes |

```javascript
const program = chart().createData({
  id: "cars",
  values: [
    { horsepower: 130, mpg: 18 },
    { horsepower: 165, mpg: 15 }
  ]
});
```

Empty arrays are valid, and row properties may contain nested arrays or
objects. The action copies and freezes the supplied data. A dataset ID cannot
be created twice, and source values cannot be replaced after creation.

The most recently created dataset becomes the default for `createPointMark` or
`createLineMark`. Creating data records semantic state only and produces no
graphics.
