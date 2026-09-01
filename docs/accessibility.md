---
layout: default
title: Accessibility
---

# Accessibility

ggaction produces static chart graphics. Accessibility therefore has two
parts: author a chart whose meaning is not carried by color alone, then give
the rendered output an accessible name, description, and non-visual
alternative in the host application. Rendering does not add keyboard
interaction, focus targets, live tooltips, or a data table automatically.

## Output contract

| Output | What ggaction provides | What the host must provide |
| --- | --- | --- |
| SVG | Escaped `<title>` and `<desc>` elements through renderer options | Meaningful text, safe placement, and a table or prose alternative when needed |
| Canvas | Concrete pixels and deterministic geometry | `role`, accessible name, fallback content, and any keyboard interaction outside ggaction |
| PNG | A static image file | Alt text and surrounding explanation where the image is embedded |
| PDF | Vector chart content and document metadata | Reading-order review and an accessible alternative; ggaction does not claim tagged-PDF semantics |

## Accessible SVG

The SVG renderer accepts concrete title and description strings. They are
escaped before insertion. `resourceNamespace` prevents gradient and clipping
IDs from colliding when identical charts appear more than once in a document.

```javascript
import { renderToSVG } from "ggaction/svg";

const svg = renderToSVG(program, {
  title: "Monthly orders by region",
  description: "Three lines compare North, South, and West from January through June.",
  resourceNamespace: "ordersByRegion"
});

document.querySelector("#chart-output").innerHTML = svg;
```

This fragment continues from a completed `program` and a trusted application
container. Do not use the chart title as the only description: explain the
comparison, units, time range, and important pattern in language appropriate
to the task.

## Accessible Canvas

Canvas pixels have no chart semantics. Put the accessible contract on the
host element and provide fallback content that remains useful if the pixels
cannot be perceived.

```html
<figure>
  <canvas
    id="orders-chart"
    role="img"
    aria-label="Monthly orders by region; West rises from 120 to 210 orders."
  >
    Monthly orders by region. A table follows the chart.
  </canvas>
  <figcaption>Monthly orders by region, January–June.</figcaption>
  <table id="orders-table"><!-- the same values in reading order --></table>
</figure>
```

```javascript
import { render } from "ggaction";

const context = document.querySelector("#orders-chart").getContext("2d");
render(program, context);
```

If an application adds its own pointer or keyboard controls, it owns focus
order, state announcements, and equivalent keyboard operation. The current
ggaction contract is static and does not supply those behaviors.

## Authoring checks

- Pair color with shape, dash, direct labels, position, or explicit text when
  categories must remain distinguishable.
- Use a palette with sufficient contrast against the chart background and
  between adjacent marks. Validate the final rendered output, not only source
  color strings.
- Give axes and legends meaningful titles with units. Avoid unexplained
  abbreviations in labels and descriptions.
- Preserve a deterministic row order in the alternative table and include the
  exact values needed to verify the visual conclusion.
- Do not call a static selection or highlight “interactive.” Stored ggaction
  selections are authoring state, not focusable controls.

## Related

[Rendering](./api/rendering.md) · [Fonts and text](./fonts.md) ·
[Supported features](./supported-features.md)
