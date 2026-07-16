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
| `encodeStroke` | `encodeStroke({ value: "#334155" })` | Current rule mark | Constant concrete line color |
| `encodeStrokeWidth` | `encodeStrokeWidth({ value: 3 })` | Current rule mark | Constant concrete line width |
| `encodeBarWidth` | `encodeBarWidth()` | Current aggregate bar; first assignment uses band `0.72` | Concrete rectangles |
| `selectMarks` | `selectMarks({ field: "Horsepower", op: "max" })` | Current or unique mark; deterministic selection ID | Reusable semantic final-item selection |
| `highlightMarks` | `highlightMarks({ select: { field: "Horsepower", op: "max" } })` | Current point/bar; red accent; selected-last | Concrete selected-item emphasis |

## Mark selection and highlighting

`selectMarks` is the advanced reusable-selection action. Selection by itself
does not alter `semanticSpec` or `graphicSpec`:

```javascript
const selected = program.selectMarks({
  id: "highestByOrigin",
  target: "points",
  field: "Horsepower",
  op: "max",
  groupBy: "Origin"
});
```

Choose exactly one value source:

- `field` reads a data value that is unique for the selected visual item.
- `channel` reads a resolved semantic value before scale mapping.
- `property` reads a concrete scalar from `graphicSpec`, such as pixel `height`.

Operators are strict
`eq | neq | gt | gte | lt | lte`, set membership with
`{ op: "oneOf", values }`, range selection with
`{ op: "range", min, max, inclusive? }`, or ranked selection with
`{ op: "min" | "max", count?, groupBy?, ties? }`. `count` defaults to `1`,
`ties` to `"first"`, and `inclusive` to `true`. Values are semantic data
values without coercion. The default `grain: "item"` selects one point symbol,
one final bar segment/rectangle, one line/area series path, or one rule line.
Stacked bars additionally accept `grain: "stack"` to treat all segments in one
bin or category as a single item. A multi-row path field or channel must have
one unique value at series grain.

Bar channel and graphical property names intentionally mean different things.
For a vertical bar, semantic `y` is the lower/start endpoint and semantic `y2`
is the upper/end endpoint. Concrete property `y` is the top pixel and concrete
property `height` is its pixel length. For example, select the tallest complete
histogram stack semantically with:

```javascript
program.selectMarks({
  target: "bars",
  grain: "stack",
  channel: "y2",
  op: "max"
});
```

Use `{ property: "height", op: "max" }` only when the intended comparison is
the currently rendered pixel height.

`highlightMarks` is the concise chart-authoring facade. It can create the
selection inline or reuse one:

```javascript
const highlighted = program.highlightMarks({
  select: {
    field: "Horsepower",
    op: "max",
    groupBy: "Origin"
  },
  color: "#dc2626",
  shape: "diamond",
  size: 5.5,
  offset: { x: 7, y: -7 },
  dimOthers: { opacity: 0.18 }
});

const reused = selected.highlightMarks({
  selection: "highestByOrigin",
  color: "#dc2626"
});
```

Current highlighting supports point and bar marks. `color` changes selected
fill; `opacity`, `fill`, `stroke`, and `strokeWidth` apply to both. Points also
support `shape`, positive area-multiplier `size`, and finite logical
`offset.x/y`; bars reject those point-only options. `strokeWidth` requires
`stroke`, and `color` cannot be combined with `fill`. `dimOthers` defaults to
`false`; `true` uses opacity `0.25`. `bringToFront` defaults to `true` and keeps
every rect of a selected stack together at the end of its collection.

Selection and highlight intent is immutable and is reapplied after point/bar
rematerialization, including Canvas changes and filtered data cardinality.
Reapplying `highlightMarks` for the same selection replaces that appearance
assignment. Line, area, and rule highlighting is not implemented yet.

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

## Rule appearance

`encodeStroke({ value, target? })` assigns a required non-empty constant color
string to a rule. `encodeStrokeWidth({ value, target? })` assigns a
non-negative finite logical Canvas width. Both infer the current or only rule,
create no scale or legend, and rematerialize every concrete line child.

Rules also reuse `encodeStrokeDash` in constant or nominal-field mode and
`encodeOpacity` in constant or quantitative-field mode. Field modes produce
one concrete value per rule line; constant modes remain scale-free. Recalling
an owning action replaces that appearance assignment immutably.

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

Radius, rule stroke/width, constant opacity, and both bar width modes are graphical constants. Field opacity
is a semantic encoding.
Size cannot be combined with a constant radius. A constant `editPointMark`
shape cannot be combined with field-driven `encodeShape`. Bar width
requires complete ordinal x, aggregate y, and color semantics; group additionally
requires matching xOffset semantics.
Ambiguous targets, duplicate inferred selection IDs, incompatible item-grain
selectors, and point-inapplicable highlight options fail before creating partial
selection or appearance state. Highlight appearance currently supports points only.

## Related

[Marks](./marks.md) · [Position encodings](./position-encodings.md) ·
[Series encodings](./series-encodings.md) · [Legends](./legends.md)
