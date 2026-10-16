# A narrow triangular point shape

Gate: **ready-for-review**. No implementation is approved or included.

## Problem

Dense directional fields need a narrow, centered triangular glyph. The existing equilateral `triangle-up` becomes four times wider when its height matches the required narrow triangle. A circle removes direction entirely. Existing `encodeAngle` already provides the required clockwise rotation; another angle action or arbitrary path vocabulary is unnecessary.

The frozen motivating design contains 4,800 observations with position, speed, direction, continuous color, transparent fill, 2px colored outlines and opacity 0.7. All rows must remain; substituting or thinning the observations is outside this proposal.

## Proposed public contract

Add exactly one closed point-shape value, **`"wedge"`**, wherever existing point shape values are already accepted. It denotes a narrow **straight-sided triangle**, without an arc or custom path input.

```js
chart()
  .createCanvas({ width: 240, height: 180 })
  .createData({ values: [{ x: 1, y: 1, direction: 90 }] })
  .createScatterPlot({ x: "x", y: "y", guides: false })
  .editPointMark({ shape: "wedge", fill: "transparent", stroke: "teal" })
  .editPointMark({ strokeWidth: 2, opacity: 0.7 })
  .encodeAngle({ field: "direction" });
```

- Before normalization, the three vertices are `(0, -2/√3)`, `(-1/4, 1/√3)` and `(1/4, 1/√3)`. Their centroid is `(0, 0)` and their area is `√3/4`.
- Normalize to the **existing physical-area size convention**. Do not introduce another size unit or change the size behavior of any existing shape.
- Zero rotation points upward. Existing clockwise degree rotation applies about the centroid, including constant and field angle encodings.
- Existing shape scale domains/ranges, point appearance, selection/highlight, rematerialization, grouped symbol recipes, facets, persistence, SVG and Canvas must all recognize the new closed value consistently.
- Existing size-legend behavior follows the same shape/area convention. No arbitrary shape strings, SVG paths, new renderer primitive or additional public action is introduced.
- All other existing shapes and their serialized programs remain unchanged. Invalid shape names remain atomic errors in Full and Basic entry points.

## Evidence and review target

`repro.mjs` proves that the current public action rejects the proposed shape, confirms the existing angle action and records the exact geometry ratios without reading chart pixels. `target.svg` is a source-neutral visual target for this geometry and its clockwise rotation. The motivating source's immutable evidence is recorded separately with lossless encoded filesystem paths.

The source's geometric triangle area is `√3 × sourceSize / 16`; a translator can express this through the existing size scale after the native shape exists. This conversion belongs to translation, rather than changing ggaction's physical-area contract.

## Required verification before implementation closeout

Prove centroid, exact area, triangle topology, angle, fill/stroke and bounds at several sizes; constant/field shape and angle, size/shape legends and recipes, edits and rematerialization, facet and selection behavior, persistence, caller immutability and invalid-call atomicity. Check Full/Basic, SVG/Canvas parity, installed consumer, types, schema, action cards, current contracts and generated documentation. Revalidate the full motivating 4,800-row design after the synchronized runtime is explicitly integrated.
