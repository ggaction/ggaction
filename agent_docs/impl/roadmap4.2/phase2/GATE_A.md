# Gate R42-P2-A — SVG Structure and Visual Parity

## Gate state

`ready-for-review`

## Review target

```javascript
const svg = renderToSVG(program, {
  title: "Cars regression",
  description: "Horsepower and miles per gallon with a fitted trend."
});
```

### Structural target

- Browser-safe `ggaction/svg` entry and strict declaration
- Complete SVG root with logical dimensions/viewBox
- Escaped optional title/description
- Current circle/rect/line/text/path/collection concrete schema
- Stable order, nested clip, opacity, dash and linear gradients
- Deterministic repeated output

### Visual target

Same public regression-scatterplot rendered from the same fully materialized `graphicSpec` at the same logical dimensions.
The review plate presents Browser Canvas, inline SVG, and Node PNG from left to right. Canvas and PNG use 2x backing
density for a crisp comparison. Phase 3 adds the Poppler-rendered PDF rasterization as a fourth column.

## Required evidence

- Focused/unit/contract/browser/package results
- Exact artifact paths and public call chain
- Canvas/SVG/PNG comparison image
- Remote checkpoint

## Verification evidence

- SVG serializer unit: 4/4 passed
- Public-chart SVG contract: 41/41 registered charts serialized
- Unit suite: 1305/1305 passed
- Contract suite: 157/157 passed
- Browser suite: 47/47 passed, including packed `ggaction/svg` DOM insertion
- Documentation suite: 41/41 passed
- Installed-package JavaScript/TypeScript consumer and artifact boundary: passed
- Minimal `ggaction/svg` browser bundle: 5,705 gzip bytes under the 25,000-byte budget
- Coverage: 94.66% lines, 89.99% branches, 98.44% functions; 68 critical floors passed
- `xmllint --noout` on the review SVG: passed

## Public call chain

```javascript
const program = createCarsRegressionScatterplot(cars);

render(program, canvas.getContext("2d"), { pixelRatio: 2 });
const svg = renderToSVG(program, { title, description });
await renderToPNG(program, { output, pixelRatio: 2 });
```

All three calls consume the same fully materialized `program.graphicSpec`.

## Review artifacts

- `.artifacts/test/png/review/vector-renderers/svg-parity/canvas-svg-png-comparison.png`
- `.artifacts/test/png/review/vector-renderers/svg-parity/chart.svg`
- `.artifacts/test/png/review/vector-renderers/svg-parity/chart.png`
- `.artifacts/test/png/review/vector-renderers/svg-parity/comparison.html`
- `.artifacts/test/png/review/vector-renderers/svg-parity/variant.json`

## Remote checkpoint

- Implementation and review package: `e7f8ad14`
- Branch: `codex/roadmap4-2-vector-renderers`

## Approval effect

Approval permits Phase 3 Node vector PDF implementation. It does not authorize publish, deploy, release, PR creation or
merge.

## Work blocked before approval

- `ggaction/pdf`
- PDF visual comparison
- Phase 4 closeout
