---
layout: default
title: Encodings
---

# Encodings

{% include chart-example.html id="regression" %}

Encoding actions connect data fields or constants to chart channels. Ordinary
authors choose the relationship; ggaction infers a unique target, coordinate,
scale ID, and field type when the stored program makes that choice safe.

## Choose a family

<div class="docs-entry-grid docs-entry-grid--two">
  <a href="{{ '/api/position-encodings/' | relative_url }}"><strong>Position</strong><span>x/y, ranges, offsets, Polar theta/radius, rules, and Parallel dimensions.</span></a>
  <a href="{{ '/api/series-encodings/' | relative_url }}"><strong>Series</strong><span>Color, stroke dash, grouping, stroke width, and explicit path order.</span></a>
  <a href="{{ '/api/appearance/' | relative_url }}"><strong>Appearance</strong><span>Point size, shape, opacity, radius, and constant mark style.</span></a>
  <a href="{{ '/api/marks/text/' | relative_url }}"><strong>Text</strong><span>Field-driven or constant annotation content and formatting.</span></a>
  <a href="{{ '/api/scales/' | relative_url }}"><strong>Scales</strong><span>Domains, ranges, types, palettes, missing values, and precedence.</span></a>
  <a href="{{ '/reference/actions/encodings/' | relative_url }}"><strong>Exact action contracts</strong><span>Complete generated signatures, options, defaults, and errors.</span></a>
</div>

## Supported mark/channel matrix

<!-- action-capabilities:summary:start -->
The tables below are generated from the same reviewed capability registry used by the focused API pages.

### Position channels

| Action | Supported marks | Field types | Important modes |
| --- | --- | --- | --- |
| `encodeX` | point, line, area, bar, rect, rule, text | point/bar/rect/rule/text: quantitative, temporal, ordinal, nominal; line/area: quantitative, temporal | field; rule also accepts datum; bar accepts aggregate or bin |
| `encodeY` | point, line, area, bar, rect, rule, text | point/line/bar/rect/rule/text: quantitative, temporal, ordinal, nominal; area: quantitative, temporal | field; rule also accepts datum; bar accepts aggregate or count |
| `encodeX2` / `encodeY2` | area, ranged bar, rect, rule | area/ranged bar/rect/rule: matching primary | secondary field; rule also accepts datum |
| `encodeTheta` | point, line, arc | point/line: quantitative, temporal, ordinal, nominal; arc: ordinal, nominal | arc accepts aggregate: count or weighted sum for proportional sectors |
| `encodeR` | point, line, arc | point/line/arc: quantitative | radial position; arc combines it with a categorical theta band |
| `encodeParallelCoordinates` | line | line: quantitative, ordinal | atomic ordered dimensions; one namespaced scale and axis per dimension |

### Color channels

| Mode | Supported marks | Field types | Important options |
| --- | --- | --- | --- |
| Categorical | point, line, area, bar, rect, arc | point/line/area/bar/rect/arc: nominal, ordinal | bar/area layout; arc overlay; palette and ordinal scale |
| Continuous | point, aggregate bar, rect | point/rect: quantitative, temporal; aggregate bar: quantitative | sequential scale; aggregate required for a different bar measure |
| Discretized continuous | point | point: quantitative | quantize, quantile, or threshold scale |

### Selection and guides

| Action | Supported marks | Grain | Result |
| --- | --- | --- | --- |
| `selectMarks` / `highlightMarks` | point, bar, line, area, rect, arc, rule | item; stacked bars also support stack | selection intent and mark-specific durable emphasis |

| Legend family | Supported marks | Channels |
| --- | --- | --- |
| Categorical | point, line, area, bar, rect, arc | color, shape, strokeDash, or compatible composites |
| Continuous gradient | point, aggregate bar, rect | sequential color |
| Discretized interval | point | quantize, quantile, or threshold color |
| Sampled | point, line, rule | field opacity, size, or strokeWidth |

| Axis family | Create | Edit | Editable components |
| --- | --- | --- | --- |
| Cartesian complete axis | `createXAxis` / `createYAxis` / `createAxes` | `editXAxis` / `editYAxis` | line, ticks, labels, ticksAndLabels, title, position |
| Polar complete axis | `createThetaAxis` / `createRadialAxis` / `createAxes` | `editThetaAxis` / `editRadialAxis` | line, ticks, labels, ticksAndLabels, title, angle or position |
| Parallel dimension axes | `createAxes` |  | line, ticks, labels, title from each stored dimension |
<!-- action-capabilities:summary:end -->

## Atomic relationships

Some relationships require several channels to change together. Prefer their
atomic action unless you intentionally need the lower-level steps.

| Relationship | Shortest action | What changes together | Complete example |
| --- | --- | --- | --- |
| Histogram | `encodeHistogram({ field: "value" })` | Bin x, count y, stack policy, and both scales | [Histogram recipe](../recipes/histogram.md) |
| Density | `encodeDensity({ field: "value" })` | Immutable density data, value/density positions, grouping, and area paths | [Density tutorial](../tutorials/density-area.md) |
| Horizon | `encodeHorizon({ x: "time", y: "value" })` | Signed bands, folded positions, color, and source-facing x guide | [Horizon recipe](../recipes/horizon.md) |
| Parallel coordinates | `encodeParallelCoordinates({ dimensions: ["a", "b"] })` | Ordered local scales, row paths, and dimension axes | [Parallel recipe](../recipes/parallel-coordinates.md) |

### Atomic density {#atomic-density}

`encodeDensity` derives immutable kernel-density rows and authors the value and
density positions together. It infers a Gaussian kernel, automatic bandwidth
and extent, 100 samples, and vertical density placement. `groupBy`, `kernel`,
`normalization`, categorical placement, side, and two-value split remain
available through its exact action contract.

### Atomic Horizon {#atomic-horizon}

`encodeHorizon` derives signed bands around an inferred or explicit baseline.
It accepts existing compatible x/y encodings or explicit `x` and `y`, then
owns the folded y/y2 positions and positive/negative palettes as one action.
Horizon charts intentionally keep only the source-facing x guide.

`editDensity` and `editHorizon` create immutable derived-data revisions and
rematerialize their connected scales, paths, and guides. The exact option and
error contracts live in the [Encoding Action Reference](../reference/actions/encodings.md).

## Removing an encoding

Use `removeEncoding({ channel, target? })` to remove one active assignment
without deleting its named scale, source dataset, or coordinate:

```javascript
const plainPoints = encodedPoints
  .removeEncoding({ channel: "size" })
  .removeEncoding({ channel: "color" });
```

The closed channel list is `x`, `y`, `x2`, `y2`, `xOffset`, `yOffset`,
`theta`, `radius`, `color`, `strokeDash`, `strokeWidth`, `size`, `shape`,
`group`, `opacity`, and `text`. Primary x/y removal also clears its same-mark
secondary endpoint and offset. Grouped-bar color removal clears its generated
offset, and matching legends, axes, or grids are removed only when they no
longer have a valid consumer.

The action rebuilds complete marks from an empty concrete baseline. An
incomplete mark remains empty and can be completed later by the ordinary
encoding action using the retained scale. If a stored selection directly reads
the removed semantic channel, removal fails before changing state; compatible
highlights are replayed on the rebuilt items. Use `removePathOrder()` for path
topology and the Parallel aggregate action for ordered dimensions.

## Shared inference and ordering

- `target` uses the current compatible mark, then one unique compatible mark.
- A missing Cartesian, Polar, or Parallel coordinate is created only when the
  channel family determines it unambiguously.
- Scale IDs default to the channel name; explicit IDs create independent
  resources.
- Position calls may arrive before or after a compatible mark. Incomplete
  semantic state remains invisible until the required relationship is complete.
- Layered marks reuse compatible position encodings when omitted instead of
  requiring duplicate x/y calls.
- Ambiguity produces an error instead of selecting the first resource.

## Errors and limitations

Unsupported mark/channel/field combinations fail before partial state is
authored. Removing a missing channel, an ambiguous owner, or a channel directly
referenced by a stored selection also fails atomically. Use the generated compatibility matrix above, then open the focused
family page for inference and ordering rules. If a valid action still selects
nothing, see [Troubleshooting](../troubleshooting.md#a-target-cannot-be-inferred).

## Related

[Position Encodings](./position-encodings.md) ·
[Series Encodings](./series-encodings.md) ·
[Appearance](./appearance.md) · [Scale Options](./scales.md)
