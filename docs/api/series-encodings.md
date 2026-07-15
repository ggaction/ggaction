---
layout: default
title: Series Encodings
---

# Series Encodings

## At a glance

| Action | Shortest call | Inference/defaults | Result |
| --- | --- | --- | --- |
| `encodeColor` | `encodeColor({ field: "group" })` | Current mark, nominal field type, color scale | Semantic grouping and concrete color |
| `encodeStrokeDash` | `encodeStrokeDash({ field: "group" })` | Current line mark and dash scale | Field-driven or constant concrete dash |

## `encodeColor(options)`

Map a nominal field to point fills, line-series strokes, area fills, or bar
fills. Line and bar materializers may use the field for their own grouping
policy. Area color must match an existing `encodeGroup` field.

| Option | Type | Default |
| --- | --- | --- |
| `field` | non-empty string | required |
| `target` | point, line, area, or bar mark ID | current mark |
| `fieldType` | `"nominal"` | `"nominal"` |
| `layout` | `"stack"`, `"fill"`, `"group"`, `"overlay"`, or `"diverging"` | mark policy |
| `scale.id` | scale ID | `"color"` |
| `scale.type` | `"ordinal"` | `"ordinal"` |
| `scale.domain` | `"auto"` or category array | `"auto"` |
| `scale.range` | `"auto"`, color array, or palette descriptor | `"auto"` |
| `scale.palette` | palette name or `{ name, count?, extent? }` | omitted |

```javascript
program.encodeColor({
  field: "Origin",
  scale: { palette: "tableau10" }
});
```

`scale.palette` is the concise form of
`scale.range: { palette: "tableau10" }`. Do not provide both. Automatic domains
preserve first-appearance order.

Calling `encodeColor` again for the same target replaces the nominal field.
Without `scale.id`, the current color scale is reused and its domain, marks,
and existing legend are recomputed. An explicit new ID retains the previous
named scale. Inferred legend titles follow the new field; explicit titles and
legend appearance remain unchanged.

Named palettes use a frozen 68-name vocabulary. Categorical palettes keep their
native order; `count` selects or deterministically cycles colors. Continuous,
diverging, and cyclical palettes are sampled to the domain size unless `count`
is supplied, and accept an optional two-value `extent` within `[0, 1]`.

```javascript
program.encodeColor({
  field: "Origin",
  scale: { palette: { name: "set2", count: 3 } }
});
```

See [Scale options](./scales.md#named-palettes) for the complete vocabulary.

For an ordinal-x mean bar, `layout: "group"` is the default. It keeps
`y.stack = null`, invokes `encodeXOffset` with the same field, and recomputes
the y domain from one mean per x/color cell. Color and xOffset scales are fully
resolved, while concrete rects wait for bar width.

```javascript
groupedBars.encodeColor({
  field: "sex",
  layout: "group",
  scale: { palette: "tableau10" }
});
```

Calling grouped color again with a new nominal field atomically updates color
and xOffset to one matching first-appearance domain. Existing legends are
rematerialized; inferred titles follow the field while explicit titles and
styles remain unchanged.

On a complete histogram, `encodeColor` rematerializes each non-empty bin as
zero-stacked category rects. Stack and fill order follow the resolved color
domain. The y scale continues to use each bin's total count, and an explicit
domain must contain every observed category.

```javascript
histogram.encodeColor({
  field: "Origin",
  layout: "stack",
  scale: {
    domain: ["USA", "Europe", "Japan"],
    palette: "tableau10"
  }
});
```

Histogram color defaults to `stack`. `fill` normalizes every non-negative bin
partition to one and uses `[0, 1]` as the automatic y domain. `group` places
series side by side within each bin, `overlay` draws them in color-domain order
without changing opacity, and `diverging` accumulates positive and negative
values independently around zero. Ordinal aggregate bars support the same five
values; call `encodeBarWidth` after color.

```javascript
histogram.encodeColor({ field: "Origin", layout: "fill" });
```

On an area mark, color never creates grouping implicitly. Author grouping
directly or through `encodeDensity({ groupBy })`, then encode that same field:

```javascript
densityArea.encodeColor({
  field: "Origin",
  layout: "overlay",
  scale: { palette: "tableau10" }
});
```

Area layouts support `stack`, `fill`, `overlay`, and `diverging`; `group` is
bar-only. Each existing path receives the resolved color for its group. Path order,
color domain order, and later legend order share the same ordered categories;
Canvas and shared-scale changes rematerialize every affected area fill.
Once a color layout exists, changing it to another layout is rejected until a
future companion-cleanup contract is implemented; the earlier program remains
unchanged.

## `encodeStrokeDash(options)`

Map a nominal field to line-series dash patterns, or apply one constant pattern
to every series.

```javascript
program.encodeStrokeDash({ field: "Origin" });

program.encodeStrokeDash({ value: "dotted" });
```

| Option | Type | Default |
| --- | --- | --- |
| `field` | non-empty string; mutually exclusive with `value` | — |
| `value` | named style or direct dash pattern; mutually exclusive with `field` | — |
| `target` | line mark ID | current mark |
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

See [Scale options](./scales.md) and [Legends](./legends.md).

## Errors and limitations

Series fields must be nominal. Area color must match its group encoding. Line
group, color, and field-driven stroke dash must use one compatible field.
Combined line legends also require matching ordered domains.

## Related

[Scale options](./scales.md) · [Legends](./legends.md) ·
[Position encodings](./position-encodings.md)
