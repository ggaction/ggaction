---
layout: default
title: ChartProgram and Immutability
---

# ChartProgram and Immutability

<div class="docs-concept-flow docs-concept-flow--state" role="img" aria-label="ChartProgram contains semantic specification, graphic specification, authoring context, and trace state">
  <span>semanticSpec<strong>meaning</strong></span>
  <span>graphicSpec<strong>drawing</strong></span>
  <span>context<strong>next action</strong></span>
  <span>trace<strong>history</strong></span>
</div>

`chart()` returns an empty `ChartProgram`. A program contains the authored chart
state and the history used to produce it.

```javascript
import { chart } from "ggaction";

const empty = chart();
const withCanvas = empty.createCanvas();

console.log(empty === withCanvas); // false
```

Every action returns a new program. Earlier programs and caller-owned input are
not mutated.

## Program state

| Property | Purpose |
| --- | --- |
| `semanticSpec` | Data, layers, encodings, scales, coordinates, and guides |
| `graphicSpec` | Fully materialized backend-neutral graphics |
| `resolvedScales` | Resolved domains and concrete output ranges |
| `materializationConfigs` | Immutable appearance and layout inputs needed for later rematerialization |
| `context` | Current authoring selections used to interpret omitted action targets |
| `trace` | Hierarchical action history |

`context` helps later actions interpret omitted parameters, such as the current
dataset or mark. Canvas margin is canonical materialization state rather than
transient context, and plot bounds are derived from it and the concrete Canvas
dimensions. Rendering does not depend on `context` or `trace`.

## Inspecting authored and materialized state

The semantic collections, named graphic map, drawing order, and trace tree are
public immutable inspection surfaces. Use an explicit mark ID when code needs
to connect one semantic layer to its concrete final items.

```javascript
import { chart } from "ggaction";

const program = chart()
  .createCanvas({ width: 240, height: 160, margin: 30 })
  .createData({
    id: "observations",
    values: [{ x: 1, y: 2 }, { x: 2, y: 4 }]
  })
  .createPointMark({ id: "points" })
  .encodeX({ field: "x" })
  .encodeY({ field: "y" });

const pointLayer = program.semanticSpec.layers.find(
  layer => layer.id === "points"
);
const pointGraphic = program.graphicSpec.objects.points;

if (pointLayer === undefined || pointGraphic === undefined) {
  throw new Error("Expected the points layer and graphic.");
}

console.log(program.semanticSpec.datasets.length); // 1
console.log(pointLayer.mark?.type);                 // "point"
console.log(pointGraphic.items?.length);            // 2
console.log(program.graphicSpec.order);              // top-level draw order
console.log(program.trace.children.at(-1)?.op);      // "encodeY"
```

The same code compiles in TypeScript. `SemanticDataset`, `SemanticLayer`,
`SemanticScale`, `SemanticCoordinate`, `GraphicSpec`, `GraphicObject`, and
`TraceNode` are exported when an inspection helper needs an explicit type.

| Path | Meaning |
| --- | --- |
| `program.semanticSpec.datasets` | Ordered semantic dataset resources, including user IDs and immutable source or derived values |
| `program.semanticSpec.layers` | Ordered semantic mark layers; find a layer by its persisted `id` |
| `program.semanticSpec.scales` | Named semantic scale definitions before concrete range resolution |
| `program.semanticSpec.coordinates` | Named coordinates and their attached layer IDs |
| `program.graphicSpec.objects` | Map from every named graphic ID to one concrete object or repeated-item owner |
| `program.graphicSpec.order` | IDs of top-level graphics in drawing order |
| `program.graphicSpec.objects[id].children` | Attached named child graphic IDs in sibling drawing order |
| `program.graphicSpec.objects[id].items` | Repeated concrete final items owned by a mark or guide graphic |
| `program.trace.children` | Top-level authored actions below the virtual `program` trace root |

For a mark created with an explicit ID, the semantic layer and its owning
graphic use that same ID. `items.length` therefore checks final point, bar,
rule, line-series, or area-series cardinality without asking the renderer to
draw first. The relevant grain depends on the mark: one line item is one final
series path, not one source row.

Collection names and user-chosen resource IDs are stable public contracts.
System-generated component IDs, such as internal plot containers, axis parts,
legend symbols, and individual item IDs, may change when a graphical recipe
changes. Inspect those components through their documented owner and
`children` or `items` collection instead of persisting generated IDs. Concrete
properties are backend-neutral and inspectable, but their shape follows the
graphic type—for example, a path stores resolved `commands` rather than source
field expressions.

`resolvedScales` and `materializationConfigs` support advanced diagnostics,
while `context` is transient authoring convenience. Portable verification
should prefer `semanticSpec`, `graphicSpec`, and `trace` because those surfaces
record meaning, drawable output, and provenance respectively.

Use [Semantic and graphical state](./semantic-and-graphics.md) to understand the
boundary between intent and concrete output.
