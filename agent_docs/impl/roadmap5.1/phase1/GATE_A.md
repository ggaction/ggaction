# Gate R51-P1-A — Right/Left Shared Legend Lane

## Gate state

`ready-for-review`

## Approval target

- Approved Phase 0 visuals and exact column/gap coordinates reproduced by public runtime actions
- Right and left same-edge blocks use one deterministic lane owner
- Combined same-target and independent-target blocks share stable ordering and non-overlap
- Create/edit/remove, Canvas and scale changes converge without stale sibling geometry
- Insufficient side margin fails atomically without Canvas growth, relocation or hidden content
- Canvas/SVG/PNG/PDF consume the same final concrete coordinates

## Approval effect

Approval permits Phase 2 top/bottom lane and broader lifecycle implementation. It does not authorize PR creation,
merge, release, publish or documentation deployment.

## Remote checkpoint

- Implementation checkpoint: `450092da` (`origin/codex/roadmap5-1-multi-legend-layout`)
- Gate record checkpoint: this document's commit on the same remote branch

## Implemented result

- Right and left lanes use one pure placement grammar and one wrapped concrete placement owner.
- Title start, symbol center and label start columns are shared across all blocks.
- Same-target categorical+size groups and independent-target blocks use deterministic layer/family ordering.
- Categorical, size, gradient, interval, opacity and stroke-width recipes participate without renderer inference.
- Single-block paths remain intrinsic; multi-block overflow fails atomically without resizing the Canvas.
- Actual Cars examples replace the synthetic two-point visual and use the full public action flow.

## Verification

- `npm test`: 2,028 passed
- `npm run test:coverage`: passed
- `npm run test:docs`: 45 passed
- `npm run test:gates`: 4 passed
- `node scripts/run-tests.js render test/gates/multi-legend-layout`: 4 passed
- Package artifact: 412 entries, 382,951 packed bytes, 1,809,835 unpacked bytes
- Render parity: Canvas, SVG, PNG and PDF consume the same final `graphicSpec` coordinates

## Review artifacts

- `.artifacts/test/png/review/multi-legend-layout/cars-combined-right-lane/primitive.png`
- `.artifacts/test/png/review/multi-legend-layout/cars-color-size-opacity-stack/primitive.png`
