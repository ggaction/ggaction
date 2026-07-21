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
| `encodeX` | point, line, area, bar, rect, rule, text | point/bar/rect/rule/text: quantitative, temporal, ordinal, nominal; line/area: quantitative, temporal | field; rule also accepts datum; bar accepts aggregate or bin |
| `encodeY` | point, line, area, bar, rect, rule, text | point/line/bar/rect/rule/text: quantitative, temporal, ordinal, nominal; area: quantitative, temporal | field; rule also accepts datum; bar accepts aggregate or count |
| `encodeX2` / `encodeY2` | area, ranged bar, rect, rule | area/ranged bar/rect/rule: matching primary | secondary field; rule also accepts datum |
| `encodeTheta` | point, line, arc | point/line: quantitative, temporal, ordinal, nominal; arc: ordinal, nominal | arc accepts aggregate: count or weighted sum for proportional sectors |
| `encodeR` | point, line, arc | point/line/arc: quantitative | radial position; arc combines it with a categorical theta band |
| `encodeParallelCoordinates` | line | line: quantitative, ordinal | atomic ordered dimensions; one namespaced scale and axis per dimension |
<!-- action-capabilities:position:end -->

## Choose an encoding

| Goal | Required state | Actions | Detailed page |
| --- | --- | --- | --- |
| Position points | point mark, quantitative, temporal, or ordinal fields | `encodeX`, `encodeY` | [Quantitative positions](./position/quantitative.md) |
| Position Polar points | point mark, angle field and quantitative radius field | `encodeTheta`, `encodeR` | [Polar point tutorial](../tutorials/polar-points.md) |
| Draw Polar lines or radar paths | line mark, angle field and quantitative radius field | `encodeTheta`, `encodeR` | [Polar line tutorial](../tutorials/polar-lines.md) |
| Draw donuts, rose charts, or radial bars | arc mark, categorical count/weighted-sum theta or quantitative radius | `encodeTheta`, optional `encodeR` | [Polar arc tutorial](../tutorials/polar-arcs.md) |
| Draw discrete or ranged cells | rect mark, two discrete positions or complete x/x2 and y/y2 pairs | `encodeX`, `encodeY`, optional `encodeX2`, `encodeY2` | [Rect marks](./marks/rect.md) |
| Draw an aggregate time series | line mark, temporal x and quantitative y | `encodeX`, `encodeY` | [Temporal lines](./position/temporal.md) |
| Build vertical aggregate bars | bar mark, ordinal/temporal x and quantitative y | `encodeX`, `encodeY` | [Bar positions](./position/ordinal-bars.md) |
| Build horizontal aggregate bars | bar mark, quantitative x and ordinal/temporal y | `encodeX`, `encodeY` | [Bar positions](./position/ordinal-bars.md) |
| Bin and count values | bar mark, quantitative field | `encodeHistogram` or `encodeX` + `encodeY` | [Histograms](./position/histogram.md) |
| Estimate a distribution | area mark, quantitative field | `encodeDensity` | [Encodings](./encodings.md#atomic-density) |
| Draw full-span or bounded rules | rule mark, field or datum endpoints | `encodeX`, `encodeY`, `encodeX2`, `encodeY2` | [Rule endpoints](#rule-endpoints) |
| Control within-band grouping | complete ordinal-bar positions | `encodeXOffset`, `encodeYOffset` | [Offsets](./position/offsets.md) |

For ordinary grouped bar charts, prefer
`encodeColor({ field, layout: "group" })`; it calls the matching advanced
directional offset action for the same field.

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
or nominal fields. Arc marks accept nominal or ordinal theta; `aggregate:
"count"` creates count-proportional sectors. `aggregate: "sum"` plus a
non-negative finite `weight` field creates weighted proportional sectors.
Categorical theta plus quantitative `encodeR` creates radial sectors.
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

## Rule endpoints

Rule positions use the same `encodeX` and `encodeY` actions with an explicit
`fieldType`, but accept exactly one of `field` or `datum`:

```javascript
program
  .createRuleMark()
  .encodeX({ datum: 15, fieldType: "quantitative" })
  .encodeY({ datum: 20, fieldType: "quantitative" })
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
