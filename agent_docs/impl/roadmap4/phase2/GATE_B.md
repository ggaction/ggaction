# P2-B — Scatter와 Line Basic Chart facade

## 진행 상태

- [x] `createScatterPlot` runtime, strict type와 package export
- [x] `createLinePlot` runtime, strict type와 package export
- [x] shortest call, optional encoding과 guide opt-out
- [x] data/ID inference, ambiguity와 atomic failure
- [x] wrapped child hierarchy와 immutable trace
- [x] approved primitive와 semantic/graphic/Canvas-call exact parity
- [x] Browser Canvas와 2x Node PNG
- [x] full tests, coverage와 packed-package consumer
- [x] 사용자 승인

Gate 상태: `approved` (2026-07-20)

## 승인할 Scatter 실행 코드

```javascript
const scatter = chart()
  .createCanvas({
    width: 640,
    height: 400,
    margin: { top: 30, right: 30, bottom: 60, left: 70 }
  })
  .createData({ id: "cars", values: validCars })
  .createScatterPlot({
    id: "points",
    x: "Horsepower",
    y: "Miles_per_Gallon",
    color: "Origin",
    guides: {
      axes: {
        x: { title: { text: "Horsepower" } },
        y: { title: { text: "Miles per Gallon" } }
      }
    }
  });
```

Trace child는 다음 순서로 실제 실행된다.

```text
createScatterPlot
├─ createPointMark
├─ encodeX
├─ encodeY
├─ encodeColor
└─ createGuides
```

Shortest call은 `createScatterPlot({ x, y })`이며 stable ID `scatterPlot`, 현재 또는 유일 dataset,
default point radius `3`과 applicable guides를 사용한다. `size`, `shape`, point appearance와
`guides: false`는 별도 unit 회귀가 소유한다.

## 승인할 Line 실행 코드

```javascript
const line = chart()
  .createCanvas({
    width: 720,
    height: 460,
    margin: { top: 80, right: 170, bottom: 60, left: 80 }
  })
  .createData({ id: "cars", values: validCars })
  .createLinePlot({
    id: "trends",
    x: {
      field: "Year",
      fieldType: "temporal",
      scale: { nice: true }
    },
    y: {
      field: "Acceleration",
      aggregate: "mean",
      scale: { nice: true, zero: false }
    },
    color: {
      field: "Origin",
      scale: { palette: "tableau10" }
    },
    strokeDash: { field: "Origin" },
    guides: { axes: { y: { ticksAndLabels: { count: 6 } } } }
  })
  .createTitle({
    text: "The trend of acceleration by year",
    subtitle: "from 1970 to 1982"
  });
```

Facade trace의 실제 child hierarchy는 다음과 같다. Title은 facade 밖의 후속 action이다.

```text
createLinePlot
├─ createLineMark
├─ encodeX
├─ encodeY
├─ encodeColor
├─ encodeStrokeDash
└─ createGuides
```

Shortest `createLinePlot({ x, y })`, explicit `groupBy`, line curve/width, guide opt-out과 invalid aggregate를
검증했다. `strokeDash` plain string은 field와 named recipe를 구분할 수 없어 받지 않는다. 이 facade는
Cartesian 전용이므로 `line.closed: true`는 명시 오류이며 Polar line은 advanced action chain을 사용한다.

## 동등성 및 회귀 증거

- Exact public/primitive parity: `test/charts/cars-scatterplot/public.test.js`와
  `test/charts/cars-line-chart/public.test.js`
- Canonical programs: `examples/cars-scatterplot/program.js`와 `examples/cars-line-chart/program.js`
- 2x PNG: 각 chart slice의 `png.render.js`
- Shortest/optional/inference/error/immutability: `test/unit/actions/charts/basic-chart-facades.test.js`
- Current/Planned와 hierarchy: `test/contracts/roadmap4-phase2-gate-b.test.js`
- Contract suite: 144/144 통과
- Documentation source suite: 27/27 통과
- Cumulative suite: 1574/1574 통과
- Coverage: 94.91% lines, 90.28% branches, 98.55% functions; critical floors 55/55
- Package artifact: 324 entries, 281,970 packed bytes, 1,310,619 unpacked bytes
- Installed tarball: Node, TypeScript, PNG, browser tutorial와 private-export rejection 통과
- Node PNG: scatter 1280×800, line 1440×920 physical pixels

## 호환성과 문서 영향

- 기존 action signature, semantic/graphic schema와 renderer branch는 변경하지 않는 additive API다.
- Facade는 전용 compiler/state/materializer를 만들지 않고 기존 action의 validation과 rematerialization을 재사용한다.
- Root type barrel은 두 option type을 export하며 packed-package TypeScript consumer가 실제 import를 검증한다.
- Public README/docs와 canonical examples에 shortest call, advanced action escape hatch,
  inference/error와 Cartesian line limitation을 함께 반영한다.
- Development CI가 generated signature와 current declaration의 동기화를 검사한다.

## 승인 후

P2-C의 `createBarPlot`과 `createHistogram` vertical slice를 시작한다. 승인 전에는 두 facade를 구현하지 않는다.
