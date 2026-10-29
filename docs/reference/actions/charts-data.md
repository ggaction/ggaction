---
layout: default
title: Charts, Data, and Composition Actions
description: Create complete charts, manage data, select marks, and compose complete programs.
---

# Charts, Data, and Composition Actions

Each declared action has an exact signature and its own stable link. Option tables are generated from types; behavior prose names the owning workflow and its constraints. API layers and [H0–H4 catalog role tags](../../tutorials/hierarchical-authoring.md#catalog-role-tags) are independent classifications. Relative action hierarchy is determined by composition, not by a tag or fixed trace depth.

## `createCanvas`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
createCanvas(options?: TargetedOptions<CanvasOptions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`CanvasOptions`](./../types.md#type-canvasoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `width` | Optional / branch-dependent | `number \| undefined` |
| `height` | Optional / branch-dependent | `number \| undefined` |
| `background` | Optional / branch-dependent | `string \| undefined` |
| `margin` | Optional / branch-dependent | `number \| Partial<Record<"bottom" \| "left" \| "right" \| "top", number>> \| undefined` |
| `plot` | Optional / branch-dependent | `false \| { width: number; height: number; } \| undefined` |
| `plotBorder` | Optional / branch-dependent | `false \| { color?: string \| undefined; lineWidth?: number \| undefined; underlay?: boolean \| undefined; } \| undefined` |
| `target` | Optional / branch-dependent | `ActionTargetList \| ScopedActionTarget` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
createCanvas({ width?, height?, background?, margin?, plot? })
```

Create the program's Canvas and plot bounds. [Canvas options](../../api/canvas.md)


## `editCanvas`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
editCanvas(options: TargetedOptions<CanvasOptions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`CanvasOptions`](./../types.md#type-canvasoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `width` | Optional / branch-dependent | `number \| undefined` |
| `height` | Optional / branch-dependent | `number \| undefined` |
| `background` | Optional / branch-dependent | `string \| undefined` |
| `margin` | Optional / branch-dependent | `number \| Partial<Record<"bottom" \| "left" \| "right" \| "top", number>> \| undefined` |
| `plot` | Optional / branch-dependent | `false \| { width: number; height: number; } \| undefined` |
| `plotBorder` | Optional / branch-dependent | `false \| { color?: string \| undefined; lineWidth?: number \| undefined; underlay?: boolean \| undefined; } \| undefined` |
| `target` | Optional / branch-dependent | `ActionTargetList \| ScopedActionTarget` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
editCanvas({ width?, height?, background?, margin?, plot? })
```

Edit Canvas properties and rematerialize connected consumers.
[Canvas options](../../api/canvas.md)


## `fitCanvas`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
fitCanvas(options?: TargetedOptions<FitCanvasOptions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`FitCanvasOptions`](./../types.md#type-fitcanvasoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `align` | Optional / branch-dependent | `"center" \| "preserve" \| undefined` |
| `padding` | Optional / branch-dependent | `number \| undefined` |
| `minPlotWidth` | Optional / branch-dependent | `number \| undefined` |
| `minPlotHeight` | Optional / branch-dependent | `number \| undefined` |
| `iterationLimit` | Optional / branch-dependent | `number \| undefined` |
| `overflow` | Optional / branch-dependent | `"error" \| "report" \| undefined` |
| `target` | Optional / branch-dependent | `ActionTargetList \| ScopedActionTarget` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
fitCanvas({ padding?, minPlotWidth?, minPlotHeight?, iterationLimit?, overflow? })
```

Fit an existing Full unit chart by shrinking its margins on a fixed Canvas.
The action uses deterministic 0.25px probes and preserves semantic state,
explicit scale ranges, guide policies, Canvas width, and Canvas height. The
default overflow policy rejects an unsatisfied minimum plot atomically;
`overflow: "report"` stores a structured result on
`materializationConfigs.fitting`.


## `applyTextMetrics`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Development; added after v0.0.13. See [release compatibility](../../version.md).

```typescript
applyTextMetrics(options: ApplyTextMetricsOptions): ChartProgram;
```

Named option contracts: [`ApplyTextMetricsOptions`](./../types.md#type-applytextmetricsoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `profile` | Optional / branch-dependent | `TextMetricsProfile \| undefined` |
| `prepared` | Optional / branch-dependent | `PreparedTextMetrics \| undefined` |
| `requestToken` | Optional / branch-dependent | `string \| undefined` |
| `target` | Optional / branch-dependent | `ActionTargetList \| ScopedActionTarget` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
applyTextMetrics({ profile })
applyTextMetrics({ prepared, requestToken })
```

Apply a host-measured width profile to title, axis, legend, label, and composition
layout. See [Measured text layout](../../api/rendering.md#measured-text-layout) for the
exact profile format, matching rules, propagation, and executable example.
The prepared overload binds stored font bytes and measured widths to one exact
receiver; missing font queries fail instead of using an estimate. See
[embedded fonts](../../api/rendering.md#embedded-fonts).


## `removeTextMetrics`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Development; added after v0.0.13. See [release compatibility](../../version.md).

```typescript
removeTextMetrics(): ChartProgram;
```

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

This action takes no named options.

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
removeTextMetrics()
```

Remove the active profile and rematerialize with deterministic width estimates.
See [Measured text layout](../../api/rendering.md#measured-text-layout) for lifecycle
and composition behavior.


## `applyTheme`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
applyTheme(options: TargetedOptions<ApplyThemeOptions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`ApplyThemeOptions`](./../types.md#type-applythemeoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `theme` | Required | `ThemeDefinition` |
| `scope` | Optional / branch-dependent | `"descendants" \| "self" \| undefined` |
| `target` | Optional / branch-dependent | `ActionTargetList \| ScopedActionTarget` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
applyTheme({ theme, scope? })
```

Use `"light"`, `"dark"`, or a custom partial definition such as:

```javascript
program.applyTheme({
  theme: {
    base: "light",
    tokens: {
      mark: "#b91c1c",
      grid: "#d1fae5",
      fontFamily: "Inter"
    }
  }
});
```

Custom definitions accept these token keys: `background`, `mark`, `text`,
`strongText`, `mutedText`, `axis`, `axisTitle`, `grid`, `border`,
`sizeSymbol`, `regressionBand`, `boxLine`, `boxMedian`, `referenceLine`,
`referenceBand`, `gradientCenter`, `highlight`, `fontFamily`, `axisLabel`,
`axisLabelFontFamily`, `axisTitleFontFamily`, `axisLabelFontSize`, and
`axisTitleFontSize`. Font sizes must be positive finite numbers; other tokens
must be non-empty strings. A new theme replaces the previous request; omitted
partial tokens come from the new base.

Axis label and title font tokens affect only axes, including Polar and Parallel
axes. Omitted role fonts fall back to `fontFamily`; omitted sizes retain each
axis family's default. `axisLabel` overrides label color; without it, Cartesian
and Polar labels use `text`, and Parallel labels use `axis`. `axisTitle` controls
axis title color. Explicit axis styles win, even when equal to a built-in default.
Active fonts are used during initial guide layout as well as later theme edits.

A unit chart defaults to `scope: "self"`. A composition defaults to
`scope: "descendants"`, which updates its root, current nested children, and
children later rebuilt by facet or repeat edits. Use `scope: "self"` on a
composition to change only its root Canvas background.

Explicit mark, guide, title, legend block, facet header, and highlight styles
take precedence. Field-driven palettes, semantic data, scales, grouping,
statistics, and ordering are preserved. Font token changes recalculate text
bounds and composition layout.


## `removeTheme`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
removeTheme(): ChartProgram;
```

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

This action takes no named options.

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
removeTheme()
```

Remove the most recently applied theme scope on that receiver. Composition
removal deletes only that composition's frame, so a previously hidden child or
ancestor theme becomes active again. Explicit local styles remain unchanged.


## `createData`

**API layer:** user-facing. **Authoring roles:** H2.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
createData<Row extends object>(options: CreateDataOptions<Row>): ChartProgram;
```

Named option contracts: [`CreateDataOptions`](./../types.md#type-createdataoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `keyField` | Optional / branch-dependent | `string \| undefined` |
| `keyFields` | Optional / branch-dependent | `readonly string[] \| undefined` |
| `keys` | Optional / branch-dependent | `readonly RowKey[] \| undefined` |
| `id` | Optional / branch-dependent | `string \| undefined` |
| `values` | Required | `readonly (Row extends readonly unknown[] ? never : Row & StoredCell<Row>)[]` |
| `schema` | Optional / branch-dependent | `SourceSchemaInput \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
createData({ id?, values })
```

Create one immutable named dataset. [Data](../../api/data.md)


## `applyDataUpdate`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Development; added after v0.0.13. See [release compatibility](../../version.md).

```typescript
applyDataUpdate(options: ApplyDataUpdateOptions): ChartProgram;
```

Named option contracts: [`ApplyDataUpdateOptions`](./../types.md#type-applydataupdateoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `prepared` | Required | `PreparedDataUpdate<"create" \| "parameter" \| "revise">` |
| `requestToken` | Required | `string` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
applyDataUpdate({ prepared, requestToken })
```

Apply an opaque result of `await prepareDataUpdate(program, request, host)` to
its exact immutable base with the application's current request token. Full
supports creating, refreshing, and parameter-dependent source updates; Basic
supports creation. Hosts provide explicit CSV/JSON loaders. All source and
computed consumers update atomically. See the
[prepared data reference](../../api/data/source-and-derived.md#prepared-data-updates)
and [refresh workflow](../../data-updates.md#prepare-and-apply-source-data).


## `reviseData`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Development; added after v0.0.13. See [release compatibility](../../version.md).

```typescript
reviseData<Row extends object>(options: TargetedOptions<ReviseDataOptions<Row>>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`ReviseDataOptions`](./../types.md#type-revisedataoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `keys` | Optional / branch-dependent | `readonly RowKey[] \| undefined` |
| `rowMap` | Optional / branch-dependent | `readonly (number \| null)[] \| undefined` |
| `values` | Required | `readonly (Row extends readonly unknown[] ? never : Row & StoredCell<Row>)[]` |
| `schema` | Optional / branch-dependent | `SourceSchemaInput \| undefined` |
| `source` | Required | `string` |
| `id` | Required | `string` |
| `target` | Optional / branch-dependent | `ActionTargetList \| ScopedActionTarget` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
reviseData({ source, id, values })
```

Create a fresh original-data revision and atomically update its dependent chart.
The original is retained; IDs and styles of existing chart owners remain stable.
See [Data updates](../../data-updates.md#revise-a-source-and-its-dependent-chart).


## `removeData`

**API layer:** user-facing. **Authoring roles:** H2.

**Availability:** Development; added after v0.0.13. See [release compatibility](../../version.md).

```typescript
removeData(options: TargetedOptions<RemoveResourceOptions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`RemoveResourceOptions`](./../types.md#type-removeresourceoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `id` | Required | `string` |
| `target` | Optional / branch-dependent | `ActionTargetList \| ScopedActionTarget` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
removeData({ id })
```

Remove one explicitly named dataset only when no mark, downstream dataset,
retained recipe, or owned resource still refers to it. Context and historical
trace mentions do not keep it alive. A standalone logical derived-data owner
removes its current snapshot and owner record together. This Full-only action
does not infer, cascade, or change graphics.
[Source and Derived Data](../../api/data/source-and-derived.md#removedata-id)


## `removeScale`

**API layer:** user-facing. **Authoring roles:** H2.

**Availability:** Development; added after v0.0.13. See [release compatibility](../../version.md).

```typescript
removeScale(options: TargetedOptions<RemoveResourceOptions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`RemoveResourceOptions`](./../types.md#type-removeresourceoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `id` | Required | `string` |
| `target` | Optional / branch-dependent | `ActionTargetList \| ScopedActionTarget` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
removeScale({ id })
```

Remove one explicitly named unused semantic scale and its resolved cache entry.
Every encoding, Parallel dimension, guide, and retained authoring binding is
checked first. The Full-only action does not rewire consumers or rebuild
graphics. [Scale Options](../../api/scales.md#removescale-id)


## `removeCoordinate`

**API layer:** user-facing. **Authoring roles:** H2.

**Availability:** Development; added after v0.0.13. See [release compatibility](../../version.md).

```typescript
removeCoordinate(options: TargetedOptions<RemoveResourceOptions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`RemoveResourceOptions`](./../types.md#type-removeresourceoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `id` | Required | `string` |
| `target` | Optional / branch-dependent | `ActionTargetList \| ScopedActionTarget` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
removeCoordinate({ id })
```

Remove one explicitly named unused coordinate after checking layer, guide,
annotation, and retained data-space bindings. A context pointer is cleared, but
no replacement coordinate is inferred. This action is Full-only.
[Coordinates](../../api/coordinates.md#removecoordinate-id)


## `bindMarkData`

**API layer:** user-facing. **Authoring roles:** H2.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
bindMarkData(options: TargetedOptions<BindMarkDataOptions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`BindMarkDataOptions`](./../types.md#type-bindmarkdataoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `target` | Required | `string \| ActionTargetList \| ScopedActionTarget` |
| `data` | Required | `string` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
bindMarkData({ target, data })
```

Atomically connect one independent mark to an existing materialized dataset.
The action preflights its fields, scales, guides, labels, selections, and
highlights before it rematerializes every registered consumer.
[Source and Derived Data](../../api/data/source-and-derived.md#bindmarkdata-target-data)


## `filterData`

**API layer:** user-facing. **Authoring roles:** H2.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
filterData(options: TargetedOptions<FilterDataOptions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`FilterDataOptions`](./../types.md#type-filterdataoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `id` | Required | `string` |
| `source` | Optional / branch-dependent | `string \| undefined` |
| `where` | Optional / branch-dependent | `ComputedExpressionV2 \| undefined` |
| `field` | Optional / branch-dependent | `string \| undefined` |
| `nulls` | Optional / branch-dependent | `"exclude" \| "include" \| undefined` |
| `oneOf` | Optional / branch-dependent | `readonly [DatasetScalar, ...DatasetScalar[]] \| undefined` |
| `noneOf` | Optional / branch-dependent | `readonly [DatasetScalar, ...DatasetScalar[]] \| undefined` |
| `predicate` | Optional / branch-dependent | `FilterComparison \| undefined` |
| `range` | Optional / branch-dependent | `FilterRange \| undefined` |
| `target` | Optional / branch-dependent | `ActionTargetList \| ScopedActionTarget` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
filterData({ id, source?, where })
filterData({ id, source?, field, oneOf | noneOf | predicate | range, nulls? })
```

Create an immutable named dataset using a field filter or a strict boolean expression predicate.
The source defaults to current data. `where` uses the closed v2 AST and excludes all field
filter options. Parameter edits revise dependent filters and their chart resources.
[Data](../../api/data.md)


## `createGraphData`

**API layer:** user-facing. **Authoring roles:** H2.

**Availability:** Development; added after v0.0.13. See [release compatibility](../../version.md).

```typescript
createGraphData(options: CreateGraphDataOptions): ChartProgram;
```

Named option contracts: [`CreateGraphDataOptions`](./../types.md#type-creategraphdataoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `id` | Required | `string` |
| `nodes` | Required | `string` |
| `edges` | Required | `string` |
| `nodeKey` | Required | `GraphKeyField` |
| `source` | Required | `GraphKeyField` |
| `target` | Required | `GraphKeyField` |
| `edgeKey` | Optional / branch-dependent | `GraphKeyField \| undefined` |
| `weight` | Optional / branch-dependent | `string \| undefined` |
| `attributes` | Optional / branch-dependent | `readonly string[] \| undefined` |
| `directed` | Optional / branch-dependent | `boolean \| undefined` |
| `selfLoops` | Optional / branch-dependent | `boolean \| undefined` |
| `maxNodes` | Optional / branch-dependent | `number \| undefined` |
| `maxEdges` | Optional / branch-dependent | `number \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
createGraphData({ id, nodes, edges, nodeKey, source, target, edgeKey?, weight?, attributes?, directed?, selfLoops?, maxNodes?, maxEdges? })
```

Store a graph from explicit node and edge tables, preserving typed endpoint keys
and parallel-edge identity. See [observed graph data](../../api/data/source-and-derived.md#observed-graph-data).


## `editGraphData`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Development; added after v0.0.13. See [release compatibility](../../version.md).

```typescript
editGraphData(options: TargetedOptions<EditGraphDataOptions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`EditGraphDataOptions`](./../types.md#type-editgraphdataoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `target` | Optional / branch-dependent | `string \| ActionTargetList \| ScopedActionTarget \| undefined` |
| `nodes` | Optional / branch-dependent | `string \| undefined` |
| `edges` | Optional / branch-dependent | `string \| undefined` |
| `definition` | Optional / branch-dependent | `Partial<ObservedGraphDefinition> \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
editGraphData({ target?, nodes?, edges?, definition? })
```

Revise an existing observed graph. The graph ID is `target`; the edge endpoint
column belongs in `definition.target`. See [observed graph data](../../api/data/source-and-derived.md#observed-graph-data).


## `editInferredGraphData`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Development; added after v0.0.13. See [release compatibility](../../version.md).

```typescript
editInferredGraphData(options: TargetedOptions<EditInferredGraphDataOptions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`EditInferredGraphDataOptions`](./../types.md#type-editinferredgraphdataoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `target` | Optional / branch-dependent | `string \| ActionTargetList \| ScopedActionTarget \| undefined` |
| `data` | Optional / branch-dependent | `string \| undefined` |
| `candidateGraph` | Optional / branch-dependent | `string \| null \| undefined` |
| `definition` | Optional / branch-dependent | `Partial<GraphCandidateMstDefinition \| (InferredGraphSource & { readonly metric: "cosine" \| "euclidean" \| "manhattan"; readonly features: readonly string[]; readonly preprocess?: "minmax" \| ... 2 more ... \| undefined; } & { ...; }) \| ... 11 more ... \| (InferredGraphSource & ... 1 more ... & { ...; })> \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
editInferredGraphData({ target?, data?, candidateGraph?, definition? })
```

Revise an inferred graph and its dependent layouts and plots. Use
`candidateGraph: null` to remove a spanning-tree candidate input.
See [graph inference](../../api/graphs.md#graph-inference).


## `createInferredGraphData`

**API layer:** user-facing. **Authoring roles:** H2.

**Availability:** Development; added after v0.0.13. See [release compatibility](../../version.md).

```typescript
createInferredGraphData(options: CreateInferredGraphDataOptions): ChartProgram;
```

Named option contracts: [`CreateInferredGraphDataOptions`](./../types.md#type-createinferredgraphdataoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `id` | Required | `string` |
| `data` | Optional / branch-dependent | `string \| undefined` |
| `nodeKey` | Required | `GraphKeyField` |
| `ruleId` | Required | `string` |
| `attributes` | Optional / branch-dependent | `readonly string[] \| undefined` |
| `maxNodes` | Optional / branch-dependent | `number \| undefined` |
| `maxEdges` | Optional / branch-dependent | `number \| undefined` |
| `rule` | Required | `"group" \| "knn" \| "mst" \| "radius" \| "sequence" \| "similarity"` |
| `options` | Optional / branch-dependent | `{ readonly forest?: boolean \| undefined; } \| { readonly fields: readonly string[]; readonly missing?: "error" \| "include" \| "omit-node" \| undefined; readonly mode?: "clique" \| "star" \| undefined; readonly hubKey?: RowKey \| undefined; readonly hubs?: readonly { ...; }[] \| undefined; } \| ... 5 more ... \| undefined` |
| `features` | Optional / branch-dependent | `readonly string[] \| { readonly set: string; } \| { readonly longitude: string; readonly latitude: string; } \| undefined` |
| `metric` | Optional / branch-dependent | `"cosine" \| "euclidean" \| "great-circle" \| "jaccard" \| "manhattan" \| undefined` |
| `preprocess` | Optional / branch-dependent | `"minmax" \| "none" \| "standardize" \| undefined` |
| `candidateGraph` | Optional / branch-dependent | `string \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
createInferredGraphData({ id, data?, nodeKey, ruleId, rule, features?, metric?, preprocess?, attributes?, options?, candidateGraph?, maxNodes?, maxEdges? })
```

Infer a graph using nearest neighbors, radius, similarity, a spanning tree,
groups, or ordered sequences. Metric and structural rules have distinct options.
See [graph inference](../../api/graphs.md#graph-inference).


## `createParameter`

**API layer:** user-facing. **Authoring roles:** H2.

**Availability:** Development; added after v0.0.13. See [release compatibility](../../version.md).

```typescript
createParameter(options: TargetedOptions<CreateParameterOptions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`CreateParameterOptions`](./../types.md#type-createparameteroptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `id` | Required | `string` |
| `type` | Optional / branch-dependent | `"boolean" \| "number" \| "string" \| undefined` |
| `value` | Required | `string \| number \| boolean \| null` |
| `nullable` | Optional / branch-dependent | `boolean \| undefined` |
| `target` | Optional / branch-dependent | `ActionTargetList \| ScopedActionTarget` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
createParameter({ id, value, type?, nullable? })
```

Create a named number, string, or boolean input for version 2 computed expressions.
A null initial value requires an explicit type and `nullable: true`.
Available in Full and Basic. [Parameters](../../api/data/expressions-and-normalization.md#parameters)


## `editParameter`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Development; added after v0.0.13. See [release compatibility](../../version.md).

```typescript
editParameter(options: TargetedOptions<EditParameterOptions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`EditParameterOptions`](./../types.md#type-editparameteroptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `target` | Required | `string \| ActionTargetList \| ScopedActionTarget` |
| `value` | Required | `ParameterValue` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
editParameter({ target, value })
```

Atomically revise a parameter value, dependent datasets, and their chart consumers.
Type and nullability remain fixed. Available in Full.
[Parameters](../../api/data/expressions-and-normalization.md#parameters)


## `removeParameter`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Development; added after v0.0.13. See [release compatibility](../../version.md).

```typescript
removeParameter(options: TargetedOptions<RemoveParameterOptions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`RemoveParameterOptions`](./../types.md#type-removeparameteroptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `id` | Required | `string` |
| `target` | Optional / branch-dependent | `ActionTargetList \| ScopedActionTarget` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
removeParameter({ id })
```

Remove an existing parameter only after all stored references have been removed.
Available in Full. [Parameters](../../api/data/expressions-and-normalization.md#parameters)


## `createDensityData`

**API layer:** user-facing. **Authoring roles:** H2.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
createDensityData(options: TargetedOptions<DensityDataOptions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`DensityDataOptions`](./../types.md#type-densitydataoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `id` | Required | `string` |
| `source` | Optional / branch-dependent | `string \| undefined` |
| `field` | Required | `string` |
| `groupBy` | Optional / branch-dependent | `string \| undefined` |
| `bandwidth` | Optional / branch-dependent | `number \| "auto" \| undefined` |
| `extent` | Optional / branch-dependent | `"auto" \| readonly [number, number] \| undefined` |
| `steps` | Optional / branch-dependent | `number \| undefined` |
| `kernel` | Optional / branch-dependent | `DensityKernel \| undefined` |
| `normalization` | Optional / branch-dependent | `DensityNormalization \| undefined` |
| `weight` | Optional / branch-dependent | `StatisticalWeight \| undefined` |
| `missing` | Optional / branch-dependent | `"drop" \| "error" \| undefined` |
| `as` | Optional / branch-dependent | `readonly [string, string] \| undefined` |
| `target` | Optional / branch-dependent | `ActionTargetList \| ScopedActionTarget` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
createDensityData({
  id, source?, field, groupBy?, bandwidth?, extent?, steps?,
  kernel?, normalization?, weight?, missing?, as?
})
```

Create immutable KDE rows on one shared inclusive sample grid. Source defaults
to current data, steps to `100`, bandwidth to an automatic Scott-rule estimate,
kernel to `"gaussian"`, and normalization to `"unit"`.
[Data](../../api/data.md)


## `createRegressionData`

**API layer:** user-facing. **Authoring roles:** H2.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
createRegressionData(options: TargetedOptions<RegressionDataOptions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`RegressionDataOptions`](./../types.md#type-regressiondataoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `id` | Required | `string` |
| `source` | Optional / branch-dependent | `string \| undefined` |
| `x` | Required | `string` |
| `y` | Required | `string` |
| `groupBy` | Optional / branch-dependent | `string \| undefined` |
| `missing` | Optional / branch-dependent | `"drop" \| "error" \| undefined` |
| `method` | Optional / branch-dependent | `"exp" \| "linear" \| "loess" \| "polynomial" \| undefined` |
| `interval` | Optional / branch-dependent | `false \| RegressionInterval \| undefined` |
| `degree` | Optional / branch-dependent | `number \| undefined` |
| `span` | Optional / branch-dependent | `number \| undefined` |
| `robustIterations` | Optional / branch-dependent | `number \| undefined` |
| `confidenceMethod` | Optional / branch-dependent | `ConfidenceIntervalMethod \| undefined` |
| `level` | Optional / branch-dependent | `number \| undefined` |
| `confidence` | Optional / branch-dependent | `number \| undefined` |
| `predict` | Optional / branch-dependent | `RegressionPredictOptions \| undefined` |
| `target` | Optional / branch-dependent | `ActionTargetList \| ScopedActionTarget` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
createRegressionData({
  id, source?, x, y, groupBy?, method?, degree?, span?, robustIterations?,
  confidenceMethod?, level?, confidence?, interval?, predict?, missing?
})
```

Create immutable linear, polynomial, LOESS, or exponential fitted rows at observed unique x
values. Linear and polynomial fits support normal or Student-t mean or prediction bounds;
LOESS is line-only, with `degree: 1` (default) or `degree: 2` for a local quadratic fit. Optional `robustIterations` (integer `0..32`, default `0`)
adds residual reweighting; see [regression](../../api/regression.md) for the estimator policy.
[Data](../../api/data.md)


## `createRegressionStatisticsData`

**API layer:** user-facing. **Authoring roles:** H2.

**Availability:** Development; added after v0.0.13. See [release compatibility](../../version.md).

```typescript
createRegressionStatisticsData(options: TargetedOptions<RegressionStatisticsDataOptions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`RegressionStatisticsDataOptions`](./../types.md#type-regressionstatisticsdataoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `id` | Required | `string` |
| `source` | Required | `string` |
| `target` | Optional / branch-dependent | `ActionTargetList \| ScopedActionTarget` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
createRegressionStatisticsData({ id, source })
```

Create observation counts, intercepts, slopes, and R-squared from an explicit existing linear fit.
Grouped fits retain their original grouping field and typed first-seen group order.
Constant responses produce `rSquared: null`.
[Linear fit statistics](../../api/data/statistical-transforms.md#fit-statistics)


## `createWindowData`

**API layer:** user-facing. **Authoring roles:** H2.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
createWindowData(options: TargetedOptions<WindowDataOptions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`WindowDataOptions`](./../types.md#type-windowdataoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `id` | Required | `string` |
| `source` | Optional / branch-dependent | `string \| undefined` |
| `partitionBy` | Optional / branch-dependent | `string \| readonly string[] \| undefined` |
| `sortBy` | Optional / branch-dependent | `readonly WindowSort[] \| undefined` |
| `operations` | Required | `readonly WindowOperation[]` |
| `temporalUnit` | Optional / branch-dependent | `TemporalInputUnit \| undefined` |
| `target` | Optional / branch-dependent | `ActionTargetList \| ScopedActionTarget` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
createWindowData({ id, source?, partitionBy?, sortBy?, operations, temporalUnit? })
```

Create an immutable derived dataset by applying ordered row-number, rank,
dense-rank, cumulative-sum, lag, lead, moving-mean, or moving-sum operations
within optional partitions. Moving frames support row counts or closed elapsed
durations, `minPeriods`, and explicit nullish skipping. The calculation follows
a stable sort while the output preserves source row order.
[Window data transforms](../../api/data/window.md)


## `createTimeUnitData`

**API layer:** user-facing. **Authoring roles:** H2.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
createTimeUnitData(options: TargetedOptions<TimeUnitDataOptions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`TimeUnitDataOptions`](./../types.md#type-timeunitdataoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `missing` | Optional / branch-dependent | `"error" \| "null" \| undefined` |
| `id` | Required | `string` |
| `source` | Optional / branch-dependent | `string \| undefined` |
| `field` | Required | `string` |
| `temporalUnit` | Optional / branch-dependent | `TemporalInputUnit \| undefined` |
| `as` | Optional / branch-dependent | `string \| undefined` |
| `timeZone` | Optional / branch-dependent | `string \| undefined` |
| `unit` | Required | `"day" \| "hour" \| "minute" \| "month" \| "quarter" \| "second" \| "week" \| "weekday" \| "year"` |
| `weekStartsOn` | Optional / branch-dependent | `0 \| 1 \| 2 \| 3 \| 4 \| 5 \| 6 \| undefined` |
| `weekRule` | Optional / branch-dependent | `"calendar" \| "iso" \| undefined` |
| `target` | Optional / branch-dependent | `ActionTargetList \| ScopedActionTarget` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
createTimeUnitData({ id, source?, field, temporalUnit?, unit, as?, timeZone?, weekStartsOn?, weekRule? })
```

Create an immutable row-preserving dataset with one UTC or IANA-zone calendar
bucket timestamp, including week, or a nominal local weekday field.
Omit `as` to use `${field}_${unit}`; output-name collisions are rejected.
[Time-unit data transforms](../../api/data/time-units.md)


## `createBin2DData`

**API layer:** user-facing. **Authoring roles:** H2.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
createBin2DData(options: TargetedOptions<Bin2DDataOptions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`Bin2DDataOptions`](./../types.md#type-bin2ddataoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `id` | Required | `string` |
| `source` | Optional / branch-dependent | `string \| undefined` |
| `x` | Required | `string` |
| `y` | Required | `string` |
| `bins` | Optional / branch-dependent | `number \| Bin2DCounts \| undefined` |
| `extent` | Optional / branch-dependent | `Bin2DExtent \| undefined` |
| `assignment` | Optional / branch-dependent | `"edges" \| "step" \| undefined` |
| `includeEmpty` | Optional / branch-dependent | `boolean \| undefined` |
| `members` | Optional / branch-dependent | `boolean \| undefined` |
| `as` | Optional / branch-dependent | `Bin2DOutputFields \| undefined` |
| `target` | Optional / branch-dependent | `ActionTargetList \| ScopedActionTarget` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
createBin2DData({
  id, source?, x, y, bins?, extent?, includeEmpty?, members?, as?
})
```

Aggregate finite x/y pairs into deterministic rectangular cell bounds and
counts. Reusing the logical ID creates an immutable revision and rematerializes
direct visual consumers. [Rectangular 2D bins](../../api/data/bin2d.md)


## `editBin2DData`

**API layer:** user-facing. **Authoring roles:** H2.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
editBin2DData(options: TargetedOptions<EditBin2DDataOptions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`EditBin2DDataOptions`](./../types.md#type-editbin2ddataoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `target` | Optional / branch-dependent | `string \| ActionTargetList \| ScopedActionTarget \| undefined` |
| `source` | Optional / branch-dependent | `string \| undefined` |
| `x` | Optional / branch-dependent | `string \| undefined` |
| `y` | Optional / branch-dependent | `string \| undefined` |
| `bins` | Optional / branch-dependent | `number \| Bin2DCounts \| undefined` |
| `extent` | Optional / branch-dependent | `Bin2DExtent \| undefined` |
| `assignment` | Optional / branch-dependent | `"edges" \| "step" \| undefined` |
| `includeEmpty` | Optional / branch-dependent | `boolean \| undefined` |
| `members` | Optional / branch-dependent | `boolean \| undefined` |
| `as` | Optional / branch-dependent | `DatasetBin2DOutputFields \| undefined` |
| `dependents` | Optional / branch-dependent | `DerivedDataDependents \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
editBin2DData({
  target?, source?, x?, y?, bins?, extent?, includeEmpty?, members?, as?,
  dependents?
})
```

Partially revise the current or unique logical 2D-bin owner. Omitted top-level
transform options are preserved; successful edits create an immutable revision,
rebind direct visual consumers, and safely release the prior revision.
[Rectangular 2D bins](../../api/data/bin2d.md#editbin2ddata)


## `editDerivedData`

**API layer:** user-facing. **Authoring roles:** H2.

**Availability:** Development; added after v0.0.13. See [release compatibility](../../version.md).

```typescript
editDerivedData(options: TargetedOptions<EditDerivedDataOptions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`EditDerivedDataOptions`](./../types.md#type-editderiveddataoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `target` | Required | `string \| ActionTargetList \| ScopedActionTarget` |
| `definition` | Required | `RequestedDatasetTransform` |
| `dependents` | Optional / branch-dependent | `DerivedDataDependents \| undefined` |

</details>

Behavior, inference, resets, and errors: [Focused core data editing](./charts-data.md#focused-core-data-editing).



## `editFilteredData`

**API layer:** user-facing. **Authoring roles:** H2.

**Availability:** Development; added after v0.0.13. See [release compatibility](../../version.md).

```typescript
editFilteredData(options: TargetedOptions<EditFilteredDataOptions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`EditFilteredDataOptions`](./../types.md#type-editfiltereddataoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `where` | Optional / branch-dependent | `ComputedExpressionV2 \| undefined` |
| `field` | Optional / branch-dependent | `string \| undefined` |
| `nulls` | Optional / branch-dependent | `"exclude" \| "include" \| false \| undefined` |
| `oneOf` | Optional / branch-dependent | `readonly [DatasetScalar, ...DatasetScalar[]] \| undefined` |
| `noneOf` | Optional / branch-dependent | `readonly [DatasetScalar, ...DatasetScalar[]] \| undefined` |
| `predicate` | Optional / branch-dependent | `FilterComparison \| undefined` |
| `range` | Optional / branch-dependent | `FilterRangePatch \| undefined` |
| `target` | Required | `string \| ActionTargetList \| ScopedActionTarget` |
| `dependents` | Optional / branch-dependent | `DerivedDataDependents \| undefined` |

</details>

Behavior, inference, resets, and errors: [Focused core data editing](./charts-data.md#focused-core-data-editing).



## `editTimeUnitData`

**API layer:** user-facing. **Authoring roles:** H2.

**Availability:** Development; added after v0.0.13. See [release compatibility](../../version.md).

```typescript
editTimeUnitData(options: TargetedOptions<EditTimeUnitDataOptions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`EditTimeUnitDataOptions`](./../types.md#type-edittimeunitdataoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `target` | Required | `string \| ActionTargetList \| ScopedActionTarget` |
| `dependents` | Optional / branch-dependent | `DerivedDataDependents \| undefined` |
| `missing` | Optional / branch-dependent | `"error" \| "null" \| undefined` |
| `field` | Optional / branch-dependent | `string \| undefined` |
| `temporalUnit` | Optional / branch-dependent | `TemporalInputUnit \| undefined` |
| `as` | Optional / branch-dependent | `string \| undefined` |
| `timeZone` | Optional / branch-dependent | `string \| undefined` |
| `unit` | Optional / branch-dependent | `"day" \| "hour" \| "minute" \| "month" \| "quarter" \| "second" \| "week" \| "weekday" \| "year" \| undefined` |
| `weekStartsOn` | Optional / branch-dependent | `0 \| 1 \| 2 \| 3 \| 4 \| 5 \| 6 \| undefined` |
| `weekRule` | Optional / branch-dependent | `"calendar" \| "iso" \| undefined` |

</details>

Behavior, inference, resets, and errors: [Focused core data editing](./charts-data.md#focused-core-data-editing).



## `editWindowData`

**API layer:** user-facing. **Authoring roles:** H2.

**Availability:** Development; added after v0.0.13. See [release compatibility](../../version.md).

```typescript
editWindowData(options: TargetedOptions<EditWindowDataOptions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`EditWindowDataOptions`](./../types.md#type-editwindowdataoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `target` | Required | `string \| ActionTargetList \| ScopedActionTarget` |
| `dependents` | Optional / branch-dependent | `DerivedDataDependents \| undefined` |
| `partitionBy` | Optional / branch-dependent | `string \| readonly string[] \| undefined` |
| `sortBy` | Optional / branch-dependent | `readonly WindowSort[] \| undefined` |
| `operations` | Optional / branch-dependent | `readonly WindowOperation[] \| undefined` |
| `temporalUnit` | Optional / branch-dependent | `TemporalInputUnit \| undefined` |

</details>

Behavior, inference, resets, and errors: [Focused core data editing](./charts-data.md#focused-core-data-editing).



## `editDensityData`

**API layer:** user-facing. **Authoring roles:** H2.

**Availability:** Development; added after v0.0.13. See [release compatibility](../../version.md).

```typescript
editDensityData(options: TargetedOptions<EditDensityDataOptions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`EditDensityDataOptions`](./../types.md#type-editdensitydataoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `target` | Required | `string \| ActionTargetList \| ScopedActionTarget` |
| `dependents` | Optional / branch-dependent | `DerivedDataDependents \| undefined` |
| `field` | Optional / branch-dependent | `string \| undefined` |
| `groupBy` | Optional / branch-dependent | `string \| undefined` |
| `bandwidth` | Optional / branch-dependent | `number \| "auto" \| undefined` |
| `extent` | Optional / branch-dependent | `"auto" \| readonly [number, number] \| undefined` |
| `steps` | Optional / branch-dependent | `number \| undefined` |
| `kernel` | Optional / branch-dependent | `DensityKernel \| undefined` |
| `normalization` | Optional / branch-dependent | `DensityNormalization \| undefined` |
| `missing` | Optional / branch-dependent | `"drop" \| "error" \| undefined` |
| `as` | Optional / branch-dependent | `readonly [string, string] \| undefined` |
| `weight` | Optional / branch-dependent | `false \| StatisticalWeight \| undefined` |

</details>

Behavior, inference, resets, and errors: [Focused core data editing](./charts-data.md#focused-core-data-editing).



## `editRegressionData`

**API layer:** user-facing. **Authoring roles:** H2.

**Availability:** Development; added after v0.0.13. See [release compatibility](../../version.md).

```typescript
editRegressionData(options: TargetedOptions<EditRegressionDataOptions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`EditRegressionDataOptions`](./../types.md#type-editregressiondataoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `target` | Required | `string \| ActionTargetList \| ScopedActionTarget` |
| `dependents` | Optional / branch-dependent | `DerivedDataDependents \| undefined` |
| `method` | Optional / branch-dependent | `"exp" \| "linear" \| "loess" \| "polynomial" \| undefined` |
| `interval` | Optional / branch-dependent | `false \| RegressionInterval \| undefined` |
| `degree` | Optional / branch-dependent | `number \| undefined` |
| `span` | Optional / branch-dependent | `number \| undefined` |
| `robustIterations` | Optional / branch-dependent | `number \| undefined` |
| `confidenceMethod` | Optional / branch-dependent | `ConfidenceIntervalMethod \| undefined` |
| `level` | Optional / branch-dependent | `number \| undefined` |
| `confidence` | Optional / branch-dependent | `number \| undefined` |
| `predict` | Optional / branch-dependent | `RegressionPredictOptions \| undefined` |
| `x` | Optional / branch-dependent | `string \| undefined` |
| `y` | Optional / branch-dependent | `string \| undefined` |
| `groupBy` | Optional / branch-dependent | `string \| undefined` |
| `missing` | Optional / branch-dependent | `"drop" \| "error" \| undefined` |

</details>

Behavior, inference, resets, and errors: [Focused core data editing](./charts-data.md#focused-core-data-editing).



## `editRegressionStatisticsData`

**API layer:** user-facing. **Authoring roles:** H2.

**Availability:** Development; added after v0.0.13. See [release compatibility](../../version.md).

```typescript
editRegressionStatisticsData(options?: TargetedOptions<EditRegressionStatisticsDataOptions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`EditRegressionStatisticsDataOptions`](./../types.md#type-editregressionstatisticsdataoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `target` | Optional / branch-dependent | `string \| ActionTargetList \| ScopedActionTarget \| undefined` |
| `source` | Optional / branch-dependent | `string \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
editRegressionStatisticsData({ target?, source? })
```

Revise a standalone statistics owner's linear fit source and replay its consumers atomically.
Omitted source preserves the current fit. Target omission requires a current or unique statistics owner.
[Linear fit statistics](../../api/data/statistical-transforms.md#fit-statistics)


## `createCoordinate`

**API layer:** user-facing. **Authoring roles:** H2.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
createCoordinate(options?: TargetedOptions<CreateCoordinateOptions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`CreateCoordinateOptions`](./../types.md#type-createcoordinateoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `id` | Optional / branch-dependent | `string \| undefined` |
| `type` | Optional / branch-dependent | `"cartesian" \| "parallel" \| "polar" \| undefined` |
| `layers` | Optional / branch-dependent | `readonly string[] \| undefined` |
| `target` | Optional / branch-dependent | `ActionTargetList \| ScopedActionTarget` |

</details>

Behavior, inference, resets, and errors: [Semantic resources and regression layers](./statistics.md#semantic-resources-and-regression-layers).



## `editCoordinate`

**API layer:** user-facing. **Authoring roles:** H2.

**Availability:** Development; added after v0.0.13. See [release compatibility](../../version.md).

```typescript
editCoordinate(options: TargetedOptions<EditCoordinateOptions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`EditCoordinateOptions`](./../types.md#type-editcoordinateoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `target` | Required | `string \| ActionTargetList \| ScopedActionTarget` |
| `aspect` | Optional / branch-dependent | `CoordinateAspect \| undefined` |
| `polarFrame` | Optional / branch-dependent | `PolarFrameOptions \| undefined` |

</details>

Behavior, inference, resets, and errors: [Semantic resources and regression layers](./statistics.md#semantic-resources-and-regression-layers).



## `createScale`

**API layer:** user-facing. **Authoring roles:** H2.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
createScale(options: TargetedOptions<CreateScaleOptions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`CreateScaleOptions`](./../types.md#type-createscaleoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `radialMapping` | Optional / branch-dependent | `RadialMapping \| undefined` |
| `id` | Required | `string` |
| `type` | Optional / branch-dependent | `ScaleType \| undefined` |
| `domain` | Optional / branch-dependent | `"auto" \| readonly unknown[] \| undefined` |
| `emptyDomain` | Optional / branch-dependent | `"preserve" \| "require-explicit" \| undefined` |
| `range` | Optional / branch-dependent | `ScaleRange \| undefined` |
| `nice` | Optional / branch-dependent | `boolean \| LinearNiceCountOptions \| undefined` |
| `zero` | Optional / branch-dependent | `boolean \| undefined` |
| `clamp` | Optional / branch-dependent | `boolean \| undefined` |
| `reverse` | Optional / branch-dependent | `boolean \| undefined` |
| `base` | Optional / branch-dependent | `number \| undefined` |
| `exponent` | Optional / branch-dependent | `number \| undefined` |
| `constant` | Optional / branch-dependent | `number \| undefined` |
| `paddingInner` | Optional / branch-dependent | `number \| undefined` |
| `paddingOuter` | Optional / branch-dependent | `number \| undefined` |
| `padding` | Optional / branch-dependent | `number \| undefined` |
| `align` | Optional / branch-dependent | `number \| undefined` |
| `palette` | Optional / branch-dependent | `Palette \| undefined` |
| `interpolate` | Optional / branch-dependent | `ContinuousColorInterpolation \| undefined` |
| `whitePoint` | Optional / branch-dependent | `"d50" \| "d65" \| undefined` |
| `gamma` | Optional / branch-dependent | `number \| undefined` |
| `midpoint` | Optional / branch-dependent | `number \| "auto" \| undefined` |
| `unknown` | Optional / branch-dependent | `unknown` |
| `target` | Optional / branch-dependent | `ActionTargetList \| ScopedActionTarget` |

</details>

Behavior, inference, resets, and errors: [Extension and scale contracts](./extension.md#extension-actions).



## `editScale`

**API layer:** user-facing. **Authoring roles:** H2.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
editScale(options: TargetedOptions<EditScaleOptions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`EditScaleOptions`](./../types.md#type-editscaleoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `radialMapping` | Optional / branch-dependent | `RadialMapping \| undefined` |
| `id` | Optional / branch-dependent | `string \| undefined` |
| `type` | Optional / branch-dependent | `ScaleType \| undefined` |
| `domain` | Optional / branch-dependent | `"auto" \| readonly unknown[] \| undefined` |
| `emptyDomain` | Optional / branch-dependent | `"preserve" \| "require-explicit" \| undefined` |
| `range` | Optional / branch-dependent | `ScaleRange \| undefined` |
| `nice` | Optional / branch-dependent | `boolean \| LinearNiceCountOptions \| undefined` |
| `zero` | Optional / branch-dependent | `boolean \| undefined` |
| `clamp` | Optional / branch-dependent | `boolean \| undefined` |
| `reverse` | Optional / branch-dependent | `boolean \| undefined` |
| `base` | Optional / branch-dependent | `number \| undefined` |
| `exponent` | Optional / branch-dependent | `number \| undefined` |
| `constant` | Optional / branch-dependent | `number \| undefined` |
| `paddingInner` | Optional / branch-dependent | `number \| undefined` |
| `paddingOuter` | Optional / branch-dependent | `number \| undefined` |
| `padding` | Optional / branch-dependent | `number \| undefined` |
| `align` | Optional / branch-dependent | `number \| undefined` |
| `palette` | Optional / branch-dependent | `Palette \| undefined` |
| `interpolate` | Optional / branch-dependent | `ContinuousColorInterpolation \| undefined` |
| `whitePoint` | Optional / branch-dependent | `"auto" \| "d50" \| "d65" \| undefined` |
| `gamma` | Optional / branch-dependent | `number \| "auto" \| undefined` |
| `midpoint` | Optional / branch-dependent | `number \| "auto" \| undefined` |
| `unknown` | Optional / branch-dependent | `unknown` |
| `target` | Optional / branch-dependent | `ActionTargetList \| ScopedActionTarget` |

</details>

Behavior, inference, resets, and errors: [Extension and scale contracts](./extension.md#extension-actions).



## `editXScale`

**API layer:** user-facing. **Authoring roles:** H2.

**Availability:** Development; added after v0.0.13. See [release compatibility](../../version.md).

```typescript
editXScale(options: TargetedOptions<EditXScaleOptions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`EditXScaleOptions`](./../types.md#type-editxscaleoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `id` | Optional / branch-dependent | `string \| undefined` |
| `target` | Optional / branch-dependent | `string \| ActionTargetList \| ScopedActionTarget \| undefined` |
| `reverse` | Optional / branch-dependent | `boolean \| undefined` |
| `type` | Optional / branch-dependent | `"band" \| "linear" \| "log" \| "point" \| "pow" \| "sqrt" \| "symlog" \| "time" \| undefined` |
| `domain` | Optional / branch-dependent | `"auto" \| readonly unknown[] \| readonly [number, number] \| undefined` |
| `range` | Optional / branch-dependent | `"auto" \| readonly [number, number] \| undefined` |
| `unknown` | Optional / branch-dependent | `number \| undefined` |
| `paddingInner` | Optional / branch-dependent | `number \| undefined` |
| `paddingOuter` | Optional / branch-dependent | `number \| undefined` |
| `align` | Optional / branch-dependent | `number \| undefined` |
| `padding` | Optional / branch-dependent | `number \| undefined` |
| `clamp` | Optional / branch-dependent | `boolean \| undefined` |
| `nice` | Optional / branch-dependent | `boolean \| undefined` |
| `zero` | Optional / branch-dependent | `boolean \| undefined` |
| `base` | Optional / branch-dependent | `number \| undefined` |
| `exponent` | Optional / branch-dependent | `number \| undefined` |
| `constant` | Optional / branch-dependent | `number \| undefined` |

</details>

Behavior, inference, resets, and errors: [Focused channel scale editors](./charts-data.md#focused-channel-scale-editors).



## `editYScale`

**API layer:** user-facing. **Authoring roles:** H2.

**Availability:** Development; added after v0.0.13. See [release compatibility](../../version.md).

```typescript
editYScale(options: TargetedOptions<EditYScaleOptions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`EditYScaleOptions`](./../types.md#type-edityscaleoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `id` | Optional / branch-dependent | `string \| undefined` |
| `target` | Optional / branch-dependent | `string \| ActionTargetList \| ScopedActionTarget \| undefined` |
| `reverse` | Optional / branch-dependent | `boolean \| undefined` |
| `type` | Optional / branch-dependent | `"band" \| "linear" \| "log" \| "point" \| "pow" \| "sqrt" \| "symlog" \| "time" \| undefined` |
| `domain` | Optional / branch-dependent | `"auto" \| readonly unknown[] \| readonly [number, number] \| undefined` |
| `range` | Optional / branch-dependent | `"auto" \| readonly [number, number] \| undefined` |
| `unknown` | Optional / branch-dependent | `number \| undefined` |
| `paddingInner` | Optional / branch-dependent | `number \| undefined` |
| `paddingOuter` | Optional / branch-dependent | `number \| undefined` |
| `align` | Optional / branch-dependent | `number \| undefined` |
| `padding` | Optional / branch-dependent | `number \| undefined` |
| `clamp` | Optional / branch-dependent | `boolean \| undefined` |
| `nice` | Optional / branch-dependent | `boolean \| undefined` |
| `zero` | Optional / branch-dependent | `boolean \| undefined` |
| `base` | Optional / branch-dependent | `number \| undefined` |
| `exponent` | Optional / branch-dependent | `number \| undefined` |
| `constant` | Optional / branch-dependent | `number \| undefined` |

</details>

Behavior, inference, resets, and errors: [Focused channel scale editors](./charts-data.md#focused-channel-scale-editors).



## `editXOffsetScale`

**API layer:** user-facing. **Authoring roles:** H2.

**Availability:** Development; added after v0.0.13. See [release compatibility](../../version.md).

```typescript
editXOffsetScale(options: TargetedOptions<EditXOffsetScaleOptions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`EditXOffsetScaleOptions`](./../types.md#type-editxoffsetscaleoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `target` | Required | `string \| ActionTargetList \| ScopedActionTarget` |
| `domain` | Optional / branch-dependent | `"auto" \| readonly unknown[] \| undefined` |
| `reverse` | Optional / branch-dependent | `boolean \| undefined` |
| `paddingInner` | Optional / branch-dependent | `number \| undefined` |
| `paddingOuter` | Optional / branch-dependent | `number \| undefined` |
| `padding` | Optional / branch-dependent | `number \| undefined` |
| `align` | Optional / branch-dependent | `number \| undefined` |

</details>

Behavior, inference, resets, and errors: [Focused channel scale editors](./charts-data.md#focused-channel-scale-editors).



## `editYOffsetScale`

**API layer:** user-facing. **Authoring roles:** H2.

**Availability:** Development; added after v0.0.13. See [release compatibility](../../version.md).

```typescript
editYOffsetScale(options: TargetedOptions<EditYOffsetScaleOptions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`EditYOffsetScaleOptions`](./../types.md#type-edityoffsetscaleoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `target` | Required | `string \| ActionTargetList \| ScopedActionTarget` |
| `domain` | Optional / branch-dependent | `"auto" \| readonly unknown[] \| undefined` |
| `reverse` | Optional / branch-dependent | `boolean \| undefined` |
| `paddingInner` | Optional / branch-dependent | `number \| undefined` |
| `paddingOuter` | Optional / branch-dependent | `number \| undefined` |
| `padding` | Optional / branch-dependent | `number \| undefined` |
| `align` | Optional / branch-dependent | `number \| undefined` |

</details>

Behavior, inference, resets, and errors: [Focused channel scale editors](./charts-data.md#focused-channel-scale-editors).



## `editParallelScale`

**API layer:** user-facing. **Authoring roles:** H2.

**Availability:** Development; added after v0.0.13. See [release compatibility](../../version.md).

```typescript
editParallelScale(options: TargetedOptions<EditParallelScaleOptions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`EditParallelScaleOptions`](./../types.md#type-editparallelscaleoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `target` | Required | `string \| ActionTargetList \| ScopedActionTarget` |
| `dimension` | Required | `string` |
| `reverse` | Optional / branch-dependent | `boolean \| undefined` |
| `type` | Optional / branch-dependent | `"band" \| "linear" \| "log" \| "point" \| "pow" \| "sqrt" \| "symlog" \| undefined` |
| `domain` | Optional / branch-dependent | `"auto" \| readonly unknown[] \| readonly [number, number] \| undefined` |
| `range` | Optional / branch-dependent | `"auto" \| readonly [number, number] \| undefined` |
| `unknown` | Optional / branch-dependent | `number \| undefined` |
| `paddingInner` | Optional / branch-dependent | `number \| undefined` |
| `paddingOuter` | Optional / branch-dependent | `number \| undefined` |
| `align` | Optional / branch-dependent | `number \| undefined` |
| `padding` | Optional / branch-dependent | `number \| undefined` |
| `zero` | Optional / branch-dependent | `boolean \| undefined` |
| `clamp` | Optional / branch-dependent | `boolean \| undefined` |
| `base` | Optional / branch-dependent | `number \| undefined` |
| `exponent` | Optional / branch-dependent | `number \| undefined` |
| `constant` | Optional / branch-dependent | `number \| undefined` |
| `nice` | Optional / branch-dependent | `boolean \| LinearNiceCountOptions \| undefined` |

</details>

Behavior, inference, resets, and errors: [Focused channel scale editors](./charts-data.md#focused-channel-scale-editors).



## `editThetaScale`

**API layer:** user-facing. **Authoring roles:** H2.

**Availability:** Development; added after v0.0.13. See [release compatibility](../../version.md).

```typescript
editThetaScale(options: TargetedOptions<EditThetaScaleOptions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`EditThetaScaleOptions`](./../types.md#type-editthetascaleoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `id` | Optional / branch-dependent | `string \| undefined` |
| `target` | Optional / branch-dependent | `string \| ActionTargetList \| ScopedActionTarget \| undefined` |
| `type` | Optional / branch-dependent | `"band" \| "linear" \| "point" \| "time" \| undefined` |
| `domain` | Optional / branch-dependent | `"auto" \| readonly unknown[] \| undefined` |
| `range` | Optional / branch-dependent | `"auto" \| readonly [number, number] \| undefined` |
| `nice` | Optional / branch-dependent | `boolean \| undefined` |
| `zero` | Optional / branch-dependent | `boolean \| undefined` |
| `clamp` | Optional / branch-dependent | `boolean \| undefined` |
| `reverse` | Optional / branch-dependent | `boolean \| undefined` |
| `paddingInner` | Optional / branch-dependent | `number \| undefined` |
| `paddingOuter` | Optional / branch-dependent | `number \| undefined` |
| `padding` | Optional / branch-dependent | `number \| undefined` |
| `align` | Optional / branch-dependent | `number \| undefined` |

</details>

Behavior, inference, resets, and errors: [Focused channel scale editors](./charts-data.md#focused-channel-scale-editors).



## `editRScale`

**API layer:** user-facing. **Authoring roles:** H2.

**Availability:** Development; added after v0.0.13. See [release compatibility](../../version.md).

```typescript
editRScale(options: TargetedOptions<EditRScaleOptions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`EditRScaleOptions`](./../types.md#type-editrscaleoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `id` | Optional / branch-dependent | `string \| undefined` |
| `target` | Optional / branch-dependent | `string \| ActionTargetList \| ScopedActionTarget \| undefined` |
| `type` | Optional / branch-dependent | `"linear" \| "log" \| "pow" \| "sqrt" \| "symlog" \| undefined` |
| `domain` | Optional / branch-dependent | `"auto" \| readonly [number, number] \| undefined` |
| `range` | Optional / branch-dependent | `"auto" \| readonly [number, number] \| undefined` |
| `nice` | Optional / branch-dependent | `boolean \| undefined` |
| `zero` | Optional / branch-dependent | `boolean \| undefined` |
| `clamp` | Optional / branch-dependent | `boolean \| undefined` |
| `reverse` | Optional / branch-dependent | `boolean \| undefined` |
| `base` | Optional / branch-dependent | `number \| undefined` |
| `exponent` | Optional / branch-dependent | `number \| undefined` |
| `constant` | Optional / branch-dependent | `number \| undefined` |
| `radialMapping` | Optional / branch-dependent | `RadialMapping \| undefined` |

</details>

Behavior, inference, resets, and errors: [Focused channel scale editors](./charts-data.md#focused-channel-scale-editors).



## `editColorScale`

**API layer:** user-facing. **Authoring roles:** H2.

**Availability:** Development; added after v0.0.13. See [release compatibility](../../version.md).

```typescript
editColorScale(options: TargetedOptions<EditColorScaleOptions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`EditColorScaleOptions`](./../types.md#type-editcolorscaleoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `id` | Optional / branch-dependent | `string \| undefined` |
| `target` | Optional / branch-dependent | `string \| ActionTargetList \| ScopedActionTarget \| undefined` |
| `domain` | Optional / branch-dependent | `"auto" \| readonly unknown[] \| readonly number[] \| readonly [unknown, unknown] \| readonly [number, number] \| undefined` |
| `range` | Optional / branch-dependent | `"auto" \| readonly string[] \| { readonly palette: Palette; } \| { readonly palette: Palette; } \| readonly [string, string, ...string[]] \| undefined` |
| `palette` | Optional / branch-dependent | `"accent" \| "bluegreen" \| "blueorange" \| "bluepurple" \| "blues" \| "brownbluegreen" \| "browns" \| "category10" \| "category20" \| "category20b" \| "category20c" \| "cividis" \| "dark2" \| ... 59 more ... \| undefined` |
| `type` | Optional / branch-dependent | `"log" \| "ordinal" \| "pow" \| "quantile" \| "quantize" \| "sequential" \| "sqrt" \| "symlog" \| "threshold" \| undefined` |
| `unknown` | Optional / branch-dependent | `string \| undefined` |
| `whitePoint` | Optional / branch-dependent | `"auto" \| "d50" \| "d65" \| undefined` |
| `gamma` | Optional / branch-dependent | `number \| "auto" \| undefined` |
| `clamp` | Optional / branch-dependent | `boolean \| undefined` |
| `reverse` | Optional / branch-dependent | `boolean \| undefined` |
| `interpolate` | Optional / branch-dependent | `ContinuousColorInterpolation \| undefined` |
| `midpoint` | Optional / branch-dependent | `number \| "auto" \| undefined` |
| `base` | Optional / branch-dependent | `number \| undefined` |
| `constant` | Optional / branch-dependent | `number \| undefined` |
| `exponent` | Optional / branch-dependent | `number \| undefined` |

</details>

Behavior, inference, resets, and errors: [Focused channel scale editors](./charts-data.md#focused-channel-scale-editors).



## `editStrokeScale`

**API layer:** user-facing. **Authoring roles:** H2.

**Availability:** Development; added after v0.0.13. See [release compatibility](../../version.md).

```typescript
editStrokeScale(options: TargetedOptions<EditStrokeScaleOptions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`EditStrokeScaleOptions`](./../types.md#type-editstrokescaleoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `target` | Required | `string \| ActionTargetList \| ScopedActionTarget` |
| `whitePoint` | Optional / branch-dependent | `"auto" \| "d50" \| "d65" \| undefined` |
| `gamma` | Optional / branch-dependent | `number \| "auto" \| undefined` |
| `domain` | Optional / branch-dependent | `"auto" \| readonly unknown[] \| readonly number[] \| readonly [unknown, unknown] \| readonly [number, number] \| undefined` |
| `range` | Optional / branch-dependent | `"auto" \| readonly string[] \| { readonly palette: Palette; } \| { readonly palette: Palette; } \| readonly [string, string, ...string[]] \| undefined` |
| `palette` | Optional / branch-dependent | `"accent" \| "bluegreen" \| "blueorange" \| "bluepurple" \| "blues" \| "brownbluegreen" \| "browns" \| "category10" \| "category20" \| "category20b" \| "category20c" \| "cividis" \| "dark2" \| ... 59 more ... \| undefined` |
| `type` | Optional / branch-dependent | `"log" \| "ordinal" \| "pow" \| "quantile" \| "quantize" \| "sequential" \| "sqrt" \| "symlog" \| "threshold" \| undefined` |
| `unknown` | Optional / branch-dependent | `string \| undefined` |
| `clamp` | Optional / branch-dependent | `boolean \| undefined` |
| `reverse` | Optional / branch-dependent | `boolean \| undefined` |
| `interpolate` | Optional / branch-dependent | `ContinuousColorInterpolation \| undefined` |
| `midpoint` | Optional / branch-dependent | `number \| "auto" \| undefined` |
| `base` | Optional / branch-dependent | `number \| undefined` |
| `constant` | Optional / branch-dependent | `number \| undefined` |
| `exponent` | Optional / branch-dependent | `number \| undefined` |

</details>

Behavior, inference, resets, and errors: [Focused channel scale editors](./charts-data.md#focused-channel-scale-editors).



## `editSizeScale`

**API layer:** user-facing. **Authoring roles:** H2.

**Availability:** Development; added after v0.0.13. See [release compatibility](../../version.md).

```typescript
editSizeScale(options: TargetedOptions<EditSizeScaleOptions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`EditSizeScaleOptions`](./../types.md#type-editsizescaleoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `id` | Optional / branch-dependent | `string \| undefined` |
| `target` | Optional / branch-dependent | `string \| ActionTargetList \| ScopedActionTarget \| undefined` |
| `type` | Optional / branch-dependent | `"linear" \| "log" \| "ordinal" \| "pow" \| "quantile" \| "quantize" \| "sqrt" \| "threshold" \| undefined` |
| `domain` | Optional / branch-dependent | `"auto" \| readonly (string \| number \| boolean)[] \| readonly [number, number] \| readonly [number, ...number[]] \| readonly [string \| number \| boolean, ...(string \| number \| boolean)[]] \| undefined` |
| `range` | Optional / branch-dependent | `"auto" \| readonly [number, number] \| readonly [number, ...number[]] \| readonly [number, number, ...number[]] \| undefined` |
| `unknown` | Optional / branch-dependent | `number \| undefined` |
| `clamp` | Optional / branch-dependent | `boolean \| undefined` |
| `reverse` | Optional / branch-dependent | `boolean \| undefined` |
| `base` | Optional / branch-dependent | `number \| undefined` |
| `exponent` | Optional / branch-dependent | `number \| undefined` |

</details>

Behavior, inference, resets, and errors: [Focused channel scale editors](./charts-data.md#focused-channel-scale-editors).



## `editOpacityScale`

**API layer:** user-facing. **Authoring roles:** H2.

**Availability:** Development; added after v0.0.13. See [release compatibility](../../version.md).

```typescript
editOpacityScale(options: TargetedOptions<EditOpacityScaleOptions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`EditOpacityScaleOptions`](./../types.md#type-editopacityscaleoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `id` | Optional / branch-dependent | `string \| undefined` |
| `target` | Optional / branch-dependent | `string \| ActionTargetList \| ScopedActionTarget \| undefined` |
| `zero` | Optional / branch-dependent | `boolean \| undefined` |
| `clamp` | Optional / branch-dependent | `boolean \| undefined` |
| `reverse` | Optional / branch-dependent | `boolean \| undefined` |
| `nice` | Optional / branch-dependent | `boolean \| undefined` |
| `type` | Optional / branch-dependent | `"linear" \| undefined` |
| `domain` | Optional / branch-dependent | `"auto" \| readonly [number, number] \| undefined` |
| `range` | Optional / branch-dependent | `"auto" \| readonly [number, number] \| undefined` |
| `unknown` | Optional / branch-dependent | `number \| undefined` |

</details>

Behavior, inference, resets, and errors: [Focused channel scale editors](./charts-data.md#focused-channel-scale-editors).



## `editShapeScale`

**API layer:** user-facing. **Authoring roles:** H2.

**Availability:** Development; added after v0.0.13. See [release compatibility](../../version.md).

```typescript
editShapeScale(options: TargetedOptions<EditShapeScaleOptions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`EditShapeScaleOptions`](./../types.md#type-editshapescaleoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `id` | Optional / branch-dependent | `string \| undefined` |
| `target` | Optional / branch-dependent | `string \| ActionTargetList \| ScopedActionTarget \| undefined` |
| `type` | Optional / branch-dependent | `"ordinal" \| undefined` |
| `domain` | Optional / branch-dependent | `"auto" \| readonly unknown[] \| undefined` |
| `range` | Optional / branch-dependent | `"auto" \| readonly PointShape[] \| undefined` |
| `unknown` | Optional / branch-dependent | `PointShape \| undefined` |

</details>

Behavior, inference, resets, and errors: [Focused channel scale editors](./charts-data.md#focused-channel-scale-editors).



## `editStrokeWidthScale`

**API layer:** user-facing. **Authoring roles:** H2.

**Availability:** Development; added after v0.0.13. See [release compatibility](../../version.md).

```typescript
editStrokeWidthScale(options: TargetedOptions<EditStrokeWidthScaleOptions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`EditStrokeWidthScaleOptions`](./../types.md#type-editstrokewidthscaleoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `id` | Optional / branch-dependent | `string \| undefined` |
| `target` | Optional / branch-dependent | `string \| ActionTargetList \| ScopedActionTarget \| undefined` |
| `zero` | Optional / branch-dependent | `boolean \| undefined` |
| `clamp` | Optional / branch-dependent | `boolean \| undefined` |
| `reverse` | Optional / branch-dependent | `boolean \| undefined` |
| `base` | Optional / branch-dependent | `number \| undefined` |
| `exponent` | Optional / branch-dependent | `number \| undefined` |
| `constant` | Optional / branch-dependent | `number \| undefined` |
| `domain` | Optional / branch-dependent | `"auto" \| readonly [number, number] \| undefined` |
| `range` | Optional / branch-dependent | `"auto" \| readonly [number, number] \| undefined` |
| `type` | Optional / branch-dependent | `"linear" \| "log" \| "pow" \| "sqrt" \| "symlog" \| undefined` |
| `nice` | Optional / branch-dependent | `boolean \| undefined` |

</details>

Behavior, inference, resets, and errors: [Focused channel scale editors](./charts-data.md#focused-channel-scale-editors).



## `editStrokeDashScale`

**API layer:** user-facing. **Authoring roles:** H2.

**Availability:** Development; added after v0.0.13. See [release compatibility](../../version.md).

```typescript
editStrokeDashScale(options: TargetedOptions<EditStrokeDashScaleOptions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`EditStrokeDashScaleOptions`](./../types.md#type-editstrokedashscaleoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `id` | Optional / branch-dependent | `string \| undefined` |
| `target` | Optional / branch-dependent | `string \| ActionTargetList \| ScopedActionTarget \| undefined` |
| `type` | Optional / branch-dependent | `"ordinal" \| undefined` |
| `domain` | Optional / branch-dependent | `"auto" \| readonly unknown[] \| undefined` |
| `range` | Optional / branch-dependent | `"auto" \| readonly (DashPattern \| DashStyle)[] \| undefined` |
| `unknown` | Optional / branch-dependent | `DashPattern \| DashStyle \| undefined` |

</details>

Behavior, inference, resets, and errors: [Focused channel scale editors](./charts-data.md#focused-channel-scale-editors).



## `createDerivedData`

**API layer:** user-facing. **Authoring roles:** H2.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
createDerivedData(options: TargetedOptions<CreateDerivedDataOptions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`CreateDerivedDataOptions`](./../types.md#type-createderiveddataoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `id` | Required | `string` |
| `source` | Required | `string` |
| `transform` | Required | `readonly [DatasetTransform]` |
| `target` | Optional / branch-dependent | `ActionTargetList \| ScopedActionTarget` |

</details>

Behavior, inference, resets, and errors: [Semantic resources and regression layers](./statistics.md#semantic-resources-and-regression-layers).



## `filterMarks`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
filterMarks(options: TargetedOptions<FilterMarksOptions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`FilterMarksOptions`](./../types.md#type-filtermarksoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `recompute` | Optional / branch-dependent | `boolean \| undefined` |
| `target` | Optional / branch-dependent | `string \| ActionTargetList \| ScopedActionTarget \| undefined` |
| `mode` | Optional / branch-dependent | `"compose" \| "replace" \| undefined` |
| `grain` | Optional / branch-dependent | `"item" \| "stack" \| undefined` |
| `items` | Optional / branch-dependent | `readonly string[] \| undefined` |
| `empty` | Optional / branch-dependent | `"all" \| "none" \| undefined` |
| `rows` | Optional / branch-dependent | `{ data: string; indices: readonly number[]; }` |
| `field` | Optional / branch-dependent | `string` |
| `channel` | Optional / branch-dependent | `"color" \| "group" \| "opacity" \| "radius" \| "shape" \| "size" \| "stroke" \| "strokeDash" \| "strokeWidth" \| "theta" \| "x" \| "x2" \| "xOffset" \| "y" \| "y2" \| "yOffset"` |
| `property` | Optional / branch-dependent | `MarkGraphicProperty` |
| `op` | Optional / branch-dependent | `"eq" \| "gt" \| "gte" \| "lt" \| "lte" \| "neq"` |
| `value` | Optional / branch-dependent | `unknown` |
| `values` | Optional / branch-dependent | `readonly unknown[]` |
| `count` | Optional / branch-dependent | `number \| undefined` |
| `groupBy` | Optional / branch-dependent | `string \| readonly string[] \| undefined` |
| `ties` | Optional / branch-dependent | `"all" \| "first" \| undefined` |
| `min` | Optional / branch-dependent | `FilterBound` |
| `max` | Optional / branch-dependent | `FilterBound \| undefined` |
| `inclusive` | Optional / branch-dependent | `boolean \| undefined` |
| `minInclusive` | Optional / branch-dependent | `boolean \| undefined` |
| `maxInclusive` | Optional / branch-dependent | `boolean \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
filterMarks({ target?, mode?, grain?, field | channel | property, op, ...operands })
```

Retain matching final mark items through the shared selector grammar. Repeated
filters are idempotent when equal and use explicit `replace` or `compose` mode
when different. Automatic histogram position domains fit the surviving bins'
outer edges without rebinning, preserving interior gaps and other scale consumers'
ranges. Inferred guides follow that domain; explicit domains and zero inclusion
remain in effect. Empty results preserve the preceding scale domains.
An explicit Raincloud parent ID selects raw observations by `field` at item grain
and recomputes all enabled components. It accepts comparisons, sets, ranges, and
grouped ranks; rendered channel/property selectors still require a child ID.
Raincloud source filters retain the nonempty input requirements of their enabled
statistical components; named-child empty filters remain supported.
Graph plots retain selected nodes and their induced edges while preserving the
stored graph, layout, degree values and item identities. Use node fields, rows
or pre-highlight body properties; the recipe follows source and appearance edits.
[Data](../../api/data.md)


## `removeMarkFilter`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
removeMarkFilter(options?: TargetedOptions<RemoveMarkFilterOptions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`RemoveMarkFilterOptions`](./../types.md#type-removemarkfilteroptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `target` | Optional / branch-dependent | `string \| ActionTargetList \| ScopedActionTarget \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
removeMarkFilter({ target? })
```

Restore a filtered mark to its canonical source, recover its prior Histogram bin
policy, and retain any filtered dataset snapshot that still has downstream users.
For a graph plot, clear the view recipe and restore its full stored graph.
[Data](../../api/data.md)


## `removeMarkHighlight`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
removeMarkHighlight(options?: TargetedOptions<RemoveMarkSelectionOptions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`RemoveMarkSelectionOptions`](./../types.md#type-removemarkselectionoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `selection` | Optional / branch-dependent | `string \| undefined` |
| `target` | Optional / branch-dependent | `ActionTargetList \| ScopedActionTarget` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
removeMarkHighlight({ selection? } = {})
```

Remove one highlight assignment, restore the target mark and categorical
legend baseline, and retain the reusable selection.
[Selection lifecycle](../../api/appearance/selection-and-highlighting.md#editing-and-removing-stored-intent)


## `highlightMarks`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
highlightMarks(options: TargetedOptions<HighlightMarksOptions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`HighlightMarksOptions`](./../types.md#type-highlightmarksoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `fontSize` | Optional / branch-dependent | `number \| undefined` |
| `id` | Optional / branch-dependent | `string \| undefined` |
| `target` | Optional / branch-dependent | `string \| ActionTargetList \| ScopedActionTarget \| undefined` |
| `select` | Optional / branch-dependent | `MarkSelectionSelector \| undefined` |
| `selection` | Optional / branch-dependent | `string \| undefined` |
| `color` | Optional / branch-dependent | `string \| undefined` |
| `opacity` | Optional / branch-dependent | `number \| undefined` |
| `fill` | Optional / branch-dependent | `string \| undefined` |
| `stroke` | Optional / branch-dependent | `string \| undefined` |
| `strokeWidth` | Optional / branch-dependent | `number \| undefined` |
| `strokeDash` | Optional / branch-dependent | `DashPattern \| DashStyle \| undefined` |
| `shape` | Optional / branch-dependent | `PointShape \| undefined` |
| `size` | Optional / branch-dependent | `number \| undefined` |
| `offset` | Optional / branch-dependent | `{ x?: number \| undefined; y?: number \| undefined; } \| undefined` |
| `dimOthers` | Optional / branch-dependent | `boolean \| { opacity?: number \| undefined; } \| undefined` |
| `bringToFront` | Optional / branch-dependent | `boolean \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
highlightMarks({
  id?, target?, select?, selection?, color?, opacity?, fill?, stroke?,
  strokeWidth?, strokeDash?, shape?, size?, offset?, dimOthers?, bringToFront?
})
```

Select point, bar, line, area, arc, or rule items inline or reuse a stored selection,
then apply mark-specific concrete emphasis, optional complement dimming, and
selected-last order.
[Mark selection and highlighting](../../api/appearance/selection-and-highlighting.md#mark-selection-and-highlighting)


## `editCompositionLayout`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
editCompositionLayout(options: TargetedOptions<EditCompositionLayoutOptions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`EditCompositionLayoutOptions`](./../types.md#type-editcompositionlayoutoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `legends` | Optional / branch-dependent | `"collect" \| "local" \| undefined` |
| `columns` | Optional / branch-dependent | `number \| undefined` |
| `gap` | Optional / branch-dependent | `FacetGap \| undefined` |
| `align` | Optional / branch-dependent | `"plot" \| CompositionAlign \| undefined` |
| `padding` | Optional / branch-dependent | `number \| CompositionPadding \| undefined` |
| `spacing` | Optional / branch-dependent | `"canvas" \| "content" \| "plot" \| undefined` |
| `topLane` | Optional / branch-dependent | `FacetTopLaneMode \| undefined` |
| `target` | Optional / branch-dependent | `ActionTargetList \| ScopedActionTarget` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
editCompositionLayout({ columns?, gap?, spacing?, align?, padding? })
```

Edit spacing, cross-axis alignment, or outer padding on an existing composition.
`columns` changes wrapping only on a facet composition and is rejected for concat.
Omitted values are preserved, child identity is unchanged, and the parent snapshot
is rebuilt from retained child programs. Facet parents accept `gap: {x, y}` to
set horizontal and vertical distances separately; both keys are required and each
value must be finite and non-negative. A pair replaces both axes, while an omitted
gap preserves its current form. Concat continues to require a numeric gap.


## `replaceCompositionChild`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
replaceCompositionChild(options: TargetedOptions<ReplaceCompositionChildOptions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`ReplaceCompositionChildOptions`](./../types.md#type-replacecompositionchildoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `target` | Required | `string \| ActionTargetList \| ScopedActionTarget` |
| `program` | Required | `ChartProgram` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
replaceCompositionChild({ target, program })
```

Replace one named child while preserving its slot ID and order. The replacement
must already be a complete chart or composition program.


## `insertCompositionChild`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
insertCompositionChild(options: TargetedOptions<InsertCompositionChildOptions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`InsertCompositionChildOptions`](./../types.md#type-insertcompositionchildoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `id` | Required | `string` |
| `program` | Required | `ChartProgram` |
| `before` | Optional / branch-dependent | `string \| undefined` |
| `after` | Optional / branch-dependent | `string \| undefined` |
| `target` | Optional / branch-dependent | `ActionTargetList \| ScopedActionTarget` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
insertCompositionChild({ id, program, before?, after? })
```

Insert a complete chart or nested composition under a new stable child name.
Use either `before` or `after`; omitting both appends the child.


## `removeCompositionChild`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
removeCompositionChild(options: TargetedOptions<RemoveCompositionChildOptions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`RemoveCompositionChildOptions`](./../types.md#type-removecompositionchildoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `target` | Required | `string \| ActionTargetList \| ScopedActionTarget` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
removeCompositionChild({ target })
```

Remove one named concat child and rebuild layout. A concat may retain one child,
but its final child cannot be removed.


## `reorderCompositionChildren`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
reorderCompositionChildren(options: TargetedOptions<ReorderCompositionChildrenOptions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`ReorderCompositionChildrenOptions`](./../types.md#type-reordercompositionchildrenoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `order` | Required | `readonly [string, ...string[]]` |
| `target` | Optional / branch-dependent | `ActionTargetList \| ScopedActionTarget` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
reorderCompositionChildren({ order })
```

Provide every current concat child ID exactly once in its new order. Child
program references stay unchanged while placements and snapshots are rebuilt.


## `facet`

**API layer:** user-facing. **Authoring roles:** H0.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
facet(options: TargetedOptions<FacetOptions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`FacetOptions`](./../types.md#type-facetoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `id` | Optional / branch-dependent | `string \| undefined` |
| `field` | Required | `string` |
| `data` | Optional / branch-dependent | `string \| undefined` |
| `values` | Optional / branch-dependent | `readonly DatasetScalar[] \| undefined` |
| `columns` | Optional / branch-dependent | `number \| undefined` |
| `gap` | Optional / branch-dependent | `FacetGap \| undefined` |
| `align` | Optional / branch-dependent | `CompositionAlign \| undefined` |
| `padding` | Optional / branch-dependent | `number \| CompositionPadding \| undefined` |
| `scales` | Optional / branch-dependent | `FacetScaleResolutions \| undefined` |
| `guides` | Optional / branch-dependent | `FacetGuideOptions \| undefined` |
| `headers` | Optional / branch-dependent | `FacetHeadersOptions \| undefined` |
| `spacing` | Optional / branch-dependent | `"canvas" \| "content" \| "plot" \| undefined` |
| `topLane` | Optional / branch-dependent | `FacetTopLaneMode \| undefined` |
| `target` | Optional / branch-dependent | `ActionTargetList \| ScopedActionTarget` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
facet({ id?, field, data?, values?, columns?, gap?, spacing?, align?, padding?, scales?, guides?, headers? })
```

Repeat one complete Cartesian, Polar, or Parallel chart by a field on its common
row-preserving dataset ancestor. Values preserve source first appearance;
scale policies can be `"shared"` or `"independent"` by supported role, including
Polar `theta`/public `r` and all `parallelDimensions`. Layered regression data,
statistical descendants, data-bound Cartesian text, attached labels, and references
recompute per cell. Text needs x/y scales and a text encoding.
`guides: { axes: "outer" }` keeps axes only on occupied outer cells, while
`guides: { legend: "shared" }` promotes one compatible parent-owned legend at
the child legend's configured `left`, `right`, `top`, or `bottom` edge. Top and
bottom promotion also preserves the child legend's horizontal alignment;
author those options with `createLegend` before calling `facet`. Promoted outside
legends use the existing recipe offset from the combined panel plots. Omitted
offsets clear retained axis and header text; explicit colliding offsets reject.
Child Canvas dimensions and margins remain intact, and the inferred parent
Canvas contains the child snapshots and the complete legend bounds.
A `guides.legend` object declares a native parent legend against the final child-plot
union using ordinary `LegendOptions` defaults. Existing whole/focused/block legend
editors and removal accept that facet, grid or repeat parent. Declare an absent
owner with `editFacetGuides({ legend: {...} })`; post-facet `createLegend` stays
unit-only. Target IDs name source marks. Corners/free coordinates and block-local
anchors use the union and preserve child dimensions, automatic policies and editable
persistence. See [parent legend creation](../../api/composition/facets.md#declare-a-legend-for-the-complete-facet).
See [Program composition](../../api/composition.md#repeat-the-current-chart-by-a-field).

Facet, grid and field repetition also accept `gap: {x, y}`. A number still applies
one distance in both directions and keeps its stored form. A pair must contain
exactly those two finite non-negative values; partial objects and unknown keys
reject, even for one row or column. The distances separate child canvases, plots,
or retained content according to the existing spacing mode. Grid still supports
only canvas/plot spacing. Header clearance and final overlap checks remain active
independently in both directions. The pair survives layout edits, source replay
and editable persistence. See [independent axis gaps](../../api/composition/facets.md#use-different-horizontal-and-vertical-gaps).

Creation options for `facet`, `facetGrid`, and `repeatCharts` accept `headers`.
Set common `fontSize`, `fontFamily`, `fontWeight`, `color`, `offset`, `align`, or
`labelMap`, and optional `row`/`column` objects with role-specific overrides and
`side`. Common styles are applied before role overrides. Row headers require a
two-field grid; its column sides are top/bottom, while one-field facets and
repeats also allow left/right column headers. The option uses the same values,
layout, and precedence as `editFacetHeaders`; authored styles survive themes
and source replay. Omitting `headers` preserves the default headers.
With `spacing: "plot"`, headers stay aligned to their panel plots and sit outside
retained axis text and local legend ink, including outward Polar labels. Header lanes
are recalculated after guide edits. The requested plot gap and child Canvas sizes
remain unchanged; insufficient interior guide/header space rejects the operation.


## `facetGrid`

**API layer:** user-facing. **Authoring roles:** H0.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
facetGrid(options: TargetedOptions<FacetGridOptions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`FacetGridOptions`](./../types.md#type-facetgridoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `id` | Optional / branch-dependent | `string \| undefined` |
| `data` | Optional / branch-dependent | `string \| undefined` |
| `rows` | Required | `FacetGridRole` |
| `columns` | Required | `FacetGridRole` |
| `combinations` | Optional / branch-dependent | `"full" \| "observed" \| undefined` |
| `gap` | Optional / branch-dependent | `FacetGap \| undefined` |
| `align` | Optional / branch-dependent | `CompositionAlign \| undefined` |
| `padding` | Optional / branch-dependent | `number \| CompositionPadding \| undefined` |
| `scales` | Optional / branch-dependent | `FacetScaleResolutions \| undefined` |
| `guides` | Optional / branch-dependent | `FacetGuideOptions \| undefined` |
| `headers` | Optional / branch-dependent | `FacetHeadersOptions \| undefined` |
| `spacing` | Optional / branch-dependent | `"canvas" \| "plot" \| undefined` |
| `topLane` | Optional / branch-dependent | `FacetTopLaneMode \| undefined` |
| `target` | Optional / branch-dependent | `ActionTargetList \| ScopedActionTarget` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
facetGrid({ id?, data?, rows, columns, combinations?, gap?, spacing?, align?, padding?, scales?, guides?, headers? })
```

Repeat one supported Cartesian, Polar, or Parallel chart over two ordered
categorical fields.
`combinations: "observed"` retains the coordinates of observed pairs;
`"full"` also creates explicit empty cells that retain their semantic layers,
coordinate, header, and shared or explicit-domain local guides.


## `repeatCharts`

**API layer:** user-facing. **Authoring roles:** H0.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
repeatCharts(options: TargetedOptions<RepeatChartsOptions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`RepeatChartsOptions`](./../types.md#type-repeatchartsoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `id` | Optional / branch-dependent | `string \| undefined` |
| `target` | Optional / branch-dependent | `string \| ActionTargetList \| ScopedActionTarget \| undefined` |
| `channel` | Required | `"r" \| "theta" \| "x" \| "y" \| { parallelDimension: string; }` |
| `fields` | Required | `readonly [string, ...string[]]` |
| `columns` | Optional / branch-dependent | `number \| undefined` |
| `gap` | Optional / branch-dependent | `FacetGap \| undefined` |
| `align` | Optional / branch-dependent | `CompositionAlign \| undefined` |
| `padding` | Optional / branch-dependent | `number \| CompositionPadding \| undefined` |
| `scales` | Optional / branch-dependent | `FacetScaleResolutions \| undefined` |
| `guides` | Optional / branch-dependent | `FacetGuideOptions \| undefined` |
| `headers` | Optional / branch-dependent | `FacetHeadersOptions \| undefined` |
| `spacing` | Optional / branch-dependent | `"canvas" \| "content" \| "plot" \| undefined` |
| `topLane` | Optional / branch-dependent | `FacetTopLaneMode \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
repeatCharts({ id?, target?, channel, fields, columns?, gap?, spacing?, align?, padding?, scales?, guides?, headers? })
```

Repeat one direct mark by replacing Cartesian `x`/`y`, eligible Polar
`theta`/public `r`, or one `{ parallelDimension: field }`. The repeated role is
independently scaled by default; request a shared policy explicitly to use the
union domain. Attached labels and statistical references owned by the target
replay with it. Pie/Radar raw positional roles, derived targets, unrelated
layers, and composite roles are rejected with explicit errors.


## `editFacetSource`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
editFacetSource(options: TargetedOptions<EditFacetSourceOptions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`EditFacetSourceOptions`](./../types.md#type-editfacetsourceoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `program` | Optional / branch-dependent | `ChartProgram \| undefined` |
| `action` | Optional / branch-dependent | `{ method: string; options?: Readonly<Record<string, unknown>> \| undefined; } \| undefined` |
| `target` | Optional / branch-dependent | `ActionTargetList \| ScopedActionTarget` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
editFacetSource({ program })
editFacetSource({ action: { method, options? } })
```

Reapply the current facet, grid, or repeat recipe to a revised complete unit
program while preserving the partition dataset ID, ordered domains, layout,
scale/guide policy, headers, and parent title. All stored facet values must
remain observed; create a new composition when the dataset ID, domain, or
repeat field list changes. Alternatively, pass one actual unit chart-authoring action
name and its options to edit the retained full-data source in the same transaction.
Specify exactly one of `program` or `action`; extension primitives, materializers,
and composition actions cannot be source edits.


## `editFacetHeaders`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
editFacetHeaders(options: TargetedOptions<EditFacetHeadersOptions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`EditFacetHeadersOptions`](./../types.md#type-editfacetheadersoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `fontSize` | Optional / branch-dependent | `number \| undefined` |
| `fontFamily` | Optional / branch-dependent | `string \| undefined` |
| `fontWeight` | Optional / branch-dependent | `string \| number \| undefined` |
| `color` | Optional / branch-dependent | `string \| undefined` |
| `offset` | Optional / branch-dependent | `number \| undefined` |
| `anchor` | Optional / branch-dependent | `"content" \| "plot" \| "view" \| undefined` |
| `role` | Optional / branch-dependent | `FacetHeaderRole \| undefined` |
| `labelMap` | Optional / branch-dependent | `"auto" \| DisplayLabelMap \| undefined` |
| `side` | Optional / branch-dependent | `FacetHeaderSide \| undefined` |
| `align` | Optional / branch-dependent | `FacetHeaderAlign \| undefined` |
| `rotation` | Optional / branch-dependent | `RotationInput \| undefined` |
| `title` | Optional / branch-dependent | `false \| FacetHeaderTitleOptions \| undefined` |
| `target` | Optional / branch-dependent | `ActionTargetList \| ScopedActionTarget` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
editFacetHeaders({ fontSize?, fontFamily?, fontWeight?, color?, offset?, role?, labelMap?, side?, align?, rotation?, title? })
```

Edit the parent-owned repeated facet headers and rebuild the parent snapshot
without changing child programs or facet value order.
One-field facets and repeats accept all four sides with `role: "column"`;
left/right placements reserve a measured lane beside every physical column.
Row-column grids retain left/right row headers and top/bottom column headers.
Role-specific `title: { text: "Region" }` adds one field title across the occupied
plots, separately from category headers and the chart title. Initial options use
`headers.column.title` or grid `headers.row.title`. A first title requires one-line
text; partial edits preserve it and `title: false` removes it. Title style inherits
its role header, with optional fontSize/fontFamily/fontWeight/color, align,
rotation, offset and alongOffset overrides. Common/all titles are rejected.


## `editFacetScales`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
editFacetScales(options: TargetedOptions<FacetScaleResolutions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`FacetScaleResolutions`](./../types.md#type-facetscaleresolutions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `x` | Optional / branch-dependent | `FacetScaleResolution \| undefined` |
| `y` | Optional / branch-dependent | `FacetScaleResolution \| undefined` |
| `xOffset` | Optional / branch-dependent | `FacetScaleResolution \| undefined` |
| `yOffset` | Optional / branch-dependent | `FacetScaleResolution \| undefined` |
| `theta` | Optional / branch-dependent | `FacetScaleResolution \| undefined` |
| `r` | Optional / branch-dependent | `FacetScaleResolution \| undefined` |
| `color` | Optional / branch-dependent | `FacetScaleResolution \| undefined` |
| `stroke` | Optional / branch-dependent | `FacetScaleResolution \| undefined` |
| `size` | Optional / branch-dependent | `FacetScaleResolution \| undefined` |
| `shape` | Optional / branch-dependent | `FacetScaleResolution \| undefined` |
| `opacity` | Optional / branch-dependent | `FacetScaleResolution \| undefined` |
| `strokeDash` | Optional / branch-dependent | `FacetScaleResolution \| undefined` |
| `parallelDimensions` | Optional / branch-dependent | `FacetScaleResolution \| undefined` |
| `target` | Optional / branch-dependent | `ActionTargetList \| ScopedActionTarget` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
editFacetScales({ x?, y?, xOffset?, yOffset?, theta?, r?, color?, stroke?, size?, shape?, opacity?, strokeDash?, parallelDimensions? })
```

Partially change used facet channels between `"shared"` and `"independent"`.
Every cell is rederived from the retained pre-facet program while field, data,
value order, child IDs, layout, guides, headers, and title are preserved. Public
`r` addresses semantic radius; `parallelDimensions` applies the policy separately
to every Parallel dimension.


## `editFacetGuides`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
editFacetGuides(options: TargetedOptions<FacetGuideOptions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`FacetGuideOptions`](./../types.md#type-facetguideoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `axes` | Optional / branch-dependent | `"each" \| "outer" \| { x?: "each" \| "outer" \| undefined; y?: "each" \| "outer" \| undefined; } \| undefined` |
| `legend` | Optional / branch-dependent | `"shared" \| false \| LegendOptions \| undefined` |
| `target` | Optional / branch-dependent | `ActionTargetList \| ScopedActionTarget` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
editFacetGuides({ axes?, legend? })
```

Partially change axes between `"each"` and `"outer"`, or legend ownership
between `false` and `"shared"`. Shared legend promotion requires concretely
compatible child scales and guide recipes. Polar and Parallel axes remain
child-local and reject `"outer"`.


## `createScatterPlot`

**API layer:** user-facing. **Authoring roles:** H0.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
createScatterPlot(options: TargetedOptions<CreateScatterPlotOptions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`CreateScatterPlotOptions`](./../types.md#type-createscatterplotoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `missing` | Optional / branch-dependent | `"error" \| "skip" \| undefined` |
| `id` | Optional / branch-dependent | `string \| undefined` |
| `data` | Optional / branch-dependent | `string \| undefined` |
| `coordinate` | Optional / branch-dependent | `string \| undefined` |
| `x` | Required | `PointFacadePositionChannel` |
| `y` | Required | `PointFacadePositionChannel` |
| `color` | Optional / branch-dependent | `BasicColorChannel \| undefined` |
| `stroke` | Optional / branch-dependent | `string \| Omit<{ target?: string \| undefined; field: string; value?: undefined; fieldType?: "nominal" \| "ordinal" \| undefined; temporalUnit?: undefined; scale?: CategoricalColorScaleOptions \| undefined; }, "coordinate" \| "target"> \| Omit<...> \| Omit<...> \| undefined` |
| `size` | Optional / branch-dependent | `BasicSizeChannel \| undefined` |
| `shape` | Optional / branch-dependent | `BasicShapeChannel \| undefined` |
| `point` | Optional / branch-dependent | `(StrokeStyleDetails & { clip?: boolean \| undefined; radius?: number \| undefined; shape?: PointShape \| undefined; fill?: string \| undefined; opacity?: number \| undefined; stroke?: FilledMarkStroke \| undefined; strokeWidth?: number \| undefined; }) \| undefined` |
| `guides` | Optional / branch-dependent | `false \| CartesianGuideOptions \| undefined` |
| `target` | Optional / branch-dependent | `ActionTargetList \| ScopedActionTarget` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
createScatterPlot({ id?, data?, coordinate?, x, y, color?, stroke?, size?, shape?, point?, missing?, guides? })
```

Create a complete Cartesian point chart from required x/y fields and optional
appearance encodings. [Basic Charts](../../api/basic-charts.md#createscatterplot)


## `createTextPlot`

**API layer:** user-facing. **Authoring roles:** H0.

**Availability:** Development; added after v0.0.13. See [release compatibility](../../version.md).

```typescript
createTextPlot(options: TargetedOptions<CreateTextPlotOptions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`CreateTextPlotOptions`](./../types.md#type-createtextplotoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `id` | Optional / branch-dependent | `string \| undefined` |
| `data` | Optional / branch-dependent | `string \| undefined` |
| `coordinate` | Optional / branch-dependent | `string \| undefined` |
| `x` | Required | `TextPlotPositionChannel` |
| `y` | Required | `TextPlotPositionChannel` |
| `text` | Required | `string \| Omit<{ target?: string \| undefined; format?: ValueFormat \| undefined; } & { field: string; value?: undefined; content?: undefined; normalizeBy?: undefined; }, "coordinate" \| "target"> \| Omit<...>` |
| `color` | Optional / branch-dependent | `RectColorChannel \| undefined` |
| `style` | Optional / branch-dependent | `Omit<TextMarkOptions, "data" \| "id" \| "inheritColor" \| "source" \| "text"> \| undefined` |
| `guides` | Optional / branch-dependent | `false \| ColorGuides \| undefined` |
| `target` | Optional / branch-dependent | `ActionTargetList \| ScopedActionTarget` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
createTextPlot({ id?, data?, coordinate?, x, y, text, color?, style?, guides? })
```

Create a Cartesian data-text chart from required positions and content. Available
in the full entry only. Strings name fields; constant text uses `{ value }`.
[Basic Charts](../../api/basic-charts.md#createtextplot)


## `createDotPlot`

**API layer:** user-facing. **Authoring roles:** H0, H1.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
createDotPlot(options: TargetedOptions<CreateDotPlotOptions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`CreateDotPlotOptions`](./../types.md#type-createdotplotoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `value` | Required | `EndpointValueChannel` |
| `point` | Optional / branch-dependent | `(StrokeStyleDetails & { clip?: boolean \| undefined; radius?: number \| undefined; shape?: PointShape \| undefined; fill?: string \| undefined; opacity?: number \| undefined; stroke?: FilledMarkStroke \| undefined; strokeWidth?: number \| undefined; }) \| undefined` |
| `labels` | Optional / branch-dependent | `false \| EndpointLabelOptions \| undefined` |
| `missing` | Optional / branch-dependent | `"error" \| "skip" \| undefined` |
| `id` | Optional / branch-dependent | `string \| undefined` |
| `data` | Optional / branch-dependent | `string \| undefined` |
| `coordinate` | Optional / branch-dependent | `string \| undefined` |
| `category` | Required | `EndpointCategoryChannel` |
| `orientation` | Optional / branch-dependent | `"horizontal" \| "vertical" \| undefined` |
| `summary` | Optional / branch-dependent | `EndpointPlotSummary \| undefined` |
| `guides` | Optional / branch-dependent | `false \| CartesianSeparateGuideOptions \| undefined` |
| `target` | Optional / branch-dependent | `ActionTargetList \| ScopedActionTarget` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
createDotPlot({ id?, data?, coordinate?, category, value, orientation?, summary?, point?, labels?, guides? })
```

Create categorical dots from raw rows by default. Set `summary` explicitly to
`mean`, `median`, `sum`, `min`, or `max` to aggregate one dot per category.


## `createLollipopPlot`

**API layer:** user-facing. **Authoring roles:** H0, H1.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
createLollipopPlot(options: TargetedOptions<CreateLollipopPlotOptions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`CreateLollipopPlotOptions`](./../types.md#type-createlollipopplotoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `value` | Required | `EndpointValueChannel` |
| `baseline` | Optional / branch-dependent | `number \| undefined` |
| `point` | Optional / branch-dependent | `(StrokeStyleDetails & { clip?: boolean \| undefined; radius?: number \| undefined; shape?: PointShape \| undefined; fill?: string \| undefined; opacity?: number \| undefined; stroke?: FilledMarkStroke \| undefined; strokeWidth?: number \| undefined; }) \| undefined` |
| `stem` | Optional / branch-dependent | `(RuleStyleOptions & { clip?: boolean \| undefined; }) \| undefined` |
| `labels` | Optional / branch-dependent | `false \| EndpointLabelOptions \| undefined` |
| `missing` | Optional / branch-dependent | `"error" \| "skip" \| undefined` |
| `id` | Optional / branch-dependent | `string \| undefined` |
| `data` | Optional / branch-dependent | `string \| undefined` |
| `coordinate` | Optional / branch-dependent | `string \| undefined` |
| `category` | Required | `EndpointCategoryChannel` |
| `orientation` | Optional / branch-dependent | `"horizontal" \| "vertical" \| undefined` |
| `summary` | Optional / branch-dependent | `EndpointPlotSummary \| undefined` |
| `guides` | Optional / branch-dependent | `false \| CartesianSeparateGuideOptions \| undefined` |
| `target` | Optional / branch-dependent | `ActionTargetList \| ScopedActionTarget` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
createLollipopPlot({ id?, data?, coordinate?, category, value, orientation?, summary?, baseline?, point?, stem?, labels?, guides? })
```

Create a value point and a stem to a finite baseline, which defaults to zero.
The point and stem use the same source grain and quantitative scale.


## `createDumbbellPlot`

**API layer:** user-facing. **Authoring roles:** H0, H1.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
createDumbbellPlot(options: TargetedOptions<CreateDumbbellPlotOptions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`CreateDumbbellPlotOptions`](./../types.md#type-createdumbbellplotoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `start` | Required | `EndpointValueChannel` |
| `end` | Required | `EndpointValueChannel` |
| `startPoint` | Optional / branch-dependent | `(StrokeStyleDetails & { clip?: boolean \| undefined; radius?: number \| undefined; shape?: PointShape \| undefined; fill?: string \| undefined; opacity?: number \| undefined; stroke?: FilledMarkStroke \| undefined; strokeWidth?: number \| undefined; }) \| undefined` |
| `endPoint` | Optional / branch-dependent | `(StrokeStyleDetails & { clip?: boolean \| undefined; radius?: number \| undefined; shape?: PointShape \| undefined; fill?: string \| undefined; opacity?: number \| undefined; stroke?: FilledMarkStroke \| undefined; strokeWidth?: number \| undefined; }) \| undefined` |
| `connector` | Optional / branch-dependent | `(RuleStyleOptions & { clip?: boolean \| undefined; }) \| undefined` |
| `labels` | Optional / branch-dependent | `false \| (EndpointLabelOptions & { endpoint?: "both" \| "end" \| "start" \| undefined; }) \| undefined` |
| `missing` | Optional / branch-dependent | `"error" \| "skip" \| undefined` |
| `id` | Optional / branch-dependent | `string \| undefined` |
| `data` | Optional / branch-dependent | `string \| undefined` |
| `coordinate` | Optional / branch-dependent | `string \| undefined` |
| `category` | Required | `EndpointCategoryChannel` |
| `orientation` | Optional / branch-dependent | `"horizontal" \| "vertical" \| undefined` |
| `summary` | Optional / branch-dependent | `EndpointPlotSummary \| undefined` |
| `guides` | Optional / branch-dependent | `false \| CartesianSeparateGuideOptions \| undefined` |
| `target` | Optional / branch-dependent | `ActionTargetList \| ScopedActionTarget` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
createDumbbellPlot({ id?, data?, coordinate?, category, start, end, orientation?, summary?, startPoint?, endPoint?, connector?, labels?, guides? })
```

Create named start and end points with a connector. Endpoint identity stays
attached to its field and appearance when values reverse or coincide.
Because two fields share the value scale, its ambiguous axis title is omitted by
default. Set `guides.axes.x.title` for a horizontal plot or
`guides.axes.y.title` for a vertical plot to provide one explicitly.


## `editEndpointPlot`

**API layer:** user-facing. **Authoring roles:** H1, H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
editEndpointPlot(options: TargetedOptions<EditEndpointPlotOptions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`EditEndpointPlotOptions`](./../types.md#type-editendpointplotoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `target` | Optional / branch-dependent | `string \| ActionTargetList \| ScopedActionTarget \| undefined` |
| `missing` | Optional / branch-dependent | `"error" \| "skip" \| undefined` |
| `data` | Optional / branch-dependent | `string \| undefined` |
| `coordinate` | Optional / branch-dependent | `string \| undefined` |
| `category` | Optional / branch-dependent | `EndpointCategoryChannel \| undefined` |
| `orientation` | Optional / branch-dependent | `"horizontal" \| "vertical" \| undefined` |
| `summary` | Optional / branch-dependent | `EndpointPlotSummary \| undefined` |
| `start` | Optional / branch-dependent | `EndpointValueChannel \| undefined` |
| `end` | Optional / branch-dependent | `EndpointValueChannel \| undefined` |
| `value` | Optional / branch-dependent | `EndpointValueChannel \| undefined` |
| `baseline` | Optional / branch-dependent | `number \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
editEndpointPlot({ target?, data?, coordinate?, category?, value?, start?, end?, orientation?, summary?, baseline? })
```

Atomically revise the semantic roles of a Dot, Lollipop, or Dumbbell facade.
Owned points, rules, labels, and summary data are replaced together while the
original appearance and guide policy are retained.
When a changed role or source changes an axis domain, tick samples from the
previous domain are inferred again while retaining their label and line styles.
Separately added statistical references retain their source endpoint, styles, and
labels, recompute from the revised observations, and follow the measurement axis
when orientation changes.


## `createECDFPlot`

**API layer:** user-facing. **Authoring roles:** H0, H1.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
createECDFPlot(options: TargetedOptions<CreateECDFPlotOptions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`CreateECDFPlotOptions`](./../types.md#type-createecdfplotoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `id` | Optional / branch-dependent | `string \| undefined` |
| `data` | Optional / branch-dependent | `string \| undefined` |
| `coordinate` | Optional / branch-dependent | `string \| undefined` |
| `field` | Required | `string` |
| `groupBy` | Optional / branch-dependent | `string \| readonly [string, ...string[]] \| undefined` |
| `weight` | Optional / branch-dependent | `string \| undefined` |
| `missing` | Optional / branch-dependent | `"drop" \| "error" \| undefined` |
| `as` | Optional / branch-dependent | `ECDFOutputFields \| undefined` |
| `color` | Optional / branch-dependent | `LineCategoricalColorChannel<NonPointCategoricalColorScaleOptions> \| undefined` |
| `line` | Optional / branch-dependent | `(StrokeStyleDetails & { clip?: boolean \| undefined; strokeWidth?: number \| undefined; stroke?: string \| undefined; opacity?: number \| undefined; }) \| undefined` |
| `labels` | Optional / branch-dependent | `false \| EndpointLabelOptions \| undefined` |
| `guides` | Optional / branch-dependent | `false \| CartesianPathGuideOptions \| undefined` |
| `target` | Optional / branch-dependent | `ActionTargetList \| ScopedActionTarget` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
createECDFPlot({ id?, data?, coordinate?, field, groupBy?, weight?, missing?, as?, color?, line?, labels?, guides? })
```

Create a right-continuous empirical cumulative distribution as an ordinary
`step-after` line. Ties share one jump, probability is fixed to `[0,1]`, and
optional grouping controls both statistical denominators and path identity.


## `editECDFPlot`

**API layer:** user-facing. **Authoring roles:** H1, H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
editECDFPlot(options: TargetedOptions<EditECDFPlotOptions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`EditECDFPlotOptions`](./../types.md#type-editecdfplotoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `target` | Optional / branch-dependent | `string \| ActionTargetList \| ScopedActionTarget \| undefined` |
| `data` | Optional / branch-dependent | `string \| undefined` |
| `coordinate` | Optional / branch-dependent | `string \| undefined` |
| `field` | Optional / branch-dependent | `string \| undefined` |
| `missing` | Optional / branch-dependent | `"drop" \| "error" \| undefined` |
| `as` | Optional / branch-dependent | `ECDFOutputFields \| undefined` |
| `groupBy` | Optional / branch-dependent | `string \| false \| readonly [string, ...string[]] \| undefined` |
| `weight` | Optional / branch-dependent | `string \| false \| undefined` |
| `color` | Optional / branch-dependent | `false \| LineCategoricalColorChannel<NonPointCategoricalColorScaleOptions> \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
editECDFPlot({ target?, data?, coordinate?, field?, groupBy?, weight?, missing?, as?, color? })
```

Atomically revise an ECDF source or statistical role and rebuild its owned
derived rows, path, final-series labels, and guides under the stable owner ID.
Ungrouping also removes a coupled group color unless a replacement is supplied.


## `createIntervalPlot`

**API layer:** user-facing. **Authoring roles:** H0, H1.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
createIntervalPlot(options: TargetedOptions<CreateIntervalPlotOptions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`CreateIntervalPlotOptions`](./../types.md#type-createintervalplotoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `id` | Optional / branch-dependent | `string \| undefined` |
| `data` | Optional / branch-dependent | `string \| undefined` |
| `coordinate` | Optional / branch-dependent | `string \| undefined` |
| `xOffset` | Optional / branch-dependent | `ErrorBarOffsetChannel \| undefined` |
| `yOffset` | Optional / branch-dependent | `ErrorBarOffsetChannel \| undefined` |
| `groupBy` | Optional / branch-dependent | `string \| false \| undefined` |
| `color` | Optional / branch-dependent | `BasicColorChannel \| undefined` |
| `point` | Optional / branch-dependent | `(StrokeStyleDetails & { clip?: boolean \| undefined; radius?: number \| undefined; shape?: PointShape \| undefined; fill?: string \| undefined; opacity?: number \| undefined; stroke?: FilledMarkStroke \| undefined; strokeWidth?: number \| undefined; }) \| undefined` |
| `errorBar` | Optional / branch-dependent | `IntervalPlotErrorBarOptions \| undefined` |
| `guides` | Optional / branch-dependent | `false \| CartesianSeparateGuideOptions \| undefined` |
| `x` | Required | `string \| ErrorBarIntervalChannel \| ErrorBarPositionChannel` |
| `y` | Required | `string \| ErrorBarIntervalChannel \| ErrorBarPositionChannel` |
| `target` | Optional / branch-dependent | `ActionTargetList \| ScopedActionTarget` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
createIntervalPlot({ id?, data?, coordinate?, x, y, xOffset?, yOffset?, groupBy?, color?, point?, errorBar?, guides? })
```

Create center points and matching statistical or explicit intervals from one
shared dataset, coordinate, and pair of scales. The x/y interval vocabulary is
the same as `createErrorBar`; child point and error-bar styles remain independently
editable through their existing owners. When scale IDs are omitted, the complete
owner uses `${id}X` and `${id}Y` so unrelated earlier channel scales cannot make
the call order dependent.


## `createRegressionPlot`

**API layer:** user-facing. **Authoring roles:** H0, H1.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
createRegressionPlot(options: TargetedOptions<CreateRegressionPlotOptions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`CreateRegressionPlotOptions`](./../types.md#type-createregressionplotoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `id` | Optional / branch-dependent | `string \| undefined` |
| `data` | Optional / branch-dependent | `string \| undefined` |
| `coordinate` | Optional / branch-dependent | `string \| undefined` |
| `x` | Required | `RegressionPlotPositionChannel` |
| `y` | Required | `RegressionPlotPositionChannel` |
| `color` | Optional / branch-dependent | `BasicColorChannel \| undefined` |
| `size` | Optional / branch-dependent | `BasicSizeChannel \| undefined` |
| `shape` | Optional / branch-dependent | `BasicShapeChannel \| undefined` |
| `point` | Optional / branch-dependent | `(StrokeStyleDetails & { clip?: boolean \| undefined; radius?: number \| undefined; shape?: PointShape \| undefined; fill?: string \| undefined; opacity?: number \| undefined; stroke?: FilledMarkStroke \| undefined; strokeWidth?: number \| undefined; }) \| undefined` |
| `guides` | Optional / branch-dependent | `false \| ColorMappedPointGuideOptions \| undefined` |
| `method` | Optional / branch-dependent | `"exp" \| "linear" \| "loess" \| "polynomial" \| undefined` |
| `interval` | Optional / branch-dependent | `false \| RegressionInterval \| undefined` |
| `degree` | Optional / branch-dependent | `number \| undefined` |
| `span` | Optional / branch-dependent | `number \| undefined` |
| `robustIterations` | Optional / branch-dependent | `number \| undefined` |
| `confidenceMethod` | Optional / branch-dependent | `ConfidenceIntervalMethod \| undefined` |
| `level` | Optional / branch-dependent | `number \| undefined` |
| `confidence` | Optional / branch-dependent | `number \| undefined` |
| `predict` | Optional / branch-dependent | `RegressionPredictOptions \| undefined` |
| `placement` | Optional / branch-dependent | `"plot-last" \| "source" \| undefined` |
| `groupBy` | Optional / branch-dependent | `string \| false \| undefined` |
| `line` | Optional / branch-dependent | `(StrokeStyleDetails & { strokeWidth?: number \| undefined; curve?: CurveInterpolation \| undefined; }) \| undefined` |
| `sourceBinding` | Optional / branch-dependent | `"fixed" \| "follow" \| undefined` |
| `missing` | Optional / branch-dependent | `"drop" \| "error" \| undefined` |
| `band` | Optional / branch-dependent | `false \| RegressionBandOptions \| undefined` |
| `target` | Optional / branch-dependent | `ActionTargetList \| ScopedActionTarget` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
createRegressionPlot({ id?, data?, coordinate?, x, y, color?, size?, shape?, point?, groupBy?, method?, band?, line?, guides? })
```

Create a scatter plot with fitted regression data, a line, and optional interval bands.
`groupBy: false` is preserved as an explicit
ungrouped model request.


## `createLinePlot`

**API layer:** user-facing. **Authoring roles:** H0.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
createLinePlot(options: TargetedOptions<CreateLinePlotOptions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`CreateLinePlotOptions`](./../types.md#type-createlineplotoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `id` | Optional / branch-dependent | `string \| undefined` |
| `data` | Optional / branch-dependent | `string \| undefined` |
| `coordinate` | Optional / branch-dependent | `string \| undefined` |
| `color` | Optional / branch-dependent | `LineCategoricalColorChannel<CategoricalColorScaleOptions> \| undefined` |
| `groupBy` | Optional / branch-dependent | `string \| readonly [string, ...string[]] \| undefined` |
| `strokeDash` | Optional / branch-dependent | `Omit<{ field: string; value?: undefined; target?: string \| undefined; fieldType?: "nominal" \| "ordinal" \| undefined; scale?: DashScaleOptions \| undefined; }, "target"> \| Omit<...> \| undefined` |
| `line` | Optional / branch-dependent | `(StrokeStyleDetails & { clip?: boolean \| undefined; missing?: "break" \| "error" \| undefined; strokeWidth?: number \| undefined; curve?: CurveInterpolation \| undefined; tension?: number \| undefined; stroke?: string \| undefined; opacity?: number \| undefined; closed?: false \| undefined; }) \| undefined` |
| `x` | Required | `{ field: string; fieldType?: "quantitative" \| undefined; aggregate?: AggregateOperation \| undefined; scale?: NonPointQuantitativePositionScaleOptions \| undefined; } \| { ...; } \| LineXPositionChannel` |
| `y` | Required | `string \| (({ field: string; } & ({ fieldType: "nominal" \| "ordinal"; scale?: NonPointCategoricalPositionScaleOptions \| undefined; } \| { ...; } \| { ...; })) & { ...; }) \| ({ ...; } & { ...; }) \| ({ ...; } & { ...; }) \| ({ ...; } & { ...; })` |
| `guides` | Optional / branch-dependent | `false \| LinePlotGuides<"horizontal"> \| LinePlotGuides<"vertical"> \| undefined` |
| `target` | Optional / branch-dependent | `ActionTargetList \| ScopedActionTarget` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
createLinePlot({ id?, data?, coordinate?, x, y, color?, groupBy?, strokeDash?, line?, guides? })
```

Create a complete Cartesian line chart. `groupBy` accepts one field or a
non-empty tuple, assigned before independent series color and dash. [Basic Charts](../../api/basic-charts.md#createlineplot)

Categorical x (`nominal` or `ordinal`) accepts point/band scales and raw quantitative
or aggregate y. Vertices follow the x domain; absent an explicit domain, categories
follow first appearance. Duplicate-category rows keep source order. Missing categories
are not synthesized, and remaining observations connect across their category spacing.


## `createPolarScatterPlot`

**API layer:** user-facing. **Authoring roles:** H0.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
createPolarScatterPlot(options: TargetedOptions<CreatePolarScatterPlotOptions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`CreatePolarScatterPlotOptions`](./../types.md#type-createpolarscatterplotoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `id` | Optional / branch-dependent | `string \| undefined` |
| `data` | Optional / branch-dependent | `string \| undefined` |
| `coordinate` | Optional / branch-dependent | `string \| undefined` |
| `theta` | Required | `PolarThetaChannel` |
| `radius` | Required | `PolarRadiusChannel` |
| `color` | Optional / branch-dependent | `BasicColorChannel \| undefined` |
| `size` | Optional / branch-dependent | `BasicSizeChannel \| undefined` |
| `shape` | Optional / branch-dependent | `BasicShapeChannel \| undefined` |
| `point` | Optional / branch-dependent | `Omit<StrokeStyleDetails & { clip?: boolean \| undefined; radius?: number \| undefined; shape?: PointShape \| undefined; fill?: string \| undefined; opacity?: number \| undefined; stroke?: FilledMarkStroke \| undefined; strokeWidth?: number \| undefined; }, "clip"> \| undefined` |
| `guides` | Optional / branch-dependent | `false \| PolarPointGuideOptions \| undefined` |
| `target` | Optional / branch-dependent | `ActionTargetList \| ScopedActionTarget` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
createPolarScatterPlot({ id?, data?, coordinate?, theta, radius, color?, size?, shape?, point?, missing?, guides? })
```

Create a complete Polar point chart from required angular and radial fields.
Radial position remains independent from `size` and constant `point.radius`.
[Polar positions](../../api/position-encodings.md#polar-positions)


## `createPolarLinePlot`

**API layer:** user-facing. **Authoring roles:** H0.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
createPolarLinePlot(options: TargetedOptions<CreatePolarLinePlotOptions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`CreatePolarLinePlotOptions`](./../types.md#type-createpolarlineplotoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `id` | Optional / branch-dependent | `string \| undefined` |
| `data` | Optional / branch-dependent | `string \| undefined` |
| `coordinate` | Optional / branch-dependent | `string \| undefined` |
| `theta` | Required | `PolarThetaChannel` |
| `radius` | Required | `PolarRadiusChannel` |
| `color` | Optional / branch-dependent | `LineCategoricalColorChannel<NonPointCategoricalColorScaleOptions> \| undefined` |
| `groupBy` | Optional / branch-dependent | `string \| readonly [string, ...string[]] \| undefined` |
| `strokeDash` | Optional / branch-dependent | `Omit<{ value: DashPattern \| DashStyle; field?: undefined; target?: string \| undefined; fieldType?: undefined; scale?: undefined; }, "target"> \| (Omit<Omit<...>, "scale"> & { ...; }) \| undefined` |
| `line` | Optional / branch-dependent | `(Omit<StrokeStyleDetails & { clip?: boolean \| undefined; missing?: "break" \| "error" \| undefined; strokeWidth?: number \| undefined; curve?: CurveInterpolation \| undefined; tension?: number \| undefined; stroke?: string \| undefined; opacity?: number \| undefined; closed?: false \| undefined; }, "clip" \| ... 3 more ... \|...` |
| `guides` | Optional / branch-dependent | `false \| PolarPathGuideOptions \| undefined` |
| `target` | Optional / branch-dependent | `ActionTargetList \| ScopedActionTarget` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
createPolarLinePlot({ id?, data?, coordinate?, theta, radius, groupBy?, color?, strokeDash?, line?, guides? })
```

Create grouped Polar paths from required angular and radial fields. Paths stay
open unless `line.closed: true` is explicit. [Polar positions](../../api/position-encodings.md#polar-positions)


## `createRadarPlot`

**API layer:** user-facing. **Authoring roles:** H0.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
createRadarPlot(options: TargetedOptions<CreateRadarPlotOptions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`CreateRadarPlotOptions`](./../types.md#type-createradarplotoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `id` | Optional / branch-dependent | `string \| undefined` |
| `data` | Optional / branch-dependent | `string \| undefined` |
| `coordinate` | Optional / branch-dependent | `string \| undefined` |
| `groupBy` | Optional / branch-dependent | `string \| readonly [string, ...string[]] \| undefined` |
| `order` | Optional / branch-dependent | `readonly [RadarCategoryValue, RadarCategoryValue, RadarCategoryValue, ...RadarCategoryValue[]] \| undefined` |
| `color` | Optional / branch-dependent | `LineCategoricalColorChannel<NonPointCategoricalColorScaleOptions> \| undefined` |
| `strokeDash` | Optional / branch-dependent | `Omit<{ value: DashPattern \| DashStyle; field?: undefined; target?: string \| undefined; fieldType?: undefined; scale?: undefined; }, "target"> \| (Omit<Omit<...>, "scale"> & { ...; }) \| undefined` |
| `line` | Optional / branch-dependent | `(Omit<StrokeStyleDetails & { clip?: boolean \| undefined; missing?: "break" \| "error" \| undefined; strokeWidth?: number \| undefined; curve?: CurveInterpolation \| undefined; tension?: number \| undefined; stroke?: string \| undefined; opacity?: number \| undefined; closed?: false \| undefined; }, "clip" \| ... 3 more ... \|...` |
| `guides` | Optional / branch-dependent | `false \| RadarGuideOptions \| undefined` |
| `category` | Optional / branch-dependent | `RadarCategoryChannel \| undefined` |
| `value` | Optional / branch-dependent | `PolarRadiusChannel \| undefined` |
| `wide` | Optional / branch-dependent | `RadarWideOptions \| undefined` |
| `target` | Optional / branch-dependent | `ActionTargetList \| ScopedActionTarget` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
createRadarPlot({ id?, data?, coordinate?, category, value, groupBy?, order?, color?, strokeDash?, line?, guides? })
createRadarPlot({ id?, data?, coordinate?, wide: { fields, as?, summary?, normalize? }, groupBy?, order?, color?, strokeDash?, line?, guides? })
```

Create closed Radar paths from validated long rows or an explicit wide-to-long
Fold. Every series must contain the same ordered dimensions exactly once. Values
are used as supplied; the facade does not infer normalization. [Polar positions](../../api/position-encodings.md#polar-positions)


## `editRadarPlot`

**API layer:** user-facing. **Authoring roles:** H1, H3.

**Availability:** Development; added after v0.0.13. See [release compatibility](../../version.md).

```typescript
editRadarPlot(options: TargetedOptions<EditRadarPlotOptions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`EditRadarPlotOptions`](./../types.md#type-editradarplotoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `target` | Optional / branch-dependent | `string \| ActionTargetList \| ScopedActionTarget \| undefined` |
| `wide` | Required | `{ fields: readonly [string, string, ...string[]]; summary?: "mean" \| "median" \| false \| undefined; normalize?: "minmax" \| false \| undefined; }` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```js
editRadarPlot({ target?, wide: { fields, summary?, normalize? } })
```

Edit the dimensions and their angular order in an existing wide Radar plot. `fields` must contain
at least two distinct numeric source fields. Omit `target` only when the current or sole wide Radar
plot identifies the owner unambiguously. Long-form Radar plots are outside this editor's scope.

The action updates the owned fold, angular domain, radial geometry and closed paths together.
Series grouping, color, line appearance, coordinate and guide styles are preserved. Automatic radial
domains are recalculated; explicit radial domains remain unchanged. Angular labels and grid values
follow the revised dimension order, preserving valid explicit subsets.

```js
// Fragment: program already contains a wide Radar named "radar" and these source columns.
const revised = program.editRadarPlot({
  target: "radar",
  wide: { fields: ["quality", "speed", "cost"] }
});
```

Missing, duplicate or nonnumeric fields and incompatible targets reject without changing the
previous program. Omitted `summary` and `normalize` preserve the existing settings. Set
`summary: "mean"` or `"median"` to aggregate repeated rows by the existing series identity.
Set `normalize: "minmax"` to normalize each dimension across the resulting profiles; constant
dimensions map to zero. Set either option to `false` to return to individual observations or
raw units (individual observations require a unique series identity). Switching normalization
resets the radius domain to `[0, 1]` or the raw automatic extent; dimension-only edits preserve
an explicit domain. Original source rows and original measurements remain available.

```js
const profiles = chart().createCanvas().createData({ values: [
  { kind: "A", speed: 10, quality: 80, cost: 100 },
  { kind: "A", speed: 20, quality: 90, cost: 200 },
  { kind: "B", speed: 30, quality: 70, cost: 150 }
] }).createRadarPlot({
  wide: { fields: ["speed", "quality", "cost"], summary: "mean", normalize: "minmax" },
  groupBy: "kind", color: "kind"
});
```


## `createRugPlot`

**API layer:** user-facing. **Authoring roles:** H0.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
createRugPlot(options: TargetedOptions<CreateRugPlotOptions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`CreateRugPlotOptions`](./../types.md#type-createrugplotoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `id` | Optional / branch-dependent | `string \| undefined` |
| `data` | Optional / branch-dependent | `string \| undefined` |
| `coordinate` | Optional / branch-dependent | `string \| undefined` |
| `tick` | Optional / branch-dependent | `RugTickOptions \| undefined` |
| `guides` | Optional / branch-dependent | `false \| RugGuideOptions \| undefined` |
| `x` | Optional / branch-dependent | `RugMeasureChannel \| undefined` |
| `y` | Optional / branch-dependent | `RugMeasureChannel \| undefined` |
| `edge` | Required | `"bottom" \| "left" \| "right" \| "top"` |
| `target` | Optional / branch-dependent | `ActionTargetList \| ScopedActionTarget` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
createRugPlot({ id?, data?, x, edge: "top" | "bottom", tick?, guides? })
createRugPlot({ id?, data?, y, edge: "left" | "right", tick?, guides? })
```

Create a one-dimensional distribution from quantitative or temporal observations.
Ticks use an explicit plot edge as their constant position, so no dummy field is
needed. The default guide contains only the measure axis.

Its measure grid follows a continuous quantitative or temporal scale and rejects explicit `bandPosition`.


## `createStripPlot`

**API layer:** user-facing. **Authoring roles:** H0.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
createStripPlot(options: TargetedOptions<CreateStripPlotOptions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`CreateStripPlotOptions`](./../types.md#type-createstripplotoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `missing` | Optional / branch-dependent | `"error" \| "skip" \| undefined` |
| `id` | Optional / branch-dependent | `string \| undefined` |
| `data` | Optional / branch-dependent | `string \| undefined` |
| `coordinate` | Optional / branch-dependent | `string \| undefined` |
| `color` | Optional / branch-dependent | `BasicColorChannel \| undefined` |
| `size` | Optional / branch-dependent | `BasicSizeChannel \| undefined` |
| `shape` | Optional / branch-dependent | `BasicShapeChannel \| undefined` |
| `point` | Optional / branch-dependent | `(StrokeStyleDetails & { clip?: boolean \| undefined; radius?: number \| undefined; shape?: PointShape \| undefined; fill?: string \| undefined; opacity?: number \| undefined; stroke?: FilledMarkStroke \| undefined; strokeWidth?: number \| undefined; }) \| undefined` |
| `guides` | Optional / branch-dependent | `false \| ColorMappedPointGuideOptions \| undefined` |
| `x` | Required | `string \| { field: string; fieldType?: "quantitative" \| undefined; temporalUnit?: undefined; scale?: NonPointQuantitativePositionScaleOptions \| undefined; } \| { ...; } \| { ...; }` |
| `y` | Optional / branch-dependent | `string \| { field: string; fieldType?: "quantitative" \| undefined; temporalUnit?: undefined; scale?: NonPointQuantitativePositionScaleOptions \| undefined; } \| { ...; } \| { ...; } \| undefined` |
| `jitter` | Optional / branch-dependent | `false \| StripBandJitterOptions \| StripPixelJitterOptions \| undefined` |
| `target` | Optional / branch-dependent | `ActionTargetList \| ScopedActionTarget` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
createStripPlot({ id?, data?, x, y?, color?, size?, shape?, point?, jitter?, guides? })
```

Create a point strip from one measure or from one measure plus one categorical
slot. Optional deterministic jitter moves only the category or constant slot and
preserves the measured coordinate. Category jitter uses band units; a centered
one-measure strip uses pixel units.


## `createBeeswarmPlot`

**API layer:** user-facing. **Authoring roles:** H0.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
createBeeswarmPlot(options: TargetedOptions<CreateBeeswarmPlotOptions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`CreateBeeswarmPlotOptions`](./../types.md#type-createbeeswarmplotoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `missing` | Optional / branch-dependent | `"error" \| "skip" \| undefined` |
| `id` | Optional / branch-dependent | `string \| undefined` |
| `data` | Optional / branch-dependent | `string \| undefined` |
| `coordinate` | Optional / branch-dependent | `string \| undefined` |
| `color` | Optional / branch-dependent | `BasicColorChannel \| undefined` |
| `size` | Optional / branch-dependent | `BasicSizeChannel \| undefined` |
| `shape` | Optional / branch-dependent | `BasicShapeChannel \| undefined` |
| `point` | Optional / branch-dependent | `(StrokeStyleDetails & { clip?: boolean \| undefined; radius?: number \| undefined; shape?: PointShape \| undefined; fill?: string \| undefined; opacity?: number \| undefined; stroke?: FilledMarkStroke \| undefined; strokeWidth?: number \| undefined; }) \| undefined` |
| `packing` | Optional / branch-dependent | `false \| BeeswarmPackingOptions \| undefined` |
| `guides` | Optional / branch-dependent | `false \| ColorMappedPointGuideOptions \| undefined` |
| `x` | Required | `string \| { field: string; fieldType?: "quantitative" \| undefined; temporalUnit?: undefined; scale?: NonPointQuantitativePositionScaleOptions \| undefined; } \| { ...; } \| { ...; }` |
| `y` | Required | `string \| { field: string; fieldType?: "quantitative" \| undefined; temporalUnit?: undefined; scale?: NonPointQuantitativePositionScaleOptions \| undefined; } \| { ...; } \| { ...; }` |
| `target` | Optional / branch-dependent | `ActionTargetList \| ScopedActionTarget` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
createBeeswarmPlot({ id?, data?, coordinate?, x, y, color?, size?, shape?, point?, packing?, guides? })
```

Create a role-safe category/measure Point chart and deterministically pack actual
glyph extents within each category slot. The facade reuses `createStripPlot` and
`packPoints`; set `packing: false` to retain semantic centers without packing.


## `createRaincloudPlot`

**API layer:** user-facing. **Authoring roles:** H0, H1.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
createRaincloudPlot(options: TargetedOptions<CreateRaincloudPlotOptions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`CreateRaincloudPlotOptions`](./../types.md#type-createraincloudplotoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `missing` | Optional / branch-dependent | `"error" \| "skip" \| undefined` |
| `id` | Optional / branch-dependent | `string \| undefined` |
| `data` | Optional / branch-dependent | `string \| undefined` |
| `coordinate` | Optional / branch-dependent | `string \| undefined` |
| `category` | Required | `RaincloudCategoryChannel` |
| `value` | Required | `RaincloudValueChannel` |
| `orientation` | Optional / branch-dependent | `"horizontal" \| "vertical" \| undefined` |
| `side` | Optional / branch-dependent | `"after" \| "before" \| undefined` |
| `density` | Optional / branch-dependent | `false \| RaincloudDensityOptions \| undefined` |
| `summary` | Optional / branch-dependent | `false \| RaincloudSummaryOptions \| undefined` |
| `points` | Optional / branch-dependent | `false \| RaincloudPointsOptions \| undefined` |
| `color` | Optional / branch-dependent | `false \| RaincloudColorChannel \| undefined` |
| `guides` | Optional / branch-dependent | `false \| CartesianCategoricalPointGuideOptions \| undefined` |
| `target` | Optional / branch-dependent | `ActionTargetList \| ScopedActionTarget` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
createRaincloudPlot({ id?, data?, coordinate?, category, value, orientation?, side?, density?, summary?, points?, color?, guides? })
```

Create a shared-source distribution composite from an optional half Violin,
Box or Interval summary, and Strip or Beeswarm raw points. Defaults are vertical,
`side: "before"`, Box summary, and Beeswarm points. Stable Cloud/Summary/Points
children share role scales; summary and points use a replayable band-relative slot
offset on the side opposite the density. `color` accepts its category field or
a fixed `{ value: "#345678" }`; every enabled component receives that color.


## `editRaincloudPlot`

**API layer:** user-facing. **Authoring roles:** H1, H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
editRaincloudPlot(options: TargetedOptions<EditRaincloudPlotOptions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`EditRaincloudPlotOptions`](./../types.md#type-editraincloudplotoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `missing` | Optional / branch-dependent | `"error" \| "skip" \| undefined` |
| `target` | Optional / branch-dependent | `string \| ActionTargetList \| ScopedActionTarget \| undefined` |
| `data` | Optional / branch-dependent | `string \| undefined` |
| `category` | Optional / branch-dependent | `RaincloudCategoryChannel \| undefined` |
| `value` | Optional / branch-dependent | `RaincloudValueChannel \| undefined` |
| `orientation` | Optional / branch-dependent | `"horizontal" \| "vertical" \| undefined` |
| `side` | Optional / branch-dependent | `"after" \| "before" \| undefined` |
| `density` | Optional / branch-dependent | `false \| RaincloudDensityOptions \| undefined` |
| `summary` | Optional / branch-dependent | `false \| RaincloudSummaryOptions \| undefined` |
| `points` | Optional / branch-dependent | `false \| RaincloudPointsOptions \| undefined` |
| `color` | Optional / branch-dependent | `false \| RaincloudColorChannel \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
editRaincloudPlot({ target?, data?, category?, value?, orientation?, side?, density?, summary?, points?, color? })
```

Atomically revise one Raincloud's shared source, roles, orientation, side, and
component modes while preserving its parent and child IDs. Use `false` to disable
an optional component or remove color; at least one component must remain enabled.
Existing statistical references and their labels retain their identities, definitions,
and styles, recompute from the revised source, and remain above the rebuilt components.
Their measure axis follows orientation changes; if their original component is disabled,
they bind to the remaining parent owner.
When changing category without specifying color, an existing category-driven color
follows the new field. Explicit color requests and fixed colors remain unchanged.
An explicit parent ID also accepts `encodeColor({ target: parentId, ... })` and
observation-field `filterMarks({ target: parentId, ... })`. Parent filtering
recomputes density, summary, and raw points from one retained population;
child-ID filters remain display-only. Parent filters support replace, compose,
and removal, and require observations suitable for the enabled statistics.


## `createBarPlot`

**API layer:** user-facing. **Authoring roles:** H0.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
createBarPlot(options: TargetedOptions<CreateBarPlotOptions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`CreateBarPlotOptions`](./../types.md#type-createbarplotoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `missing` | Optional / branch-dependent | `"error" \| "skip" \| undefined` |
| `id` | Optional / branch-dependent | `string \| undefined` |
| `data` | Optional / branch-dependent | `string \| undefined` |
| `coordinate` | Optional / branch-dependent | `string \| undefined` |
| `orientation` | Optional / branch-dependent | `"horizontal" \| "vertical" \| undefined` |
| `color` | Optional / branch-dependent | `BarColorChannel \| undefined` |
| `width` | Optional / branch-dependent | `Omit<BarWidthOptions, "interval" \| "target"> \| undefined` |
| `bar` | Optional / branch-dependent | `(StrokeStyleDetails & { cornerRadius?: number \| undefined; cornerRadiusTopLeft?: number \| undefined; cornerRadiusTopRight?: number \| undefined; cornerRadiusBottomRight?: number \| undefined; cornerRadiusBottomLeft?: number \| undefined; } & { ...; }) \| undefined` |
| `guides` | Optional / branch-dependent | `false \| ColorGuides \| undefined` |
| `x` | Required | `BarRangePositionChannel \| BarRangeOppositePositionChannel \| (Omit<PositionEncodingBase, "coordinate" \| "target"> & { ...; } & { ...; }) \| (Omit<...> & ... 1 more ... & { ...; }) \| (Omit<...> & ... 1 more ... & { ...; }) \| (Omit<...> & ... 1 more ... & { ...; })` |
| `y` | Required | `BarRangePositionChannel \| BarRangeOppositePositionChannel \| ({ field: string; bin?: undefined; fieldType: "temporal"; temporalUnit?: TemporalInputUnit \| undefined; aggregate?: undefined; stack?: undefined; scale?: NonPointTemporalPositionScaleOptions \| undefined; } & { ...; }) \| ({ ...; } & ... 1 more ... & { ...; }...` |
| `target` | Optional / branch-dependent | `ActionTargetList \| ScopedActionTarget` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
createBarPlot({ id?, data?, coordinate?, orientation?, x, y, color?, width?, bar?, missing?, guides? })
```

Create categorical, temporal or binned bars with quantitative measures; bin rectangles fill their complete intervals, while category bars default to 0.72 of the slot. Use `color.layout` for grouped or stacked partitions; guides are inferred unless disabled.
A channel may instead specify `{ lower, upper, scale? }` for raw interval bars without aggregation.
Binned quantitative X with an explicit Y aggregate creates interval-width bars per bin and series; use `color.layout` or `layoutSeries` for overlay, stack, fill or group. Empty bins retain their interval gaps.
Two raw numeric positions preserve each input row and numeric center spacing.
Their orientation defaults to vertical (or follows the range channel); use
`orientation: "horizontal"` for horizontal numeric bars. Their width defaults to
5 pixels and accepts `width: { pixels }`, with overlay layout only. Numeric bars
extend to zero unless explicit lower/upper bounds are supplied.
Category-first child calls infer the ordinary single-field measure's mean in either orientation; temporal categories are supported on both axes.
[Basic Charts](../../api/basic-charts.md#createbarplot)


## `createHistogram`

**API layer:** user-facing. **Authoring roles:** H0, H1.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
createHistogram(options: TargetedOptions<CreateHistogramOptions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`CreateHistogramOptions`](./../types.md#type-createhistogramoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `xScale` | Optional / branch-dependent | `NonPointQuantitativePositionScaleOptions \| undefined` |
| `yScale` | Optional / branch-dependent | `NonPointZeroSupportingPositionScaleOptions \| undefined` |
| `weight` | Optional / branch-dependent | `StatisticalWeight \| undefined` |
| `maxBins` | Optional / branch-dependent | `number \| undefined` |
| `binStep` | Optional / branch-dependent | `number \| undefined` |
| `binBoundaries` | Optional / branch-dependent | `readonly [number, number, ...number[]] \| undefined` |
| `stack` | Optional / branch-dependent | `StackMode \| undefined` |
| `id` | Optional / branch-dependent | `string \| undefined` |
| `data` | Optional / branch-dependent | `string \| undefined` |
| `coordinate` | Optional / branch-dependent | `string \| undefined` |
| `field` | Required | `string` |
| `color` | Optional / branch-dependent | `HistogramCategoricalColorChannel \| undefined` |
| `bar` | Optional / branch-dependent | `(StrokeStyleDetails & { cornerRadius?: number \| undefined; cornerRadiusTopLeft?: number \| undefined; cornerRadiusTopRight?: number \| undefined; cornerRadiusBottomRight?: number \| undefined; cornerRadiusBottomLeft?: number \| undefined; } & { ...; }) \| undefined` |
| `guides` | Optional / branch-dependent | `false \| (Omit<CartesianCategoricalGuideOptions, "grid"> & { grid?: false \| ContinuousCartesianGridOptions \| undefined; }) \| undefined` |
| `target` | Optional / branch-dependent | `ActionTargetList \| ScopedActionTarget` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
createHistogram({ id?, data?, coordinate?, field, maxBins?, binStep?, binBoundaries?, stack?, xScale?, yScale?, color?, bar?, guides? })
```

Create a bar layer with atomic bin and count encodings. Exactly one bin mode may
be specified. [Basic Charts](../../api/basic-charts.md#createhistogram)


## `createHeatmap`

**API layer:** user-facing. **Authoring roles:** H0.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
createHeatmap(options: TargetedOptions<CreateHeatmapOptions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`CreateHeatmapOptions`](./../types.md#type-createheatmapoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `x` | Required | `BinnedHeatmapPositionChannel \| HeatmapCategoryPositionChannel` |
| `y` | Required | `BinnedHeatmapPositionChannel \| HeatmapCategoryPositionChannel` |
| `bin` | Optional / branch-dependent | `HeatmapBinOptions \| undefined` |
| `color` | Optional / branch-dependent | `BinnedHeatmapColorOptions \| RectColorChannel \| undefined` |
| `id` | Optional / branch-dependent | `string \| undefined` |
| `data` | Optional / branch-dependent | `string \| undefined` |
| `coordinate` | Optional / branch-dependent | `string \| undefined` |
| `rect` | Optional / branch-dependent | `(StrokeStyleDetails & { cornerRadius?: number \| undefined; cornerRadiusTopLeft?: number \| undefined; cornerRadiusTopRight?: number \| undefined; cornerRadiusBottomRight?: number \| undefined; cornerRadiusBottomLeft?: number \| undefined; } & { ...; }) \| undefined` |
| `guides` | Optional / branch-dependent | `false \| CartesianSeparateGuideOptions \| undefined` |
| `target` | Optional / branch-dependent | `ActionTargetList \| ScopedActionTarget` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
createHeatmap({ id?, data?, coordinate?, x, y, bin?, color?, rect?, guides? })
```

Create one rect cell per valid pre-gridded row, or bin raw quantitative x/y rows
into ranged cells colored by count. [Basic Charts](../../api/basic-charts.md#createheatmap)


## `createParallelCoordinates`

**API layer:** user-facing. **Authoring roles:** H0.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
createParallelCoordinates(options: TargetedOptions<CreateParallelCoordinatesOptions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`CreateParallelCoordinatesOptions`](./../types.md#type-createparallelcoordinatesoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `id` | Optional / branch-dependent | `string \| undefined` |
| `data` | Optional / branch-dependent | `string \| undefined` |
| `coordinate` | Optional / branch-dependent | `string \| undefined` |
| `dimensions` | Required | `readonly [ParallelDimension, ParallelDimension, ...ParallelDimension[]]` |
| `key` | Optional / branch-dependent | `string \| undefined` |
| `missing` | Optional / branch-dependent | `ParallelMissingPolicy \| undefined` |
| `color` | Optional / branch-dependent | `LineCategoricalColorChannel<NonPointCategoricalColorScaleOptions> \| undefined` |
| `strokeDash` | Optional / branch-dependent | `Omit<{ value: DashPattern \| DashStyle; field?: undefined; target?: string \| undefined; fieldType?: undefined; scale?: undefined; }, "target"> \| (Omit<Omit<...>, "scale"> & { ...; }) \| undefined` |
| `line` | Optional / branch-dependent | `(StrokeStyleDetails & { strokeWidth?: number \| undefined; stroke?: string \| undefined; opacity?: number \| undefined; curve?: "linear" \| undefined; closed?: false \| undefined; }) \| undefined` |
| `guides` | Optional / branch-dependent | `false \| ParallelGuideOptions \| undefined` |
| `target` | Optional / branch-dependent | `ActionTargetList \| ScopedActionTarget` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
createParallelCoordinates({ id?, data?, coordinate?, dimensions, key?, missing?, color?, strokeDash?, line?, guides? })
```

Create one open line path per source row across an ordered list of dimension-
local scales and axes. Only `dimensions` is required.
[Parallel Coordinates](../../api/parallel-coordinates.md)


## `createPiePlot`

**API layer:** user-facing. **Authoring roles:** H0.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
createPiePlot(options: TargetedOptions<CreatePiePlotOptions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`CreatePiePlotOptions`](./../types.md#type-createpieplotoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `id` | Optional / branch-dependent | `string \| undefined` |
| `data` | Optional / branch-dependent | `string \| undefined` |
| `coordinate` | Optional / branch-dependent | `string \| undefined` |
| `category` | Required | `PieCategory` |
| `color` | Optional / branch-dependent | `false \| PieColor \| undefined` |
| `radius` | Optional / branch-dependent | `PieRadiusChannel \| undefined` |
| `arc` | Optional / branch-dependent | `(StrokeStyleDetails & { innerRadius?: ArcInnerRadius \| undefined; padAngle?: number \| undefined; fill?: FillPaint \| undefined; opacity?: number \| undefined; stroke?: string \| undefined; strokeWidth?: number \| undefined; }) \| undefined` |
| `guides` | Optional / branch-dependent | `false \| { axes?: false \| undefined; grid?: false \| undefined; legend?: false \| PieLegendOptions \| undefined; } \| undefined` |
| `value` | Optional / branch-dependent | `string \| undefined` |
| `aggregate` | Optional / branch-dependent | `"count" \| "sum" \| undefined` |
| `target` | Optional / branch-dependent | `ActionTargetList \| ScopedActionTarget` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
createPiePlot({ id?, data?, coordinate?, category, value?, aggregate?, color?, radius?, arc?, guides? })
```

Create one sector per category in the full package. `category` is required and
defaults to nominal count, including numeric categories. For weights, provide
`value`; this infers `aggregate: "sum"`. Values must be finite and nonnegative with
a positive total. Color defaults to the category. Use `color: false` for a
scalar `arc.fill`; otherwise each slice must resolve to one categorical color.

Optional `radius` independently maps each slice's outer radius while preserving
proportional angles. Use a field string for one consistent value per category,
or `{ field: "amount", aggregate: "sum", scale: { type: "sqrt" } }` to sum
radius values per category. `{ aggregate: "count" }` counts rows without a field.
Domains use the final category measures. New non-log radius scales default to
`zero: true`; explicit scale settings override that default and existing scales
retain their policy. Every mapped outer radius must exceed the inner radius.
Value/share labels continue to describe angular values. Use `encodeR` to edit
the radius; equal-angle rose/radial-bar mappings are separate chart types.

`arc.innerRadius` is a radius ratio in [0,1) or `{ unit: "px", value }` for a non-negative fixed inner radius smaller than the outer radius; `arc.padAngle` is in degrees.
Use these options for a donut. `guides` defaults to a color legend with no axes
or grid; `guides: false` skips guide creation. Explicit axes/grid requests must
be false. A zero-weight category may remain in the color legend without a sector.
The default id is `piePlot`. Edit with `editArcMark`, theta/color encodings,
scales and legend actions. [Pie and donut tutorial](../../tutorials/polar-arcs.md#complete-pie-and-donut-plots)


## `createRosePlot`

**API layer:** user-facing. **Authoring roles:** H0.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
createRosePlot(options: TargetedOptions<CreateRosePlotOptions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`CreateRosePlotOptions`](./../types.md#type-createroseplotoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `id` | Optional / branch-dependent | `string \| undefined` |
| `data` | Optional / branch-dependent | `string \| undefined` |
| `coordinate` | Optional / branch-dependent | `string \| undefined` |
| `category` | Required | `PieCategory` |
| `color` | Optional / branch-dependent | `false \| PieColor \| undefined` |
| `radiusScale` | Optional / branch-dependent | `MeasuredRadiusScaleOptions \| undefined` |
| `arc` | Optional / branch-dependent | `(StrokeStyleDetails & { innerRadius?: ArcInnerRadius \| undefined; padAngle?: 0 \| undefined; fill?: FillPaint \| undefined; opacity?: number \| undefined; stroke?: string \| undefined; strokeWidth?: number \| undefined; }) \| undefined` |
| `guides` | Optional / branch-dependent | `false \| MeasuredRadialGuideOptions \| undefined` |
| `value` | Optional / branch-dependent | `string \| undefined` |
| `aggregate` | Optional / branch-dependent | `"count" \| "sum" \| undefined` |
| `target` | Optional / branch-dependent | `ActionTargetList \| ScopedActionTarget` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
createRosePlot({ id?, data?, coordinate?, category, value?, aggregate?, radiusScale?, color?, arc?, guides? })
```

Create equal-angle sectors whose sector area, excluding the hole is proportional to category count or sum. Category is required; omit value for count or provide value to infer aggregate: "sum". Color defaults to category and guides provide theta/radius axes, Polar grids, and a categorical legend. Use guides:false to skip them, or color:false with arc.fill for one color.

The default id is `rosePlot`. Radius scales are linear and zero-based; explicit domain [0,U] must cover all aggregates and range [inner,outer] must fit the resolved Polar frame. Arc padAngle is 0 and an explicitly specified innerRadius must agree with the range. Zero categories retain domain entries but draw no sector. Negative, nonfinite, empty/all-zero and unrepresentable positive-thickness inputs are errors. Edit the child mark, encodings, scales and guides with their own actions.

[Measured radial tutorial](../../tutorials/polar-arcs.md#measured-rose-and-radial-bar-plots)


## `createRadialBarPlot`

**API layer:** user-facing. **Authoring roles:** H0.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
createRadialBarPlot(options: TargetedOptions<CreateRadialBarPlotOptions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`CreateRadialBarPlotOptions`](./../types.md#type-createradialbarplotoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `id` | Optional / branch-dependent | `string \| undefined` |
| `data` | Optional / branch-dependent | `string \| undefined` |
| `coordinate` | Optional / branch-dependent | `string \| undefined` |
| `category` | Required | `PieCategory` |
| `color` | Optional / branch-dependent | `false \| PieColor \| undefined` |
| `radiusScale` | Optional / branch-dependent | `MeasuredRadiusScaleOptions \| undefined` |
| `arc` | Optional / branch-dependent | `(StrokeStyleDetails & { innerRadius?: ArcInnerRadius \| undefined; padAngle?: 0 \| undefined; fill?: FillPaint \| undefined; opacity?: number \| undefined; stroke?: string \| undefined; strokeWidth?: number \| undefined; }) \| undefined` |
| `guides` | Optional / branch-dependent | `false \| MeasuredRadialGuideOptions \| undefined` |
| `value` | Optional / branch-dependent | `string \| undefined` |
| `aggregate` | Optional / branch-dependent | `"count" \| "sum" \| undefined` |
| `target` | Optional / branch-dependent | `ActionTargetList \| ScopedActionTarget` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
createRadialBarPlot({ id?, data?, coordinate?, category, value?, aggregate?, radiusScale?, color?, arc?, guides? })
```

Create equal-angle sectors whose radial length measured from the inner edge is proportional to category count or sum. Category is required; omit value for count or provide value to infer aggregate: "sum". Color defaults to category and guides provide theta/radius axes, Polar grids, and a categorical legend. Use guides:false to skip them, or color:false with arc.fill for one color.

The default id is `radialBarPlot`. Radius scales are linear and zero-based; explicit domain [0,U] must cover all aggregates and range [inner,outer] must fit the resolved Polar frame. Arc padAngle is 0 and an explicitly specified innerRadius must agree with the range. Zero categories retain domain entries but draw no sector. Negative, nonfinite, empty/all-zero and unrepresentable positive-thickness inputs are errors. Edit the child mark, encodings, scales and guides with their own actions.

[Measured radial tutorial](../../tutorials/polar-arcs.md#measured-rose-and-radial-bar-plots)


## `createAreaPlot`

**API layer:** user-facing. **Authoring roles:** H0.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
createAreaPlot(options: TargetedOptions<CreateAreaPlotOptions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`CreateAreaPlotOptions`](./../types.md#type-createareaplotoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `id` | Optional / branch-dependent | `string \| undefined` |
| `data` | Optional / branch-dependent | `string \| undefined` |
| `coordinate` | Optional / branch-dependent | `string \| undefined` |
| `groupBy` | Optional / branch-dependent | `string \| readonly [string, ...string[]] \| undefined` |
| `layout` | Optional / branch-dependent | `"center" \| "diverging" \| "fill" \| "overlay" \| "stack" \| undefined` |
| `missing` | Optional / branch-dependent | `"break" \| "error" \| undefined` |
| `color` | Optional / branch-dependent | `string \| { field: string; fieldType?: "nominal" \| "ordinal" \| undefined; scale?: NonPointCategoricalColorScaleOptions \| undefined; palette?: Palette \| undefined; } \| undefined` |
| `area` | Optional / branch-dependent | `(StrokeStyleDetails & { clip?: boolean \| undefined; fill?: FillPaint \| undefined; opacity?: number \| undefined; stroke?: string \| undefined; strokeWidth?: number \| undefined; curve?: CurveInterpolation \| undefined; }) \| undefined` |
| `guides` | Optional / branch-dependent | `false \| (Omit<DensityPlotGuideOptions, "grid"> & { grid?: false \| CartesianGridOptions \| undefined; }) \| undefined` |
| `valueChannel` | Optional / branch-dependent | `"x" \| "y" \| undefined` |
| `x` | Required | `{ field: string; scale?: NonPointQuantitativePositionScaleOptions \| undefined; } \| AreaPlotIndependentChannel \| ({ ...; } & ({ ...; } \| { ...; }))` |
| `y` | Required | `{ field: string; scale?: NonPointQuantitativePositionScaleOptions \| undefined; } \| AreaPlotIndependentChannel \| ({ ...; } & ({ ...; } \| { ...; }))` |
| `baseline` | Optional / branch-dependent | `number \| undefined` |
| `target` | Optional / branch-dependent | `ActionTargetList \| ScopedActionTarget` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
createAreaPlot({ id?, data?, coordinate?, x, y, valueChannel?, baseline?, groupBy?, layout?, missing?, color?, area?, guides? })
```

Create a simple area, crossing ribbon, or accumulated series chart in the full entry. The default ID is
`areaPlot`; x and y are required. `valueChannel` defaults to y. Its measurement is a field string,
`{field,scale?}`, or `{lower,upper,scale?}`. Each bound is a field string or finite `{datum}` and at least
one bound must use a field. A simple field closes to baseline 0; `baseline` cannot accompany a range.
The independent position is quantitative, temporal, nominal, or ordinal. Categorical positions follow the scale domain order and accept point or band scales; temporalUnit applies only to temporal fields.

`groupBy` explicitly identifies nominal series using a field or a unique nonempty tuple. Color is optional,
categorical, and constant within each series. `layout` defaults to overlay; stack/fill/diverging require
one value field, baseline 0 and aligned unique group×position rows. Center also requires vertical nonnegative
values. Missing defaults to error; `missing:"break"` closes separate segments with at least two valid points.
A missing measure at one position splits every accumulated series there. NaN, infinity and missing independent
positions remain errors. No source rows or baseline fields are synthesized.

`area` accepts fill/opacity/stroke/strokeWidth/curve; opacity defaults to .2. Field color conflicts with fill.
Guides default to compatible Cartesian axes/grid and an optional categorical color legend; false skips creation.
Edit the result with range/endpoint encodings, encodeGroup, layoutSeries, editAreaMark and scale/guide actions.
See the [Area and series layout tutorial](../../tutorials/area-layout.md).


## `createLayerPlot`

**API layer:** user-facing. **Authoring roles:** H0.

**Availability:** Development; added after v0.0.13. See [release compatibility](../../version.md).

```typescript
createLayerPlot(options: TargetedOptions<CreateLayerPlotOptions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`CreateLayerPlotOptions`](./../types.md#type-createlayerplotoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `id` | Optional / branch-dependent | `string \| undefined` |
| `source` | Optional / branch-dependent | `string \| undefined` |
| `plot` | Required | `LayerPlotSpecification` |
| `placement` | Optional / branch-dependent | `"back" \| "front" \| undefined` |
| `target` | Optional / branch-dependent | `ActionTargetList \| ScopedActionTarget` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
createLayerPlot({ id?, source?, plot: { action, options? }, placement?: "front" | "back" })
```

Add an independent native chart to the source chart's coordinates. Data and positional
roles are inferred from the original fields, including distribution summaries. Compatible
measurement units and named scales are shared; appearance remains independently editable.
The entire owned mark group moves together in front of or behind the source.
`getPlotComposition(program, { target })` from `ggaction/inspection` describes the source
roles. Use `createOverlay` to follow already computed visible results instead.
[Independent layers and adjacent charts](../../api/composition/editing.md)


## `createAdjacentPlot`

**API layer:** user-facing. **Authoring roles:** H0.

**Availability:** Development; added after v0.0.13. See [release compatibility](../../version.md).

```typescript
createAdjacentPlot(options?: TargetedOptions<CreateAdjacentPlotOptions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`CreateAdjacentPlotOptions`](./../types.md#type-createadjacentplotoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `legends` | Optional / branch-dependent | `"collect" \| "local" \| undefined` |
| `id` | Optional / branch-dependent | `string \| undefined` |
| `source` | Optional / branch-dependent | `string \| { childPath: readonly string[]; id: string; } \| undefined` |
| `position` | Optional / branch-dependent | `"bottom" \| "left" \| "right" \| "top" \| undefined` |
| `plot` | Optional / branch-dependent | `AdjacentPlotSpecification \| undefined` |
| `share` | Optional / branch-dependent | `CompositionShares \| undefined` |
| `gap` | Optional / branch-dependent | `number \| undefined` |
| `align` | Optional / branch-dependent | `"plot" \| CompositionAlign \| undefined` |
| `target` | Optional / branch-dependent | `ActionTargetList \| ScopedActionTarget` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
createAdjacentPlot({ id?, source?, position?, plot?, share?, gap?, align? } = {})
```

Add an independent chart next to a unit or facet view. Placement is left, right, top or bottom.
The default line inherits source fields, binning and aggregation; `plot: { action, options }`
selects any built-in chart constructor. Original fields and data are inferred through each
constructor's native positional roles; ambiguous additional fields require explicit options. `plot.options.data` selects a materialized source-view dataset;
the adjacent view receives its own snapshot and retains the source view's materialized input
tables, so later charts can use variables omitted from a summary. Completed-key tables retain
their original field and aggregation meanings during inference. The top-level `id` owns its view and mark.
Horizontal placement shares compatible Y meanings by default; vertical placement shares
compatible X meanings. Different aggregates or coordinate families stay independent. An
explicit `share` replaces that default and rejects incompatible meanings. `align: "plot"` matches actual plot frames without stretching text or symbols.
Shared color legends retain their plot-relative position and offset, reusing child margins
instead of adding another empty lane outside the child Canvases. Automatic offsets clear
retained content; explicit offsets remain exact and reject collisions.
[Shared scales and adjacent charts](../../api/composition/editing.md)


## `editCompositionScales`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Development; added after v0.0.13. See [release compatibility](../../version.md).

```typescript
editCompositionScales(options: TargetedOptions<EditCompositionScalesOptions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`EditCompositionScalesOptions`](./../types.md#type-editcompositionscalesoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `share` | Required | `CompositionShares` |
| `target` | Optional / branch-dependent | `ActionTargetList \| ScopedActionTarget` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
editCompositionScales({ share })
```

Update a nonempty subset of concat shared-channel policies. Boolean keys include x, y,
color, stroke, size, shape, opacity, strokeWidth and strokeDash. Shared channels require
compatible meaning and scale mapping. Canonical child settings remain intact; setting a
channel false restores independent domain inference. This edit is atomic.


## `createImageResource`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Development; added after v0.0.13. See [release compatibility](../../version.md).

```typescript
createImageResource(options: ApplyImageResourceOptions<"create">): ChartProgram;
```

Named option contracts: [`ApplyImageResourceOptions`](./../types.md#type-applyimageresourceoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `prepared` | Required | `PreparedImageResource<"create">` |
| `requestToken` | Required | `string` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```js
createImageResource({ prepared, requestToken })
```

Commit an authentic create handle from `prepareImageResource` on its exact original
receiver. Full-only; source bytes, MIME, hash and decoded dimensions are validated
before synchronous authoring. [Preparation and rendering](../../api/rendering.md#embedded-images).


## `replaceImageResource`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Development; added after v0.0.13. See [release compatibility](../../version.md).

```typescript
replaceImageResource(options: ApplyImageResourceOptions<"replace">): ChartProgram;
```

Named option contracts: [`ApplyImageResourceOptions`](./../types.md#type-applyimageresourceoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `prepared` | Required | `PreparedImageResource<"replace">` |
| `requestToken` | Required | `string` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```js
replaceImageResource({ prepared, requestToken })
```

Commit a prepared replacement, increment the image revision and rematerialize all
referencing image marks while preserving item identity and highlight intent.


## `removeResource`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Development; added after v0.0.13. See [release compatibility](../../version.md).

```typescript
removeResource(options: RemoveStoredResourceOptions): ChartProgram;
```

Named option contracts: [`RemoveStoredResourceOptions`](./../types.md#type-removestoredresourceoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `kind` | Required | `StoredResourceKind` |
| `id` | Required | `string` |
| `cascade` | Optional / branch-dependent | `boolean \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```js
removeResource({ kind, id, cascade? })
```

Remove an unused typed stored resource. Default restrict rejects live references.
Explicit image cascade removes its image marks before removing the source.


## `createHierarchyData`

**API layer:** user-facing. **Authoring roles:** H2.

**Availability:** Development; added after v0.0.13. See [release compatibility](../../version.md).

```typescript
createHierarchyData(options: TargetedOptions<CreateHierarchyDataOptions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`CreateHierarchyDataOptions`](./../types.md#type-createhierarchydataoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `key` | Optional / branch-dependent | `string \| undefined` |
| `parent` | Optional / branch-dependent | `string \| undefined` |
| `value` | Required | `string` |
| `children` | Optional / branch-dependent | `string \| undefined` |
| `groupFields` | Optional / branch-dependent | `readonly string[] \| undefined` |
| `valueMode` | Optional / branch-dependent | `HierarchyValueMode \| undefined` |
| `forest` | Optional / branch-dependent | `boolean \| undefined` |
| `missingCategory` | Optional / branch-dependent | `"error" \| "include" \| undefined` |
| `id` | Required | `string` |
| `data` | Optional / branch-dependent | `string \| undefined` |
| `maxNodes` | Optional / branch-dependent | `number \| undefined` |
| `target` | Optional / branch-dependent | `ActionTargetList \| ScopedActionTarget` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
createHierarchyData({ id, data?, key?, parent?, children?, groupFields?, value, valueMode?, forest?, missingCategory?, maxNodes? })
```

Create a typed hierarchy from flat parent rows, nested children, or grouped paths. Full only.
[Hierarchy resources and plots](../../api/hierarchy.md#createhierarchydata)


## `editHierarchyData`

**API layer:** user-facing. **Authoring roles:** H2.

**Availability:** Development; added after v0.0.13. See [release compatibility](../../version.md).

```typescript
editHierarchyData(options: TargetedOptions<EditHierarchyDataOptions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`EditHierarchyDataOptions`](./../types.md#type-edithierarchydataoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `key` | Optional / branch-dependent | `string \| undefined` |
| `parent` | Optional / branch-dependent | `string \| undefined` |
| `value` | Optional / branch-dependent | `string \| undefined` |
| `children` | Optional / branch-dependent | `string \| undefined` |
| `groupFields` | Optional / branch-dependent | `readonly string[] \| undefined` |
| `valueMode` | Optional / branch-dependent | `HierarchyValueMode \| undefined` |
| `forest` | Optional / branch-dependent | `boolean \| undefined` |
| `missingCategory` | Optional / branch-dependent | `"error" \| "include" \| undefined` |
| `target` | Optional / branch-dependent | `string \| ActionTargetList \| ScopedActionTarget \| undefined` |
| `data` | Optional / branch-dependent | `string \| undefined` |
| `maxNodes` | Optional / branch-dependent | `number \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
editHierarchyData({ target?, data?, key?, parent?, children?, groupFields?, value?, valueMode?, forest?, missingCategory?, maxNodes? })
```

Revise hierarchy input options and refresh every dependent layout and plot atomically. Full only.
[Hierarchy resources and plots](../../api/hierarchy.md#edithierarchydata)


## `layoutHierarchy`

**API layer:** user-facing. **Authoring roles:** H2.

**Availability:** Development; added after v0.0.13. See [release compatibility](../../version.md).

```typescript
layoutHierarchy(options: TargetedOptions<LayoutHierarchyOptions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`LayoutHierarchyOptions`](./../types.md#type-layouthierarchyoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `id` | Required | `string` |
| `hierarchy` | Optional / branch-dependent | `string \| undefined` |
| `order` | Optional / branch-dependent | `HierarchyOrder \| undefined` |
| `method` | Required | `"partition" \| "tree" \| "treemap"` |
| `options` | Optional / branch-dependent | `HierarchyTreemapOptions \| { maxNodes?: number \| undefined; } \| HierarchyTreeOptions \| undefined` |
| `target` | Optional / branch-dependent | `ActionTargetList \| ScopedActionTarget` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
layoutHierarchy({ id, hierarchy?, method, order?, options? })
```

Compute an explicit tree, treemap, or normalized partition layout from a named hierarchy. Full only.
[Hierarchy resources and plots](../../api/hierarchy.md#layouthierarchy)


## `editLayout`

**API layer:** user-facing. **Authoring roles:** H2.

**Availability:** Development; added after v0.0.13. See [release compatibility](../../version.md).

```typescript
editLayout(options: TargetedOptions<EditLayoutOptions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`EditLayoutOptions`](./../types.md#type-editlayoutoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `target` | Optional / branch-dependent | `string \| ActionTargetList \| ScopedActionTarget \| undefined` |
| `order` | Optional / branch-dependent | `HierarchyOrder \| undefined` |
| `options` | Optional / branch-dependent | `FlowLayoutOptions \| GraphCircularOptions \| GraphForceOptions \| Partial<GraphFixedOptions> \| ... 4 more ... \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
editLayout({ target?, order?, options? })
```

Patch a stored hierarchy or graph layout and refresh its existing consumers. Full only.
[Hierarchy resources and plots](../../api/hierarchy.md#editlayout)


## `createTreePlot`

**API layer:** user-facing. **Authoring roles:** H0, H1.

**Availability:** Development; added after v0.0.13. See [release compatibility](../../version.md).

```typescript
createTreePlot(options?: TargetedOptions<TreePlotOptions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`TreePlotOptions`](./../types.md#type-treeplotoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `id` | Optional / branch-dependent | `string \| undefined` |
| `layout` | Optional / branch-dependent | `string \| undefined` |
| `origin` | Optional / branch-dependent | `"auto" \| readonly [number, number] \| undefined` |
| `clip` | Optional / branch-dependent | `boolean \| undefined` |
| `nodes` | Optional / branch-dependent | `(HierarchyNodePaint & { overrides?: readonly (HierarchyNodeTarget & HierarchyNodePaint)[] \| undefined; }) \| undefined` |
| `links` | Optional / branch-dependent | `false \| { stroke?: string \| undefined; strokeWidth?: number \| undefined; opacity?: number \| undefined; shadow?: false \| MarkShadow \| undefined; } \| undefined` |
| `labels` | Optional / branch-dependent | `false \| HierarchyLabelsOptions \| undefined` |
| `target` | Optional / branch-dependent | `ActionTargetList \| ScopedActionTarget` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
createTreePlot({ id?, layout?, origin?, clip?, nodes?, links?, labels? })
```

Draw hierarchy nodes and parent links from a stored tree layout. Full only.
[Hierarchy resources and plots](../../api/hierarchy.md#createtreeplot)


## `editTreePlot`

**API layer:** user-facing. **Authoring roles:** H1, H3.

**Availability:** Development; added after v0.0.13. See [release compatibility](../../version.md).

```typescript
editTreePlot(options: TargetedOptions<EditTreePlotOptions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`EditTreePlotOptions`](./../types.md#type-edittreeplotoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `target` | Optional / branch-dependent | `string \| ActionTargetList \| ScopedActionTarget \| undefined` |
| `layout` | Optional / branch-dependent | `string \| undefined` |
| `origin` | Optional / branch-dependent | `"auto" \| readonly [number, number] \| undefined` |
| `clip` | Optional / branch-dependent | `boolean \| undefined` |
| `nodes` | Optional / branch-dependent | `(HierarchyNodePaint & { overrides?: readonly (HierarchyNodeTarget & HierarchyNodePaint)[] \| undefined; }) \| undefined` |
| `links` | Optional / branch-dependent | `false \| { stroke?: string \| undefined; strokeWidth?: number \| undefined; opacity?: number \| undefined; shadow?: false \| MarkShadow \| undefined; } \| undefined` |
| `labels` | Optional / branch-dependent | `false \| HierarchyLabelsOptions \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
editTreePlot({ target?, layout?, origin?, clip?, nodes?, links?, labels? })
```

Edit tree nodes, links, labels, placement, or the bound tree layout. Full only.
[Hierarchy resources and plots](../../api/hierarchy.md#edittreeplot)


## `createTreemapPlot`

**API layer:** user-facing. **Authoring roles:** H0, H1.

**Availability:** Development; added after v0.0.13. See [release compatibility](../../version.md).

```typescript
createTreemapPlot(options?: TargetedOptions<TreemapPlotOptions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`TreemapPlotOptions`](./../types.md#type-treemapplotoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `id` | Optional / branch-dependent | `string \| undefined` |
| `layout` | Optional / branch-dependent | `string \| undefined` |
| `origin` | Optional / branch-dependent | `"auto" \| readonly [number, number] \| undefined` |
| `clip` | Optional / branch-dependent | `boolean \| undefined` |
| `cells` | Optional / branch-dependent | `(HierarchyBodyPaint & { overrides?: readonly (HierarchyNodeTarget & HierarchyBodyPaint)[] \| undefined; }) \| undefined` |
| `labels` | Optional / branch-dependent | `false \| HierarchyLabelsOptions \| undefined` |
| `target` | Optional / branch-dependent | `ActionTargetList \| ScopedActionTarget` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
createTreemapPlot({ id?, layout?, origin?, clip?, cells?, labels? })
```

Draw nested rectangles from a stored treemap layout. Full only.
[Hierarchy resources and plots](../../api/hierarchy.md#createtreemapplot)


## `editTreemapPlot`

**API layer:** user-facing. **Authoring roles:** H1, H3.

**Availability:** Development; added after v0.0.13. See [release compatibility](../../version.md).

```typescript
editTreemapPlot(options: TargetedOptions<EditTreemapPlotOptions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`EditTreemapPlotOptions`](./../types.md#type-edittreemapplotoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `target` | Optional / branch-dependent | `string \| ActionTargetList \| ScopedActionTarget \| undefined` |
| `layout` | Optional / branch-dependent | `string \| undefined` |
| `origin` | Optional / branch-dependent | `"auto" \| readonly [number, number] \| undefined` |
| `clip` | Optional / branch-dependent | `boolean \| undefined` |
| `cells` | Optional / branch-dependent | `(HierarchyBodyPaint & { overrides?: readonly (HierarchyNodeTarget & HierarchyBodyPaint)[] \| undefined; }) \| undefined` |
| `labels` | Optional / branch-dependent | `false \| HierarchyLabelsOptions \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
editTreemapPlot({ target?, layout?, origin?, clip?, cells?, labels? })
```

Edit treemap cells, labels, placement, or the bound treemap layout. Full only.
[Hierarchy resources and plots](../../api/hierarchy.md#edittreemapplot)


## `layoutGraph`

**API layer:** user-facing. **Authoring roles:** H2.

**Availability:** Development; added after v0.0.13. See [release compatibility](../../version.md).

```typescript
layoutGraph(options: TargetedOptions<LayoutGraphOptions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`LayoutGraphOptions`](./../types.md#type-layoutgraphoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `id` | Required | `string` |
| `graph` | Optional / branch-dependent | `string \| undefined` |
| `method` | Required | `"circular" \| "fixed" \| "force"` |
| `options` | Optional / branch-dependent | `GraphCircularOptions \| GraphFixedOptions \| GraphForceOptions \| undefined` |
| `target` | Optional / branch-dependent | `ActionTargetList \| ScopedActionTarget` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
layoutGraph({ id, graph?, method, options? })
```

Store a fixed, circular, or deterministic force layout of an existing graph. Full only.
[Graph data and layouts](../../api/data/source-and-derived.md#layoutgraph)


## `createGraphPlot`

**API layer:** user-facing. **Authoring roles:** H0, H1.

**Availability:** Development; added after v0.0.13. See [release compatibility](../../version.md).

```typescript
createGraphPlot(options?: TargetedOptions<GraphPlotOptions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`GraphPlotOptions`](./../types.md#type-graphplotoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `id` | Optional / branch-dependent | `string \| undefined` |
| `layout` | Optional / branch-dependent | `string \| undefined` |
| `routes` | Optional / branch-dependent | `string \| false \| undefined` |
| `origin` | Optional / branch-dependent | `"auto" \| readonly [number, number] \| undefined` |
| `clip` | Optional / branch-dependent | `boolean \| undefined` |
| `nodes` | Optional / branch-dependent | `(GraphNodePaint & { overrides?: readonly (GraphNodePaint & { key: RowKey; })[] \| undefined; }) \| undefined` |
| `edges` | Optional / branch-dependent | `GraphEdgePaint \| undefined` |
| `labels` | Optional / branch-dependent | `false \| GraphLabelsOptions \| undefined` |
| `target` | Optional / branch-dependent | `ActionTargetList \| ScopedActionTarget` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

Draw stored graph nodes, edge routes and optional labels. See [Graph plots](../../api/graphs.md#creategraphplot) for full defaults, typed overrides and supported consumers.


## `editGraphPlot`

**API layer:** user-facing. **Authoring roles:** H1, H3.

**Availability:** Development; added after v0.0.13. See [release compatibility](../../version.md).

```typescript
editGraphPlot(options: TargetedOptions<EditGraphPlotOptions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`EditGraphPlotOptions`](./../types.md#type-editgraphplotoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `target` | Optional / branch-dependent | `string \| ActionTargetList \| ScopedActionTarget \| undefined` |
| `layout` | Optional / branch-dependent | `string \| undefined` |
| `routes` | Optional / branch-dependent | `string \| false \| undefined` |
| `origin` | Optional / branch-dependent | `"auto" \| readonly [number, number] \| undefined` |
| `clip` | Optional / branch-dependent | `boolean \| undefined` |
| `nodes` | Optional / branch-dependent | `(GraphNodePaint & { overrides?: readonly (GraphNodePaint & { key: RowKey; })[] \| undefined; }) \| undefined` |
| `edges` | Optional / branch-dependent | `GraphEdgePaint \| undefined` |
| `labels` | Optional / branch-dependent | `false \| GraphLabelsOptions \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

Apply a nonempty graph appearance or layout-binding patch and rebuild its logical items atomically. See [Graph plot edits](../../api/graphs.md#editgraphplot).


## `createFontResource`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Development; added after v0.0.13. See [release compatibility](../../version.md).

```typescript
createFontResource(options: ApplyFontResourceOptions<"create">): ChartProgram;
```

Named option contracts: [`ApplyFontResourceOptions`](./../types.md#type-applyfontresourceoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `prepared` | Required | `PreparedFontResource<"create">` |
| `requestToken` | Required | `string` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
createFontResource({ prepared, requestToken })
```

Commit an authentic create handle from `prepareFontResource` on its exact original
Full receiver. The explicit host loads and validates pinned font bytes. No text
layout changes until prepared metrics are applied. See
[embedded fonts](../../api/rendering.md#embedded-fonts).


## `replaceFontResource`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Development; added after v0.0.13. See [release compatibility](../../version.md).

```typescript
replaceFontResource(options: ApplyFontResourceOptions<"replace">): ChartProgram;
```

Named option contracts: [`ApplyFontResourceOptions`](./../types.md#type-applyfontresourceoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `prepared` | Required | `PreparedFontResource<"replace">` |
| `requestToken` | Required | `string` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
replaceFontResource({ prepared, requestToken })
```

Commit a prepared replacement and atomically refresh any exact measured layout
that uses the font, including inherited composition children. The preparation
host must measure the new font before this action can replace a bound resource.


## `createPartitionPlot`

**API layer:** user-facing. **Authoring roles:** H0, H1.

**Availability:** Development; added after v0.0.13. See [release compatibility](../../version.md).

```typescript
createPartitionPlot(options?: TargetedOptions<PartitionPlotOptions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`PartitionPlotOptions`](./../types.md#type-partitionplotoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `id` | Optional / branch-dependent | `string \| undefined` |
| `layout` | Optional / branch-dependent | `string \| undefined` |
| `coordinate` | Optional / branch-dependent | `string \| undefined` |
| `focus` | Optional / branch-dependent | `HierarchyNodeTarget \| null \| undefined` |
| `rootVisible` | Optional / branch-dependent | `boolean \| undefined` |
| `prunedSelection` | Optional / branch-dependent | `"drop" \| "keep-hidden" \| undefined` |
| `orientation` | Optional / branch-dependent | `"horizontal" \| "vertical" \| undefined` |
| `reverseU` | Optional / branch-dependent | `boolean \| undefined` |
| `reverseV` | Optional / branch-dependent | `boolean \| undefined` |
| `padding` | Optional / branch-dependent | `number \| readonly [number, number] \| undefined` |
| `innerRadius` | Optional / branch-dependent | `number \| undefined` |
| `outerRadius` | Optional / branch-dependent | `number \| "auto" \| undefined` |
| `startAngle` | Optional / branch-dependent | `number \| undefined` |
| `sweep` | Optional / branch-dependent | `number \| undefined` |
| `direction` | Optional / branch-dependent | `"clockwise" \| "counterclockwise" \| undefined` |
| `radiusPolicy` | Optional / branch-dependent | `"equal-depth" \| "equal-depth-area" \| undefined` |
| `clip` | Optional / branch-dependent | `boolean \| undefined` |
| `cells` | Optional / branch-dependent | `(HierarchyBodyPaint & { overrides?: readonly (HierarchyNodeTarget & HierarchyBodyPaint)[] \| undefined; }) \| undefined` |
| `labels` | Optional / branch-dependent | `false \| (HierarchyLabelsOptions & { minWidth?: number \| undefined; minArcLength?: number \| undefined; }) \| undefined` |
| `target` | Optional / branch-dependent | `ActionTargetList \| ScopedActionTarget` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
createPartitionPlot({ id?, layout?, coordinate?, focus?, rootVisible?, prunedSelection?, orientation?, reverseU?, reverseV?, padding?, innerRadius?, outerRadius?, startAngle?, sweep?, direction?, radiusPolicy?, clip?, cells?, labels? })
```

Draw an icicle or sunburst from stored partition intervals, with explicit focus and stable node identity. Full only.
[Partition plots](../../api/partition.md#createpartitionplot)


## `editPartitionPlot`

**API layer:** user-facing. **Authoring roles:** H1, H3.

**Availability:** Development; added after v0.0.13. See [release compatibility](../../version.md).

```typescript
editPartitionPlot(options: TargetedOptions<EditPartitionPlotOptions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`EditPartitionPlotOptions`](./../types.md#type-editpartitionplotoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `target` | Optional / branch-dependent | `string \| ActionTargetList \| ScopedActionTarget \| undefined` |
| `layout` | Optional / branch-dependent | `string \| undefined` |
| `coordinate` | Optional / branch-dependent | `string \| undefined` |
| `focus` | Optional / branch-dependent | `HierarchyNodeTarget \| null \| undefined` |
| `rootVisible` | Optional / branch-dependent | `boolean \| undefined` |
| `prunedSelection` | Optional / branch-dependent | `"drop" \| "keep-hidden" \| undefined` |
| `orientation` | Optional / branch-dependent | `"horizontal" \| "vertical" \| undefined` |
| `reverseU` | Optional / branch-dependent | `boolean \| undefined` |
| `reverseV` | Optional / branch-dependent | `boolean \| undefined` |
| `padding` | Optional / branch-dependent | `number \| readonly [number, number] \| undefined` |
| `innerRadius` | Optional / branch-dependent | `number \| undefined` |
| `outerRadius` | Optional / branch-dependent | `number \| "auto" \| undefined` |
| `startAngle` | Optional / branch-dependent | `number \| undefined` |
| `sweep` | Optional / branch-dependent | `number \| undefined` |
| `direction` | Optional / branch-dependent | `"clockwise" \| "counterclockwise" \| undefined` |
| `radiusPolicy` | Optional / branch-dependent | `"equal-depth" \| "equal-depth-area" \| undefined` |
| `clip` | Optional / branch-dependent | `boolean \| undefined` |
| `cells` | Optional / branch-dependent | `(HierarchyBodyPaint & { overrides?: readonly (HierarchyNodeTarget & HierarchyBodyPaint)[] \| undefined; }) \| undefined` |
| `labels` | Optional / branch-dependent | `false \| (HierarchyLabelsOptions & { minWidth?: number \| undefined; minArcLength?: number \| undefined; }) \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
editPartitionPlot({ target?, layout?, coordinate?, focus?, rootVisible?, prunedSelection?, orientation?, reverseU?, reverseV?, padding?, innerRadius?, outerRadius?, startAngle?, sweep?, direction?, radiusPolicy?, clip?, cells?, labels? })
```

Edit an icicle or sunburst from stored partition intervals, with explicit focus and stable node identity. Full only.
[Partition plots](../../api/partition.md#editpartitionplot)


## `createFlowData`

**API layer:** user-facing. **Authoring roles:** H2.

**Availability:** Development; added after v0.0.13. See [release compatibility](../../version.md).

```typescript
createFlowData(options: CreateFlowDataOptions): ChartProgram;
```

Named option contracts: [`CreateFlowDataOptions`](./../types.md#type-createflowdataoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `id` | Required | `string` |
| `nodes` | Required | `string` |
| `edges` | Required | `string` |
| `nodeKey` | Required | `GraphKeyField` |
| `source` | Required | `GraphKeyField` |
| `target` | Required | `GraphKeyField` |
| `edgeKey` | Optional / branch-dependent | `GraphKeyField \| undefined` |
| `attributes` | Optional / branch-dependent | `readonly string[] \| undefined` |
| `selfLoops` | Optional / branch-dependent | `boolean \| undefined` |
| `maxNodes` | Optional / branch-dependent | `number \| undefined` |
| `maxEdges` | Optional / branch-dependent | `number \| undefined` |
| `value` | Required | `string` |
| `balance` | Optional / branch-dependent | `"allow" \| "strict" \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
createFlowData({ id, nodes, edges, nodeKey, source, target, value, edgeKey?, attributes?, selfLoops?, balance?, maxNodes?, maxEdges? })
```

Store directed flow values and an explicit balance policy. Full only.
[Flow data and Sankey layouts](../../api/flows.md#createflowdata)


## `editFlowData`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Development; added after v0.0.13. See [release compatibility](../../version.md).

```typescript
editFlowData(options: TargetedOptions<EditFlowDataOptions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`EditFlowDataOptions`](./../types.md#type-editflowdataoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `target` | Optional / branch-dependent | `string \| ActionTargetList \| ScopedActionTarget \| undefined` |
| `nodes` | Optional / branch-dependent | `string \| undefined` |
| `edges` | Optional / branch-dependent | `string \| undefined` |
| `definition` | Optional / branch-dependent | `Partial<FlowDefinition> \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
editFlowData({ target?, nodes?, edges?, definition? })
```

Revise flow data and refresh dependent layouts, nodes, links, labels and selections. Full only.
[Flow data and Sankey layouts](../../api/flows.md#editflowdata)


## `layoutFlow`

**API layer:** user-facing. **Authoring roles:** H2.

**Availability:** Development; added after v0.0.13. See [release compatibility](../../version.md).

```typescript
layoutFlow(options: TargetedOptions<LayoutFlowOptions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`LayoutFlowOptions`](./../types.md#type-layoutflowoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `id` | Required | `string` |
| `graph` | Optional / branch-dependent | `string \| undefined` |
| `method` | Required | `"cyclic" \| "dag"` |
| `options` | Optional / branch-dependent | `FlowLayoutOptions \| undefined` |
| `target` | Optional / branch-dependent | `ActionTargetList \| ScopedActionTarget` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
layoutFlow({ id, graph?, method, options? })
```

Store a DAG or cyclic Sankey layout while preserving every edge. Full only.
[Flow data and Sankey layouts](../../api/flows.md#layoutflow)


## `createContourData`

**API layer:** user-facing. **Authoring roles:** H2.

**Availability:** Development; added after v0.0.13. See [release compatibility](../../version.md).

```typescript
createContourData(options: TargetedOptions<CreateContourDataOptions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`CreateContourDataOptions`](./../types.md#type-createcontourdataoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `id` | Required | `string` |
| `grid` | Required | `ContourGrid` |
| `thresholds` | Required | `readonly number[]` |
| `target` | Optional / branch-dependent | `ActionTargetList \| ScopedActionTarget` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
createContourData({ id, grid, thresholds })
```

Create bounded contour geometry from an explicit scalar grid and thresholds. See [Contours and two-dimensional density](../../api/contours.md#createcontourdata).


## `createDensityContourData`

**API layer:** user-facing. **Authoring roles:** H2.

**Availability:** Development; added after v0.0.13. See [release compatibility](../../version.md).

```typescript
createDensityContourData(options: TargetedOptions<CreateDensityContourDataOptions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`CreateDensityContourDataOptions`](./../types.md#type-createdensitycontourdataoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `x` | Required | `string` |
| `y` | Required | `string` |
| `weight` | Optional / branch-dependent | `string \| undefined` |
| `grid` | Required | `ContourGridFrame` |
| `normalization` | Required | `"count" \| "unit"` |
| `estimator` | Required | `"histogram" \| "kde"` |
| `bandwidth` | Optional / branch-dependent | `readonly [number, number] \| undefined` |
| `kernel` | Optional / branch-dependent | `DensityKernel \| undefined` |
| `id` | Required | `string` |
| `data` | Optional / branch-dependent | `string \| undefined` |
| `thresholds` | Required | `readonly number[]` |
| `target` | Optional / branch-dependent | `ActionTargetList \| ScopedActionTarget` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
createDensityContourData({ id, data?, x, y, weight?, grid, estimator, normalization, bandwidth?, kernel?, thresholds })
```

Create weighted two-dimensional histogram or kernel density contours with explicit grid and bandwidth policies. See [Contours and two-dimensional density](../../api/contours.md#createdensitycontourdata).


## `editContourData`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Development; added after v0.0.13. See [release compatibility](../../version.md).

```typescript
editContourData(options: TargetedOptions<EditContourDataOptions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`EditContourDataOptions`](./../types.md#type-editcontourdataoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `target` | Optional / branch-dependent | `string \| ActionTargetList \| ScopedActionTarget \| undefined` |
| `grid` | Optional / branch-dependent | `ContourGrid \| undefined` |
| `thresholds` | Optional / branch-dependent | `readonly number[] \| undefined` |
| `data` | Optional / branch-dependent | `string \| undefined` |
| `definition` | Optional / branch-dependent | `Partial<ContourDensityDefinition> \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
editContourData({ target?, grid?, thresholds?, data?, definition? })
```

Revise contour geometry and update its shared scales, marks and guides atomically. See [Contours and two-dimensional density](../../api/contours.md#editcontourdata).


## `createCalendarLayout`

**API layer:** user-facing. **Authoring roles:** H2.

**Availability:** Development; added after v0.0.13. See [release compatibility](../../version.md).

```typescript
createCalendarLayout(options: TargetedOptions<CreateCalendarLayoutOptions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`CreateCalendarLayoutOptions`](./../types.md#type-createcalendarlayoutoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `start` | Required | `string` |
| `end` | Required | `string` |
| `timeZone` | Required | `string` |
| `weekStartsOn` | Required | `0 \| 1 \| 2 \| 3 \| 4 \| 5 \| 6` |
| `missing` | Required | `"empty" \| "omit"` |
| `date` | Required | `string` |
| `aggregate` | Required | `"count" \| "max" \| "mean" \| "median" \| "min" \| "sum"` |
| `value` | Optional / branch-dependent | `string \| undefined` |
| `id` | Optional / branch-dependent | `string \| undefined` |
| `data` | Optional / branch-dependent | `string \| undefined` |
| `target` | Optional / branch-dependent | `ActionTargetList \| ScopedActionTarget` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
createCalendarLayout({ id?, data?, date, value?, start, end, timeZone, weekStartsOn, aggregate, missing })
```

Store civil-day aggregates, week/weekday cells and month boundaries. See [Calendar plots](../../api/calendar.md#createcalendarlayout).


## `bundleGraphEdges`

**API layer:** user-facing. **Authoring roles:** H2.

**Availability:** Development; added after v0.0.13. See [release compatibility](../../version.md).

```typescript
bundleGraphEdges(options: TargetedOptions<BundleGraphEdgesOptions> | ApplyGraphEdgeRoutesOptions): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`BundleGraphEdgesOptions`](./../types.md#type-bundlegraphedgesoptions) · [`ApplyGraphEdgeRoutesOptions`](./../types.md#type-applygraphedgeroutesoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `prepared` | Optional / branch-dependent | `PreparedGraphEdgeRoutes` |
| `requestToken` | Optional / branch-dependent | `string` |
| `method` | Optional / branch-dependent | `"hierarchical"` |
| `options` | Optional / branch-dependent | `HierarchicalEdgeRouteOptions` |
| `id` | Optional / branch-dependent | `string` |
| `graph` | Optional / branch-dependent | `string \| undefined` |
| `layout` | Optional / branch-dependent | `string \| undefined` |
| `coordinateSpace` | Optional / branch-dependent | `"screen" \| "world" \| undefined` |
| `target` | Optional / branch-dependent | `ActionTargetList \| ScopedActionTarget` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
bundleGraphEdges({ id, graph?, layout?, method, options?, coordinateSpace? })
```

Create a Full-only stored edge route using hierarchical, force-directed, density, or edge-path bundling. Graph topology and item identity remain unchanged. The [Edge routes API](../../api/edge-routes.md) owns method options, exact input binding, bounded computation and worker preparation. Bind the result with `createGraphPlot({routes:id})`. Prepared application accepts only `{prepared,requestToken}` on the exact original receiver.


## `editEdgeRoute`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Development; added after v0.0.13. See [release compatibility](../../version.md).

```typescript
editEdgeRoute(options: TargetedOptions<EditEdgeRouteOptions> | ApplyGraphEdgeRoutesOptions): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`EditEdgeRouteOptions`](./../types.md#type-editedgerouteoptions) · [`ApplyGraphEdgeRoutesOptions`](./../types.md#type-applygraphedgeroutesoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `prepared` | Optional / branch-dependent | `PreparedGraphEdgeRoutes` |
| `requestToken` | Optional / branch-dependent | `string` |
| `target` | Optional / branch-dependent | `string \| undefined` |
| `graph` | Optional / branch-dependent | `string \| undefined` |
| `layout` | Optional / branch-dependent | `string \| undefined` |
| `method` | Optional / branch-dependent | `EdgeRouteMethod \| undefined` |
| `coordinateSpace` | Optional / branch-dependent | `"screen" \| "world" \| undefined` |
| `options` | Optional / branch-dependent | `EdgePathRouteOptions \| EdgeRouteCommonOptions \| ForceDirectedEdgeRouteOptions \| Partial<HierarchicalEdgeRouteOptions> \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
editEdgeRoute({ target?, graph?, layout?, method?, options?, coordinateSpace? })
```

Apply a nonempty patch to a stored route and refresh each consuming GraphPlot once. Same-method options preserve omitted values; a changed method starts from its defaults. Exact preparation handles also support `{prepared,requestToken}`. See [Edge routes](../../api/edge-routes.md) for validation, async lifetime, source revision and Canvas invalidation.


## `createGeometryData`

**API layer:** user-facing. **Authoring roles:** H2.

**Availability:** Development; added after v0.0.13. See [release compatibility](../../version.md).

```typescript
createGeometryData(options: TargetedOptions<CreateGeometryDataOptions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`CreateGeometryDataOptions`](./../types.md#type-creategeometrydataoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `id` | Required | `string` |
| `coordinateKind` | Required | `"geographic" \| "planar"` |
| `featureKey` | Optional / branch-dependent | `GeometryFeatureKey \| undefined` |
| `limits` | Optional / branch-dependent | `GeometryLimits \| undefined` |
| `format` | Required | `"geojson" \| "topojson"` |
| `values` | Required | `TopoJSONInput \| GeoJSONInput` |
| `topoObject` | Optional / branch-dependent | `string \| undefined` |
| `target` | Optional / branch-dependent | `ActionTargetList \| ScopedActionTarget` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
createGeometryData({ id, format, values, coordinateKind, featureKey?, topoObject?, limits? })
```

Normalize a geographic or planar GeoJSON/TopoJSON source with immutable feature identities and retained source values. See [Geometry sources](../../api/geometry.md#creategeometrydata).


## `editGeometryData`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Development; added after v0.0.13. See [release compatibility](../../version.md).

```typescript
editGeometryData(options: TargetedOptions<EditGeometryDataOptions>): ChartProgram;
```

Named option contracts: [`TargetedOptions`](./../types.md#type-targetedoptions) · [`EditGeometryDataOptions`](./../types.md#type-editgeometrydataoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `target` | Optional / branch-dependent | `string \| ActionTargetList \| ScopedActionTarget \| undefined` |
| `values` | Optional / branch-dependent | `TopoJSONInput \| GeoJSONInput \| undefined` |
| `coordinateKind` | Optional / branch-dependent | `"geographic" \| "planar" \| undefined` |
| `topoObject` | Optional / branch-dependent | `string \| undefined` |
| `limits` | Optional / branch-dependent | `GeometryLimits \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
editGeometryData({ target?, values?, coordinateKind?, topoObject?, limits? })
```

Revise a geometry source atomically while preserving its format and feature-key policy. See [Geometry sources](../../api/geometry.md#editgeometrydata).


## Focused core data editing

```javascript
editDerivedData({ target, definition, dependents? })
editFilteredData({ target, where, dependents? })
editFilteredData({ target, field?, oneOf? | noneOf? | predicate? | range?, nulls?, dependents? })
editSortedData({ target, sortBy, dependents? })
editTimeUnitData({ target, field?, unit?, as?, temporalUnit?, timeZone?, weekStartsOn?, weekRule?, dependents? })
editWindowData({ target, partitionBy?, sortBy?, operations?, temporalUnit?, dependents? })
editDensityData({ target, field?, groupBy?, bandwidth?, extent?, steps?, kernel?, normalization?, as?, weight?, dependents? })
editRegressionData({ target, x?, y?, groupBy?, method?, degree?, span?, robustIterations?, confidenceMethod?, level?, interval?, dependents? })
```

Revise a standalone derived-data owner without rebuilding its consumers. New
focused editors require an explicit logical owner or current snapshot. Omitted
transform options remain unchanged. The generic form requires a complete
requested transform of the same type and does not accept `id`, `source`,
`current`, or resolved materializer output.

`dependents` defaults to `"reject"`. Set it to `"recompute"` to revise every
reachable derived dataset in dependency order. The operation is atomic: an
invalid downstream field, scale, mark, guide, label, or selection preserves the
entire input program. Output names are carried only across unambiguous direct
semantic roles; expressions and predicates are never rewritten as strings.
[Editing derived data](../../api/data/source-and-derived.md#editing-derived-data)

## Focused channel scale editors

```javascript
editXScale({ id?, target?, type?, domain?, range?, ...positionOptions })
editYScale({ id?, target?, type?, domain?, range?, ...positionOptions })
editXOffsetScale({ target, domain?, reverse?, padding?, paddingInner?, paddingOuter?, align? })
editYOffsetScale({ target, domain?, reverse?, padding?, paddingInner?, paddingOuter?, align? })
editParallelScale({ target, dimension, type?, domain?, range?, ...dimensionOptions })
editThetaScale({ id?, target?, type?, domain?, range?, ...angularOptions })
editRScale({ id?, target?, type?, domain?, range?, radialMapping?, ...radialOptions })
editColorScale({ id?, target?, type?, domain?, range?, palette?, interpolate?, midpoint?, unknown? })
editStrokeScale({ target, type?, domain?, range?, palette?, interpolate?, midpoint?, unknown? })
editSizeScale({ id?, target?, type?, domain?, range?, unknown?, clamp?, reverse?, base?, exponent? })
editOpacityScale({ id?, target?, type?, domain?, range?, nice?, zero?, clamp?, reverse?, unknown? })
editShapeScale({ id?, target?, type?, domain?, range?, unknown? })
editStrokeWidthScale({ id?, target?, type?, domain?, range?, ...quantitativeOptions })
editStrokeDashScale({ id?, target?, type?, domain?, range?, unknown? })
```

Edit the scale bound to one semantic channel without requiring its generated
ID. Explicit `id` and `target` selectors must agree. Otherwise the current
mark's channel scale wins, followed by a unique channel scale across all marks;
ambiguity is an error. Every action delegates to `editScale`, which validates
the channel-specific patch and refreshes all shared marks and guides.
`editParallelScale` is the field-selected exception: both `target` and the
exact Parallel `dimension` field are required, and its generated scale ID is
resolved internally.
The offset editors also require `target`; they resolve only that mark's matching
nested offset scale. Their concrete range remains derived from the parent
categorical slot, while the semantic scale owns domain, reverse, padding, and
alignment.
`editStrokeScale` likewise requires a mark `target` and rejects raw scale IDs.
It edits the target's field-driven stroke mapping and accepts a color/stroke
shared scale when every connected consumer remains compatible.
Size scale ranges are glyph areas. Continuous size scales accept `clamp` and
`reverse`; logarithmic scales accept `base`, and power scales require
`exponent`. Quantize, quantile, and threshold use explicit nondecreasing area
ranges. A family transition requires an explicit new domain and the destination
range rules to be satisfied.
[Scale options](../../api/scales.md)

## Related

[Action Reference](../actions.md) · [Chart API](../../api/index.md) · [Supported Features](../../supported-features.md)
