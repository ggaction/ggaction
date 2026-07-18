---
layout: default
title: Color Encoding
---

# Color Encoding

{% include chart-example.html id="line" %}

## `encodeColor(options)`

Map a nominal or ordinal field to point fills, line-series strokes, area fills,
or bar fills. Ordinal fields may contain ordered numeric categories such as
engine cylinder counts. Quantitative or temporal point fields use continuous or discretized
color scales. Aggregate bars additionally support one aggregate quantitative
color value per final rectangle. Line and categorical bar materializers may use
the field for grouping. Area color must match an existing `encodeGroup` field.

| Option | Type | Default |
| --- | --- | --- |
| `field` | non-empty string | required |
| `target` | point, line, area, or bar mark ID | current mark |
| `fieldType` | `"nominal"`, `"ordinal"`, `"quantitative"`, or `"temporal"` | `"nominal"` |
| `aggregate` | aggregate operation; quantitative aggregate bars only | matching measure aggregate |
| `layout` | `"stack"`, `"fill"`, `"group"`, `"overlay"`, or `"diverging"` | mark policy |
| `palette` | palette name or `{ name, count?, extent? }`; shorthand for `scale.palette` | omitted |
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

Top-level `palette` is a shorthand for `scale.palette`, and `scale.palette` is the
concise form of `scale.range: { palette: "tableau10" }`. Provide only one of these
forms. Automatic domains preserve first-appearance order.

Use `fieldType: "ordinal"` when the values are ordered categories rather than
continuous magnitudes. They still receive discrete palette colors and legend
entries:

```javascript
program.encodeColor({
  field: "Cylinders",
  fieldType: "ordinal",
  scale: { palette: "reds" }
});
```

Calling `encodeColor` again for the same target replaces the categorical field.
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

See [continuous color scales](../scales/continuous-color.md#named-palettes) for the complete vocabulary.

For an ordinal-category mean bar, `layout: "group"` is the default. It keeps
the measure stack null, invokes `encodeXOffset` for vertical bars or
`encodeYOffset` for horizontal bars, and recomputes the measure domain from
zero and one mean per category/color cell. Negative and positive bars therefore
extend in opposite directions from the same zero baseline. Color and offset
scales are fully resolved, and concrete rects use the implicit `0.72` band width immediately.

```javascript
groupedBars.encodeColor({
  field: "sex",
  layout: "group",
  scale: { palette: "tableau10" }
});
```

Calling grouped color again with a new categorical field atomically updates color
and the directional offset to one matching first-appearance domain. Existing legends are
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
values; their group and overlay layouts use zero as each rectangle's start
endpoint and reject explicit measure domains that exclude zero. Call
`encodeBarWidth` after color only when the implicit `0.72` width is not desired.

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

### Continuous aggregate-bar color

For an aggregate bar, continuous color is computed at the same final category
grain as the rectangle. When the color field matches the quantitative measure,
omitting `aggregate` inherits that measure aggregate:

```javascript
bars
  .encodeY({ field: "population", aggregate: "sum", stack: null })
  .encodeColor({
    field: "population",
    fieldType: "quantitative",
    scale: { type: "sequential", palette: "viridis" }
  });
```

If color uses a different field, its aggregate is required because multiple
source rows cannot be chosen arbitrarily for one final rectangle:

```javascript
bars.encodeColor({
  field: "lifeExpectancy",
  fieldType: "quantitative",
  aggregate: "mean",
  scale: { type: "sequential", palette: "viridis" }
});
```

The resolved color domain contains the per-rectangle aggregate values.
`createLegend({ channels: ["color"] })` creates a gradient legend, and
`editScale({ id: "color", reverse: true })` rematerializes both bar fills and
the gradient without changing geometry. Continuous bar color rejects
`layout`; histogram, ranged-bar, line-path, and area-path continuous color are
not part of this contract.

## Related

[Series overview](../series-encodings.md) · [Scale options](../scales.md) · [Legends](../legends.md)
