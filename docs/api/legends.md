---
layout: default
title: Legends
---

# Legends

{% include chart-example.html id="density" %}

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
| `createLegend` | `createLegend()` | Current/unique compatible mark; right position | Categorical, size, gradient, interval, or opacity guide |
| `editLegend` | `editLegend({ position: "left" })` | Unique existing legend; omitted properties retained | Rematerialized layout and appearance |
| Focused edits | `editLegendLabels({ fontSize: 11 })` | Same target inference as `editLegend` | One legend component rematerialized |
| `removeLegend` | `removeLegend({ target: "points" })` | Existing legend owner | All owned legend blocks removed |

Legends are inferred from final mark encodings and materialized as concrete
graphics. Start with the family that matches the encoded channel and use the
editing page when changing an existing guide.

## Supported legend families

<!-- action-capabilities:legends:start -->
| Legend family | Supported marks | Channels |
| --- | --- | --- |
| Categorical | point, line, area, bar, rect, arc | color, shape, strokeDash, or compatible composites |
| Continuous gradient | point, aggregate bar, rect | sequential color |
| Discretized interval | point | quantize, quantile, or threshold color |
| Sampled | point | field opacity or size |
<!-- action-capabilities:legends:end -->

## Focused legend families

<div class="docs-entry-grid docs-entry-grid--two">
  <a href="{{ '/api/legends/categorical/' | relative_url }}"><strong>Categorical legends</strong><span>Create categorical, size, and interval guides and control their layout.</span></a>
  <a href="{{ '/api/legends/continuous/' | relative_url }}"><strong>Continuous legends</strong><span>Gradient color and sampled opacity guides.</span></a>
  <a href="{{ '/api/legends/composite/' | relative_url }}"><strong>Composite symbols</strong><span>Layered line, point, and swatch recipes plus optional borders.</span></a>
  <a href="{{ '/api/legends/editing/' | relative_url }}"><strong>Edit and remove</strong><span>Atomic component edits, rematerialization, trace, and removal.</span></a>
</div>

## Errors and limitations

Continuous color legends support point, aggregate-bar, and rect marks. Field
opacity and discretized continuous legends remain point-only. Interactive legends are unsupported.
Combined point-series and quantitative-size legends require a right or left
side position so both blocks remain in one vertical stack. A left block must
fit outside any left y-axis guides; use sufficient margin and offset.
Right-side layout requires sufficient right margin; bottom layout requires
sufficient bottom margin; top layout requires enough top margin for its title,
item grid, offset, and optional border. The library reports a layout error
instead of resizing the Canvas or dropping symbol layers.

## Related

[Guides](./guides.md) · [Series encodings](./series-encodings.md) ·
[Canvas](./canvas.md) · [Troubleshooting](../troubleshooting.md)
