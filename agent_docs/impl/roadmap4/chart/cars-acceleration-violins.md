# Cars acceleration violins

## 상태

`in-progress` — P8-B review package에서 primitive/public exact parity를 검증한 categorical-density contract다.

## 차트 목표

Cars의 acceleration 분포를 Origin별 vertical violin으로 비교한다. Full variant는 각 Origin의 complete density를
보여주고, split variant는 1970–1976과 1977–1982 model era를 center 기준 왼쪽/오른쪽 half로 비교한다.

## 목표 user-facing API — full

```javascript
chart()
  .createCanvas({
    width: 720,
    height: 520,
    margin: { top: 90, right: 45, bottom: 80, left: 80 }
  })
  .createData({ values: cars })
  .createViolinPlot({
    id: "violins",
    x: { field: "Origin", fieldType: "nominal" },
    y: { field: "Acceleration", fieldType: "quantitative" },
    color: {
      field: "Origin",
      fieldType: "nominal",
      scale: {
        domain: ["USA", "Europe", "Japan"],
        range: ["#4c78a8", "#f58518", "#54a24b"]
      }
    },
    density: {
      bandwidth: 0.65,
      extent: [8, 25],
      steps: 80,
      width: { band: 0.8, resolve: "shared" }
    },
    area: { opacity: 0.8, strokeWidth: 1.2 },
    guides: {
      axes: {
        x: {
          ticksAndLabels: { labels: { fontSize: 13 } },
          title: { offset: 58, fontSize: 14 }
        },
        y: { title: { offset: 54, fontSize: 14 } }
      },
      legend: false
    }
  })
  .createTitle({
    text: "Acceleration Distribution by Origin",
    subtitle: "Kernel-density profiles for the Cars dataset",
    align: "center",
    offset: 4,
    gap: 11,
    titleStyle: { fontSize: 24, fontWeight: 700 }
  });
```

## 목표 user-facing API — split

```javascript
chart()
  .createCanvas({
    width: 760,
    height: 520,
    margin: { top: 90, right: 165, bottom: 80, left: 80 }
  })
  .createData({ values: carsWithEra })
  .createViolinPlot({
    id: "violins",
    x: { field: "Origin", fieldType: "nominal" },
    y: { field: "Acceleration", fieldType: "quantitative" },
    split: {
      field: "era",
      domain: ["1970–1976", "1977–1982"]
    },
    color: {
      field: "era",
      fieldType: "nominal",
      scale: {
        domain: ["1970–1976", "1977–1982"],
        range: ["#4c78a8", "#e45756"]
      }
    },
    density: {
      bandwidth: 0.65,
      extent: [8, 25],
      steps: 80,
      width: { band: 0.8, resolve: "shared" }
    },
    area: { opacity: 0.8, strokeWidth: 1.2 },
    guides: {
      axes: {
        x: {
          ticksAndLabels: { labels: { fontSize: 13 } },
          title: { offset: 58, fontSize: 14 }
        },
        y: { title: { offset: 54, fontSize: 14 } }
      },
      legend: {
        position: "right",
        direction: "vertical",
        offset: 28,
        title: "Model era",
        symbol: {
          width: 16,
          height: 16,
          stroke: "white",
          strokeWidth: 0.75
        },
        labels: { offset: 10, fontSize: 13 },
        titleStyle: { fontSize: 14 },
        itemGap: 42
      }
    }
  })
  .createTitle({
    text: "Acceleration Distribution by Origin",
    subtitle: "Early models on the left, later models on the right",
    align: "center",
    offset: 4,
    gap: 11,
    titleStyle: { fontSize: 24, fontWeight: 700 }
  });
```

## 목표 action hierarchy

```text
createViolinPlot
├─ createAreaMark
├─ encodeDensity
│  ├─ createCategoricalDensityData
│  ├─ editSemantic (derived-data rebind)
│  ├─ encodeX / encodeY / encodeGroup
│  └─ rematerializeAreaMark
├─ encodeColor (optional)
└─ createGuides (optional/applicable)
```

## 의미와 concrete 구조

- Full source는 finite Acceleration을 가진 Cars row를 Origin first-appearance order로 partition한다.
- Split source는 model year에서 derived한 `era`를 포함하고 Origin×era profile을 만든다.
- Category x scale은 세 Origin band center를, value y scale은 acceleration을 소유한다.
- Density는 x scale이 아니라 각 category band 안의 concrete half-width로 materialize된다.
- Full은 category당 closed path 하나, split은 category당 left/right closed half-path 두 개를 저장한다.
- Grid는 violins 아래, axes/title/optional legend는 위에 그린다.

## 검증 계약

- Production density source를 import하지 않는 independent KDE와 literal density anchors
- Sample-grid inclusivity, non-negativity, stable category/split order와 source-count conservation
- Center symmetry, band containment, shared/independent maximum과 split-side invariants
- Full/left/right/top/bottom and split validation, invalid domain과 degenerate group errors
- Primitive visual 승인 뒤 public semantic/graphic/tree/Canvas/PNG exact parity
- Bandwidth/source/scale/Canvas edit, baseline restore, facet replay와 previous-program immutability
