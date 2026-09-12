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
| `editXOffsetScale` | `editXOffsetScale({ target: "bars", padding: 0.2 })` | existing xOffset encoding | Edit subgroup order and spacing |
| `editYOffsetScale` | `editYOffsetScale({ target: "bars", reverse: true })` | existing yOffset encoding | Edit horizontal subgroup placement |

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
| `scale.reverse` | boolean | `false` |
| `scale.padding` | finite number from `0` inclusive to `1` exclusive | omitted |
| `scale.paddingInner` | finite number from `0` inclusive to `1` exclusive | `0` |
| `scale.paddingOuter` | non-negative finite number | `0` |
| `scale.align` | finite number from `0` to `1` | `0.5` |
| `paddingInner` | finite number from `0` inclusive to `1` exclusive | `0` |
| `paddingOuter` | non-negative finite number | `0` |

The automatic range is one parent category slot, not the full plot range. Bars use
the parent band width; point and rule marks use the parent point-scale step.
The offset step divides that slot into equal categorical sub-slots. Explicit domain order and
semantic reverse are supported. Inner padding reduces each slot bandwidth;
outer padding reserves step fractions before the first and after the last slot.
Calling the action again for the same field preserves omitted padding values.
Bars use the resolved sub-band width. Point and rule rows use each sub-slot center,
which makes point-and-whisker layers share exact positions.

Spacing and alignment are stored once on the semantic offset scale. Numeric
offset entries in older mark materialization configs are migrated on the next
successful encoding or scale edit. This keeps repeated encoding, shared marks,
Canvas resize, and renderer replay on the same requested policy.

## Focused offset scale editing

```javascript
const reordered = groupedBars.editXOffsetScale({
  target: "bars",
  domain: ["women", "men"],
  paddingInner: 0.2,
  paddingOuter: 0.1,
  align: 0.5
});
```

Both focused actions require an explicit mark `target`. They accept `domain`,
`reverse`, `padding`, `paddingInner`, `paddingOuter`, and `align`. `padding`
sets both inner and outer padding and cannot be combined with either specific
padding option. The domain array is the subgroup order; there is no separate
`order` option.

The concrete offset range is always derived from the current parent slot, so
`range` and `type` are rejected. For slot size `S`, category count `n`, inner
padding `pi`, outer padding `po`, and alignment `a`, the resolved geometry is:

```text
step = S / max(1, n - pi + 2 * po)
bandwidth = abs(step) * (1 - pi)
start = (S - step * (n - pi)) * a
```

Editing one shared offset scale validates and refreshes all its consumers.
Their resolved parent slot sizes must agree.

When grouped color already exists, direct offset calls must use the same field.
Change both fields atomically with `encodeColor({ field: next, layout: "group" })`.
That action rematerializes the matching directional offset slots, bars, and any existing
legend while preserving explicit legend titles and styles.

## Errors and limitations

`xOffset` requires a categorical x parent; `yOffset` requires a categorical y
parent. Color and offset domains must have identical
order before grouped rectangles can be materialized. Every consumer of one
shared offset scale must use the same parent slot size. Conflicting legacy
mark-owned padding policies must be resolved before they can be migrated.

## Related

[Ordinal bars](./ordinal-bars.md) · [Series encodings](../series-encodings.md) ·
[Constant appearance](../appearance.md)
