# Cars Origin Histogram Facet

## 목적

Cars `Displacement` 분포를 `Origin`별 histogram cell로 나눈다. Direct-source aggregate facet, shared bin
boundaries, shared count domain과 explicit two-column wrapping을 검증한다.

## 최종 user-facing API

```javascript
const rows = cars.filter(row =>
  Number.isFinite(row.Displacement) &&
  Number.isFinite(row.Cylinders) &&
  typeof row.Origin === "string"
);

chart()
  .createCanvas({
    width: 280,
    height: 240,
    margin: { top: 34, right: 18, bottom: 50, left: 52 }
  })
  .createData({ values: rows })
  .createBarMark()
  .encodeHistogram({
    field: "Displacement",
    binBoundaries: [50, 106.25, 162.5, 218.75, 275, 331.25, 387.5, 443.75, 500],
    xScale: { nice: true, zero: false }
  })
  .encodeColor({
    field: "Cylinders",
    fieldType: "ordinal",
    scale: { palette: "reds" }
  })
  .createGuides({
    axes: {
      x: { title: { text: "Displacement" } },
      y: { title: { text: "Count", offset: 39 } }
    },
    legend: false,
    grid: { horizontal: true, vertical: false }
  })
  .facet({
    field: "Origin",
    columns: 2,
    gap: 18,
    padding: 14,
    guides: { legend: "shared" }
  })
  .createTitle({
    text: "Displacement Distribution",
    subtitle: "Faceted by Origin",
    align: "center"
  });
```

## Action hierarchy

Scatterplot facet과 같은 aggregate hierarchy를 사용한다. 각 child의 `filterData` 뒤 histogram aggregate를
cell grain에서 다시 materialize하되 bin boundaries와 final y domain은 세 cell이 공유한다.

## Stored-result contract

- Facet values and children remain `USA`, `Europe`, `Japan` in that order.
- `columns: 2` resolves row-major positions `[(0,0), (1,0), (0,1)]`.
- One global set of eight bin boundaries is applied to every cell.
- Shared y domain contains the maximum cell/bin count; absent bins materialize no synthetic bars.
- Every observed bin stacks Cylinders in shared domain order and one `reds` legend is owned by the parent.
- Parent title and headers are not copied into child semantic programs.
- Parent Canvas is `756 × 578`; primitive and user-facing Canvas calls are exact matches.
