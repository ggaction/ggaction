# Difference compositing for bars

Gate: **ready-for-review**. No runtime or schema implementation is included.

## Problem and current capability

Existing bars support linear gradient fill, rounded corners, stroke and opacity. They do not expose a blend choice. The motivating design combines twelve gradient bars with rounded 10px corners and a 4px yellow stroke, using **difference** compositing against the plot and its grid. The original 1,461 weather observations must still be aggregated natively into twelve monthly means.

Replacing each color with its inverse is insufficient: a bar also covers gray grid ink, so the result depends on the backdrop under each painted pixel. Drawing another chart or replacing the chart with an image is outside scope. `repro.mjs` verifies the existing public gradient/corner/stroke support and the missing option separately.

## Proposed public contract

Add one optional property to the existing bar appearance action:

```js
program.editBarMark({ blend: "difference" });
```

- Closed values: `"normal"` and `"difference"`. Omission and `"normal"` preserve today's normal source-over behavior. Do not add unrelated blend modes or a separate action.
- `"difference"` means per-channel absolute difference between source and backdrop, followed by the existing source/backdrop alpha compositing rules. It applies to the bar's fill and outline as the same mark painting operation, with backend equivalence explicitly tested at their intersection.
- Store the choice as bar meaning, and explicitly materialize a closed backend-neutral graphical compositing property. Renderers consume that materialized property; they do not inspect semantic marks or introduce an implicit compiler.
- SVG and Canvas must produce the same intended result over white, colored and transparent backgrounds and over existing grid/mark ink. Scope any required isolation or intermediate surface to the actual bar paint bounds. Preserve normal painter order.
- Existing gradients, corner radii, stroke, opacity, scale and data edits must rematerialize the same choice. Include grouped, stacked, horizontal, ranged and faceted bars, persistence and Full/Basic action paths. Other mark families remain outside this proposal.
- Unknown blend values and unsupported appearances remain atomic errors. Earlier programs, inputs and default output must remain unchanged.

The contract requires actual SVG/Canvas equivalence rather than assuming that setting a Canvas composite flag independently for fill and stroke is sufficient. If the two backends need different internal painting mechanics, keep that work inside the existing renderer/materialization owners.

## Concrete review target

`target.svg` is an independent small target: the requested public bar appearance would paint a horizontal orange-to-cyan gradient, a yellow outline and rounded corners over white and gray grid ink, using difference. It illustrates why a static inverted palette is insufficient. The intended public flow is the existing three-key bar facade followed by ordinary appearance edits:

```js
chart()
  .createCanvas({ width: 320, height: 200 })
  .createData({ values: [{ category: "A", amount: 3 }] })
  .createBarPlot({ x: "category", y: "amount", guides: false })
  .editBarMark({ fill: gradient, stroke: "yellow", strokeWidth: 4 })
  .editBarMark({ cornerRadius: 10, blend: "difference" });
```

`gradient` uses the existing closed `FillPaint` type. This proposal does not change gradient coordinates or add arbitrary CSS properties.

## Required implementation verification

Verify exact default-output parity, alpha compositing, fill/outline intersections, gradient bounds, rounded corners, painter order, clipped and touching bars, edits/rematerialization, persistence, facets, caller immutability and invalid-call atomicity. Include SVG/Canvas target parity and an installed consumer. Update types, closed persisted/graphic schemas, current contracts, action cards and generated documentation. Revalidate the full motivating source after coordinated runtime integration; until approval, hold only that source.
