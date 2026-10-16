# Area fill-paint implementation

The approved change widens existing area fallback fills to the existing `FillPaint` value. It adds no action, gradient schema, persisted schema version or renderer inference. Public constructors, focused area edits, area/density/violin facades and interval bands forward the same cloned/frozen paint into concrete path properties. Existing string fills keep their output.

`grammar/areaPaint.js` owns the compatibility check shared by actions and snapshot import. An implicit outline from fill still requires a solid color; a gradient requires a separate explicit solid stroke. The existing rejection of a fallback-fill edit under an active color encoding remains intact. A stored gradient survives encoding changes and returns when that encoding is removed.

Categorical area swatches inherit a gradient and area opacity only when no color encoding owns the fill. Explicit symbol opacity wins. Existing color-scale legends are unchanged. An explicitly requested unsupported point-symbol gradient fails atomically; no stop is chosen as a substitute.

## Verification

- `test/unit/actions/marks/area-gradient-fill.test.js`: 10 focused tests cover constructor/editor/facade identity; horizontal, vertical and diagonal three-stop paints; CSS alpha; caller/program immutability; scale/data/coordinate/resize rematerialization; grouped/stacked/ribbon/missing-break paths; color precedence; gradient and ordinary legends; incompatible outlines; malformed input/import; highlights; full/graphic persistence; density/violin/error-band forwarding; native Canvas/PNG, SVG and PDF exports.
- `test/browser/area-fill-paint.browser.js`: Browser Canvas and browser-safe SVG independently consume identical gradient coordinates and ordered stops through public actions. It uses the shared HTTP/readiness/error harness and accessible logical Canvas. No chart pixels are inspected.
- `test/contracts/area-endpoint-types.test.js`: installed declarations accept existing `FillPaint` on the relevant owners, retain `false` removal for an interval-band fill, and reject gradient strokes and unrelated arc-fill widening.
- `scripts/package-consumer.js`: the installed ESM consumer creates a stacked area, applies the gradient with a focused edit, renders native SVG and resizes while retaining paint. The normal installed TypeScript, entry-point, optional-dependency and MCP checks remain active.
- Full unit suite: 3,000 tests. Full contract suite: 532 tests. Documentation suite: 120 tests. Package artifact and installed-consumer checks are required for this checkpoint.

## Package measurements

The dedicated private validator raises the package entry cap from 563 to 564; actual entries are 564. The final packed artifact is 791,934 bytes and unpacked content is 3,889,220 bytes, inside the existing 792,000/3,900,000-byte limits. Installed browser gzip is Full389,164 / Basic188,486 / SVG7,161 bytes. Only the Full ceiling increases from389,000 to390,000 bytes; Basic189,000 and SVG25,000 remain unchanged. The old entry and Full ceilings did not pass.

External source-evidence paths in this proposal and the parallel nested-scalar proposal use lossless UTF-8 Base64 bindings to preserve exact artifact identities while satisfying source-neutral repository terminology. Original source/data/compiled/SVG SHA values are unchanged.

No package was published, no documentation was deployed, no translation runtime pin was changed, and no chart candidate was authored by the host. Runtime integration and the held source-family translation remain separate parent-owned steps.
