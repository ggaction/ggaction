---
layout: default
title: Appearance Encodings
---

# Appearance Encodings

## At a glance

| Action | Shortest call | Inference/defaults | Result |
| --- | --- | --- | --- |
| `encodeRadius` | `encodeRadius({ value: 3 })` | Current point mark | Concrete circle radius |
| `encodeSize` | `encodeSize({ field: "Acceleration" })` | Current point; linear scale; area range `[24, 196]` | Semantic size and concrete equal-area symbols |
| `encodeShape` | `encodeShape({ field: "Origin" })` | Current point; ordinal circle/square range | Semantic shape and mixed concrete symbols |
| `encodeOpacity` | `encodeOpacity({ value: 0.27 })` | Current point mark | Concrete opacity |
| `encodeBarWidth` | `encodeBarWidth()` | Current grouped bar; band `0.72` | Concrete grouped rectangles |

## `encodeRadius({ value, target? })`

Broadcast a non-negative finite graphical radius to a point mark.

```javascript
program.encodeRadius({ value: 3 });
```

| Option | Type | Default |
| --- | --- | --- |
| `value` | non-negative finite number | required |
| `target` | point mark ID | current mark |

Radius is fixed appearance. It does not create a semantic field encoding and
is not a Polar radial position channel.

## Point field encodings

```javascript
program
  .encodeSize({ field: "Acceleration" })
  .encodeShape({ field: "Origin" })
  .encodeOpacity({ value: 0.27 });
```

`encodeSize({ field, target?, fieldType?, scale? })` requires a quantitative
field. Its scale accepts `id`, `type`, `domain`, and an area `range`; automatic
range is `[24, 196]`. Circles use `sqrt(area / PI)` as radius and squares use
`sqrt(area)` as side length, so the two shapes represent equal visual area.

`encodeShape({ field, target?, fieldType?, scale? })` requires a nominal field.
Its ordinal scale accepts circle and square values and defaults to alternating
those two shapes. Mixed symbols are stored as typed children in one graphical
collection.

`encodeOpacity({ value, target? })` accepts a constant from `0` to `1`. It is
graphical and does not add a semantic field encoding. Size and shape are
semantic; their resolved radius, width, height, primitive type, and opacity are
fully concrete in `graphicSpec`.

All point appearance actions invoke the same point materializer. Existing x,
y, color, size, shape, and opacity state is recombined after each change and
after Canvas bounds change, making action order irrelevant.

## `encodeBarWidth({ band?, target? })`

Set the fraction of each resolved xOffset slot occupied by a grouped bar and
materialize concrete rectangles.

```javascript
program.encodeBarWidth({ band: 0.72 });
```

| Option | Type | Default |
| --- | --- | --- |
| `band` | finite number greater than `0` and at most `1` | `0.72` |
| `target` | grouped bar mark ID | current mark |

The action requires ordinal x, mean/non-stacked y, grouped color, and matching
xOffset semantics. Concrete width is `xOffset.bandwidth * band`; each bar is
centered in its slot. Missing x/color cells are omitted rather than represented
by placeholder rects.

`band` is graphical layout rather than chart meaning, so it is not added to
`semanticSpec`. The action stores immutable materialization config and writes
fully concrete `x`, `y`, `width`, `height`, and `fill` values to `graphicSpec`.
Canvas geometry changes explicitly rematerialize the scales and rectangles.

## Errors and limitations

Radius, opacity, and bar band are graphical constants, not field encodings.
Size cannot be combined with a constant radius. Bar width
requires complete ordinal x, aggregate y, color, and xOffset semantics.

## Related

[Marks](./marks.md) · [Position encodings](./position-encodings.md) ·
[Series encodings](./series-encodings.md) · [Legends](./legends.md)
