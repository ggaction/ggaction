---
layout: default
title: Encodings
---

# Encodings

Encoding actions connect data fields or constant values to chart channels.
Only values that cannot be inferred safely are required; most target, scale,
coordinate, and type options use the current program state or documented
defaults.

## Position

[`encodeX` and `encodeY`](./position-encodings.md) create quantitative point
positions, temporal/aggregate line positions, or a binned quantitative bar x
encoding. They also establish the Cartesian coordinate and continuous scales
used by axes.

```javascript
program
  .encodeX({ field: "Horsepower" })
  .encodeY({ field: "Miles_per_Gallon" });
```

```javascript
barProgram.encodeX({
  field: "Displacement",
  bin: { maxBins: 10 }
}).encodeY();
```

## Atomic histogram

`encodeHistogram` is the concise equivalent of binned bar `encodeX` followed
by count/zero-stack `encodeY`.

```javascript
program.encodeHistogram({
  field: "Displacement",
  maxBins: 10
});
```

It accepts optional `target`, `coordinate`, `stack`, `xScale`, and `yScale`
options. The action directly records `encodeX` and `encodeY` as its children;
it does not duplicate binning, scale, count, or rect materialization logic.

Use the explicit channel actions when x and y need to be authored as separate
steps. Both forms produce the same semantic and graphical result.

## Series

[`encodeColor` and `encodeStrokeDash`](./series-encodings.md) create nominal
series identity and concrete colors or dash patterns. On line marks they can
split one aggregate path into multiple series. On complete histograms,
`encodeColor` splits every bin into category-stacked rects.

```javascript
program
  .encodeColor({ field: "Origin" })
  .encodeStrokeDash({ field: "Origin" });
```

## Constant appearance

[`encodeRadius`](./appearance.md) broadcasts a graphical radius to point marks.
It does not create a semantic field encoding.

```javascript
program.encodeRadius({ value: 3 });
```

## Scale options

[Scale options](./scales.md) explains automatic and explicit domains, ranges,
`nice`, `zero`, palettes, and dash-pattern ranges.
