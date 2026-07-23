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

## Verification evidence

- PDF adapter unit: 2/2 passed
- Public-chart PDF contract: 41/41 registered charts rendered without raster image fallback
- Unit suite: 1307/1307 passed
- Contract suite: 158/158 passed
- Browser suite: 47/47 passed; browser-safe entries remain isolated from `ggaction/pdf`
- Documentation suite: 41/41 passed
- Installed-package JavaScript/TypeScript consumer: passed with `ggaction/pdf`
- Package artifact: 398 entries, 369,623 packed bytes, 1,746,730 unpacked bytes
- Coverage: 94.66% lines, 89.97% branches, 98.45% functions; 68 critical floors passed
- Poppler `pdfinfo`: one 760×480pt page, PDF 1.4, expected title/author/subject/keywords
- `pypdf`: zero page images; extracted Displacement/Acceleration/Origin/USA/Japan text
- PDF content stream: native text `BT`/`TJ` and vector `m`/`l`/`c` operators present
- `pdftoppm -png -r 144 -singlefile`: passed and visually inspected

## Public call chain

```javascript
const program = createCarsRegressionScatterplot(cars);

render(program, canvas.getContext("2d"), { pixelRatio: 2 });
const svg = renderToSVG(program, { title, description });
await renderToPNG(program, { output: pngOutput, pixelRatio: 2 });
await renderToPDF(program, {
  output: pdfOutput,
  metadata: {
    title,
    author: "ggaction",
    subject: "Renderer parity",
    keywords: ["cars", "regression"]
  }
});
```

The PDF column is the latest `chart.pdf` rasterized with
`pdftoppm -png -r 144 -singlefile chart.pdf pdf`. All four renderers consume the
same fully materialized `program.graphicSpec`.

## Review artifacts

- `.artifacts/test/png/review/vector-renderers/pdf-parity/canvas-svg-png-pdf-comparison.png`
- `.artifacts/test/png/review/vector-renderers/pdf-parity/chart.pdf`
- `.artifacts/test/png/review/vector-renderers/pdf-parity/pdf.png`
- `.artifacts/test/png/review/vector-renderers/pdf-parity/chart.svg`
- `.artifacts/test/png/review/vector-renderers/pdf-parity/chart.png`
- `.artifacts/test/png/review/vector-renderers/pdf-parity/comparison.html`
- `.artifacts/test/png/review/vector-renderers/pdf-parity/pdf-verification.json`
- `.artifacts/test/png/review/vector-renderers/pdf-parity/extracted-text.txt`
- `.artifacts/test/png/review/vector-renderers/pdf-parity/variant.json`

## Approval effect

Approval permits Phase 4 parity/distribution closeout. It does not authorize publish, deploy, release, PR creation or
merge.

## Work blocked before approval

- Full renderer consumer-matrix closeout
- Roadmap completion
