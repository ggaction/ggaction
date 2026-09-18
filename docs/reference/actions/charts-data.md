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
createCanvas(options?: CanvasOptions): ChartProgram;
```

Named option contracts: [`CanvasOptions`](./../types.md#type-canvasoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `width` | Optional / branch-dependent | `number \| undefined` |
| `height` | Optional / branch-dependent | `number \| undefined` |
| `background` | Optional / branch-dependent | `string \| undefined` |
| `margin` | Optional / branch-dependent | `number \| Partial<Record<"bottom" \| "left" \| "right" \| "top", number>> \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
createCanvas({ width?, height?, background?, margin? })
```

Create the program's Canvas and plot bounds. [Canvas options](../../api/canvas.md)


## `editCanvas`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
editCanvas(options: CanvasOptions): ChartProgram;
```

Named option contracts: [`CanvasOptions`](./../types.md#type-canvasoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `width` | Optional / branch-dependent | `number \| undefined` |
| `height` | Optional / branch-dependent | `number \| undefined` |
| `background` | Optional / branch-dependent | `string \| undefined` |
| `margin` | Optional / branch-dependent | `number \| Partial<Record<"bottom" \| "left" \| "right" \| "top", number>> \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
editCanvas({ width?, height?, background?, margin? })
```

Edit Canvas properties and rematerialize connected consumers.
[Canvas options](../../api/canvas.md)


## `fitCanvas`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
fitCanvas(options?: FitCanvasOptions): ChartProgram;
```

Named option contracts: [`FitCanvasOptions`](./../types.md#type-fitcanvasoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `padding` | Optional / branch-dependent | `number \| undefined` |
| `minPlotWidth` | Optional / branch-dependent | `number \| undefined` |
| `minPlotHeight` | Optional / branch-dependent | `number \| undefined` |
| `iterationLimit` | Optional / branch-dependent | `number \| undefined` |
| `overflow` | Optional / branch-dependent | `"error" \| "report" \| undefined` |

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
| `profile` | Required | `TextMetricsProfile` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
applyTextMetrics({ profile })
```

Apply a host-measured width profile to title, axis, legend, label, and composition
layout. See [Measured text layout](../../api/rendering.md#measured-text-layout) for the
exact profile format, matching rules, propagation, and executable example.


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
applyTheme(options: ApplyThemeOptions): ChartProgram;
```

Named option contracts: [`ApplyThemeOptions`](./../types.md#type-applythemeoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `theme` | Required | `ThemeDefinition` |
| `scope` | Optional / branch-dependent | `"descendants" \| "self" \| undefined` |

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
`referenceBand`, `gradientCenter`, `highlight`, and `fontFamily`. A new theme
replaces the previous request; omitted partial tokens come from the new base.

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
| `id` | Optional / branch-dependent | `string \| undefined` |
| `values` | Required | `readonly (Row extends readonly unknown[] ? never : Row & StoredCell<Row>)[]` |
| `schema` | Optional / branch-dependent | `SourceSchemaInput \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
createData({ id?, values })
```

Create one immutable named dataset. [Data](../../api/data.md)


## `reviseData`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Development; added after v0.0.13. See [release compatibility](../../version.md).

```typescript
reviseData<Row extends object>(options: ReviseDataOptions<Row>): ChartProgram;
```

Named option contracts: [`ReviseDataOptions`](./../types.md#type-revisedataoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `source` | Required | `string` |
| `id` | Required | `string` |
| `values` | Required | `readonly (Row extends readonly unknown[] ? never : Row & StoredCell<Row>)[]` |
| `schema` | Optional / branch-dependent | `SourceSchemaInput \| undefined` |

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
removeData(options: RemoveResourceOptions): ChartProgram;
```

Named option contracts: [`RemoveResourceOptions`](./../types.md#type-removeresourceoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `id` | Required | `string` |

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
removeScale(options: RemoveResourceOptions): ChartProgram;
```

Named option contracts: [`RemoveResourceOptions`](./../types.md#type-removeresourceoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `id` | Required | `string` |

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
removeCoordinate(options: RemoveResourceOptions): ChartProgram;
```

Named option contracts: [`RemoveResourceOptions`](./../types.md#type-removeresourceoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `id` | Required | `string` |

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
bindMarkData(options: BindMarkDataOptions): ChartProgram;
```

Named option contracts: [`BindMarkDataOptions`](./../types.md#type-bindmarkdataoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `target` | Required | `string` |
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
filterData(options: FilterDataOptions): ChartProgram;
```

Named option contracts: [`FilterDataOptions`](./../types.md#type-filterdataoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `id` | Required | `string` |
| `source` | Optional / branch-dependent | `string \| undefined` |
| `field` | Required | `string` |
| `nulls` | Optional / branch-dependent | `"exclude" \| "include" \| undefined` |
| `oneOf` | Optional / branch-dependent | `readonly [DatasetScalar, ...DatasetScalar[]] \| undefined` |
| `noneOf` | Optional / branch-dependent | `readonly [DatasetScalar, ...DatasetScalar[]] \| undefined` |
| `predicate` | Optional / branch-dependent | `FilterComparison \| undefined` |
| `range` | Optional / branch-dependent | `FilterRange \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
filterData({ id, source?, field, oneOf | noneOf | predicate | range, nulls? })
```

Create an immutable named derived dataset using exactly one membership,
comparison, or range filter. The source defaults to current data.
[Data](../../api/data.md)


## `createDensityData`

**API layer:** user-facing. **Authoring roles:** H2.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
createDensityData(options: DensityDataOptions): ChartProgram;
```

Named option contracts: [`DensityDataOptions`](./../types.md#type-densitydataoptions).

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
createRegressionData(options: RegressionDataOptions): ChartProgram;
```

Named option contracts: [`RegressionDataOptions`](./../types.md#type-regressiondataoptions).

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
| `method` | Optional / branch-dependent | `"linear" \| "loess" \| "polynomial" \| undefined` |
| `degree` | Optional / branch-dependent | `number \| undefined` |
| `span` | Optional / branch-dependent | `number \| undefined` |
| `confidenceMethod` | Optional / branch-dependent | `ConfidenceIntervalMethod \| undefined` |
| `level` | Optional / branch-dependent | `number \| undefined` |
| `confidence` | Optional / branch-dependent | `number \| undefined` |
| `interval` | Optional / branch-dependent | `false \| RegressionInterval \| undefined` |
| `predict` | Optional / branch-dependent | `RegressionPredictOptions \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
createRegressionData({
  id, source?, x, y, groupBy?, method?, degree?, span?,
  confidenceMethod?, level?, confidence?, interval?, predict?, missing?
})
```

Create immutable linear, polynomial, or LOESS fitted rows at observed unique x
values. Linear and polynomial fits support normal or Student-t mean or prediction bounds;
LOESS is line-only.
[Data](../../api/data.md)


## `createWindowData`

**API layer:** user-facing. **Authoring roles:** H2.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
createWindowData(options: WindowDataOptions): ChartProgram;
```

Named option contracts: [`WindowDataOptions`](./../types.md#type-windowdataoptions).

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
createTimeUnitData(options: TimeUnitDataOptions): ChartProgram;
```

Named option contracts: [`TimeUnitDataOptions`](./../types.md#type-timeunitdataoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `id` | Required | `string` |
| `source` | Optional / branch-dependent | `string \| undefined` |
| `field` | Required | `string` |
| `temporalUnit` | Optional / branch-dependent | `TemporalInputUnit \| undefined` |
| `as` | Required | `string` |
| `timeZone` | Optional / branch-dependent | `string \| undefined` |
| `unit` | Required | `"day" \| "hour" \| "minute" \| "month" \| "quarter" \| "second" \| "week" \| "weekday" \| "year"` |
| `weekStartsOn` | Optional / branch-dependent | `0 \| 1 \| 2 \| 3 \| 4 \| 5 \| 6 \| undefined` |
| `weekRule` | Optional / branch-dependent | `"calendar" \| "iso" \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
createTimeUnitData({ id, source?, field, temporalUnit?, unit, as, timeZone?, weekStartsOn?, weekRule? })
```

Create an immutable row-preserving dataset with one UTC or IANA-zone calendar
bucket timestamp, including week, or a nominal local weekday field.
[Time-unit data transforms](../../api/data/time-units.md)


## `createBin2DData`

**API layer:** user-facing. **Authoring roles:** H2.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
createBin2DData(options: Bin2DDataOptions): ChartProgram;
```

Named option contracts: [`Bin2DDataOptions`](./../types.md#type-bin2ddataoptions).

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
| `includeEmpty` | Optional / branch-dependent | `boolean \| undefined` |
| `members` | Optional / branch-dependent | `boolean \| undefined` |
| `as` | Optional / branch-dependent | `Bin2DOutputFields \| undefined` |

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
editBin2DData(options: EditBin2DDataOptions): ChartProgram;
```

Named option contracts: [`EditBin2DDataOptions`](./../types.md#type-editbin2ddataoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `target` | Optional / branch-dependent | `string \| undefined` |
| `source` | Optional / branch-dependent | `string \| undefined` |
| `x` | Optional / branch-dependent | `string \| undefined` |
| `y` | Optional / branch-dependent | `string \| undefined` |
| `bins` | Optional / branch-dependent | `number \| Bin2DCounts \| undefined` |
| `extent` | Optional / branch-dependent | `Bin2DExtent \| undefined` |
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
editDerivedData(options: EditDerivedDataOptions): ChartProgram;
```

Named option contracts: [`EditDerivedDataOptions`](./../types.md#type-editderiveddataoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `target` | Required | `string` |
| `definition` | Required | `RequestedDatasetTransform` |
| `dependents` | Optional / branch-dependent | `DerivedDataDependents \| undefined` |

</details>

Behavior, inference, resets, and errors: [Focused core data editing](./charts-data.md#focused-core-data-editing).



## `editFilteredData`

**API layer:** user-facing. **Authoring roles:** H2.

**Availability:** Development; added after v0.0.13. See [release compatibility](../../version.md).

```typescript
editFilteredData(options: EditFilteredDataOptions): ChartProgram;
```

Named option contracts: [`EditFilteredDataOptions`](./../types.md#type-editfiltereddataoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `oneOf` | Optional / branch-dependent | `readonly [DatasetScalar, ...DatasetScalar[]] \| undefined` |
| `noneOf` | Optional / branch-dependent | `readonly [DatasetScalar, ...DatasetScalar[]] \| undefined` |
| `predicate` | Optional / branch-dependent | `FilterComparison \| undefined` |
| `range` | Optional / branch-dependent | `FilterRangePatch \| undefined` |
| `target` | Required | `string` |
| `field` | Optional / branch-dependent | `string \| undefined` |
| `nulls` | Optional / branch-dependent | `"exclude" \| "include" \| false \| undefined` |
| `dependents` | Optional / branch-dependent | `DerivedDataDependents \| undefined` |

</details>

Behavior, inference, resets, and errors: [Focused core data editing](./charts-data.md#focused-core-data-editing).



## `editTimeUnitData`

**API layer:** user-facing. **Authoring roles:** H2.

**Availability:** Development; added after v0.0.13. See [release compatibility](../../version.md).

```typescript
editTimeUnitData(options: EditTimeUnitDataOptions): ChartProgram;
```

Named option contracts: [`EditTimeUnitDataOptions`](./../types.md#type-edittimeunitdataoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `target` | Required | `string` |
| `dependents` | Optional / branch-dependent | `DerivedDataDependents \| undefined` |
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
editWindowData(options: EditWindowDataOptions): ChartProgram;
```

Named option contracts: [`EditWindowDataOptions`](./../types.md#type-editwindowdataoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `target` | Required | `string` |
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
editDensityData(options: EditDensityDataOptions): ChartProgram;
```

Named option contracts: [`EditDensityDataOptions`](./../types.md#type-editdensitydataoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `target` | Required | `string` |
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
editRegressionData(options: EditRegressionDataOptions): ChartProgram;
```

Named option contracts: [`EditRegressionDataOptions`](./../types.md#type-editregressiondataoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `target` | Required | `string` |
| `dependents` | Optional / branch-dependent | `DerivedDataDependents \| undefined` |
| `method` | Optional / branch-dependent | `"linear" \| "loess" \| "polynomial" \| undefined` |
| `degree` | Optional / branch-dependent | `number \| undefined` |
| `span` | Optional / branch-dependent | `number \| undefined` |
| `confidenceMethod` | Optional / branch-dependent | `ConfidenceIntervalMethod \| undefined` |
| `level` | Optional / branch-dependent | `number \| undefined` |
| `confidence` | Optional / branch-dependent | `number \| undefined` |
| `interval` | Optional / branch-dependent | `false \| RegressionInterval \| undefined` |
| `predict` | Optional / branch-dependent | `RegressionPredictOptions \| undefined` |
| `x` | Optional / branch-dependent | `string \| undefined` |
| `y` | Optional / branch-dependent | `string \| undefined` |
| `groupBy` | Optional / branch-dependent | `string \| undefined` |
| `missing` | Optional / branch-dependent | `"drop" \| "error" \| undefined` |

</details>

Behavior, inference, resets, and errors: [Focused core data editing](./charts-data.md#focused-core-data-editing).



## `createCoordinate`

**API layer:** user-facing. **Authoring roles:** H2.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
createCoordinate(options?: CreateCoordinateOptions): ChartProgram;
```

Named option contracts: [`CreateCoordinateOptions`](./../types.md#type-createcoordinateoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `id` | Optional / branch-dependent | `string \| undefined` |
| `type` | Optional / branch-dependent | `"cartesian" \| "parallel" \| "polar" \| undefined` |
| `layers` | Optional / branch-dependent | `readonly string[] \| undefined` |

</details>

Behavior, inference, resets, and errors: [Semantic resources and regression layers](./statistics.md#semantic-resources-and-regression-layers).



## `editCoordinate`

**API layer:** user-facing. **Authoring roles:** H2.

**Availability:** Development; added after v0.0.13. See [release compatibility](../../version.md).

```typescript
editCoordinate(options: EditCoordinateOptions): ChartProgram;
```

Named option contracts: [`EditCoordinateOptions`](./../types.md#type-editcoordinateoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `target` | Required | `string` |
| `aspect` | Optional / branch-dependent | `CoordinateAspect \| undefined` |
| `polarFrame` | Optional / branch-dependent | `PolarFrameOptions \| undefined` |

</details>

Behavior, inference, resets, and errors: [Semantic resources and regression layers](./statistics.md#semantic-resources-and-regression-layers).



## `createScale`

**API layer:** user-facing. **Authoring roles:** H2.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
createScale(options: CreateScaleOptions): ChartProgram;
```

Named option contracts: [`CreateScaleOptions`](./../types.md#type-createscaleoptions).

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
| `nice` | Optional / branch-dependent | `boolean \| undefined` |
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
| `midpoint` | Optional / branch-dependent | `number \| "auto" \| undefined` |
| `unknown` | Optional / branch-dependent | `unknown` |

</details>

Behavior, inference, resets, and errors: [Extension and scale contracts](./extension.md#extension-actions).



## `editScale`

**API layer:** user-facing. **Authoring roles:** H2.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
editScale(options: EditScaleOptions): ChartProgram;
```

Named option contracts: [`EditScaleOptions`](./../types.md#type-editscaleoptions).

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
| `nice` | Optional / branch-dependent | `boolean \| undefined` |
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
| `midpoint` | Optional / branch-dependent | `number \| "auto" \| undefined` |
| `unknown` | Optional / branch-dependent | `unknown` |

</details>

Behavior, inference, resets, and errors: [Extension and scale contracts](./extension.md#extension-actions).



## `editXScale`

**API layer:** user-facing. **Authoring roles:** H2.

**Availability:** Development; added after v0.0.13. See [release compatibility](../../version.md).

```typescript
editXScale(options: EditXScaleOptions): ChartProgram;
```

Named option contracts: [`EditXScaleOptions`](./../types.md#type-editxscaleoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `id` | Optional / branch-dependent | `string \| undefined` |
| `target` | Optional / branch-dependent | `string \| undefined` |
| `reverse` | Optional / branch-dependent | `boolean \| undefined` |
| `type` | Optional / branch-dependent | `"band" \| "point" \| "time" \| QuantitativePositionScaleType \| undefined` |
| `domain` | Optional / branch-dependent | `"auto" \| readonly unknown[] \| readonly [number, number] \| undefined` |
| `range` | Optional / branch-dependent | `"auto" \| readonly [number, number] \| undefined` |
| `unknown` | Optional / branch-dependent | `number \| undefined` |
| `paddingInner` | Optional / branch-dependent | `number \| undefined` |
| `paddingOuter` | Optional / branch-dependent | `number \| undefined` |
| `align` | Optional / branch-dependent | `number \| undefined` |
| `padding` | Optional / branch-dependent | `number \| undefined` |
| `nice` | Optional / branch-dependent | `boolean \| undefined` |
| `zero` | Optional / branch-dependent | `boolean \| undefined` |
| `clamp` | Optional / branch-dependent | `boolean \| undefined` |
| `base` | Optional / branch-dependent | `number \| undefined` |
| `exponent` | Optional / branch-dependent | `number \| undefined` |
| `constant` | Optional / branch-dependent | `number \| undefined` |

</details>

Behavior, inference, resets, and errors: [Focused channel scale editors](./charts-data.md#focused-channel-scale-editors).



## `editYScale`

**API layer:** user-facing. **Authoring roles:** H2.

**Availability:** Development; added after v0.0.13. See [release compatibility](../../version.md).

```typescript
editYScale(options: EditYScaleOptions): ChartProgram;
```

Named option contracts: [`EditYScaleOptions`](./../types.md#type-edityscaleoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `id` | Optional / branch-dependent | `string \| undefined` |
| `target` | Optional / branch-dependent | `string \| undefined` |
| `reverse` | Optional / branch-dependent | `boolean \| undefined` |
| `type` | Optional / branch-dependent | `"band" \| "point" \| "time" \| QuantitativePositionScaleType \| undefined` |
| `domain` | Optional / branch-dependent | `"auto" \| readonly unknown[] \| readonly [number, number] \| undefined` |
| `range` | Optional / branch-dependent | `"auto" \| readonly [number, number] \| undefined` |
| `unknown` | Optional / branch-dependent | `number \| undefined` |
| `paddingInner` | Optional / branch-dependent | `number \| undefined` |
| `paddingOuter` | Optional / branch-dependent | `number \| undefined` |
| `align` | Optional / branch-dependent | `number \| undefined` |
| `padding` | Optional / branch-dependent | `number \| undefined` |
| `nice` | Optional / branch-dependent | `boolean \| undefined` |
| `zero` | Optional / branch-dependent | `boolean \| undefined` |
| `clamp` | Optional / branch-dependent | `boolean \| undefined` |
| `base` | Optional / branch-dependent | `number \| undefined` |
| `exponent` | Optional / branch-dependent | `number \| undefined` |
| `constant` | Optional / branch-dependent | `number \| undefined` |

</details>

Behavior, inference, resets, and errors: [Focused channel scale editors](./charts-data.md#focused-channel-scale-editors).



## `editXOffsetScale`

**API layer:** user-facing. **Authoring roles:** H2.

**Availability:** Development; added after v0.0.13. See [release compatibility](../../version.md).

```typescript
editXOffsetScale(options: EditXOffsetScaleOptions): ChartProgram;
```

Named option contracts: [`EditXOffsetScaleOptions`](./../types.md#type-editxoffsetscaleoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `target` | Required | `string` |
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
editYOffsetScale(options: EditYOffsetScaleOptions): ChartProgram;
```

Named option contracts: [`EditYOffsetScaleOptions`](./../types.md#type-edityoffsetscaleoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `target` | Required | `string` |
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
editParallelScale(options: EditParallelScaleOptions): ChartProgram;
```

Named option contracts: [`EditParallelScaleOptions`](./../types.md#type-editparallelscaleoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `target` | Required | `string` |
| `dimension` | Required | `string` |
| `reverse` | Optional / branch-dependent | `boolean \| undefined` |
| `type` | Optional / branch-dependent | `"band" \| "point" \| QuantitativePositionScaleType \| undefined` |
| `domain` | Optional / branch-dependent | `"auto" \| readonly unknown[] \| readonly [number, number] \| undefined` |
| `range` | Optional / branch-dependent | `"auto" \| readonly [number, number] \| undefined` |
| `unknown` | Optional / branch-dependent | `number \| undefined` |
| `paddingInner` | Optional / branch-dependent | `number \| undefined` |
| `paddingOuter` | Optional / branch-dependent | `number \| undefined` |
| `align` | Optional / branch-dependent | `number \| undefined` |
| `padding` | Optional / branch-dependent | `number \| undefined` |
| `nice` | Optional / branch-dependent | `boolean \| undefined` |
| `zero` | Optional / branch-dependent | `boolean \| undefined` |
| `clamp` | Optional / branch-dependent | `boolean \| undefined` |
| `base` | Optional / branch-dependent | `number \| undefined` |
| `exponent` | Optional / branch-dependent | `number \| undefined` |
| `constant` | Optional / branch-dependent | `number \| undefined` |

</details>

Behavior, inference, resets, and errors: [Focused channel scale editors](./charts-data.md#focused-channel-scale-editors).



## `editThetaScale`

**API layer:** user-facing. **Authoring roles:** H2.

**Availability:** Development; added after v0.0.13. See [release compatibility](../../version.md).

```typescript
editThetaScale(options: EditThetaScaleOptions): ChartProgram;
```

Named option contracts: [`EditThetaScaleOptions`](./../types.md#type-editthetascaleoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `id` | Optional / branch-dependent | `string \| undefined` |
| `target` | Optional / branch-dependent | `string \| undefined` |
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
editRScale(options: EditRScaleOptions): ChartProgram;
```

Named option contracts: [`EditRScaleOptions`](./../types.md#type-editrscaleoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `id` | Optional / branch-dependent | `string \| undefined` |
| `target` | Optional / branch-dependent | `string \| undefined` |
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
editColorScale(options: EditColorScaleOptions): ChartProgram;
```

Named option contracts: [`EditColorScaleOptions`](./../types.md#type-editcolorscaleoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `id` | Optional / branch-dependent | `string \| undefined` |
| `target` | Optional / branch-dependent | `string \| undefined` |
| `palette` | Optional / branch-dependent | `"accent" \| "bluegreen" \| "blueorange" \| "bluepurple" \| "blues" \| "brownbluegreen" \| "browns" \| "category10" \| "category20" \| "category20b" \| "category20c" \| "cividis" \| "dark2" \| ... 60 more ... \| undefined` |
| `type` | Optional / branch-dependent | `"ordinal" \| "quantile" \| "quantize" \| "sequential" \| "threshold" \| undefined` |
| `domain` | Optional / branch-dependent | `"auto" \| readonly unknown[] \| readonly number[] \| readonly [unknown, unknown] \| readonly [number, number] \| undefined` |
| `range` | Optional / branch-dependent | `"auto" \| readonly string[] \| { readonly palette: Palette; } \| readonly [string, string, ...string[]] \| undefined` |
| `unknown` | Optional / branch-dependent | `string \| undefined` |
| `clamp` | Optional / branch-dependent | `boolean \| undefined` |
| `reverse` | Optional / branch-dependent | `boolean \| undefined` |
| `interpolate` | Optional / branch-dependent | `ContinuousColorInterpolation \| undefined` |
| `midpoint` | Optional / branch-dependent | `number \| "auto" \| undefined` |

</details>

Behavior, inference, resets, and errors: [Focused channel scale editors](./charts-data.md#focused-channel-scale-editors).



## `editStrokeScale`

**API layer:** user-facing. **Authoring roles:** H2.

**Availability:** Development; added after v0.0.13. See [release compatibility](../../version.md).

```typescript
editStrokeScale(options: EditStrokeScaleOptions): ChartProgram;
```

Named option contracts: [`EditStrokeScaleOptions`](./../types.md#type-editstrokescaleoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `target` | Required | `string` |
| `palette` | Optional / branch-dependent | `"accent" \| "bluegreen" \| "blueorange" \| "bluepurple" \| "blues" \| "brownbluegreen" \| "browns" \| "category10" \| "category20" \| "category20b" \| "category20c" \| "cividis" \| "dark2" \| ... 60 more ... \| undefined` |
| `type` | Optional / branch-dependent | `"ordinal" \| "quantile" \| "quantize" \| "sequential" \| "threshold" \| undefined` |
| `domain` | Optional / branch-dependent | `"auto" \| readonly unknown[] \| readonly number[] \| readonly [unknown, unknown] \| readonly [number, number] \| undefined` |
| `range` | Optional / branch-dependent | `"auto" \| readonly string[] \| { readonly palette: Palette; } \| readonly [string, string, ...string[]] \| undefined` |
| `unknown` | Optional / branch-dependent | `string \| undefined` |

</details>

Behavior, inference, resets, and errors: [Focused channel scale editors](./charts-data.md#focused-channel-scale-editors).



## `editSizeScale`

**API layer:** user-facing. **Authoring roles:** H2.

**Availability:** Development; added after v0.0.13. See [release compatibility](../../version.md).

```typescript
editSizeScale(options: EditSizeScaleOptions): ChartProgram;
```

Named option contracts: [`EditSizeScaleOptions`](./../types.md#type-editsizescaleoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `id` | Optional / branch-dependent | `string \| undefined` |
| `target` | Optional / branch-dependent | `string \| undefined` |
| `type` | Optional / branch-dependent | `"linear" \| "log" \| "pow" \| "quantile" \| "quantize" \| "sqrt" \| "threshold" \| undefined` |
| `domain` | Optional / branch-dependent | `"auto" \| readonly [number, number] \| readonly [number, ...number[]] \| undefined` |
| `range` | Optional / branch-dependent | `"auto" \| readonly [number, number] \| readonly [number, number, ...number[]] \| undefined` |
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
editOpacityScale(options: EditOpacityScaleOptions): ChartProgram;
```

Named option contracts: [`EditOpacityScaleOptions`](./../types.md#type-editopacityscaleoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `id` | Optional / branch-dependent | `string \| undefined` |
| `target` | Optional / branch-dependent | `string \| undefined` |
| `nice` | Optional / branch-dependent | `boolean \| undefined` |
| `zero` | Optional / branch-dependent | `boolean \| undefined` |
| `clamp` | Optional / branch-dependent | `boolean \| undefined` |
| `reverse` | Optional / branch-dependent | `boolean \| undefined` |
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
editShapeScale(options: EditShapeScaleOptions): ChartProgram;
```

Named option contracts: [`EditShapeScaleOptions`](./../types.md#type-editshapescaleoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `id` | Optional / branch-dependent | `string \| undefined` |
| `target` | Optional / branch-dependent | `string \| undefined` |
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
editStrokeWidthScale(options: EditStrokeWidthScaleOptions): ChartProgram;
```

Named option contracts: [`EditStrokeWidthScaleOptions`](./../types.md#type-editstrokewidthscaleoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `id` | Optional / branch-dependent | `string \| undefined` |
| `target` | Optional / branch-dependent | `string \| undefined` |
| `nice` | Optional / branch-dependent | `boolean \| undefined` |
| `zero` | Optional / branch-dependent | `boolean \| undefined` |
| `clamp` | Optional / branch-dependent | `boolean \| undefined` |
| `reverse` | Optional / branch-dependent | `boolean \| undefined` |
| `base` | Optional / branch-dependent | `number \| undefined` |
| `exponent` | Optional / branch-dependent | `number \| undefined` |
| `constant` | Optional / branch-dependent | `number \| undefined` |
| `type` | Optional / branch-dependent | `QuantitativePositionScaleType \| undefined` |
| `domain` | Optional / branch-dependent | `"auto" \| readonly [number, number] \| undefined` |
| `range` | Optional / branch-dependent | `"auto" \| readonly [number, number] \| undefined` |

</details>

Behavior, inference, resets, and errors: [Focused channel scale editors](./charts-data.md#focused-channel-scale-editors).



## `editStrokeDashScale`

**API layer:** user-facing. **Authoring roles:** H2.

**Availability:** Development; added after v0.0.13. See [release compatibility](../../version.md).

```typescript
editStrokeDashScale(options: EditStrokeDashScaleOptions): ChartProgram;
```

Named option contracts: [`EditStrokeDashScaleOptions`](./../types.md#type-editstrokedashscaleoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `id` | Optional / branch-dependent | `string \| undefined` |
| `target` | Optional / branch-dependent | `string \| undefined` |
| `type` | Optional / branch-dependent | `"ordinal" \| undefined` |
| `domain` | Optional / branch-dependent | `"auto" \| readonly unknown[] \| undefined` |
| `range` | Optional / branch-dependent | `"auto" \| readonly (DashPattern \| DashStyle)[] \| undefined` |

</details>

Behavior, inference, resets, and errors: [Focused channel scale editors](./charts-data.md#focused-channel-scale-editors).



## `createDerivedData`

**API layer:** user-facing. **Authoring roles:** H2.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
createDerivedData(options: CreateDerivedDataOptions): ChartProgram;
```

Named option contracts: [`CreateDerivedDataOptions`](./../types.md#type-createderiveddataoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `id` | Required | `string` |
| `source` | Required | `string` |
| `transform` | Required | `readonly [DatasetTransform]` |

</details>

Behavior, inference, resets, and errors: [Semantic resources and regression layers](./statistics.md#semantic-resources-and-regression-layers).



## `filterMarks`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
filterMarks(options: FilterMarksOptions): ChartProgram;
```

Named option contracts: [`FilterMarksOptions`](./../types.md#type-filtermarksoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `target` | Optional / branch-dependent | `string \| undefined` |
| `mode` | Optional / branch-dependent | `"compose" \| "replace" \| undefined` |
| `grain` | Optional / branch-dependent | `"item" \| "stack" \| undefined` |
| `field` | Optional / branch-dependent | `string \| undefined` |
| `channel` | Optional / branch-dependent | `"color" \| "group" \| "opacity" \| "radius" \| "shape" \| "size" \| "stroke" \| "strokeDash" \| "strokeWidth" \| "theta" \| "x" \| "x2" \| "xOffset" \| "y" \| "y2" \| "yOffset" \| undefined` |
| `property` | Optional / branch-dependent | `MarkGraphicProperty \| undefined` |
| `op` | Required | `"eq" \| "gt" \| "gte" \| "lt" \| "lte" \| "max" \| "min" \| "neq" \| "oneOf" \| "range"` |
| `value` | Optional / branch-dependent | `unknown` |
| `values` | Optional / branch-dependent | `readonly unknown[]` |
| `min` | Optional / branch-dependent | `string \| number` |
| `max` | Optional / branch-dependent | `string \| number` |
| `inclusive` | Optional / branch-dependent | `boolean \| undefined` |
| `count` | Optional / branch-dependent | `number \| undefined` |
| `groupBy` | Optional / branch-dependent | `string \| readonly string[] \| undefined` |
| `ties` | Optional / branch-dependent | `"all" \| "first" \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
filterMarks({ target?, mode?, grain?, field | channel | property, op, ...operands })
```

Retain matching final mark items through the shared selector grammar. Repeated
filters are idempotent when equal and use explicit `replace` or `compose` mode
when different. Empty results preserve the preceding scale domains.
[Data](../../api/data.md)


## `removeMarkFilter`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
removeMarkFilter(options?: RemoveMarkFilterOptions): ChartProgram;
```

Named option contracts: [`RemoveMarkFilterOptions`](./../types.md#type-removemarkfilteroptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `target` | Optional / branch-dependent | `string \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
removeMarkFilter({ target? })
```

Restore a filtered mark to its canonical source, recover its prior Histogram bin
policy, and retain any filtered dataset snapshot that still has downstream users.
[Data](../../api/data.md)


## `removeMarkHighlight`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
removeMarkHighlight(options?: RemoveMarkSelectionOptions): ChartProgram;
```

Named option contracts: [`RemoveMarkSelectionOptions`](./../types.md#type-removemarkselectionoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `selection` | Optional / branch-dependent | `string \| undefined` |

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
highlightMarks(options: HighlightMarksOptions): ChartProgram;
```

Named option contracts: [`HighlightMarksOptions`](./../types.md#type-highlightmarksoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `id` | Optional / branch-dependent | `string \| undefined` |
| `target` | Optional / branch-dependent | `string \| undefined` |
| `select` | Optional / branch-dependent | `MarkSelector \| undefined` |
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
editCompositionLayout(options: EditCompositionLayoutOptions): ChartProgram;
```

Named option contracts: [`EditCompositionLayoutOptions`](./../types.md#type-editcompositionlayoutoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `columns` | Optional / branch-dependent | `number \| undefined` |
| `gap` | Optional / branch-dependent | `number \| undefined` |
| `align` | Optional / branch-dependent | `CompositionAlign \| undefined` |
| `padding` | Optional / branch-dependent | `number \| CompositionPadding \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
editCompositionLayout({ columns?, gap?, align?, padding? })
```

Edit spacing, cross-axis alignment, or outer padding on an existing composition.
`columns` changes wrapping only on a facet composition and is rejected for concat.
Omitted values are preserved, child identity is unchanged, and the parent snapshot
is rebuilt from retained child programs.


## `replaceCompositionChild`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
replaceCompositionChild(options: ReplaceCompositionChildOptions): ChartProgram;
```

Named option contracts: [`ReplaceCompositionChildOptions`](./../types.md#type-replacecompositionchildoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `target` | Required | `string` |
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
insertCompositionChild(options: InsertCompositionChildOptions): ChartProgram;
```

Named option contracts: [`InsertCompositionChildOptions`](./../types.md#type-insertcompositionchildoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `id` | Required | `string` |
| `program` | Required | `ChartProgram` |
| `before` | Optional / branch-dependent | `string \| undefined` |
| `after` | Optional / branch-dependent | `string \| undefined` |

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
removeCompositionChild(options: RemoveCompositionChildOptions): ChartProgram;
```

Named option contracts: [`RemoveCompositionChildOptions`](./../types.md#type-removecompositionchildoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `target` | Required | `string` |

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
reorderCompositionChildren(options: ReorderCompositionChildrenOptions): ChartProgram;
```

Named option contracts: [`ReorderCompositionChildrenOptions`](./../types.md#type-reordercompositionchildrenoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `order` | Required | `readonly [string, ...string[]]` |

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
facet(options: FacetOptions): ChartProgram;
```

Named option contracts: [`FacetOptions`](./../types.md#type-facetoptions).

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
| `gap` | Optional / branch-dependent | `number \| undefined` |
| `align` | Optional / branch-dependent | `CompositionAlign \| undefined` |
| `padding` | Optional / branch-dependent | `number \| CompositionPadding \| undefined` |
| `scales` | Optional / branch-dependent | `FacetScaleResolutions \| undefined` |
| `guides` | Optional / branch-dependent | `FacetGuideOptions \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
facet({ id?, field, data?, values?, columns?, gap?, align?, padding?, scales?, guides? })
```

Repeat one complete Cartesian, Polar, or Parallel chart by a field on its common
row-preserving dataset ancestor. Values preserve source first appearance;
scale policies can be `"shared"` or `"independent"` by supported role, including
Polar `theta`/public `r` and all `parallelDimensions`. Layered regression data,
other supported statistical descendants, attached labels, and references are
recomputed per cell.
`guides: { axes: "outer" }` keeps axes only on occupied outer cells, while
`guides: { legend: "shared" }` promotes one compatible parent-owned legend at
the child legend's configured `left`, `right`, `top`, or `bottom` edge. Top and
bottom promotion also preserves the child legend's horizontal alignment;
author those options with `createLegend` before calling `facet`.
See [Program composition](../../api/composition.md#repeat-the-current-chart-by-a-field).


## `facetGrid`

**API layer:** user-facing. **Authoring roles:** H0.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
facetGrid(options: FacetGridOptions): ChartProgram;
```

Named option contracts: [`FacetGridOptions`](./../types.md#type-facetgridoptions).

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
| `gap` | Optional / branch-dependent | `number \| undefined` |
| `align` | Optional / branch-dependent | `CompositionAlign \| undefined` |
| `padding` | Optional / branch-dependent | `number \| CompositionPadding \| undefined` |
| `scales` | Optional / branch-dependent | `FacetScaleResolutions \| undefined` |
| `guides` | Optional / branch-dependent | `FacetGuideOptions \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
facetGrid({ id?, data?, rows, columns, combinations?, gap?, align?, padding?, scales?, guides? })
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
repeatCharts(options: RepeatChartsOptions): ChartProgram;
```

Named option contracts: [`RepeatChartsOptions`](./../types.md#type-repeatchartsoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `id` | Optional / branch-dependent | `string \| undefined` |
| `target` | Optional / branch-dependent | `string \| undefined` |
| `channel` | Required | `"r" \| "theta" \| "x" \| "y" \| { parallelDimension: string; }` |
| `fields` | Required | `readonly [string, ...string[]]` |
| `columns` | Optional / branch-dependent | `number \| undefined` |
| `gap` | Optional / branch-dependent | `number \| undefined` |
| `align` | Optional / branch-dependent | `CompositionAlign \| undefined` |
| `padding` | Optional / branch-dependent | `number \| CompositionPadding \| undefined` |
| `scales` | Optional / branch-dependent | `FacetScaleResolutions \| undefined` |
| `guides` | Optional / branch-dependent | `FacetGuideOptions \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
repeatCharts({ id?, target?, channel, fields, columns?, gap?, align?, padding?, scales?, guides? })
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
editFacetSource(options: EditFacetSourceOptions): ChartProgram;
```

Named option contracts: [`EditFacetSourceOptions`](./../types.md#type-editfacetsourceoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `program` | Required | `ChartProgram` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
editFacetSource({ program })
```

Reapply the current facet, grid, or repeat recipe to a revised complete unit
program while preserving the partition dataset ID, ordered domains, layout,
scale/guide policy, headers, and parent title. All stored facet values must
remain observed; create a new composition when the dataset ID, domain, or
repeat field list changes.


## `editFacetHeaders`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
editFacetHeaders(options: EditFacetHeadersOptions): ChartProgram;
```

Named option contracts: [`EditFacetHeadersOptions`](./../types.md#type-editfacetheadersoptions).

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
| `role` | Optional / branch-dependent | `FacetHeaderRole \| undefined` |
| `labelMap` | Optional / branch-dependent | `"auto" \| DisplayLabelMap \| undefined` |
| `side` | Optional / branch-dependent | `FacetHeaderSide \| undefined` |
| `align` | Optional / branch-dependent | `FacetHeaderAlign \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
editFacetHeaders({ fontSize?, fontFamily?, fontWeight?, color?, offset?, role?, labelMap?, side?, align? })
```

Edit the parent-owned repeated facet headers and rebuild the parent snapshot
without changing child programs or facet value order.


## `editFacetScales`

**API layer:** user-facing. **Authoring roles:** H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
editFacetScales(options: FacetScaleResolutions): ChartProgram;
```

Named option contracts: [`FacetScaleResolutions`](./../types.md#type-facetscaleresolutions).

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
editFacetGuides(options: FacetGuideOptions): ChartProgram;
```

Named option contracts: [`FacetGuideOptions`](./../types.md#type-facetguideoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `axes` | Optional / branch-dependent | `"each" \| "outer" \| undefined` |
| `legend` | Optional / branch-dependent | `"shared" \| false \| undefined` |

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
createScatterPlot(options: CreateScatterPlotOptions): ChartProgram;
```

Named option contracts: [`CreateScatterPlotOptions`](./../types.md#type-createscatterplotoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `id` | Optional / branch-dependent | `string \| undefined` |
| `data` | Optional / branch-dependent | `string \| undefined` |
| `coordinate` | Optional / branch-dependent | `string \| undefined` |
| `x` | Required | `PointFacadePositionChannel` |
| `y` | Required | `PointFacadePositionChannel` |
| `color` | Optional / branch-dependent | `BasicColorChannel \| undefined` |
| `size` | Optional / branch-dependent | `BasicSizeChannel \| undefined` |
| `shape` | Optional / branch-dependent | `BasicShapeChannel \| undefined` |
| `point` | Optional / branch-dependent | `(StrokeStyleDetails & { radius?: number \| undefined; shape?: PointShape \| undefined; fill?: string \| undefined; opacity?: number \| undefined; stroke?: FilledMarkStroke \| undefined; strokeWidth?: number \| undefined; }) \| undefined` |
| `guides` | Optional / branch-dependent | `false \| CartesianGuideOptions \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
createScatterPlot({ id?, data?, coordinate?, x, y, color?, size?, shape?, point?, guides? })
```

Create a complete Cartesian point chart from required x/y fields and optional
appearance encodings. [Basic Charts](../../api/basic-charts.md#createscatterplot)


## `createDotPlot`

**API layer:** user-facing. **Authoring roles:** H0, H1.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
createDotPlot(options: CreateDotPlotOptions): ChartProgram;
```

Named option contracts: [`CreateDotPlotOptions`](./../types.md#type-createdotplotoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `value` | Required | `EndpointValueChannel` |
| `point` | Optional / branch-dependent | `(StrokeStyleDetails & { radius?: number \| undefined; shape?: PointShape \| undefined; fill?: string \| undefined; opacity?: number \| undefined; stroke?: FilledMarkStroke \| undefined; strokeWidth?: number \| undefined; }) \| undefined` |
| `labels` | Optional / branch-dependent | `false \| EndpointLabelOptions \| undefined` |
| `id` | Optional / branch-dependent | `string \| undefined` |
| `data` | Optional / branch-dependent | `string \| undefined` |
| `coordinate` | Optional / branch-dependent | `string \| undefined` |
| `category` | Required | `EndpointCategoryChannel` |
| `orientation` | Optional / branch-dependent | `"horizontal" \| "vertical" \| undefined` |
| `summary` | Optional / branch-dependent | `EndpointPlotSummary \| undefined` |
| `guides` | Optional / branch-dependent | `false \| CartesianGuideOptions \| undefined` |

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
createLollipopPlot(options: CreateLollipopPlotOptions): ChartProgram;
```

Named option contracts: [`CreateLollipopPlotOptions`](./../types.md#type-createlollipopplotoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `value` | Required | `EndpointValueChannel` |
| `baseline` | Optional / branch-dependent | `number \| undefined` |
| `point` | Optional / branch-dependent | `(StrokeStyleDetails & { radius?: number \| undefined; shape?: PointShape \| undefined; fill?: string \| undefined; opacity?: number \| undefined; stroke?: FilledMarkStroke \| undefined; strokeWidth?: number \| undefined; }) \| undefined` |
| `stem` | Optional / branch-dependent | `RuleStyleOptions \| undefined` |
| `labels` | Optional / branch-dependent | `false \| EndpointLabelOptions \| undefined` |
| `id` | Optional / branch-dependent | `string \| undefined` |
| `data` | Optional / branch-dependent | `string \| undefined` |
| `coordinate` | Optional / branch-dependent | `string \| undefined` |
| `category` | Required | `EndpointCategoryChannel` |
| `orientation` | Optional / branch-dependent | `"horizontal" \| "vertical" \| undefined` |
| `summary` | Optional / branch-dependent | `EndpointPlotSummary \| undefined` |
| `guides` | Optional / branch-dependent | `false \| CartesianGuideOptions \| undefined` |

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
createDumbbellPlot(options: CreateDumbbellPlotOptions): ChartProgram;
```

Named option contracts: [`CreateDumbbellPlotOptions`](./../types.md#type-createdumbbellplotoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `start` | Required | `EndpointValueChannel` |
| `end` | Required | `EndpointValueChannel` |
| `startPoint` | Optional / branch-dependent | `(StrokeStyleDetails & { radius?: number \| undefined; shape?: PointShape \| undefined; fill?: string \| undefined; opacity?: number \| undefined; stroke?: FilledMarkStroke \| undefined; strokeWidth?: number \| undefined; }) \| undefined` |
| `endPoint` | Optional / branch-dependent | `(StrokeStyleDetails & { radius?: number \| undefined; shape?: PointShape \| undefined; fill?: string \| undefined; opacity?: number \| undefined; stroke?: FilledMarkStroke \| undefined; strokeWidth?: number \| undefined; }) \| undefined` |
| `connector` | Optional / branch-dependent | `RuleStyleOptions \| undefined` |
| `labels` | Optional / branch-dependent | `false \| (EndpointLabelOptions & { endpoint?: "both" \| "end" \| "start" \| undefined; }) \| undefined` |
| `id` | Optional / branch-dependent | `string \| undefined` |
| `data` | Optional / branch-dependent | `string \| undefined` |
| `coordinate` | Optional / branch-dependent | `string \| undefined` |
| `category` | Required | `EndpointCategoryChannel` |
| `orientation` | Optional / branch-dependent | `"horizontal" \| "vertical" \| undefined` |
| `summary` | Optional / branch-dependent | `EndpointPlotSummary \| undefined` |
| `guides` | Optional / branch-dependent | `false \| CartesianGuideOptions \| undefined` |

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
editEndpointPlot(options: EditEndpointPlotOptions): ChartProgram;
```

Named option contracts: [`EditEndpointPlotOptions`](./../types.md#type-editendpointplotoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `target` | Optional / branch-dependent | `string \| undefined` |
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


## `createECDFPlot`

**API layer:** user-facing. **Authoring roles:** H0, H1.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
createECDFPlot(options: CreateECDFPlotOptions): ChartProgram;
```

Named option contracts: [`CreateECDFPlotOptions`](./../types.md#type-createecdfplotoptions).

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
| `color` | Optional / branch-dependent | `LineCategoricalColorChannel \| undefined` |
| `line` | Optional / branch-dependent | `(StrokeStyleDetails & { strokeWidth?: number \| undefined; stroke?: string \| undefined; opacity?: number \| undefined; }) \| undefined` |
| `labels` | Optional / branch-dependent | `false \| EndpointLabelOptions \| undefined` |
| `guides` | Optional / branch-dependent | `false \| CartesianPathGuideOptions \| undefined` |

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
editECDFPlot(options: EditECDFPlotOptions): ChartProgram;
```

Named option contracts: [`EditECDFPlotOptions`](./../types.md#type-editecdfplotoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `target` | Optional / branch-dependent | `string \| undefined` |
| `data` | Optional / branch-dependent | `string \| undefined` |
| `coordinate` | Optional / branch-dependent | `string \| undefined` |
| `field` | Optional / branch-dependent | `string \| undefined` |
| `missing` | Optional / branch-dependent | `"drop" \| "error" \| undefined` |
| `as` | Optional / branch-dependent | `ECDFOutputFields \| undefined` |
| `groupBy` | Optional / branch-dependent | `string \| false \| readonly [string, ...string[]] \| undefined` |
| `weight` | Optional / branch-dependent | `string \| false \| undefined` |
| `color` | Optional / branch-dependent | `false \| LineCategoricalColorChannel \| undefined` |

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
createIntervalPlot(options: CreateIntervalPlotOptions): ChartProgram;
```

Named option contracts: [`CreateIntervalPlotOptions`](./../types.md#type-createintervalplotoptions).

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
| `point` | Optional / branch-dependent | `(StrokeStyleDetails & { radius?: number \| undefined; shape?: PointShape \| undefined; fill?: string \| undefined; opacity?: number \| undefined; stroke?: FilledMarkStroke \| undefined; strokeWidth?: number \| undefined; }) \| undefined` |
| `errorBar` | Optional / branch-dependent | `IntervalPlotErrorBarOptions \| undefined` |
| `guides` | Optional / branch-dependent | `false \| CartesianGuideOptions \| undefined` |
| `x` | Required | `string \| ErrorBarIntervalChannel \| ErrorBarPositionChannel` |
| `y` | Required | `string \| ErrorBarIntervalChannel \| ErrorBarPositionChannel` |

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
createRegressionPlot(options: CreateRegressionPlotOptions): ChartProgram;
```

Named option contracts: [`CreateRegressionPlotOptions`](./../types.md#type-createregressionplotoptions).

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
| `point` | Optional / branch-dependent | `(StrokeStyleDetails & { radius?: number \| undefined; shape?: PointShape \| undefined; fill?: string \| undefined; opacity?: number \| undefined; stroke?: FilledMarkStroke \| undefined; strokeWidth?: number \| undefined; }) \| undefined` |
| `guides` | Optional / branch-dependent | `false \| CartesianGuideOptions \| undefined` |
| `method` | Optional / branch-dependent | `"linear" \| "loess" \| "polynomial" \| undefined` |
| `degree` | Optional / branch-dependent | `number \| undefined` |
| `span` | Optional / branch-dependent | `number \| undefined` |
| `confidenceMethod` | Optional / branch-dependent | `ConfidenceIntervalMethod \| undefined` |
| `level` | Optional / branch-dependent | `number \| undefined` |
| `confidence` | Optional / branch-dependent | `number \| undefined` |
| `interval` | Optional / branch-dependent | `false \| RegressionInterval \| undefined` |
| `predict` | Optional / branch-dependent | `RegressionPredictOptions \| undefined` |
| `groupBy` | Optional / branch-dependent | `string \| false \| undefined` |
| `line` | Optional / branch-dependent | `(StrokeStyleDetails & { strokeWidth?: number \| undefined; curve?: CurveInterpolation \| undefined; }) \| undefined` |
| `sourceBinding` | Optional / branch-dependent | `"fixed" \| "follow" \| undefined` |
| `missing` | Optional / branch-dependent | `"drop" \| "error" \| undefined` |
| `band` | Optional / branch-dependent | `false \| RegressionBandOptions \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
createRegressionPlot({ id?, data?, coordinate?, x, y, color?, size?, shape?, point?, groupBy?, method?, band?, line?, guides? })
```

Create a complete scatter plot with an existing regression data, line, and
optional interval-band hierarchy. `groupBy: false` is preserved as an explicit
ungrouped model request.


## `createLinePlot`

**API layer:** user-facing. **Authoring roles:** H0.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
createLinePlot(options: CreateLinePlotOptions): ChartProgram;
```

Named option contracts: [`CreateLinePlotOptions`](./../types.md#type-createlineplotoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `id` | Optional / branch-dependent | `string \| undefined` |
| `data` | Optional / branch-dependent | `string \| undefined` |
| `coordinate` | Optional / branch-dependent | `string \| undefined` |
| `x` | Required | `LineXPositionChannel` |
| `y` | Required | `LineYPositionChannel` |
| `color` | Optional / branch-dependent | `LineCategoricalColorChannel \| undefined` |
| `groupBy` | Optional / branch-dependent | `string \| readonly [string, ...string[]] \| undefined` |
| `strokeDash` | Optional / branch-dependent | `Omit<{ field: string; value?: undefined; target?: string \| undefined; fieldType?: "nominal" \| undefined; scale?: DashScaleOptions \| undefined; }, "target"> \| Omit<...> \| undefined` |
| `line` | Optional / branch-dependent | `(StrokeStyleDetails & { strokeWidth?: number \| undefined; curve?: CurveInterpolation \| undefined; stroke?: string \| undefined; opacity?: number \| undefined; closed?: false \| undefined; }) \| undefined` |
| `guides` | Optional / branch-dependent | `false \| CPathGuides \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
createLinePlot({ id?, data?, coordinate?, x, y, color?, groupBy?, strokeDash?, line?, guides? })
```

Create a complete Cartesian line chart. `groupBy` accepts one field or a
non-empty tuple, assigned before independent series color and dash. [Basic Charts](../../api/basic-charts.md#createlineplot)


## `createPolarScatterPlot`

**API layer:** user-facing. **Authoring roles:** H0.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
createPolarScatterPlot(options: CreatePolarScatterPlotOptions): ChartProgram;
```

Named option contracts: [`CreatePolarScatterPlotOptions`](./../types.md#type-createpolarscatterplotoptions).

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
| `point` | Optional / branch-dependent | `(StrokeStyleDetails & { radius?: number \| undefined; shape?: PointShape \| undefined; fill?: string \| undefined; opacity?: number \| undefined; stroke?: FilledMarkStroke \| undefined; strokeWidth?: number \| undefined; }) \| undefined` |
| `guides` | Optional / branch-dependent | `false \| PolarPointGuideOptions \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
createPolarScatterPlot({ id?, data?, coordinate?, theta, radius, color?, size?, shape?, point?, guides? })
```

Create a complete Polar point chart from required angular and radial fields.
Radial position remains independent from `size` and constant `point.radius`.
[Polar positions](../../api/position-encodings.md#polar-positions)


## `createPolarLinePlot`

**API layer:** user-facing. **Authoring roles:** H0.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
createPolarLinePlot(options: CreatePolarLinePlotOptions): ChartProgram;
```

Named option contracts: [`CreatePolarLinePlotOptions`](./../types.md#type-createpolarlineplotoptions).

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
| `color` | Optional / branch-dependent | `LineCategoricalColorChannel \| undefined` |
| `groupBy` | Optional / branch-dependent | `string \| readonly [string, ...string[]] \| undefined` |
| `strokeDash` | Optional / branch-dependent | `Omit<{ field: string; value?: undefined; target?: string \| undefined; fieldType?: "nominal" \| undefined; scale?: DashScaleOptions \| undefined; }, "target"> \| Omit<...> \| undefined` |
| `line` | Optional / branch-dependent | `(Omit<StrokeStyleDetails & { strokeWidth?: number \| undefined; curve?: CurveInterpolation \| undefined; stroke?: string \| undefined; opacity?: number \| undefined; closed?: false \| undefined; }, "closed" \| "curve"> & { ...; }) \| undefined` |
| `guides` | Optional / branch-dependent | `false \| PolarPathGuideOptions \| undefined` |

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
createRadarPlot(options: CreateRadarPlotOptions): ChartProgram;
```

Named option contracts: [`CreateRadarPlotOptions`](./../types.md#type-createradarplotoptions).

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
| `color` | Optional / branch-dependent | `LineCategoricalColorChannel \| undefined` |
| `strokeDash` | Optional / branch-dependent | `Omit<{ field: string; value?: undefined; target?: string \| undefined; fieldType?: "nominal" \| undefined; scale?: DashScaleOptions \| undefined; }, "target"> \| Omit<...> \| undefined` |
| `line` | Optional / branch-dependent | `(Omit<StrokeStyleDetails & { strokeWidth?: number \| undefined; curve?: CurveInterpolation \| undefined; stroke?: string \| undefined; opacity?: number \| undefined; closed?: false \| undefined; }, "closed" \| "curve"> & { ...; }) \| undefined` |
| `guides` | Optional / branch-dependent | `false \| RadarGuideOptions \| undefined` |
| `category` | Optional / branch-dependent | `RadarCategoryChannel \| undefined` |
| `value` | Optional / branch-dependent | `PolarRadiusChannel \| undefined` |
| `wide` | Optional / branch-dependent | `RadarWideOptions \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
createRadarPlot({ id?, data?, coordinate?, category, value, groupBy?, order?, color?, strokeDash?, line?, guides? })
createRadarPlot({ id?, data?, coordinate?, wide: { fields, as? }, groupBy?, order?, color?, strokeDash?, line?, guides? })
```

Create closed Radar paths from validated long rows or an explicit wide-to-long
Fold. Every series must contain the same ordered dimensions exactly once. Values
are used as supplied; the facade does not infer normalization. [Polar positions](../../api/position-encodings.md#polar-positions)


## `createRugPlot`

**API layer:** user-facing. **Authoring roles:** H0.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
createRugPlot(options: CreateRugPlotOptions): ChartProgram;
```

Named option contracts: [`CreateRugPlotOptions`](./../types.md#type-createrugplotoptions).

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

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
createRugPlot({ id?, data?, x, edge: "top" | "bottom", tick?, guides? })
createRugPlot({ id?, data?, y, edge: "left" | "right", tick?, guides? })
```

Create a one-dimensional distribution from quantitative or temporal observations.
Ticks use an explicit plot edge as their constant position, so no dummy field is
needed. The default guide contains only the measure axis.


## `createStripPlot`

**API layer:** user-facing. **Authoring roles:** H0.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
createStripPlot(options: CreateStripPlotOptions): ChartProgram;
```

Named option contracts: [`CreateStripPlotOptions`](./../types.md#type-createstripplotoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `id` | Optional / branch-dependent | `string \| undefined` |
| `data` | Optional / branch-dependent | `string \| undefined` |
| `coordinate` | Optional / branch-dependent | `string \| undefined` |
| `color` | Optional / branch-dependent | `BasicColorChannel \| undefined` |
| `size` | Optional / branch-dependent | `BasicSizeChannel \| undefined` |
| `shape` | Optional / branch-dependent | `BasicShapeChannel \| undefined` |
| `point` | Optional / branch-dependent | `(StrokeStyleDetails & { radius?: number \| undefined; shape?: PointShape \| undefined; fill?: string \| undefined; opacity?: number \| undefined; stroke?: FilledMarkStroke \| undefined; strokeWidth?: number \| undefined; }) \| undefined` |
| `guides` | Optional / branch-dependent | `false \| CartesianGuideOptions \| undefined` |
| `x` | Required | `string \| { field: string; fieldType?: "quantitative" \| undefined; temporalUnit?: undefined; scale?: NonPointQuantitativePositionScaleOptions \| undefined; } \| { ...; } \| { ...; }` |
| `y` | Optional / branch-dependent | `string \| { field: string; fieldType?: "quantitative" \| undefined; temporalUnit?: undefined; scale?: NonPointQuantitativePositionScaleOptions \| undefined; } \| { ...; } \| { ...; } \| undefined` |
| `jitter` | Optional / branch-dependent | `false \| StripBandJitterOptions \| StripPixelJitterOptions \| undefined` |

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
createBeeswarmPlot(options: CreateBeeswarmPlotOptions): ChartProgram;
```

Named option contracts: [`CreateBeeswarmPlotOptions`](./../types.md#type-createbeeswarmplotoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `id` | Optional / branch-dependent | `string \| undefined` |
| `data` | Optional / branch-dependent | `string \| undefined` |
| `coordinate` | Optional / branch-dependent | `string \| undefined` |
| `color` | Optional / branch-dependent | `BasicColorChannel \| undefined` |
| `size` | Optional / branch-dependent | `BasicSizeChannel \| undefined` |
| `shape` | Optional / branch-dependent | `BasicShapeChannel \| undefined` |
| `point` | Optional / branch-dependent | `(StrokeStyleDetails & { radius?: number \| undefined; shape?: PointShape \| undefined; fill?: string \| undefined; opacity?: number \| undefined; stroke?: FilledMarkStroke \| undefined; strokeWidth?: number \| undefined; }) \| undefined` |
| `packing` | Optional / branch-dependent | `false \| BeeswarmPackingOptions \| undefined` |
| `guides` | Optional / branch-dependent | `false \| CartesianGuideOptions \| undefined` |
| `x` | Required | `string \| { field: string; fieldType?: "quantitative" \| undefined; temporalUnit?: undefined; scale?: NonPointQuantitativePositionScaleOptions \| undefined; } \| { ...; } \| { ...; }` |
| `y` | Required | `string \| { field: string; fieldType?: "quantitative" \| undefined; temporalUnit?: undefined; scale?: NonPointQuantitativePositionScaleOptions \| undefined; } \| { ...; } \| { ...; }` |

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
createRaincloudPlot(options: CreateRaincloudPlotOptions): ChartProgram;
```

Named option contracts: [`CreateRaincloudPlotOptions`](./../types.md#type-createraincloudplotoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
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
| `color` | Optional / branch-dependent | `LineCategoricalColorChannel \| undefined` |
| `guides` | Optional / branch-dependent | `false \| CartesianCategoricalGuideOptions \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
createRaincloudPlot({ id?, data?, coordinate?, category, value, orientation?, side?, density?, summary?, points?, color?, guides? })
```

Create a shared-source distribution composite from an optional half Violin,
Box or Interval summary, and Strip or Beeswarm raw points. Defaults are vertical,
`side: "before"`, Box summary, and Beeswarm points. Stable Cloud/Summary/Points
children share role scales; summary and points use a replayable band-relative slot
offset on the side opposite the density.


## `editRaincloudPlot`

**API layer:** user-facing. **Authoring roles:** H1, H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
editRaincloudPlot(options: EditRaincloudPlotOptions): ChartProgram;
```

Named option contracts: [`EditRaincloudPlotOptions`](./../types.md#type-editraincloudplotoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `target` | Optional / branch-dependent | `string \| undefined` |
| `data` | Optional / branch-dependent | `string \| undefined` |
| `category` | Optional / branch-dependent | `RaincloudCategoryChannel \| undefined` |
| `value` | Optional / branch-dependent | `RaincloudValueChannel \| undefined` |
| `orientation` | Optional / branch-dependent | `"horizontal" \| "vertical" \| undefined` |
| `side` | Optional / branch-dependent | `"after" \| "before" \| undefined` |
| `density` | Optional / branch-dependent | `false \| RaincloudDensityOptions \| undefined` |
| `summary` | Optional / branch-dependent | `false \| RaincloudSummaryOptions \| undefined` |
| `points` | Optional / branch-dependent | `false \| RaincloudPointsOptions \| undefined` |
| `color` | Optional / branch-dependent | `false \| LineCategoricalColorChannel \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
editRaincloudPlot({ target?, data?, category?, value?, orientation?, side?, density?, summary?, points?, color? })
```

Atomically revise one Raincloud's shared source, roles, orientation, side, and
component modes while preserving its parent and child IDs. Use `false` to disable
an optional component or remove color; at least one component must remain enabled.


## `createBarPlot`

**API layer:** user-facing. **Authoring roles:** H0.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
createBarPlot(options: CreateBarPlotOptions): ChartProgram;
```

Named option contracts: [`CreateBarPlotOptions`](./../types.md#type-createbarplotoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `id` | Optional / branch-dependent | `string \| undefined` |
| `data` | Optional / branch-dependent | `string \| undefined` |
| `coordinate` | Optional / branch-dependent | `string \| undefined` |
| `x` | Required | `BandPositionChannel` |
| `y` | Required | `BarYPositionChannel` |
| `color` | Optional / branch-dependent | `BarColorChannel \| undefined` |
| `width` | Optional / branch-dependent | `Omit<BarWidthOptions, "target"> \| undefined` |
| `bar` | Optional / branch-dependent | `(StrokeStyleDetails & { cornerRadius?: number \| undefined; } & { fill?: string \| undefined; opacity?: number \| undefined; stroke?: FilledMarkStroke \| undefined; strokeWidth?: number \| undefined; }) \| undefined` |
| `guides` | Optional / branch-dependent | `false \| ColorGuides \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
createBarPlot({ id?, data?, coordinate?, x, y, color?, width?, bar?, guides? })
```

Create categorical or temporal bars with quantitative measures; use `color.layout` for grouped or stacked partitions, not top-level `stack`/`groupBy`; width defaults to 0.72 of the slot and guides are inferred unless disabled.
Category-first child calls infer
the measure's mean in either orientation; temporal categories are supported on both axes.
[Basic Charts](../../api/basic-charts.md#createbarplot)


## `createHistogram`

**API layer:** user-facing. **Authoring roles:** H0, H1.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
createHistogram(options: CreateHistogramOptions): ChartProgram;
```

Named option contracts: [`CreateHistogramOptions`](./../types.md#type-createhistogramoptions).

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
| `bar` | Optional / branch-dependent | `(StrokeStyleDetails & { cornerRadius?: number \| undefined; } & { fill?: string \| undefined; opacity?: number \| undefined; stroke?: FilledMarkStroke \| undefined; strokeWidth?: number \| undefined; }) \| undefined` |
| `guides` | Optional / branch-dependent | `false \| CartesianCategoricalGuideOptions \| undefined` |

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
createHeatmap(options: CreateHeatmapOptions): ChartProgram;
```

Named option contracts: [`CreateHeatmapOptions`](./../types.md#type-createheatmapoptions).

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
| `rect` | Optional / branch-dependent | `(StrokeStyleDetails & { cornerRadius?: number \| undefined; } & { opacity?: number \| undefined; stroke?: string \| false \| undefined; strokeWidth?: number \| undefined; }) \| undefined` |
| `guides` | Optional / branch-dependent | `false \| CartesianGuideOptions \| undefined` |

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
createParallelCoordinates(options: CreateParallelCoordinatesOptions): ChartProgram;
```

Named option contracts: [`CreateParallelCoordinatesOptions`](./../types.md#type-createparallelcoordinatesoptions).

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
| `color` | Optional / branch-dependent | `LineCategoricalColorChannel \| undefined` |
| `strokeDash` | Optional / branch-dependent | `Omit<{ field: string; value?: undefined; target?: string \| undefined; fieldType?: "nominal" \| undefined; scale?: DashScaleOptions \| undefined; }, "target"> \| Omit<...> \| undefined` |
| `line` | Optional / branch-dependent | `(StrokeStyleDetails & { strokeWidth?: number \| undefined; stroke?: string \| undefined; opacity?: number \| undefined; curve?: "linear" \| undefined; closed?: false \| undefined; }) \| undefined` |
| `guides` | Optional / branch-dependent | `false \| ParallelGuideOptions \| undefined` |

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
createPiePlot(options: CreatePiePlotOptions): ChartProgram;
```

Named option contracts: [`CreatePiePlotOptions`](./../types.md#type-createpieplotoptions).

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
| `arc` | Optional / branch-dependent | `(StrokeStyleDetails & { innerRadius?: number \| undefined; padAngle?: number \| undefined; fill?: string \| undefined; opacity?: number \| undefined; stroke?: string \| undefined; strokeWidth?: number \| undefined; }) \| undefined` |
| `guides` | Optional / branch-dependent | `false \| { axes?: false \| undefined; grid?: false \| undefined; legend?: false \| PieLegendOptions \| undefined; } \| undefined` |
| `value` | Optional / branch-dependent | `string \| undefined` |
| `aggregate` | Optional / branch-dependent | `"count" \| "sum" \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
createPiePlot({ id?, data?, coordinate?, category, value?, aggregate?, color?, arc?, guides? })
```

Create one sector per category in the full package. `category` is required and
defaults to nominal count, including numeric categories. For weights, provide
both `value` and `aggregate: "sum"`; values must be finite and nonnegative with
a positive total. Color defaults to the category. Use `color: false` for a
scalar `arc.fill`; otherwise each slice must resolve to one categorical color.

`arc.innerRadius` is a radius ratio in [0,1), and `arc.padAngle` is in degrees.
Use these options for a donut. `guides` defaults to a color legend with no axes
or grid; `guides: false` skips guide creation. Explicit axes/grid requests must
be false. A zero-weight category may remain in the color legend without a sector.
The default id is `piePlot`. Edit with `editArcMark`, theta/color encodings,
scales and legend actions. [Pie and donut tutorial](../../tutorials/polar-arcs.md#complete-pie-and-donut-plots)


## `createRosePlot`

**API layer:** user-facing. **Authoring roles:** H0.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
createRosePlot(options: CreateRosePlotOptions): ChartProgram;
```

Named option contracts: [`CreateRosePlotOptions`](./../types.md#type-createroseplotoptions).

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
| `arc` | Optional / branch-dependent | `(StrokeStyleDetails & { innerRadius?: number \| undefined; padAngle?: 0 \| undefined; fill?: string \| undefined; opacity?: number \| undefined; stroke?: string \| undefined; strokeWidth?: number \| undefined; }) \| undefined` |
| `guides` | Optional / branch-dependent | `false \| MeasuredRadialGuideOptions \| undefined` |
| `value` | Optional / branch-dependent | `string \| undefined` |
| `aggregate` | Optional / branch-dependent | `"count" \| "sum" \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
createRosePlot({ id?, data?, coordinate?, category, value?, aggregate?, radiusScale?, color?, arc?, guides? })
```

Create equal-angle sectors whose sector area, excluding the hole is proportional to category count or sum. Category is required; omit value for count or provide value with aggregate: "sum". Color defaults to category and guides provide theta/radius axes, Polar grids, and a categorical legend. Use guides:false to skip them, or color:false with arc.fill for one color.

The default id is `rosePlot`. Radius scales are linear and zero-based; explicit domain [0,U] must cover all aggregates and range [inner,outer] must fit Canvas. Arc padAngle is 0 and an explicitly specified innerRadius must agree with the range. Zero categories retain domain entries but draw no sector. Negative, nonfinite, empty/all-zero and unrepresentable positive-thickness inputs are errors. Edit the child mark, encodings, scales and guides with their own actions.

[Measured radial tutorial](../../tutorials/polar-arcs.md#measured-rose-and-radial-bar-plots)


## `createRadialBarPlot`

**API layer:** user-facing. **Authoring roles:** H0.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
createRadialBarPlot(options: CreateRadialBarPlotOptions): ChartProgram;
```

Named option contracts: [`CreateRadialBarPlotOptions`](./../types.md#type-createradialbarplotoptions).

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
| `arc` | Optional / branch-dependent | `(StrokeStyleDetails & { innerRadius?: number \| undefined; padAngle?: 0 \| undefined; fill?: string \| undefined; opacity?: number \| undefined; stroke?: string \| undefined; strokeWidth?: number \| undefined; }) \| undefined` |
| `guides` | Optional / branch-dependent | `false \| MeasuredRadialGuideOptions \| undefined` |
| `value` | Optional / branch-dependent | `string \| undefined` |
| `aggregate` | Optional / branch-dependent | `"count" \| "sum" \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
createRadialBarPlot({ id?, data?, coordinate?, category, value?, aggregate?, radiusScale?, color?, arc?, guides? })
```

Create equal-angle sectors whose radial length measured from the inner edge is proportional to category count or sum. Category is required; omit value for count or provide value with aggregate: "sum". Color defaults to category and guides provide theta/radius axes, Polar grids, and a categorical legend. Use guides:false to skip them, or color:false with arc.fill for one color.

The default id is `radialBarPlot`. Radius scales are linear and zero-based; explicit domain [0,U] must cover all aggregates and range [inner,outer] must fit Canvas. Arc padAngle is 0 and an explicitly specified innerRadius must agree with the range. Zero categories retain domain entries but draw no sector. Negative, nonfinite, empty/all-zero and unrepresentable positive-thickness inputs are errors. Edit the child mark, encodings, scales and guides with their own actions.

[Measured radial tutorial](../../tutorials/polar-arcs.md#measured-rose-and-radial-bar-plots)


## `createAreaPlot`

**API layer:** user-facing. **Authoring roles:** H0.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
createAreaPlot(options: CreateAreaPlotOptions): ChartProgram;
```

Named option contracts: [`CreateAreaPlotOptions`](./../types.md#type-createareaplotoptions).

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
| `area` | Optional / branch-dependent | `(StrokeStyleDetails & { fill?: string \| undefined; opacity?: number \| undefined; stroke?: string \| undefined; strokeWidth?: number \| undefined; curve?: CurveInterpolation \| undefined; }) \| undefined` |
| `guides` | Optional / branch-dependent | `false \| DensityPlotGuideOptions \| undefined` |
| `valueChannel` | Optional / branch-dependent | `"x" \| "y" \| undefined` |
| `x` | Required | `{ field: string; scale?: NonPointQuantitativePositionScaleOptions \| undefined; } \| AreaPlotIndependentChannel \| ({ ...; } & ({ ...; } \| { ...; }))` |
| `y` | Required | `{ field: string; scale?: NonPointQuantitativePositionScaleOptions \| undefined; } \| AreaPlotIndependentChannel \| ({ ...; } & ({ ...; } \| { ...; }))` |
| `baseline` | Optional / branch-dependent | `number \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
createAreaPlot({ id?, data?, coordinate?, x, y, valueChannel?, baseline?, groupBy?, layout?, missing?, color?, area?, guides? })
```

Create a simple area, crossing ribbon, or accumulated series chart in the full entry. The default ID is
`areaPlot`; x and y are required. `valueChannel` defaults to y. Its measurement is a field string,
`{field,scale?}`, or `{lower,upper,scale?}`. Each bound is a field string or finite `{datum}` and at least
one bound must use a field. A simple field closes to baseline 0; `baseline` cannot accompany a range.
The independent position is quantitative or temporal and accepts field/fieldType/temporalUnit/scale.

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


## Focused core data editing

```javascript
editDerivedData({ target, definition, dependents? })
editFilteredData({ target, field?, oneOf? | noneOf? | predicate? | range?, nulls?, dependents? })
editSortedData({ target, sortBy, dependents? })
editTimeUnitData({ target, field?, unit?, as?, temporalUnit?, timeZone?, weekStartsOn?, weekRule?, dependents? })
editWindowData({ target, partitionBy?, sortBy?, operations?, temporalUnit?, dependents? })
editDensityData({ target, field?, groupBy?, bandwidth?, extent?, steps?, kernel?, normalization?, as?, weight?, dependents? })
editRegressionData({ target, x?, y?, groupBy?, method?, degree?, span?, confidenceMethod?, level?, interval?, dependents? })
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
editStrokeDashScale({ id?, target?, type?, domain?, range? })
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
