---
layout: default
title: Scale Options
---

# Scale Options

{% include chart-example.html id="density" %}

Scales map semantic field or datum values into concrete positions and
appearance values. Encodings create compatible scales automatically; use
`editScale` when the inferred mapping needs a documented revision.

## At a glance

| Scale family | Default domain | Default range | Common controls |
| --- | --- | --- | --- |
| Continuous position | `"auto"` | Plot bounds | `type`, `nice`, `zero`, `clamp`, `reverse` |
| Band/point position | First-appearance order | Plot bounds | padding and alignment |
| Ordinal appearance/xOffset | First-appearance order | Palette, patterns, or parent band | explicit domain/range |
| Color/strokeDash | First-appearance order | Built-in palette/patterns | palette or explicit range |
| Sequential/discretized color | Type-specific numeric boundaries | `viridis` or explicit colors | `interpolate`, `clamp`, `reverse` |

Encoding actions accept a nested `scale` object. Omitted properties use channel
defaults and stored program state.

Existing scales can be changed with `editScale`:

```javascript
const reversed = program.editScale({ id: "x", reverse: true });
```

Color scales can use the same top-level palette shorthand during creation and
editing. It is mutually exclusive with `range`:

```javascript
const recolored = program.editScale({ id: "color", palette: "set2" });
```

Advanced authors can create a named unattached scale with the same complete
type vocabulary:

```javascript
const program = chart().createScale({
  id: "temperature",
  type: "sequential",
  domain: [0, 100],
  palette: "viridis"
});
```

The accepted types are `linear`, `log`, `pow`, `sqrt`, `symlog`, `time`,
`band`, `point`, `ordinal`, `sequential`, `quantize`, `quantile`, and
`threshold`. A later encoding attachment validates whether the type, range,
and fallback are compatible with that channel and mark.

`id` may be omitted when the current scale or the program's only scale is
unambiguous. At least one editable option is required. Use `"auto"` to reset
domain or range; omission preserves the current value. Quantitative position
scales can change atomically between `linear`, `log`, `pow`, `sqrt`, and
`symlog`:

```javascript
const logarithmic = program.editScale({ id: "x", type: "log", base: 10 });
```

Categorical bar positions use `band`; categorical point and rule positions use
`point`. Both preserve first-appearance domain order. A band scale exposes a
non-zero slot width and accepts `paddingInner`, `paddingOuter`, and `align`.
A point scale exposes zero bandwidth and accepts `padding` and `align`.

```javascript
program.encodeX({
  field: "country",
  fieldType: "nominal",
  scale: { type: "band", paddingInner: 0.2, paddingOuter: 0.1 }
});
```

`align` is between `0` and `1`; both padding families are non-negative and
`paddingInner` is less than `1`. `editScale` rematerializes all connected marks
and guides. A band can be shared by bars and point centers, but changing it to
`point` is rejected while a bar requires its bandwidth.

## Focused scale families

<div class="docs-entry-grid docs-entry-grid--two">
  <a href="./scales/position/"><strong>Position scales</strong><span>Linear, transformed, time, band, and point mappings.</span></a>
  <a href="./scales/ordinal-and-dash/"><strong>Ordinal and dash scales</strong><span>Stable categorical domains and stroke-dash ranges.</span></a>
  <a href="./scales/continuous-color/"><strong>Continuous color</strong><span>Named palettes and continuous quantitative color.</span></a>
  <a href="./scales/discretized-color/"><strong>Discretized color</strong><span>Quantize, quantile, and threshold classes.</span></a>
  <a href="./scales/missing-values/"><strong>Missing values</strong><span>Unknown fallbacks and compound-grain limits.</span></a>
</div>

## Errors and limitations

One scale cannot be shared across different channels. Explicit domains must
contain every observed value required by ordinal consumers. A successful edit
rematerializes connected marks and guides; a failed edit leaves the earlier
immutable program unchanged.

Scale type transitions reject incompatible field types, channels, or mark
grains before changing the immutable program. Discretized color transitions
currently require quantitative point color; sequential color supports points
and aggregate bars. An active gradient or interval legend also fixes its
current recipe family, so a transition between sequential and discretized
color is rejected instead of silently replacing the guide.

## Related

[Position encodings](./position-encodings.md) ·
[Series encodings](./series-encodings.md) · [Semantic and graphical state](../concepts/semantic-and-graphics.md) ·
[Troubleshooting](../troubleshooting.md)
