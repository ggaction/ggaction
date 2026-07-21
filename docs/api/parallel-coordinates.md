---
layout: default
title: Parallel Coordinates
description: Create and revise row-wise paths across ordered dimension-local scales and axes.
---

# Parallel Coordinates

{% include chart-example.html id="parallel-coordinates" %}

Use Parallel coordinates when each row should remain visible while several
measurements are compared. Every eligible source row becomes one selectable
open path. Every dimension owns a local scale and ordinary line/text axis.

## Complete chart action

```typescript
createParallelCoordinates({
  id?, data?, coordinate?, dimensions, key?, missing?,
  color?, strokeDash?, line?, guides?
}): ChartProgram
```

Only `dimensions` is required after a Canvas and an unambiguous dataset exist.

```javascript
import { chart } from "ggaction";

const program = chart()
  .createCanvas({
    width: 860,
    height: 500,
    margin: { top: 110, right: 160, bottom: 65, left: 78 }
  })
  .createData({ values: cars })
  .filterData({
    id: "cars1970",
    field: "Year",
    oneOf: ["1970-01-01"]
  })
  .createParallelCoordinates({
    dimensions: [
      { field: "Miles_per_Gallon", title: "MPG", scale: { nice: true, zero: false } },
      { field: "Horsepower", scale: { nice: true, zero: false } },
      { field: "Weight_in_lbs", title: "Weight (lb)", scale: { nice: true, zero: false } },
      { field: "Acceleration", scale: { nice: true, zero: false } }
    ],
    key: "Name",
    color: {
      field: "Origin",
      fieldType: "nominal",
      scale: { palette: "tableau10" }
    },
    line: { strokeWidth: 1.25, opacity: 0.48 }
  });
```

The stable mark ID is `parallelCoordinates`; the coordinate ID is `parallel`.
Pass explicit IDs only when those roles are already occupied or several
compatible resources make inference ambiguous.

## Dimensions

A dimension is a field string or an object:

```typescript
type ParallelDimension = string | {
  field: string;
  fieldType?: "quantitative" | "ordinal";
  title?: string;
  scale?: Omit<ScaleOptions, "id">;
};
```

- At least two unique fields are required, and array order is axis order.
- Finite numeric values infer `quantitative`; consistent strings infer
  `ordinal`. Declare numeric categories as `ordinal` explicitly.
- `title` defaults to the field name.
- Scale IDs are namespaced from the mark and dimension position. Supply scale
  behavior such as `type`, `domain`, `range`, `nice`, `zero`, or `reverse`, not
  another `id`.

## Row identity and missing values

`key` names a dataset field whose values must be present and unique. It is
optional: omission uses stable source-row lineage and never guesses a field.

| `missing` | Result |
| --- | --- |
| `"break"` | Default. Keep the row item and draw each valid multi-point fragment. |
| `"drop-row"` | Remove any row with an invalid dimension value. |
| `"error"` | Reject the action before changing the program. |

## Advanced encoding

Use the atomic encoding after creating a line mark when the wrapped steps need
to remain individually controllable:

```javascript
const advanced = chart()
  .createCanvas()
  .createData({ values })
  .createLineMark({ id: "profiles" })
  .encodeParallelCoordinates({
    target: "profiles",
    dimensions: ["first", "second", "third"]
  })
  .createGuides();
```

`encodeParallelCoordinates` replaces the complete ordered assignment
atomically. It cannot mix with x/y or theta/radius position encodings on the
same layer.

## Appearance, guides, and revisions

- `color` and `strokeDash` reuse the line-series encoding vocabulary.
- `line` accepts open linear-line appearance: `stroke`, `strokeWidth`, and
  `opacity`. Curved and closed paths are rejected.
- Omitted guides create dimension axes and any applicable legend. Use
  `guides: false` to omit all guides.
- `editCanvas`, dimension `editScale`, data revisions, and `filterMarks`
  rematerialize paths, axes, and legends together.
- `selectMarks`, `highlightMarks`, and `filterMarks` operate at source-row
  grain. Text is not attached automatically because a path has no unique text
  anchor.

## Limitations

Temporal dimensions, curved paths, path bundling, interactive brushing,
drag-to-reorder axes, faceting, and shared Parallel axes across composed child
programs are not implemented.

## Related

[Basic Charts](./basic-charts.md) · [Coordinates](./coordinates.md) ·
[Series encodings](./series-encodings.md) · [Selection and Highlighting](./appearance/selection-and-highlighting.md)
