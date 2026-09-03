---
layout: default
title: Ordinal Offsets
---

# Ordinal Offsets

{% include chart-example.html id="bar" %}

## At a glance

| Action | Shortest call | Required state | Result |
| --- | --- | --- | --- |
| `encodeXOffset` | `encodeXOffset({ field: "group" })` | categorical x on bar, point, or rule | Nominal slots inside each x category |
| `encodeYOffset` | `encodeYOffset({ field: "group" })` | categorical y on bar, point, or rule | Nominal slots inside each y category |

Most chart authors should use:

```javascript
program.encodeColor({ field: "sex", layout: "group" });
```

That action calls `encodeXOffset` for a vertical bar or `encodeYOffset` for a
horizontal bar as a wrapped child with the same field.

## Advanced `encodeXOffset(options)` and `encodeYOffset(options)`

| Option | Type | Default |
| --- | --- | --- |
| `field` | non-empty string | required |
| `fieldType` | `"nominal"` or `"ordinal"` | `"nominal"` |
| `target` | bar, point, or rule mark ID | current eligible mark |
| `scale.id` | scale ID | channel name: `"xOffset"` or `"yOffset"` |
| `scale.type` | `"ordinal"` | `"ordinal"` |
| `scale.domain` | `"auto"` or unique nominal values | `"auto"` |
| `scale.range` | `"auto"` or two finite numbers | `"auto"` |
| `paddingInner` | finite number from `0` inclusive to `1` exclusive | `0` |
| `paddingOuter` | non-negative finite number | `0` |

The automatic range is one parent category slot, not the full plot range. Bars use
the parent band width; point and rule marks use the parent point-scale step.
The offset step divides that slot into equal categorical sub-slots. Explicit domain order and
reversed ranges are supported. Inner padding reduces each slot bandwidth;
outer padding reserves step fractions before the first and after the last slot.
Calling the action again for the same field preserves omitted padding values.
Bars use the resolved sub-band width. Point and rule rows use each sub-slot center,
which makes point-and-whisker layers share exact positions.

When grouped color already exists, direct offset calls must use the same field.
Change both fields atomically with `encodeColor({ field: next, layout: "group" })`.
That action rematerializes the matching directional offset slots, bars, and any existing
legend while preserving explicit legend titles and styles.

## Errors and limitations

`xOffset` requires a categorical x parent; `yOffset` requires a categorical y
parent. Color and offset domains must have identical
order before grouped rectangles can be materialized. Every consumer of one
shared offset scale must use the same padding policy and parent slot size.

## Related

[Ordinal bars](./ordinal-bars.md) · [Series encodings](../series-encodings.md) ·
[Constant appearance](../appearance.md)
