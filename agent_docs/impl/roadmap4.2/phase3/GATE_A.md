# Gate R42-P3-A — PDF Vector, Text, Metadata and Visual Parity

## Gate state

`planned`

## Review target

```javascript
const result = await renderToPDF(program, {
  output: "./output/cars-regression.pdf",
  metadata: {
    title: "Cars regression",
    author: "ggaction",
    subject: "Renderer parity",
    keywords: ["cars", "regression"]
  }
});
```

### Structural target

- Node-only `ggaction/pdf` entry and strict declaration
- One vector page at logical Canvas width/height in PDF points
- Current circle/rect/line/text/path/collection concrete schema
- Authored order, nested clipping, opacity, dash and linear gradients
- Selectable/searchable text without text-to-path or raster fallback
- Optional title/author/subject/keywords metadata
- Absolute output, exact logical dimensions, `pages: 1` and byte count result

### Visual target

Same public regression-scatterplot rendered from the same fully materialized `graphicSpec`. The review plate presents
Browser Canvas, inline SVG, Node PNG, and Poppler-rasterized PDF from left to right at the same logical dimensions.

## Required evidence

- Focused/unit/contract/package results
- Page count/MediaBox, vector operators, extracted text and metadata
- Exact artifact paths and public call chain
- Canvas/SVG/PNG/PDF comparison image
- Remote checkpoint

## Approval effect

Approval permits Phase 4 parity/distribution closeout. It does not authorize publish, deploy, release, PR creation or
merge.

## Work blocked before approval

- Full renderer consumer-matrix closeout
- Roadmap completion
