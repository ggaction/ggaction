# Gate R5-P3-V — Monthly Moving-Mean Primitive

## Gate state

`planned`

## Review target

Phase 3 public implementation 전에 고정하는 monthly raw value과 truncated three-row moving mean의 primitive
visual target이다.

## Exact target public call

```javascript
chart()
  .createCanvas({ width: 760, height: 420 })
  .createData({ id: "events", values })
  .createTimeUnitData({
    id: "monthlyEvents",
    source: "events",
    field: "date",
    unit: "month",
    as: "month"
  })
  .createWindowData({
    id: "monthlyMoving",
    source: "monthlyEvents",
    sortBy: [{ field: "month" }],
    operations: [{
      op: "movingMean",
      field: "value",
      as: "movingMean",
      frame: { preceding: 2 }
    }]
  });
```

Final example은 이 derived data flow 뒤에 orange raw line과 blue moving-mean line을 같은 x/y scale로
소비한다.

## Visual evidence

- Orange: 월별 one-row raw value, 2 px line
- Blue: current row plus two preceding rows의 mean, 4 px line
- First output uses 1 row, second uses 2 rows, third onward uses 3 rows.
- UTC x ticks: January, March, May, July, September, November 2024
- Fixed y domain: `[0, 60]`
- Primitive source: `test/gates/monthly-moving-average/primitive.program.js`
- Independent values: `test/gates/monthly-moving-average/reference-values.js`
- Manifest: `test/gates/monthly-moving-average/manifest.js`
- Review PNG:
  `.artifacts/test/png/review/monthly-moving-average/raw-and-three-month-mean/primitive.png`
- Physical size: 1520×840 at pixel ratio 2; logical size 760×420.
- PNG SHA-256:
  `49f999f05e19335fd3d3308a72c3e59c0b1e6d61d6bf08d6e94c1e8eaa03bb25`.

## Verification

| Check | Result |
| --- | --- |
| Literal moving means and truncated edges | 1 pass |
| Primitive structure and no future action trace | 1 pass |
| Focused review render | 1 pass |
| Gate discovery and capability ownership | 9 pass |
| Full repository suite | 1,966 pass |

## Remote checkpoint

- Visual review commit: pending verified visual package commit
- Remote branch: `origin/codex/roadmap5-temporal-ordering-directional-marks`

## Approval effect

승인하면 이 primitive pixel target을 보존하면서 `movingMean`/`movingSum` grammar, public data flow,
declarations, Current contract, package consumer와 example을 구현한다.

## Work blocked before approval

- Production `src/grammar/window.js` moving operations
- Public/types/current-contract/docs/package promotion
- Primitive/public exact renderer equivalence and R5-P3-A
