---
layout: default
title: Position Encodings
---

# Position Encodings

Choose the position family from the semantic mark and field relationship. All
position actions infer the current mark, use or create a Cartesian coordinate,
resolve a channel scale, and explicitly materialize the affected graphics.

## Choose an encoding

| Goal | Required state | Actions | Detailed page |
| --- | --- | --- | --- |
| Position points | point mark, quantitative, temporal, or ordinal fields | `encodeX`, `encodeY` | [Quantitative positions](./position/quantitative.md) |
| Draw an aggregate time series | line mark, temporal x and quantitative y | `encodeX`, `encodeY` | [Temporal lines](./position/temporal.md) |
| Build vertical aggregate bars | bar mark, ordinal/temporal x and quantitative y | `encodeX`, `encodeY` | [Bar positions](./position/ordinal-bars.md) |
| Build horizontal aggregate bars | bar mark, quantitative x and ordinal/temporal y | `encodeX`, `encodeY` | [Bar positions](./position/ordinal-bars.md) |
| Bin and count values | bar mark, quantitative field | `encodeHistogram` or `encodeX` + `encodeY` | [Histograms](./position/histogram.md) |
| Estimate a distribution | area mark, quantitative field | `encodeDensity` | [Encodings](./encodings.md#atomic-density) |
| Draw full-span or bounded rules | rule mark, field or datum endpoints | `encodeX`, `encodeY`, `encodeX2`, `encodeY2` | [Rule endpoints](#rule-endpoints) |
| Control within-band grouping | complete ordinal-bar positions | `encodeXOffset` | [Offsets](./position/offsets.md) |

For ordinary grouped bar charts, prefer
`encodeColor({ field, layout: "group" })`; it calls the advanced xOffset action
for the same field.

## Shared inference

- `target` defaults to the current compatible mark.
- `coordinate` uses the layer coordinate, then the documented `main`
  Cartesian default.
- Scale IDs default to their channel names: `x`, `y`, and `xOffset`.
- Automatic continuous y ranges run bottom-to-top. Discrete y positions run
  top-to-bottom so horizontal categories follow domain order.
- Temporal values accept finite timestamps, four-digit numeric/string years,
  and valid date strings. Four-digit values are interpreted as UTC years.
- Ambiguous resources produce an error instead of an arbitrary selection.

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
