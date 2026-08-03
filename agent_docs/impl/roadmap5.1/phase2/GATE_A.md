# Gate R51-P2-A — All-Edge Legend Layout and Lifecycle

## Gate state

`ready-for-review`

## Approval target

- Top and bottom same-edge blocks stack away from the plot with at least 24 logical pixels between occupied bounds
- Existing block-local left/center/right alignment, direction, grid and title placement remain intact
- Layer declaration and family order determine placement independently of authoring call order
- Create/edit/remove, scale and Canvas replay converge without stale sibling geometry
- Insufficient margin or Canvas space fails atomically without resizing, relocation or hidden content
- Actual-data Canvas/SVG/PNG/PDF outputs consume the same final concrete coordinates

## Approval effect

Approval permits Phase 3 integration and Roadmap closeout. It does not authorize PR creation, merge, release,
publish or documentation deployment.

## Remote checkpoint

- Implementation checkpoint: `482fe739` (`origin/codex/roadmap5-1-multi-legend-layout`)
- Gate record checkpoint: this document's commit on the same remote branch

## Implemented result

- Top keeps the first stable block nearest the plot and moves later blocks upward; bottom moves them downward.
- Block-local left/center/right alignment, direction, item grid and title placement remain unchanged.
- Categorical, gradient and opacity horizontal recipes share the same lane when two or more occupy one edge.
- Layer declaration and family order produce the same coordinates regardless of authoring call order.
- Legend edit, sibling removal, scale edit and Canvas edit replay every retained block before lane placement.
- Final occupied bounds include optional backgrounds and fail atomically on Canvas or guide/title collision.
- The review chart uses 398 valid Cars rows rather than a synthetic two-point example.

## Verification

- `npm test`: 2,042 passed
- `npm run test:coverage`: passed
- `npm run test:docs`: 45 passed
- `npm run test:gates`: 6 passed
- `node scripts/run-tests.js render test/gates/multi-legend-layout`: 6 passed
- Package artifact: 412 entries, 383,788 packed bytes, 1,814,495 unpacked bytes
- Render parity: Canvas, SVG, PNG and PDF consume the same final `graphicSpec` coordinates

## Review artifact

- `.artifacts/test/png/review/multi-legend-layout/cars-top-bottom-lanes/primitive.png`
