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
| Position points | point mark, quantitative fields | `encodeX`, `encodeY` | [Quantitative positions](./position/quantitative.md) |
| Draw an aggregate time series | line mark, temporal x and quantitative y | `encodeX`, `encodeY` | [Temporal lines](./position/temporal.md) |
| Build aggregate bars | bar mark, ordinal x and quantitative y | `encodeX`, `encodeY` | [Ordinal bars](./position/ordinal-bars.md) |
| Bin and count values | bar mark, quantitative field | `encodeHistogram` or `encodeX` + `encodeY` | [Histograms](./position/histogram.md) |
| Control within-band grouping | complete ordinal-bar positions | `encodeXOffset` | [Offsets](./position/offsets.md) |

For ordinary grouped bar charts, prefer
`encodeColor({ field, layout: "group" })`; it calls the advanced xOffset action
for the same field.

## Shared inference

- `target` defaults to the current compatible mark.
- `coordinate` uses the layer coordinate, then the documented `main`
  Cartesian default.
- Scale IDs default to their channel names: `x`, `y`, and `xOffset`.
- Automatic positional ranges use current plot bounds; y runs bottom-to-top.
- Ambiguous resources produce an error instead of an arbitrary selection.

## Related

[Encodings](./encodings.md) · [Scale options](./scales.md) ·
[Coordinates](./coordinates.md) · [Series encodings](./series-encodings.md)
