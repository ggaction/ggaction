# Cars Origin Scatterplot Facet

## 목적

Cars의 `Horsepower`와 `Miles_per_Gallon` 관계를 `Origin`별 small multiple로 나눈다. Shortest facet call,
first-appearance order, default one-row layout, shared quantitative domains, per-cell axes와 parent-owned title/header를
검증한다.

## 최종 user-facing API

```javascript
const completeRows = cars.filter(row =>
  Number.isFinite(row.Horsepower) &&
  Number.isFinite(row.Miles_per_Gallon) &&
  Number.isFinite(row.Cylinders) &&
  typeof row.Origin === "string"
);
const originOrder = [...new Set(cars.map(row => row.Origin))];
const rows = originOrder.flatMap(origin =>
  completeRows.filter(row => row.Origin === origin)
);

chart()
  .createCanvas({
    width: 250,
    height: 230,
    margin: { top: 34, right: 16, bottom: 48, left: 52 }
  })
  .createData({ values: rows })
  .createPointMark()
  .encodeX({
    field: "Horsepower",
    scale: { nice: true, zero: false }
  })
  .encodeY({
    field: "Miles_per_Gallon",
    scale: { nice: true, zero: false }
  })
  .encodeRadius({ value: 2.5 })
  .encodeColor({
    field: "Cylinders",
    fieldType: "ordinal",
    scale: { domain: [8, 4, 6, 3, 5], palette: "reds" }
  })
  .createGuides({
    axes: {
      x: { title: { text: "Horsepower" } },
      y: { title: { text: "Miles per Gallon", offset: 39 } }
    },
    legend: false
  })
  .facet({ field: "Origin", guides: { legend: "shared" } })
  .createTitle({
    text: "Horsepower and Fuel Economy",
    subtitle: "Faceted by Origin",
    align: "center"
  })
  .editFacetHeaders({ fontSize: 13, fontWeight: 700, offset: 10 });
```

## Action hierarchy

```text
facet
├─ useProgram(cell) × 3
└─ materializeComposition
   ├─ attach namespaced child Canvas × 3
   ├─ create facet headers
   └─ create shared categorical legend

Each retained child records `filterData`, explicit layer rebinding and consumer rematerialization under its inherited
`facet` trace node. `createTitle` and `editFacetHeaders` remain later top-level actions on the parent.
```

## Stored-result contract

- Facet values are `USA`, `Europe`, `Japan` in source first-appearance order.
- Omitted columns resolves to `3`; all cells appear in one row.
- Every child keeps an independent scale resource but resolves the same full-source x/y domain.
- Cylinders uses shared ordinal domain `[8, 4, 6, 3, 5]` and one parent `reds` legend.
- Title is created after `facet` and exists only on the composition parent; header text is parent-owned concrete graphics.
- Raw Origin values never appear in generated child, dataset or graphic IDs.
- Parent Canvas is `932 × 282`; primitive and user-facing Canvas calls are exact matches.
