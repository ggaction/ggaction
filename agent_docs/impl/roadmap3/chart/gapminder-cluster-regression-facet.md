# Gapminder Cluster Regression Facet

## 차트 목표

Gapminder의 `fertility`와 `life_expect` 관계를 `cluster`별 cell로 나눈다. Raw point layer와 regression
line/band의 derived dependency를 함께 facet하여, 각 cell이 자기 원본 행에서 통계를 다시 계산하는지
검증한다. `pop`은 shared sequential color scale과 parent-owned gradient legend를 사용한다.

이 chart는 Roadmap 3 Phase 8의 다음 capability를 한 vertical slice에서 검증한다.

- raw/derived layer가 공유하는 dataset dependency DAG
- cell별 regression 재계산
- independent x와 shared y/color scale
- incomplete final row의 outer-only axes
- parent-owned shared continuous-color legend

## Target user-facing API

```javascript
const program = chart()
  .createCanvas({
    width: 280,
    height: 240,
    margin: { top: 30, right: 28, bottom: 50, left: 58 }
  })
  .createData({ values: gapminder })
  .filterData({ field: "cluster", oneOf: [0, 3, 4, 1, 5] })
  .createPointMark({ opacity: 0.35 })
  .encodeX({
    field: "fertility",
    scale: { nice: true, zero: false }
  })
  .encodeY({
    field: "life_expect",
    scale: { nice: true, zero: false }
  })
  .encodeRadius({ value: 2.5 })
  .encodeColor({
    field: "pop",
    fieldType: "quantitative",
    scale: { type: "sequential", palette: "viridis" }
  })
  .createRegression({
    band: { opacity: 0.14 },
    line: { strokeWidth: 2.5 }
  })
  .createGuides({
    legend: { channels: ["color"] }
  })
  .facet({
    field: "cluster",
    columns: 3,
    scales: {
      x: "independent",
      y: "shared",
      color: "shared"
    },
    guides: {
      axes: "outer",
      legend: "shared"
    }
  })
  .createTitle({
    text: "Fertility and Life Expectancy",
    subtitle: "Regression recomputed within each cluster"
  });
```

Cluster `2`를 제외한 다섯 cell은 3열 layout의 마지막 행을 의도적으로 불완전하게 만들어 occupied-edge
guide selection을 검증한다. Resource IDs는 ordinary authoring flow에서 생략한다. Facet은 current chart에서 unique source, affected layers,
coordinates와 scales를 추론하고 resolved IDs를 child semantic state에 저장한다.

## Gate variants

1. `shared-scales`: scale options를 생략하고 axes는 each-cell로 유지한다.
2. `independent-x`: `x: "independent"`, `y/color: "shared"`를 적용하고 regression geometry 차이를 확인한다.
3. `outer-guides`: 최종 target처럼 outer-only axes와 shared gradient legend를 적용한다.

첫 두 variant는 Gate I-A에서 scale resolution과 derived replay를 승인한다. 세 번째 variant는 Gate I-B에서
guide ownership과 incomplete final-row placement를 승인한다.

## Stored-result contract

- Parent `compositionSpec.facet.scales`는 channel별 normalized resolution을 저장한다.
- Parent `compositionSpec.facet.guides`는 `{ axes, legend }`의 resolved policy를 저장한다.
- `children`은 `cluster` first-appearance order의 immutable cell programs를 가진다.
- 각 child는 filtered source revision, replay된 regression dataset, rebound point/band/line layers와 최종
  resolved scales를 가진다.
- Independent x domain은 cell마다 다르고 shared y/color domain은 모든 child에서 같다.
- Parent `graphicSpec`은 namespaced child Canvas snapshots, headers, selected outer axes, shared gradient legend와
  chart title을 모두 concrete하게 가진다.
- Renderer는 `children`, transform provenance 또는 scale policy를 읽지 않는다.

## Action hierarchy

```text
facet
├─ resolveFacetDependencyGraph
├─ resolveFacetValues
├─ deriveFacetCell × N
│  ├─ filterData
│  ├─ replayDerivedData
│  │  ├─ createDerivedData
│  │  └─ materializeRegressionData
│  ├─ rebindLayerData × affected layers
│  ├─ applyFacetScaleResolution
│  └─ rematerialize cell consumers
├─ composeFacetGuides
└─ materializeComposition
```

## 검증 기준

- Regression coefficients and interval rows are independently checked per cluster.
- Shared and independent domains use numeric oracles rather than screenshots alone.
- Outer x axes appear on the bottommost occupied cell of each column; outer y axes appear on the leftmost occupied
  cell of each row.
- The parent title is aligned to the union of translated child plot bounds, excluding cell margins, axis text,
  facet padding and shared guides.
- Every cluster header is centered on that cell's translated x-axis plot span rather than the cell Canvas.
- Primitive and public programs produce the same concrete Canvas calls and exact same-run pixels.
- Earlier source, base chart and every sibling child remain unchanged.
