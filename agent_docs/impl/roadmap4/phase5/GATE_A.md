# Gate P5-A — Window/2D-bin contract와 binned heatmap primitive

## 상태

`ready-for-review`

Production `createWindowData`, `createBin2DData`와 binned `createHeatmap`은 아직 구현하지 않았다.

## 승인 대상

### 1. Window contract

- partition별 stable multi-field sort
- output은 source row order 보존
- `rowNumber`, `rank`, `denseRank`, `cumulativeSum`, `lag`, `lead`
- ordered operation 사이의 field dependency
- lag/lead boundary default `null`
- source/output field overwrite 금지

### 2. 2D bin contract

- scalar 또는 per-axis bin count
- auto 또는 per-axis explicit extent
- finite x/y pair만 eligible
- half-open cell, 마지막 upper bound만 inclusive
- y-major/x-minor deterministic row order
- low-level `includeEmpty: false`, binned heatmap `includeEmpty: true`
- optional source row-index members
- explicit extent가 row를 조용히 버리지 않음

### 3. Heatmap facade hierarchy

`createHeatmap({ bin })`은 `createBin2DData`를 호출한 뒤 generated bounds를
`x/x2/y/y2`, count를 quantitative color에 연결한다. 기존 pre-gridded mode는 변경하지 않는다.

## Numeric evidence

```text
Window literal fixture: stable ties, rank/denseRank, sequential lag all pass
2D boundary fixture: 4 eligible rows, 3 occupied cells, count sum 4
Cars Weight–MPG: 398 eligible rows
Grid: 10 × 8 = 80 cells
Occupied: 38 cells
Maximum count: 33
Count sum: 398
```

Oracle은 `src/`를 import하지 않으며 production module도 oracle을 import하지 않는다.

## Visual evidence

- Node PNG:
  `.artifacts/test/png/review/cars-binned-heatmap/weight-mpg-counts/primitive.png`
- Browser Canvas screenshot:
  `.artifacts/test/png/review/cars-binned-heatmap/weight-mpg-counts/browser.png`
- Node PNG physical size: 1400×1000 at pixelRatio 2
- Browser Canvas: logical 700×500, backing store 1400×1000
- Browser console/page errors: 0
- Primitive rect count: 80

## 검증 명령

```bash
npm run test:gates
node scripts/run-tests.js render cars-binned-heatmap
NPM_CONFIG_CACHE=/tmp/podo-npm-cache npm run test:contracts
```

## 승인 후 작업

P5-A가 승인되면 Step 3에서 `createWindowData`의 grammar/action/materialization/type/package slice만 구현한다.
`createBin2DData` production 구현은 P5-B 승인 전까지 시작하지 않는다.
