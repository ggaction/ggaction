# Gate P5-C — `createBin2DData` vertical slice

## 상태

- Gate: `P5-C`
- 상태: `ready-for-review`
- 검토 대상 remote checkpoint: pending
- 승인 전 차단: binned `createHeatmap` facade와 Phase 5 후속 Step

## 승인 대상 public API

```typescript
createBin2DData({
  id,
  source?,
  x,
  y,
  bins?,
  extent?,
  includeEmpty?,
  members?,
  as?
}): ChartProgram;
```

대표 실행 chain은 다음과 같다.

```javascript
const program = chart()
  .createData({ id: "cars", values: cars })
  .createBin2DData({
    id: "carsWeightMpg",
    x: "Weight_in_lbs",
    y: "Miles_per_Gallon",
    bins: { x: 10, y: 8 },
    extent: { x: [1500, 5200], y: [8, 48] },
    includeEmpty: true,
    members: true,
    as: {
      x0: "weight0",
      x1: "weight1",
      y0: "mpg0",
      y1: "mpg1",
      count: "count",
      members: "members"
    }
  });
```

Cars 결과는 eligible row `398`, 전체 cell `80`, occupied cell `38`, 최대 count `33`, count 합 `398`이다.
Production output은 `src/`를 import하지 않는 independent oracle과 edge, row order, count, members까지 exact
parity다.

## bin contract

- `bins` default는 `{ x: 10, y: 10 }`이며 finite positive integer scalar 또는 `{ x, y }`를 받는다.
- extent를 생략한 축은 eligible finite value의 min/max를 사용한다. Constant auto extent는 임의 span을 만들지 않고
  명확한 validation error를 낸다.
- Explicit extent는 모든 eligible value를 포함해야 하며 out-of-range row를 조용히 버리지 않는다.
- Cell은 `[lower, upper)`이고 마지막 cell만 upper bound를 포함한다.
- Output order는 y ascending, 그 안에서 x ascending이다.
- `includeEmpty` default는 `false`; `true`이면 전체 rectangular grid를 materialize한다.
- `members` default는 `false`; `true`이면 caller row를 복사하지 않고 source row index를 저장한다.
- `as` 생략 시 output field는 dataset ID로 namespace되어 다른 transform output과 충돌하지 않는다.
- 입력 row, options와 이전 `ChartProgram`은 변경하지 않는다.

## state, trace와 lifecycle

- Requested transform과 resolved extent/edge provenance는 materialized dataset에 함께 저장된다.
- 최초 action trace는
  `createBin2DData → createDerivedData + materializeBin2DData → editSemantic`이다.
- 같은 logical derived ID를 다시 author하면 기존 program을 바꾸지 않고 deterministic revision dataset을 만든다.
- 해당 dataset을 직접 소비하는 layer는 새 revision으로 rebind되고 기존 mark/guide materialization을 다시 수행한다.
  더 이상 참조되지 않는 이전 revision은 새 program에서 release되며 이전 program에는 그대로 남는다.
- Source를 생략한 revision은 이전 revision의 source를 보존한다.
- Facet은 전체 데이터에서 계산된 cell을 단순 분할하지 않는다. 각 child source partition에서 canonical 2D-bin
  materializer를 replay해 auto extent와 count를 다시 계산한다.
- 현재 다른 derived dataset이 교체 대상 2D-bin dataset을 직접 source로 소비하는 경우는 stale state를 허용하지
  않고 state 변경 전에 명확한 error를 낸다. Derived-on-derived revision cascade는 이번 Gate 범위가 아니며 public
  문서에 제한으로 공개했다.
- Renderer는 bin을 계산하지 않으며 이 data action만으로 `graphicSpec`은 바뀌지 않는다.

## API와 문서 영향

- Existing API를 변경하지 않는 additive advanced data action이다.
- Runtime registrar, exact TypeScript declarations, installed-package consumer, transform registry, Current contract,
  action catalog와 generated action reference를 동기화했다.
- Public [2D Bin Data Transforms](../../../../docs/api/data/bin2d.md) 페이지가 defaults, edge semantics, output schema,
  revision lifecycle과 현재 limitation을 소유한다.
- `SECOND_ARCHITECTURE.md`에는 requested/resolved provenance, logical owner/revision mapping과 facet replay를 기록했다.

## 검증 증거

- 2D-bin grammar/action/oracle focused tests: `12/12` pass.
- Unit suite: `1114/1114` pass.
- Contract suite: `121/121` pass.
- Active Gate suite: `10/10` pass.
- Documentation source/generator suite: `32/32` pass.
- Full cumulative suite: `1641/1641` pass.
- Installed-package Node/TypeScript consumer: pass.
- Package artifact: `ggaction@0.0.4`, SHA-256
  `6ac6bb714d6d2e77aad869df77225fe60372b4b7e9aa6001ca99dfa5f497009e`.
- Generated signature, capability, action, reference, metadata, search와 contract catalog freshness checks: pass.

## Visual target 경계

`createBin2DData`는 data action이라 자체 graphics를 만들지 않는다. P5-A에서 승인된 Cars binned heatmap
primitive는 이 action output이 다음 Step에서 소비할 graphical target이다.

- Node PNG: `.artifacts/test/png/review/cars-binned-heatmap/weight-mpg-counts/primitive.png`
- Browser Canvas: `.artifacts/test/png/review/cars-binned-heatmap/weight-mpg-counts/browser.png`
- Logical size `700×500`, physical/backing size `1400×1000`, rect `80`개

이번 Gate에는 아직 user-facing binned `createHeatmap` 결과가 없다. P5-C 승인 뒤에만 Step 5 facade를 구현하고
primitive/public exact parity를 P5-D에서 다시 검토한다.

## 승인 후 작업

P5-C가 승인되면 Step 5에서 기존 pre-gridded mode를 보존한 채 `createHeatmap({ bin })` facade를 구현한다.
