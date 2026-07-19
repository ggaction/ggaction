# P2-C — Bar와 Histogram Basic Chart facade

## 진행 상태

- [x] `createBarPlot` runtime, strict type와 package export
- [x] `createHistogram` runtime, strict type와 package export
- [x] shortest call, optional layout/bin/appearance와 guide opt-out
- [x] stable ID, data inference, ambiguity와 atomic failure
- [x] wrapped child hierarchy와 immutable trace
- [x] approved primitive와 semantic/graphic/Canvas-call exact parity
- [x] Browser Canvas와 2x Node PNG
- [x] full tests, coverage와 packed-package consumer
- [x] 사용자 승인

Gate 상태: `approved` (2026-07-20)

## 승인할 Bar 실행 코드

```javascript
const bar = chart()
  .createCanvas({
    width: 720,
    height: 460,
    margin: { top: 40, right: 140, bottom: 70, left: 80 }
  })
  .createData({ id: "jobs", values: validJobs })
  .createBarPlot({
    id: "bars",
    x: { field: "year", fieldType: "ordinal" },
    y: {
      field: "perc",
      aggregate: "mean",
      scale: { nice: true, zero: false }
    },
    color: {
      field: "sex",
      layout: "group",
      scale: { palette: "tableau10" }
    },
    width: { band: 0.72 }
  });
```

```text
createBarPlot
├─ createBarMark
├─ encodeX
├─ encodeY
├─ encodeColor
├─ encodeBarWidth
└─ createGuides
```

Shortest call은 complete bar position만 요구한다. Stable ID는 `barPlot`이다. Vertical/horizontal,
group/stack/overlay/diverging와 band/pixel width는 facade가 재해석하지 않고 existing bar와 color policy가 소유한다.

## 승인할 Histogram 실행 코드

```javascript
const histogram = chart()
  .createCanvas({
    width: 432,
    height: 460,
    margin: { top: 80, right: 60, bottom: 130, left: 80 }
  })
  .createData({ id: "cars", values: validCars })
  .createHistogram({
    id: "bars",
    field: "Displacement",
    maxBins: 10,
    xScale: { nice: true, zero: false },
    color: {
      field: "Origin",
      scale: { palette: "tableau10" }
    },
    guides: { legend: { position: "bottom" } }
  })
  .createTitle({
    text: "Displacement distribution",
    subtitle: "by country",
    align: "center"
  });
```

```text
createHistogram
├─ createBarMark
├─ encodeHistogram
├─ encodeColor
└─ createGuides
```

Shortest call은 `createHistogram({ field })`이고 stable ID는 `histogram`, default `maxBins`는 `10`이다.
`maxBins`, `binStep`, `binBoundaries`는 atomic `encodeHistogram` child가 mutually exclusive하게 관리한다.
Title은 facade 범위가 아니며 위 예제처럼 후속 action으로 작성한다.

## 동등성 및 회귀 증거

- Exact public/primitive parity: `test/charts/jobs-grouped-bar/public.test.js`와
  `test/charts/cars-histogram/public.test.js`
- Canonical programs: `examples/jobs-grouped-bar/program.js`와 `examples/cars-histogram/program.js`
- 2x PNG: 각 chart slice의 `png.render.js`
- Shortest/layout/bin/error/immutability: `test/unit/actions/charts/bar-histogram-facades.test.js`
- Current/Planned와 hierarchy: `test/contracts/roadmap4-phase2-gate-c.test.js`
- Contract suite: 146/146 통과
- Cumulative suite: 1588/1588 통과
- Coverage: 94.90% lines, 90.28% branches, 98.55% functions; critical floors 55/55
- Package artifact: 326 entries, 283,041 packed bytes, 1,315,897 unpacked bytes
- Installed tarball: Node, TypeScript, PNG, browser tutorial와 private-export rejection 통과
- Node PNG: bar 1440×920, histogram 864×920 physical pixels

## 호환성과 문서 영향

- 두 API는 additive이며 기존 action signature, semantic/graphic schema와 renderer branch를 변경하지 않는다.
- Facade는 별도 compiler/state/materializer 없이 기존 mark, encoding, scale, guide action을 실제 child로 호출한다.
- Bar layout과 histogram bin/count는 기존 owner에만 저장되므로 후속 `encodeColor`, `encodeBarWidth`,
  `encodeHistogram`, `editScale`, mark/guide edit 경로를 그대로 사용한다.
- Public README/docs와 canonical examples에 shortest call, layout/bin option과 advanced escape hatch를 반영한다.

## 승인 후

P2-D의 pre-gridded `createHeatmap` vertical slice를 시작한다. 승인 전에는 heatmap facade를 구현하지 않는다.
