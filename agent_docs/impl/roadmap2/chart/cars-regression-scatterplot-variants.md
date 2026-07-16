# Cars Regression Scatterplot Variants

## 목적

Canonical cars regression scatterplot을 유지하면서 component appearance, filter predicates, regression method와
prediction interval의 target behavior를 고정한다.

## 공통 baseline

- Source: cars; baseline filter는 `Origin ∈ { Japan, USA }`
- Point layer: Displacement × Acceleration, Origin color/shape, Acceleration size
- Regression: grouped linear fit, 95% mean interval, one band and line per Origin
- Guides: horizontal grid, complete axes, composite Origin legend and size legend
- Canvas: `760×480`, plot bounds `x=80..570`, `y=40..410`

## Visual variants

| Variant | Target capability | 구분되는 결과 |
| --- | --- | --- |
| `baseline` | canonical parity | Existing approved regression scatterplot |
| `component-edit` | regression band/line edits, area outline | dark outlined band, lower opacity and thicker lines |
| `comparison-filter` | filter predicate | `Horsepower >= 150` rows와 fitted result |
| `range-filter` | filter range | inclusive Displacement range의 rows와 fitted result |
| `polynomial-degree-2` | polynomial regression | grouped quadratic fit and mean band |
| `loess-span` | loess regression | grouped local fit, line only |
| `prediction-interval` | prediction interval | mean interval보다 넓은 grouped bands |
| `graphic-hierarchy` | Canvas/plot ownership and explicit draw order | Flat visual output과 동일한 named graphic tree |

## Target user-facing chains

### Component edit

```javascript
createCarsRegressionScatterplot(rows)
  .editRegressionBand({
    target: "pointsRegressionBands",
    color: "#475569",
    opacity: 0.12,
    stroke: "#111827",
    strokeWidth: 1.5
  })
  .editRegressionLine({
    target: "pointsRegressionLines",
    strokeWidth: 5
  });
```

### Filter predicates

The canonical public chain applies one of these after the point encodings and before `createRegression`:

```javascript
.filterMarks({
  field: "Horsepower",
  op: "gte",
  value: 150
});

.filterMarks({
  field: "Displacement",
  op: "range",
  min: 100,
  max: 300,
  inclusive: true
});
```

### Regression methods and interval

The canonical public chain replaces `createRegression()` with one of:

```javascript
.createRegression({ method: "polynomial", degree: 2 });
.createRegression({ method: "loess", span: 0.55, band: false });
.createRegression({ interval: "prediction" });
```

Omitted x, y and groupBy continue to resolve from the unique compatible point layer.

### Graphic hierarchy

The target public chain remains the canonical `createCarsRegressionScatterplot(rows)` flow. No parent, plot ID or
placement parameter is added to the chart-authoring API. With a Canvas-first ordinary flow, domain actions infer the
stable graphical owner and create this named tree:

```text
graphicSpec.order
└─ canvas
   ├─ plot-main
   │  ├─ horizontal grid
   │  ├─ regression band
   │  ├─ points
   │  ├─ regression lines
   │  ├─ x axis components
   │  └─ y axis components
   ├─ categorical/size legend graphics
   └─ title graphics, when present
```

`graphicSpec.objects` remains the flat global named-object registry. Named `children` express ownership and local
drawing order, while repeated concrete mark instances remain in the owning drawable's `items`. Highlighted items stay
inside the owning mark and are ordered after its unselected items; they do not become an unrelated top-level node.

The default visual order is background, grid, statistical band, ordinary mark, highlighted item, axis, legend and
title. Axis graphics remain above marks so bars, areas and points cannot cover baselines or ticks. Legend and title are
Canvas children rather than plot children because they occupy chart layout outside the coordinate plot.

The hierarchy variant must preserve the baseline semantic specification, resolved scales and per-node concrete
properties. It intentionally changes the old flat `points → band → line` draw order to
`band → points → line`, so old-baseline Canvas-call order and decoded pixels are not equivalence requirements. Gate A
approves that deliberate visual correction; after approval, the hierarchy primitive and public program must have exact
Canvas-call and decoded-pixel equivalence. Its Roadmap artifact pair is stored under
`.artifacts/test/png/roadmap2/cars-regression-scatterplot/graphic-hierarchy/`.

## Numeric contract

- Filter fixtures independently preserve source order and enforce strict equality/type compatibility rules.
- Polynomial coefficients, fitted rows and group order are checked without importing production regression helpers.
- LOESS neighbor selection, tie order and fitted rows use an independent fixture.
- For the same group, x and confidence, prediction bounds contain or equal mean bounds.
- Component edits preserve dataset, result fields, grouping, coordinate and scale bindings.

## 범위 경계

Robust LOESS reweighting, extrapolated sample grids, simultaneous confidence bands and renderer-side fitting are not included.
Program composition, nested child canvases, clipping, transforms, automatic layout groups and a new user-facing
hierarchy action are also outside this variant. Extension-authored top-level graphics remain supported; the hierarchy
guarantee applies to ordinary Canvas-first domain-action flows.
