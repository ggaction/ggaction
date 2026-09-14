---
layout: default
title: Point Appearance
---

# Point Appearance

{% include chart-example.html id="regression" lead=true %}

## `encodeRadius({ value, target? })`

Broadcast a non-negative finite graphical radius to a point mark.

<!-- snippet-context:start -->

> **Contextual fragment.** Use an ES module with the imports, data, and prepared resource state described in this section. Caller-provided receivers: `program`. Resolve these names from setup in this fragment or section; alternatives branch from the same base.

<!-- snippet-context:end -->

```javascript
program.encodeRadius({ value: 3 });
```

`encodePointRadius({ value, target? })` is available in default and Basic entries.
Scatter `point.radius` delegates to it and conflicts with top-level `size`.
The older `encodeRadius` alias and `removePointRadius` remain default-entry APIs.
It records `encodeRadius` as a wrapped child and remains distinct from
`encodeR`, which assigns semantic radial position.

| Option | Type | Default |
| --- | --- | --- |
| `value` | non-negative finite number | required |
| `target` | point mark ID | current mark |

Radius is fixed appearance. It does not create a semantic field encoding and
is not a Polar radial position channel.

## `removePointRadius({ target? } = {})`

<!-- snippet-context:start -->

> **Contextual fragment.** Use an ES module with the imports, data, and prepared resource state described in this section. Caller-provided receivers: `program`. Resolve these names from setup in this fragment or section; alternatives branch from the same base.

<!-- snippet-context:end -->

```javascript
const defaultSized = program.removePointRadius();
```

The point must have an explicit constant radius. The action removes that
graphical config and rematerializes every glyph at the theme radius `3`; it
does not remove or edit semantic Polar `radius`. An ambiguous target or a point
without an explicit radius is an error.

## Point field encodings

<!-- snippet-context:start -->

> **Contextual fragment.** Use an ES module with the imports, data, and prepared resource state described in this section. Resolve these names from setup in this fragment or section; alternatives branch from the same base.

<!-- snippet-context:end -->

```javascript
program
  .encodeSize({ field: "Acceleration" })
  .encodeShape({ field: "Origin" })
  .encodeOpacity({ value: 0.27 });
```

`encodeSize({ field, target?, fieldType?, scale? })` requires a quantitative
field. Its scale supports `linear`, `log`, `sqrt`, `pow`, `quantize`, `quantile`,
and `threshold`. Every range value is an area in square logical pixels; the
automatic continuous range is `[24, 196]`. Circles use `sqrt(area / PI)` as
radius and squares use `sqrt(area)` as side length, so the shapes represent
equal visual area.

Logarithmic size scales require positive values and use base 10 unless `base`
is supplied. Square-root and power scales require non-negative values; power
scales require a positive `exponent`. Quantize and quantile require at least two
nondecreasing area values. Threshold domains are strictly increasing cut points
and require one more area than cuts. Discrete size legends show every interval
and therefore reject an explicit sample `count`.

`encodeShape({ field, target?, fieldType?, scale? })` requires a nominal field.
Its ordinal scale accepts the 12 shared point shapes documented under
[Marks](../marks.md). The automatic range uses each shape once and rejects more
than 12 distinct categories rather than silently repeating symbols. Explicit
ranges must contain unique supported shapes. Mixed circle, rect, and Z-closed path
symbols are stored as typed items in one graphical collection.

`encodeOpacity` accepts exactly one of `value` or `field`. A constant value from
`0` to `1` is graphical. A quantitative field creates semantic opacity and a
linear scale with automatic range `[0.2, 1]`; its scale supports explicit
domain/range plus `nice`, `zero`, `clamp`, and `reverse`. Calling the action
again atomically replaces constant↔field or field↔field mode. Every resolved
opacity remains concrete in `graphicSpec`. `editPointMark({ opacity })` rejects
active field opacity; explicitly call `encodeOpacity({ value })` to replace it.

All point appearance actions invoke the same point materializer. Existing x,
y, color, size, shape, and opacity state is recombined after each change and
after Canvas bounds change, making action order irrelevant.

Calling `encodeSize` or `encodeShape` again replaces its existing field and
compatible scale binding. Omitting `scale.id` reuses the current scale;
providing a new ID retains the previous named scale. Existing legends are
recomputed, inferred legend titles follow the new field, and explicit legend
titles and styles remain unchanged.

## Related

[Appearance overview](../appearance.md) · [Point marks](../marks/point.md) · [Legends](../legends.md)
