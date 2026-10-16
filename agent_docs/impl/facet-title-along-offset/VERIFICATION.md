# Facet parent title displacement

This corrects the existing `alongOffset` option and existing title Canvas-fit contract. It introduces no public option, default, persisted shape, or renderer behavior. The baseline is `02661f6607e964cca7f158524e93ade5861a63a7`.

The facet materializer now adds the resolved signed offset to its translated child-plot alignment anchor for every painted title and subtitle line. Actual occupied text bounds must fit the composed Canvas. Previously ignored offsets now move the text, and previously accepted overflowing facet titles fail atomically. Valid omitted-offset output remains unchanged.

## Verification

- Focused title/facet tests: 7 passed, covering signed offsets/all alignments, multiline title/subtitle, creation/edit/promotion convergence, grouped row/column and side headers, layout/scales/guides replay, persistence, unit behavior, invalid input, overflow, and previous-program immutability.
- Unit suite: 3,076 passed.
- Contract suite: 533 passed.
- Documentation suite: 120 passed.
- Installed package consumer: passed, including facet title/subtitle displacement, persistence, and overflow rejection.
- Six independent baseline comparisons (one-field/grid facets, left/center/right alignment) preserved the entire valid omitted-offset graphic and semantic snapshots exactly.
- An independent eight-row, four-panel public canary retained all panel data and all eight bar geometries/paints; `alongOffset: -20` moved both parent title anchors from x=30 to x=10. No chart pixels were inspected.
- Package: 566 entries, 794,779 packed bytes, 3,901,241 unpacked bytes. Only the unpacked cap grows by 1,000 bytes to 3,902,000; other caps remain unchanged.
- Installed browser gzip: full 390,749 bytes; Basic 189,258 bytes; SVG 7,176 bytes.

The implementation is isolated until the translation coordinator integrates the runtime and documentation checkpoint. This evidence does not claim completed corpus revalidation, publication, or deployment.
