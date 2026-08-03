# Gate R51-P0-V — Same-Edge Multi-Legend Visual Target

## Gate state

`planned`

## Review target

Existing public calls은 유지하면서 right-side legend block을 common content anchor에 맞추고 stable order로
top-to-bottom 배치하는 concrete target을 승인한다.

이 Gate의 target panel은 future runtime API를 흉내 내지 않는다. Current public program을 만든 뒤
`editGraphics`로 기대 좌표만 이동해 semantic state를 그대로 둔 executable visual oracle이다.

## Required variants

1. Actual Cars regression: current 22-pixel categorical/size title offset vs aligned combined lane
2. Point color/size/opacity: current categorical/opacity overlap vs aligned non-overlapping three-block lane

## Unchanged public calls

Actual-data variant는 `createCarsRegressionScatterplot(cars)`가 만드는 기존 user program을 그대로 사용한다.
Three-block variant의 public chain도 변경하지 않는다.

```javascript
chart()
  .createCanvas({ width: 680, height: 460, margin: { top: 40, right: 240, bottom: 60, left: 60 } })
  .createData({ id: "rows", values })
  .createPointMark({ id: "points" })
  .encodeX({ field: "x" })
  .encodeY({ field: "y" })
  .encodeColor({ field: "group", fieldType: "nominal" })
  .encodeSize({ field: "amount" })
  .encodeOpacity({ field: "alpha" })
  .createLegend({ target: "points", channels: ["color"] })
  .createLegend({ target: "points", channels: ["size"], count: 3 })
  .createLegend({ target: "points", channels: ["opacity"], count: 3 });
```

## Concrete approval coordinates

- Cars target: `Origin`과 `Acceleration` title content start가 모두 `x = 600`이다.
- Three-block target: 모든 title content start가 `x = 470`이다.
- Three-block order: categorical color, quantitative size, field opacity 순서다.
- Categorical row y는 `92, 120, 148`, size row y는 `219, 259, 299`, opacity row y는
  `364, 392, 420`이다.
- Concrete occupied bounds 사이에는 각각 24 logical pixels 이상 gap이 있고 overlap은 없다.
- Current와 target의 `semanticSpec`은 동일하다.

## Rendered evidence

| Variant | Logical comparison | PNG pixels | SHA-256 |
| --- | ---: | ---: | --- |
| `cars-combined-right-lane` | 1560 x 496 | 3120 x 992 | `3f90d141103e85dac65f2a06904ff98fc5b394de53f2dca7e76032ee05693f74` |
| `color-size-opacity-stack` | 1400 x 476 | 2800 x 952 | `4f7f787ad54e90cf7fdf5664543ffb5e59d95bbb3557bff17df0ade9f322e9cf` |

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

The verified visual package must be committed and pushed before this Gate becomes `ready-for-review`.
