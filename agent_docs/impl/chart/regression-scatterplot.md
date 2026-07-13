# Regression Scatterplot 구현 계약

## 구현 상태

Phase 5에서 완료했다. Public browser example, primitive baseline, full `graphicSpec`
equivalence, Canvas renderer call equivalence, 2× PNG, immutable data와 action hierarchy를
acceptance test로 고정했다.

## 목표

`cars` 데이터의 `Displacement`, `Acceleration`, `Origin`을 사용해 다음 layer를
겹친 regression scatterplot을 구현한다.

1. Japan과 USA 행만 사용하는 point layer
2. Origin별 linear regression의 95% mean-response confidence band
3. Origin별 linear regression line

Point는 Acceleration을 size로, Origin을 color와 shape로 표현한다. Band는 검은색
반투명 area이고 line은 Origin color를 재사용한다. x/y scale과 cartesian coordinate는
세 layer가 공유한다.

## 최종 user-facing API

```javascript
const program = chart()
  .createCanvas({
    width: 760,
    height: 480,
    margin: { top: 40, right: 190, bottom: 70, left: 80 }
  })
  .createData({ id: "cars", values: cars })
  .filterData({
    id: "selectedCars",
    field: "Origin",
    oneOf: ["Japan", "USA"]
  })
  .createPointMark({ id: "points" })
  .encodeX({
    field: "Displacement",
    scale: { nice: true, zero: false }
  })
  .encodeY({
    field: "Acceleration",
    scale: { nice: true, zero: false }
  })
  .encodeColor({
    field: "Origin",
    scale: { palette: "tableau10" }
  })
  .encodeSize({ field: "Acceleration" })
  .encodeShape({ field: "Origin" })
  .encodeOpacity({ value: 0.27 })
  .createRegression({
    confidence: 0.95,
    band: { color: "#111111", opacity: 0.18 },
    line: { strokeWidth: 3 }
  })
  .createGuides();
```

`filterData`의 source는 current dataset에서 infer한다. `createRegression`은 target,
`x`, `y`, `groupBy`를 생략할 수 있다.

- target: current point mark 또는 유일한 eligible point mark
- x: target의 quantitative x field
- y: target의 quantitative y field
- groupBy: target에서 color 또는 shape가 사용하는 유일한 nominal field
- dataset, coordinate, scales: target이 저장한 resource를 재사용

후보가 없거나 여러 개라 안전하게 고를 수 없으면 명시적 option을 요구한다. 명시적
`target`, `x`, `y`, `groupBy`는 inference보다 우선한다. Group field가 전혀 없으면
single regression을 만들 수 있다.

## 통계 의미

각 group은 ordinary least squares linear regression을 독립적으로 계산한다.

```text
y_hat = intercept + slope * x
```

Confidence band는 prediction interval이 아니라 평균 회귀 응답의 Student-t 기반 95%
confidence interval이다.

```text
SE_mean(x) = residualSE * sqrt(1 / n + (x - meanX)^2 / Sxx)
CI(x) = y_hat ± t(0.975, n - 2) * SE_mean(x)
```

- 유효한 x/y/group row만 사용한다.
- group마다 `n >= 3`이어야 한다.
- `Sxx`가 0인 group은 거절한다.
- Regression row는 해당 group에서 관측된 unique x를 오름차순으로 사용한다.
- Source와 filtered dataset의 row를 수정하지 않는다.

## 중요한 action hierarchy

```text
filterData
├─ createDerivedData
└─ materializeFilteredData
```

```text
encodeSize
├─ editSemantic
├─ createScale
└─ rematerializePointMark

encodeShape
├─ editSemantic
├─ createScale
└─ rematerializePointMark

encodeOpacity
└─ rematerializePointMark
```

```text
createRegression
├─ createRegressionData
├─ createRegressionBand
│  ├─ createAreaMark
│  ├─ encodeX
│  ├─ encodeYRange
│  │  ├─ encodeY
│  │  └─ encodeY2
│  ├─ encodeGroup
│  └─ rematerializeAreaMark
└─ createRegressionLine
   ├─ createLineMark
   ├─ encodeX
   ├─ encodeY
   ├─ encodeColor
   ├─ encodeGroup
   └─ rematerializeLineMark
```

`encodeGroup`은 scale이나 legend를 만들지 않고 여러 path를 분리하는 semantic group
field만 저장하는 advanced action이다. `encodeYRange`는 band의 y/y2를 atomic하게
설정한다.

## Semantic 결과 계약

Filtered data와 regression data는 source dataset을 덮어쓰지 않는 immutable derived
dataset이다. 각각 source 관계, semantic transform, materialized values를 저장한다.

Point layer는 다음 encoding을 가진다.

```javascript
{
  x: { field: "Displacement", fieldType: "quantitative", scale: "x" },
  y: { field: "Acceleration", fieldType: "quantitative", scale: "y" },
  color: { field: "Origin", fieldType: "nominal", scale: "color" },
  size: { field: "Acceleration", fieldType: "quantitative", scale: "size" },
  shape: { field: "Origin", fieldType: "nominal", scale: "shape" }
}
```

Constant opacity는 graphical appearance이므로 semantic encoding으로 저장하지 않는다.

Regression data는 group, observed x, predicted y, lower/upper confidence 값을 concrete
row로 가진다. Band layer는 x/y/y2/group, line layer는 x/y/color/group encoding을
가진다. 세 layer의 x/y scale ID는 동일하고 line의 color scale도 point layer와
동일하다.

## Graphical 결과 계약

Point mark는 heterogeneous graphical collection으로 materialize한다. 기존 program
composition/layout용 `container`와 구분하기 위해 drawable child collection은
`collection` type을 사용한다.

```javascript
{
  id: "points",
  type: "collection",
  children: [
    { id: "points:0", type: "circle", properties: { x, y, radius, ... } },
    { id: "points:1", type: "rect", properties: { x, y, width, height, ... } }
  ]
}
```

각 child가 concrete primitive type을 가진다. Circle과 square는 semantic size를 symbol
area로 해석한 뒤 같은 area를 갖는 radius 또는 width/height로 변환한다. Auto size
range는 semantic scale에 `"auto"`로 저장하고 materialization 시 plot에 맞는 library
default로 resolve한다.

Regression line은 Origin마다 하나의 open stroked path다. Confidence band는 Origin마다
하나의 closed filled path다. Band path는 lower boundary를 x 오름차순으로, upper
boundary를 x 내림차순으로 이어 닫는다. Filled path는 stroke 없이도 유효하고 open
line path는 fill 없이도 유효하다.

Concrete rendering order는 다음과 같다.

```text
canvas
→ horizontal grid
→ points
→ regression bands
→ regression lines
→ axes
→ legends
```

Renderer는 `semanticSpec`, context, trace를 읽지 않는다.

## Guides

`createGuides()`는 공유 x/y axes와 기본 horizontal grid를 한 번만 만든다.

- Origin legend: point color + point shape + regression line을 하나의 categorical
  composite symbol로 설명한다.
- Acceleration legend: quantitative size scale을 별도로 설명하며 기본 symbol count는
  5개다.
- 두 legend는 chart-independent 기본값인 right placement를 사용하고 vertical stack으로
  배치한다.
- Confidence band의 고정 검은색은 field encoding이 아니므로 legend를 만들지 않는다.

## 제외 범위

- Polynomial, logarithmic, loess regression
- Prediction interval
- User-provided regression sample count
- Multiple simultaneous group fields
- Interactive filtering, selection, tooltip
- Legend interaction
- Animation
