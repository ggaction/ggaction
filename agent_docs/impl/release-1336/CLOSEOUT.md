# Issue and branch closeout audit

The human explicitly authorized issue, pull-request and branch integration and cleanup.
Do not close an issue merely because related preparation or a workaround exists.

## Open issue review

| Issue | Review disposition |
|---|---|
| #220 Support opt-in Cartesian plot clipping for individual mark layers | Implemented in the integrated candidate; close only after the matching public release is verified. |
| #221 Allow explicit facet partitioning by a key produced by fold data | Implemented in the integrated candidate; close only after the matching public release is verified. |
| #222 Support a compact shared top lane for facet title, headers and endpoint labels | Implemented in the integrated candidate; close only after the matching public release is verified. |
| #223 Support opt-in axes and plot-border underlays for composited marks | Implemented in the integrated candidate; close only after the matching public release is verified. |
| #224 Align continuous-color palette descriptor types with accepted runtime count and range forms | Implemented in the integrated candidate; close only after the matching public release is verified. |
| #225 Support content-aware legend row padding and independent title-to-body spacing | Implemented in the integrated candidate; close only after the matching public release is verified. |
| #226 Range endpoint datum objects accepted by public types fail for rect marks | Implemented in the integrated candidate; close only after the matching public release is verified. |
| #227 HCL interpolation rotates toward an arbitrary hue at neutral-gray endpoints | Implemented in the integrated candidate; close only after the matching public release is verified. |
| #231 Shared facet legend inference treats continuous color and stroke as ordinal | Implemented in the integrated candidate; close only after the matching public release is verified. |
| #232 Render valid empty concrete text without rejecting mapped labels | Implemented in the integrated candidate; close only after the matching public release is verified. |
| #233 Support ordinal categorical fields in stroke-dash encodings | Implemented in the integrated candidate; close only after the matching public release is verified. |
| #234 Allow rounded-bar legend sample recipes to change through symbol editors | Implemented in the integrated candidate; close only after the matching public release is verified. |
| #235 Place inferred side legends outside occupied same-edge axes | Implemented in the integrated candidate; close only after the matching public release is verified. |
| #236 Support explicit categorical unknown colors for row-owned Cartesian lines | Implemented in the integrated candidate; close only after the matching public release is verified. |
| #237 Synchronize formatter types with grouped numbers and UTC weekdays | Implemented in the integrated candidate; close only after the matching public release is verified. |
| #238 Allow opt-in plot-last placement for high-level regression lines | Public plot-last regression placement remains unimplemented; the existing explicit regression-data/line-mark route is supported. |
| #239 Inherit fixed line stroke in categorical stroke-dash legends | Implemented in the integrated candidate; close only after the matching public release is verified. |
| #240 Add lossless aligned expansion of parallel array fields | Implemented in the integrated candidate; close only after the matching public release is verified. |
| #241 Support explicit unknown fallbacks for categorical stroke-dash scales | Implemented in the integrated candidate; close only after the matching public release is verified. |
| #242 Fix Basic field encoding scale reassignment without exposing Full editors | Implemented in the integrated candidate; close only after the matching public release is verified. |
| #243 Support bounded paths up to 30000 commands | Implemented in the integrated candidate; close only after the matching public release is verified. |
| #244 Enhancement: explicit Steffen monotone recipe for faithful source curve translation | A separately named Steffen recipe remains unimplemented; existing monotone behavior is intentionally unchanged. |
| #245 Support explicit tick values for continuous gradient legends | Implemented in the integrated candidate; close only after the matching public release is verified. |
| #246 Support quantitative color encodings on tick marks | Implemented in the integrated candidate; close only after the matching public release is verified. |
| #247 Support explicit label-title overlap for Cartesian axis titles | Implemented in the integrated candidate; close only after the matching public release is verified. |
| #248 Support direct numeric per-item offsets for independent Text marks | Implemented in the integrated candidate; close only after the matching public release is verified. |
| #249 Allow zero and negative Cubehelix lightness gamma | Implemented in the integrated candidate; close only after the matching public release is verified. |
| #250 Support explicit rotation for facet header text | Implemented in the integrated candidate; close only after the matching public release is verified. |
| #251 Support grain-preserving lookup between named datasets | Implemented in the integrated candidate; close only after the matching public release is verified. |
| #253 Support row-preserving null calendar buckets in createTimeUnitData | Opt-in null calendar buckets remain unimplemented; existing computed calendar operations are available. |
| #254 Support field titles across facet headers | Implemented in the integrated candidate; close only after the matching public release is verified. |
| #255 Support count-based automatic linear scale domains | Implemented in the integrated candidate; close only after the matching public release is verified. |
| #256 Support nearest-step automatic linear axis ticks | Implemented in the integrated candidate; close only after the matching public release is verified. |
| #257 Fix legacy editable lookup schema migration validation order | Implemented in the integrated candidate; close only after the matching public release is verified. |
| #258 Support independently packed wrapped facet bounds and shared footer axes | Pure flow and native measurement preparation exist; public full-bounds flow and shared footer ownership are not integrated. |
| #259 Support opt-in gaps for missing coordinates in direct Cartesian line marks | Implemented in the integrated candidate; close only after the matching public release is verified. |
| #260 Support per-axis tick-step numeric label precision | Implemented in the integrated candidate; close only after the matching public release is verified. |
| #261 Support opt-in facet headers anchored to concrete mark content | Implemented in the integrated candidate; close only after the matching public release is verified. |
| #262 Support explicit simple polygon point shapes across marks, scales and guides | Implemented in the integrated candidate; close only after the matching public release is verified. |

## Independent branches and pull requests

- The batch fixes and independent axis/editor/scene branch are merged with both sets of regression controls retained.
- The documentation signature keyboard branch is integrated separately and receives the full built-site keyboard/accessibility harness.
- Dependency PR #252 updates the existing Hono lockfile dependency; preserve its pull-request identity and rerun its existing checks.
- Historical fix/proposal branches are reviewed against current runtime, declarations, contracts and regression controls. Already incorporated branches must not be replayed over newer implementations.
- Before removing an obsolete remote head that is not an ancestor of the integrated main commit, retain its exact original head under an annotated archival tag. Local worktrees and local branches are preserved.
- Refresh remote heads immediately before cleanup. Any unexpected newly changed branch remains intact for separate review.

## Historical capability coverage

| Historical branch family | Current behavior retained |
|---|---|
| area-fill-paint | Area and error-band fill paints, sample paints and persistence |
| computed-path-replace-curve | Nested scalar getPath, literal replacement and bounded curve commands |
| inferred-axis-title-font-bounds | Measured title font bounds and inferred placement |
| legend-gradient-opacity | Gradient opacity, independent block placement, Cartesian frame offsets and label alignment |
| sampled-color-legend | Continuous symbols, title alignment, computed floor and exponential regression |
| translation-axis-along-offset | Along-edge tick/label offsets and typed tick label color maps |
| translation-gradient-fill | Preserved unnamed raw columns and existing gradient fill behavior |
| proposal axis-title-along-offset | Stored alongOffset in complete/focused Cartesian axis title editing |
| proposal bounded-summary-output | Explicit bounded summary group capacity |
| proposal gradient-layout-direction-bottom-title | Independent legend layout/direction and bottom title placement |
| proposal independent-axis-guides | Named independent Cartesian axis owners |
| proposal merged-quantitative-legend | Explicit joint color-size legends |
| proposal point-wedge-bar-blend | Wedge shapes and opt-in difference compositing |
| proposal facet-shared-legend-placement | Shared placement and one-time symbol layer opacity |

Actual merge, release, issue closure and branch archival links are recorded after the corresponding operations succeed. This audit is not itself publication evidence.
