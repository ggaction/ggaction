# Gate R5-P3-V — Airline Passenger Moving Windows Primitive

## Gate state

`approved` — 2026-08-02 explicit user approval

## Review target

Phase 3 public implementation 전에 고정하는 actual U.S. airline passenger data의 trailing/centered
moving mean과 trailing moving sum primitive visual target이다.

## Exact target public call

```javascript
const trailingMean = monthly.createWindowData({
  id: "trailingMean",
  sortBy: [{ field: "month" }],
  operations: [{
    op: "movingMean",
    field: "passengers",
    as: "movingMean",
    frame: { preceding: 2 }
  }]
});

const centeredMean = monthly.createWindowData({
  id: "centeredMean",
  sortBy: [{ field: "month" }],
  operations: [{
    op: "movingMean",
    field: "passengers",
    as: "movingMean",
    frame: { preceding: 2, following: 2 }
  }]
});

const trailingSum = monthly.createWindowData({
  id: "trailingSum",
  sortBy: [{ field: "month" }],
  operations: [{
    op: "movingSum",
    field: "passengers",
    as: "movingSum",
    frame: { preceding: 2 }
  }]
});
```

`monthly`은 BTS의 2024–2025 monthly observations을 Phase 1 `createTimeUnitData` 결과로 저장한 program이다.

## Visual evidence

- Source: U.S. Bureau of Transportation Statistics, monthly domestic + international scheduled-airline passengers.
- Rows: January 2024–December 2025, 24 observations, millions of passengers.
- Panel 1: orange raw line + blue trailing 3-month `movingMean`, `preceding: 2`.
- Panel 2: orange raw line + green centered 5-month `movingMean`, `preceding: 2, following: 2`.
- Panel 3: purple trailing 3-month `movingSum`, `preceding: 2`.
- Mean domains: `[60, 100]`; sum domain: `[0, 280]`; partition edges truncate.
- Data source:
  `https://www.bts.gov/newsroom/monthly-passengers-us-scheduled-airlines-domestic-international-april-2023-april-2026`
- Primitive source: `test/gates/monthly-moving-average/primitive.program.js`
- Independent values: `test/gates/monthly-moving-average/reference-values.js`
- Manifest: `test/gates/monthly-moving-average/manifest.js`
- Review PNG:
  `.artifacts/test/png/review/airline-passenger-moving-windows/trailing-centered-and-sum/primitive.png`
- Physical size: 2384×744 at pixel ratio 2; logical size 1192×372.
- PNG SHA-256:
  `faba89412e35ade4ab229482c3e21aaa1df7c9cbd1297fe54ab6da1757f4392f`.

## Verification

| Check | Result |
| --- | --- |
| Published source anchors and three moving option boundaries | 2 pass |
| Three-panel primitive structure and no future action trace | 1 pass |
| Focused review render | 1 pass |
| Gate discovery and capability ownership | 9 pass |
| Full repository suite | 1,967 pass |

## Remote checkpoint

- Visual review commit: `e80a77cf` (`test: add moving-window visual target`)
- Actual-data multi-option revision: `731839b2`
- Remote branch: `origin/codex/roadmap5-temporal-ordering-directional-marks`

## Approval effect

승인하면 이 primitive pixel target을 보존하면서 `movingMean`/`movingSum` grammar, public data flow,
declarations, Current contract, package consumer와 example을 구현한다.

## Work blocked before approval

- Production `src/grammar/window.js` moving operations
- Public/types/current-contract/docs/package promotion
- Primitive/public exact renderer equivalence and R5-P3-A
