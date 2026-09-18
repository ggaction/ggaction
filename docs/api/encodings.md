---
layout: default
title: Encodings
---

# Encodings

{% include chart-example.html id="regression" lead=true %}

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
| `encodeX` | point, line, area, bar, rect, rule, tick, text | point/line/area/bar/rect/rule/tick/text: quantitative, temporal, ordinal, nominal | field; rule, area, rect, and independent text also accept datum; bar accepts aggregate or bin |
| `encodeY` | point, line, area, bar, rect, rule, tick, text | point/line/area/bar/rect/rule/tick/text: quantitative, temporal, ordinal, nominal | field; rule, area, rect, and independent text also accept datum; bar accepts aggregate or count |
| `encodeX2` / `encodeY2` | area, ranged bar, rect, rule | area/ranged bar/rect/rule: matching primary | secondary field; rule, area, and rect also accept datum |
| `encodeTheta` | point, line, arc | point/line: quantitative, temporal, ordinal, nominal; arc: quantitative, ordinal, nominal | arc maps direct quantitative values, category counts, or category-weighted sums to proportional sectors |
| `encodeR` | point, line, arc | point/line/arc: quantitative | radial position; arc combines it with a categorical theta band |
| `encodeParallelCoordinates` | line | line: quantitative, ordinal | atomic ordered dimensions; one namespaced scale and axis per dimension |

### Color channels

| Mode | Supported marks | Field types | Important options |
| --- | --- | --- | --- |
| Categorical | point, line, area, bar, rect, arc, text | point/line/area/bar/rect/arc/text: nominal, ordinal | bar/area layout; arc overlay; palette and ordinal scale |
| Continuous | point, aggregate bar, rect, text | point/rect/text: quantitative, temporal; aggregate bar: quantitative | sequential scale; aggregate required for a different bar measure |
| Discretized continuous | point, aggregate bar, rect, text | point/aggregate bar/rect/text: quantitative | quantize, quantile, or threshold scale |

### Independent stroke channel

| Mode | Supported marks | Field types | Scale and grain constraints |
| --- | --- | --- | --- |
| Constant | point, line, area, bar, rect, arc, rule, tick | point/line/area/bar/rect/arc/rule/tick: constant color or supported reset | Independent from fill/color; no scale; field-to-constant removes the stroke legend |
| Categorical | point, line, area, bar, rect, arc, rule, tick | point/line/area/bar/rect/arc/rule/tick: nominal, ordinal | ordinal scale; one unambiguous value per final item; Line/Area values must be constant within each series |
| Continuous | point, line, area, bar, rect, arc, rule, tick | point/line/area/bar/rect/arc/rule/tick: quantitative, temporal | sequential scale; no aggregate option; unknown fallback is row-owned Point only; series and final-item uniqueness still apply |
| Discretized continuous | point, line, area, bar, rect, arc, rule, tick | point/line/area/bar/rect/arc/rule/tick: quantitative | quantize, quantile, threshold; same final-item and series constraints |

### Other appearance channels

| Action | Marks | Field types | Scale family | Item grain and units |
| --- | --- | --- | --- | --- |
| `encodeSize` | point | quantitative | linear, log, sqrt, pow, quantize, quantile, threshold | row-owned point; range values are areas; remove explicit radius first |
| `encodeShape` | point | nominal | ordinal | row-owned point; conflicts with explicit constant shape |
| `encodeOpacity` | point, line, rule | quantitative or constant | linear for field; none for constant | point/rule item or complete line series; values within one series must agree |
| `encodeStrokeWidth` | line, rule | quantitative or constant | linear, log, sqrt, pow, symlog for field; none for constant | complete line series or rule item; width in logical pixels |
| `encodeStrokeDash` | line, rule | nominal or constant | ordinal for field; none for constant | complete line series or rule item; series values must agree |
| `encodeAngle` | point, tick | quantitative or constant | none | item; clockwise degrees; circles retain the angle as a visual no-op |
| `encodePointRadius` / `encodeRadius` | point | constant | none | glyph radius in logical pixels; independent from Polar position r |
| `encodeBarWidth` | bar | constant band fraction or pixels | parent category band or temporal/quantitative slot | aggregate or ranged bar; histogram bins own their width |

### Selection and guides

| Action | Supported marks | Grain | Result |
| --- | --- | --- | --- |
| `selectMarks` / `highlightMarks` | point, bar, line, area, rect, arc, rule, tick | item; stacked bars also support stack | selection intent and mark-specific durable emphasis |

| Legend family | Supported marks | Channels |
| --- | --- | --- |
| Categorical color/shape/dash | point, line, area, bar, rect, arc, text | ordinal color; point shape; line strokeDash; compatible composites follow family constraints |
| Categorical stroke | point, line, area, bar, rect, arc, rule, tick | ordinal stroke; final-item or series identities |
| Continuous color gradient | point, aggregate bar, rect, text | sequential color; gradient swatch, no symbol recipe |
| Continuous stroke gradient | point, line, area, bar, rect, arc, rule, tick | sequential stroke; separate gradient, no symbol recipe |
| Discretized color interval | point, aggregate bar, rect | quantize/quantile/threshold color; rectangle swatches |
| Discretized stroke interval | point, line, area, bar, rect, arc, rule, tick | quantize/quantile/threshold stroke; outline-colored interval symbols |
| Size | point | size; continuous numeric samples or every discrete interval; point glyph symbol |
| Opacity | point, line | quantitative opacity samples; representative point symbol even for line consumers; Rule opacity has no legend |
| Stroke width | line, rule | quantitative strokeWidth samples; line symbol |

| Axis family | Create | Edit | Editable components |
| --- | --- | --- | --- |
| Cartesian complete axis | `createXAxis` / `createYAxis` / `createAxes` | `editXAxis` / `editYAxis` | line, ticks, labels, ticksAndLabels, title, position |
| Polar complete axis | `createThetaAxis` / `createRadialAxis` / `createAxes` | `editThetaAxis` / `editRadialAxis` | line, ticks, labels, ticksAndLabels, title, radial angle and radial title position |
| Parallel dimension axes | `createAxes` / `createParallelAxes` / `createParallelAxis` | `editParallelAxis` / `removeParallelAxis` / `removeParallelAxes` | line, ticks, labels, title from each stored dimension |

<!-- action-capabilities:summary:end -->

## Direction

`encodeAngle` rotates point and Tick glyphs with finite direct degrees. It
accepts either one constant `value` or one quantitative `field`; it does not
create a scale or legend. `0` points up and positive values rotate clockwise.

<!-- snippet-context:start -->

> **Contextual fragment.** Use an ES module with the imports, data, and prepared resource state described in this section. Resource selectors used here: `target: "ticks"`. Resolve these names from setup in this fragment or section; alternatives branch from the same base.

<!-- snippet-context:end -->

```javascript
const directional = chart()
  .createCanvas({ width: 640, height: 360 })
  .createData({ values: directions })
  .createTickMark({ id: "ticks", length: 14 })
  .encodeX({ target: "ticks", field: "x" })
  .encodeY({ target: "ticks", field: "y" })
  .encodeAngle({ target: "ticks", field: "direction" });
```

Calling `encodeAngle` again replaces the complete constant/field assignment.
Use `removeEncoding({ target: "ticks", channel: "angle" })` to restore the
unrotated vertical baseline. Tick length and point area remain unchanged.

## Atomic relationships

Some relationships require several channels to change together. Prefer their
atomic action unless you intentionally need the lower-level steps.

| Relationship | Shortest action | What changes together | Complete example |
| --- | --- | --- | --- |
| One mark, several encodings | `encodeChannels({ target: "points", channels: { x: { field: "b" }, y: { field: "a" } } })` | The final channel set, shared scales, marks, dependent labels, and legends | [Encoding action reference](../reference/actions/encodings.md#encodechannels) |
| Histogram | `encodeHistogram({ field: "value" })` | Bin x, count y, stack policy, and both scales | [Histogram recipe](../recipes/histogram.md) |
| Density | `encodeDensity({ field: "value" })` | Immutable density data, value/density positions, grouping, and area paths | [Density tutorial](../tutorials/density-area.md) |
| Horizon | `encodeHorizon({ x: "time", y: "value" })` | Signed bands, folded positions, color, and source-facing x guide | [Horizon recipe](../recipes/horizon.md) |
| Parallel coordinates | `encodeParallelCoordinates({ dimensions: ["a", "b"] })` | Ordered local scales, row paths, and dimension axes | [Parallel recipe](../recipes/parallel-coordinates.md) |

`encodeChannels` is the Full-only advanced action for a final-state change on
one explicit mark. Its `channels` object accepts x/y and secondary positions,
Polar theta/r, offsets, grouping and path order, appearance, angle, and text.
Each nested payload is the corresponding focused action payload without
`target` or `coordinate`. Use `scale.id` inside a payload to share a named
scale. The request is atomic: one invalid field or incompatible shared-scale
definition leaves the earlier program unchanged, and omitted channels remain
unchanged. A Cartesian axis rebound across categorical and continuous scale
families keeps its style and title while its coupled default ticks and labels
switch to final-domain values or count mode. An incompatible explicit guide or
grid rejects the whole request without changing the earlier program.

### Atomic density {#atomic-density}

`encodeDensity` derives immutable kernel-density rows and authors the value and
density positions together. It infers a Gaussian kernel, automatic bandwidth
and extent, 100 samples, and vertical density placement. `groupBy`, `kernel`,
`normalization`, categorical placement, side, and two-value split remain
available through its exact action contract.
`steps` is at most 10,000, the complete grouped output is at most 10,000 rows,
and density work is limited to 10,000,000 source-row/sample units.

### Atomic Horizon {#atomic-horizon}

`encodeHorizon` derives signed bands around an inferred or explicit baseline.
It accepts existing compatible x/y encodings or explicit `x` and `y`, then
owns the folded y/y2 positions and positive/negative palettes as one action.
Horizon charts intentionally keep only the source-facing x guide.
`bands` is at most 10,000 and the complete run-by-band output is limited to
10,000 rows; unrepresentable signed deviations or fold extents are rejected.

`editDensity` and `editHorizon` create immutable derived-data revisions and
rematerialize their connected scales, paths, and guides. Density edits can
also replace `source`, `field`, or `groupBy`; `groupBy: false` removes grouping
while retaining output field names, density channel, coordinate, and position
scale IDs. The exact option and error contracts live in the
[Encoding Action Reference](../reference/actions/encodings.md).

## Removing an encoding

Use `removeEncoding({ channel, target? })` to remove one active assignment
without deleting its named scale, source dataset, or coordinate:

<!-- snippet-context:start -->

> **Contextual fragment.** Use an ES module with the imports, data, and prepared resource state described in this section. Resolve these names from setup in this fragment or section; alternatives branch from the same base.

<!-- snippet-context:end -->

```javascript
const plainPoints = encodedPoints
  .removeEncoding({ channel: "size" })
  .removeEncoding({ channel: "color" });
```

The closed channel list is `x`, `y`, `x2`, `y2`, `xOffset`, `yOffset`,
`theta`, `radius`, `color`, `stroke`, `strokeDash`, `strokeWidth`, `size`, `shape`,
`angle`, `group`, `opacity`, and `text`. Primary x/y removal also clears its same-mark
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

## Explicit grouping and time inputs

`createRegression`, `encodeDensity` and `encodeHorizon` accept `groupBy: false`
for a JSON-safe ungrouped result. Regression omission infers one color/shape
field; Density omission stays ungrouped; Horizon omission infers stored group.
Their editors preserve omitted grouping, reject explicit undefined and clear it
with false. `"auto"` remains a literal field name.

Temporal bindings accept `temporalUnit: "auto" | "year" | "timestamp"`; see
[temporal inputs](./position/temporal.md#explicit-input-units). The option changes
input interpretation without modifying raw rows or the existing mean Bar and
nominal numeric color defaults.

## Related

[Position Encodings](./position-encodings.md) ·
[Series Encodings](./series-encodings.md) ·
[Appearance](./appearance.md) · [Scale Options](./scales.md)
