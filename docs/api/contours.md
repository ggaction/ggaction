---
layout: default
title: Contours and Two-Dimensional Density
---

# Contours and two-dimensional density

Create contour geometry from an explicit scalar grid or a point dataset, then draw
level boundaries or filled bands. These chart-authoring actions require the Full
`ggaction` entry point. Canvas, SVG, PNG and PDF use the same concrete paths.

{% include chart-example.html id="contour-bands" %}

The [contour tutorial](../tutorials/contours.md) uses the shared executable example.

## `createContourData`

**Chart authoring.**

```typescript
createContourData(options: TargetedOptions<CreateContourDataOptions>): ChartProgram;
```

Pass `{ id, grid, thresholds }`. A grid contains `origin: [x, y]`, positive `dx`
and `dy`, integer `width` and `height` of at least two, and row-major `values`.
Every value is a finite number or `null`. A cell with a null corner is excluded
completely. Coordinates identify sample centers. No missing region is filled in.

Thresholds must be finite, nonempty and strictly increasing. A level encloses
values greater than or equal to its threshold. A band covers `[lower, upper)`;
the final band also includes its upper boundary. One threshold produces levels
but no filled bands. Empty levels remain in the geometry metadata.

The grid and threshold arrays each have a 10,000-element limit. Extraction also
has a 10,000,000-unit work limit, and each region is limited to 10,000 boundary
segments. Unrepresentable crossings, overflow and excessive work are errors.
Holes and disconnected islands are retained as separate geometric components.
Creating geometry does not draw anything.

## `createDensityContourData`

**Chart authoring.**

```typescript
createDensityContourData(options: TargetedOptions<CreateDensityContourDataOptions>): ChartProgram;
```

Pass `{ id, data?, x, y, weight?, grid, estimator, normalization, thresholds }`.
The grid contains the same frame fields, without `values`. `data` selects an
existing materialized dataset; omission uses the current or unique eligible
source. The `x` and `y` columns must contain finite numbers. Optional `weight`
contains finite nonnegative numbers; omitted weights are one. Invalid or missing
rows cause an error instead of disappearing from the estimate.

Choose both the estimator and normalization explicitly:

- `estimator: "histogram"` uses grid centers as bin centers. The grid extends half
  a step beyond its end samples, and includes its final upper boundary. Every
  point must fit. Kernel and bandwidth options are rejected.
- `estimator: "kde"` requires `bandwidth: [hx, hy]` and a `DensityKernel`, such as
  `"gaussian"` or `"epanechnikov"`. It evaluates a product kernel at each grid
  sample. Points outside the grid still contribute; captured density is not
  renormalized to the grid extent.
- `normalization: "count"` keeps weighted mass; `"unit"` divides by total weight.
  Both divide by the bin or bandwidth area. Empty data and zero total weight
  produce a zero-valued grid.

At most 10,000 source rows are accepted. KDE point-count × grid-size work must
not exceed 10,000,000. Nonempty item-count × source-row-count must also stay
within 10,000,000 when creating or updating a mark, before row lineage expands.
Geometry retains every contributing source row key and
its exact source revision, together with total weight and source count.

## `editContourData`

**Chart authoring.**

```typescript
editContourData(options: TargetedOptions<EditContourDataOptions>): ChartProgram;
```

Use `{ target?, grid?, thresholds?, data?, definition? }`. Inline geometry accepts
`grid` and `thresholds`; density geometry accepts `data`, `thresholds` and a
partial `definition`. Change a density grid inside `definition.grid`. An edit
preserves the source kind, requires a nonempty patch, and rejects explicit
`undefined`.

Editing increments the geometry revision and updates its shared scales, marks,
axes, grids, legends and highlights. Raw, computed, parameter-driven and prepared
source revisions use the same dependency path. A failed source, geometry or
consumer check leaves the original program unchanged. Saved programs validate
the stored geometry against the grid and, for density, the exact source data.

## `createContourMark`

**Chart authoring.**

```typescript
createContourMark(options?: TargetedOptions<ContourMarkOptions>): ChartProgram;
```

Options are `{ id?, geometry?, coordinate?, mode?, x?, y?, color?, fill?, stroke?,
strokeWidth?, opacity?, clip? }`. Create a Canvas first. The default mark ID is
`contour`; use an explicit ID when creating another. Geometry and Cartesian
coordinate references use explicit, current, then unique eligible inference.
A missing coordinate is created as `main`; ambiguous choices are errors.

`mode: "filled"` is the default. It draws bands between thresholds and preserves
holes. `mode: "line"` draws closed superlevel boundaries, including boundaries
against the grid edge and missing cells. It stores `fill: "none"` and rejects
other explicit fills. Empty regions produce no graphic items.

`x` and `y` accept quantitative position-scale options. Their automatic domains
cover the complete grid extent. `color` accepts continuous or discretized
quantitative color-scale options and defaults to a sequential scale. It maps a
line's threshold or a band's lower bound; its domain includes all thresholds.
Default scale IDs are `<mark>-x`, `<mark>-y` and `<mark>-color`.

Set `color: false` for fixed paint. Defaults are `fill: "#2563eb"`,
`stroke: "#1f2937"`, `strokeWidth: 1`, `opacity: 1` and `clip: true`. Filled
contours accept the shared [FillPaint options](appearance/mark-style.md#pattern-and-gradient-fills).
Zero opacity is valid. Ordinary row encodings do not replace intrinsic contour
coordinates; change mappings with `editContourMark`.

Create guides explicitly. For example, call
`createXAxis({ scale: "contour-x" })` and
`createYAxis({ scale: "contour-y" })`, then `createLegend({ target: "contour" })`.
No guide is automatically added by the contour mark.

## `editContourMark`

**Chart authoring.**

```typescript
editContourMark(options: TargetedOptions<EditContourMarkOptions>): ChartProgram;
```

Use the creation options with `target` in place of `id`. Omitted values are
preserved, including scale identity. A nonempty patch is required. A new color
scale ID updates the legend binding; changing legend family uses the existing
legend transition rules. Remove and recreate a customized legend when its
settings cannot carry over. `color: false` removes that mark's color legend.
Use the existing scale editor to change a scale's type in place.

Position-scale reassignment follows the shared axis/grid rules and rejects
changes that would take a shared guide away from another mark. Returning from
line to filled mode preserves the stored fill, so provide a new fill when using
fixed color. Geometry, scale, coordinate and Canvas edits retain logical item
identity where level or band bounds remain unchanged.

Each nonempty level or band is one selectable item. Disconnected islands are
its separate graphic children. Density items retain all contributing rows;
inline items have no source rows. Inspection, highlights, saved programs,
`hconcat`/`vconcat` and scoped edits share the same materialized result.
Accessible data exports one row per nonempty level or band: `value`, plus `lower`,
`upper` and `upperInclusive` for filled bands.
Remove contour marks with `removeMark` before removing their geometry with
`removeResource({ kind: "geometry", id })`.

`facet` and `repeatCharts` do not partition resource-backed contour geometry.
Use explicit geometry resources and `hconcat`/`vconcat` for separate panels.
