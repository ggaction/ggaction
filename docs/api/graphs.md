---
layout: default
title: Graph Plots
description: Draw and revise nodes, directed edges, parallel edges and self-loops from an explicit graph layout.
---

# Graph plots

Create [observed graph data and a layout](data/source-and-derived.md#observed-graph-data), then draw the stored node positions. Full supports fixed, circular and deterministic force layouts. The [graph tutorial](../tutorials/graphs.md) uses the same program as the browser and renderer examples.

{% include chart-example.html id="graph-plots" %}

A source revision can remove nodes from a fixed or force layout. Their authored positions and pins remain stored and are reused if the same typed keys return. New nodes still need complete fixed or initial positions. When `editLayout` replaces a coordinate array, it validates that array against the current nodes; omitted arrays retain their earlier intent.

## createGraphPlot

```typescript
createGraphPlot(options?: TargetedOptions<GraphPlotOptions>): ChartProgram
```

Chart authoring. Draw circles, edge paths and optional labels from one graph layout. The first omitted ID is `graphPlot`; additional plots need explicit IDs. An omitted layout uses the current eligible graph layout, then the unique eligible layout. Missing or ambiguous inputs fail.

`origin:"auto"` centers the stored node bounds in the plot frame without scaling coordinates. An explicit `[x,y]` translates by plot-local pixels. `clip:false` is the default; true clips to the plot frame. Resizing the Canvas updates placement while preserving the layout result.

Nodes accept `radius`, `fill`, `stroke`, `strokeWidth`, `opacity`, and `overrides`. Defaults are radius 6, fill #2563eb, stroke #ffffff, width 1 and opacity 1. Fill accepts the shared structured paint values. Each override combines the same optional style fields with a required original typed node `key`.

Edges accept `stroke`, `strokeWidth`, `opacity`, `parallelGap`, `loopRadius`, `arrowSize`, and `arrows`. Defaults are #94a3b8, 1.5, 1, 16, 20, 8 and `"auto"`. Auto arrows follow graph direction; true forces arrows and false hides them. Dimensions are nonnegative finite pixel values. Opacity is in [0,1]. Parallel edges retain separate curved routes in source order; self-loops remain visible. A directed edge and its arrow share one logical identity.

## editGraphPlot

```typescript
editGraphPlot(options: TargetedOptions<EditGraphPlotOptions>): ChartProgram
```

Chart authoring. Apply a nonempty patch to layout binding, placement, node/edge appearance, or labels. Omitted target selects the current eligible mark, then a unique graph plot; ambiguity fails. Omitted fields preserve stored intent. Override arrays replace their previous array. Null, undefined, unknown fields and invalid values fail before changing the program.

## Labels and identity

Labels are disabled by default. `labels:{}` displays original node keys; `labels:false` removes them. Defaults are fill #0f172a, 12px sans-serif normal, and offset `[0,14]`. Set `field` to one retained node attribute. Scalar values become strings, null/undefined become empty strings, and object/array values fail. Label overrides accept a typed key, optional text, and optional fill/font style; offset is shared by the plot.

Overrides must initially name existing distinct keys. A later source revision can make a stored override dormant. Inspection reports `orphan-style`, and only the same typed key can regain that style. Number `1` and string `"1"` remain different.

Selection fields include `kind:"node"|"edge"`, `key`, and node attributes as `attribute:<name>`. Edges additionally expose sourceKey, targetKey, weight, origin, directed and ruleId. Node degree/incoming/outgoing fields describe retained adjacency. Exact source rows distinguish the node and edge tables. An edge selection includes its arrow; a node selection includes its label.

Highlight `color` or `stroke` changes node borders, edge paths and arrow fill; label paint stays readable. Opacity and offset affect every component of the selected item. Fill, size, shape, fontSize and strokeDash highlights are unsupported. Use node style edits to change node fill or radius. Removing a highlight restores the current baseline.

## Updates, removal and outputs

Data, graph and layout revisions preflight all dependent plots, then update exact revisions and materialize nodes, edges, arrows and labels explicitly. Failure preserves the previous program and trace. Concat supports explicitly scoped plot/layout edits. Raw position encodings, axes and scale legends do not apply to these stored layout coordinates. Graph facet/repeat is not currently supported.

By default, `filterMarks` selects node items by field, source rows or pre-highlight body properties.
It retains the original edges whose two endpoints remain visible, including parallel
edges, loops and arrows. Node positions, graph/layout resources, full-graph degree
values and stable identities remain unchanged. Its ordered recipe follows source,
layout, paint and Canvas edits. Use `mode: "replace"` to start from all nodes or
`mode: "compose"` to narrow the current view. `removeMarkFilter` restores the full
graph. On inferred graphs, add `recompute: true` to rebuild relationships and layouts
from the selected node keys. All plots sharing the named graph update; replacing or
composing the filter evaluates the original source recipe. Source revisions keep
that exact key set, and removal restores the original source. The [filtering API](data/filtering.md#filter-marks) owns the shared selector rules.

Remove a plot with `removeMark` before removing its bound layout or graph. Resource cascade does not silently remove live graph marks. Editable serialization validates stored data, layout and style without rerunning force simulation. Canvas, SVG, PNG and PDF consume the same concrete primitives. Inspection and accessible export count each node or edge once rather than counting its label or arrow again.

## Graph inference

Use `createInferredGraphData` when relationships follow a rule. The resulting
graph works with the same `layoutGraph` and `createGraphPlot` actions.

<!-- snippet-context:start -->

> **Executable complete.** Use an ES module with the imports, data, and prepared resource state described in this section. Resolve these names from setup in this fragment or section; alternatives branch from the same base.

<!-- snippet-context:end -->

```javascript
import { chart } from 'ggaction';

const program = chart()
  .createData({ id: 'points', keyField: 'id', values: [
    { id: 'a', x: 0 }, { id: 'b', x: 1 },
    { id: 'c', x: 3 }, { id: 'd', x: 10 }
  ] })
  .createInferredGraphData({
    id: 'neighbors', nodeKey: 'id', ruleId: 'nearest',
    rule: 'knn', features: ['x'], metric: 'euclidean',
    options: { k: 1, symmetrize: 'union' }
  })
  .layoutGraph({ id: 'placement', method: 'circular' })
  .createCanvas({ width: 400, height: 300 })
  .createGraphPlot({ labels: {} });
```

The inferred edges are a–b, b–c, and c–d, with weights 1, 2, and 7. Their identities
include `ruleId` and typed endpoint keys. Changing a threshold or source value
preserves the identity of a surviving relationship. A new `ruleId` denotes a
separate inference.

| Rule | Required rule options | Meaning |
| --- | --- | --- |
| `knn` | None; `k` defaults to 1 | Nearest neighbors, with `directed`, `union`, or `mutual` symmetry |
| `radius` | `radius` | Include distances at or below the radius |
| `similarity` | `threshold` | Include cosine or Jaccard similarities at or above the threshold |
| `mst` | None | Minimum spanning tree of metric distances or an explicit candidate graph |
| `group` | `fields` | Connect equal typed groups as a clique or an explicit-hub star |
| `sequence` | `orderField` | Connect each row to the row `lag` positions later within its group |

Numeric metrics accept a field array. Jaccard also accepts `features: { set:
'attributes' }` for an array-valued column. Great-circle accepts `features: {
longitude: 'longitude', latitude: 'latitude' }` and returns distances in meters.
Preprocessing defaults to `none`; numeric metrics also support `standardize` and
`minmax`. Missing features fail unless `options.missing: 'omit-node'` is explicit.
Cosine zero vectors fail unless `options.zeroVector: 'zero-similarity'` is explicit.

Group and sequence rules do not accept metric features. A candidate MST uses
`candidateGraph: 'existingGraph'` with an undirected weighted graph and omits
metric features. Disconnected candidates require `options.forest: true`.

Search defaults to exact brute force. Use `options.search: { algorithm:
'kd-tree' }` for Euclidean or Manhattan neighbor/radius queries up to eight
dimensions, or `{ algorithm: 'grid' }` for radius queries up to three dimensions.
Approximate kNN requires `{ mode: 'approximate', seed: 42 }`; it records measured
recall and fails below its `minRecall` threshold, which defaults to 0.95. It never
silently substitutes approximate results for exact search.

`editInferredGraphData({ target: 'neighbors', definition: { options: { k: 2 } } })`
replaces the rule options and refreshes dependent layouts and plots. A different
rule requires its new `ruleId` and applicable definition. Source revisions also
refresh dependent inferred graphs; layout, canvas, and paint edits preserve the
topology. `candidateGraph: null` removes a candidate input, so provide metric
features in the same edit when switching to a complete metric MST.

Inference supports the Full entry point. Resource-backed graph plots currently
reject automatic facet partitioning. Mark filtering keeps the inferred topology;
create an explicitly filtered dataset and a separate inferred graph when you need
recomputation.

## Outlines and shadows

Body and label styles accept `outline:{color,width}|false` and `shadow:{color,offsetX?,offsetY?,blurRadius?}|false`, including per-item overrides. Omission preserves an effect during edits; false removes it, including an inherited role effect. Effects reuse the [mark appearance contract](appearance/mark-style.md). An authored outline and stroke in the same style patch conflict; an existing stroke is retained underneath the outline and returns when it is removed. Each effect preserves its original item identity and source geometry. Style edits, resize, highlight replay and offline restore do not rerun the stored layout.

Graph edges accept shadow on both the path and its arrow. Edge outlines are unsupported; edit their ordinary stroke.
