# Gate R51-P2-A — All-Edge Legend Layout and Lifecycle

## Gate state

`ready-for-review`

## Approval target

- Horizontally disjoint top/bottom blocks share one row; only colliding occupied ranges create a new outward row
- Every shared row uses one title baseline, one graphical-element start line and a 12-pixel title-to-element gap
- Top gradient and opacity labels sit below their graphical elements, consistently with bottom legends
- Existing block-local left/center/right alignment, direction and grid remain intact
- Layer declaration and family order determine placement independently of authoring call order
- Create/edit/remove, scale and Canvas replay converge without stale sibling geometry
- Insufficient margin or Canvas space fails atomically without resizing, relocation or hidden content
- Actual-data Canvas/SVG/PNG/PDF outputs consume the same final concrete coordinates

## Approval effect

Approval permits Phase 3 integration and Roadmap closeout. It does not authorize PR creation, merge, release,
publish or documentation deployment.

## Remote checkpoint

- Replacement implementation checkpoint: `313b2c63` (`origin/codex/roadmap5-1-multi-legend-layout`)
- Gate record checkpoint: this document's commit on the same remote branch

## Implemented result

- Disjoint occupied x-ranges share the nearest row; only actual overlap creates an outward row with a 24-pixel gap.
- Every row aligns title baselines and graphical-element tops with an exact 12-pixel internal gap.
- Top and bottom gradient/opacity labels follow their graphical elements with the configured label gap.
- Block-local left/center/right alignment, direction and item grid remain unchanged.
- Categorical, gradient and opacity recipes align across top and bottom, including bordered three-family combinations.
- Layer declaration and family order produce the same coordinates regardless of authoring call order.
- Legend edit, sibling removal, scale edit and Canvas edit replay every retained block before lane placement.
- Final occupied bounds include optional backgrounds and fail atomically on Canvas or guide/title collision.
- The review chart uses 398 valid Cars rows rather than a synthetic two-point example.

## Verification

- `npm test`: 2,044 passed
- `npm run test:unit`: 1,383 passed
- `npm run test:contracts`: 161 passed
- `npm run test:coverage`: 94.75% lines, 90.18% branches, 98.5% functions; 71 critical floors passed
- `npm run test:docs`: 45 passed
- `npm run test:gates`: 6 passed
- `node scripts/run-tests.js render test/gates/multi-legend-layout`: 6 passed
- Package artifact: 412 entries, 384,793 packed bytes, 1,819,082 unpacked bytes
- Render parity: Canvas, SVG, PNG and PDF consume the same final `graphicSpec` coordinates

## Review artifact

- `.artifacts/test/png/review/multi-legend-layout/cars-top-bottom-lanes/primitive.png`
- `.artifacts/test/renderers/review/multi-legend-layout/cars-top-bottom-lanes/primitive.{svg,png,pdf}`

## Review feedback — 2026-08-03

The first Phase 2 checkpoint was rejected because horizontally separated legends were still forced into different
rows, while categorical, gradient and opacity recipes used different title and graphical-element geometry. The
replacement checkpoint now demonstrates the corrected approval target above in focused geometry tests and the
actual-data four-renderer artifact.
