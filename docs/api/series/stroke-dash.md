---
layout: default
title: Stroke-Dash Encoding
---

# Stroke-Dash Encoding

{% include chart-example.html id="line" %}

## `encodeStrokeDash(options)`

Map a nominal field to line-series or rule dash patterns, or apply one constant pattern
to every series.

```javascript
program.encodeStrokeDash({ field: "Origin" });

program.encodeStrokeDash({ value: "dotted" });
```

| Option | Type | Default |
| --- | --- | --- |
| `field` | non-empty string; mutually exclusive with `value` | — |
| `value` | named style or direct dash pattern; mutually exclusive with `field` | — |
| `target` | line or rule mark ID | current mark |
| `fieldType` | `"nominal"`; field mode only | `"nominal"` |
| `scale.id` | scale ID | `"strokeDash"` |
| `scale.type` | `"ordinal"` | `"ordinal"` |
| `scale.domain` | `"auto"` or category array | `"auto"` |
| `scale.range` | `"auto"` or named/direct pattern array | `"auto"` |

The automatic range contains ten reusable patterns. An explicit pattern is an
empty array for a solid stroke or an even-length array of non-negative finite
numbers that is not entirely zero. Named styles resolve as follows:

| Style | Concrete pattern |
| --- | --- |
| `"solid"` | `[]` |
| `"dashed"` | `[6, 4]` |
| `"dotted"` | `[1, 3]` |
| `"dashdot"` | `[6, 3, 1, 3]` |

Names remain in semantic scale state, while resolved scales and graphics store
only numeric patterns.

```javascript
program.encodeStrokeDash({
  field: "Origin",
  scale: { range: ["solid", "dashed", "dotted"] }
});
```

Calling the action again atomically replaces the earlier field or constant.
The same field reuses its current scale when `scale.id` is omitted. A different
field uses the default `strokeDash` scale unless an ID is explicit, while old
named scales remain available as resources. Existing legend domains, symbols,
and inferred titles update; custom legend settings remain unchanged.

Constant mode accepts no scale or field type. It creates no legend, removes the
stroke-dash part of an existing combined legend, and removes a dash-only legend.

If color and stroke dash encode the same field, that field appears only once in
the series key and can be represented by one combined legend. Canvas changes
explicitly rematerialize both styles.

See [Scale options](../scales.md) and [Legends](../legends.md).

## Related

[Series overview](../series-encodings.md) · [Scale options](../scales.md) · [Legends](../legends.md)
