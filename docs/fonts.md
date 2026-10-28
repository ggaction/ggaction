---
layout: default
title: Fonts and Text Rendering
---

# Fonts and Text Rendering

Text uses `sans-serif` and deterministic estimated bounds by default. You can
also load explicit font bytes through `prepareFontResource`, retain them with
`createFontResource`, and prepare exact layout widths through `prepareTextMetrics`.
The application supplies loading, decoding and measurement callbacks. The
library verifies the font identity and commits the prepared result synchronously.

See the [prepared-font tutorial](./tutorials/font-assets.md) for a complete
Korean and emoji example, and [embedded-font rendering](./api/rendering.md#embedded-fonts)
for host callbacks, limits, disposal and error behavior.

## Cross-platform contract

| Concern | Behavior |
| --- | --- |
| Family | A non-empty string; an exact profile binds one explicit family/style/weight tuple to retained font bytes |
| Size | Must be a positive finite number in logical chart pixels |
| Weight | A non-empty string or finite number; numeric renderer weights are rounded to the nearest hundred and clamped to 100–900 |
| Authoring bounds | Deterministic estimates by default; an applied exact profile uses prepared widths and rejects missing queries |
| Painted glyphs | Ordinary text uses host fonts; font-bound text uses the retained bytes under a content-addressed alias |
| SVG | Embeds font-bound bytes in `@font-face`; ordinary `fontFamily` text still uses the consumer's fonts |
| Canvas, PNG, PDF | Canvas accepts a `prepareFontRendering` handle; PNG/PDF prepare retained fonts for the duration of output |

A family string alone does not embed a font. Font resources and concrete
font-bound graphics retain validated bytes for offline restoration. Renderers
use the stored lines and origins without fetching, measuring or wrapping again.

## Set text styles explicitly

Chart titles expose separate title and subtitle style objects:

```javascript
const titled = program.createTitle({
  text: "Quarterly revenue",
  subtitle: "USD millions",
  titleStyle: {
    fontFamily: "Inter, Helvetica, Arial, sans-serif",
    fontSize: 22,
    fontWeight: 600
  },
  subtitleStyle: {
    fontFamily: "Inter, Helvetica, Arial, sans-serif",
    fontSize: 14,
    fontWeight: 400
  }
});
```

Text marks and guide-specific label/title options expose their documented
font properties separately. Setting a chart title style does not create a
global theme or rewrite every axis and legend.

## Loading in browsers

For exact layout, prepare font resources on the intended immutable program,
then call `prepareTextMetrics(program, {id, fonts}, host)` and apply its handle
with `applyTextMetrics({prepared, requestToken})`. A new label that needs a
missing width fails atomically. Remove the profile, edit the label, and prepare
again; replacing a bound font prepares its new measurements before committing.

Browser Canvas also requires `prepareFontRendering(program, {register})` and
`render(program, context, {fonts})`. Release the handle with `fonts.dispose()`
when drawing has finished. The host registers exactly the supplied alias and
bytes and returns the matching identity and a disposer.

For ordinary family-based text, load web fonts before rendering so the backend can use the intended
face. Waiting for `document.fonts.ready` does not change ggaction's deterministic
text estimates into browser measurements. Rebuilding the same program with the
same styles retains those estimates. If a font arrives after drawing, rerender
explicitly to update the painted glyphs; immutable snapshots do not rerender
automatically.

```javascript
await document.fonts.ready;
const program = buildChart(rows);
render(program, context);
```

## Reproducibility checklist

- Use a complete fallback stack, not one unqualified family name.
- Install or load the approved fonts in every renderer environment.
- Render after fonts are ready and allow space for differences between
  estimated bounds and actual glyphs, especially in dense labels and legends.
- Compare text wrapping, axis labels, legends, and title bounds in browser and
  Node artifacts.
- Avoid depending on an intermediate numeric weight such as `650` remaining
  distinct; renderer normalization rounds it to a supported hundred.

## Related

[Accessibility](./accessibility.md) · [Titles](./api/titles.md) ·
[Text marks](./api/marks/text.md) · [Rendering](./api/rendering.md)
