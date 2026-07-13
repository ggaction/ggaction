---
layout: default
title: Constant Appearance
---

# Constant Appearance

## At a glance

| Action | Shortest call | Inference/defaults | Result |
| --- | --- | --- | --- |
| `encodeRadius` | `encodeRadius({ value: 3 })` | Current point mark | Concrete circle radius |
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

Radius and bar band are graphical constants, not field encodings. Bar width
requires complete ordinal x, aggregate y, color, and xOffset semantics.

## Related

[Marks](./marks.md) · [Position encodings](./position-encodings.md) ·
[Series encodings](./series-encodings.md)
