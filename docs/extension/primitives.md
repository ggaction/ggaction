---
layout: default
title: Primitive Extension API
---

# Primitive Extension API

These methods are the low-level public extension layer, not the recommended
chart-authoring API.

## `editSemantic({ property, value })`

Creates or replaces one supported semantic property and structurally copies the
changed path.

```javascript
program.editSemantic({
  property: "layer[points].mark.type",
  value: "point"
});
```

Property paths use singular user-ID selectors such as `layer[points]` and
library-defined keys such as `encoding.x.field`. Unknown paths are rejected.
Dataset values cannot be replaced after creation.

The primitive semantic grammar also supports the current line-chart contract,
including temporal field types, `mean` aggregation, `strokeDash` encodings,
scale `nice`/`zero` policies, combined series legends, and chart title text.

Derived dataset primitives may store an immutable `source`, a validated
`filter` or linear `regression` transform, and materialized `values`. Regression
transforms currently describe Student-t mean-response intervals. Layer paths
also support `encoding.y2`, field-driven `encoding.shape`, and scale-free
`encoding.group` for primitive area and grouped-path contracts. These are
extension-level building blocks; the corresponding chart-authoring actions are
introduced separately when their complete materialization behavior is ready.

## `createGraphics({ id, type, length?, before?, after? })`

Creates one concrete object, a homogeneous drawable collection, or an empty
heterogeneous drawable `collection`.

```javascript
program.createGraphics({ id: "points", type: "circle", length: 2 });
```

Supported types are `canvas`, `collection`, `circle`, `rect`, `line`, `text`,
and `path`. `length` is a non-negative integer accepted by
homogeneous drawable types. A heterogeneous `collection` is populated through
one `editGraphics({ property: "children" })` call instead. Equivalent repeated
creation is idempotent.

```javascript
program
  .createGraphics({ id: "symbols", type: "collection" })
  .editGraphics({
    target: "symbols",
    property: "children",
    value: [
      {
        type: "circle",
        properties: { x: 20, y: 30, radius: 4, fill: "red" }
      },
      {
        type: "rect",
        properties: {
          x: 36,
          y: 46,
          width: 8,
          height: 8,
          fill: "blue",
          stroke: "blue",
          strokeWidth: 0
        }
      }
    ]
  });
```

Collection child IDs are generated as `symbols:0`, `symbols:1`, and so on.
Each child stores its own concrete primitive type. Shared properties such as
`opacity` can then be broadcast to every compatible child. Program composition
is not part of the current primitive graphic contract.

`before` or `after` can place a new top-level graphic relative to an existing
top-level graphic. They are mutually exclusive, the referenced graphic must
already exist, and no graphic can be placed before the Canvas. When neither is
provided, creation appends to `graphicSpec.order` as usual.

```javascript
program.createGraphics({
  id: "grid",
  type: "line",
  length: 5,
  before: "bars"
});
```

Line-chart series use backend-neutral `path.points` arrays rather than SVG `d`
strings. Each point is a finite `{ x, y }` object. `path.strokeDash` and
`line.strokeDash` accept non-negative finite number arrays; an empty array is a
solid stroke.

Circle graphics support a required fill and an optional concrete
`stroke`/`strokeWidth` pair. Accepted graphic properties have Canvas rendering
semantics; opaque style bags are not stored in `graphicSpec`.

A path can be open and stroked or closed and filled. Filled paths require
`closed: true`; their stroke is optional. When both fill and stroke are present,
the Canvas renderer fills first and strokes second.

```javascript
program
  .createGraphics({ id: "band", type: "path" })
  .editGraphics({ target: "band", property: "points", value: polygon })
  .editGraphics({ target: "band", property: "closed", value: true })
  .editGraphics({ target: "band", property: "fill", value: "#111111" })
  .editGraphics({ target: "band", property: "opacity", value: 0.18 });
```

The complete low-level line-chart example is available in
[`primitive.program.js`](https://github.com/hj-n/ggaction/blob/main/test/charts/cars-line-chart/primitive.program.js).
It explicitly authors semantic line state, paths, axes, a combined legend, and
title graphics without chart-level convenience actions.

The regression scatterplot baseline in
[`primitive.program.js`](https://github.com/hj-n/ggaction/blob/main/test/charts/regression-scatterplot/primitive.program.js)
uses a heterogeneous point collection, grouped filled confidence-band paths,
grouped line paths, and two concrete legends.

## `editGraphics({ target, property, value })`

Sets one validated concrete property.

```javascript
program.editGraphics({
  target: "points",
  property: "x",
  value: [32.5, 81.4]
});
```

For a homogeneous or heterogeneous collection, an outer array distributes
values by index and must match its length. A non-array value is broadcast to
every child that supports the property. Nested arrays and objects remain one
value per child. Generated child IDs such as `points:1` can be targeted.

Authoring and rendering share the same concrete value contract. Numeric
geometry must be finite, dimensions and stroke widths cannot be negative,
opacity stays between `0` and `1`, text alignment uses the Canvas vocabulary,
and appearance strings must be non-empty. Rendering additionally requires all
properties needed to draw the primitive to be present.

## Scale materialization

`createScale({ id, type?, domain?, range?, nice?, zero? })` creates an
idempotent semantic scale. `rematerializeScale({ id })` resolves all consumers
and invokes concrete graphic edits, including connected axis updates. Aggregate
line consumers resolve their domains from derived means rather than raw rows.
Ordinal ranges may contain color strings, the `tableau10` descriptor, or
validated even-length stroke-dash patterns for the matching channel.

```javascript
program
  .createScale({ id: "x", type: "linear" })
  .rematerializeScale({ id: "x" });
```

Rematerialization is explicit. It never runs merely because `semanticSpec`
changed.
