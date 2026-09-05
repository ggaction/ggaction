---
layout: default
title: Position Encodings
---

# Position Encodings

{% include chart-example.html id="scatterplot" %}

Choose the position family from the semantic mark and field relationship. All
position actions infer the current mark, use or create a compatible coordinate,
resolve a channel scale, and explicitly materialize the affected graphics.

## Supported marks and modes

<!-- action-capabilities:position:start -->
| Action | Supported marks | Field types | Important modes |
| --- | --- | --- | --- |
| `encodeX` | point, line, area, bar, rect, rule, tick, text | point/bar/rect/rule/tick/text: quantitative, temporal, ordinal, nominal; line/area: quantitative, temporal | field; rule, area, and rect also accept datum; bar accepts aggregate or bin |
| `encodeY` | point, line, area, bar, rect, rule, tick, text | point/line/bar/rect/rule/tick/text: quantitative, temporal, ordinal, nominal; area: quantitative, temporal | field; rule, area, and rect also accept datum; bar accepts aggregate or count |
| `encodeX2` / `encodeY2` | area, ranged bar, rect, rule | area/ranged bar/rect/rule: matching primary | secondary field; rule, area, and rect also accept datum |
| `encodeTheta` | point, line, arc | point/line: quantitative, temporal, ordinal, nominal; arc: quantitative, ordinal, nominal | arc maps direct quantitative values, category counts, or category-weighted sums to proportional sectors |
| `encodeR` | point, line, arc | point/line/arc: quantitative | radial position; arc combines it with a categorical theta band |
| `encodeParallelCoordinates` | line | line: quantitative, ordinal | atomic ordered dimensions; one namespaced scale and axis per dimension |
<!-- action-capabilities:position:end -->

## Choose an encoding

| Goal | Required state | Actions | Detailed page |
| --- | --- | --- | --- |
| Position points | point mark, quantitative, temporal, or ordinal fields | `encodeX`, `encodeY` | [Quantitative positions](./position/quantitative.md) |
| Position Polar points | point mark, angle field and quantitative radius field | `encodeTheta`, `encodeR` | [Polar point tutorial](../tutorials/polar-points.md) |
| Draw Polar lines or radar paths | line mark, angle field and quantitative radius field | `encodeTheta`, `encodeR` | [Polar line tutorial](../tutorials/polar-lines.md) |
| Draw pies, donuts, rose charts, or radial bars | arc mark, direct quantitative theta, categorical count/weighted-sum theta, or quantitative radius | `encodeTheta`, optional `encodeR` | [Polar arc tutorial](../tutorials/polar-arcs.md) |
| Draw cells or interval shading | rect mark, band positions, paired endpoints, or one plot-spanning interval | `encodeX`, `encodeY`, optional `encodeX2`, `encodeY2` | [Rect marks](./marks/rect.md) |
| Draw an aggregate time series | line mark, temporal x and quantitative y | `encodeX`, `encodeY` | [Temporal lines](./position/temporal.md) |
| Build vertical aggregate bars | bar mark, ordinal/temporal x and quantitative y | `encodeX`, `encodeY` | [Bar positions](./position/ordinal-bars.md) |
| Build horizontal aggregate bars | bar mark, quantitative x and ordinal/temporal y | `encodeX`, `encodeY` | [Bar positions](./position/ordinal-bars.md) |
| Order categorical positions | nominal/ordinal x, y, or theta | `orderCategories`, `removeCategoryOrder` | [Category ordering](./position/category-ordering.md) |
| Bin and count values | bar mark, quantitative field | `encodeHistogram` or `encodeX` + `encodeY` | [Histograms](./position/histogram.md) |
| Estimate a distribution | area mark, quantitative field | `encodeDensity` | [Encodings](./encodings.md#atomic-density) |
| Center aligned area series | area mark, quantitative/temporal x, non-negative quantitative y, nominal group | `encodeY({ stack: "center" })` or `encodeColor({ layout: "center" })` | [Color encoding](./series/color.md#center-stacked-areas) |
| Draw full-span or bounded rules | rule mark, field or datum endpoints | `encodeX`, `encodeY`, `encodeX2`, `encodeY2` | [Rule endpoints](#rule-endpoints) |
| Control within-category grouping | categorical bar, point, or rule position | `encodeXOffset`, `encodeYOffset` | [Offsets](./position/offsets.md) |

For ordinary grouped bar charts, prefer
`encodeColor({ field, layout: "group" })`; it calls the matching advanced
directional offset action for the same field.

For a center-stacked area, each group must have exactly one non-negative value
at every x position. `encodeY({ stack: "center" })` preserves the original y
field and creates concrete lower/upper area boundaries around zero. The
equivalent `encodeColor({ layout: "center" })` also creates the matching nominal
group when it is absent. Center stacking is not supported for bars, ranged
areas, signed values, duplicate group/x rows, or missing positions.

## Shared inference

- `target` defaults to the current compatible mark.
- `coordinate` uses the layer coordinate, then the documented `main`
  Cartesian or `polar` Polar default for the requested channel family.
- Scale IDs default to their channel names: `x`, `y`, `theta`, `radius`, `xOffset`, and `yOffset`.
- Automatic continuous y ranges run bottom-to-top. Discrete y positions run
  top-to-bottom so horizontal categories follow domain order.
- Temporal values accept finite timestamps, four-digit numeric/string years,
  and valid date strings. Four-digit values are interpreted as UTC years.
- Ambiguous resources produce an error instead of an arbitrary selection.

## Polar positions

```javascript
program
  .encodeTheta({ field: "angle" })
  .encodeR({ field: "distance" })
  .encodePointRadius({ value: 3 });
```

`encodeTheta` accepts point or line marks with quantitative, temporal, ordinal,
or nominal fields. For an arc mark, an aggregate-free quantitative field makes
one proportional sector per positive source row. `aggregate: "count"` over a
nominal or ordinal field creates count-proportional sectors. `aggregate: "sum"`
plus a non-negative finite `weight` field creates category-weighted
proportional sectors. Categorical theta plus quantitative `encodeR` creates
radial sectors; direct quantitative arc theta does not combine with `encodeR`.
Quantitative angle scales are linear; temporal angles use time scales; discrete
angles use point or band scales. The automatic range is `[0, 360]` degrees with
0 at 12 o'clock and clockwise positive direction.

`encodeR` accepts a quantitative field and linear, log, pow, sqrt, or symlog
scale policies. Its automatic range fits the smaller plot dimension. Explicit
ranges are non-negative logical pixels and must fit the current plot bounds.

The two actions are order-independent. One Polar channel may exist as an
incomplete semantic assignment, but points or paths become visible only after
both channels and their scales resolve. A line may use
`createLineMark({ closed: true })` for a closed radar path. Cartesian x/y and
Polar theta/radius cannot be mixed on one layer.

## Measured radial sectors

On an Arc mark with categorical theta, `encodeR` can aggregate a measure per
category and encode either annular area or radial length. This fragment assumes
`program` already has data with `category` and non-negative numeric `value` fields:

```javascript
program
  .createArcMark({ innerRadius: 0.5 })
  .encodeTheta({ field: "category", fieldType: "nominal" })
  .encodeR({ field: "value", aggregate: "sum", mapping: "area" })
  .createRadialAxis();
```

Use `mapping: "radius-length"` to make length from the inner edge proportional
to the aggregate. Use `{ aggregate: "count", mapping: "area" }` without a field
to count rows per category. Both modes use equal-angle sectors and a zero-based
linear scale. Zero categories remain in categorical domains but draw no sector.
Negative, nonfinite, all-zero, and unrepresentable positive-thickness inputs are errors.

The radial axis shows count or sum units with the same mapping as the sectors.
An explicit radius range `[inner, outer]` defines the hole and must agree with
an explicitly specified Arc innerRadius ratio. These modes require zero theta
padding and `padAngle: 0`; `nice: true`, `zero: false`, and `reverse: true` are errors.

Reassigning `encodeR` preserves omitted mapping and aggregate. To change the
mapping on a shared measured scale, use `editScale({ id, radialMapping: "area" })`;
all its compatible sectors and radial guides update together. Ordinary point
radius and measured Arc radius require separate scales.

## Rule endpoints

Rule positions use the same `encodeX` and `encodeY` actions and accept exactly
one of `field` or `datum`. Datum-only rules infer finite numbers as quantitative
and other supported scalar values as nominal. Field rules, temporal data, and
ambiguous values require an explicit `fieldType`:

```javascript
program
  .createRuleMark()
  .encodeX({ datum: 15 })
  .encodeY({ datum: 20 })
  .encodeY2({ datum: 80, fieldType: "quantitative" });
```

`encodeX2` and rule `encodeY2` require their corresponding primary endpoint
and share its scale, coordinate, and field type. `x` alone draws a vertical
full-span rule; `y` alone draws a horizontal full-span rule. `x+y+y2` and
`y+x+x2` draw bounded intervals, while all four endpoints draw a diagonal.
Calling the same action again replaces only that endpoint.

## Related

[Encodings](./encodings.md) · [Scale options](./scales.md) ·
[Coordinates](./coordinates.md) · [Series encodings](./series-encodings.md)

## Area bounds

Area `encodeXRange` and `encodeYRange` accept a field name or `{ datum: number }`
for each bound, with at least one field. Bounds retain their order even when they cross.
The two endpoints share one scale; reassignment validates the final pair and scale together.
`encodeX2` and `encodeY2` accept quantitative datum bounds without an explicit fieldType.
Use a finite, nonzero baseline for log scales.
