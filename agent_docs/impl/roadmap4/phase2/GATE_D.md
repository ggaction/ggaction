# P2-D — Pre-gridded Heatmap Basic Chart facade

## 진행 상태

- [x] `createHeatmap` runtime, strict type와 package export
- [x] shortest call, quantitative/categorical color와 guide opt-out
- [x] observed row cell, missing-combination omission과 rect appearance
- [x] stable ID, data inference, ambiguity와 atomic failure
- [x] wrapped child hierarchy와 immutable trace
- [x] approved primitive와 semantic/graphic/Canvas-call exact parity
- [x] Browser Canvas와 2x Node PNG
- [x] full tests, coverage와 packed-package consumer
- [x] 사용자 승인

Gate 상태: `approved` (2026-07-20)

## 승인할 실행 코드

```javascript
const heatmap = chart()
  .createCanvas({
    width: 760,
    height: 440,
    margin: { top: 70, right: 120, bottom: 75, left: 110 }
  })
  .createData({ values: selectHeatmapRows(gapminder) })
  .createHeatmap({
    id: "rect",
    x: { field: "year", fieldType: "ordinal" },
    y: { field: "country", fieldType: "nominal" },
    color: {
      field: "life_expect",
      fieldType: "quantitative",
      scale: { type: "sequential", palette: "viridis" }
    },
    guides: {
      axes: {
        x: { title: { text: "Year" } },
        y: { title: { text: "Country" } }
      },
      legend: { title: "Life expectancy" }
    }
  })
  .createTextMark({
    fontSize: 10,
    fontWeight: 600,
    align: "center",
    baseline: "middle"
  })
  .encodeText({ field: "life_expect", format: ".0f" })
  .createTitle({
    text: "Life Expectancy over Time",
    align: "center"
  });
```

`createHeatmap` 자체의 shortest call은 pre-gridded `x`, `y`, `color`만 요구한다. Text와 title은 facade가
자동 생성하지 않으며 위 코드처럼 필요할 때 후속 domain action으로 체이닝한다.

```text
createHeatmap
├─ createRectMark
├─ encodeX
├─ encodeY
├─ encodeColor
└─ createGuides
```

Stable ID는 `heatmap`이다. 각 observed input row가 rect cell 하나를 소유하며 누락된 x/y combination을
합성하지 않는다. 2D binning은 Phase 5가 소유한다. Required `color`가 cell fill의 유일한 semantic owner이므로
`rect`는 `opacity`, `stroke`, `strokeWidth`만 받고 conflicting constant `fill`은 atomic validation error로 거부한다.

## 동등성 및 회귀 증거

- Exact public/primitive parity: `test/charts/gapminder-life-expectancy-heatmap/public.test.js`
- Canonical program: `examples/gapminder-life-expectancy-heatmap/program.js`
- 2x PNG: `test/charts/gapminder-life-expectancy-heatmap/png.render.js`
- Shortest/color/omission/error/immutability: `test/unit/actions/charts/heatmap-facade.test.js`
- Current inventory와 hierarchy: `test/contracts/roadmap4-phase2-gate-d.test.js`
- Contract suite: 148/148 통과
- Cumulative suite: 1599/1599 통과
- Coverage: 94.91% lines, 90.33% branches, 98.59% functions; critical floors 55/55
- Package artifact: 327 entries, 283,374 packed bytes, 1,317,921 unpacked bytes
- Installed tarball SHA-256: `2aaff6442493634e0f5bddb3fd3d855999162a4bfe60f2b1e29fcbd482fcda55`
- Installed tarball: Node, extension, PNG, TypeScript, tutorial consumer와 private-export rejection 통과
- Node PNG: 1520×880 physical pixels

## 호환성과 문서 영향

- API는 additive이며 기존 action signature, semantic/graphic schema와 renderer branch를 변경하지 않는다.
- Facade는 별도 compiler/state/materializer 없이 기존 rect, position, color와 guide action을 실제 child로 호출한다.
- Quantitative/categorical color, Canvas와 scale rematerialization은 기존 owner를 그대로 사용한다.
- Public README/docs와 canonical example에 shortest call, pre-gridded limitation, fill ownership,
  optional text advanced chain과 resource-specific edit escape hatch를 반영한다.

## 승인 후

2026-07-20 사용자 승인으로 STEP6 inventory/package/Phase closeout을 시작했다.
