---
layout: default
title: Visual Encodings
---

[Documentation home](./index.md) · [Mark actions](./mark-actions.md)

# Visual Encodings

`encodeX` and `encodeY` map quantitative dataset fields to concrete point
positions.

```javascript
const program = chart()
  .createCanvas({
    width: 640,
    height: 400,
    margin: { top: 30, right: 30, bottom: 60, left: 70 }
  })
  .createData({ id: "cars", values: cars })
  .createPointMark({ id: "points" })
  .encodeX({ field: "Horsepower" })
  .encodeY({ field: "Miles_per_Gallon" })
  .encodeColor({ field: "Origin" })
  .encodeRadius({ value: 3 });
```

The current point mark is used by default. Select another mark with `target`:

```javascript
program.encodeX({
  target: "points",
  field: "Horsepower"
});
```

## Scale options

Each position channel uses a scale with the channel name as its default ID.
The current release supports quantitative fields and linear scales.

```javascript
program.encodeX({
  field: "Horsepower",
  fieldType: "quantitative",
  scale: {
    id: "x",
    type: "linear",
    domain: "auto",
    range: "auto"
  }
});
```

An automatic domain uses the extent of every field sharing that scale. An
automatic range uses the current Canvas bounds. The y range runs from the
bottom of the bounds to the top so larger values appear higher.

Explicit two-number domains and ranges are also supported:

```javascript
program.encodeX({
  field: "Horsepower",
  scale: {
    domain: [0, 250],
    range: [70, 610]
  }
});
```

The semantic specification retains `"auto"` when the user requested automatic
resolution. The program separately retains the resolved scale, while each
point graphic stores its final numeric coordinate. The renderer reads only
those concrete graphical values.

Editing Canvas width, height, or margin explicitly rematerializes existing
auto-range position encodings. Explicit ranges remain unchanged.

Every encoded field value must currently be a finite number. Filter or prepare
missing values before creating the dataset.

## Color

`encodeColor` maps a nominal field to concrete point fill colors. It uses an
ordinal scale named `color` and the `tableau10` palette by default.

```javascript
program.encodeColor({ field: "Origin" });
```

The automatic domain preserves category first-appearance order across every
mark sharing the scale. Choose explicit categories and colors when needed:

```javascript
program.encodeColor({
  field: "Origin",
  scale: {
    domain: ["USA", "Europe", "Japan"],
    range: ["#4c78a8", "#f58518", "#54a24b"]
  }
});
```

A named palette is expressed as a range descriptor:

```javascript
scale: { range: { palette: "tableau10" } }
```

`"auto"` selects the same palette. Nominal values may be strings, finite
numbers, or booleans. Missing, null, array, and object values are rejected.

## Constant radius

`encodeRadius` broadcasts a non-negative finite radius to the current point
mark, or to an explicit `target`:

```javascript
program.encodeRadius({ value: 3 });
```

Constant radius is graphical appearance. It does not create a semantic
encoding or scale.
