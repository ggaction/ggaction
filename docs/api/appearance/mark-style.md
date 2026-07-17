---
layout: default
title: Mark Style
---

# Mark Style

{% include chart-example.html id="bar" %}

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

Override the fraction of each resolved category band—or xOffset slot for group
layout—used by an aggregate or ranged bar and rematerialize its rectangles.

```javascript
program.encodeBarWidth({ band: 0.72 });
```

| Option | Type | Default |
| --- | --- | --- |
| `band` | finite number greater than `0` and at most `1` | first assignment: `0.72` |
| `pixels` | positive finite logical Canvas pixels | none |
| `target` | aggregate or ranged bar mark ID | current mark |

`band` and `pixels` are mutually exclusive. Before this action is called,
complete aggregate and ranged bars already use the same implicit `0.72` band
default. A first empty call stores that default; a later empty call retains the
current mode and value. Band widths respond to Canvas resizing; pixel widths
remain fixed in logical coordinates and do not change with PNG `pixelRatio`.
An explicit pixel width may be wider than its slot, allowing intentional overlap.

The action requires a complete category/measure aggregate bar or a complete
categorical ranged bar. Group layout also requires matching color and xOffset
semantics. Width is the category bandwidth times `band` for stack, fill,
overlay, diverging, and ranged bars, or xOffset bandwidth times `band` for
group. Each bar is centered in its slot; missing cells are omitted.

`band` is graphical layout rather than chart meaning, so it is not added to
`semanticSpec`. The action stores immutable materialization config and writes
fully concrete `x`, `y`, `width`, `height`, and `fill` values to `graphicSpec`.
Canvas geometry changes explicitly rematerialize the scales and rectangles.

## Related

[Appearance overview](../appearance.md) · [Rule marks](../marks/rule.md) · [Bar marks](../marks/bar.md)
