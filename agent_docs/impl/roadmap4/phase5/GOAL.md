# Roadmap 4 Phase 5 — Window, 2D bin과 binned heatmap

## 목표

P-001 `createWindowData`와 P-002 `createBin2DData`를 canonical derived-data lifecycle 위에 추가하고,
기존 pre-gridded `createHeatmap`을 깨지 않으면서 raw row를 직접 binning하는 mode를 제공한다.

이번 Phase는 숫자 transform과 chart facade를 분리한다. Window와 2D bin의 결과는 renderer와 무관한
named dataset이며, `createHeatmap({ bin })`은 그 결과를 ranged rect와 count color encoding으로 조합하는
얇은 user-facing action이다.

## 진행 상태

- [x] Phase 4 exit 승인과 derived-data baseline 확인
- [x] exact candidate API와 state owner 설계
- [x] independent window/2D-bin oracle과 고정 numeric vector
- [x] Cars Weight–MPG primitive binned heatmap
- [x] P5-A 사용자 승인
- [x] `createWindowData` vertical slice
- [x] P5-B 사용자 승인
- [x] `createBin2DData` lifecycle과 P5-C 승인
- [x] binned `createHeatmap` facade와 P5-D 승인
- [x] declarations, Current contracts, docs와 package 검증
- [ ] P5-Exit 사용자 승인

## 후보 API

### Window derived data

```typescript
type WindowSort = {
  field: string;
  order?: "ascending" | "descending";
};

type WindowOperation =
  | { op: "rowNumber" | "rank" | "denseRank"; as: string }
  | { op: "cumulativeSum"; field: string; as: string }
  | {
      op: "lag" | "lead";
      field: string;
      as: string;
      offset?: number;
      default?: unknown;
    };

program.createWindowData({
  id,
  source?,
  partitionBy?,
  sortBy?,
  operations
});
```

- `id`는 downstream에서 참조하는 advanced named resource이므로 required다.
- `createWindowData`는 immutable create-only다. 같은 `id`가 이미 있으면 오류를 내며 기존 dataset이나
  consumer를 교체하지 않는다. 향후 parameter edit가 필요하면 별도 revision-owning action으로 설계한다.
- `source`는 current dataset이 유일할 때만 추론한다.
- `partitionBy`는 string 또는 string array이며 생략하면 전체 row가 한 partition이다.
- `sortBy`는 stable multi-field sort다. `rank`와 `denseRank`는 non-empty `sortBy`를 요구한다.
- 계산은 partition의 sort order에서 수행하되 output row order는 source order를 보존한다.
- 같은 sort key는 source order로 안정화한다.
- operation은 순서대로 실행되므로 뒤 operation이 앞 operation의 `as` field를 읽을 수 있다.
- `lag`/`lead`의 `offset` default는 1, partition boundary default는 `null`이다.
- output field는 source field 또는 같은 action의 이전 output을 덮어쓸 수 없다.
- sort field의 non-null value는 partition 안에서 string, boolean 또는 finite number 중 한 type이어야 한다.
  Ascending에서 null/missing은 마지막이며 descending은 그 반대다.

### Rectangular 2D bin derived data

```typescript
program.createBin2DData({
  id,
  source?,
  x,
  y,
  bins?,
  extent?,
  includeEmpty?,
  members?,
  as?
});
```

```typescript
type Bin2DCount = number | { x: number; y: number };
type Bin2DExtent = {
  x?: readonly [number, number];
  y?: readonly [number, number];
};
type Bin2DFields = {
  x0?: string;
  x1?: string;
  y0?: string;
  y1?: string;
  count?: string;
  members?: string;
};
```

- `bins` default는 `{ x: 10, y: 10 }`이며 scalar는 두 axis에 같이 적용한다.
- extent를 생략한 axis는 finite eligible value의 min/max를 사용한다.
- auto extent의 min/max가 같으면 positive span을 추측하지 않고 validation error를 낸다.
- explicit extent는 모든 eligible value를 포함해야 한다. 범위 밖 row를 조용히 버리지 않는다.
- 두 field가 모두 finite number인 row만 eligible하다.
- 각 bin은 `[lower, upper)`이고 마지막 bin만 upper bound를 포함한다.
- output은 y ascending, 그 안에서 x ascending인 deterministic row-major order다.
- `includeEmpty` default는 `false`; `members` default는 `false`다.
- `members: true`는 caller row를 복제하지 않고 source row index를 저장한다.
- default output field는 `id`로 namespace하여 다른 transform과 충돌하지 않는다.

### Binned heatmap mode

기존 pre-gridded mode는 그대로 유지한다.

```javascript
program.createHeatmap({
  x: { field: "Weight_in_lbs", fieldType: "quantitative" },
  y: { field: "Miles_per_Gallon", fieldType: "quantitative" },
  bin: {
    bins: { x: 10, y: 8 },
    extent: { x: [1500, 5200], y: [8, 48] },
    includeEmpty: true
  },
  color: { scale: { palette: "blues" } },
  rect: { stroke: "white", strokeWidth: 1 },
  guides: {
    axes: {
      x: { title: { text: "Vehicle weight (lb)" } },
      y: { title: { text: "Miles per gallon" } }
    },
    legend: { title: "Cars per bin" }
  }
});
```

- `bin`이 없으면 현재 pre-gridded mode이며 `color.field`가 required다.
- `bin`이 있으면 x/y는 raw quantitative field이고 color field는 generated count로 추론한다.
- facade의 `includeEmpty` default는 완전한 grid를 위해 `true`다. low-level action default와 의도적으로 다르다.
- facade는 `${heatmapId}Bin2DData`를 role-namespaced generated dataset id로 사용한다.
- generated bounds를 `x/x2/y/y2`, count를 quantitative color에 연결한다.

## Action hierarchy

```text
createHeatmap(bin)
├─ createBin2DData
│  ├─ createDerivedData
│  └─ materializeBin2DData
├─ createRectMark
├─ encodeX
├─ encodeX2
├─ encodeY
├─ encodeY2
├─ encodeColor
└─ createGuides (optional)
```

각 child는 wrapped action으로 trace에 남아야 한다. `createHeatmap`이 transform result나 graphic object를
직접 조작하지 않는다.

## State ownership

- transform request/provenance: `semanticSpec.datasets[id].transform`
- immutable derived values/revision: named dataset registry
- dependency/replay metadata: canonical transform registry와 generated resource lifecycle
- concrete cell geometry/color: `graphicSpec`
- renderer: materialized rect와 guides만 읽으며 bin 계산을 하지 않는다.

## 단계

1. [STEP1](./STEP1.md) — exact contract와 independent numeric oracle
2. [STEP2](./STEP2.md) — primitive visual target와 P5-A
3. [STEP3](./STEP3.md) — Window vertical slice와 P5-B
4. [STEP4](./STEP4.md) — 2D bin lifecycle과 P5-C
5. [STEP5](./STEP5.md) — binned heatmap facade와 P5-D
6. [STEP6](./STEP6.md) — lifecycle, facet, docs와 package parity
7. [STEP7](./STEP7.md) — cumulative closeout와 P5-Exit

## 승인 Gate

| Gate | 상태 | 승인 대상 | 승인 전 차단되는 작업 |
| --- | --- | --- | --- |
| P5-A | approved | API/edge 규칙, independent oracle, Cars primitive PNG | production action 구현 |
| P5-B | approved | Window public chain, state/trace, immutable lifecycle과 package parity | 2D bin production 구현 |
| P5-C | approved | 2D bin public chain, lifecycle, numeric parity | heatmap facade 확장 |
| P5-D | approved | binned heatmap public/primitive parity와 browser/PNG | Phase closeout |
| P5-Exit | ready-for-review | declarations, Current inventory, docs와 누적 test | Phase 6 |

모든 Gate는 hard pause다.

## Non-goals

- moving average, arbitrary frame 또는 generic expression evaluator
- weighted bin, hexbin, adaptive bin 또는 overflow bucket
- row object 자체를 cell members에 중복 저장
- renderer 내부 transform
- pre-gridded mode에서 missing x/y combination 자동 생성
