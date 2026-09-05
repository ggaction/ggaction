---
layout: default
title: Mark Style
---

# Mark Style

{% include chart-example.html id="bar" %}

## Rule appearance

`encodeStroke({ value, target? })` assigns a required non-empty constant color
string to a rule. `encodeStrokeWidth({ value, target? })` assigns a
non-negative finite logical Canvas width to every child of the current rule.
These constant modes create no scale or legend.

`encodeStrokeWidth({ field, target?, fieldType?, scale? })` instead creates an
independent quantitative width scale for a line or rule. Rules receive one
width per source row. Lines receive one width per complete series, so all rows
in one series must contain the same field value. No implicit mean, sum, or
representative row is selected. The default concrete width range is `[1, 8]`.

```javascript
program
  .encodeStrokeWidth({
    field: "weight",
    scale: { domain: [0, 100], range: [1, 8] }
  })
  .createLegend({ channels: ["strokeWidth"] });
```

Field values, domains, and ranges must be finite and non-negative. `value` and
`field` are mutually exclusive. `editScale` rematerializes both marks and an
active sampled stroke-width legend.

Rules also reuse `encodeStrokeDash` in constant or nominal-field mode and
`encodeOpacity` in constant or quantitative-field mode. Field modes produce
one concrete value per rule line; constant modes remain scale-free. Recalling
an owning action replaces that appearance assignment immutably.

## `encodeBarWidth({ band?, pixels?, target? })`

Override the fraction of each resolved category band—or directional offset slot for group
layout—used by an aggregate or ranged bar and rematerialize its rectangles.

```javascript
program.encodeBarWidth({ band: 0.72 });
```

| Option | Type | Default |
| --- | --- | --- |
| `band` | finite number greater than `0` and at most `1` | first assignment: `0.72` |
| `pixels` | positive finite logical Canvas pixels | none |
| `target` | bar mark ID, including an incomplete bar | current mark |

`band` and `pixels` are mutually exclusive. Before this action is called,
complete aggregate and ranged bars already use the same implicit `0.72` band
default. A first empty call stores that default; a later empty call retains the
current mode and value. Band widths respond to Canvas resizing; pixel widths
remain fixed in logical coordinates and do not change with PNG `pixelRatio`.
An explicit pixel width may be wider than its slot, allowing intentional overlap.

Before positions are complete, the action saves the width without creating items.
A later position assignment applies it to the completed aggregate or ranged bar.
Removing a required position clears items and retains the width for reauthoring.
Histogram bins do not accept category-slot width; completing a histogram with a
saved width fails. Group layout requires matching color and directional
offset semantics. Thickness is the category bandwidth times `band` for stack, fill,
overlay, diverging, and ranged bars, or offset bandwidth times `band` for
group. Each bar is centered in its slot; missing cells are omitted.

A deferred Box plot keeps its dedicated `createBoxPlot({ width })` option.
Its lower `encodeBarWidth` override requires the Box's range to be complete.

`band` is graphical layout rather than chart meaning, so it is not added to
`semanticSpec`. The action stores immutable materialization config and writes
fully concrete `x`, `y`, `width`, `height`, and `fill` values to `graphicSpec`.
Canvas geometry changes explicitly rematerialize the scales and rectangles.

## Related

[Appearance overview](../appearance.md) · [Rule marks](../marks/rule.md) · [Bar marks](../marks/bar.md)
