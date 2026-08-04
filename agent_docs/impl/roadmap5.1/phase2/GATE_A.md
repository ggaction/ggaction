# Gate R51-P2-A — All-Edge Legend Layout and Lifecycle

## Gate state

`changes-requested`

## Approval target

- Multi-legend top/bottom rows start at the plot's left edge and place blocks consecutively in stable order
- Adjacent blocks keep 40 logical pixels between occupied bounds; width overflow alone creates a new outward row
- Every shared row uses one title baseline, one graphical-element start line and a 12-pixel title-to-element gap
- `titlePosition: "left"` creates one title → symbol → label line for categorical and continuous blocks
- Top gradient and opacity labels sit below their graphical elements, consistently with bottom legends
- Multi-legend placement ignores block-level absolute `align`; single legends retain existing left/center/right behavior
- Existing block-local direction and grid remain intact
- Layer declaration and family order determine placement independently of authoring call order
- Create/edit/remove, scale and Canvas replay converge without stale sibling geometry
- Insufficient margin or Canvas space fails atomically without resizing, relocation or hidden content
- Actual-data Canvas/SVG/PNG/PDF outputs consume the same final concrete coordinates

## Approval effect

Approval permits Phase 3 integration and Roadmap closeout. It does not authorize PR creation, merge, release,
publish or documentation deployment.

## Remote checkpoint

- Replacement implementation checkpoint: `257fc895` (`origin/codex/roadmap5-1-multi-legend-layout`)
- Gate record checkpoint: this document's commit on the same remote branch

## Implemented result

- Every multi-legend top/bottom row starts at the plot's left edge and places blocks consecutively in stable order.
- Adjacent final occupied bounds keep exactly 24 logical pixels; only plot-width exhaustion creates an outward row.
- Every wrapped row restarts at the plot's left edge, while a block wider than the plot fails atomically.
- Every row aligns title baselines and graphical-element tops with an exact 12-pixel internal gap.
- Top and bottom gradient/opacity labels follow their graphical elements with the configured label gap.
- Multi-legend rows ignore block-local absolute alignment; single legends preserve their existing alignment behavior.
- Block-local direction and item grid remain unchanged.
- Categorical, gradient and opacity recipes align across top and bottom, including bordered three-family combinations.
- Layer declaration and family order produce the same coordinates regardless of authoring call order.
- Legend edit, sibling removal, scale edit and Canvas edit replay every retained block before lane placement.
- Final occupied bounds include optional backgrounds and fail atomically on Canvas or guide/title collision.
- The review chart uses 398 valid Cars rows rather than a synthetic two-point example.

## Verification

- `npm test`: 2,045 passed
- `npm run test:contracts`: 161 passed
- `npm run test:coverage`: 94.76% lines, 90.16% branches, 98.5% functions; 71 critical floors passed
- `npm run test:docs`: 45 passed
- `npm run test:gates`: 6 passed
- `node scripts/run-tests.js render test/gates/multi-legend-layout`: 6 passed
- Package artifact: 412 entries, 384,914 packed bytes, 1,819,873 unpacked bytes
- Render parity: Canvas, SVG, PNG and PDF consume the same final `graphicSpec` coordinates

## Review artifact

- `.artifacts/test/png/review/multi-legend-layout/cars-top-bottom-lanes/primitive.png`
- `.artifacts/test/renderers/review/multi-legend-layout/cars-top-bottom-lanes/primitive.{svg,png,pdf}`

## Review feedback — 2026-08-03

The first Phase 2 checkpoint was rejected because horizontally separated legends were still forced into different
rows, while categorical, gradient and opacity recipes used different title and graphical-element geometry. The
replacement checkpoint now demonstrates the corrected approval target above in focused geometry tests and the
actual-data four-renderer artifact.

## Review feedback — 2026-08-04

The replacement checkpoint was rejected because preserving each block's absolute `align` pushed the two Cars
legends to opposite ends of the plot. Checkpoint `257fc895` now left-packs every multi-legend row in stable order,
uses exactly 24 pixels between final occupied bounds and wraps only when the available plot width is exhausted.

## Review feedback — spacing and title flow — 2026-08-04

The left-packed checkpoint remains unapproved because 24 pixels reads as a collision minimum rather than a clear
separation between legend blocks. The revision must compare 24, 32 and 40-pixel occupied-bound gaps on the same
actual Cars chart before choosing a default. It must also compare the current title-above grammar with a true inline
`title -> graphical element -> label` flow. The inline target must apply consistently to categorical and continuous
legend families; the current categorical-only `titlePosition: "left"` behavior is not sufficient for a mixed lane.

The comparison is primitive review evidence only. Selecting the inline target would require an explicit public-contract
decision for continuous `titlePosition: "left"`; selecting an adjustable inter-block gap would require a distinct option
because existing `itemGap` owns spacing inside one block.

The follow-up comparison holds the 40-pixel block gap and inline titles constant, then isolates continuous label flow:
the first candidate retains numeric labels below their sampled symbols, while the second places each symbol and numeric
label side by side on the common reading line. Both candidates remain primitive targets until one is approved.

## Revision visual target approval — 2026-08-04

User approved the fully inline candidate with a fixed 40-pixel inter-block gap. The implementation must preserve the
existing title-above grammar by default and activate the title → symbol → label reading line only for
`titlePosition: "left"`. Continuous labels use 8 pixels after their symbol and 20 pixels before the next sample.
This approval authorizes the corresponding public-contract implementation and evidence update, but R51-P2-A remains
`changes-requested` until the runtime replacement checkpoint is complete and separately approved.
