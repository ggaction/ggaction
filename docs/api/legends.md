---
layout: default
title: Legends
---

# Legends

{% include chart-example.html id="density" lead=true %}

<div class="docs-concept-flow" role="img" aria-label="Legend creation reads resolved encodings and scales, chooses a symbol recipe, and writes concrete guide graphics">
  <span><code>encoding + scale</code><strong>Guide meaning</strong></span>
  <b aria-hidden="true">→</b>
  <span><code>symbol recipe</code><strong>Categorical, gradient, or composite</strong></span>
  <b aria-hidden="true">→</b>
  <span><code>rect · line · text</code><strong>Concrete guide graphics</strong></span>
</div>

## At a glance

| Action | Shortest call | Inference/defaults | Result |
| --- | --- | --- | --- |
| `createLegend` | `createLegend()` | Current/unique compatible mark; right position | Categorical, size, stroke-width, gradient, interval, or opacity guide; sampled channels accept exact `values` |
| `editLegend` | `editLegend({ position: "left" })` | Unique existing legend; omitted properties retained | Rematerialized content, layout, and appearance |
| `editLegendBlock` | `editLegendBlock({ target: "points", channel: "size", title: "Magnitude" })` | Explicit mark and represented channel | Only the selected logical block is rematerialized |
| Focused edits | `editLegendLabels({ fontSize: 11 })` | Same target inference as `editLegend` | One legend component rematerialized |
| `removeLegend` | `removeLegend({ channels: ["size"] })` | Existing legend owner; omitted channels remove all | Selected complete blocks removed |

Legends are inferred from final mark encodings and materialized as concrete
graphics. Start with the family that matches the encoded channel and use the
editing page when changing an existing guide.

Right and left legends start at the top of the actual plot, excluding the chart title.
The complete legend includes its visible title, symbols, labels, and optional border.
Multiple blocks share one stack whose top aligns with the plot; blocks retain their spacing.
Shared facet legends align with the top of the translated child plots.
The horizontal `offset` still controls the gap beside the plot.
Top, bottom, and in-plot corner positions keep their own alignment rules.

## Editing one block

Use the optional singular `channel` on `editLegend` or a focused editor to select one existing block:

<!-- snippet-context:start -->

> **Contextual fragment.** Use an ES module with the imports, data, and prepared resource state described in this section. Caller-provided receivers: `program`. Resolve these names from setup in this fragment or section; alternatives branch from the same base.

<!-- snippet-context:end -->

```js
// Fragment: program already owns color and opacity legends for one point mark.
program.editLegendLabels({ channel: "opacity", fontSize: 10 });
```

This changes only the selected block. It preserves sibling typography and sample values. Specify `target`
when more than one mark owns legends. Singular `channel` cannot accompany plural `channels`, which replaces
whole-target content, or whole-group `blockLayout`/`at` controls.

## Supported legend families

<!-- action-capabilities:legends:start -->

| Legend family | Supported marks | Channels |
| --- | --- | --- |
| Categorical color/shape/dash | point, line, area, bar, rect, arc, text | ordinal color; point shape; line strokeDash; compatible composites follow family constraints |
| Categorical stroke | point, line, area, bar, rect, arc, rule, tick | ordinal stroke; final-item or series identities |
| Continuous color gradient | point, aggregate bar, rect, text | sequential color; gradient swatch, no symbol recipe |
| Continuous stroke gradient | point, line, area, bar, rect, arc, rule, tick | sequential stroke; separate gradient, no symbol recipe |
| Discretized color interval | point, aggregate bar, rect | quantize/quantile/threshold color; rectangle swatches |
| Discretized stroke interval | point, line, area, bar, rect, arc, rule, tick | quantize/quantile/threshold stroke; outline-colored interval symbols |
| Size | point | size; continuous numeric samples or every discrete interval; point glyph symbol |
| Opacity | point, line, bar | quantitative opacity samples; representative point symbol even for line consumers; Rule opacity has no legend |
| Stroke width | line, rule | quantitative strokeWidth samples; line symbol |

<!-- action-capabilities:legends:end -->

## Focused legend families

<div class="docs-entry-grid docs-entry-grid--two">
  <a href="{{ '/api/legends/categorical/' | relative_url }}"><strong>Categorical legends</strong><span>Create categorical, size, and interval guides and control their layout.</span></a>
  <a href="{{ '/api/legends/continuous/' | relative_url }}"><strong>Continuous legends</strong><span>Gradient color and sampled opacity guides.</span></a>
  <a href="{{ '/api/legends/composite/' | relative_url }}"><strong>Composite symbols</strong><span>Layered line, point, and swatch recipes plus optional borders.</span></a>
  <a href="{{ '/api/legends/editing/' | relative_url }}"><strong>Edit and remove</strong><span>Atomic component edits, rematerialization, trace, and removal.</span></a>
</div>

## Errors and limitations

Continuous color legends support point, aggregate-bar, and rect marks. Continuous
stroke legends support every stroke-capable mark at its documented item/series grain. Field
Opacity legends support Point and Line; discretized color legends support Point, aggregate Bar, and Rect. Interactive legends are unsupported.
Combined point-series and size legends support every edge. Continuous size
blocks sample the domain; discrete size blocks show every interval.
Side positions stack the blocks; horizontal positions place them in rows. A left block must
fit outside any left y-axis guides; use sufficient margin and offset.
Stroke-width legends support all four edges and plot corners through `createLegend` and
`editLegendLayout`. Use `layout: "edge"`, `offset`, `itemGap`, and horizontal
`align`, `direction`, `columns`, and `titlePosition` controls. Title, count,
label/title styles, and border are editable. Side positions require vertical
direction, center alignment, one column, and a top title. Symbol recipes,
gradient, and order are unsupported; edit quantitative mapping through `editScale`.
Continuous size, opacity, stroke-width, and color-symbol legends accept `values` for exact
ascending samples. Exact values must fit the effective domain and cannot be
combined with `count`; use `editLegend({ values: "auto" })` to return to the
remembered automatic sample count. Use `editLegendBlock()` when a target has
multiple blocks and only one block's samples, order, title, labels, spacing, or
supported symbol appearance should change.
Right-side layout requires sufficient right margin; bottom layout requires
sufficient bottom margin; top layout requires enough top margin for its title,
item grid, offset, and optional border. The library reports a layout error
instead of resizing the Canvas or dropping symbol layers.

## Put a compact categorical legend inside the plot

Use a corner position such as `"top-left"` and
`overflow: { maxItems: 29 }` in `createLegend` or `editLegend`. The first 29
categories keep their original symbols; a text-only summary reports the remaining
count. `border: { background: "white" }` provides an opaque panel behind the
legend. The limit changes the displayed guide only, preserving every data row
and color assignment. See the [exact legend contract](../reference/actions/guides.md#createlegend)
for supported anchors and layout restrictions.

**Title alignment.**

Use `titleStyle: {align: "left"}` to align a top title inside the measured
legend content block. The same style accepts `"center"` and `"right"` for
categorical, gradient, interval, size, opacity and stroke-width legends. This
text alignment is separate from the complete legend's placement `align`.
Omitting it preserves the native layout's current default.

On an existing legend, `editLegendTitle({align: "right"})` changes only that
choice. `editLegendTitle({align: "auto"})` restores the native default; the
whole edit equivalent is `editLegend({titleStyle: {align: "auto"}})`. These
are fragments requiring an existing legend. A top-to-inline title transition
can reset the choice in the same whole edit; inline `titlePosition: "left"`
rejects an explicit title alignment. Border padding, group anchors, item
positions and spacing retain their existing rules.

## Related
[Guides](./guides.md) · [Series encodings](./series-encodings.md) ·
[Canvas](./canvas.md) · [Troubleshooting](../troubleshooting.md)

When creating a separate size legend, an explicit `position` is honored even if a color or shape legend for the same mark uses another edge. Omit size `position` to inherit the categorical legend edge. Resizing retains that choice.
