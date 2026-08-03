# Gate R51-P0-V — Same-Edge Multi-Legend Visual Target

## Gate state

`changes-requested`

## Review target

Existing public calls은 유지하면서 right-side legend block을 title start, symbol center와 label start의
세 common columns에 맞추고 stable order로 top-to-bottom 배치하는 concrete target을 승인한다.

이 Gate의 target panel은 future runtime API를 흉내 내지 않는다. Current public program을 만든 뒤
`editGraphics`로 기대 좌표만 이동해 semantic state를 그대로 둔 executable visual oracle이다.

## Required variants

1. Actual Cars regression: current title/label offset vs aligned combined lane
2. Actual 392-row Cars scatterplot: current categorical/opacity overlap and column drift vs aligned,
   non-overlapping color/size/opacity lane

## Unchanged public calls

Actual-data variant는 `createCarsRegressionScatterplot(cars)`가 만드는 기존 user program을 그대로 사용한다.
Three-block variant의 public chain도 변경하지 않는다.

```javascript
chart()
  .createCanvas({ width: 760, height: 480, margin: { top: 40, right: 240, bottom: 60, left: 70 } })
  .createData({ id: "cars", values: rows })
  .createPointMark({ id: "points" })
  .encodeX({ field: "Displacement" })
  .encodeY({ field: "Miles_per_Gallon" })
  .encodeColor({ field: "Origin", fieldType: "nominal" })
  .encodeSize({ field: "Horsepower" })
  .encodeOpacity({ field: "Acceleration" })
  .createGuides({
    axes: {
      x: { title: { text: "Displacement" } },
      y: { title: { text: "Miles per Gallon" } }
    },
    legend: false
  })
  .createLegend({ target: "points", channels: ["color"] })
  .createLegend({ target: "points", channels: ["size"], count: 3 })
  .createLegend({ target: "points", channels: ["opacity"], count: 3 });
```

## Concrete approval coordinates

- Cars combined target: title start `x = 600`, symbol center `x = 616`, label start `x = 644`이다.
- Three-block target: title start `x = 550`, symbol center `x = 566`, label start `x = 594`이다.
- Rect symbols는 intrinsic width를 보존하면서 center가 common symbol column에 오도록 배치한다.
- Variable-radius circles도 center column을 공유하고 모든 label은 symbol center에서 28 logical pixels 떨어진
  common start column을 사용한다.
- Three-block order: categorical color, quantitative size, field opacity 순서다.
- Categorical row y는 `92, 120, 148`, size row y는 `219, 259, 299`, opacity row y는
  `364, 392, 420`이다.
- Concrete occupied bounds 사이에는 각각 24 logical pixels 이상 gap이 있고 overlap은 없다.
- Current와 target의 `semanticSpec`은 동일하다.

## Rendered evidence

| Variant | Logical comparison | PNG pixels | SHA-256 |
| --- | ---: | ---: | --- |
| `cars-combined-right-lane` | 1560 x 496 | 3120 x 992 | `e1451f31ed816b6ea1a98b95063ce8c4cea937c8bb8f1a6a97ed9b077be53cd8` |
| `cars-color-size-opacity-stack` | 1560 x 496 | 3120 x 992 | `647ae53ca2fa6f2c70b22e58678f9fb2ec58055ba16874186a4476fa5a02c786` |

Review PNG는 `.artifacts/test/png/review/multi-legend-layout/`에 있고 같은 comparison programs의
Canvas/SVG/PNG/PDF outputs는 `.artifacts/test/renderers/review/multi-legend-layout/`에 있다.

## Verification

- `npm test`: 2,019 passed
- `npm run test:render`: 137 passed; stable gallery 128 variants, active review gallery 2 variants
- `npm run test:gates`: 4 passed
- `node scripts/run-tests.js render test/gates/multi-legend-layout`: 4 passed
- Repository discovery와 capability ownership contracts: 16 passed
- Runtime source와 public API는 변경하지 않았다.

## Required evidence

- Executable current and primitive target programs
- Independent literal coordinates and common-anchor/non-overlap assertions
- Active review metadata and PNG for both comparisons
- Canvas/SVG/PNG/PDF artifacts from the same concrete comparison programs
- Focused normal/render tests and repository discovery/capability ownership checks
- Complete verified Gate checkpoint pushed to the Roadmap 5.1 branch

## Approval effect

Approval permits Phase 1 implementation of a shared right/left legend lane while preserving the approved concrete target.
It does not authorize top/bottom implementation, PR creation, merge, release, publish or documentation deployment.

## Work blocked before approval

- Runtime layout/materialization changes
- Current contract and architecture promotion
- Stable example/reference/image updates
- Phase 2 horizontal-edge and lifecycle work

## Remote checkpoint

- Superseded visual package: `fd917b66763cdc611112f5ac0a1f62a45c9e2d2a`
- 2026-08-03 review requested common symbol/label columns and an actual-data second chart.
- Revised visual package commit/push is pending before this Gate returns to `ready-for-review`.
