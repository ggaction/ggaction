# Structured fill paint for area marks

## Status

- [x] Existing public API rejection reproduced without changing runtime code
- [x] Concrete API, persisted state, materialization, compatibility and verification plan
- [x] Source-gradient structure and synthetic target recorded without viewing chart pixels
- [x] Explicit user approval of the public contract — see `APPROVAL.md`
- [x] Implementation and consumer-matrix verification

Gate: **approved**. The user approved the exact proposal; the implementation and consumer-matrix evidence are recorded in `IMPLEMENTATION.md`. Root `AGENTS.md` requires explicit approval before an unresolved material public-API decision. PR creation, package publishing and documentation deployment are outside this proposal.

## Problem and current evidence

Area marks accept only a nonempty string for `fill`, while the existing `FillPaint` contract already supports a string or structured linear gradient for other filled marks. The public `editAreaMark({fill: paint})` and `createAreaPlot({x, y, area:{fill: paint}})` calls both reject the same existing gradient value with `Area fill must be a non-empty string.` The executable reproduction and exact failures are in `reproduce.mjs` and `rejection-evidence.json`; failed calls leave the earlier immutable program unchanged.

The affected reference uses an opaque white-to-orange vertical gradient with area opacity 0.7 and a separately painted orange line. A solid orange area is not equivalent. The line must remain a separate semantic layer using existing public line actions; this proposal does not add an overlay option or change area stroke semantics. `source-evidence.json` binds the frozen reference/raw/compiled/SVG files and its actual gradient and path structure. No chart pixels were inspected.

## Proposed public contract

Widen the existing **area `fill` property only** from `string` to the already defined `FillPaint` type on `createAreaMark`, `editAreaMark`, and the `area` appearance object forwarded by area-producing chart facades. This includes the existing area plot/ribbon and area-backed consumers wherever they forward the same appearance contract; enumerate each affected type and avoid a separate incompatible paint shape. No new action, parameter, gradient kind or renderer entry point is introduced.

```js
// Proposed flow: complete chart first, then one focused paint edit.
const program = chart()
  .createCanvas({width: 240, height: 160, margin: 20})
  .createData({values: [{x:0,y:1},{x:1,y:3},{x:2,y:2}]})
  .createAreaPlot({x:'x', y:'y', guides:false})
  .editAreaMark({
    fill: {
      type:'linear-gradient',
      from:{x:0,y:1},
      to:{x:0,y:0},
      stops:[{offset:0,color:'white'},{offset:1,color:'#fc6721'}]
    },
    opacity:0.7
  });
```

`from` and `to` are the existing normalized coordinates in the bounds of each concrete painted path, matching existing `FillPaint` behavior. Stops retain the existing ordered unit-interval offsets and color strings. Existing grammar validation rejects malformed objects, unknown keys/types, invalid coordinates, equal endpoints, fewer than two stops, invalid offsets and unsorted stops. Do not invent CSS-gradient strings, image fills, numeric-color parsers, or a second gradient schema.

## State and explicit materialization

The owning area mark appearance stores a cloned/frozen structured `FillPaint` through the existing mark configuration/state path. The concrete area paths receive the same validated paint in backend-neutral `graphicSpec`. Renderer code reads only that fully materialized state; no renderer may inspect `semanticSpec` or reinterpret chart data. Reuse existing paint normalization, gradient bounds resolution and SVG/Canvas/PDF paint consumers. If an existing consumer assumes a solid color, explicitly support the existing structured paint or fail atomically rather than silently choosing a stop.

Creation, focused edit, scale/data/coordinate edits, resizing, import/export and rematerialization must preserve the paint and per-path orientation. Existing color encodings keep their documented precedence; changing a mark fallback fill must not remove an active data-driven color encoding. Removing that encoding must reveal the persisted gradient again. Existing `configureAreaStrokeFromFill` cannot reinterpret a gradient as one stroke color: preserve its current behavior for string fills and reject an incompatible structured fill atomically unless its owning existing contract already defines a structured stroke result. No new gradient-stroke API is proposed.

## Legend and other consumer behavior

Area legends without a data-driven color mapping must preserve the actual structured area paint in their existing swatch renderer. Existing data-driven categorical/continuous color legends remain unchanged and use their scale. Selection/highlight/restoration must carry the complete fill paint and retain area opacity without replacing it with one color stop. Density, violin, ribbon, horizon, stacked/grouped areas and missing-data subpaths must either forward the same valid fallback paint through their existing owner or retain an explicit incompatible-owner rejection. No whole-chart gradient spanning unrelated areas is implied.

## Compatibility and focused evidence required after approval

1. Existing string-filled area snapshots remain identical, including default fill and opacity 0.2. Earlier programs and caller-owned paint/stop arrays stay unchanged after all actions and after caller mutation.
2. Public constructor and focused-editor programs produce identical graphics for horizontal, vertical and diagonal two/multi-stop gradients, including stacked/grouped/ribbon and missing-break paths. Check gradient bounds and alpha structurally.
3. Scale/data/coordinate/resize edits, persistence round-trip, selection/highlight removal and color-encoding precedence preserve paint and trace ownership. Invalid input or incompatible stroke-from-fill must fail without partial state changes.
4. SVG native gradients and Canvas/PNG/PDF paths must consume the same backend-neutral paint. Test package-installed ESM consumers and declarations. Primitive/public structural and renderer equality tests may be synthetic; no actual translation candidate is authored by the host.
5. Verify legacy and structured legend swatches, opacity and independent line overlays. Retain full source layers and compare their actual ordered SVG paths; do not replace the overlay with a boundary stroke.
6. Update current mark/chart contracts, action cards/types, public guide/examples and generated references together; run focused regressions, full unit/contracts/docs and installed-package tests before a runtime integration checkpoint.

The synthetic `target.svg` is the independent structural target, not an output of the currently unsupported public API. It contains one gradient-filled area at opacity 0.7 plus an independent orange line. User policy prohibits chart-pixel viewing, so the target and original are inspected through SVG/DOM and paint metadata.
