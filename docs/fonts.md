---
layout: default
title: Fonts and Text Rendering
---

# Fonts and Text Rendering

ggaction stores a CSS-style `fontFamily` string in concrete text graphics and
passes it to the selected rendering backend. The default family is
`sans-serif`. ggaction does not bundle a font or expose a font-loading or
registration API, so the browser, operating system, and native renderer decide
which installed face satisfies that family.

## Cross-platform contract

| Concern | Behavior |
| --- | --- |
| Family | Must be a non-empty string; availability is controlled by the host/backend |
| Size | Must be a positive finite number in logical chart pixels |
| Weight | A non-empty string or finite number; numeric renderer weights are rounded to the nearest hundred and clamped to 100–900 |
| Authoring bounds | Deterministic estimates from text, size, and broad family/weight factors; no backend `measureText` call |
| Painted glyphs | The host/backend resolves the actual face; its glyph widths can differ from the estimated bounds |
| SVG | Emits `font-family`, `font-size`, and normalized `font-weight`; the consumer still resolves the font |
| Canvas, PNG, PDF | Draw through the Canvas-compatible backend with the resolved host/native font |

SVG markup referencing a family is not proof that the font is embedded.
Likewise, PDF metadata is not a font-embedding control. Qualify the final file
in the deployment environment when exact typography is a product requirement.

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

Load required web fonts before rendering so the backend can use the intended
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
