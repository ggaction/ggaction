---
layout: default
title: Editing Legends
---

# Editing Legends

{% include chart-example.html id="density" %}

## Updates and trace

`editLegend()` updates one existing stable legend. Omit `target` when exactly
one legend target exists; otherwise pass its mark ID. It accepts content, layout and appearance changes supported by the resulting
legend kind. Mark encodings and scales stay unchanged.

~~~javascript
program.editLegend({
  target: "points",
  position: "left",
  offset: 80,
  count: 4,
  labels: { fontSize: 11 },
  border: { color: "#94a3b8" }
});
~~~

Nested label, title, border, and gradient objects merge only the supplied
leaves. Categorical layout mode is also preserved: styling a `legacy-bottom`
legend does not move it into the edge grid. Switch explicitly with
`editLegendLayout({ layout: "edge" })`; changing a legacy legend to another
position also requires `layout: "edge"` in that edit. A string title becomes explicit, `title: "auto"` restores field-name
inference, and `title: false` hides the concrete title without discarding the
stored semantic title. Gradient and opacity legends accept only their
kind-compatible options. Interval legends support all four positions and
`layout: "edge"`; top/bottom grids also accept alignment, direction, columns
and inline titles. Side positions require vertical flow, center alignment,
a top title and one column. When changing position, omitted direction follows
the new edge; explicitly stored columns/alignment/title placement remain and
must be made compatible in the same edit. A horizontal opacity legend can switch to
`titlePosition: "left"`; unless spacing is supplied in the same edit, the
inline mode selects its 8-pixel symbol-label and 20-pixel sample defaults.
Standalone size legends support `title`, `count`, `labels`, `titleStyle`, border,
and four-edge layout through the same editing actions. On a Full program
with an existing standalone size legend, this fragment edits its sampled content:

```javascript
const edited = program.editLegend({
  count: 3,
  title: "Mass",
  labels: { color: "#123456", fontWeight: 700 },
  titleStyle: { color: "#654321" }
});
const restored = edited.editLegendTitle({ title: false })
  .editLegendTitle({ title: "auto" });
```

Size samples retain the encoded area mapping. Count must be an integer from 2
through 10,000. Size labels use a default gap of 12 pixels after the sample slot, editable through
`labels: { offset }`; title styles do not accept an offset. The slot is at least
32 pixels wide and expands to fit the largest circle. This replaces the previous
center-relative offset of 28; explicit offsets now measure from the slot edge. Defaults remain size 12/normal for labels and size 13/600 for titles.
Side size legends use title/item centers at plot top plus 20/52, an offset of 30,
and item pitch of at least 40. Large circles or fonts expand the required spacing.
Partial styles and title visibility survive Canvas, scale and data updates.

Stroke-width legends additionally support four-edge layout and borders on creation
and editing. Their line samples remain 32 pixels long; sample widths come from
the encoded scale. The default offset is 30 and item gap is 32. Side title and
first sample centers are 20 and 52 pixels below the plot top. Thick side samples and large labels
move down as needed to keep a 12-pixel gap below the title. Horizontal grids
measure the thickest sample when allocating rows. Hidden titles do not occupy
space; visible content and borders must fit the Canvas.

For a line or rule with an existing stroke-width legend (fragment):

```javascript
weightedLines.editLegend({
  position: "top", layout: "edge", columns: 3,
  titlePosition: "left", count: 3, border: true
});
```
Basic supports size legend creation; these editing actions require Full.

## Replacing legend content

Pass `channels` as the exact final content set for the entire target. This
fragment requires a Full program with an existing legend and color, shape and
size encodings on `points`:

```javascript
const colorAndSize = program.editLegend({
  target: "points",
  channels: ["color", "size"],
  count: 3
});
const shapeOnly = colorAndSize.editLegend({
  target: "points",
  channels: ["shape"]
});
```

The first edit removes shape content and retains or adds color and size. The
second removes color and size and shows only shape. Supported combinations
match `createLegend`; an empty set is invalid. Use `removeLegend()` to remove
all content. Omitting `channels` preserves existing content.

Retained blocks keep their configuration, sample count and title visibility.
Categorical color/shape/dash revisions also retain compatible explicit symbol
recipes, text styles and order. Newly added blocks use creation defaults;
removed blocks lose their settings. A style patch in the same edit applies to
the final content. In categorical-size legends, shared label/title-style edits
merge only the supplied leaves into each block's effective style; changing a
title or count preserves independent size styles. Other targets remain intact.

## Focused edits

Focused actions avoid constructing nested `editLegend()` options when only one
legend component should change:

```javascript
program
  .editLegendLayout({ position: "left", offset: 12 })
  .editLegendLabels({ color: "#475569", fontSize: 11 })
  .editLegendTitle({ title: "Country", fontWeight: 700 })
  .editLegendSymbols({ count: 5 })
  .editLegendBorder({
    border: { color: "#cbd5e1", lineWidth: 1, padding: 8 }
  });
```

| Action | Accepted component options |
| --- | --- |
| `editLegendLayout` | `position`, `layout`, `align`, `direction`, `columns`, `offset`, `titlePosition`, `itemGap` |
| `editLegendLabels` | `color`, `fontSize`, `fontFamily`, `fontWeight` |
| `editLegendTitle` | `title`, `color`, `fontSize`, `fontFamily`, `fontWeight` |
| `editLegendSymbols` | `symbol`, `count`, `gradient` |
| `editLegendBorder` | required `border` boolean or border style object |

Every focused action also accepts `target`. Omit it only when one existing
legend is inferable. The actions use `editLegend` internally, so title modes,
partial nested merges, legend-kind compatibility, layout errors, and
rematerialization behavior remain identical. At least one component option is
required.

Legend label and title weights follow the shared
[Canvas font-weight policy](../marks/text.md#font-weights).

## Removing a legend

`removeLegend()` removes every legend block associated with one mark, including
combined categorical and size blocks. Mark encodings and scales remain.

```javascript
const withoutLegend = program.removeLegend({ target: "points" });
```

`target` may be omitted when exactly one legend owner exists. Independent
legend owners require an explicit target.

Pass `channels` to remove only the selected content:

```javascript
const withoutSize = program.removeLegend({
  target: "points",
  channels: ["size"]
});
```

Accepted channels are `color`, `strokeDash`, `strokeWidth`, `shape`, `size`,
and `opacity`. In a combined color-and-shape legend, removing `shape` keeps the
color explanation and removing `color` keeps the shape explanation. The last
remaining channel removes the block. Partial removal preserves title visibility,
custom titles, styles, layout, item order, and explicit symbol recipes. Automatic
symbols are inferred again from the remaining channels. Removing an encoding
uses the same revision rules and also preserves a hidden legend title.

Retained blocks are rematerialized when their layout depended on the removed
content. `removeLegend` preserves mark encodings, scales, and unrelated blocks.
A missing channel or an empty, duplicate, or unknown channel list is an error.

Canvas changes and relevant encoding actions explicitly rematerialize the
legend from the latest ordinal domains and ranges. The renderer still reads
only concrete `graphicSpec` values.

~~~text
createLegend
├─ createCategoricalLegend | createGradientLegend | createOpacityLegend
│  └─ concrete background?, symbols/strips, labels, and title
└─ createSizeLegend?
~~~

~~~text
editLegend
├─ rematerializeLegend | rematerializeGradientLegend | rematerializeOpacityLegend
└─ rematerializeStrokeWidthLegend
   └─ concrete background?, symbols/strips, labels, title?, and size block
~~~

The component actions shown above are internal wrapped actions. Chart and
extension authors call the public `createLegend()` facade; the children remain
visible in the trace.

`createGuides()` selects line-series, histogram color, grouped-bar color,
grouped-area color, and compatible point color/shape/size, sequential color,
or standalone field-opacity legends automatically.
Pass `createGuides({ legend: false })` to opt out.

## Related

[Legend overview](../legends.md) · [Guides](../guides.md) · [Canvas](../canvas.md)

Combined categorical-size legends can also move between all four edges with
`editLegendLayout({ position })`. Moving to a different edge infers the direction
when it is omitted; explicit incompatible grid controls still fail. On top and
bottom the categorical layout controls position both blocks. The size block's
own stored layout returns when the categorical channels are removed. A title
edit changes the categorical title; the size block retains its own title and
visibility. Whole-content replacement preserves both retained blocks' settings.
