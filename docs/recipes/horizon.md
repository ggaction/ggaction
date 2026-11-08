---
layout: default
title: Horizon Chart Recipe
---

# Horizon Chart Recipe

{% include chart-example.html id="horizon" lead=true %}

## Minimal flow

{% include runnable-recipe-note.html %}

<!-- snippet-context:start -->

> **Runnable complete example.** Use the Getting Started browser project with a canvas whose id is chart, and serve gapminder.json from the site root.

<!-- snippet-context:end -->

```javascript
import { chart, render } from "ggaction";

const gapminder = await fetch("/gapminder.json").then(response => response.json());
const values = gapminder.filter(row => row.country === "Kenya");

const program = chart()
  .createCanvas({ margin: { top: 60, right: 60, bottom: 90, left: 60 } })
  .createData({ values })
  .createAreaMark({ curve: "monotone" })
  .encodeHorizon({ x: "year", y: "life_expect" })
  .createGuides();

render(program, document.querySelector("#chart").getContext("2d"));
```

## You must decide

`values` contains finite numeric `value` and ordered numeric or ISO-date
`time` values, with one observation per time. For example, use monthly dates
such as `"2024-01-01"`. The bottom margin accommodates their automatic labels.

- The ordered quantitative or temporal x field
- The quantitative y field
- A baseline when zero is not meaningful

## The library infers

- The current area target and source dataset when unambiguous
- Three bands, shared automatic extent, and blue/red palettes
- Immutable namespaced output data and ordinary closed path graphics
- An x axis and x grid, without a misleading folded y axis or band legend

Use `editHorizon({ bands, baseline, extent, palette })` to create a revised
immutable result. Use `resolve: "independent"` only when group-local amplitude
comparison is intentional.

## Continue

[Horizon tutorial](../tutorials/horizon.md) ·
[Encodings](../api/encodings.md#atomic-horizon) ·
[Area marks](../api/marks/line-area.md)
