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

The automatic range is `[0, x.bandwidth]`, not the full plot range. Its step
divides one ordinal x band into equal nominal slots. Explicit domain order and
reversed ranges are supported. This action resolves slot geometry but does not
create rectangles by itself.

## Errors and limitations

xOffset requires one resolved ordinal x bandwidth. Color and xOffset domains
must have identical order before grouped rectangles can be materialized.

## Related

[Ordinal bars](./ordinal-bars.md) · [Series encodings](../series-encodings.md) ·
[Constant appearance](../appearance.md)
