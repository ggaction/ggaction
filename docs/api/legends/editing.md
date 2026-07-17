---
layout: default
title: Editing Legends
---

# Editing Legends

{% include chart-example.html id="density" %}

## Updates and trace

`editLegend()` updates one existing stable legend. Omit `target` when exactly
one legend target exists; otherwise pass its mark ID. It accepts layout and
appearance options from `createLegend` except semantic `channels`.

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
leaves. A string title becomes explicit, `title: "auto"` restores field-name
inference, and `title: false` hides the concrete title without discarding the
stored semantic title. Gradient and opacity legends accept only their
kind-compatible options.

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
| `editLegendLayout` | `position`, `align`, `direction`, `columns`, `offset`, `titlePosition`, `itemGap` |
| `editLegendLabels` | `color`, `fontSize`, `fontFamily`, `fontWeight` |
| `editLegendTitle` | `title`, `color`, `fontSize`, `fontFamily`, `fontWeight` |
| `editLegendSymbols` | `symbol`, `count`, `gradient` |
| `editLegendBorder` | required `border` boolean or border style object |

Every focused action also accepts `target`. Omit it only when one existing
legend is inferable. The actions use `editLegend` internally, so title modes,
partial nested merges, legend-kind compatibility, layout errors, and
rematerialization behavior remain identical. At least one component option is
required.

## Removing a legend

`removeLegend()` removes every legend block associated with one mark, including
combined categorical and size blocks. Mark encodings and scales remain.

```javascript
const withoutLegend = program.removeLegend({ target: "points" });
```

`target` may be omitted when exactly one legend owner exists. Independent
legend owners require an explicit target.

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
└─ rematerializeLegend | rematerializeGradientLegend | rematerializeOpacityLegend
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
