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
| `encodeShape` | `encodeShape({ field: "Origin" })` | Current point; 12-value ordinal shape range | Semantic shape and mixed concrete symbols |
| `encodeOpacity` | `encodeOpacity({ value: 0.27 })` | Current point mark | Constant concrete opacity |
| `encodeOpacity` | `encodeOpacity({ field: "Acceleration" })` | Current point; linear scale; range `[0.2, 1]` | Semantic field opacity and concrete values |
| `encodeBarWidth` | `encodeBarWidth()` | Current aggregate bar; first assignment uses band `0.72` | Concrete rectangles |

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
Its ordinal scale accepts the 12 shared point shapes documented under
[Marks](./marks.md). The automatic range uses each shape once and rejects more
than 12 distinct categories rather than silently repeating symbols. Explicit
ranges must contain unique supported shapes. Mixed circle, rect, and Z-closed path
symbols are stored as typed children in one graphical collection.

`encodeOpacity` accepts exactly one of `value` or `field`. A constant value from
`0` to `1` is graphical. A quantitative field creates semantic opacity and a
linear scale with automatic range `[0.2, 1]`; its scale supports explicit
domain/range plus `nice`, `zero`, `clamp`, and `reverse`. Calling the action
again atomically replaces constant↔field or field↔field mode. Every resolved
opacity remains concrete in `graphicSpec`.

All point appearance actions invoke the same point materializer. Existing x,
y, color, size, shape, and opacity state is recombined after each change and
after Canvas bounds change, making action order irrelevant.

Calling `encodeSize` or `encodeShape` again replaces its existing field and
compatible scale binding. Omitting `scale.id` reuses the current scale;
providing a new ID retains the previous named scale. Existing legends are
recomputed, inferred legend titles follow the new field, and explicit legend
titles and styles remain unchanged.

## `encodeBarWidth({ band?, pixels?, target? })`

Set the fraction of each resolved x band—or xOffset slot for group layout—used
by an aggregate bar and materialize concrete rectangles.

```javascript
program.encodeBarWidth({ band: 0.72 });
```

| Option | Type | Default |
| --- | --- | --- |
| `band` | finite number greater than `0` and at most `1` | first assignment: `0.72` |
| `pixels` | positive finite logical Canvas pixels | none |
| `target` | aggregate bar mark ID | current mark |

`band` and `pixels` are mutually exclusive. A later empty call retains the
current mode and value. Band widths respond to Canvas resizing; pixel widths
remain fixed in logical coordinates and do not change with PNG `pixelRatio`.
An explicit pixel width may be wider than its slot, allowing intentional overlap.

The action requires ordinal x, aggregate y, and nominal color. Group layout also
requires matching xOffset semantics. Width is the outer x bandwidth times `band`
for stack, fill, overlay, and diverging, or xOffset bandwidth times `band` for
group. Each bar is centered in its band; missing cells are omitted.

`band` is graphical layout rather than chart meaning, so it is not added to
`semanticSpec`. The action stores immutable materialization config and writes
fully concrete `x`, `y`, `width`, `height`, and `fill` values to `graphicSpec`.
Canvas geometry changes explicitly rematerialize the scales and rectangles.

## Errors and limitations

Radius, constant opacity, and both bar width modes are graphical constants. Field opacity
is a semantic encoding.
Size cannot be combined with a constant radius. A constant `editPointMark`
shape cannot be combined with field-driven `encodeShape`. Bar width
requires complete ordinal x, aggregate y, and color semantics; group additionally
requires matching xOffset semantics.

## Related

[Marks](./marks.md) · [Position encodings](./position-encodings.md) ·
[Series encodings](./series-encodings.md) · [Legends](./legends.md)
