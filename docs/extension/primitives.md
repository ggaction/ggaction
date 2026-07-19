---
layout: default
title: Primitive Extension API
---

# Primitive Extension API

<div class="docs-concept-flow" role="img" aria-label="Extension actions compose editSemantic, createGraphics, and editGraphics primitives">
  <span>editSemantic<strong>meaning</strong></span>
  <span>createGraphics<strong>identity</strong></span>
  <span>editGraphics<strong>concrete value</strong></span>
</div>

These methods are the low-level public extension layer, not the recommended
chart-authoring API.

## `editSemantic({ property, value | remove })`

Creates, replaces, or removes one supported semantic branch and structurally
copies the changed path.

```javascript
program.editSemantic({
  property: "layer[points].mark.type",
  value: "point"
});
```

Property paths use singular user-ID selectors such as `layer[points]` and
library-defined keys such as `encoding.x.field`. Unknown paths are rejected.
Dataset values cannot be replaced after creation.

Use `remove: true` instead of `value` to remove one supported semantic branch.
Empty parent objects are pruned, the earlier program remains unchanged, and the
removal is recorded as an `editSemantic` trace node. Current removable container
paths are complete layers such as `layer[points]`, encoding channels such as
`layer[points].encoding.opacity`, and legend branches such as
`guide.legend.opacity`. Source datasets remain immutable; only an unreferenced
derived dataset may be removed as a complete dataset resource.

```javascript
program.editSemantic({
  property: "layer[points].encoding.opacity",
  remove: true
});
```

Removing a complete layer does not automatically remove its graphics, scales,
guides, or materialization configuration. A domain action that owns the whole
resource lifecycle must explicitly clean up those consumers as separate wrapped
operations.

The primitive semantic grammar also supports the current line-chart contract,
including temporal field types, `mean` aggregation, `strokeDash` encodings,
scale `nice`/`zero` policies, combined series legends, and chart title text.

Derived dataset primitives may store an immutable `source`, a validated
`filter` or `regression` transform, and materialized `values`. Regression
transforms support linear, polynomial, or LOESS provenance and optional
Student-t mean/prediction intervals for linear and polynomial fits. Layer paths
also support `encoding.y2`, field-driven `encoding.shape`, and scale-free
`encoding.group` for primitive area and grouped-path contracts. These are
extension-level building blocks; the corresponding chart-authoring actions are
introduced separately when their complete materialization behavior is ready.

## `createGraphics({ id, type, length?, parent?, before?, after? })`

Creates one concrete object, a homogeneous drawable collection, or an empty
heterogeneous drawable `collection`.

```javascript
program.createGraphics({ id: "points", type: "circle", length: 2 });
```

Supported types are `canvas`, `collection`, `circle`, `rect`, `line`, `text`,
and `path`. `length` is a non-negative integer accepted by
homogeneous drawable types. A heterogeneous `collection` is populated through
one `editGraphics({ property: "items" })` call instead. Equivalent repeated
creation is idempotent.

```javascript
program
  .createGraphics({ id: "symbols", type: "collection" })
  .editGraphics({
    target: "symbols",
    property: "items",
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

Collection item IDs are generated as `symbols:0`, `symbols:1`, and so on.
Each item stores its own concrete primitive type. Shared properties such as
`opacity` can then be broadcast to every compatible item.

`parent` attaches a named graphic to an existing Canvas or collection. Attached
IDs are stored in the parent's `children` list; repeated drawable instances stay
separate in the owning graphic's `items` list. Omitting `parent` preserves
top-level placement in `graphicSpec.order`.

Ordinary chart actions create and use their Canvas/plot hierarchy automatically.
An extension that authors the same structure directly makes every owner explicit:

```javascript
program
  .createGraphics({ id: "canvas", type: "canvas" })
  .createGraphics({
    id: "plot",
    type: "collection",
    parent: "canvas"
  })
  .createGraphics({
    id: "bars",
    type: "rect",
    length: 3,
    parent: "plot"
  });
```

`before` or `after` places a new graphic relative to a direct sibling. They are
mutually exclusive, the referenced graphic must already belong to the same
parent, and no top-level graphic can be placed before the Canvas.

```javascript
program.createGraphics({
  id: "grid",
  type: "line",
  length: 5,
  parent: "plot",
  before: "bars"
});
```

Graphic IDs are unique across the complete tree. The renderer visits named
graphics depth-first in sibling order. Attachment defines ownership and drawing
order only; it does not create coordinate transforms, clipping, or layout.
Unknown or non-container parents, self-attachment, and cross-parent sibling
anchors are rejected during authoring. Rendering rejects orphaned, duplicated,
cyclic, or unknown attachments instead of silently skipping them.

Path graphics use backend-neutral `path.commands` arrays rather than renderer-specific
path strings. The closed command vocabulary is `M`, `L`, `C`, and `Z`. A path starts
with one `M`; `L` and `C` draw straight and cubic segments; an optional final `Z`
closes the path. At least one `L` or `C` segment is required. Coordinates and cubic
control points must be finite numbers.
TypeScript users can import the `ConcretePathCommand` union from `ggaction`.
`path.strokeDash` and `line.strokeDash` accept non-negative finite number arrays;
an empty array is a solid stroke.

Chart authors choose line interpolation through `createLineMark({ curve })` or
`editLineMark({ curve })`. Extension authors still write final commands rather
than storing curve names in `graphicSpec`; the renderer never performs
interpolation.

Circle graphics support a required fill and an optional concrete
`stroke`/`strokeWidth` pair. Accepted graphic properties have Canvas rendering
semantics; opaque style bags are not stored in `graphicSpec`.

A path can be open and stroked or Z-closed and filled. Filled paths require a final
`Z` command; their stroke is optional. When both fill and stroke are present, the
Canvas renderer fills first and strokes second.

```javascript
program
  .createGraphics({ id: "band", type: "path" })
  .editGraphics({
    target: "band",
    property: "commands",
    value: [
      { op: "M", x: 10, y: 80 },
      { op: "L", x: 70, y: 40 },
      { op: "L", x: 70, y: 60 },
      { op: "L", x: 10, y: 100 },
      { op: "Z" }
    ]
  })
  .editGraphics({ target: "band", property: "fill", value: "#111111" })
  .editGraphics({ target: "band", property: "opacity", value: 0.18 });
```

The complete low-level line-chart example is available in
[`primitive.program.js`](https://github.com/ggaction/ggaction/blob/main/test/charts/cars-line-chart/primitive.program.js).
It explicitly authors semantic line state, paths, axes, a combined legend, and
title graphics without chart-level convenience actions.

The regression scatterplot baseline in
[`primitive.program.js`](https://github.com/ggaction/ggaction/blob/main/test/charts/cars-regression-scatterplot/primitive.program.js)
uses a heterogeneous point collection, grouped filled confidence-band paths,
grouped line paths, and two concrete legends.

## `editGraphics({ target, property, value | remove })`

Sets one validated concrete property or removes one named graphic subtree.

```javascript
program.editGraphics({
  target: "points",
  property: "x",
  value: [32.5, 81.4]
});
```

For a homogeneous or heterogeneous collection, an outer array distributes
values by index and must match its length. A non-array value is broadcast to
every item that supports the property. Nested arrays and objects remain one
value per item. Generated item IDs such as `points:1` can be targeted.

Use `remove: true` without `property` or `value` to remove a named graphic and
its owned named descendants. The action also detaches the root from its parent
or top-level order. The Canvas root and generated items cannot be removed;
resize or replace an item's owning collection instead.

```javascript
program.editGraphics({
  target: "opacityLegendSymbols",
  remove: true
});
```

Authoring and rendering share the same concrete value contract. Numeric
geometry must be finite, dimensions and stroke widths cannot be negative,
opacity stays between `0` and `1`, text alignment uses the Canvas vocabulary,
and appearance strings must be non-empty. Rendering additionally requires all
properties needed to draw the primitive to be present.

## Scale materialization

`createScale({ id, type?, domain?, range?, nice?, zero?, clamp?, reverse?, base?, exponent?, constant? })` creates an
idempotent semantic scale. Domain actions that own scale consumers invoke the
internal wrapped `rematerializeScale` operation to resolve all consumers and
apply concrete graphic edits, including connected axis updates. Aggregate line
consumers resolve their domains from derived means rather than raw rows. Ordinal
ranges may contain color strings, a validated named-palette descriptor, or validated
even-length stroke-dash patterns for the matching channel.

```javascript
program.createScale({ id: "x", type: "linear" });
```

Direct quantitative position scale types are `linear`, `log`, `pow`, `sqrt`,
and `symlog`; type-specific parameters use the same contract as encoding scale
options. `time` and `ordinal` remain available for their current roles.

Extension actions should call the public domain action that owns the affected
consumer instead of calling `rematerializeScale` directly. Rematerialization is
still explicit inside that action and remains visible in `program.trace`; it
never runs merely because `semanticSpec` changed.
