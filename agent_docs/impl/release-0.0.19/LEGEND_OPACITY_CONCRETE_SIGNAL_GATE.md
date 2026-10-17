# Gate: explicit legend-layer opacity in concrete graphics

Status: ready-for-review; not implemented. This document does not change
any approved default or expand the public API by itself. This is not a new visual
target: the proposed concrete signal preserves the already approved whole-glyph
opacity appearance.

## Why an explicit signal is necessary

Approved #208 applies a supplied recipe-layer opacity once to the whole glyph
(fill plus stroke), while omission retains its historical output. A supplied
`opacity: 0.7` and a historical fallback opacity of 0.7 otherwise produce the
same concrete number. A renderer cannot infer their different source ownership.
Drawing the two paints with globalAlpha0.7 separately is incorrect in their
intersection. Changing that legacy path globally would violate default parity.

## Recommended narrow addition

Extend the already proposed concrete `blend` field:

- rect/path: `blend?: 'normal' | 'difference'`;
- circle: `blend?: 'normal'`; difference remains unsupported;
- line/text/canvas/collection: no new blend support;
- omission keeps the existing concrete renderer path unchanged.

Only an explicit legend point/swatch recipe-layer opacity lowers to
`blend:'normal'`. The semantic recipe continues to own only its approved
`opacity` value; no second semantic owner is introduced. The existing bar
`editBarMark({blend:'normal'})` reset still removes its optional semantic field
and does not materialize a normal marker. Thus this is an opt-in concrete paint
instruction, not a new bar behavior. A line recipe has one stroke paint and
continues to apply its opacity once without a surface.

The shared private isolated-glyph helper paints fill and stroke on a bounded
transparent source at globalAlpha1 with intrinsic paint alpha, then composites
that one source normally with the explicit layer opacity. SVG retains one
ordinary element with its existing whole-element opacity; normal needs no
mix-blend-mode or new root isolation. PDF uses the already approved opt-in
single-glyph raster path and retains ordinary vector output elsewhere.

Normal and difference markers share private surface allocation, size limits,
capability preflight, save/restore and atomic failure behavior. The normal
marker does not authorize backdrop flattening, a public canvas factory, image
resolution reduction, or new marker inference from an opacity number.

## Alternative

A new `isolateOpacity?:true` rect/path/circle field could express the same
instruction. It avoids extending the blend enum, but adds another concrete
paint field/owner and a second grammar path for one existing operation. Neither
alternative is silently covered by the approved difference-only concrete enum.

## Required validation if approved

1. Finite opacity0/.7/1 for line/point/swatch, mixed layer recipes, mapped shapes,
   circle/rect/path fill-stroke intersections, zero stroke and nonzero stroke.
2. Independent sRGB source-over alpha/RGB numerical oracle in native Canvas,
   Chromium DOM/Offscreen, SVG raster and PDF raster; opaque geometry and alpha
   exact. Approved one-step RGB quantization is restricted to the new opt-in
   semitransparent PDF glyph path.
3. Supplied versus omitted same-number opacity witnesses prove that only the
   supplied path receives the new marker. Defaults and historical fallback
   GraphicSpec/SVG/pixels remain unchanged.
4. Closed grammar rejects circle difference and unsupported line/text/container
   blend markers, unknown enum values, malformed persisted config and unsupported
   contexts before any clear/draw. No inheritance from collection or canvas.
5. Palette/data/scale/Canvas replay, replacement recipe omission, auto reset,
   immutable caller input, persistence, focused edits and installed package tests.
6. Public/current contracts, concrete primitive documentation/types/generated
   metadata and actual realistic5calls/3datasets coverage synchronized together.

Decision required: approve this exact normal marker expansion, choose the
alternative field, or keep #208 pending. No code for either signal is installed.

## Reproduce and inspect the decision evidence

Run from the repository root:

```sh
node agent_docs/impl/release-0.0.19/probes/legend-opacity-signal.mjs
```

The checked-in `evidence/legend-opacity-signal.json` records the exact public
calls, differing explicit/inherited override JSON, identical concrete glyph,
source bindings and actual full-frame raster hashes. The proposed public recipe
is also executed against the current implementation and remains rejected.
No marker or new recipe opacity is installed by this package.

The independent native source-surface probe reveals an additional implementation
constraint: `drawImage` at globalAlpha0.7 yields `[75,75,255,255]` for an opaque
blue source over white, whereas a direct single blue paint at the same alpha
is `[77,77,255,255]`. The two-step native image-alpha difference is explicitly
**not** an approved allowance. The signal decision and this backend arithmetic
finding are separate: an implementation must resolve or accurately validate the
normal-alpha path without broadening the existing quantization approval.
