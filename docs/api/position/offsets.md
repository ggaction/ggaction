---
layout: default
title: Ordinal Offsets
---

# Ordinal Offsets

## At a glance

| Action | Shortest call | Required state | Result |
| --- | --- | --- | --- |
| `encodeXOffset` | `encodeXOffset({ field: "group" })` | ordinal x bar | Nominal slots inside each x band |

Most chart authors should use:

```javascript
program.encodeColor({ field: "sex", layout: "group" });
```

That action calls `encodeXOffset` as a wrapped child with the same field.

## Advanced `encodeXOffset(options)`

| Option | Type | Default |
| --- | --- | --- |
| `field` | non-empty string | required |
| `fieldType` | `"nominal"` | `"nominal"` |
| `target` | aggregate bar mark ID | current mark |
| `scale.id` | scale ID | `"xOffset"` |
| `scale.type` | `"ordinal"` | `"ordinal"` |
| `scale.domain` | `"auto"` or unique nominal values | `"auto"` |
| `scale.range` | `"auto"` or two finite numbers | `"auto"` |
| `paddingInner` | finite number from `0` inclusive to `1` exclusive | `0` |
| `paddingOuter` | non-negative finite number | `0` |

The automatic range is `[0, x.bandwidth]`, not the full plot range. Its step
divides one ordinal x band into equal nominal slots. Explicit domain order and
reversed ranges are supported. Inner padding reduces each slot bandwidth;
outer padding reserves step fractions before the first and after the last slot.
Calling the action again for the same field preserves omitted padding values.
This action resolves slot geometry but does not create rectangles by itself.

When grouped color already exists, direct xOffset calls must use the same field.
Change both fields atomically with `encodeColor({ field: next, layout: "group" })`.
That action rematerializes the matching xOffset slots, bars, and any existing
legend while preserving explicit legend titles and styles.

## Errors and limitations

xOffset requires one resolved ordinal x bandwidth. Color and xOffset domains
must have identical order before grouped rectangles can be materialized. Every
consumer of one shared xOffset scale must use the same padding policy.

## Related

[Ordinal bars](./ordinal-bars.md) · [Series encodings](../series-encodings.md) ·
[Constant appearance](../appearance.md)
