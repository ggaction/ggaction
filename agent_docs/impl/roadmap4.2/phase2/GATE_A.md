# Gate R42-P2-A — SVG Structure and Visual Parity

## Gate state

`planned`

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

Same public regression-scatterplot rendered as SVG and PNG at the same logical dimensions. The review plate presents SVG
on the left and PNG on the right. Phase 3 adds the PDF rasterization as a third column.

## Required evidence

- Focused/unit/contract/browser/package results
- Exact artifact paths and public call chain
- SVG/PNG comparison image
- Remote checkpoint

## Approval effect

Approval permits Phase 3 Node vector PDF implementation. It does not authorize publish, deploy, release, PR creation or
merge.

## Work blocked before approval

- `ggaction/pdf`
- PDF visual comparison
- Phase 4 closeout
