---
layout: default
title: Statistical Layer Actions
description: Create and edit regression, density, interval, error, and box-plot layers.
---

# Statistical Layer Actions

Each declared action has an exact signature and its own stable link. Option tables are generated from types; behavior prose names the owning workflow and its constraints. API layers and [H0–H4 catalog role tags](../../tutorials/hierarchical-authoring.md#catalog-role-tags) are independent classifications. Relative action hierarchy is determined by composition, not by a tag or fixed trace depth.

## `createSummaryData`

**API layer:** user-facing. **Authoring roles:** H1.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
createSummaryData(options: SummaryDataOptions): ChartProgram;
```

Named option contracts: [`SummaryDataOptions`](./../types.md#type-summarydataoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `id` | Required | `string` |
| `source` | Optional / branch-dependent | `string \| undefined` |
| `groupBy` | Optional / branch-dependent | `string \| readonly string[] \| undefined` |
| `aggregates` | Required | `readonly SummaryAggregateOptions[]` |
| `members` | Optional / branch-dependent | `string \| undefined` |
| `weight` | Optional / branch-dependent | `StatisticalWeight \| undefined` |
| `missing` | Optional / branch-dependent | `"drop" \| "error" \| undefined` |
| `empty` | Optional / branch-dependent | `"identity" \| "null" \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
createSummaryData({ id, source?, groupBy?, aggregates, members? })
```

Materialize reusable, first-appearance-ordered summary rows from one or more
shared aggregate operations. [Source and Derived Data](../../api/data/source-and-derived.md#createsummarydata-id-source-groupby-aggregates-members)


## `createBinData`

**API layer:** user-facing. **Authoring roles:** H1.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
createBinData(options: BinDataOptions): ChartProgram;
```

Named option contracts: [`BinDataOptions`](./../types.md#type-bindataoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `id` | Required | `string` |
| `source` | Optional / branch-dependent | `string \| undefined` |
| `field` | Required | `string` |
| `extent` | Optional / branch-dependent | `"auto" \| readonly [number, number] \| undefined` |
| `nice` | Optional / branch-dependent | `boolean \| undefined` |
| `zero` | Optional / branch-dependent | `boolean \| undefined` |
| `includeEmpty` | Optional / branch-dependent | `boolean \| undefined` |
| `members` | Optional / branch-dependent | `boolean \| undefined` |
| `weight` | Optional / branch-dependent | `StatisticalWeight \| undefined` |
| `missing` | Optional / branch-dependent | `"drop" \| "error" \| undefined` |
| `as` | Optional / branch-dependent | `BinDataOutputFields \| undefined` |
| `maxBins` | Optional / branch-dependent | `number \| undefined` |
| `step` | Optional / branch-dependent | `number \| undefined` |
| `boundaries` | Optional / branch-dependent | `readonly [number, number, ...number[]] \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
createBinData({ id, source?, field, maxBins? | step | boundaries, extent?, nice?, zero?, includeEmpty?, members?, as? })
```

Materialize reusable one-dimensional bounds, counts, and optional source
members using the same edge rules as Histogram.
[Source and Derived Data](../../api/data/source-and-derived.md#createbindata-id-source-field-binoptions)


## `createFoldData`

**API layer:** user-facing. **Authoring roles:** H1.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
createFoldData(options: FoldDataOptions): ChartProgram;
```

Named option contracts: [`FoldDataOptions`](./../types.md#type-folddataoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `id` | Required | `string` |
| `source` | Optional / branch-dependent | `string \| undefined` |
| `fields` | Required | `readonly string[]` |
| `as` | Optional / branch-dependent | `FoldDataOutputFields \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
createFoldData({ id, source?, fields, as? })
```

Materialize selected wide fields as stable key/value rows while preserving
every source cell. [Source and Derived Data](../../api/data/source-and-derived.md#createfolddata-id-source-fields-as)


## `createComputedData`

**API layer:** user-facing. **Authoring roles:** H1.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
createComputedData(options: ComputedDataOptions): ChartProgram;
```

Named option contracts: [`ComputedDataOptions`](./../types.md#type-computeddataoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `id` | Required | `string` |
| `source` | Optional / branch-dependent | `string \| undefined` |
| `as` | Required | `string` |
| `expression` | Required | `ComputedExpression` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
createComputedData({ id, source?, as, expression })
```

Materialize a typed primitive or null field from a serializable, closed
expression. [Source and Derived Data](../../api/data/source-and-derived.md#createcomputeddata-id-source-as-expression)


## `createNormalizedData`

**API layer:** user-facing. **Authoring roles:** H1.

**Availability:** Available by v0.0.17. See [release compatibility](../../version.md).

```typescript
createNormalizedData(options: NormalizedDataOptions): ChartProgram;
```

Named option contracts: [`NormalizedDataOptions`](./../types.md#type-normalizeddataoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `id` | Required | `string` |
| `source` | Optional / branch-dependent | `string \| undefined` |
| `field` | Required | `string` |
| `as` | Required | `string` |
| `groupBy` | Optional / branch-dependent | `string \| readonly string[] \| undefined` |
| `method` | Required | `"change" \| "index" \| "minmax" \| "percentChange" \| "share" \| "zscore"` |
| `zeroDenominator` | Optional / branch-dependent | `NormalizeZeroDenominator \| undefined` |
| `variance` | Optional / branch-dependent | `"population" \| "sample" \| undefined` |
| `baseline` | Optional / branch-dependent | `{ position: "first" \| "last"; } \| undefined` |
| `sortBy` | Optional / branch-dependent | `readonly [WindowSort, ...WindowSort[]]` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
createNormalizedData({ id, source?, field, as, groupBy?, method, variance?, zeroDenominator?, baseline?, sortBy? })
```

Materialize row-preserving share, z-score, min-max, index, change, or fractional
percent-change values independently within each group.
[Source and Derived Data](../../api/data/source-and-derived.md#createnormalizeddata-id-source-field-as-groupby-method)


## `createSortedData`

**API layer:** user-facing. **Authoring roles:** H1.

**Availability:** Available by v0.0.17. See [release compatibility](../../version.md).

```typescript
createSortedData(options: SortedDataOptions): ChartProgram;
```

Named option contracts: [`SortedDataOptions`](./../types.md#type-sorteddataoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `id` | Required | `string` |
| `source` | Optional / branch-dependent | `string \| undefined` |
| `sortBy` | Required | `readonly [SortKey, ...SortKey[]]` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
createSortedData({ id, source?, sortBy })
```

Create immutable rows in stable multi-key order. Each key controls direction,
null placement, and quantitative, categorical, or temporal comparison.
[Source and derived data](../../api/data/source-and-derived.md#create-sorted-data)


## `createCompleteData`

**API layer:** user-facing. **Authoring roles:** H1.

**Availability:** Available by v0.0.17. See [release compatibility](../../version.md).

```typescript
createCompleteData(options: CompleteDataOptions): ChartProgram;
```

Named option contracts: [`CompleteDataOptions`](./../types.md#type-completedataoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `id` | Required | `string` |
| `source` | Optional / branch-dependent | `string \| undefined` |
| `key` | Required | `string` |
| `groupBy` | Optional / branch-dependent | `string \| readonly string[] \| undefined` |
| `fill` | Optional / branch-dependent | `Readonly<Record<string, DatasetScalar>> \| undefined` |
| `members` | Optional / branch-dependent | `string \| undefined` |
| `values` | Optional / branch-dependent | `readonly [DatasetScalar, ...DatasetScalar[]] \| undefined` |
| `sequence` | Optional / branch-dependent | `{ start: number; end: number; step: number; } \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
createCompleteData({ id, source?, key, groupBy?, values?, sequence?, fill?, members? })
```

Complete one typed key domain independently inside every observed group, with
explicit fill and source-membership provenance for synthesized rows.
[Source and Derived Data](../../api/data/source-and-derived.md#createcompletedata-id-source-key-groupby-values-sequence-fill-members)


## `createImputedData`

**API layer:** user-facing. **Authoring roles:** H1.

**Availability:** Available by v0.0.17. See [release compatibility](../../version.md).

```typescript
createImputedData(options: ImputedDataOptions): ChartProgram;
```

Named option contracts: [`ImputedDataOptions`](./../types.md#type-imputeddataoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `id` | Required | `string` |
| `source` | Optional / branch-dependent | `string \| undefined` |
| `fields` | Required | `string \| readonly [string, ...string[]]` |
| `groupBy` | Optional / branch-dependent | `string \| readonly string[] \| undefined` |
| `edges` | Optional / branch-dependent | `"error" \| "keep" \| undefined` |
| `maxGap` | Optional / branch-dependent | `number \| undefined` |
| `method` | Required | `"backward" \| "constant" \| "forward" \| "linear"` |
| `value` | Optional / branch-dependent | `DatasetScalar \| undefined` |
| `sortBy` | Optional / branch-dependent | `readonly WindowSort[] \| readonly [{ field: string; order?: "ascending" \| undefined; }] \| readonly [WindowSort, ...WindowSort[]] \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
createImputedData({ id, source?, fields, groupBy?, sortBy?, method, value?, edges?, maxGap? })
```

Replace nullish cells by constant, forward, backward, or distance-based linear
imputation while preserving group boundaries and final source order.
[Source and Derived Data](../../api/data/source-and-derived.md#createimputeddata-id-source-fields-groupby-sortby-method-value-edges-maxgap)


## `createStackData`

**API layer:** user-facing. **Authoring roles:** H1.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
createStackData(options: StackDataOptions): ChartProgram;
```

Named option contracts: [`StackDataOptions`](./../types.md#type-stackdataoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `id` | Required | `string` |
| `source` | Optional / branch-dependent | `string \| undefined` |
| `category` | Required | `string` |
| `group` | Required | `string` |
| `value` | Required | `string` |
| `mode` | Optional / branch-dependent | `StackDataMode \| undefined` |
| `as` | Optional / branch-dependent | `StackDataOutputFields \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
createStackData({ id, source?, category, group, value, mode?, as? })
```

Materialize reusable start/end/value/share rows with the same stack math used
by Bar and Area layouts. [Source and Derived Data](../../api/data/source-and-derived.md#createstackdata-id-source-category-group-value-mode-as)


## `editComputedData`

**API layer:** user-facing. **Authoring roles:** H1, H3.

**Availability:** Available by v0.0.17. See [release compatibility](../../version.md).

```typescript
editComputedData(options: EditComputedDataOptions): ChartProgram;
```

Named option contracts: [`EditComputedDataOptions`](./../types.md#type-editcomputeddataoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `target` | Required | `string` |
| `dependents` | Optional / branch-dependent | `DerivedDataDependents \| undefined` |
| `as` | Optional / branch-dependent | `string \| undefined` |
| `expression` | Optional / branch-dependent | `ComputedExpression \| undefined` |

</details>

Behavior, inference, resets, and errors: [Focused statistical data editing](./statistics.md#focused-statistical-data-editing).



## `editFoldData`

**API layer:** user-facing. **Authoring roles:** H1, H3.

**Availability:** Available by v0.0.17. See [release compatibility](../../version.md).

```typescript
editFoldData(options: EditFoldDataOptions): ChartProgram;
```

Named option contracts: [`EditFoldDataOptions`](./../types.md#type-editfolddataoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `target` | Required | `string` |
| `dependents` | Optional / branch-dependent | `DerivedDataDependents \| undefined` |
| `fields` | Optional / branch-dependent | `readonly string[] \| undefined` |
| `as` | Optional / branch-dependent | `FoldDataOutputFields \| undefined` |

</details>

Behavior, inference, resets, and errors: [Focused statistical data editing](./statistics.md#focused-statistical-data-editing).



## `editSummaryData`

**API layer:** user-facing. **Authoring roles:** H1, H3.

**Availability:** Available by v0.0.17. See [release compatibility](../../version.md).

```typescript
editSummaryData(options: EditSummaryDataOptions): ChartProgram;
```

Named option contracts: [`EditSummaryDataOptions`](./../types.md#type-editsummarydataoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `target` | Required | `string` |
| `dependents` | Optional / branch-dependent | `DerivedDataDependents \| undefined` |
| `groupBy` | Optional / branch-dependent | `string \| readonly string[] \| undefined` |
| `aggregates` | Optional / branch-dependent | `readonly SummaryAggregateOptions[] \| undefined` |
| `members` | Optional / branch-dependent | `string \| undefined` |
| `missing` | Optional / branch-dependent | `"drop" \| "error" \| undefined` |
| `empty` | Optional / branch-dependent | `"identity" \| "null" \| undefined` |
| `weight` | Optional / branch-dependent | `false \| StatisticalWeight \| undefined` |

</details>

Behavior, inference, resets, and errors: [Focused statistical data editing](./statistics.md#focused-statistical-data-editing).



## `editBinData`

**API layer:** user-facing. **Authoring roles:** H1, H3.

**Availability:** Available by v0.0.17. See [release compatibility](../../version.md).

```typescript
editBinData(options: EditBinDataOptions): ChartProgram;
```

Named option contracts: [`EditBinDataOptions`](./../types.md#type-editbindataoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `target` | Required | `string` |
| `dependents` | Optional / branch-dependent | `DerivedDataDependents \| undefined` |
| `maxBins` | Optional / branch-dependent | `number \| undefined` |
| `step` | Optional / branch-dependent | `number \| undefined` |
| `boundaries` | Optional / branch-dependent | `readonly [number, number, ...number[]] \| undefined` |
| `field` | Optional / branch-dependent | `string \| undefined` |
| `extent` | Optional / branch-dependent | `"auto" \| readonly [number, number] \| undefined` |
| `nice` | Optional / branch-dependent | `boolean \| undefined` |
| `zero` | Optional / branch-dependent | `boolean \| undefined` |
| `includeEmpty` | Optional / branch-dependent | `boolean \| undefined` |
| `members` | Optional / branch-dependent | `boolean \| undefined` |
| `missing` | Optional / branch-dependent | `"drop" \| "error" \| undefined` |
| `as` | Optional / branch-dependent | `BinDataOutputFields \| undefined` |
| `weight` | Optional / branch-dependent | `false \| StatisticalWeight \| undefined` |

</details>

Behavior, inference, resets, and errors: [Focused statistical data editing](./statistics.md#focused-statistical-data-editing).



## `editStackData`

**API layer:** user-facing. **Authoring roles:** H1, H3.

**Availability:** Available by v0.0.17. See [release compatibility](../../version.md).

```typescript
editStackData(options: EditStackDataOptions): ChartProgram;
```

Named option contracts: [`EditStackDataOptions`](./../types.md#type-editstackdataoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `target` | Required | `string` |
| `dependents` | Optional / branch-dependent | `DerivedDataDependents \| undefined` |
| `category` | Optional / branch-dependent | `string \| undefined` |
| `group` | Optional / branch-dependent | `string \| undefined` |
| `value` | Optional / branch-dependent | `string \| undefined` |
| `mode` | Optional / branch-dependent | `StackDataMode \| undefined` |
| `as` | Optional / branch-dependent | `StackDataOutputFields \| undefined` |

</details>

Behavior, inference, resets, and errors: [Focused statistical data editing](./statistics.md#focused-statistical-data-editing).



## `editIntervalData`

**API layer:** user-facing. **Authoring roles:** H1, H3.

**Availability:** Available by v0.0.17. See [release compatibility](../../version.md).

```typescript
editIntervalData(options: EditIntervalDataOptions): ChartProgram;
```

Named option contracts: [`EditIntervalDataOptions`](./../types.md#type-editintervaldataoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `target` | Required | `string` |
| `dependents` | Optional / branch-dependent | `DerivedDataDependents \| undefined` |
| `field` | Optional / branch-dependent | `string \| undefined` |
| `groupBy` | Optional / branch-dependent | `string \| readonly string[] \| undefined` |
| `center` | Optional / branch-dependent | `IntervalCenter \| undefined` |
| `extent` | Optional / branch-dependent | `IntervalExtent \| undefined` |
| `method` | Optional / branch-dependent | `ConfidenceIntervalMethod \| undefined` |
| `level` | Optional / branch-dependent | `number \| undefined` |
| `missing` | Optional / branch-dependent | `"drop" \| "error" \| undefined` |
| `as` | Optional / branch-dependent | `IntervalOutputFields \| undefined` |

</details>

Behavior, inference, resets, and errors: [Focused statistical data editing](./statistics.md#focused-statistical-data-editing).



## `editECDFData`

**API layer:** user-facing. **Authoring roles:** H1, H3.

**Availability:** Available by v0.0.17. See [release compatibility](../../version.md).

```typescript
editECDFData(options: EditECDFDataOptions): ChartProgram;
```

Named option contracts: [`EditECDFDataOptions`](./../types.md#type-editecdfdataoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `target` | Required | `string` |
| `dependents` | Optional / branch-dependent | `DerivedDataDependents \| undefined` |
| `field` | Optional / branch-dependent | `string \| undefined` |
| `groupBy` | Optional / branch-dependent | `string \| readonly [string, ...string[]] \| undefined` |
| `missing` | Optional / branch-dependent | `"drop" \| "error" \| undefined` |
| `as` | Optional / branch-dependent | `ECDFOutputFields \| undefined` |
| `weight` | Optional / branch-dependent | `string \| false \| undefined` |

</details>

Behavior, inference, resets, and errors: [Focused statistical data editing](./statistics.md#focused-statistical-data-editing).



## `editNormalizedData`

**API layer:** user-facing. **Authoring roles:** H1, H3.

**Availability:** Available by v0.0.17. See [release compatibility](../../version.md).

```typescript
editNormalizedData(options: EditNormalizedDataOptions): ChartProgram;
```

Named option contracts: [`EditNormalizedDataOptions`](./../types.md#type-editnormalizeddataoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `target` | Required | `string` |
| `dependents` | Optional / branch-dependent | `DerivedDataDependents \| undefined` |
| `field` | Optional / branch-dependent | `string \| undefined` |
| `as` | Optional / branch-dependent | `string \| undefined` |
| `groupBy` | Optional / branch-dependent | `string \| readonly string[] \| undefined` |
| `method` | Optional / branch-dependent | `"change" \| "index" \| "minmax" \| "percentChange" \| "share" \| "zscore" \| undefined` |
| `zeroDenominator` | Optional / branch-dependent | `NormalizeZeroDenominator \| undefined` |
| `variance` | Optional / branch-dependent | `"population" \| "sample" \| undefined` |
| `baseline` | Optional / branch-dependent | `{ position: "first" \| "last"; } \| undefined` |
| `sortBy` | Optional / branch-dependent | `readonly [WindowSort, ...WindowSort[]] \| undefined` |

</details>

Behavior, inference, resets, and errors: [Focused statistical data editing](./statistics.md#focused-statistical-data-editing).



## `editSortedData`

**API layer:** user-facing. **Authoring roles:** H1, H3.

**Availability:** Available by v0.0.17. See [release compatibility](../../version.md).

```typescript
editSortedData(options: EditSortedDataOptions): ChartProgram;
```

Named option contracts: [`EditSortedDataOptions`](./../types.md#type-editsorteddataoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `target` | Required | `string` |
| `sortBy` | Required | `readonly [SortKey, ...SortKey[]]` |
| `dependents` | Optional / branch-dependent | `DerivedDataDependents \| undefined` |

</details>

Behavior, inference, resets, and errors: [Focused core data editing](./charts-data.md#focused-core-data-editing).



## `editCompleteData`

**API layer:** user-facing. **Authoring roles:** H1, H3.

**Availability:** Available by v0.0.17. See [release compatibility](../../version.md).

```typescript
editCompleteData(options: EditCompleteDataOptions): ChartProgram;
```

Named option contracts: [`EditCompleteDataOptions`](./../types.md#type-editcompletedataoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `target` | Required | `string` |
| `dependents` | Optional / branch-dependent | `DerivedDataDependents \| undefined` |
| `key` | Optional / branch-dependent | `string \| undefined` |
| `groupBy` | Optional / branch-dependent | `string \| readonly string[] \| undefined` |
| `fill` | Optional / branch-dependent | `Readonly<Record<string, DatasetScalar>> \| undefined` |
| `members` | Optional / branch-dependent | `string \| undefined` |
| `values` | Optional / branch-dependent | `readonly [DatasetScalar, ...DatasetScalar[]] \| undefined` |
| `sequence` | Optional / branch-dependent | `{ start: number; end: number; step: number; } \| undefined` |

</details>

Behavior, inference, resets, and errors: [Focused statistical data editing](./statistics.md#focused-statistical-data-editing).



## `editImputedData`

**API layer:** user-facing. **Authoring roles:** H1, H3.

**Availability:** Available by v0.0.17. See [release compatibility](../../version.md).

```typescript
editImputedData(options: EditImputedDataOptions): ChartProgram;
```

Named option contracts: [`EditImputedDataOptions`](./../types.md#type-editimputeddataoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `target` | Required | `string` |
| `dependents` | Optional / branch-dependent | `DerivedDataDependents \| undefined` |
| `fields` | Optional / branch-dependent | `string \| readonly [string, ...string[]] \| undefined` |
| `groupBy` | Optional / branch-dependent | `string \| readonly string[] \| undefined` |
| `edges` | Optional / branch-dependent | `"error" \| "keep" \| undefined` |
| `maxGap` | Optional / branch-dependent | `number \| undefined` |
| `method` | Optional / branch-dependent | `"backward" \| "constant" \| "forward" \| "linear" \| undefined` |
| `value` | Optional / branch-dependent | `DatasetScalar \| undefined` |
| `sortBy` | Optional / branch-dependent | `readonly WindowSort[] \| readonly [{ field: string; order?: "ascending" \| undefined; }] \| readonly [WindowSort, ...WindowSort[]] \| undefined` |

</details>

Behavior, inference, resets, and errors: [Focused statistical data editing](./statistics.md#focused-statistical-data-editing).



## `createIntervalData`

**API layer:** user-facing. **Authoring roles:** H1.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
createIntervalData(options: IntervalDataOptions): ChartProgram;
```

Named option contracts: [`IntervalDataOptions`](./../types.md#type-intervaldataoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `id` | Required | `string` |
| `source` | Optional / branch-dependent | `string \| undefined` |
| `field` | Required | `string` |
| `groupBy` | Optional / branch-dependent | `string \| readonly string[] \| undefined` |
| `center` | Optional / branch-dependent | `IntervalCenter \| undefined` |
| `extent` | Optional / branch-dependent | `IntervalExtent \| undefined` |
| `method` | Optional / branch-dependent | `ConfidenceIntervalMethod \| undefined` |
| `level` | Optional / branch-dependent | `number \| undefined` |
| `missing` | Optional / branch-dependent | `"drop" \| "error" \| undefined` |
| `as` | Optional / branch-dependent | `IntervalOutputFields \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
createIntervalData({
  id, source?, field, groupBy?, center?, extent?, method?, level?, missing?, as?
})
```

Create immutable grouped center/lower/upper summary rows. Mean supports
standard error, sample standard deviation, and normal or Student-t confidence intervals;
median supports interquartile range. [Data](../../api/data.md)


## `createECDFData`

**API layer:** user-facing. **Authoring roles:** H1.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
createECDFData(options: ECDFDataOptions): ChartProgram;
```

Named option contracts: [`ECDFDataOptions`](./../types.md#type-ecdfdataoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `id` | Required | `string` |
| `source` | Optional / branch-dependent | `string \| undefined` |
| `field` | Required | `string` |
| `groupBy` | Optional / branch-dependent | `string \| readonly [string, ...string[]] \| undefined` |
| `weight` | Optional / branch-dependent | `string \| undefined` |
| `missing` | Optional / branch-dependent | `"drop" \| "error" \| undefined` |
| `as` | Optional / branch-dependent | `ECDFOutputFields \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
createECDFData({ id, source?, field, groupBy?, weight?, missing?, as? })
```

Create immutable sorted support, cumulative count or weight, and probability
rows. Ties are aggregated, group order follows first source appearance, and
resolved provenance stores every positive denominator. [Data](../../api/data.md)


## `createRegression`

**API layer:** user-facing. **Authoring roles:** H1.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
createRegression(options?: RegressionOptions): ChartProgram;
```

Named option contracts: [`RegressionOptions`](./../types.md#type-regressionoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `target` | Optional / branch-dependent | `string \| undefined` |
| `x` | Optional / branch-dependent | `string \| undefined` |
| `y` | Optional / branch-dependent | `string \| undefined` |
| `groupBy` | Optional / branch-dependent | `string \| false \| undefined` |
| `line` | Optional / branch-dependent | `(StrokeStyleDetails & { strokeWidth?: number \| undefined; curve?: CurveInterpolation \| undefined; }) \| undefined` |
| `sourceBinding` | Optional / branch-dependent | `"fixed" \| "follow" \| undefined` |
| `missing` | Optional / branch-dependent | `"drop" \| "error" \| undefined` |
| `method` | Optional / branch-dependent | `"linear" \| "loess" \| "polynomial" \| undefined` |
| `degree` | Optional / branch-dependent | `number \| undefined` |
| `span` | Optional / branch-dependent | `number \| undefined` |
| `confidenceMethod` | Optional / branch-dependent | `ConfidenceIntervalMethod \| undefined` |
| `level` | Optional / branch-dependent | `number \| undefined` |
| `confidence` | Optional / branch-dependent | `number \| undefined` |
| `interval` | Optional / branch-dependent | `false \| RegressionInterval \| undefined` |
| `predict` | Optional / branch-dependent | `RegressionPredictOptions \| undefined` |
| `band` | Optional / branch-dependent | `false \| RegressionBandOptions \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
createRegression({
  target?, x?, y?, groupBy?, method?, degree?, span?,
  confidenceMethod?, level?, confidence?, interval?, band?, line?
})
```

Infer an eligible point layer and create immutable fitted data, optional grouped
interval-band paths, and grouped line paths. Method defaults to `"linear"`;
polynomial degree to `2`; LOESS span to `0.75`.
[Regression](../../api/regression.md)


## `editRegression`

**API layer:** user-facing. **Authoring roles:** H1, H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
editRegression(options: EditRegressionOptions): ChartProgram;
```

Named option contracts: [`EditRegressionOptions`](./../types.md#type-editregressionoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `target` | Optional / branch-dependent | `string \| undefined` |
| `data` | Optional / branch-dependent | `string \| undefined` |
| `x` | Optional / branch-dependent | `string \| undefined` |
| `y` | Optional / branch-dependent | `string \| undefined` |
| `groupBy` | Optional / branch-dependent | `string \| false \| undefined` |
| `method` | Optional / branch-dependent | `RegressionMethod \| undefined` |
| `degree` | Optional / branch-dependent | `number \| undefined` |
| `span` | Optional / branch-dependent | `number \| undefined` |
| `confidenceMethod` | Optional / branch-dependent | `ConfidenceIntervalMethod \| undefined` |
| `level` | Optional / branch-dependent | `number \| undefined` |
| `confidence` | Optional / branch-dependent | `number \| undefined` |
| `interval` | Optional / branch-dependent | `false \| RegressionInterval \| undefined` |
| `missing` | Optional / branch-dependent | `"drop" \| "error" \| undefined` |
| `predict` | Optional / branch-dependent | `false \| RegressionPredictOptions \| undefined` |
| `band` | Optional / branch-dependent | `false \| RegressionBandOptions \| undefined` |
| `line` | Optional / branch-dependent | `(StrokeStyleDetails & { strokeWidth?: number \| undefined; curve?: CurveInterpolation \| undefined; }) \| undefined` |
| `sourceBinding` | Optional / branch-dependent | `"fixed" \| "follow" \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
editRegression({
  target?, data?, x?, y?, groupBy?, method?, degree?, span?,
  confidenceMethod?, level?, confidence?, interval?, band?, line?
})
```

Revise the model through its stable point owner. Data-role or statistical
changes create and rebind one immutable derived-data revision; `groupBy: false`
removes grouping. Component-only changes retain the current fitted rows.
[Regression](../../api/regression.md#editing-a-regression)


## `createErrorBar`

**API layer:** user-facing. **Authoring roles:** H1.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
createErrorBar(options?: ErrorBarOptions): ChartProgram;
```

Named option contracts: [`ErrorBarOptions`](./../types.md#type-errorbaroptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `id` | Optional / branch-dependent | `string \| undefined` |
| `target` | Optional / branch-dependent | `string \| undefined` |
| `data` | Optional / branch-dependent | `string \| undefined` |
| `x` | Optional / branch-dependent | `ErrorBarIntervalChannel \| ErrorBarPositionChannel \| undefined` |
| `y` | Optional / branch-dependent | `ErrorBarIntervalChannel \| ErrorBarPositionChannel \| undefined` |
| `xOffset` | Optional / branch-dependent | `ErrorBarOffsetChannel \| undefined` |
| `yOffset` | Optional / branch-dependent | `ErrorBarOffsetChannel \| undefined` |
| `groupBy` | Optional / branch-dependent | `string \| false \| undefined` |
| `coordinate` | Optional / branch-dependent | `string \| undefined` |
| `caps` | Optional / branch-dependent | `boolean \| undefined` |
| `capSize` | Optional / branch-dependent | `number \| undefined` |
| `stroke` | Optional / branch-dependent | `string \| undefined` |
| `strokeWidth` | Optional / branch-dependent | `number \| undefined` |
| `strokeDash` | Optional / branch-dependent | `DashPattern \| DashStyle \| undefined` |
| `opacity` | Optional / branch-dependent | `number \| undefined` |
| `lineCap` | Optional / branch-dependent | `"butt" \| "round" \| "square" \| undefined` |
| `lineJoin` | Optional / branch-dependent | `"bevel" \| "miter" \| "round" \| undefined` |
| `miterLimit` | Optional / branch-dependent | `number \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
createErrorBar({
  id?, target?, data?, x?, y?, xOffset?, yOffset?, groupBy?, coordinate?,
  caps?, capSize?, stroke?, strokeWidth?, strokeDash?, opacity?
} = {})
```

Create vertical or horizontal statistical or explicit intervals. With one
eligible encoded layer, the shortest call infers its fields, orientation, data,
coordinate, and scales. Explicit interval fields also allow the independent
position to be quantitative. A categorical source can also infer a matching
xOffset/yOffset; its field joins statistical grouping and aligns source points,
the main rule, and both caps on one shared sub-slot scale.
[Error bars](../../api/error-bars.md)


## `editErrorBar`

**API layer:** user-facing. **Authoring roles:** H1, H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
editErrorBar(options: EditErrorBarOptions): ChartProgram;
```

Named option contracts: [`EditErrorBarOptions`](./../types.md#type-editerrorbaroptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `target` | Optional / branch-dependent | `string \| undefined` |
| `data` | Optional / branch-dependent | `string \| undefined` |
| `x` | Optional / branch-dependent | `ErrorBarIntervalChannel \| ErrorBarPositionChannel \| undefined` |
| `y` | Optional / branch-dependent | `ErrorBarIntervalChannel \| ErrorBarPositionChannel \| undefined` |
| `xOffset` | Optional / branch-dependent | `false \| ErrorBarOffsetChannel \| undefined` |
| `yOffset` | Optional / branch-dependent | `false \| ErrorBarOffsetChannel \| undefined` |
| `groupBy` | Optional / branch-dependent | `string \| false \| undefined` |
| `caps` | Optional / branch-dependent | `boolean \| undefined` |
| `capSize` | Optional / branch-dependent | `number \| undefined` |
| `stroke` | Optional / branch-dependent | `string \| undefined` |
| `strokeWidth` | Optional / branch-dependent | `number \| undefined` |
| `strokeDash` | Optional / branch-dependent | `DashPattern \| DashStyle \| undefined` |
| `opacity` | Optional / branch-dependent | `number \| undefined` |
| `statistics` | Optional / branch-dependent | `{ center?: IntervalCenter \| undefined; extent?: IntervalExtent \| undefined; method?: ConfidenceIntervalMethod \| undefined; level?: number \| undefined; } \| undefined` |
| `lineCap` | Optional / branch-dependent | `"butt" \| "round" \| "square" \| undefined` |
| `lineJoin` | Optional / branch-dependent | `"bevel" \| "miter" \| "round" \| undefined` |
| `miterLimit` | Optional / branch-dependent | `number \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
editErrorBar({
  target?, data?, x?, y?, xOffset?, yOffset?, groupBy?, caps?, capSize?,
  stroke?, strokeWidth?, strokeDash?, opacity?, statistics?
})
```

Revise one error bar's source, position/interval roles, optional categorical
offset, statistics, and owned caps. Role changes can switch orientation or
convert statistical and explicit intervals while preserving owner/cap IDs.
`caps: false` removes both caps and `caps: true` restores them.
[Error bars](../../api/error-bars.md#editing-error-bars)


## `createErrorBand`

**API layer:** user-facing. **Authoring roles:** H1.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
createErrorBand(options?: ErrorBandOptions): ChartProgram;
```

Named option contracts: [`ErrorBandOptions`](./../types.md#type-errorbandoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `id` | Optional / branch-dependent | `string \| undefined` |
| `target` | Optional / branch-dependent | `string \| undefined` |
| `data` | Optional / branch-dependent | `string \| undefined` |
| `x` | Optional / branch-dependent | `ErrorBandIntervalChannel \| ErrorBandPositionChannel \| undefined` |
| `y` | Optional / branch-dependent | `ErrorBandIntervalChannel \| ErrorBandPositionChannel \| undefined` |
| `groupBy` | Optional / branch-dependent | `string \| undefined` |
| `coordinate` | Optional / branch-dependent | `string \| undefined` |
| `fill` | Optional / branch-dependent | `string \| undefined` |
| `opacity` | Optional / branch-dependent | `number \| undefined` |
| `curve` | Optional / branch-dependent | `CurveInterpolation \| undefined` |
| `boundaries` | Optional / branch-dependent | `false \| (StrokeStyleDetails & { stroke?: string \| undefined; strokeWidth?: number \| undefined; strokeDash?: DashPattern \| DashStyle \| undefined; opacity?: number \| undefined; curve?: CurveInterpolation \| undefined; }) \| undefined` |
| `lineCap` | Optional / branch-dependent | `"butt" \| "round" \| "square" \| undefined` |
| `lineJoin` | Optional / branch-dependent | `"bevel" \| "miter" \| "round" \| undefined` |
| `miterLimit` | Optional / branch-dependent | `number \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
createErrorBand({
  id?, target?, data?, x?, y?, groupBy?, coordinate?, fill?, opacity?,
  curve?, boundaries?
} = {})
```

Create a vertical or horizontal statistical or explicit interval ribbon. The
action can infer one encoded source layer and reuses `createIntervalData`, an
ordinary area, the matching atomic range action, and grouping actions.
`boundaries: { stroke?, strokeWidth?, strokeDash?, opacity?, curve? }` adds
lower and upper line layers. Boundary curve inherits the area curve unless it
is overridden.
[Error bands](../../api/error-bands.md)


## `editErrorBand`

**API layer:** user-facing. **Authoring roles:** H1, H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
editErrorBand(options: EditErrorBandOptions): ChartProgram;
```

Named option contracts: [`EditErrorBandOptions`](./../types.md#type-editerrorbandoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `target` | Optional / branch-dependent | `string \| undefined` |
| `data` | Optional / branch-dependent | `string \| undefined` |
| `x` | Optional / branch-dependent | `ErrorBandIntervalChannel \| ErrorBandPositionChannel \| undefined` |
| `y` | Optional / branch-dependent | `ErrorBandIntervalChannel \| ErrorBandPositionChannel \| undefined` |
| `groupBy` | Optional / branch-dependent | `string \| false \| undefined` |
| `fill` | Optional / branch-dependent | `string \| false \| undefined` |
| `opacity` | Optional / branch-dependent | `number \| undefined` |
| `curve` | Optional / branch-dependent | `CurveInterpolation \| undefined` |
| `statistics` | Optional / branch-dependent | `{ center?: IntervalCenter \| undefined; extent?: IntervalExtent \| undefined; method?: ConfidenceIntervalMethod \| undefined; level?: number \| undefined; } \| undefined` |
| `boundaries` | Optional / branch-dependent | `false \| (StrokeStyleDetails & { stroke?: string \| undefined; strokeWidth?: number \| undefined; strokeDash?: DashPattern \| DashStyle \| undefined; opacity?: number \| undefined; curve?: CurveInterpolation \| undefined; }) \| undefined` |
| `lineCap` | Optional / branch-dependent | `"butt" \| "round" \| "square" \| undefined` |
| `lineJoin` | Optional / branch-dependent | `"bevel" \| "miter" \| "round" \| undefined` |
| `miterLimit` | Optional / branch-dependent | `number \| undefined` |

</details>

Behavior, inference, resets, and errors: [editErrorBand and editErrorBandBoundary](./statistics.md#editerrorband-and-editerrorbandboundary).



## `editErrorBandBoundary`

**API layer:** user-facing. **Authoring roles:** H1, H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
editErrorBandBoundary(options: EditErrorBandBoundaryOptions): ChartProgram;
```

Named option contracts: [`EditErrorBandBoundaryOptions`](./../types.md#type-editerrorbandboundaryoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `target` | Optional / branch-dependent | `string \| undefined` |
| `boundary` | Optional / branch-dependent | `"both" \| "lower" \| "upper" \| undefined` |
| `stroke` | Optional / branch-dependent | `string \| undefined` |
| `strokeWidth` | Optional / branch-dependent | `number \| undefined` |
| `strokeDash` | Optional / branch-dependent | `DashPattern \| DashStyle \| undefined` |
| `opacity` | Optional / branch-dependent | `number \| undefined` |
| `curve` | Optional / branch-dependent | `CurveInterpolation \| undefined` |
| `lineCap` | Optional / branch-dependent | `"butt" \| "round" \| "square" \| undefined` |
| `lineJoin` | Optional / branch-dependent | `"bevel" \| "miter" \| "round" \| undefined` |
| `miterLimit` | Optional / branch-dependent | `number \| undefined` |

</details>

Behavior, inference, resets, and errors: [editErrorBand and editErrorBandBoundary](./statistics.md#editerrorband-and-editerrorbandboundary).



## `createBoxPlot`

**API layer:** user-facing. **Authoring roles:** H0, H1.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
createBoxPlot(options?: BoxPlotOptions): ChartProgram;
```

Named option contracts: [`BoxPlotOptions`](./../types.md#type-boxplotoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `id` | Optional / branch-dependent | `string \| undefined` |
| `target` | Optional / branch-dependent | `string \| undefined` |
| `data` | Optional / branch-dependent | `string \| undefined` |
| `x` | Optional / branch-dependent | `BoxPlotPositionChannel \| undefined` |
| `y` | Optional / branch-dependent | `BoxPlotPositionChannel \| undefined` |
| `coordinate` | Optional / branch-dependent | `string \| undefined` |
| `whisker` | Optional / branch-dependent | `BoxPlotWhisker \| undefined` |
| `width` | Optional / branch-dependent | `{ band?: number \| undefined; } \| undefined` |
| `outliers` | Optional / branch-dependent | `boolean \| undefined` |
| `box` | Optional / branch-dependent | `(StrokeStyleDetails & { cornerRadius?: number \| undefined; } & { fill?: string \| undefined; opacity?: number \| undefined; stroke?: string \| undefined; strokeWidth?: number \| undefined; }) \| undefined` |
| `median` | Optional / branch-dependent | `(StrokeStyleDetails & { stroke?: string \| undefined; strokeWidth?: number \| undefined; }) \| undefined` |
| `outlier` | Optional / branch-dependent | `(StrokeStyleDetails & { shape?: PointShape \| undefined; radius?: number \| undefined; opacity?: number \| undefined; }) \| undefined` |
| `guides` | Optional / branch-dependent | `false \| BoxPlotGuideOptions \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
createBoxPlot({
  id?, target?, data?, x?, y?, coordinate?, whisker?, width?, outliers?,
  box?, median?, outlier?, guides?
} = {})
```

Create a Box plot owner that defers geometry and guides until compatible x/y
roles are available. The action infers an encoded source when possible
and composes immutable box summary data, error-bar whiskers, ranged-bar bodies,
median rules, and optional point outliers. Tukey factor, band width, component
appearance, and outlier creation are configurable. [Box plots](../../api/box-plots.md)
Guides remain opt-in for compatibility: pass `guides: {}` or nested options to
ensure compatible guides inside the facade; omission and `false` create none.


## `editBoxPlot`

**API layer:** user-facing. **Authoring roles:** H1, H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
editBoxPlot(options: EditBoxPlotOptions): ChartProgram;
```

Named option contracts: [`EditBoxPlotOptions`](./../types.md#type-editboxplotoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `target` | Optional / branch-dependent | `string \| undefined` |
| `data` | Optional / branch-dependent | `string \| undefined` |
| `x` | Optional / branch-dependent | `BoxPlotPositionChannel \| undefined` |
| `y` | Optional / branch-dependent | `BoxPlotPositionChannel \| undefined` |
| `whisker` | Optional / branch-dependent | `BoxPlotWhisker \| undefined` |
| `width` | Optional / branch-dependent | `{ band?: number \| undefined; } \| undefined` |
| `outliers` | Optional / branch-dependent | `boolean \| undefined` |
| `box` | Optional / branch-dependent | `(StrokeStyleDetails & { cornerRadius?: number \| undefined; } & { fill?: string \| undefined; opacity?: number \| undefined; stroke?: string \| undefined; strokeWidth?: number \| undefined; }) \| undefined` |
| `median` | Optional / branch-dependent | `(StrokeStyleDetails & { stroke?: string \| undefined; strokeWidth?: number \| undefined; }) \| undefined` |
| `outlier` | Optional / branch-dependent | `(StrokeStyleDetails & { shape?: PointShape \| undefined; radius?: number \| undefined; opacity?: number \| undefined; }) \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
editBoxPlot({ target?, whisker?, width?, outliers?, box?, median?, outlier? })
```

Revise box statistics, optional outlier topology, width, and component
appearance through the stable box owner without addressing generated child
IDs. [Box plots](../../api/box-plots.md#editing-a-box-plot)


## `createGradientPlot`

**API layer:** user-facing. **Authoring roles:** H0, H1.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
createGradientPlot(options?: GradientPlotOptions): ChartProgram;
```

Named option contracts: [`GradientPlotOptions`](./../types.md#type-gradientplotoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `id` | Optional / branch-dependent | `string \| undefined` |
| `target` | Optional / branch-dependent | `string \| undefined` |
| `data` | Optional / branch-dependent | `string \| undefined` |
| `x` | Optional / branch-dependent | `BoxPlotPositionChannel \| undefined` |
| `y` | Optional / branch-dependent | `BoxPlotPositionChannel \| undefined` |
| `coordinate` | Optional / branch-dependent | `string \| undefined` |
| `density` | Optional / branch-dependent | `GradientPlotDensityOptions \| undefined` |
| `width` | Optional / branch-dependent | `{ band?: number \| undefined; } \| undefined` |
| `gradient` | Optional / branch-dependent | `GradientPlotAppearanceOptions \| undefined` |
| `center` | Optional / branch-dependent | `false \| GradientPlotCenterOptions \| undefined` |
| `guides` | Optional / branch-dependent | `false \| GradientPlotGuideOptions \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
createGradientPlot({
  id?, target?, data?, x?, y?, coordinate?, density?, width?, gradient?,
  center?, guides?
} = {})
```

Create a Gradient plot owner that defers geometry and guides until compatible
x/y roles are available. Positions can be explicit, inferred from one eligible
encoded layer, or completed later. Defaults are Gaussian auto density, 64
samples, width band `0.7`, no outline, a median center rule, and applicable
guides. A categorical `encodeColor` owns strip hue while density continues to
control lightness and opacity.
[Statistical actions](../../reference/actions/statistics.md#creategradientplot)


## `editGradientPlot`

**API layer:** user-facing. **Authoring roles:** H1, H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
editGradientPlot(options: EditGradientPlotOptions): ChartProgram;
```

Named option contracts: [`EditGradientPlotOptions`](./../types.md#type-editgradientplotoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `target` | Optional / branch-dependent | `string \| undefined` |
| `data` | Optional / branch-dependent | `string \| undefined` |
| `x` | Optional / branch-dependent | `BoxPlotPositionChannel \| undefined` |
| `y` | Optional / branch-dependent | `BoxPlotPositionChannel \| undefined` |
| `density` | Optional / branch-dependent | `GradientPlotDensityOptions \| undefined` |
| `width` | Optional / branch-dependent | `{ band?: number \| undefined; } \| undefined` |
| `gradient` | Optional / branch-dependent | `GradientPlotAppearanceOptions \| undefined` |
| `center` | Optional / branch-dependent | `false \| GradientPlotCenterOptions \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
editGradientPlot({ target?, density?, width?, gradient?, center? })
```

Revise one stable gradient-plot owner. Statistical changes create and rebind
one immutable raw-source profile revision; appearance-only edits retain it.
`center: false` removes the optional rule and `center: {}` restores it.
[Statistical actions](../../reference/actions/statistics.md#editgradientplot)


## `createViolinPlot`

**API layer:** user-facing. **Authoring roles:** H0, H1.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
createViolinPlot(options: ViolinPlotOptions): ChartProgram;
```

Named option contracts: [`ViolinPlotOptions`](./../types.md#type-violinplotoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `id` | Optional / branch-dependent | `string \| undefined` |
| `data` | Optional / branch-dependent | `string \| undefined` |
| `coordinate` | Optional / branch-dependent | `string \| undefined` |
| `x` | Required | `ViolinPlotPositionChannel` |
| `y` | Required | `ViolinPlotPositionChannel` |
| `split` | Optional / branch-dependent | `ViolinPlotSplitOptions \| undefined` |
| `color` | Optional / branch-dependent | `ViolinPlotColorOptions \| undefined` |
| `density` | Optional / branch-dependent | `ViolinPlotDensityOptions \| undefined` |
| `area` | Optional / branch-dependent | `ViolinPlotAreaOptions \| undefined` |
| `guides` | Optional / branch-dependent | `false \| CartesianCategoricalGuideOptions \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
createViolinPlot({
  id?, data?, coordinate?, x, y, split?, color?, density?, area?, guides?
})
```

Create a vertical or horizontal categorical density plot from exactly one
categorical and one quantitative x/y role. The action infers field types,
orientation, data, scales, and applicable guides, then records an ordinary area
mark, categorical `encodeDensity`, optional color, and guides as wrapped
children. Density options own bandwidth, extent, kernel, normalization, and
shared or independent band-relative width. An optional two-value split assigns
one half to each side of the category center.
[Violin plots](../../api/violin-plots.md)


## `editViolinPlot`

**API layer:** user-facing. **Authoring roles:** H1, H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
editViolinPlot(options: EditViolinPlotOptions): ChartProgram;
```

Named option contracts: [`EditViolinPlotOptions`](./../types.md#type-editviolinplotoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `target` | Optional / branch-dependent | `string \| undefined` |
| `data` | Optional / branch-dependent | `string \| undefined` |
| `x` | Optional / branch-dependent | `ViolinPlotPositionChannel \| undefined` |
| `y` | Optional / branch-dependent | `ViolinPlotPositionChannel \| undefined` |
| `split` | Optional / branch-dependent | `false \| ViolinPlotSplitOptions \| undefined` |
| `density` | Optional / branch-dependent | `(Omit<ViolinPlotDensityOptions, "weight"> & { weight?: false \| StatisticalWeight \| undefined; }) \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
editViolinPlot({ target?, data?, x?, y?, split?, density? })
```

Revise source, category, quantitative value, split, orientation, and density
parameters through one stable violin owner. The action creates an immutable
density revision and reconciles axes, grid, selections, and highlights. Area
appearance remains available through `editAreaMark`.
[Violin plots](../../api/violin-plots.md#editing)


## `createRegressionBand`

**API layer:** user-facing. **Authoring roles:** H1.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
createRegressionBand(options: CreateRegressionBandOptions): ChartProgram;
```

Named option contracts: [`CreateRegressionBandOptions`](./../types.md#type-createregressionbandoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `id` | Required | `string` |
| `data` | Required | `string` |
| `x` | Required | `string` |
| `lower` | Required | `string` |
| `upper` | Required | `string` |
| `groupBy` | Optional / branch-dependent | `string \| undefined` |
| `coordinate` | Required | `string` |
| `xScale` | Required | `string` |
| `yScale` | Required | `string` |
| `color` | Optional / branch-dependent | `string \| undefined` |
| `opacity` | Optional / branch-dependent | `number \| undefined` |
| `stroke` | Optional / branch-dependent | `string \| undefined` |
| `strokeWidth` | Optional / branch-dependent | `number \| undefined` |
| `curve` | Optional / branch-dependent | `CurveInterpolation \| undefined` |
| `lineCap` | Optional / branch-dependent | `"butt" \| "round" \| "square" \| undefined` |
| `lineJoin` | Optional / branch-dependent | `"bevel" \| "miter" \| "round" \| undefined` |
| `miterLimit` | Optional / branch-dependent | `number \| undefined` |

</details>

Behavior, inference, resets, and errors: [Semantic resources and regression layers](./statistics.md#semantic-resources-and-regression-layers).



## `editRegressionBand`

**API layer:** user-facing. **Authoring roles:** H1, H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
editRegressionBand(options: StrokeStyleDetails & { target?: string; color?: string; opacity?: number; stroke?: string | false; strokeWidth?: number; curve?: CurveInterpolation; }): ChartProgram;
```

Named option contracts: [`StrokeStyleDetails`](./../types.md#type-strokestyledetails) · [`CurveInterpolation`](./../types.md#type-curveinterpolation).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `lineCap` | Optional / branch-dependent | `"butt" \| "round" \| "square" \| undefined` |
| `lineJoin` | Optional / branch-dependent | `"bevel" \| "miter" \| "round" \| undefined` |
| `miterLimit` | Optional / branch-dependent | `number \| undefined` |
| `target` | Optional / branch-dependent | `string \| undefined` |
| `color` | Optional / branch-dependent | `string \| undefined` |
| `opacity` | Optional / branch-dependent | `number \| undefined` |
| `stroke` | Optional / branch-dependent | `string \| false \| undefined` |
| `strokeWidth` | Optional / branch-dependent | `number \| undefined` |
| `curve` | Optional / branch-dependent | `CurveInterpolation \| undefined` |

</details>

Behavior, inference, resets, and errors: [Semantic resources and regression layers](./statistics.md#semantic-resources-and-regression-layers).



## `createRegressionLine`

**API layer:** user-facing. **Authoring roles:** H1.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
createRegressionLine(options: CreateRegressionLineOptions): ChartProgram;
```

Named option contracts: [`CreateRegressionLineOptions`](./../types.md#type-createregressionlineoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `id` | Required | `string` |
| `data` | Required | `string` |
| `x` | Required | `string` |
| `y` | Required | `string` |
| `groupBy` | Optional / branch-dependent | `string \| undefined` |
| `coordinate` | Required | `string` |
| `xScale` | Required | `string` |
| `yScale` | Required | `string` |
| `colorScale` | Optional / branch-dependent | `string \| undefined` |
| `strokeWidth` | Optional / branch-dependent | `number \| undefined` |
| `curve` | Optional / branch-dependent | `CurveInterpolation \| undefined` |
| `lineCap` | Optional / branch-dependent | `"butt" \| "round" \| "square" \| undefined` |
| `lineJoin` | Optional / branch-dependent | `"bevel" \| "miter" \| "round" \| undefined` |
| `miterLimit` | Optional / branch-dependent | `number \| undefined` |

</details>

Behavior, inference, resets, and errors: [Semantic resources and regression layers](./statistics.md#semantic-resources-and-regression-layers).



## `editRegressionLine`

**API layer:** user-facing. **Authoring roles:** H1, H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
editRegressionLine(options: StrokeStyleDetails & { target?: string; strokeWidth?: number; curve?: CurveInterpolation; }): ChartProgram;
```

Named option contracts: [`StrokeStyleDetails`](./../types.md#type-strokestyledetails) · [`CurveInterpolation`](./../types.md#type-curveinterpolation).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `lineCap` | Optional / branch-dependent | `"butt" \| "round" \| "square" \| undefined` |
| `lineJoin` | Optional / branch-dependent | `"bevel" \| "miter" \| "round" \| undefined` |
| `miterLimit` | Optional / branch-dependent | `number \| undefined` |
| `target` | Optional / branch-dependent | `string \| undefined` |
| `strokeWidth` | Optional / branch-dependent | `number \| undefined` |
| `curve` | Optional / branch-dependent | `CurveInterpolation \| undefined` |

</details>

Behavior, inference, resets, and errors: [Semantic resources and regression layers](./statistics.md#semantic-resources-and-regression-layers).



## `createDensityPlot`

**API layer:** user-facing. **Authoring roles:** H0, H1.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
createDensityPlot(options: CreateDensityPlotOptions): ChartProgram;
```

Named option contracts: [`CreateDensityPlotOptions`](./../types.md#type-createdensityplotoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `id` | Optional / branch-dependent | `string \| undefined` |
| `data` | Optional / branch-dependent | `string \| undefined` |
| `coordinate` | Optional / branch-dependent | `string \| undefined` |
| `field` | Required | `string` |
| `groupBy` | Optional / branch-dependent | `string \| false \| undefined` |
| `bandwidth` | Optional / branch-dependent | `number \| "auto" \| undefined` |
| `extent` | Optional / branch-dependent | `"auto" \| readonly [number, number] \| undefined` |
| `steps` | Optional / branch-dependent | `number \| undefined` |
| `kernel` | Optional / branch-dependent | `DensityKernel \| undefined` |
| `normalization` | Optional / branch-dependent | `DensityNormalization \| undefined` |
| `weight` | Optional / branch-dependent | `StatisticalWeight \| undefined` |
| `as` | Optional / branch-dependent | `readonly [string, string] \| undefined` |
| `densityChannel` | Optional / branch-dependent | `"x" \| "y" \| undefined` |
| `valueScale` | Optional / branch-dependent | `NonPointQuantitativePositionScaleOptions \| undefined` |
| `densityScale` | Optional / branch-dependent | `NonPointZeroSupportingPositionScaleOptions \| undefined` |
| `color` | Optional / branch-dependent | `string \| { field: string; fieldType?: "nominal" \| "ordinal" \| undefined; scale?: NonPointCategoricalColorScaleOptions \| undefined; palette?: Palette \| undefined; layout?: "overlay" \| undefined; } \| undefined` |
| `area` | Optional / branch-dependent | `(StrokeStyleDetails & { fill?: string \| undefined; opacity?: number \| undefined; stroke?: string \| undefined; strokeWidth?: number \| undefined; curve?: CurveInterpolation \| undefined; }) \| undefined` |
| `guides` | Optional / branch-dependent | `false \| DensityPlotGuideOptions \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```js
createDensityPlot({ id?, data?, coordinate?, field, groupBy?, bandwidth?, extent?, steps?, kernel?, normalization?, as?, densityChannel?, valueScale?, densityScale?, color?, area?, guides? })
```

Creates a complete baseline density area from a required quantitative `field`. The default ID is `densityPlot`.
Existing KDE defaults apply: automatic bandwidth and extent, 100 steps, Gaussian kernel, unit normalization.
`groupBy` is an explicit field or `false`; omission is ungrouped. Color is optional and must use that same group field,
with a nominal/ordinal categorical scale and optional `layout: "overlay"`. Raw metadata is not copied into density profiles.
`densityChannel: "y"` places values on x; `"x"` exchanges those roles. The density scale must include zero.
`area` accepts `fill`, `opacity`, `stroke`, `strokeWidth`, and `curve`; opacity defaults to 0.2. Scalar fill conflicts
with field color, and stroke width requires a stroke. Guides default to both axes and the existing horizontal grid
in either orientation; an explicit group color enables a categorical legend. `guides: false` skips guide creation.
Use `editDensity`, `editAreaMark`, and scale/guide editors for revisions. Category placement and orientation edits
are outside this facade. This action is available from `ggaction` and is absent from `ggaction/basic`.

See the [complete density workflow](../../tutorials/density-area.md#complete-density-facade).


## `createHorizonPlot`

**API layer:** user-facing. **Authoring roles:** H0, H1.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
createHorizonPlot(options: CreateHorizonPlotOptions): ChartProgram;
```

Named option contracts: [`CreateHorizonPlotOptions`](./../types.md#type-createhorizonplotoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `id` | Optional / branch-dependent | `string \| undefined` |
| `data` | Optional / branch-dependent | `string \| undefined` |
| `coordinate` | Optional / branch-dependent | `string \| undefined` |
| `x` | Required | `string \| HorizonXEncoding` |
| `y` | Required | `string \| HorizonYEncoding` |
| `groupBy` | Optional / branch-dependent | `string \| false \| undefined` |
| `bands` | Optional / branch-dependent | `number \| undefined` |
| `baseline` | Optional / branch-dependent | `number \| undefined` |
| `extent` | Optional / branch-dependent | `number \| "auto" \| undefined` |
| `resolve` | Optional / branch-dependent | `HorizonResolution \| undefined` |
| `missing` | Optional / branch-dependent | `HorizonMissingPolicy \| undefined` |
| `overflow` | Optional / branch-dependent | `HorizonOverflowPolicy \| undefined` |
| `palette` | Optional / branch-dependent | `HorizonPaletteOptions \| undefined` |
| `area` | Optional / branch-dependent | `(StrokeStyleDetails & { opacity?: number \| undefined; stroke?: string \| undefined; strokeWidth?: number \| undefined; curve?: CurveInterpolation \| undefined; }) \| undefined` |
| `guides` | Optional / branch-dependent | `false \| HorizonPlotGuideOptions \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```js
createHorizonPlot({ id?, data?, coordinate?, x, y, groupBy?, bands?, baseline?, extent?, resolve?, missing?, overflow?, palette?, area?, guides? })
```

Create a complete signed, folded area chart from explicit x and y source fields. Defaults use three bands,
a zero baseline, automatic shared extent, blue positive bands and red negative bands. Temporal x fields
support the existing temporal unit vocabulary. The full entry owns this facade; Basic does not expose it.

The original x axis and vertical grid are the only automatic guides. Folded y/horizontal grid/internal
band legend options accept only false. Palette owns fill; area appearance accepts opacity, stroke,
strokeWidth and curve. Explicit opacity is applied after encoding. Revise statistics with editHorizon
and style with editAreaMark. See the [Horizon tutorial](../../tutorials/horizon.md).


## Focused statistical data editing

```javascript
editComputedData({ target, as?, expression?, dependents? })
editFoldData({ target, fields?, as?, dependents? })
editSummaryData({ target, groupBy?, aggregates?, members?, weight?, dependents? })
editBinData({ target, field?, maxBins? | step? | boundaries?, extent?, nice?, zero?, includeEmpty?, members?, as?, weight?, dependents? })
editStackData({ target, category?, group?, value?, mode?, as?, dependents? })
editIntervalData({ target, field?, groupBy?, center?, extent?, method?, level?, as?, dependents? })
editECDFData({ target, field?, groupBy?, weight?, missing?, as?, dependents? })
editNormalizedData({ target, field?, as?, groupBy?, method?, variance?, zeroDenominator?, baseline?, sortBy?, dependents? })
editCompleteData({ target, key?, groupBy?, values? | sequence?, fill?, members?, dependents? })
editImputedData({ target, fields?, groupBy?, sortBy?, method?, value?, edges?, maxGap?, dependents? })
```

Use a focused editor for a partial change to the corresponding standalone data
transform. Arrays, expressions, aggregate lists, and output maps replace the
whole current value. A patch must contain at least one transform option.
`undefined` and `null` do not delete options. `weight: false` removes an existing
weight only from the editors that expose weight. Mode changes remove keys that
belong only to the previous mode before validating the final definition.
[Editing derived data](../../api/data/source-and-derived.md#editing-derived-data)

## `editErrorBand` and `editErrorBandBoundary`

```javascript
editErrorBand({
  target?, data?, x?, y?, groupBy?, fill?, opacity?, curve?, statistics?,
  boundaries?
})
editErrorBandBoundary({
  target?, boundary?, stroke?, strokeWidth?, strokeDash?, opacity?, curve?
})
```

Constant band fill conflicts with active color. Remove that encoding first, or
use edit-only `fill: false` to clear a constant fill and restore color eligibility.

Edit the band source, position/interval roles, grouping, body, statistical
interval, or both owned boundary components without addressing generated line
IDs. Role changes may switch orientation or interval mode. `boundaries: false` disables both;
an object creates or edits both. The focused boundary action still accepts
`"both"`, `"lower"`, or `"upper"` and creates missing selected boundaries.
[Error bands](../../api/error-bands.md#editing-the-band)

## Semantic resources and regression layers

```javascript
createCoordinate({ id?, type?, layers? })
editCoordinate({ target, aspect?, polarFrame? })
createDerivedData({
  id,
  source,
  transform: [DatasetTransform]
})
createRegressionBand({
  id, data, x, lower, upper, groupBy?, coordinate, xScale, yScale,
  color?, opacity?, stroke?, strokeWidth?, curve?, missing?
})
editRegressionBand({ target?, color?, opacity?, stroke?, strokeWidth?, curve?, missing? })
createRegressionLine({
  id, data, x, y, groupBy?, coordinate, xScale, yScale,
  colorScale?, strokeWidth?, curve?, missing?
})
editRegressionLine({ target?, strokeWidth?, curve?, missing? })
```

These actions explicitly author named semantic resources or the component
layers normally owned by `createRegression`.

`createCoordinate.type` accepts `"cartesian"`, `"polar"`, or `"parallel"`.
Parallel coordinates normally create their resource through
`encodeParallelCoordinates` or `createParallelCoordinates`.

`editCoordinate.aspect` accepts `"auto"` or a frame/data ratio request with
optional start/center/end alignment. Frame mode supports Cartesian, Polar, and
Parallel coordinates. Data mode requires one complete Cartesian quantitative
linear x/y scale pair and preserves equal-unit intent through scale-domain and
Canvas edits. The target coordinate ID is always explicit.
`editCoordinate.polarFrame` accepts `"auto"` or a Polar-only center/radius
request. Center values are normalized effective-bound fractions; radius is a
fraction of the largest fitting radius or a positive fixed pixel value. The
frame object is replaced as a whole, and aspect is resolved before the Polar
frame and radial scale range.

`createDerivedData` stores immutable source and transform provenance only; it
does not materialize values. Chart facades and mark creation reject definition-only
datasets with an error explaining that materialized values are required.
Its public `DatasetTransform` union is listed in the canonical
[transform table](../../api/data/source-and-derived.md#create-derived-data).
A bare object, empty array, or multi-transform pipeline is invalid. Focused
`create*Data` helpers validate fields, apply defaults, and materialize values;
raw provenance objects have their own normalized requirements.

## Related

[Action Reference](../actions.md) · [Chart API](../../api/index.md) · [Supported Features](../../supported-features.md)
