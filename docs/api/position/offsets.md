---
layout: default
title: Ordinal Offsets
---

# Ordinal Offsets

{% include chart-example.html id="bar" %}

## At a glance

| Action | Shortest call | Required state | Result |
| --- | --- | --- | --- |
| `encodeXOffset` | `encodeXOffset({ field: "group" })` | ordinal x bar | Nominal slots inside each x band |
| `encodeYOffset` | `encodeYOffset({ field: "group" })` | ordinal y bar | Nominal slots inside each y band |

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
| `target` | aggregate bar mark ID | current mark |
| `scale.id` | scale ID | channel name: `"xOffset"` or `"yOffset"` |
| `scale.type` | `"ordinal"` | `"ordinal"` |
| `scale.domain` | `"auto"` or unique nominal values | `"auto"` |
| `scale.range` | `"auto"` or two finite numbers | `"auto"` |
| `paddingInner` | finite number from `0` inclusive to `1` exclusive | `0` |
| `paddingOuter` | non-negative finite number | `0` |

The automatic range is the parent category bandwidth, not the full plot range.
Its step divides one ordinal x or y band into equal categorical slots. Explicit domain order and
reversed ranges are supported. Inner padding reduces each slot bandwidth;
outer padding reserves step fractions before the first and after the last slot.
Calling the action again for the same field preserves omitted padding values.
This action resolves slot geometry but does not create rectangles by itself.

When grouped color already exists, direct offset calls must use the same field.
Change both fields atomically with `encodeColor({ field: next, layout: "group" })`.
That action rematerializes the matching directional offset slots, bars, and any existing
legend while preserving explicit legend titles and styles.

## Errors and limitations

`xOffset` requires one resolved ordinal x bandwidth; `yOffset` requires one
resolved ordinal y bandwidth. Color and offset domains must have identical
order before grouped rectangles can be materialized. Every consumer of one
shared offset scale must use the same padding policy and parent bandwidth.

## Related

[Ordinal bars](./ordinal-bars.md) · [Series encodings](../series-encodings.md) ·
[Constant appearance](../appearance.md)
