# ggaction with Quarto and Observable JS

This example renders an immutable ggaction `ChartProgram` in a Quarto HTML
document and exposes its retained action trace. It imports the exact public
`ggaction@0.0.6` browser entry from jsDelivr.

The example uses ggaction's public chained API directly. It does not introduce
another chart grammar, translate a visualization specification, or define a
Quarto extension.

## Preview

Install [Quarto](https://quarto.org/docs/get-started/) and run:

```bash
cd examples/quarto-ojs
quarto preview index.qmd
```

Quarto's reactive `width` value rebuilds the immutable program when the
document layout changes. The Canvas has a text alternative, the figure exposes
its source rows in a semantic HTML table, and the action trace uses nested
keyboard-operable disclosure controls.

## Files

- `index.qmd` is the Quarto/OJS document.
- `ggaction-ojs.js` builds the program and creates the Canvas, table, and trace
  views.
- `styles.css` keeps the rendered chart and trace usable at narrow widths.

## Runtime notes

- The rendered page needs network access to load the pinned package from
  jsDelivr. Copy or self-host the dependency when an offline document is
  required.
- Resizing the page causes Quarto to re-evaluate the reactive cells. The chart
  is rebuilt from immutable values, but an expanded data-table disclosure may
  return to its collapsed state.
- Action traces can retain arguments and source data. Review a trace before
  publishing it when working with sensitive datasets.
