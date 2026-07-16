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

## Numeric contract

- Filter fixtures independently preserve source order and enforce strict equality/type compatibility rules.
- Polynomial coefficients, fitted rows and group order are checked without importing production regression helpers.
- LOESS neighbor selection, tie order and fitted rows use an independent fixture.
- For the same group, x and confidence, prediction bounds contain or equal mean bounds.
- Component edits preserve dataset, result fields, grouping, coordinate and scale bindings.

## 범위 경계

Robust LOESS reweighting, extrapolated sample grids, simultaneous confidence bands and renderer-side fitting are not included.
